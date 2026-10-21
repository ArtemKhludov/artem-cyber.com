"""
L2 scoring judge: local Ollama JSON verdict in GRI gray zone (plan §4 optional_L2_llm).

Fails open (neutral score) when Ollama is unreachable so CI/dev without Ollama still pass.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Mapping

import httpx

from ghost_engine.config.settings import get_settings
from ghost_engine.scoring.ollama_lanes import ollama_ui_lane
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

_MAX_CHARS = 3200


@dataclass(frozen=True, slots=True)
class L2ScoringVerdict:
    fit_score: float
    recommend: str
    reason: str
    raw_ok: bool


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


async def run_l2_fit_judge(
    job_signal: Mapping[str, Any],
    *,
    gri: float,
    model: str | None = None,
    timeout_seconds: float = 45.0,
) -> L2ScoringVerdict:
    """
    Ask Ollama whether the job fits an automation/technical solo freelancer pipeline.

    Returns fit_score 0..1 and recommend in approve|reject|manual.
    """
    title = str(job_signal.get("title") or "")[:400]
    desc = str(job_signal.get("description") or "")[:_MAX_CHARS]
    blob = f"title: {title}\n\ndescription:\n{desc}"
    if not blob.strip():
        return L2ScoringVerdict(0.5, "manual", "empty_signal", False)

    settings = get_settings()
    host = settings.ollama_host.rstrip("/")
    mdl = (model or "").strip() or settings.ghost_ollama_model
    llm = settings.llm_config.get("safety") if isinstance(settings.llm_config, dict) else None
    if isinstance(llm, dict):
        mm = llm.get("ollama_model")
        if isinstance(mm, str) and mm.strip():
            mdl = mm.strip()

    prompt = (
        "You score job posts for a solo technical freelancer (automation, scripts, APIs). "
        f"Pre-score GRI (0-1) from rules engine: {gri:.3f}. "
        "Reply JSON ONLY, no markdown: "
        '{"fit_score": number 0 to 1, "recommend": "approve" or "reject" or "manual", '
        '"reason": "short"}\n'
        "approve = good fit for one engineer; reject = spam/team-only/unclear; manual = uncertain.\n\n---\n"
        + blob
    )

    url = f"{host}/api/generate"
    payload = {
        "model": mdl,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.15},
    }

    try:
        async with ollama_ui_lane():
            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                body = resp.json()
    except (httpx.HTTPError, OSError, ValueError) as e:
        log.warning("l2_scoring.ollama_unreachable", error=str(e))
        return L2ScoringVerdict(0.5, "manual", "ollama_unreachable", False)

    raw = body.get("response") if isinstance(body, dict) else None
    if not isinstance(raw, str):
        return L2ScoringVerdict(0.5, "manual", "bad_ollama_shape", False)

    data = _parse_json_loose(raw)
    if not isinstance(data, dict):
        return L2ScoringVerdict(0.5, "manual", "unparseable_json", False)

    fs = data.get("fit_score")
    try:
        fit = float(fs) if fs is not None else 0.5
    except (TypeError, ValueError):
        fit = 0.5
    fit = max(0.0, min(1.0, fit))

    rec = str(data.get("recommend") or "manual").lower().strip()
    if rec not in ("approve", "reject", "manual"):
        rec = "manual"

    reason = data.get("reason")
    rs = str(reason) if reason is not None else "model_verdict"
    if len(rs) > 400:
        rs = rs[:397] + "..."

    log.info(
        "l2_scoring.verdict",
        fit_score=round(fit, 4),
        recommend=rec,
        reason=rs[:120],
        ollama_ok=True,
    )
    return L2ScoringVerdict(fit, rec, rs, True)
