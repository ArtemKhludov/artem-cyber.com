"""
Best-effort automation for Google's account picker after "Log in with Google" (dev_session only).

Uses UPWORK_EMAIL (or passed hint) to find a visible tile / button. Does not pass 2FA / SMS — user must
complete those manually if prompted. Disable: GHOST_DEV_GOOGLE_OAUTH_ASSIST=0.
"""

from __future__ import annotations

import asyncio
import os
import random
import re
import time

from playwright.async_api import BrowserContext, Locator, Page

from ghost_engine.browser import human_behavior
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


def _google_oauth_assist_enabled() -> bool:
    return os.environ.get("GHOST_DEV_GOOGLE_OAUTH_ASSIST", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def _is_google_auth_url(url: str) -> bool:
    u = (url or "").lower()
    if "accounts.google.com" in u:
        return True
    if "signin/oauth" in u or "/oauth" in u:
        return "google.com" in u
    return False


async def _find_google_page(ctx: BrowserContext) -> Page | None:
    for p in ctx.pages:
        try:
            if _is_google_auth_url(p.url or ""):
                return p
        except Exception:
            continue
    return None


def _locator_strategies(google_page: Page, email_hint: str) -> list[tuple[str, Locator]]:
    """
    Order matters: Google often renders the email as plain text inside a row; ``get_by_text`` can
    resolve to a leaf that looks visible but does not receive the real click target. Prefer
    ``data-identifier`` and ARIA rows first (same as a human effectively clicking the tile).
    """
    out: list[tuple[str, Locator]] = []
    safe = re.escape(email_hint)
    # Account tile roots (Google account chooser)
    out.append(
        (
            "data_identifier",
            google_page.locator(f'[data-identifier="{email_hint}"]'),
        )
    )
    out.append(
        (
            "data_identifier_lower",
            google_page.locator(f'[data-identifier="{email_hint.lower()}"]'),
        )
    )
    out.append(
        (
            "role_button_email",
            google_page.get_by_role("button", name=re.compile(safe, re.I)),
        )
    )
    out.append(
        (
            "role_link_email",
            google_page.get_by_role("link", name=re.compile(safe, re.I)),
        )
    )
    local = email_hint.split("@", 1)[0].strip()
    if local and local != email_hint:
        out.append(
            (
                "role_button_local_part",
                google_page.get_by_role("button", name=re.compile(re.escape(local), re.I)),
            )
        )
    # Common "Continue as [Name]" button
    out.append(
        (
            "role_button_continue_as",
            google_page.get_by_role("button", name=re.compile(r"Continue\s+as", re.I)),
        )
    )
    # Last resort: any node containing the address (may be non-interactive; try after tiles).
    out.append(("text_contains_email", google_page.get_by_text(email_hint, exact=False)))
    return out


async def assist_google_account_picker_after_login(
    page: Page,
    *,
    email_hint: str,
    humanize: bool,
    timeout_sec: float = 55.0,
) -> bool:
    """
    After Upwork login click, wait for Google OAuth UI (same tab or popup) and click the matching account.

    Returns True if a click was attempted on a visible control.
    """
    if not _google_oauth_assist_enabled():
        return False

    email_hint = email_hint.strip()
    if not email_hint or "@" not in email_hint:
        log.warning("google_oauth_assist.skip", reason="invalid_email_hint", hint=email_hint)
        return False

    log.info("google_oauth_assist.start", email_hint=email_hint)
    ctx = page.context
    deadline = time.monotonic() + timeout_sec
    google_page: Page | None = None
    while time.monotonic() < deadline:
        google_page = await _find_google_page(ctx)
        if google_page is not None:
            break
        await asyncio.sleep(0.2)

    if google_page is None:
        log.info("google_oauth_assist.no_google_ui", hint="No Google URL in any tab within timeout")
        return False

    try:
        await google_page.bring_to_front()
    except Exception as exc:
        log.debug("google_oauth_assist.bring_to_front_skip", error=str(exc))

    try:
        await google_page.wait_for_load_state("domcontentloaded", timeout=20_000)
    except Exception as exc:
        log.debug("google_oauth_assist.load_wait", error=str(exc))

    # Give Google's picker JS time to attach handlers (domcontentloaded alone is often too early).
    await human_behavior.chaos_sleep_ms(900, 2200)

    use_human_layer = humanize and os.environ.get(
        "GHOST_DEV_GOOGLE_OAUTH_ASSIST_HUMANIZE", "0"
    ).strip().lower() in ("1", "true", "yes", "on")

    for strategy_id, loc in _locator_strategies(google_page, email_hint):
        try:
            n = await loc.count()
            if n == 0:
                continue
            try:
                vis = await loc.first.is_visible(timeout=3500)
            except Exception:
                vis = False
            if not vis:
                continue
            first = loc.first
            await first.scroll_into_view_if_needed(timeout=12_000)
            await human_behavior.chaos_sleep_ms(160, 520)
            if use_human_layer:
                await human_behavior.human_click(loc, humanize=True, timeout_ms=22_000)
            else:
                # Default: single Playwright click with press delay — avoids extra mouse jitter on
                # small OAuth popups fighting Camoufox humanize (manual clicks then "work").
                delay_ms = int(random.uniform(55.0, 220.0))
                await first.click(timeout=22_000, delay=delay_ms)
            log.info(
                "google_oauth_assist.clicked",
                strategy=strategy_id,
                url_preview=(google_page.url or "")[:120],
                human_layer=use_human_layer,
            )
            await human_behavior.chaos_sleep_ms(700, 2000)
            return True
        except Exception as exc:
            log.debug("google_oauth_assist.strategy_failed", strategy=strategy_id, error=str(exc))
            continue

    log.warning(
        "google_oauth_assist.no_tile",
        email_preview=email_hint[:48],
        hint="Complete Google steps manually; 2FA/consent not automated",
    )
    return False
