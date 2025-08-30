"""
Consume Redis queue of scoring ``final`` blobs: open job in browser, capture ``page.url``, run cover+notify.

Runs inside the same process as Camoufox (``dev_session``) when defer is enabled
(see ``ghost_engine.notify.dom_notify_policy`` — default on for Upwork; set
``GHOST_NOTIFY_IMMEDIATE=1`` for legacy immediate notify without DOM URL).

``UpworkAdapter.update_visible_feed_job_cores_from_page`` should be called from the feed loop so
the worker can optionally wait until the job id appears in the current feed DOM.
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from typing import Any

import redis.asyncio as aioredis
from playwright.async_api import Page

from ghost_engine.browser import human_behavior
from ghost_engine.browser.page_navigation import goto_exclusive, page_navigation_scope
from ghost_engine.notify.redis_queue import pending_dom_resolve_redis_key
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

_MAX_DEDUPE_JIDS = 4000
_dedupe_order: list[str] = []
_dedupe_set: set[str] = set()


def _dedupe_should_process(job_id: str) -> bool:
    """Return False if this process already handled ``job_id`` (bounded memory)."""
    jid = job_id.strip()
    if not jid or jid in _dedupe_set:
        return False
    _dedupe_set.add(jid)
    _dedupe_order.append(jid)
    while len(_dedupe_order) > _MAX_DEDUPE_JIDS:
        old = _dedupe_order.pop(0)
        _dedupe_set.discard(old)
    return True


def _parse_wait_visible_sec() -> float:
    raw = os.environ.get("GHOST_PENDING_DOM_WAIT_VISIBLE_SEC", "35")
    try:
        v = float(raw)
    except ValueError:
        v = 35.0
    return max(0.0, min(v, 120.0))


async def _wait_until_job_core_visible(adapter: Any, job_id: str, timeout_sec: float) -> None:
    if timeout_sec <= 0:
        return
    vis = getattr(adapter, "job_core_visible", None)
    if not callable(vis):
        return
    deadline = time.monotonic() + timeout_sec
    while time.monotonic() < deadline:
        try:
            if vis(job_id):
                log.info("pending_dom.job_visible_on_feed", job_id=job_id.strip())
                return
        except Exception as exc:
            log.debug("pending_dom.visible_check_failed", error=str(exc))
        await human_behavior.chaos_sleep_ms(280, 720)


def _soft_gate_allows_notify(final: dict[str, Any]) -> bool:
    """
    Optional second check against ``adapter_enqueue_min_gri`` after DOM open.

    Enable with ``GHOST_SOFT_GATE_REVERIFY_GRI=1``.
    """
    if os.environ.get("GHOST_SOFT_GATE_REVERIFY_GRI", "").strip().lower() not in (
        "1",
        "true",
        "yes",
    ):
        return True
    gri_raw = final.get("gri")
    gri_f = float(gri_raw) if isinstance(gri_raw, (int, float)) else None
    if gri_f is None:
        log.warning("pending_dom.soft_gate_no_gri")
        return False
    from ghost_engine.scoring.engine import ScoringEngine
    from ghost_engine.scoring.roi_calculator import merge_gri_config

    eng = ScoringEngine()
    cfg = merge_gri_config(eng.scoring_root, "upwork")
    raw_min = cfg.get("adapter_enqueue_min_gri")
    try:
        min_gri = float(raw_min) if raw_min is not None else 0.0
    except (TypeError, ValueError):
        min_gri = 0.0
    if min_gri <= 0.0:
        return True
    ok = gri_f >= min_gri
    if not ok:
        log.info(
            "pending_dom.soft_gate_blocked",
            gri=gri_f,
            min_gri=min_gri,
        )
    return ok


def _extract_job_id(final: dict[str, Any]) -> str:
    js = final.get("job_signal")
    if isinstance(js, dict):
        jid = js.get("job_id")
        if jid is not None and str(jid).strip():
            return str(jid).strip()
    aj = final.get("approved_jobs")
    if isinstance(aj, list) and aj:
        last = aj[-1]
        if isinstance(last, dict):
            jid = last.get("job_id")
            if jid is not None and str(jid).strip():
                return str(jid).strip()
    return ""


async def pending_dom_resolve_loop(
    redis: aioredis.Redis,
    page: Page,
    adapter: Any,
    *,
    humanize: bool,
    navigation_lock: asyncio.Lock | None = None,
) -> None:
    key = pending_dom_resolve_redis_key()
    feed_url = getattr(adapter, "feed_url", None) or getattr(adapter, "start_url", "") or ""
    wait_vis = _parse_wait_visible_sec()
    log.info("pending_dom.worker_started", redis_key=key, wait_visible_sec=wait_vis)
    while True:
        try:
            item = await redis.brpop(key, timeout=5)
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("pending_dom.brpop_failed")
            await human_behavior.chaos_sleep_ms(1100, 4200)
            continue
        if item is None:
            continue
        if not isinstance(item, (list, tuple)) or len(item) < 2:
            continue
        raw_b = item[1]
        try:
            raw = raw_b.decode("utf-8") if isinstance(raw_b, bytes) else str(raw_b)
            data = json.loads(raw)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            log.warning("pending_dom.bad_json", error=str(exc))
            continue
        final = data.get("final") if isinstance(data, dict) else None
        if not isinstance(final, dict):
            log.warning("pending_dom.missing_final")
            continue
        jid = _extract_job_id(final)
        if not jid:
            log.warning("pending_dom.missing_job_id")
            continue
        if not _dedupe_should_process(jid):
            log.info("pending_dom.dedupe_skip", job_id=jid)
            continue
        try:
            await _wait_until_job_core_visible(adapter, jid, wait_vis)
            stj = getattr(adapter, "scroll_to_job", None)
            if callable(stj):
                await stj(page, jid, humanize=humanize)
            opened = False
            async with page_navigation_scope(navigation_lock):
                follow = getattr(adapter, "_try_follow_job_link_from_feed", None)
                if callable(follow):
                    opened = bool(await follow(page, jid, humanize=humanize))
                if opened:
                    url = page.url.split("?")[0].strip()
                    js = final.get("job_signal")
                    if isinstance(js, dict):
                        js["public_url"] = url
                    aj = final.get("approved_jobs")
                    if isinstance(aj, list) and aj and isinstance(aj[-1], dict):
                        aj[-1]["job_public_url"] = url
                    log.info("pending_dom.captured_public_url", job_id=jid, url_preview=url[:120])
                else:
                    log.warning("pending_dom.open_job_failed", job_id=jid)

            from ghost_engine.agents.nodes.cover_letter_node import cover_letter_node

            if opened:
                if _soft_gate_allows_notify(final):
                    cover_letter_node(final)
                else:
                    log.info("pending_dom.skip_cover_after_soft_gate", job_id=jid)
            else:
                cover_letter_node(final)
        except Exception:
            log.exception("pending_dom.resolve_failed", job_id=jid)
        if feed_url:
            try:
                await goto_exclusive(
                    page,
                    feed_url,
                    lock=navigation_lock,
                    wait_until="domcontentloaded",
                    timeout=40_000,
                )
                await human_behavior.after_navigation_settle(
                    page,
                    humanize=humanize,
                    ready_selector=getattr(adapter, "page_ready_selector", "") or "",
                )
            except Exception as exc:
                log.warning("pending_dom.return_to_feed_failed", error=str(exc))
