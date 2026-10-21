"""Scoring LangGraph subgraph (GRI pipeline)."""

from __future__ import annotations

import pytest

from ghost_engine.agents.graph import ainvoke_scoring_graph, build_scoring_graph
from ghost_engine.scoring.l2_scoring_llm import L2ScoringVerdict


@pytest.fixture(autouse=True)
def _stub_l2_ollama(monkeypatch: pytest.MonkeyPatch) -> None:
    """Avoid real Ollama HTTP in CI; L2 code path still executes."""

    async def _fake(_js: object, **_: object) -> L2ScoringVerdict:
        return L2ScoringVerdict(0.75, "approve", "unit_stub", True)

    monkeypatch.setattr(
        "ghost_engine.scoring.l2_scoring_llm.run_l2_fit_judge",
        _fake,
    )


def test_build_scoring_graph_compiles() -> None:
    app = build_scoring_graph()
    assert app is not None


async def test_scoring_graph_upwork_raw_sets_gri() -> None:
    raw = {
        "data": {
            "jobPubDetails": {
                "buyer": {
                    "location": {"country": "United States"},
                    "isPaymentMethodVerified": True,
                    "stats": {"score": 4.9, "totalCharges": 8000.0},
                },
                "opening": {
                    "info": {"id": "gri-graph-1", "title": "python automation", "type": "FIXED"},
                    "description": "Need Python API work",
                    "postedOn": "2026-04-08T12:00:00.000Z",
                    "budget": {"amount": 500.0},
                    "clientActivity": {"totalHired": 5, "totalApplicants": 10, "invitationsSent": 0},
                },
            }
        }
    }
    out = await ainvoke_scoring_graph(
        {"raw_json": raw, "site_id": "upwork", "decision_logs": []}
    )
    assert out.get("l0_passed") is True
    assert isinstance(out.get("gri"), float)
    assert out.get("job_tier")
    assert out.get("persona_tag")
    assert out.get("scoring_pipeline_complete") is True
    assert "l2_gray_zone_eligible" in out
    assert "estimated_price_usd" in out
    assert "estimated_time_hours" in out
    tr = out.get("scoring_traversal")
    assert isinstance(tr, dict)
    assert tr.get("flow_continues") is True
    assert "normalize" in str(tr.get("summary_ru", ""))
