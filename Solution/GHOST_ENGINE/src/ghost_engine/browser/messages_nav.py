"""
Optional navigation to platform Messages / inbox via header icon (badge-driven flows).

Wire selectors in ``config/sites/<site>.yaml`` under ``selectors.messages_nav``; call from
future inbox workers when GraphQL or DOM shows unread activity.
"""

from __future__ import annotations

from playwright.async_api import Page

from ghost_engine.browser import human_behavior
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


async def try_open_messages_via_nav(
    page: Page,
    messages_icon_selector: str,
    *,
    humanize: bool = True,
) -> bool:
    """
    Click configured Messages icon if present. Does not parse threads.

    Returns True if a click was attempted and navigation settled.
    """
    sel = messages_icon_selector.strip()
    if not sel:
        log.debug("messages_nav.no_selector")
        return False
    loc = page.locator(sel).first
    try:
        if await loc.count() == 0:
            return False
        await loc.scroll_into_view_if_needed(timeout=6_000)
        await human_behavior.human_click(loc, humanize=humanize, timeout_ms=12_000)
        await page.wait_for_load_state("domcontentloaded", timeout=20_000)
        await human_behavior.after_navigation_settle(page, humanize=humanize, ready_selector="")
        log.info("messages_nav.opened")
        return True
    except Exception as exc:
        log.warning("messages_nav.click_failed", error=str(exc))
        return False
