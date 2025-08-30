"""Human pacing on find-work: pause between Load More rounds, dwell on high-GRI tiles, optional save."""

from __future__ import annotations

import os
from typing import Any

from playwright.async_api import Page

from ghost_engine.browser import human_behavior
from ghost_engine.browser.feed_policy import (
    feed_inter_load_more_fast_ms_bounds,
    feed_inter_load_more_ms_bounds,
)
from ghost_engine.browser.upwork_feed_loop import collect_ordered_job_cores_from_links
from ghost_engine.scoring.engine import ScoringEngine
from ghost_engine.scoring.feed_reading import feed_reading_from_scoring_root
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


async def apply_feed_inter_round_pause(*, humanize: bool, eff_humanize: bool) -> None:
    """
    Pause after a completed Load More round before the next click.

    Full human (eff_humanize): default 10–15 s (GHOST_FEED_INTER_LOAD_MORE_SEC_*).
    Stealth fast (humanize but not eff_humanize): 4–7 s (GHOST_FEED_INTER_FAST_SEC_*).
    """
    if not humanize:
        return
    if os.environ.get("GHOST_FEED_INTER_LOAD_MORE_DISABLE", "").strip().lower() in (
        "1",
        "true",
        "yes",
    ):
        return
    if eff_humanize:
        lo, hi = feed_inter_load_more_ms_bounds()
    else:
        lo, hi = feed_inter_load_more_fast_ms_bounds()
    if lo <= 0 and hi <= 0:
        return
    await human_behavior.chaos_sleep_ms(lo, hi)


def _feed_reading_disabled() -> bool:
    return os.environ.get("GHOST_FEED_LINGER_DISABLE", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )


async def linger_feed_cards_for_gri(
    page: Page,
    adapter: Any,
    *,
    humanize: bool,
) -> None:
    """
    Scroll to visible job tiles with known GRI in adapter cache; linger or save per ``feed_reading`` in scoring.yaml.
    """
    if not humanize or _feed_reading_disabled():
        return
    cfg = feed_reading_from_scoring_root(ScoringEngine().scoring_root)
    if not cfg.enabled:
        return
    gri_fn = getattr(adapter, "feed_gri_for_core", None)
    save_tile = getattr(adapter, "try_save_job_on_feed_tile", None)
    if not callable(gri_fn) or not callable(save_tile):
        return

    ordered = await collect_ordered_job_cores_from_links(page)
    if not ordered:
        return
    # Prefer recently appended ids (bottom of list).
    tail = ordered[-cfg.max_cards_per_round :]
    seen_round: set[str] = set()
    for core in tail:
        c = core.strip().lstrip("~")
        if not c or c in seen_round:
            continue
        seen_round.add(c)
        gri = gri_fn(c)
        if gri is None:
            continue
        if gri >= cfg.save_min_gri:
            await human_behavior.chaos_sleep_ms(
                cfg.pause_before_save_ms_min,
                cfg.pause_before_save_ms_max,
            )
            ok = await save_tile(page, c, humanize=humanize, gri=float(gri))
            if ok:
                log.info(
                    "upwork_feed_humanize.saved_high_gri_tile",
                    ciphertext_core=c,
                    gri=round(gri, 4),
                    threshold=cfg.save_min_gri,
                )
            continue
        if gri >= cfg.linger_min_gri:
            for variant in (f'article[data-item-key="~{c}"]', f'article[data-item-key="{c}"]'):
                loc = page.locator(variant)
                try:
                    if await loc.count() == 0:
                        continue
                    await loc.first.scroll_into_view_if_needed(timeout=6_000)
                    await human_behavior.chaos_sleep_ms(
                        cfg.linger_sleep_ms_min,
                        cfg.linger_sleep_ms_max,
                    )
                    break
                except Exception as exc:
                    log.debug(
                        "upwork_feed_humanize.linger_scroll_failed",
                        core=c,
                        error=str(exc),
                    )
