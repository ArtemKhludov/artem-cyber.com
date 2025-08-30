"""budget_infer_llm: triage + Pydantic JSON (no live Ollama in CI)."""

from __future__ import annotations

import pytest

from ghost_engine.scoring.budget_infer_llm import (
    BudgetInferJSON,
    budget_infer_sortie_available,
    budget_infer_sortie_consume,
    reset_budget_infer_sortie_calls,
    triage_budget_llm_infer,
)


def test_triage_skips_when_budget_value_present() -> None:
    state = {
        "job_signal": {"budget_value": 100, "title": "x"},
        "gri_breakdown": {"B_source": "median_fallback"},
    }
    bi = {
        "enabled": True,
        "triage": {
            "require_budget_value_null": True,
            "require_hourly_budget_max_null": True,
            "require_b_source_equals": "median_fallback",
        },
    }
    ok, reason = triage_budget_llm_infer(state, bi, scoring_root={})
    assert ok is False and reason == "budget_value_present"


def test_triage_ok_when_l0_soft_hold_even_if_b_source_wrong() -> None:
    state = {
        "job_signal": {"title": "x"},
        "gri_breakdown": {"B_source": "hourly_budget_max_x_hours"},
        "l0_soft_hold_missing_budget": True,
    }
    bi = {
        "enabled": True,
        "triage": {
            "also_when_l0_soft_hold_missing_budget": True,
            "require_budget_value_null": True,
            "require_hourly_budget_max_null": True,
            "require_b_source_equals": "median_fallback",
        },
    }
    ok, reason = triage_budget_llm_infer(state, bi, scoring_root={})
    assert ok is True and reason == "l0_soft_hold_missing_budget"


def test_triage_soft_hold_disabled_follows_b_source() -> None:
    state = {
        "job_signal": {"title": "x"},
        "gri_breakdown": {"B_source": "hourly_budget_max_x_hours"},
        "l0_soft_hold_missing_budget": True,
    }
    bi = {
        "enabled": True,
        "triage": {
            "also_when_l0_soft_hold_missing_budget": False,
            "require_budget_value_null": True,
            "require_hourly_budget_max_null": True,
            "require_b_source_equals": "median_fallback",
        },
    }
    ok, reason = triage_budget_llm_infer(state, bi, scoring_root={})
    assert ok is False and reason == "b_source_mismatch"


def test_sortie_cap_resets_and_limits() -> None:
    reset_budget_infer_sortie_calls()
    assert budget_infer_sortie_available(2) is True
    budget_infer_sortie_consume()
    assert budget_infer_sortie_available(2) is True
    budget_infer_sortie_consume()
    assert budget_infer_sortie_available(2) is False
    reset_budget_infer_sortie_calls()
    assert budget_infer_sortie_available(2) is True


def test_triage_ok_median_fallback() -> None:
    state = {
        "job_signal": {"title": "Need dev", "description": "work"},
        "gri_breakdown": {"B_source": "median_fallback"},
        "gri": 0.6,
    }
    bi = {
        "enabled": True,
        "triage": {
            "require_budget_value_null": True,
            "require_hourly_budget_max_null": True,
            "require_b_source_equals": "median_fallback",
            "require_gri_gray_zone": False,
        },
    }
    ok, reason = triage_budget_llm_infer(state, bi, scoring_root={})
    assert ok is True and reason == "ok"


def test_budget_infer_json_model_accepts_equiv() -> None:
    m = BudgetInferJSON.model_validate(
        {"equiv_usd_fixed": 2500.0, "confidence": 0.72, "hourly_equiv_usd": None}
    )
    assert m.equiv_usd_fixed == 2500.0
    assert m.confidence == 0.72


@pytest.mark.parametrize(
    ("gri", "expect_ok"),
    [
        (0.55, True),
        (0.85, False),
    ],
)
def test_triage_gray_zone(gri: float, expect_ok: bool) -> None:
    scoring_root = {
        "gri": {"l2_gray_zone": {"gri_min": 0.5, "gri_max": 0.79}},
    }
    state = {
        "job_signal": {"title": "x"},
        "gri_breakdown": {"B_source": "median_fallback"},
        "gri": gri,
    }
    bi = {
        "enabled": True,
        "triage": {
            "require_budget_value_null": True,
            "require_hourly_budget_max_null": True,
            "require_b_source_equals": "median_fallback",
            "require_gri_gray_zone": True,
        },
    }
    ok, _ = triage_budget_llm_infer(state, bi, scoring_root=scoring_root)
    assert ok is expect_ok
