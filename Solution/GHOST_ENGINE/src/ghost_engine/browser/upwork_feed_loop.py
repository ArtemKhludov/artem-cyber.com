"""
Find-work feed choreography: Load More + overlap stop + human pacing.

GraphQL sniffing stays on the adapter; this module only drives DOM to pull more listings.
"""

from __future__ import annotations

import os
import re
from typing import Any

from playwright.async_api import Page

from ghost_engine.browser import human_behavior
from ghost_engine.browser.feed_policy import (
    feed_load_more_click_backoff_ms_max,
    feed_load_more_click_backoff_ms_min,
    feed_load_more_click_retries,
    feed_max_load_more,
    feed_overlap_streak_before_stop,
    feed_overlap_threshold,
    feed_seen_ttl_sec,
)
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

_JOB_HREF = re.compile(r"/jobs/~([a-zA-Z0-9]+)")
# NX find-work detail URLs (path shape varies; ciphertext follows ``~``).
_JOB_HREF_NX_DETAILS = re.compile(
    r"/nx/find-work/details/(?:[^?#\"']*?)?~([a-zA-Z0-9]+)",
    re.IGNORECASE,
)
# Fallback: any Upwork-ish URL segment ``~<ciphertext>`` (NX / ab path variants).
_JOB_TILDE_CORE = re.compile(r"~([a-zA-Z0-9]{8,48})")
# Upwork NX tiles often expose ciphertext on the card root (href may be absent briefly after hydration).
_ITEM_KEY_CORE = re.compile(r"^[~]?[a-zA-Z0-9._-]{6,128}$")

# Extra anchor selectors when ``/jobs/~`` links are hydrated late or use alternate paths.
_EXTRA_JOB_LINK_SELECTORS: tuple[str, ...] = (
    'a[href*="jobs/~"]',
    'a[href*="/nx/find-work/details/"]',
    'a[href*="find-work/details/"]',
    'a[href*="nx/find-work"]',
    'a[href*="~"]',
)


def _cores_from_href_string(h: str) -> list[str]:
    out: list[str] = []
    for m in _JOB_HREF.finditer(h):
        out.append(m.group(1))
    for m in _JOB_HREF_NX_DETAILS.finditer(h):
        c = m.group(1)
        if c not in out:
            out.append(c)
    low = h.lower()
    if "upwork.com" in low or "/nx/" in low or "/jobs/" in low or "/ab/" in low:
        for m in _JOB_TILDE_CORE.finditer(h):
            c = m.group(1)
            if c not in out:
                out.append(c)
    return out


async def wait_for_feed_job_anchors_post_load(page: Page, *, humanize: bool) -> None:
    """Best-effort wait for hydrated job links/tiles after Load More (SPA)."""
    timeout_ms = 12_000 if humanize else 4_500
    sel = (
        'a[href*="jobs/~"], a[href*="find-work/details"], '
        'a[href*="nx/find-work"], a[href*="~"], [data-item-key]'
    )
    try:
        await page.wait_for_selector(sel, state="attached", timeout=timeout_ms)
    except Exception:
        pass
    if humanize:
        await human_behavior.chaos_sleep_ms(600, 1600)
    else:
        await human_behavior.chaos_sleep_ms(200, 500)


async def collect_feed_dom_locator_counts(page: Page) -> dict[str, int]:
    """Diagnostics when job ids are missing from DOM (log-only)."""
    specs: tuple[tuple[str, str], ...] = (
        ("a_href_jobs_slash", 'a[href*="/jobs/~"]'),
        ("a_href_jobs_any", 'a[href*="jobs/~"]'),
        ("a_href_nx_details", 'a[href*="/nx/find-work/details/"]'),
        ("a_href_has_tilde", 'a[href*="~"]'),
        ("article_data_item_key", "article[data-item-key]"),
        ("any_data_item_key", "[data-item-key]"),
    )
    out: dict[str, int] = {}
    for name, sel in specs:
        try:
            out[name] = await page.locator(sel).count()
        except Exception:
            out[name] = -1
    return out


def feed_seen_redis_key(site_id: str, profile_name: str) -> str:
    sid = (site_id or "unknown").strip().lower()
    prof = ((profile_name or "default").strip() or "default").lower()
    return f"ghost:feed:seen:{sid}:{prof}"


async def collect_ordered_job_cores_from_links(page: Page) -> list[str]:
    """
    Job ciphertext cores in DOM link order (first link → first new id).

    Used for a stable feed ``tail`` anchor when one tile disappears or reorders.
    """
    out: list[str] = []
    seen: set[str] = set()

    async def _append_from_href_locator(sel: str) -> None:
        loc = page.locator(sel)
        n = await loc.count()
        cap = min(n, 800)
        for i in range(cap):
            h = await loc.nth(i).get_attribute("href")
            if not isinstance(h, str):
                continue
            for c in _cores_from_href_string(h):
                if c not in seen:
                    seen.add(c)
                    out.append(c)

    try:
        await _append_from_href_locator('a[href*="/jobs/~"]')
    except Exception as exc:
        log.warning("upwork_feed.collect_ordered_failed", error=str(exc))

    for extra_sel in _EXTRA_JOB_LINK_SELECTORS:
        try:
            await _append_from_href_locator(extra_sel)
        except Exception as exc:
            log.warning(
                "upwork_feed.collect_ordered_extra_failed",
                selector_preview=extra_sel[:72],
                error=str(exc),
            )

    async def _append_from_data_item_tiles(tile_sel: str) -> None:
        tiles = page.locator(tile_sel)
        tn = await tiles.count()
        cap_t = min(tn, 800)
        for i in range(cap_t):
            raw = await tiles.nth(i).get_attribute("data-item-key")
            if not isinstance(raw, str):
                continue
            c = raw.strip().lstrip("~")
            if not c or not _ITEM_KEY_CORE.match(raw.strip()):
                continue
            if c not in seen:
                seen.add(c)
                out.append(c)

    try:
        await _append_from_data_item_tiles("article[data-item-key]")
    except Exception as exc:
        log.warning("upwork_feed.collect_item_key_failed", error=str(exc))

    try:
        await _append_from_data_item_tiles("[data-item-key]")
    except Exception as exc:
        log.warning("upwork_feed.collect_item_key_generic_failed", error=str(exc))
    return out


async def collect_job_ids_from_links(page: Page) -> set[str]:
    """Ciphertext segments from visible ``/jobs/~`` hrefs (set view of ordered collect)."""
    ordered = await collect_ordered_job_cores_from_links(page)
    return set(ordered)


async def _click_load_more(page: Page, selector: str, *, humanize: bool) -> bool:
    sel = selector.strip()
    if not sel:
        return False
    loc = page.locator(sel).first
    try:
        if await loc.count() == 0:
            return False
        await loc.scroll_into_view_if_needed(timeout=8_000)
        await human_behavior.human_delay()
        await human_behavior.human_click(loc, humanize=humanize, timeout_ms=15_000)
        return True
    except Exception as exc:
        log.warning("upwork_feed.load_more_click_failed", error=str(exc))
        return False


async def _click_load_more_with_retries(
    page: Page,
    selector: str,
    *,
    humanize: bool,
    round_idx: int,
) -> tuple[bool, int, str]:
    """
    Returns (ok, attempts_used, failure_tag). failure_tag empty on success.
    """
    extra = feed_load_more_click_retries()
    total = 1 + max(0, extra)
    for attempt in range(total):
        ok = await _click_load_more(page, selector, humanize=humanize)
        if ok:
            if attempt > 0:
                log.info(
                    "upwork_feed.load_more_click_recovered",
                    round=round_idx,
                    attempt=attempt + 1,
                    attempts=total,
                )
            return True, attempt + 1, ""
        if attempt + 1 < total:
            await human_behavior.chaos_sleep_ms(
                feed_load_more_click_backoff_ms_min(),
                feed_load_more_click_backoff_ms_max(),
            )
    log.warning(
        "upwork_feed.load_more_click_exhausted",
        round=round_idx,
        attempts=total,
        feed_stop_reason="load_more_click_exhausted",
    )
    return False, total, "load_more_click_exhausted"


async def maybe_probe_one_job_public_url(page: Page, *, humanize: bool) -> None:
    """
    Optional human-like open of the first visible ``/jobs/~`` link, log ``page.url``, then go back.

    Enable with ``GHOST_FEED_PROBE_PUBLIC_URL=1`` (dev / calibration). Does not enqueue Telegram.
    """
    loc = page.locator('a[href*="/jobs/~"]').first
    try:
        if await loc.count() == 0:
            return
        await human_behavior.human_delay()
        await human_behavior.human_click(loc, humanize=humanize, timeout_ms=15_000)
        await page.wait_for_load_state("domcontentloaded", timeout=25_000)
        await human_behavior.after_navigation_settle(page, humanize=humanize, ready_selector="")
        url = page.url
        log.info("upwork_feed.probed_job_public_url", url_preview=url[:180])
    except Exception as exc:
        log.warning("upwork_feed.probe_public_url_failed", error=str(exc))
    try:
        await page.go_back(wait_until="domcontentloaded", timeout=25_000)
        await human_behavior.after_navigation_settle(page, humanize=humanize, ready_selector="")
    except Exception as exc:
        log.warning("upwork_feed.probe_go_back_failed", error=str(exc))


def _env_truthy(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in ("1", "true", "yes")


async def persist_seen_to_redis(redis: Any, key: str, ids: set[str]) -> None:
    if redis is None or not ids:
        return
    try:
        for chunk_start in range(0, len(ids), 50):
            chunk = list(ids)[chunk_start : chunk_start + 50]
            await redis.sadd(key, *chunk)
        ttl = feed_seen_ttl_sec()
        await redis.expire(key, ttl)
    except Exception as exc:
        log.warning("upwork_feed.redis_seen_failed", error=str(exc))


async def run_upwork_feed_load_more_loop(
    page: Page,
    *,
    site_id: str,
    profile_name: str,
    feed_url: str,
    load_more_selector: str,
    humanize: bool,
    redis_client: Any | None = None,
    upwork_adapter: Any | None = None,
) -> None:
    """
    Navigate to find-work, optionally sync seen ids from Redis, then repeat Load More until overlap stop.
    """
    if not feed_url.strip():
        log.warning("upwork_feed.missing_feed_url", feed_stop_reason="missing_feed_url")
        return

    thr = feed_overlap_threshold()
    max_lm = feed_max_load_more()
    overlap_streak_need = feed_overlap_streak_before_stop()
    key = feed_seen_redis_key(site_id, profile_name)
    accumulated: set[str] = set()

    if redis_client is not None:
        try:
            raw_members = await redis_client.smembers(key)
            if raw_members:
                for m in raw_members:
                    if isinstance(m, bytes):
                        accumulated.add(m.decode("utf-8", errors="replace"))
                    elif isinstance(m, str):
                        accumulated.add(m)
        except Exception as exc:
            log.warning("upwork_feed.redis_smembers_failed", error=str(exc))

    # Overlap stop must NOT use Redis preload: otherwise the first Load More batch is often
    # 100% "already in accumulated" (seen last week) and the loop stops after one click.
    # Redis is still used for persistence/dedup; overlap_basis tracks only this run's DOM growth.
    overlap_basis: set[str] = set()

    log.info("upwork_feed.goto", url_preview=feed_url[:96])
    await page.goto(feed_url.strip(), wait_until="domcontentloaded")
    await human_behavior.after_navigation_settle(page, humanize=humanize, ready_selector="")
    if humanize:
        await human_behavior.warm_up_page(page, scroll_times=2)
        await human_behavior.dwell_on_search_results(page, humanize=True)
    else:
        await human_behavior.chaos_sleep_ms(1400, 2800)

    initial = await collect_job_ids_from_links(page)
    accumulated |= initial
    overlap_basis |= initial
    await persist_seen_to_redis(redis_client, key, initial)

    overlap_streak = 0
    stop_reason = "completed_max_rounds"
    stop_round: int | None = None

    for i in range(max_lm):
        snapshot = await collect_job_ids_from_links(page)
        clicked, attempts_used, fail_tag = await _click_load_more_with_retries(
            page,
            load_more_selector,
            humanize=humanize,
            round_idx=i,
        )
        if not clicked:
            stop_reason = "load_more_not_found" if not fail_tag else fail_tag
            stop_round = i
            log.info(
                "upwork_feed.load_more_unavailable",
                round=i,
                attempts_used=attempts_used,
                feed_stop_reason=stop_reason,
                accumulated_size=len(accumulated),
                overlap_threshold=thr,
                max_load_more=max_lm,
                overlap_streak=overlap_streak,
                overlap_streak_need=overlap_streak_need,
                ops_event="feed_loop_stop",
            )
            break
        await human_behavior.after_navigation_settle(page, humanize=humanize, ready_selector="")
        await wait_for_feed_job_anchors_post_load(page, humanize=humanize)
        # Increased wait for 'human reading' of the batch
        await human_behavior.chaos_sleep_ms(3500, 7500)
        after = await collect_job_ids_from_links(page)
        delta = after - snapshot
        if not delta:
            overlap_streak = 0
            stop_reason = "no_delta_after_load_more"
            stop_round = i
            log.info(
                "upwork_feed.no_delta_after_load_more",
                round=i,
                feed_stop_reason=stop_reason,
                snapshot_size=len(snapshot),
                after_size=len(after),
                accumulated_size=len(accumulated),
                overlap_threshold=thr,
                max_load_more=max_lm,
                ops_event="feed_loop_stop",
            )
            break
        overlap = len(delta & overlap_basis) / max(len(delta), 1)
        fresh_vs_redis = len(delta - accumulated)
        accumulated |= delta
        overlap_basis |= delta
        await persist_seen_to_redis(redis_client, key, delta)
        log.info(
            "upwork_feed.load_more_round",
            round=i,
            delta=len(delta),
            overlap_ratio=round(overlap, 4),
            threshold=thr,
            attempts_used=attempts_used,
            delta_fresh_vs_redis=fresh_vs_redis,
            overlap_streak=overlap_streak,
            overlap_streak_need=overlap_streak_need,
            accumulated_size=len(accumulated),
            overlap_basis_size=len(overlap_basis),
            ops_event="feed_load_round",
        )
        if overlap >= thr:
            overlap_streak += 1
            log.info(
                "upwork_feed.high_overlap_round",
                round=i,
                overlap_ratio=round(overlap, 4),
                threshold=thr,
                overlap_streak=overlap_streak,
                overlap_streak_need=overlap_streak_need,
                delta_fresh_vs_redis=fresh_vs_redis,
                ops_event="feed_overlap_candidate",
            )
            if overlap_streak >= overlap_streak_need:
                stop_reason = "stop_high_overlap"
                stop_round = i
                log.info(
                    "upwork_feed.stop_high_overlap",
                    round=i,
                    feed_stop_reason=stop_reason,
                    overlap_streak=overlap_streak,
                    overlap_threshold=thr,
                    max_load_more=max_lm,
                    accumulated_size=len(accumulated),
                    ops_event="feed_loop_stop",
                )
                break
        else:
            overlap_streak = 0

        if humanize:
            from ghost_engine.browser.upwork_feed_humanize import (
                apply_feed_inter_round_pause,
                linger_feed_cards_for_gri,
            )

            if upwork_adapter is not None:
                await linger_feed_cards_for_gri(page, upwork_adapter, humanize=True)
            await apply_feed_inter_round_pause(humanize=True, eff_humanize=True)

    log.info(
        "upwork_feed.loop_summary",
        feed_stop_reason=stop_reason,
        stop_round=stop_round,
        max_load_more=max_lm,
        rounds_cap=max_lm,
        accumulated_size=len(accumulated),
        overlap_threshold=thr,
        overlap_streak_need=overlap_streak_need,
        ops_event="feed_loop_summary",
    )

    if _env_truthy("GHOST_FEED_PROBE_PUBLIC_URL"):
        await maybe_probe_one_job_public_url(page, humanize=humanize)
