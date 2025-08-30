"""Unit tests for operator command dispatch (no Playwright)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from ghost_engine.notify.operator_dispatch import dispatch_operator_command


@pytest.fixture(autouse=True)
def _mock_registry_job_url(monkeypatch: pytest.MonkeyPatch) -> None:
    """Avoid PostgreSQL when dispatch enriches ``job_public_url``."""
    monkeypatch.setattr(
        "ghost_engine.notify.operator_dispatch.fetch_latest_job_public_url_from_registry",
        AsyncMock(return_value=None),
    )


@pytest.mark.asyncio
async def test_dispatch_apply_calls_adapter() -> None:
    adapter = MagicMock()
    adapter.apply_for_job = AsyncMock()
    page = MagicMock()
    cmd = {
        "action": "apply",
        "site_id": "upwork",
        "job_id": "abc123",
        "cover_letter": "Hello",
        "idempotency_key": "k1",
    }
    out = await dispatch_operator_command(
        adapter, page, cmd, session_site_id="upwork", humanize=True
    )
    assert out == "apply_ok"
    adapter.apply_for_job.assert_awaited_once()
    aa = adapter.apply_for_job.await_args
    assert aa.args == (page, "abc123", "Hello")
    assert aa.kwargs.get("humanize") is True
    assert aa.kwargs.get("apply_strategy") == "url_only"
    assert aa.kwargs.get("job_public_url") is None
    assert aa.kwargs.get("proposal_bid") is None
    assert aa.kwargs.get("submit_proposal") is False


@pytest.mark.asyncio
async def test_dispatch_site_id_case_insensitive() -> None:
    adapter = MagicMock()
    adapter.apply_for_job = AsyncMock()
    cmd = {"action": "apply", "site_id": "UPWORK", "job_id": "j1", "cover_letter": ""}
    out = await dispatch_operator_command(
        adapter, MagicMock(), cmd, session_site_id="upwork", humanize=True
    )
    assert out == "apply_ok"
    adapter.apply_for_job.assert_awaited_once()


@pytest.mark.asyncio
async def test_dispatch_ignored_wrong_site() -> None:
    adapter = MagicMock()
    adapter.apply_for_job = AsyncMock()
    cmd = {"action": "apply", "site_id": "contra", "job_id": "x", "cover_letter": ""}
    out = await dispatch_operator_command(
        adapter, page=MagicMock(), cmd=cmd, session_site_id="upwork", humanize=False
    )
    assert out == "ignored_site"
    adapter.apply_for_job.assert_not_called()


@pytest.mark.asyncio
async def test_dispatch_skip_no_apply() -> None:
    adapter = MagicMock()
    adapter.apply_for_job = AsyncMock()
    cmd = {"action": "skip", "site_id": "upwork", "job_id": "j1"}
    out = await dispatch_operator_command(
        adapter, page=MagicMock(), cmd=cmd, session_site_id="upwork", humanize=True
    )
    assert out == "skip_logged"
    adapter.apply_for_job.assert_not_called()


class _AdapterWithoutApply:
    pass


@pytest.mark.asyncio
async def test_dispatch_no_handler() -> None:
    adapter = _AdapterWithoutApply()
    cmd = {"action": "apply", "site_id": "upwork", "job_id": "j1", "cover_letter": "x"}
    out = await dispatch_operator_command(
        adapter, page=MagicMock(), cmd=cmd, session_site_id="upwork", humanize=True
    )
    assert out == "no_handler"


@pytest.mark.asyncio
async def test_dispatch_url_fallback_maps_to_url_only() -> None:
    adapter = MagicMock()
    adapter.apply_for_job = AsyncMock()
    cmd = {
        "action": "apply",
        "site_id": "upwork",
        "job_id": "j1",
        "cover_letter": "",
        "apply_strategy": "url_fallback",
    }
    out = await dispatch_operator_command(
        adapter, MagicMock(), cmd, session_site_id="upwork", humanize=False
    )
    assert out == "apply_ok"
    assert adapter.apply_for_job.await_args.kwargs.get("apply_strategy") == "url_only"


@pytest.mark.asyncio
async def test_dispatch_save_calls_adapter() -> None:
    adapter = MagicMock()
    adapter.save_job_on_page = AsyncMock()
    cmd = {
        "action": "save_job",
        "site_id": "upwork",
        "job_id": "j1",
        "job_public_url": "https://www.upwork.com/jobs/~x/",
    }
    out = await dispatch_operator_command(
        adapter, MagicMock(), cmd, session_site_id="upwork", humanize=False
    )
    assert out == "save_ok"
    adapter.save_job_on_page.assert_awaited_once()


@pytest.mark.asyncio
async def test_dispatch_save_enriches_job_public_url_from_registry(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "ghost_engine.notify.operator_dispatch.fetch_latest_job_public_url_from_registry",
        AsyncMock(return_value="https://www.upwork.com/jobs/~enriched/"),
    )
    adapter = MagicMock()
    adapter.save_job_on_page = AsyncMock()
    cmd: dict[str, str] = {
        "action": "save_job",
        "site_id": "upwork",
        "job_id": "~enriched",
    }
    out = await dispatch_operator_command(
        adapter, MagicMock(), cmd, session_site_id="upwork", humanize=False
    )
    assert out == "save_ok"
    kwargs = adapter.save_job_on_page.await_args.kwargs
    assert kwargs.get("job_public_url") == "https://www.upwork.com/jobs/~enriched/"


@pytest.mark.asyncio
async def test_dispatch_apply_failure_returns_label() -> None:
    adapter = MagicMock()

    async def boom(*_a: object, **_k: object) -> None:
        raise RuntimeError("nav fail")

    adapter.apply_for_job = boom
    cmd = {"action": "apply", "site_id": "upwork", "job_id": "j1", "cover_letter": "x"}
    out = await dispatch_operator_command(
        adapter, page=MagicMock(), cmd=cmd, session_site_id="upwork", humanize=False
    )
    assert out == "apply_failed"
