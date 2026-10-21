"""Anchor URL resolution (registry + Upwork template)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from ghost_engine.notify.job_anchor import resolve_anchor_job_public_url


@pytest.mark.asyncio
async def test_anchor_prefers_cmd_url() -> None:
    u = await resolve_anchor_job_public_url(
        site_id="upwork",
        job_id="~xx",
        fallback_from_cmd="https://www.upwork.com/jobs/~xx/detail",
    )
    assert u == "https://www.upwork.com/jobs/~xx/detail"


@pytest.mark.asyncio
async def test_anchor_registry_then_template(monkeypatch: pytest.MonkeyPatch) -> None:
    with patch(
        "ghost_engine.notify.job_anchor.fetch_latest_job_public_url_from_registry",
        new=AsyncMock(return_value=None),
    ):
        u = await resolve_anchor_job_public_url(
            site_id="upwork",
            job_id="~Ab12cD",
            fallback_from_cmd=None,
        )
    assert u == "https://www.upwork.com/jobs/~Ab12cD/"


@pytest.mark.asyncio
async def test_anchor_uses_registry_when_no_cmd() -> None:
    with patch(
        "ghost_engine.notify.job_anchor.fetch_latest_job_public_url_from_registry",
        new=AsyncMock(return_value="https://www.upwork.com/jobs/~z9/"),
    ):
        u = await resolve_anchor_job_public_url(
            site_id="upwork",
            job_id="~z9",
            fallback_from_cmd=None,
        )
    assert u == "https://www.upwork.com/jobs/~z9/"
