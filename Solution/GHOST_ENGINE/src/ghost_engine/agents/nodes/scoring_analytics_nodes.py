"""
LangGraph nodes for GRI pipeline: market → client DNA → effort → ROI assembly.

Reads canonical ``job_signal`` only; site-specific raw JSON is normalized upstream.
"""

from __future__ import annotations

from typing import Any, Mapping

from ghost_engine.agents.nodes.scoring_node import _resolve_job_signal
from ghost_engine.scoring.budget_infer_llm import (
    budget_infer_rate_allow,
    budget_infer_sortie_available,
    budget_infer_sortie_consume,
    run_budget_infer_ollama,
    triage_budget_llm_infer,
)
from ghost_engine.scoring.engine import L0_CODE_SOFT_HOLD_MISSING_BUDGET, ScoringEngine
from ghost_engine.scoring.gate_ledger import build_scoring_traversal_report
from ghost_engine.scoring.gri_log import log_gri_breakdown_event
from ghost_engine.scoring.l2_scoring_llm import run_l2_fit_judge
from ghost_engine.scoring.normalizer import scoring_signal_nonempty
from ghost_engine.scoring.roi_calculator import (
    JOB_TIER_MANUAL_REVIEW,
    JOB_TIER_TRASH,
    finalize_gri_scoring_pipeline,
    gri_compute_client_factors,
    gri_compute_effort_factors,
    gri_compute_market_factors,
    merge_gri_config,
)
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


def _gri_cfg_for_state(state: Mapping[str, Any], sig: Mapping[str, Any]) -> dict[str, Any]:
    eng = ScoringEngine()
    sid = sig.get("source_site") or state.get("site_id")
    return merge_gri_config(eng.scoring_root, str(sid).strip() if isinstance(sid, str) else None)


def _merge_gri_components(state: Mapping[str, Any], fragment: dict[str, Any]) -> dict[str, Any]:
    prev = state.get("gri_components")
    base: dict[str, Any] = dict(prev) if isinstance(prev, dict) else {}
    base.update(fragment)
    return base


def _with_state(state: Mapping[str, Any], **updates: Any) -> dict[str, Any]:
    """LangGraph plain ``dict`` state replaces on each node return; merge to preserve keys."""
    out = dict(state)
    out.update(updates)
    return out


def scoring_graph_normalize(state: dict[str, Any]) -> dict[str, Any]:
    """Resolve ``job_signal`` from ``raw_json``+``site_id`` or passthrough; reset GRI staging."""
    logs: list[str] = list(state.get("decision_logs", []))
    sig = _resolve_job_signal(state)
    if sig is None:
        logs.append("[scoring_graph] normalize: no job_signal")
        return _with_state(
            state,
            decision_logs=logs,
            job_signal=None,
            gri_components={},
            l0_passed=False,
            l0_code="NO_SIGNAL",
        )
    if not scoring_signal_nonempty(sig):
        logs.append("[scoring_graph] normalize: insufficient_signal")
        return _with_state(
            state,
            decision_logs=logs,
            job_signal=None,
            gri_components={},
            l0_passed=False,
            l0_code="EMPTY_SIGNAL",
        )
    return _with_state(
        state,
        job_signal=dict(sig),
        gri_components={},
        decision_logs=logs,
    )


def scoring_graph_l0(state: dict[str, Any]) -> dict[str, Any]:
    """Hard L0 gate; stable codes for routing and logs."""
    sig = state.get("job_signal")
    if not isinstance(sig, dict):
        return _with_state(state, l0_passed=False)
    eng = ScoringEngine()
    ok, code, detail = eng.evaluate_l0_with_code(sig)
    logs: list[str] = list(state.get("decision_logs", []))
    logs.append(f"[scoring_graph] L0 {code} {detail}")
    return _with_state(
        state,
        l0_passed=ok,
        l0_code=code,
        l0_detail=detail,
        l0_soft_hold_missing_budget=(code == L0_CODE_SOFT_HOLD_MISSING_BUDGET),
        decision_logs=logs,
    )


def scoring_market_context_node(state: dict[str, Any]) -> dict[str, Any]:
    sig = state.get("job_signal")
    if not isinstance(sig, dict):
        return dict(state)
    cfg = _gri_cfg_for_state(state, sig)
    mkt = gri_compute_market_factors(sig, cfg)
    return _with_state(state, gri_components=_merge_gri_components(state, mkt))


def scoring_client_dna_node(state: dict[str, Any]) -> dict[str, Any]:
    sig = state.get("job_signal")
    if not isinstance(sig, dict):
        return dict(state)
    cfg = _gri_cfg_for_state(state, sig)
    cli = gri_compute_client_factors(sig, cfg)
    return _with_state(state, gri_components=_merge_gri_components(state, cli))


def scoring_effort_estimator_node(state: dict[str, Any]) -> dict[str, Any]:
    sig = state.get("job_signal")
    if not isinstance(sig, dict):
        return dict(state)
    cfg = _gri_cfg_for_state(state, sig)
    eff = gri_compute_effort_factors(sig, cfg)
    return _with_state(state, gri_components=_merge_gri_components(state, eff))


def scoring_estimates_snapshot_node(state: dict[str, Any]) -> dict[str, Any]:
    """
    Derive operator-facing price/time hints from GRI components (no extra LLM).

    Uses ``B_raw`` dollar imputation and ``C_complexity`` × ``estimated_hours_default`` from GRI config.
    """
    sig = state.get("job_signal")
    bd = state.get("gri_breakdown")
    if not isinstance(sig, dict):
        return dict(state)
    cfg = _gri_cfg_for_state(state, sig)
    price: float | None = None
    hours: float | None = None
    conf = 0.35
    if isinstance(bd, dict):
        br = bd.get("B_raw")
        if isinstance(br, (int, float)) and br > 0:
            price = float(br)
            conf = min(0.88, conf + 0.28)
        cc = bd.get("C_complexity")
        if isinstance(cc, (int, float)) and cc > 0:
            try:
                est_h = float(cfg.get("estimated_hours_default") or 10.0)
            except (TypeError, ValueError):
                est_h = 10.0
            raw_h = est_h * float(cc) / 2.0
            hours = max(1.0, min(520.0, raw_h))
            conf = min(0.92, conf + 0.22)
    conf_out: float | None = conf if (price is not None or hours is not None) else None
    logs: list[str] = list(state.get("decision_logs", []))
    logs.append(
        f"[scoring_graph] estimates price={price} hours={hours} conf={conf_out}"
    )
    return _with_state(
        state,
        estimated_price_usd=price,
        estimated_time_hours=hours,
        estimate_confidence=conf_out,
        decision_logs=logs,
    )


def scoring_roi_router_node(state: dict[str, Any]) -> dict[str, Any]:
    """Assemble GRI, tier, persona from accumulated ``gri_components`` (same path as engine)."""
    sig = state.get("job_signal")
    comps = state.get("gri_components")
    if not isinstance(sig, dict) or not isinstance(comps, dict):
        return dict(state)
    cfg = _gri_cfg_for_state(state, sig)
    eng = ScoringEngine()
    tags = eng.collect_upsell_tags(sig)
    sid = sig.get("source_site") or state.get("site_id")
    gri, breakdown, tier, persona = finalize_gri_scoring_pipeline(
        comps,
        sig,
        cfg,
        sid,
        job_tags=tags,
    )
    logs: list[str] = list(state.get("decision_logs", []))
    logs.append(f"[scoring_graph] GRI={gri:.4f} tier={tier} persona={persona}")
    return _with_state(
        state,
        gri=gri,
        gri_breakdown=breakdown,
        job_tier=tier,
        persona_tag=persona,
        decision_logs=logs,
    )


async def scoring_budget_llm_infer_node(state: dict[str, Any]) -> dict[str, Any]:
    """
    Optional Ollama infer for USD equivalent (triage + rate limit); recomputes GRI client leg.

    Runs after first ROI assembly; disabled by default in scoring.yaml.
    """
    logs: list[str] = list(state.get("decision_logs", []))
    if not state.get("l0_passed"):
        return _with_state(
            state,
            budget_llm_infer_skipped=True,
            budget_llm_infer_skip_reason="l0_failed",
            decision_logs=logs,
        )

    eng = ScoringEngine()
    root = eng.scoring_root
    bi = root.get("budget_llm_infer")
    if not isinstance(bi, dict) or not bi.get("enabled"):
        return _with_state(
            state,
            budget_llm_infer_skipped=True,
            budget_llm_infer_skip_reason="disabled",
            decision_logs=logs,
        )

    run_ok, tri_reason = triage_budget_llm_infer(state, bi, scoring_root=root)
    if not run_ok:
        logs.append(f"[scoring_graph] budget_llm_infer_skip={tri_reason}")
        log.info("budget_infer.skipped", reason=tri_reason)
        return _with_state(
            state,
            budget_llm_infer_skipped=True,
            budget_llm_infer_skip_reason=tri_reason,
            decision_logs=logs,
        )

    raw_sortie = bi.get("max_calls_per_sortie")
    try:
        max_sortie = int(raw_sortie) if raw_sortie is not None else None
    except (TypeError, ValueError):
        max_sortie = None
    if max_sortie is not None and max_sortie <= 0:
        max_sortie = None

    if max_sortie is not None and not budget_infer_sortie_available(max_sortie):
        log.info("budget_infer.skipped", reason="sortie_limit", max_per_sortie=max_sortie)
        logs.append("[scoring_graph] budget_llm_infer_skip=sortie_limit")
        return _with_state(
            state,
            budget_llm_infer_skipped=True,
            budget_llm_infer_skip_reason="sortie_limit",
            decision_logs=logs,
        )

    max_per = int(bi.get("max_calls_per_minute") or 8)
    if not budget_infer_rate_allow(max_per):
        log.warning("budget_infer.rate_limited", max_per_minute=max_per)
        log.info("budget_infer.skipped", reason="rate_limit")
        logs.append("[scoring_graph] budget_llm_infer_skip=rate_limit")
        return _with_state(
            state,
            budget_llm_infer_skipped=True,
            budget_llm_infer_skip_reason="rate_limit",
            decision_logs=logs,
        )

    sig = state.get("job_signal")
    comps = state.get("gri_components")
    if not isinstance(sig, dict) or not isinstance(comps, dict):
        log.info("budget_infer.skipped", reason="bad_state")
        return _with_state(
            state,
            budget_llm_infer_skipped=True,
            budget_llm_infer_skip_reason="bad_state",
            decision_logs=logs,
        )

    if max_sortie is not None:
        budget_infer_sortie_consume()

    verdict = await run_budget_infer_ollama(sig, bi)
    if not verdict.raw_ok:
        logs.append(f"[scoring_graph] budget_llm_infer_fail reason={verdict.reason}")
        log.info("budget_infer.skipped", reason=verdict.reason)
        return _with_state(
            state,
            budget_llm_infer_skipped=True,
            budget_llm_infer_skip_reason=verdict.reason,
            decision_logs=logs,
        )

    min_c = float(bi.get("min_confidence") or 0.55)
    if verdict.confidence < min_c or verdict.equiv_usd_fixed is None:
        logs.append(
            f"[scoring_graph] budget_llm_infer_skip=low_confidence_or_null "
            f"c={verdict.confidence:.2f}"
        )
        log.info("budget_infer.skipped", reason="low_confidence_or_null")
        return _with_state(
            state,
            budget_llm_infer_skipped=True,
            budget_llm_infer_skip_reason="low_confidence_or_null",
            decision_logs=logs,
        )

    sig_new = dict(sig)
    sig_new["budget_value"] = float(verdict.equiv_usd_fixed)
    cfg = _gri_cfg_for_state(state, sig_new)
    new_cli = gri_compute_client_factors(sig_new, cfg)
    comps_new = dict(comps)
    comps_new.update(new_cli)
    tags = eng.collect_upsell_tags(sig_new)
    sid = sig_new.get("source_site") or state.get("site_id")
    gri, breakdown, tier, persona = finalize_gri_scoring_pipeline(
        comps_new,
        sig_new,
        cfg,
        sid,
        job_tags=tags,
    )
    breakdown = dict(breakdown)
    breakdown["B_source"] = "llm_budget_infer"
    breakdown["B_raw"] = float(verdict.equiv_usd_fixed)
    breakdown["budget_llm_confidence"] = float(verdict.confidence)
    if verdict.hourly_equiv_usd is not None:
        breakdown["hourly_equiv_llm"] = float(verdict.hourly_equiv_usd)
    logs.append(
        f"[scoring_graph] budget_llm_infer_ok equiv={verdict.equiv_usd_fixed:.0f} "
        f"conf={verdict.confidence:.2f} GRI={gri:.4f}"
    )
    log.info(
        "budget_infer.applied",
        job_id=sig_new.get("job_id"),
        equiv_usd=verdict.equiv_usd_fixed,
        confidence=verdict.confidence,
    )
    return _with_state(
        state,
        job_signal=sig_new,
        gri_components=comps_new,
        gri=gri,
        gri_breakdown=breakdown,
        job_tier=tier,
        persona_tag=persona,
        budget_llm_infer_skipped=False,
        budget_llm_infer_applied=True,
        decision_logs=logs,
    )


def scoring_l2_eligibility_node(state: dict[str, Any]) -> dict[str, Any]:
    """Plan §4: mark whether GRI is in gray zone (candidate for L2 LLM)."""
    eng = ScoringEngine()
    sig = state.get("job_signal")
    sid: str | None = None
    if isinstance(sig, dict):
        s = sig.get("source_site")
        if isinstance(s, str) and s.strip():
            sid = s.strip()
    if sid is None and isinstance(state.get("site_id"), str) and state["site_id"].strip():
        sid = state["site_id"].strip()
    cfg = merge_gri_config(eng.scoring_root, sid)
    zone = cfg.get("l2_gray_zone")
    logs: list[str] = list(state.get("decision_logs", []))
    elig = False
    if isinstance(zone, dict) and zone.get("enabled"):
        gri = state.get("gri")
        if isinstance(gri, (int, float)):
            lo = float(zone.get("gri_min") or 0.5)
            hi = float(zone.get("gri_max") or 0.79)
            gf = float(gri)
            elig = lo <= gf <= hi
            if elig:
                logs.append(f"[scoring_graph] L2_gray_zone_eligible gri={gf:.3f}")
    return _with_state(state, l2_gray_zone_eligible=elig, decision_logs=logs)


async def scoring_l2_ollama_node(state: dict[str, Any]) -> dict[str, Any]:
    """Plan §4 optional_L2_llm: Ollama JSON judge in gray zone (same stack as safety)."""
    if not state.get("l2_gray_zone_eligible"):
        return _with_state(
            state,
            l2_llm_skipped=True,
            l2_llm_skip_reason="not_gray_zone",
        )
    eng = ScoringEngine()
    sig = state.get("job_signal")
    sid: str | None = None
    if isinstance(sig, dict):
        s = sig.get("source_site")
        if isinstance(s, str) and s.strip():
            sid = s.strip()
    if sid is None and isinstance(state.get("site_id"), str) and state["site_id"].strip():
        sid = state["site_id"].strip()
    cfg = merge_gri_config(eng.scoring_root, sid)
    zone = cfg.get("l2_gray_zone") if isinstance(cfg.get("l2_gray_zone"), dict) else {}
    if not zone.get("llm_enabled"):
        return _with_state(
            state,
            l2_llm_skipped=True,
            l2_llm_skip_reason="llm_disabled",
        )
    gri = state.get("gri")
    if not isinstance(sig, dict) or not isinstance(gri, (int, float)):
        return _with_state(
            state,
            l2_llm_skipped=True,
            l2_llm_skip_reason="bad_state",
        )
    om = zone.get("ollama_model")
    model = str(om).strip() if isinstance(om, str) and om.strip() else None
    timeout = float(zone.get("timeout_sec") or 45.0)
    verdict = await run_l2_fit_judge(
        sig,
        gri=float(gri),
        model=model,
        timeout_seconds=timeout,
    )
    logs: list[str] = list(state.get("decision_logs", []))
    logs.append(
        f"[scoring_graph] L2_verdict fit={verdict.fit_score:.3f} rec={verdict.recommend}"
    )
    bd = dict(state.get("gri_breakdown") or {})
    bd["l2_fit_score"] = verdict.fit_score
    bd["l2_recommend"] = verdict.recommend
    bd["l2_raw_ok"] = verdict.raw_ok
    job_tier = state.get("job_tier")
    reject_max = float(zone.get("reject_max_fit_score") or 0.28)
    forced = str(zone.get("reject_force_tier") or JOB_TIER_MANUAL_REVIEW).strip().upper()
    if verdict.recommend == "reject" and verdict.fit_score <= reject_max:
        if forced == "TRASH":
            job_tier = JOB_TIER_TRASH
        else:
            job_tier = JOB_TIER_MANUAL_REVIEW
        bd["l2_reject_forced_tier"] = job_tier
    return _with_state(
        state,
        gri_breakdown=bd,
        job_tier=job_tier,
        l2_fit_score=verdict.fit_score,
        l2_recommend=verdict.recommend,
        l2_llm_skipped=False,
        decision_logs=logs,
    )


def scoring_merge_notify_state(state: dict[str, Any]) -> dict[str, Any]:
    """Plan §4 merge_notify_state: finalize + structlog gri_metrics (plan §8)."""
    logs: list[str] = list(state.get("decision_logs", []))
    logs.append("[scoring_graph] merge_notify pipeline_complete")
    traversal = build_scoring_traversal_report(state)
    logs.append(f"[scoring_graph] traversal {traversal.get('summary_ru', '')[:500]}")
    sig = state.get("job_signal")
    gri = state.get("gri")
    bd = state.get("gri_breakdown")
    if isinstance(gri, (int, float)) and isinstance(bd, dict):
        try:
            log_gri_breakdown_event(
                job_id=sig.get("job_id") if isinstance(sig, dict) else None,
                site_id=state.get("site_id"),
                gri=float(gri),
                job_tier=str(state.get("job_tier") or ""),
                persona_tag=str(state.get("persona_tag") or ""),
                breakdown=bd,
                l2_fit_score=float(state["l2_fit_score"])
                if isinstance(state.get("l2_fit_score"), (int, float))
                else None,
                l2_recommend=str(state["l2_recommend"])
                if isinstance(state.get("l2_recommend"), str)
                else None,
            )
        except (TypeError, ValueError) as exc:
            log.warning("scoring.gri_graph_log_failed", error=str(exc))
    return _with_state(
        state,
        scoring_pipeline_complete=True,
        scoring_traversal=traversal,
        decision_logs=logs,
    )


def route_after_scoring_normalize(state: dict[str, Any]) -> str:
    return "l0" if isinstance(state.get("job_signal"), dict) else "end"


def route_after_scoring_l0(state: dict[str, Any]) -> str:
    return "market" if state.get("l0_passed") is True else "end"
