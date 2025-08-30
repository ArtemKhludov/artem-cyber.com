"""Token-bucket / sliding window rate limits per site account."""

from __future__ import annotations

import asyncio
import time
from collections import defaultdict


class SimpleRateLimiter:
    def __init__(self, max_events: int, per_seconds: float) -> None:
        self.max_events = max_events
        self.per_seconds = per_seconds
        self._windows: dict[str, list[float]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def acquire(self, key: str) -> None:
        async with self._lock:
            now = time.monotonic()
            window = self._windows[key]
            cutoff = now - self.per_seconds
            while window and window[0] < cutoff:
                window.pop(0)
            if len(window) >= self.max_events:
                sleep_for = self.per_seconds - (now - window[0])
                await asyncio.sleep(max(sleep_for, 0))
                return await self.acquire(key)
            window.append(now)
