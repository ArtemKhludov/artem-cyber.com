"""
Structured traversal reports for job scoring: each gate — pass / fail / skip, why, next step.

Used by the LangGraph scoring subgraph (merge_notify) and adapter structlog.
"""

from __future__ import annotations

from typing import Any, Mapping

from ghost_engine.scoring.normalizer import scoring_signal_nonempty


def _row(
    gate: str,
    outcome: str,
    code: str,
    why: str,
    proceeds: bool,
    next_step: str,
) -> dict[str, Any]:
    return {
        "gate": gate,
        "outcome": outcome,
        "code": code,
        "why": why,
        "proceeds": proceeds,
        "next": next_step,
    }


def _finalize(job_id: Any, steps: list[dict[str, Any]], flow_continues: bool) -> dict[str, Any]:
    parts: list[str] = []
    for s in steps:
        parts.append(f"{s['gate']}:{s['outcome']}({s['code']})→{s['next']}")
    summary = " | ".join(parts)
    return {
        "job_id": job_id,
        "steps": steps,
        "summary": summary,
        "flow_continues": flow_continues,
    }


def build_scoring_traversal_report(state: Mapping[str, Any]) -> dict[str, Any]:
    """
    Reconstruct how far the job got through ``build_scoring_graph`` from final state.

    Gates: normalize → l0 → gri_pipeline → l2_llm (pass/skip).
    """
    steps: list[dict[str, Any]] = []
    sig = state.get("job_signal")
    jid = sig.get("job_id") if isinstance(sig, dict) else None

    if not isinstance(sig, dict) or not scoring_signal_nonempty(sig):
        code = str(state.get("l0_code") or "NO_SIGNAL")
        why = (
            "No normalized job_signal"
            if not isinstance(sig, dict)
            else "Signal empty after normalize (no job_id/title, etc.)"
        )
        steps.append(
            _row(
                "normalize",
                "fail",
                code,
                why,
                False,
                "Graph stopped: no GRI computed; trash only via a separate adapter path",
            )
        )
        return _finalize(jid, steps, False)

    steps.append(
        _row(
            "normalize",
            "pass",
            "OK",
            "GraphQL/raw response reduced to job_signal",
            True,
            "L0 gate (scoring.yaml)",
        )
    )

    l0_ok = state.get("l0_passed") is True
    l0c = str(state.get("l0_code") or "")
    l0d = str(state.get("l0_detail") or "").strip()
    if not l0_ok:
        steps.append(
            _row(
                "l0",
                "fail",
                l0c,
                l0d or "Hard filter rule matched",
                False,
                "Stop: written to trash JSONL, no job notification queued",
            )
        )
        return _finalize(jid, steps, False)

    hold = bool(state.get("l0_soft_hold_missing_budget"))
    l0_why = l0d or "All L0 checks passed"
    if hold:
        l0_why += "; SOFT_HOLD_MISSING_BUDGET → needs_manual_review"
    steps.append(
        _row(
            "l0",
            "pass",
            l0c,
            l0_why,
            True,
            "GRI chain: market → client → effort → roi → budget_infer → estimates",
        )
    )

    applied_bi = state.get("budget_llm_infer_applied") is True
    skipped_bi = state.get("budget_llm_infer_skipped") is True
    bi_reason = str(state.get("budget_llm_infer_skip_reason") or "").strip()
    if applied_bi:
        bd = state.get("gri_breakdown")
        conf_l = ""
        if isinstance(bd, dict):
            c = bd.get("budget_llm_confidence")
            if isinstance(c, (int, float)):
                conf_l = f", confidence={float(c):.2f}"
        steps.append(
            _row(
                "budget_infer",
                "pass",
                "APPLIED",
                f"Ollama JSON → budget_value + GRI recalculation (B_source=llm_budget_infer{conf_l})",
                True,
                "estimates → l2_eligibility (L2 gray zone)",
            )
        )
    elif skipped_bi:
        _bi_skip_expl: dict[str, str] = {
            "disabled": "budget_llm_infer.enabled=false in scoring.yaml",
            "l0_failed": "internal: L0 failed before this node (unexpected)",
            "budget_value_present": "triage: budget_value already present",
            "hourly_max_present": "triage: hourly_budget_max already present",
            "b_source_mismatch": "triage: B_source ≠ require_b_source_equals",
            "no_breakdown": "triage: no gri_breakdown",
            "not_gray_zone": "triage: GRI outside l2_gray_zone",
            "no_gri": "triage: no numeric gri",
            "no_gray_config": "triage: no gri.l2_gray_zone in config",
            "no_signal": "triage: no job_signal in state",
            "rate_limit": "max_calls_per_minute limit",
            "sortie_limit": "max_calls_per_sortie limit (reset in begin_feed_sortie)",
            "bad_state": "no job_signal / gri_components before Ollama call",
            "ollama_unreachable": "Ollama HTTP/network/timeout",
            "bad_ollama_shape": "invalid generate API response",
            "unparseable_json": "response body is not JSON",
            "pydantic_reject": "JSON failed Pydantic schema",
            "empty_signal": "empty title+description for prompt",
            "low_confidence_or_null": "confidence < min or equiv_usd_fixed is null",
        }
        why_bi = _bi_skip_expl.get(bi_reason, bi_reason or "unknown")
        steps.append(
            _row(
                "budget_infer",
                "skip",
                bi_reason or "unknown",
                why_bi,
                True,
                "estimates → l2_eligibility (fail-open per YAML policy)",
            )
        )
    else:
        steps.append(
            _row(
                "budget_infer",
                "skip",
                "no_flags",
                "No budget_llm_infer_* in state (legacy/mocked graph) — node not recorded",
                True,
                "estimates → l2_eligibility",
            )
        )

    gri = state.get("gri")
    tier = state.get("job_tier")
    persona = str(state.get("persona_tag") or "")
    gri_s = f"{float(gri):.4f}" if isinstance(gri, (int, float)) else "n/a"
    steps.append(
        _row(
            "gri_pipeline",
            "pass",
            "GRI_ASSEMBLED",
            f"Final GRI={gri_s}, tier={tier}, persona={persona} (after roi and, if needed, budget_infer)",
            True,
            "price/hours snapshot → L2 gray zone eligibility",
        )
    )

    if state.get("l2_llm_skipped"):
        reason = str(state.get("l2_llm_skip_reason") or "unknown")
        expl = {
            "not_gray_zone": "GRI outside l2_gray_zone range in scoring.yaml",
            "llm_disabled": "l2_gray_zone.llm_enabled is off",
            "bad_state": "No data for the Ollama judge",
        }.get(reason, reason)
        steps.append(
            _row(
                "l2_llm",
                "skip",
                reason,
                expl,
                True,
                "merge_notify: structlog gri_metrics log, then adapter (cover / notify policy)",
            )
        )
    else:
        rec = str(state.get("l2_recommend") or "")
        fit = state.get("l2_fit_score")
        fit_s = f"{float(fit):.3f}" if isinstance(fit, (int, float)) else "n/a"
        steps.append(
            _row(
                "l2_llm",
                "pass",
                rec or "OK",
                f"Ollama judge: fit_score={fit_s}, recommend={rec}",
                True,
                "On reject in gray zone, tier may change to MANUAL/TRASH",
            )
        )

    return _finalize(jid, steps, True)
