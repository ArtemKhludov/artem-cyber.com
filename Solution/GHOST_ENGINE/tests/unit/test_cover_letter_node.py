"""Cover letter node DevSec upsell hook."""

from __future__ import annotations

from pathlib import Path

from ghost_engine.agents.nodes.cover_letter_node import cover_letter_node
from ghost_engine.scoring.devsec_upsell import devsec_upsell_paragraph
from ghost_engine.scoring.engine import TAG_SECURITY_VALUED

import pytest

_REPO_CONFIG = Path(__file__).resolve().parents[2] / "config"


@pytest.fixture(autouse=True)
def _stub_notify_after_cover(monkeypatch: pytest.MonkeyPatch) -> None:
    """cover_letter_node enqueues Telegram notify; unit tests must not hit Redis."""
    monkeypatch.setattr(
        "ghost_engine.agents.nodes.cover_letter_node.enqueue_notify_job_sync",
        lambda *a, **k: False,
    )


@pytest.fixture(autouse=True)
def _no_gemini_for_cover_node(monkeypatch: pytest.MonkeyPatch) -> None:
    """Avoid real Gemini calls when GEMINI_API_KEY is set in developer .env."""
    from unittest.mock import MagicMock

    def _fake_settings() -> MagicMock:
        m = MagicMock()
        m.gemini_api_key = None
        m.llm_config = {}
        m.config_dir = _REPO_CONFIG
        return m

    monkeypatch.setattr("ghost_engine.config.settings.get_settings", _fake_settings)


def test_cover_letter_node_emits_addon_when_security_tagged() -> None:
    out = cover_letter_node(
        {
            "approved_jobs": [
                {"job_id": "1", "job_tags": [TAG_SECURITY_VALUED], "title": "T", "description": "D"},
            ]
        }
    )
    assert "cover_letter_security_addon" in out
    assert "Semgrep" in out["cover_letter_security_addon"]
    assert "cover_letter_prompt_rendered" in out
    assert "Semgrep" in out["cover_letter_prompt_rendered"]
    assert devsec_upsell_paragraph() in out["cover_letter_prompt_rendered"]


def test_cover_letter_node_rendered_without_security_no_devsec_body() -> None:
    out = cover_letter_node(
        {"approved_jobs": [{"job_id": "1", "job_tags": [], "title": "Only", "description": "Job"}]}
    )
    assert "cover_letter_prompt_rendered" in out
    assert "cover_letter_security_addon" not in out
    assert "My delivery standard includes" not in out["cover_letter_prompt_rendered"]
