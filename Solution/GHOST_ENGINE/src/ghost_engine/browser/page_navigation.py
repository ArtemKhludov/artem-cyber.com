"""
Serialize Playwright navigations on a shared ``Page`` (feed loop, operator Apply, pending_dom).

Scroll-only actions can still interleave; ``page.goto`` and link-follow navigations must not race.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from playwright.async_api import Page


@asynccontextmanager
async def page_navigation_scope(lock: asyncio.Lock | None) -> AsyncIterator[None]:
    if lock is None:
        yield
    else:
        async with lock:
            yield


async def goto_exclusive(
    page: Page,
    url: str,
    *,
    lock: asyncio.Lock | None,
    **goto_kwargs: Any,
) -> Any:
    """``page.goto`` under the shared navigation lock when provided."""
    async with page_navigation_scope(lock):
        return await page.goto(url, **goto_kwargs)
