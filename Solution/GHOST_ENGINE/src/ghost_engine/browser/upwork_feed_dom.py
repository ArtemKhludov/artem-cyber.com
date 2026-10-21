"""
Find-work DOM helpers: locate job tiles/links without leaving the feed (scroll-only path).

Selectors come from site YAML (``feed_job_card``, ``feed_job_deep_link``) with link fallbacks.
"""

from __future__ import annotations

import random
from typing import Any

from playwright.async_api import Locator, Page

from ghost_engine.browser import human_behavior
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

_DEFAULT_MAX_ROUNDS = 20


def build_upwork_job_feed_selectors(selectors: dict[str, str], job_id: str) -> list[str]:
    """Ordered CSS selectors to find a job row/link on the find-work feed."""
    jid = job_id.strip()
    if not jid:
        return []
    core = jid.lstrip("~")
    out: list[str] = []
    card = (selectors.get("feed_job_card") or "").strip()
    if card and core:
        try:
            out.append(card.format(job_id=jid, job_id_core=core))
        except (KeyError, ValueError) as exc:
            log.warning("upwork_feed_dom.feed_job_card_format_failed", error=str(exc))
    custom = (selectors.get("feed_job_deep_link") or "").strip()
    if custom:
        try:
            out.append(custom.format(job_id=jid, job_id_core=core))
        except (KeyError, ValueError) as exc:
            log.warning("upwork_feed_dom.feed_job_deep_link_format_failed", error=str(exc))
    if core:
        out.append(f'a[href*="~{core}"]')
    out.append(f'a[href*="{jid}"]')
    # Dedup preserving order
    seen: set[str] = set()
    uniq: list[str] = []
    for s in out:
        if s not in seen:
            seen.add(s)
            uniq.append(s)
    return uniq


async def scroll_feed_until_job_visible(
    page: Page,
    selector_strings: list[str],
    *,
    humanize: bool,
    max_rounds: int | None = None,
    feed_job_card_selector: str | None = None,
    adapter: Any | None = None,
) -> Locator | None:
    """
    Scroll the feed until one of the selectors matches a visible element.

    Returns a locator for the first matching element, or None.
    """
    rounds = max_rounds if max_rounds is not None else _DEFAULT_MAX_ROUNDS
    rounds = max(1, min(rounds, 60))
    card_tracked = bool(feed_job_card_selector and feed_job_card_selector.strip())
    card_ever_matched = False
    for attempt in range(rounds):
        if card_tracked:
            try:
                c = await page.locator(feed_job_card_selector or "").count()
                if c > 0:
                    card_ever_matched = True
            except Exception as exc:
                log.debug(
                    "upwork_feed_dom.feed_job_card_count_failed",
                    error=str(exc),
                )
        for sel in selector_strings:
            loc = page.locator(sel).first
            try:
                if await loc.count() == 0:
                    continue
                await loc.scroll_into_view_if_needed(timeout=8_000)
                if humanize:
                    await human_behavior.human_delay(80, 320)
                if await loc.is_visible():
                    log.info(
                        "upwork_feed_dom.job_visible",
                        attempt=attempt + 1,
                        selector_preview=sel[:56],
                    )
                    return loc
            except Exception as exc:
                log.debug(
                    "upwork_feed_dom.scroll_attempt_failed",
                    selector_preview=sel[:48],
                    error=str(exc),
                )
        try:
            await human_behavior.random_scroll(page, px_min=280, px_max=720)
            if humanize:
                await human_behavior.human_delay(120, 450)
        except Exception as exc:
            log.debug("upwork_feed_dom.feed_scroll_failed", error=str(exc))
    log.warning("upwork_feed_dom.job_not_found_after_scrolls", rounds=rounds)
    if (
        card_tracked
        and not card_ever_matched
        and adapter is not None
    ):
        note = getattr(adapter, "note_feed_job_card_selector_miss", None)
        if callable(note):
            note()
    return None


async def human_glance_at_locator(
    page: Page,
    loc: Locator,
    *,
    humanize: bool,
    max_read_ms: int = 1_600,
) -> None:
    """Short simulate_reading dwell on a feed card (does not navigate)."""
    if not humanize:
        return
    try:
        ms = max(400, min(max_read_ms, 4_000))
        jitter = random.randint(-200, 400)
        await human_behavior.simulate_reading(
            page,
            loc,
            max_total_ms=ms + jitter,
        )
    except Exception as exc:
        log.debug("upwork_feed_dom.glance_failed", error=str(exc))


async def scroll_to_job_on_feed(
    adapter: Any,
    page: Page,
    job_id: str,
    *,
    humanize: bool,
    max_rounds: int | None = None,
    glance: bool = True,
) -> bool:
    """
    Scroll find-work until the job link/card is visible; optionally brief human "glance".

    ``adapter`` must provide ``selectors`` (dict) and ``site_id``.
    """
    jid = job_id.strip()
    if not jid:
        return False
    selectors = adapter.selectors if hasattr(adapter, "selectors") else {}
    if not isinstance(selectors, dict):
        selectors = {}
    flat = {str(k): str(v) for k, v in selectors.items() if isinstance(k, str) and isinstance(v, str)}
    core = jid.lstrip("~")
    card_raw = (flat.get("feed_job_card") or "").strip()
    formatted_card: str | None = None
    if card_raw and core:
        try:
            formatted_card = card_raw.format(job_id=jid, job_id_core=core)
        except (KeyError, ValueError) as exc:
            log.warning("upwork_feed_dom.feed_job_card_format_failed", error=str(exc))
    sel_strings = build_upwork_job_feed_selectors(flat, jid)
    if not sel_strings:
        return False
    target = await scroll_feed_until_job_visible(
        page,
        sel_strings,
        humanize=humanize,
        max_rounds=max_rounds,
        feed_job_card_selector=formatted_card,
        adapter=adapter,
    )
    if target is None:
        return False
    reset = getattr(adapter, "reset_feed_job_card_miss_streak", None)
    if callable(reset):
        reset()
    if glance:
        await human_glance_at_locator(page, target, humanize=humanize)
    return True
