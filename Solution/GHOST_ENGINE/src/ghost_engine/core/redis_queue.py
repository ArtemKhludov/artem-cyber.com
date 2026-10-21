"""Redis helpers: pub/sub, job notification list (RPUSH / BLPOP FIFO)."""

from __future__ import annotations

import json
import os
from typing import Any

import redis.asyncio as redis

from ghost_engine.config.settings import get_settings

DEFAULT_NOTIFICATIONS_KEY = "ghost:notify:jobs"


def default_notifications_list_key() -> str:
    return os.environ.get("GHOST_NOTIFY_QUEUE_KEY", DEFAULT_NOTIFICATIONS_KEY).strip() or (
        DEFAULT_NOTIFICATIONS_KEY
    )


async def get_redis() -> redis.Redis:
    settings = get_settings()
    return redis.from_url(settings.redis_url, decode_responses=True)


async def publish_event(channel: str, payload: str) -> None:
    client = await get_redis()
    try:
        await client.publish(channel, payload)
    finally:
        await client.aclose()


class JobNotificationQueue:
    """
    Async FIFO over a Redis list: RPUSH (producer) + BLPOP (consumer).

    Matches the notify pipeline key (``GHOST_NOTIFY_QUEUE_KEY`` / ``ghost:notify:jobs``).
    Use the same discipline as ``notify.redis_queue`` producers after dedupe (RPUSH JSON line).
    """

    __slots__ = ("_client", "_key", "_owns_connection")

    def __init__(
        self,
        client: redis.Redis,
        list_key: str,
        *,
        owns_connection: bool = False,
    ) -> None:
        self._client = client
        self._key = list_key
        self._owns_connection = owns_connection

    @classmethod
    def from_client(cls, client: redis.Redis, list_key: str | None = None) -> JobNotificationQueue:
        key = list_key if list_key is not None else default_notifications_list_key()
        return cls(client, key, owns_connection=False)

    @classmethod
    async def connect(
        cls,
        redis_url: str,
        list_key: str | None = None,
        *,
        decode_responses: bool = False,
    ) -> JobNotificationQueue:
        key = list_key if list_key is not None else default_notifications_list_key()
        client = redis.from_url(
            redis_url,
            decode_responses=decode_responses,
            socket_connect_timeout=5.0,
        )
        return cls(client, key, owns_connection=True)

    @property
    def list_key(self) -> str:
        return self._key

    async def enqueue(self, job_data: dict[str, Any]) -> None:
        line = json.dumps(job_data, ensure_ascii=False)
        raw = line.encode("utf-8")
        await self._client.rpush(self._key, raw)

    async def dequeue(self, timeout: int = 30) -> dict[str, Any] | None:
        """
        Blocking left pop (BLPOP). Waits up to ``timeout`` seconds per call; returns None on idle timeout.
        Pass ``timeout=0`` only if you intend to block indefinitely until an item appears.
        """
        popped = await self._client.blpop(self._key, timeout=timeout)
        if popped is None:
            return None
        _, payload = popped
        if isinstance(payload, memoryview):
            payload = payload.tobytes()
        if isinstance(payload, bytes):
            text = payload.decode("utf-8")
        else:
            text = str(payload)
        data = json.loads(text)
        if not isinstance(data, dict):
            raise ValueError("notification queue item must be a JSON object")
        return data

    async def aclose(self) -> None:
        if self._owns_connection:
            await self._client.aclose()
