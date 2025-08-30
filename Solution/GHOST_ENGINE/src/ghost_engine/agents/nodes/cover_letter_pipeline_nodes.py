"""LangGraph nodes: cover render → Gemini → typography → footprint → Ollama judge."""

from __future__ import annotations

import time
from typing import Any

from ghost_engine.config.settings import get_settings
from ghost_engine.negotiation.llm_cascade import (
    _cascade_cfg,
    _gemini_generate_async,
    _gemini_max_tokens_for_tier,
    _gemini_temperature_for_tier,
    _notify_api_failure,
    apply_pipeline_typography,
    pipeline_footprint_hits,
    pipeline_judge_blocked,
    select_gemini_model_for_job,
)
from ghost_engine.negotiation.pipeline import load_negotiation_pipeline
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


def cover_letter_render_pipeline_node(state: dict[str, Any]) -> dict[str, Any]:
    from ghost_engine.agents.nodes.cover_letter_parts import (
        build_cover_letter_render_updates,
        should_skip_llm_for_cover,
    )

    out = build_cover_letter_render_updates(state)
    if not out.get("cover_letter_prompt_rendered"):
        out["cover_letter_pipeline_skip_llm"] = True
        return out
    out["cover_letter_pipeline_skip_llm"] = should_skip_llm_for_cover(state)
    return out


async def cover_letter_gemini_pipeline_node(state: dict[str, Any]) -> dict[str, Any]:
    rendered = state.get("cover_letter_prompt_rendered")
    if not isinstance(rendered, str) or not rendered.strip():
        return {}
    site_id = str(state.get("site_id") or "unknown").strip() or "unknown"
    tags = state.get("cover_letter_pipeline_tags")
    tags_list = [x for x in tags if isinstance(x, str)] if isinstance(tags, list) else []
    l1_raw = state.get("l1_score")
    l1 = l1_raw if isinstance(l1_raw, int) else None
    desc_len_raw = state.get("cover_letter_pipeline_desc_len")
    desc_len = desc_len_raw if isinstance(desc_len_raw, int) else None

    llm_cfg = get_settings().llm_config
    cascade = _cascade_cfg(llm_cfg)
    try:
        timeout_sec = float(cascade.get("request_timeout_sec", 90))
    except (TypeError, ValueError):
        timeout_sec = 90.0

    t0 = time.monotonic()
    model_id, tier = select_gemini_model_for_job(
        tags_list,
        l1,
        desc_len,
        llm_config=llm_cfg,
    )
    temp = _gemini_temperature_for_tier(tier, llm_cfg)
    max_tok = _gemini_max_tokens_for_tier(tier, llm_cfg)

    log.info("cover_graph.gemini_start", site_id=site_id, tier=tier, model=model_id)

    text, err = await _gemini_generate_async(
        model_id,
        rendered,
        timeout_sec=timeout_sec,
        temperature=temp,
        max_output_tokens=max_tok,
    )
    elapsed_ms = (time.monotonic() - t0) * 1000.0
    meta = {
        "latency_ms_gemini": round(elapsed_ms, 2),
        "tier": tier,
        "model": model_id,
    }
    if err:
        log.warning("cover_graph.gemini_failed", site_id=site_id, error=err)
        await _notify_api_failure(site_id, err)
        logs = state.get("decision_logs")
        base = list(logs) if isinstance(logs, list) else []
        base.append(f"cover_letter_llm:gemini_failed:{err[:200]}")
        return {
            "cover_letter_gemini_error": err,
            "cover_letter_llm_tier": tier,
            "cover_letter_gemini_model": model_id,
            "cover_letter_llm_meta": {**meta, "ok": False, "error_code": "gemini_failed"},
            "needs_manual_review": True,
            "decision_logs": base,
        }

    return {
        "cover_letter_draft_raw": text,
        "cover_letter_gemini_error": None,
        "cover_letter_llm_tier": tier,
        "cover_letter_gemini_model": model_id,
        "cover_letter_llm_meta": {**meta, "ok": True, "error_code": None},
        "cover_letter_gen_t0": t0,
    }


def cover_letter_typography_pipeline_node(state: dict[str, Any]) -> dict[str, Any]:
    raw = state.get("cover_letter_draft_raw")
    if not isinstance(raw, str) or not raw.strip():
        return {}
    pl = load_negotiation_pipeline()
    polished = apply_pipeline_typography(raw, pl)
    return {"cover_letter_draft": polished}


def cover_letter_footprint_pipeline_node(state: dict[str, Any]) -> dict[str, Any]:
    draft = state.get("cover_letter_draft")
    if not isinstance(draft, str) or not draft.strip():
        return {"cover_letter_footprint_blocked": True}
    pl = load_negotiation_pipeline()
    hits = pipeline_footprint_hits(draft, pl)
    if not hits:
        return {"cover_letter_footprint_blocked": False}
    log.warning("cover_graph.footprint_reject", hits=list(hits))
    logs = state.get("decision_logs")
    base = list(logs) if isinstance(logs, list) else []
    base.append(f"cover_letter_llm:output_footprint:{','.join(hits)[:200]}")
    return {
        "cover_letter_footprint_blocked": True,
        "needs_manual_review": True,
        "decision_logs": base,
    }


async def cover_letter_judge_pipeline_node(state: dict[str, Any]) -> dict[str, Any]:
    draft = state.get("cover_letter_draft")
    if not isinstance(draft, str) or not draft.strip():
        return {}
    pl = load_negotiation_pipeline()
    blocked, reason = await pipeline_judge_blocked(draft, pl)
    t0 = state.get("cover_letter_gen_t0")
    latency_extra = 0.0
    if isinstance(t0, (int, float)):
        latency_extra = (time.monotonic() - float(t0)) * 1000.0

    meta = dict(state.get("cover_letter_llm_meta") or {})
    meta["latency_ms_total"] = round(latency_extra, 2)

    if blocked:
        log.warning("cover_graph.judge_reject", reason=reason)
        logs = state.get("decision_logs")
        base = list(logs) if isinstance(logs, list) else []
        base.append(f"cover_letter_llm:output_safety:{reason[:200]}")
        return {
            "cover_letter_llm_meta": {**meta, "ok": False, "error_code": "output_safety"},
            "needs_manual_review": True,
            "decision_logs": base,
        }

    log.info("cover_graph.done", latency_ms_total=meta.get("latency_ms_total"))
    return {
        "cover_letter_text": draft,
        "cover_letter_llm_meta": {**meta, "ok": True, "error_code": None},
    }


def route_after_cover_render(state: dict[str, Any]) -> str:
    if not state.get("cover_letter_prompt_rendered"):
        return "end"
    if state.get("cover_letter_pipeline_skip_llm"):
        return "end"
    return "gemini"


def route_after_cover_gemini(state: dict[str, Any]) -> str:
    if state.get("cover_letter_gemini_error"):
        return "end"
    return "typography"


def route_after_cover_footprint(state: dict[str, Any]) -> str:
    if state.get("cover_letter_footprint_blocked"):
        return "end"
    return "judge"
