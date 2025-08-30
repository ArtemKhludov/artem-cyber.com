"""
Optional Ollama JSON infer for job USD equivalent when fixed budget is missing (narrow triage).

Fail-open on network/parse errors; rate-limited per minute (in-process).
"""

from __future__ import annotations

import json
import re
import time
from collections import deque
from dataclasses import dataclass
from typing import Any, Mapping

import httpx
from pydantic import BaseModel, Field

from ghost_engine.config.settings import get_settings
from ghost_engine.scoring.ollama_lanes import ollama_wait_background_turn
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

_MAX_TITLE = 400
_MAX_DESC = 2800

_budget_infer_ts: deque[float] = deque(maxlen=512)
_budget_infer_sortie_calls: int = 0


def reset_budget_infer_sortie_calls() -> None:
    """Reset per-feed-sortie LLM attempt counter (see feed_scoring_run_ledger.begin_feed_sortie)."""
    global _budget_infer_sortie_calls
    _budget_infer_sortie_calls = 0


def budget_infer_sortie_available(max_per_sortie: int | None) -> bool:
    if max_per_sortie is None or max_per_sortie <= 0:
        return True
    return _budget_infer_sortie_calls < max_per_sortie


def budget_infer_sortie_consume() -> None:
    global _budget_infer_sortie_calls
    _budget_infer_sortie_calls += 1


class BudgetInferJSON(BaseModel):
    """Strict shape for Ollama reply."""

    equiv_usd_fixed: float | None = Field(default=None, description="Estimated fixed-price USD equivalent")
    hourly_equiv_usd: float | None = Field(default=None, description="Optional hourly rate USD if job is hourly")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


@dataclass(frozen=True, slots=True)
class BudgetInferVerdict:
    equiv_usd_fixed: float | None
    confidence: float
    raw_ok: bool
    reason: str
    hourly_equiv_usd: float | None = None


def _parse_json_loose(blob: str) -> dict[str, Any] | None:
    blob = blob.strip()
    try:
        return json.loads(blob)
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{[\s\S]*\}\s*$", blob)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            return None
    return None


def budget_infer_rate_allow(max_per_minute: int) -> bool:
    if max_per_minute <= 0:
        return False
    now = time.monotonic()
    while _budget_infer_ts and now - _budget_infer_ts[0] > 60.0:
        _budget_infer_ts.popleft()
    if len(_budget_infer_ts) >= max_per_minute:
        return False
    _budget_infer_ts.append(now)
    return True


def triage_budget_llm_infer(
    state: Mapping[str, Any],
    bi: Mapping[str, Any],
    *,
    scoring_root: Mapping[str, Any],
) -> tuple[bool, str]:
    """Return (run_ok, skip_reason)."""
    triage = bi.get("triage")
    t: dict[str, Any] = triage if isinstance(triage, dict) else {}

    sig = state.get("job_signal")
    if not isinstance(sig, dict):
        return False, "no_signal"

    also_sh = t.get("also_when_l0_soft_hold_missing_budget", True)
    if also_sh is True and state.get("l0_soft_hold_missing_budget") is True:
        if sig.get("budget_value") is None:
            return True, "l0_soft_hold_missing_budget"

    if t.get("require_budget_value_null", True) and sig.get("budget_value") is not None:
        return False, "budget_value_present"

    if t.get("require_hourly_budget_max_null", True) and sig.get("hourly_budget_max") is not None:
        return False, "hourly_max_present"

    req_src = t.get("require_b_source_equals")
    if isinstance(req_src, str) and req_src.strip():
        bd = state.get("gri_breakdown")
        if not isinstance(bd, dict):
            return False, "no_breakdown"
        if str(bd.get("B_source") or "").strip() != req_src.strip():
            return False, "b_source_mismatch"

    if t.get("require_gri_gray_zone") is True:
        gri_cfg = scoring_root.get("gri")
        zone = gri_cfg.get("l2_gray_zone") if isinstance(gri_cfg, dict) else None
        if not isinstance(zone, dict):
            return False, "no_gray_config"
        gri = state.get("gri")
        if not isinstance(gri, (int, float)):
            return False, "no_gri"
        lo = float(zone.get("gri_min") or 0.5)
        hi = float(zone.get("gri_max") or 0.79)
        gf = float(gri)
        if not (lo <= gf <= hi):
            return False, "not_gray_zone"

    return True, "ok"


async def run_budget_infer_ollama(
    job_signal: Mapping[str, Any],
    bi: Mapping[str, Any],
    *,
    timeout_seconds: float | None = None,
) -> BudgetInferVerdict:
    title = str(job_signal.get("title") or "")[:_MAX_TITLE]
    desc = str(job_signal.get("description") or "")[:_MAX_DESC]
    blob = f"title: {title}\n\ndescription:\n{desc}"
    if not blob.strip():
        return BudgetInferVerdict(None, 0.0, False, "empty_signal")

    settings = get_settings()
    host = settings.ollama_host.rstrip("/")
    mdl_raw = bi.get("ollama_model")
    mdl = str(mdl_raw).strip() if isinstance(mdl_raw, str) else ""
    if not mdl:
        mdl = settings.ghost_ollama_model
    llm = settings.llm_config.get("safety") if isinstance(settings.llm_config, dict) else None
    if isinstance(llm, dict):
        mm = llm.get("ollama_model")
        if isinstance(mm, str) and mm.strip():
            mdl = mm.strip()

    to = float(bi.get("timeout_sec") or 22.0) if timeout_seconds is None else float(timeout_seconds)

    prompt = (
        "You estimate the client's realistic USD budget for this job posting. "
        "If unclear, set confidence low and equiv_usd_fixed null. "
        "Reply JSON ONLY, no markdown: "
        '{"equiv_usd_fixed": number or null, "hourly_equiv_usd": number or null, "confidence": number 0 to 1}\n'
        "Use equiv_usd_fixed for fixed-price or your best total-project USD guess; hourly_equiv_usd only if clearly hourly.\n\n---\n"
        + blob
    )

    url = f"{host}/api/generate"
    payload = {
        "model": mdl,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.1},
    }

    await ollama_wait_background_turn()

    try:
        async with httpx.AsyncClient(timeout=to) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            body = resp.json()
    except (httpx.HTTPError, OSError, ValueError) as e:
        log.warning("budget_infer.ollama_unreachable", error=str(e))
        return BudgetInferVerdict(None, 0.0, False, "ollama_unreachable")

    raw = body.get("response") if isinstance(body, dict) else None
    if not isinstance(raw, str):
        return BudgetInferVerdict(None, 0.0, False, "bad_ollama_shape")

    data = _parse_json_loose(raw)
    if not isinstance(data, dict):
        return BudgetInferVerdict(None, 0.0, False, "unparseable_json")

    try:
        parsed = BudgetInferJSON.model_validate(data)
    except Exception:
        return BudgetInferVerdict(None, 0.0, False, "pydantic_reject")

    eq = parsed.equiv_usd_fixed
    if eq is not None and eq <= 0:
        eq = None

    log.info(
        "budget_infer.verdict",
        equiv_usd_fixed=eq,
        confidence=round(parsed.confidence, 3),
        ollama_ok=True,
    )
    h = parsed.hourly_equiv_usd
    if h is not None and h <= 0:
        h = None
    return BudgetInferVerdict(eq, parsed.confidence, True, "ok", hourly_equiv_usd=h)
