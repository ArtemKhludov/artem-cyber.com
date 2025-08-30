"""Gate ledger summaries for scoring, cover, ops diag."""

from __future__ import annotations

from ghost_engine.ops.diag_gate_ledger import build_ops_diag_traversal_report
from ghost_engine.scoring.cover_gate_ledger import build_cover_traversal_report
from ghost_engine.scoring.gate_ledger import build_scoring_traversal_report


def test_scoring_traversal_l0_fail() -> None:
    st = {
        "job_signal": {
            "job_id": "j1",
            "title": "x",
            "description": "y",
            "source_site": "upwork",
        },
        "l0_passed": False,
        "l0_code": "BUDGET_TOO_LOW",
        "l0_detail": "min budget",
    }
    r = build_scoring_traversal_report(st)
    assert r["flow_continues"] is False
    assert any(s["gate"] == "l0" and s["outcome"] == "fail" for s in r["steps"])
    assert not any(s["gate"] == "budget_infer" for s in r["steps"])


def test_scoring_traversal_budget_infer_skip_disabled() -> None:
    st = {
        "job_signal": {
            "job_id": "j2",
            "title": "x",
            "description": "y",
            "source_site": "upwork",
        },
        "l0_passed": True,
        "l0_code": "OK",
        "l0_detail": "",
        "budget_llm_infer_skipped": True,
        "budget_llm_infer_skip_reason": "disabled",
        "gri": 0.71,
        "job_tier": "ZERO_TOUCH",
        "persona_tag": "p",
        "l2_llm_skipped": True,
        "l2_llm_skip_reason": "not_gray_zone",
    }
    r = build_scoring_traversal_report(st)
    bi = [s for s in r["steps"] if s["gate"] == "budget_infer"]
    assert len(bi) == 1
    assert bi[0]["outcome"] == "skip"
    assert bi[0]["code"] == "disabled"


def test_cover_traversal_render_fail() -> None:
    r = build_cover_traversal_report({})
    assert r["flow_continues"] is False
    assert r["steps"][0]["gate"] == "render"


def test_ops_diag_traversal_success_ollama() -> None:
    r = build_ops_diag_traversal_report(
        had_image=True,
        source="ollama",
        all_failed=False,
        stages_failed=[],
    )
    assert r["all_failed"] is False
    assert "Успех" in r["summary_ru"]


def test_ops_diag_traversal_all_fail() -> None:
    r = build_ops_diag_traversal_report(
        had_image=False,
        source="none",
        all_failed=True,
        stages_failed=[
            ("ollama_text", "нет ответа"),
            ("gemini_text", "нет ответа"),
        ],
    )
    assert r["all_failed"] is True
    assert len(r["steps"]) == 2
