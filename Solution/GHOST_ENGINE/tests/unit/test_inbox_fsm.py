"""Inbox FSM badge → navigate."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from ghost_engine.browser.inbox_fsm import InboxDigestPhase, open_inbox_if_unread_badge


@pytest.mark.asyncio
async def test_open_inbox_when_badge() -> None:
    adapter = MagicMock()
    adapter.check_new_messages = AsyncMock(return_value=True)
    adapter.goto_messages = AsyncMock(return_value=True)
    out = await open_inbox_if_unread_badge(adapter, MagicMock(), humanize=True)
    assert out == InboxDigestPhase.OPENED
    adapter.goto_messages.assert_awaited_once()


@pytest.mark.asyncio
async def test_idle_when_no_badge() -> None:
    adapter = MagicMock()
    adapter.check_new_messages = AsyncMock(return_value=False)
    adapter.goto_messages = AsyncMock()
    out = await open_inbox_if_unread_badge(adapter, MagicMock(), humanize=True)
    assert out == InboxDigestPhase.IDLE
    adapter.goto_messages.assert_not_called()


@pytest.mark.asyncio
async def test_skipped_without_hooks() -> None:
    adapter = object()
    out = await open_inbox_if_unread_badge(adapter, MagicMock(), humanize=False)
    assert out == InboxDigestPhase.SKIPPED
