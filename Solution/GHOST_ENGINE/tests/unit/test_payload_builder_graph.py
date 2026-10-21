"""build_notify_payload_from_scoring_graph_state."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from ghost_engine.notify.payload_builder import build_notify_payload_from_scoring_graph_state
from ghost_engine.scoring.engine import L0_CODE_PASS


def test_build_from_graph_merges_gri_and_opsec() -> None:
    sig = {
        "job_id": "a1",
        "title": "Safe title",
        "description": "Normal work description.",
        "budget_value": 500.0,
        "source_site": "upwork",
        "client_stats": {"country": "USA", "avg_rating": 4.8},
    }
    state = {
        "job_signal": dict(sig),
        "gri": 0.88,
        "persona_tag": "sniper",
        "job_tier": "ZERO_TOUCH",
        "l0_code": L0_CODE_PASS,
    }
    with patch(
        "ghost_engine.notify.payload_builder._sanitize_for_storage",
        return_value=(sig, {"semantic_is_safe": True, "regex_risk": 0.0}, False, []),
    ):
        p = build_notify_payload_from_scoring_graph_state(state, "upwork")
    assert p is not None
    assert p.gri == pytest.approx(0.88)
    assert p.persona_tag == "sniper"
    assert p.l1_score == 88


def test_build_from_graph_includes_estimates() -> None:
    sig = {
        "job_id": "e1",
        "title": "t",
        "description": "d",
        "source_site": "upwork",
    }
    state = {
        "job_signal": dict(sig),
        "gri": 0.5,
        "l0_code": L0_CODE_PASS,
        "estimated_price_usd": 450.0,
        "estimated_time_hours": 24.0,
        "estimate_confidence": 0.71,
    }
    with patch(
        "ghost_engine.notify.payload_builder._sanitize_for_storage",
        return_value=(sig, {"semantic_is_safe": True, "regex_risk": 0.0}, False, []),
    ):
        p = build_notify_payload_from_scoring_graph_state(state, "upwork")
    assert p is not None
    assert p.estimated_price_usd == pytest.approx(450.0)
    assert p.estimated_time_hours == pytest.approx(24.0)
    assert p.estimate_confidence == pytest.approx(0.71)


def test_high_gri_semantic_tension_flags_manual() -> None:
    sig = {"job_id": "b1", "title": "t", "description": "d", "source_site": "upwork"}
    state = {
        "job_signal": dict(sig),
        "gri": 0.95,
        "persona_tag": "consultant",
        "job_tier": "ZERO_TOUCH",
        "l0_code": L0_CODE_PASS,
    }
    with patch(
        "ghost_engine.notify.payload_builder._sanitize_for_storage",
        return_value=(
            sig,
            {"semantic_is_safe": False, "regex_risk": 0.0, "semantic_risk_level": "high"},
            True,
            [],
        ),
    ):
        p = build_notify_payload_from_scoring_graph_state(state, "upwork")
    assert p is not None
    assert p.opsec.get("high_gri_opsec_tension") is True
    assert p.needs_manual_review is True
