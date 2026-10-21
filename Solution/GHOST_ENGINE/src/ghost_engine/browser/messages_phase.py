"""Messages-domain phase for browser orchestrator (after operator drain)."""

from __future__ import annotations

import asyncio
from typing import Any

import redis.asyncio as aioredis
from playwright.async_api import Page

from ghost_engine.browser import inbox_fsm
from ghost_engine.browser.page_navigation import goto_exclusive, page_navigation_scope
from ghost_engine.browser.phase_metrics import log_drain_count, log_phase_end, log_phase_start
from ghost_engine.browser import human_behavior
from ghost_engine.notify.message_tasks import message_tasks_blpop_keys
from ghost_engine.store.messages_audit_store import record_messages_audit_event
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

# Safety cap until per-room graph drains the inbox completely.
_MAX_MESSAGES_INBOX_PASSES: int = 12


def _decode_blob(raw: Any) -> str:
    if isinstance(raw, memoryview):
        raw = raw.tobytes()
    if isinstance(raw, bytes):
        return raw.decode("utf-8")
    return str(raw)


async def drain_message_task_queue(
    redis_client: aioredis.Redis | None,
    *,
    site_id: str,
) -> int:
    """LPOP all tasks from ``ghost:msg:*`` lists (v1: producers optional)."""
    if redis_client is None:
        return 0
    sid = site_id.strip().lower()
    total = 0
    for key in message_tasks_blpop_keys():
        while True:
            raw = await redis_client.lpop(key)
            if raw is None:
                break
            total += 1
            log.info(
                "messages_task.dequeued",
                site_id=sid,
                redis_key=key,
                preview=_decode_blob(raw)[:200],
            )
    if total:
        log_drain_count("messages_redis_tasks", total, site_id=sid)
    return total


async def run_messages_phase(
    adapter: Any,
    page: Page,
    *,
    humanize: bool,
    site_id: str,
    redis_client: aioredis.Redis | None,
    navigation_lock: asyncio.Lock | None,
    start_url: str,
) -> dict[str, Any]:
    """
    Drain ``ghost:msg:*`` tasks, then open Messages while unread badge / GQL hint persists.

    Returns a dict with ``tasks_drained``, ``inbox_passes``, ``did_work``.
    """
    sid = site_id.strip().lower()
    log_phase_start("messages", site_id=sid)
    tasks_drained = await drain_message_task_queue(redis_client, site_id=sid)
    inbox_passes = 0
    opened = False

    for _ in range(_MAX_MESSAGES_INBOX_PASSES):
        phase = await inbox_fsm.open_inbox_if_unread_badge(adapter, page, humanize=humanize)
        if phase != inbox_fsm.InboxDigestPhase.OPENED:
            break
        opened = True
        inbox_passes += 1
        try:
            url_preview = (page.url or "")[:400]
        except Exception:
            url_preview = ""
        await record_messages_audit_event(
            site_id=sid,
            event_type="inbox_opened",
            snippet=url_preview,
            payload={"pass": inbox_passes},
        )
        await human_behavior.chaos_sleep_ms(4200, 15800)
        if start_url.strip():
            async with page_navigation_scope(navigation_lock):
                await goto_exclusive(
                    page,
                    start_url.strip(),
                    lock=navigation_lock,
                    wait_until="domcontentloaded",
                    timeout=45_000,
                )
                await human_behavior.after_navigation_settle(
                    page,
                    humanize=humanize,
                    ready_selector=getattr(adapter, "page_ready_selector", None) or "",
                )

    did_work = bool(tasks_drained or opened)
    log_phase_end(
        "messages",
        site_id=sid,
        tasks_drained=tasks_drained,
        inbox_passes=inbox_passes,
        did_work=did_work,
    )
    return {
        "tasks_drained": tasks_drained,
        "inbox_passes": inbox_passes,
        "did_work": did_work,
    }
