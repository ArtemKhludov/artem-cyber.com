"""
PII-safe GRI breakdown for structlog (plan §8 calibration / offline weights).
"""

from __future__ import annotations

from typing import Any, Mapping

from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

# Keys safe to log as-is (numeric / short enum / flags).
_SAFE_GRI_KEYS: frozenset[str] = frozenset(
    {
        "GRI",
        "GRI_raw",
        "GRI_before_post_rules",
        "GRI_capped",
        "B_norm",
        "B_raw",
        "B_raw_estimate",
        "B_source",
        "T_client",
        "T_rating_used",
        "T_hire_rate",
        "T_hr_note",
        "V_market",
        "V_freshness",
        "V_freshness_note",
        "V_age_hours",
        "K_competition",
        "K_applicants",
        "K_invitations_sent",
        "K_proposals_tier_mid",
        "K_sourcing_updates",
        "K_note",
        "C_complexity",
        "C_desc_len",
        "C_tech_hits",
        "C_ontology_mandatory_count",
        "M_scope",
        "M_scope_term_hits",
        "M_positions",
        "job_tier",
        "persona_tag",
        "source_site",
        "gate_high_complexity_low_budget",
        "scope_strong_team_signal",
        "l2_fit_score",
        "l2_recommend",
        "l2_raw_ok",
        "l2_reject_forced_tier",
        "V_freshness_note",
        "budget_llm_confidence",
        "hourly_equiv_llm",
    }
)


def sanitize_gri_breakdown_for_log(breakdown: Mapping[str, Any]) -> dict[str, Any]:
    """Strip unknown keys and truncate string values (no title/description blobs)."""
    out: dict[str, Any] = {}
    for k, v in breakdown.items():
        if k not in _SAFE_GRI_KEYS:
            continue
        if isinstance(v, str):
            if len(v) > 120:
                out[k] = v[:117] + "..."
            else:
                out[k] = v
        elif isinstance(v, (int, float, bool)) or v is None:
            out[k] = v
        elif isinstance(v, dict):
            out[k] = sanitize_gri_breakdown_for_log(v)
    return out


def log_gri_breakdown_event(
    *,
    job_id: Any,
    site_id: Any,
    gri: float,
    job_tier: str,
    persona_tag: str,
    breakdown: Mapping[str, Any],
    l2_fit_score: float | None = None,
    l2_recommend: str | None = None,
) -> None:
    """Plan §8: structured log for calibration without PII."""
    payload = sanitize_gri_breakdown_for_log(breakdown)
    payload["gri"] = round(float(gri), 6)
    payload["job_tier"] = job_tier
    payload["persona_tag"] = persona_tag
    if l2_fit_score is not None:
        payload["l2_fit_score"] = round(float(l2_fit_score), 4)
    if l2_recommend is not None:
        payload["l2_recommend"] = str(l2_recommend)[:80]
    jid = str(job_id) if job_id is not None else "?"
    sid = str(site_id) if site_id is not None else "?"
    log.info("scoring.gri_breakdown", job_id=jid, site_id=sid, gri_metrics=payload)
