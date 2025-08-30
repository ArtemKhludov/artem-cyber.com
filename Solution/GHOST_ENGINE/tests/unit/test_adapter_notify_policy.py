"""adapter_notify_policy: GRI/tier gates for Telegram enqueue from sniff path."""

from __future__ import annotations

from ghost_engine.scoring.adapter_notify_policy import should_adapter_enqueue_notify
from ghost_engine.scoring.roi_calculator import JOB_TIER_TRASH


def _root(**gri_overrides: object) -> dict:
    base = {
        "gri": {
            "tier_high": 0.8,
            "tier_mid": 0.5,
            "adapter_enqueue_min_gri": 0.0,
            "adapter_skip_notify_on_trash_tier": True,
            **gri_overrides,
        }
    }
    return base


def test_skip_trash_tier() -> None:
    st = {"gri": 0.2, "job_tier": JOB_TIER_TRASH}
    ok, reason = should_adapter_enqueue_notify(st, site_id="upwork", scoring_root=_root())
    assert ok is False and reason == "trash_tier"


def test_skip_below_min_gri() -> None:
    st = {"gri": 0.3, "job_tier": "MANUAL_REVIEW"}
    ok, reason = should_adapter_enqueue_notify(
        st,
        site_id="upwork",
        scoring_root=_root(adapter_enqueue_min_gri=0.5),
    )
    assert ok is False and reason == "below_adapter_min_gri"


def test_allow_when_min_gri_zero() -> None:
    st = {"gri": 0.1, "job_tier": "MANUAL_REVIEW"}
    ok, _ = should_adapter_enqueue_notify(st, site_id="upwork", scoring_root=_root())
    assert ok is True


def test_trash_override_disabled() -> None:
    st = {"gri": 0.1, "job_tier": JOB_TIER_TRASH}
    ok, _ = should_adapter_enqueue_notify(
        st,
        site_id="upwork",
        scoring_root=_root(adapter_skip_notify_on_trash_tier=False),
    )
    assert ok is True
