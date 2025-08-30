"""LangGraph cover pipeline routing (no Gemini)."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import pytest

from ghost_engine.agents.graph import build_cover_letter_graph, merge_cover_letter_output
from ghost_engine.agents.nodes import cover_letter_pipeline_nodes as nodes

_REPO_CONFIG = Path(__file__).resolve().parents[2] / "config"


@pytest.fixture
def fake_settings_no_gemini(monkeypatch: pytest.MonkeyPatch) -> None:
    def _fake() -> MagicMock:
        m = MagicMock()
        m.gemini_api_key = None
        m.llm_config = {}
        m.config_dir = _REPO_CONFIG
        return m

    monkeypatch.setattr("ghost_engine.config.settings.get_settings", _fake)
    build_cover_letter_graph.cache_clear()


@pytest.mark.asyncio
async def test_cover_graph_stops_after_render_without_gemini(
    fake_settings_no_gemini: None,
) -> None:
    app = build_cover_letter_graph()
    state = {
        "approved_jobs": [{"job_id": "1", "job_tags": [], "title": "T", "description": "D"}],
        "site_id": "upwork",
        "l1_score": 50,
        "decision_logs": [],
    }
    final = await app.ainvoke(dict(state))
    assert final.get("cover_letter_prompt_rendered")
    assert "cover_letter_text" not in merge_cover_letter_output(final)


def test_route_after_render_skips_without_prompt() -> None:
    assert nodes.route_after_cover_render({}) == "end"


def test_route_after_gemini_on_error() -> None:
    assert nodes.route_after_cover_gemini({"cover_letter_gemini_error": "x"}) == "end"
    assert nodes.route_after_cover_gemini({}) == "typography"
