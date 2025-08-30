"""human_job_search pacing between saved filter URLs."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock

import pytest

from ghost_engine.browser import dev_session, human_behavior


def test_load_job_search_urls_file_skips_comments_and_blank(tmp_path: Path) -> None:
    p = tmp_path / "urls.txt"
    p.write_text(
        "\n# comment\nhttps://a.example/x\n\nhttps://b.example/y\n",
        encoding="utf-8",
    )
    assert dev_session.load_job_search_urls_file(p) == [
        "https://a.example/x",
        "https://b.example/y",
    ]


def test_load_job_search_urls_file_none() -> None:
    assert dev_session.load_job_search_urls_file(None) == []


@pytest.mark.asyncio
async def test_between_job_search_navigations_humanize_off() -> None:
    page = AsyncMock()
    await human_behavior.between_job_search_navigations(page, humanize=False)
    page.mouse.wheel.assert_not_called()


@pytest.mark.asyncio
async def test_dwell_on_search_results_humanize_off() -> None:
    page = AsyncMock()
    await human_behavior.dwell_on_search_results(page, humanize=False)
