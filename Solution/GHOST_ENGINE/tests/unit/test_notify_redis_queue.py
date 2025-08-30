"""Redis notify queue dedupe + LPUSH (mocked)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from ghost_engine.notify.contract import ApprovedJobNotifyPayload
from ghost_engine.notify import redis_queue as rq


def test_enqueue_sync_skips_when_dedupe_exists(monkeypatch) -> None:
    payload = ApprovedJobNotifyPayload(
        site_id="upwork",
        l1_score=10,
        job_id="dup",
        job_signal={},
        notify_source="adapter_sniff",
    )
    inst = MagicMock()
    inst.set.return_value = False
    with patch("ghost_engine.notify.redis_queue.SyncRedis") as R:
        R.from_url.return_value = inst
        assert rq.enqueue_notify_job_sync("redis://localhost:6379/0", payload) is False
    inst.rpush.assert_not_called()


def test_enqueue_sync_lpush_when_dedupe_free(monkeypatch) -> None:
    payload = ApprovedJobNotifyPayload(
        site_id="upwork",
        l1_score=10,
        job_id="new",
        job_signal={},
        notify_source="adapter_sniff",
    )
    inst = MagicMock()
    inst.set.return_value = True
    with patch("ghost_engine.notify.redis_queue.SyncRedis") as R:
        R.from_url.return_value = inst
        assert rq.enqueue_notify_job_sync("redis://localhost:6379/0", payload) is True
    inst.rpush.assert_called_once()
    inst.close.assert_called_once()


@pytest.mark.asyncio
async def test_enqueue_pending_dom_rpush(monkeypatch) -> None:
    monkeypatch.delenv("DISABLE_JOB_NOTIFY", raising=False)
    inst = MagicMock()
    inst.rpush = AsyncMock()
    inst.expire = AsyncMock()
    inst.aclose = AsyncMock()
    with patch("ghost_engine.notify.redis_queue.aioredis.from_url", return_value=inst):
        ok = await rq.enqueue_pending_dom_resolve_async("redis://localhost:6379/0", {"job_signal": {}})
    assert ok is True
    inst.rpush.assert_awaited_once()
    inst.expire.assert_awaited_once()
    inst.aclose.assert_awaited_once()


def test_enqueue_disabled_env(monkeypatch) -> None:
    monkeypatch.setenv("DISABLE_JOB_NOTIFY", "1")
    payload = ApprovedJobNotifyPayload(
        site_id="upwork",
        l1_score=1,
        job_id="x",
        job_signal={},
        notify_source="adapter_sniff",
    )
    assert rq.enqueue_notify_job_sync("redis://x", payload) is False
