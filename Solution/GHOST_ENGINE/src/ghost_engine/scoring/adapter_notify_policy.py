"""
Whether the browser sniff path should enqueue Redis/Telegram after GRI assembly.

Job JSON may still be persisted; this only gates operator notify noise.
"""

from __future__ import annotations

from typing import Any, Mapping

from ghost_engine.scoring.roi_calculator import JOB_TIER_TRASH, merge_gri_config


def should_adapter_enqueue_notify(
    graph_state: Mapping[str, Any],
    *,
    site_id: str,
    scoring_root: Mapping[str, Any],
) -> tuple[bool, str]:
    """
    Return (enqueue_ok, skip_reason).

    - When ``adapter_skip_notify_on_trash_tier`` is not false: no enqueue if ``job_tier`` is TRASH.
    - When ``adapter_enqueue_min_gri`` > 0: no enqueue if GRI is below that floor.
    """
    sid = site_id.strip() if site_id.strip() else None
    cfg = merge_gri_config(scoring_root, sid)

    if cfg.get("adapter_skip_notify_on_trash_tier") is not False:
        tier = graph_state.get("job_tier")
        if isinstance(tier, str) and tier.strip().upper() == JOB_TIER_TRASH:
            return False, "trash_tier"

    gri_raw = graph_state.get("gri")
    gri_f: float | None = None
    if isinstance(gri_raw, (int, float)):
        gri_f = float(gri_raw)

    raw_min = cfg.get("adapter_enqueue_min_gri")
    try:
        min_gri = float(raw_min) if raw_min is not None else 0.0
    except (TypeError, ValueError):
        min_gri = 0.0
    if min_gri > 0.0:
        if gri_f is None:
            return False, "gri_missing"
        if gri_f < min_gri:
            return False, "below_adapter_min_gri"

    return True, ""
