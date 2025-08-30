"""JobNotificationQueue RPUSH/BLPOP."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from ghost_engine.core.redis_queue import JobNotificationQueue


@pytest.mark.asyncio
async def test_enqueue_rpush_and_dequeue_blpop() -> None:
    client = MagicMock()
    client.rpush = AsyncMock()
    client.blpop = AsyncMock(
        return_value=(b"ghost:notify:jobs", json.dumps({"k": 1}, ensure_ascii=False).encode())
    )
    q = JobNotificationQueue.from_client(client, "ghost:notify:jobs")
    await q.enqueue({"a": "b"})
    client.rpush.assert_awaited_once()
    d = await q.dequeue(timeout=5)
    assert d == {"k": 1}
    client.blpop.assert_awaited_once_with("ghost:notify:jobs", timeout=5)


@pytest.mark.asyncio
async def test_dequeue_returns_none_on_timeout() -> None:
    client = MagicMock()
    client.blpop = AsyncMock(return_value=None)
    q = JobNotificationQueue.from_client(client, "q")
    assert await q.dequeue(timeout=1) is None
