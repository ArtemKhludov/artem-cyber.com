"""Drain Redis operator queues inside the browser orchestrator (no parallel cmd_task)."""

from __future__ import annotations

import asyncio
import json
from typing import Any

import redis.asyncio as aioredis
from playwright.async_api import Page

from ghost_engine.browser.page_navigation import page_navigation_scope
from ghost_engine.browser.phase_metrics import log_drain_count, log_phase_end, log_phase_start
from ghost_engine.notify.operator_commands import operator_commands_drain_keys_ordered
from ghost_engine.notify.operator_dispatch import dispatch_operator_command
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


def _decode_redis_blob(raw: Any) -> str:
    if isinstance(raw, memoryview):
        raw = raw.tobytes()
    if isinstance(raw, bytes):
        return raw.decode("utf-8")
    return str(raw)


async def drain_operator_queue_for_site(
    redis_client: aioredis.Redis,
    page: Page,
    adapter: Any,
    site_id: str,
    *,
    humanize: bool,
    navigation_lock: asyncio.Lock | None = None,
) -> int:
    """
    LPOP all pending commands for ``site_id`` from operator lists (new then legacy).

    Non-matching ``site_id`` commands are pushed back to the **right** of the same list
    to avoid starvation when multiple producers share one Redis (rare in single-site Upwork).
    """
    sid = site_id.strip().lower()
    log_phase_start("operator", site_id=sid)
    total = 0
    keys = operator_commands_drain_keys_ordered()

    for key in keys:
        requeue: list[bytes] = []
        while True:
            raw = await redis_client.lpop(key)
            if raw is None:
                break
            if isinstance(raw, str):
                raw_b = raw.encode("utf-8")
            else:
                raw_b = raw if isinstance(raw, bytes) else bytes(raw)
            try:
                blob = _decode_redis_blob(raw_b)
                data = json.loads(blob)
            except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                log.warning("operator_drain.bad_json", redis_key=key, error=str(exc))
                continue
            if not isinstance(data, dict):
                log.warning("operator_drain.not_dict", redis_key=key)
                continue
            raw_site = data.get("site_id")
            cmd_site = raw_site.strip().lower() if isinstance(raw_site, str) else ""
            if cmd_site and cmd_site != sid:
                requeue.append(raw_b)
                continue
            try:
                async with page_navigation_scope(navigation_lock):
                    await dispatch_operator_command(
                        adapter,
                        page,
                        data,
                        session_site_id=sid,
                        humanize=humanize,
                    )
                total += 1
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("operator_drain.dispatch_failed", redis_key=key)

        for blob in requeue:
            try:
                await redis_client.rpush(key, blob)
            except Exception as exc:
                log.warning("operator_drain.requeue_failed", error=str(exc), redis_key=key)

    log_drain_count("operator", total, site_id=sid)
    log_phase_end("operator", site_id=sid, dispatched=total)
    return total
