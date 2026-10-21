from __future__ import annotations

import asyncio
from typing import Any

from ghost_engine.agents.graph import ainvoke_cover_letter_graph, merge_cover_letter_output
from ghost_engine.config.settings import get_settings
from ghost_engine.notify.contract import ApprovedJobNotifyPayload
from ghost_engine.notify.redis_queue import enqueue_notify_job_sync
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


def _synthesize_approved_jobs_if_needed(state: dict[str, Any]) -> None:
    """
    Adapter path runs the scoring graph without ``scoring_node``; ensure one ``approved_jobs`` row
    so cover render + Redis notify match the LangGraph main graph contract.
    """
    jobs = state.get("approved_jobs")
    if isinstance(jobs, list) and jobs:
        return
    sig = state.get("job_signal")
    if not isinstance(sig, dict):
        return
    sid_raw = state.get("site_id")
    site_out = str(sid_raw).strip() if isinstance(sid_raw, str) and sid_raw.strip() else "unknown"
    title = str(sig.get("title") or "")
    desc = str(sig.get("description") or "")
    gri_raw = state.get("gri")
    score = 0
    if isinstance(gri_raw, (int, float)):
        score = max(0, min(100, int(round(float(gri_raw) * 100.0))))
    from ghost_engine.scoring.engine import ScoringEngine

    tags = ScoringEngine().collect_upsell_tags(sig)
    entry: dict[str, Any] = {
        "job_id": sig.get("job_id"),
        "site_id": site_out,
        "l1_score": score,
        "title": title,
        "description": desc,
        "job_signal": dict(sig),
        "opsec": {},
        "needs_manual_review": bool(state.get("needs_manual_review")),
        "job_tags": tags,
        "gri": float(gri_raw) if isinstance(gri_raw, (int, float)) else None,
        "job_tier": state.get("job_tier"),
        "persona_tag": state.get("persona_tag"),
        "gri_breakdown": state.get("gri_breakdown"),
        "estimated_price_usd": state.get("estimated_price_usd"),
        "estimated_time_hours": state.get("estimated_time_hours"),
        "estimate_confidence": state.get("estimate_confidence"),
    }
    state["approved_jobs"] = [entry]


def _enqueue_notify_after_cover(state: dict[str, Any], updates: dict[str, Any]) -> None:
    """Push notify after cover pipeline so Redis payload includes cover_letter (dedupe blocks a second enqueue from scoring)."""
    jobs = state.get("approved_jobs")
    if not isinstance(jobs, list) or not jobs:
        return
    entry = dict(jobs[-1])
    text = updates.get("cover_letter_text")
    if not (isinstance(text, str) and text.strip()):
        draft = updates.get("cover_letter_draft")
        text = draft if isinstance(draft, str) and draft.strip() else None
    if isinstance(text, str) and text.strip():
        entry["cover_letter"] = text.strip()
    else:
        entry["cover_letter"] = None
    try:
        settings = get_settings()
        payload = ApprovedJobNotifyPayload.from_scoring_entry(entry)
        enqueue_notify_job_sync(settings.redis_url, payload)
    except Exception as exc:
        log.warning("notify.enqueue_after_cover_failed", error=str(exc))


def cover_letter_node(state: dict[str, Any]) -> dict[str, Any]:
    """
    Run cover-letter LangGraph: render → Gemini → typography → footprint → judge.

    See ``config/negotiation_pipeline.yaml`` for cockpit toggles.
    When ``GEMINI_API_KEY`` is missing or an asyncio loop is already running,
    the graph stops after render (same as before).
    """
    _synthesize_approved_jobs_if_needed(state)
    jobs = state.get("approved_jobs")
    if not isinstance(jobs, list) or not jobs:
        return {}

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        pass
    else:
        log.info(
            "cover_letter.llm_skipped_nested_loop",
            hint="Use ainvoke_cover_letter_graph from an async worker when inside a running loop",
        )
        from ghost_engine.agents.nodes.cover_letter_parts import build_cover_letter_render_updates
        from ghost_engine.scoring.cover_gate_ledger import build_cover_traversal_report

        upd = build_cover_letter_render_updates(state)
        _enqueue_notify_after_cover(state, upd)
        merged = {**state, **upd}
        return {
            **upd,
            "cover_pipeline_traversal": build_cover_traversal_report(merged),
        }

    async def _run() -> dict[str, Any]:
        return await ainvoke_cover_letter_graph(state)

    try:
        final = asyncio.run(_run())
    except Exception as exc:
        log.warning("cover_letter.graph_failed", error=str(exc), error_type=type(exc).__name__)
        from ghost_engine.agents.nodes.cover_letter_parts import build_cover_letter_render_updates
        from ghost_engine.scoring.cover_gate_ledger import build_cover_traversal_report

        upd = build_cover_letter_render_updates(state)
        _enqueue_notify_after_cover(state, upd)
        merged = {**state, **upd}
        return {
            **upd,
            "cover_pipeline_traversal": build_cover_traversal_report(merged),
        }

    _enqueue_notify_after_cover(state, final)
    from ghost_engine.scoring.cover_gate_ledger import build_cover_traversal_report

    merged = dict(merge_cover_letter_output(final))
    merged["cover_pipeline_traversal"] = build_cover_traversal_report(final)
    return merged
