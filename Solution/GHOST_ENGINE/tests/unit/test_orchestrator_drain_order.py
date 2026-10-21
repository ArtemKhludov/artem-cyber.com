"""Orchestrator drain dispatches before Messages phase (unit, mocked)."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from ghost_engine.browser import inbox_fsm
from ghost_engine.browser.messages_phase import run_messages_phase
from ghost_engine.browser.operator_drain import drain_operator_queue_for_site


@pytest.mark.asyncio
async def test_drain_operator_dispatches_in_order(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []

    async def fake_dispatch(adapter: Any, page: Any, cmd: dict[str, Any], **kwargs: Any) -> str:
        calls.append(str(cmd.get("action")))
        return "ok"

    monkeypatch.setenv("GHOST_OPERATOR_COMMANDS_KEY", "ghost:op:commands")

    class FakeRedis:
        def __init__(self) -> None:
            self._q: list[tuple[str, bytes]] = [
                ("ghost:op:commands:high", b'{"action":"save_job","site_id":"upwork","job_id":"j1"}'),
                ("ghost:op:commands", b'{"action":"skip","site_id":"upwork","job_id":"j2"}'),
            ]

        async def lpop(self, key: str) -> bytes | None:
            for i, (k, v) in enumerate(self._q):
                if k == key:
                    self._q.pop(i)
                    return v
            return None

        async def rpush(self, key: str, blob: bytes) -> int:
            self._q.append((key, blob))
            return 1

    redis = FakeRedis()
    page = MagicMock()
    adapter = MagicMock()

    with patch(
        "ghost_engine.browser.operator_drain.dispatch_operator_command",
        new=AsyncMock(side_effect=fake_dispatch),
    ):
        n = await drain_operator_queue_for_site(
            redis,  # type: ignore[arg-type]
            page,
            adapter,
            "upwork",
            humanize=False,
            navigation_lock=None,
        )
    assert n == 2
    assert calls == ["save_job", "skip"]


@pytest.mark.asyncio
async def test_messages_phase_runs_after_operator_sequence_hint(monkeypatch: pytest.MonkeyPatch) -> None:
    """Smoke: messages phase calls inbox FSM when badge path is skipped."""
    page = MagicMock()
    adapter = MagicMock()
    adapter.start_url = "https://www.upwork.com/nx/find-work/"
    adapter.page_ready_selector = ""

    with patch(
        "ghost_engine.browser.messages_phase.inbox_fsm.open_inbox_if_unread_badge",
        new=AsyncMock(return_value=inbox_fsm.InboxDigestPhase.SKIPPED),
    ):
        out = await run_messages_phase(
            adapter,
            page,
            humanize=False,
            site_id="upwork",
            redis_client=None,
            navigation_lock=None,
            start_url=adapter.start_url,
        )
    assert out["tasks_drained"] == 0
    assert out["did_work"] is False
