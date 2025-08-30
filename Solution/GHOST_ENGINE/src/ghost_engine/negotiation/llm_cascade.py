"""Gemini-only cover letter generation + output safety (regex + Ollama judge)."""

from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass
from typing import Any

import httpx

from ghost_engine.config.settings import get_settings
from ghost_engine.negotiation.output_footprint import scan_output_footprints
from ghost_engine.negotiation.pipeline import cover_letter_section, load_negotiation_pipeline
from ghost_engine.negotiation.typography import apply_outbound_typography
from ghost_engine.scoring.engine import TAG_SECURITY_VALUED
from ghost_engine.scoring.safety import check_cover_output_safety_async
from ghost_engine.telegram import operator_alert
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

GEMINI_GENERATE_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


@dataclass(frozen=True, slots=True)
class CoverLetterGenResult:
    ok: bool
    cover_letter_text: str | None
    gemini_model: str | None
    tier: str | None
    needs_manual_review: bool
    error_code: str | None
    detail: str
    footprint_hits: tuple[str, ...]
    output_safety_ok: bool | None
    latency_ms: float | None


def _cascade_cfg(raw: dict[str, Any]) -> dict[str, Any]:
    c = raw.get("cascade")
    return c if isinstance(c, dict) else {}


def select_gemini_model_for_job(
    job_tags: list[str],
    l1_score: int | None,
    description_len: int | None = None,
    *,
    llm_config: dict[str, Any] | None = None,
) -> tuple[str, str]:
    """Return (model_id, tier_label flash|pro)."""
    cfg = _cascade_cfg(llm_config or get_settings().llm_config)
    gem = cfg.get("gemini")
    flash = str(cfg.get("tier_1_model", "gemini-2.0-flash")).strip()
    pro = str(cfg.get("tier_2_model", "gemini-1.5-pro")).strip()
    if isinstance(gem, dict):
        gf = gem.get("flash_model")
        gp = gem.get("pro_model")
        if isinstance(gf, str) and gf.strip():
            flash = gf.strip()
        if isinstance(gp, str) and gp.strip():
            pro = gp.strip()
    min_l1 = cfg.get("min_l1_score_for_pro", 70)
    try:
        thresh = int(min_l1)
    except (TypeError, ValueError):
        thresh = 70

    min_chars = cfg.get("min_description_chars_for_pro", 0)
    try:
        char_thresh = int(min_chars)
    except (TypeError, ValueError):
        char_thresh = 0

    tag_set = {t for t in job_tags if isinstance(t, str)}
    if TAG_SECURITY_VALUED in tag_set:
        return pro, "pro"
    if l1_score is not None and l1_score >= thresh:
        return pro, "pro"
    if char_thresh > 0 and description_len is not None and description_len >= char_thresh:
        return pro, "pro"
    return flash, "flash"


def ops_fallback_gemini_model(*, llm_config: dict[str, Any] | None = None) -> str:
    """Flash-tier Gemini from cascade config (emergency repair / ops diagnosis)."""
    flash, _ = select_gemini_model_for_job([], None, llm_config=llm_config)
    return flash


def _gemini_temperature_for_tier(tier: str, llm_config: dict[str, Any]) -> float:
    d = _cascade_cfg(llm_config)
    key = "temperature_pro" if tier == "pro" else "temperature_flash"
    v = d.get(key, d.get("temperature", 0.25))
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.25


def _gemini_max_tokens_for_tier(tier: str, llm_config: dict[str, Any]) -> int:
    d = _cascade_cfg(llm_config)
    key = "max_output_tokens_pro" if tier == "pro" else "max_output_tokens_flash"
    default = 2048 if tier == "pro" else 1024
    v = d.get(key, default)
    try:
        return max(64, int(v))
    except (TypeError, ValueError):
        return default


def _extract_gemini_text(body: dict[str, Any]) -> str:
    cands = body.get("candidates")
    if not isinstance(cands, list) or not cands:
        return ""
    c0 = cands[0]
    if not isinstance(c0, dict):
        return ""
    content = c0.get("content")
    if not isinstance(content, dict):
        return ""
    parts = content.get("parts")
    if not isinstance(parts, list):
        return ""
    chunks: list[str] = []
    for p in parts:
        if isinstance(p, dict) and isinstance(p.get("text"), str):
            chunks.append(p["text"])
    return "".join(chunks).strip()


async def _gemini_generate_async(
    model: str,
    user_text: str,
    *,
    timeout_sec: float,
    temperature: float,
    max_output_tokens: int,
) -> tuple[str | None, str | None]:
    settings = get_settings()
    key = settings.gemini_api_key
    if not key:
        return None, "missing_gemini_api_key"
    secret = key.get_secret_value().strip()
    if not secret:
        return None, "empty_gemini_api_key"

    url = GEMINI_GENERATE_URL.format(model=model)
    payload: dict[str, Any] = {
        "contents": [{"role": "user", "parts": [{"text": user_text}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens,
        },
    }
    try:
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            resp = await client.post(url, params={"key": secret}, json=payload)
            if resp.status_code >= 400:
                err_body = resp.text[:800]
                return None, f"http_{resp.status_code}:{err_body}"
            body = resp.json()
    except (httpx.HTTPError, OSError, ValueError, json.JSONDecodeError) as e:
        log.warning("llm_cascade.gemini_request_failed", error=str(e))
        return None, f"request_error:{type(e).__name__}:{e}"

    if not isinstance(body, dict):
        return None, "bad_json_shape"
    text = _extract_gemini_text(body)
    if not text:
        err = body.get("error")
        if isinstance(err, dict):
            return None, str(err.get("message", "empty_candidate"))
        return None, "empty_candidate"
    return text, None


def apply_pipeline_typography(text: str, pipeline: dict[str, Any] | None = None) -> str:
    """Normalize Gemini output per ``negotiation_pipeline.yaml`` typography section."""
    cl = cover_letter_section(pipeline)
    typo = cl.get("typography")
    return apply_outbound_typography(text, typo if isinstance(typo, dict) else {})


def pipeline_footprint_hits(text: str, pipeline: dict[str, Any] | None = None) -> tuple[str, ...]:
    """Regex footprint hits; empty if step disabled or no hits."""
    cl = cover_letter_section(pipeline)
    foot = cl.get("footprint")
    if isinstance(foot, dict) and foot.get("enabled", True) is False:
        return ()
    return tuple(scan_output_footprints(text))


async def pipeline_judge_blocked(text: str, pipeline: dict[str, Any] | None = None) -> tuple[bool, str]:
    """Ollama output judge; returns (blocked, reason). Not blocked if judge disabled."""
    cl = cover_letter_section(pipeline)
    j = cl.get("ollama_output_judge")
    if isinstance(j, dict) and j.get("enabled", True) is False:
        return False, ""
    rep = await check_cover_output_safety_async(text)
    if not rep.is_safe or rep.risk_level == "high":
        return True, rep.reason
    return False, ""


async def _notify_api_failure(site_id: str, message: str) -> None:
    text = (
        "Gemini API error — cover letter not generated.\n"
        f"site_id={site_id}\n"
        f"{message[:3500]}"
    )
    try:
        await operator_alert.send_operator_text_alert(text=text, ops_topic="errors")
    except Exception as exc:
        log.warning("llm_cascade.telegram_notify_failed", error=str(exc))


async def generate_cover_letter_async(
    *,
    rendered_prompt: str,
    job_tags: list[str],
    l1_score: int | None,
    site_id: str,
    description_len: int | None = None,
    notify_on_api_error: bool = True,
) -> CoverLetterGenResult:
    """
    Tier select (Flash vs Pro) -> Gemini -> regex footprint -> Ollama output judge.
    """
    t0 = time.monotonic()
    llm_cfg = get_settings().llm_config
    cascade = _cascade_cfg(llm_cfg)
    try:
        timeout_sec = float(cascade.get("request_timeout_sec", 90))
    except (TypeError, ValueError):
        timeout_sec = 90.0

    model_id, tier = select_gemini_model_for_job(
        job_tags,
        l1_score,
        description_len,
        llm_config=llm_cfg,
    )
    temp = _gemini_temperature_for_tier(tier, llm_cfg)
    max_tok = _gemini_max_tokens_for_tier(tier, llm_cfg)

    log.info("llm_cascade.start", site_id=site_id, tier=tier, model=model_id)

    text, err = await _gemini_generate_async(
        model_id,
        rendered_prompt,
        timeout_sec=timeout_sec,
        temperature=temp,
        max_output_tokens=max_tok,
    )
    elapsed_ms = (time.monotonic() - t0) * 1000.0
    if err:
        log.warning(
            "llm_cascade.gemini_failed",
            site_id=site_id,
            error=err,
            latency_ms=round(elapsed_ms, 2),
        )
        if notify_on_api_error:
            await _notify_api_failure(site_id, err)
        return CoverLetterGenResult(
            ok=False,
            cover_letter_text=None,
            gemini_model=model_id,
            tier=tier,
            needs_manual_review=True,
            error_code="gemini_failed",
            detail=err,
            footprint_hits=(),
            output_safety_ok=None,
            latency_ms=round(elapsed_ms, 2),
        )

    pl = load_negotiation_pipeline()
    text = apply_pipeline_typography(text, pl)
    hits = pipeline_footprint_hits(text, pl)
    if hits:
        elapsed_ms = (time.monotonic() - t0) * 1000.0
        log.warning(
            "llm_cascade.footprint_reject",
            site_id=site_id,
            hits=list(hits),
            latency_ms=round(elapsed_ms, 2),
        )
        return CoverLetterGenResult(
            ok=False,
            cover_letter_text=None,
            gemini_model=model_id,
            tier=tier,
            needs_manual_review=True,
            error_code="output_footprint",
            detail=",".join(hits),
            footprint_hits=hits,
            output_safety_ok=False,
            latency_ms=round(elapsed_ms, 2),
        )

    blocked, reason = await pipeline_judge_blocked(text, pl)
    elapsed_ms = (time.monotonic() - t0) * 1000.0
    if blocked:
        log.warning(
            "llm_cascade.ollama_output_reject",
            site_id=site_id,
            reason=reason,
            risk="high",
            latency_ms=round(elapsed_ms, 2),
        )
        return CoverLetterGenResult(
            ok=False,
            cover_letter_text=None,
            gemini_model=model_id,
            tier=tier,
            needs_manual_review=True,
            error_code="output_safety",
            detail=reason,
            footprint_hits=(),
            output_safety_ok=False,
            latency_ms=round(elapsed_ms, 2),
        )

    log.info(
        "llm_cascade.done",
        site_id=site_id,
        tier=tier,
        model=model_id,
        latency_ms=round(elapsed_ms, 2),
    )
    return CoverLetterGenResult(
        ok=True,
        cover_letter_text=text,
        gemini_model=model_id,
        tier=tier,
        needs_manual_review=False,
        error_code=None,
        detail="ok",
        footprint_hits=(),
        output_safety_ok=True,
        latency_ms=round(elapsed_ms, 2),
    )


# Plan / docs alias (same coroutine).
generate_cover_letter = generate_cover_letter_async
