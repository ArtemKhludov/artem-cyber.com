"""human_click, after_navigation_settle, graphql sniff config."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from ghost_engine.adapters import graphql_sniff
from ghost_engine.browser import human_behavior


@pytest.mark.asyncio
async def test_human_click_no_humanize_skips_micro_delay(monkeypatch: pytest.MonkeyPatch) -> None:
    called: list[str] = []

    async def track_micro(_page: object) -> None:
        called.append("micro")

    monkeypatch.setattr(human_behavior, "maybe_micro_moves", track_micro)
    monkeypatch.setattr(human_behavior, "human_delay", AsyncMock())

    loc = MagicMock()
    loc.page = MagicMock()
    loc.first.click = AsyncMock()

    await human_behavior.human_click(loc, humanize=False, timeout_ms=5000)
    assert called == []
    loc.first.click.assert_awaited_once()


@pytest.mark.asyncio
async def test_after_navigation_settle_no_selector(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class S:
        base_config = {
            "human_navigation": {
                "page_ready_timeout_ms": 5000,
                "settle_delay_ms_min": 0,
                "settle_delay_ms_max": 0,
            }
        }

    monkeypatch.setattr(human_behavior, "get_settings", lambda: S())
    monkeypatch.setattr(human_behavior, "human_delay", AsyncMock())

    page = MagicMock()
    page.wait_for_selector = AsyncMock()

    await human_behavior.after_navigation_settle(
        page,
        humanize=False,
        ready_selector="",
    )
    page.wait_for_selector.assert_not_called()


@pytest.mark.asyncio
async def test_after_navigation_settle_waits_for_selector(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class S:
        base_config = {
            "human_navigation": {
                "page_ready_timeout_ms": 3000,
                "settle_delay_ms_min": 0,
                "settle_delay_ms_max": 0,
            }
        }

    monkeypatch.setattr(human_behavior, "get_settings", lambda: S())
    monkeypatch.setattr(human_behavior, "human_delay", AsyncMock())

    page = MagicMock()
    page.wait_for_selector = AsyncMock()

    await human_behavior.after_navigation_settle(
        page,
        humanize=False,
        ready_selector="main",
    )
    page.wait_for_selector.assert_awaited_once()


def test_graphql_sniff_config_bounds(monkeypatch: pytest.MonkeyPatch) -> None:
    class S:
        base_config = {
            "graphql_sniff": {
                "log_sample_rate": 0.0,
                "persist_max_concurrent": 2,
                "persist_min_interval_ms": 500,
            }
        }

    monkeypatch.setattr(graphql_sniff, "get_settings", lambda: S())
    monkeypatch.delenv("GHOST_GRAPHQL_ANALYTICS", raising=False)
    monkeypatch.delenv("GHOST_GRAPHQL_LOG_SAMPLE_RATE", raising=False)
    rate, conc, ms = graphql_sniff._sniff_config()
    assert rate == 0.0
    assert conc == 2
    assert ms == 500


def test_graphql_sniff_analytics_forces_full_sample_rate(monkeypatch: pytest.MonkeyPatch) -> None:
    class S:
        base_config = {
            "graphql_sniff": {
                "log_sample_rate": 0.0,
                "persist_max_concurrent": 3,
                "persist_min_interval_ms": 0,
            }
        }

    monkeypatch.setattr(graphql_sniff, "get_settings", lambda: S())
    monkeypatch.delenv("GHOST_GRAPHQL_LOG_SAMPLE_RATE", raising=False)
    monkeypatch.setenv("GHOST_GRAPHQL_ANALYTICS", "1")
    try:
        rate, _, _ = graphql_sniff._sniff_config()
        assert rate == 1.0
    finally:
        monkeypatch.delenv("GHOST_GRAPHQL_ANALYTICS", raising=False)


def test_graphql_sniff_env_log_sample_rate_override(monkeypatch: pytest.MonkeyPatch) -> None:
    class S:
        base_config = {
            "graphql_sniff": {
                "log_sample_rate": 0.0,
                "persist_max_concurrent": 3,
                "persist_min_interval_ms": 0,
            }
        }

    monkeypatch.setattr(graphql_sniff, "get_settings", lambda: S())
    monkeypatch.delenv("GHOST_GRAPHQL_ANALYTICS", raising=False)
    monkeypatch.setenv("GHOST_GRAPHQL_LOG_SAMPLE_RATE", "0.25")
    try:
        rate, _, _ = graphql_sniff._sniff_config()
        assert rate == 0.25
    finally:
        monkeypatch.delenv("GHOST_GRAPHQL_LOG_SAMPLE_RATE", raising=False)


def test_base_adapter_page_ready_selector(tmp_path: object) -> None:
    from pathlib import Path

    import yaml

    from ghost_engine.adapters.base_adapter import BaseSiteAdapter

    p = Path(tmp_path) / "t.yaml"
    p.write_text(
        yaml.safe_dump(
            {
                "site_id": "x",
                "url": "https://example.com",
                "page_ready_selector": "article.jobs",
            }
        ),
        encoding="utf-8",
    )

    class Mini(BaseSiteAdapter):
        async def poll_inbox(self) -> list:
            return []

        async def intercept_network(self, page: object) -> None:
            pass

    a = Mini(p)
    assert a.page_ready_selector == "article.jobs"
