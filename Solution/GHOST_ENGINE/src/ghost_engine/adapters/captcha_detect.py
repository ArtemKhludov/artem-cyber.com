"""Heuristic captcha presence checks for Playwright pages (iframe + DOM + frame URLs)."""

from __future__ import annotations

from collections.abc import Sequence

from playwright.async_api import Page

DEFAULT_CAPTCHA_SELECTORS: tuple[str, ...] = (
    'iframe[src*="arkoselabs"]',
    'iframe[src*="funcaptcha"]',
    'iframe[src*="hcaptcha"]',
    'iframe[src*="recaptcha"]',
    'iframe[src*="challenges.cloudflare.com"]',
    'iframe[src*="turnstile"]',
    "[data-sitekey]",
    ".h-captcha",
    "#captcha",
    ".captcha-check",
    "[class*='cf-turnstile']",
)

FRAME_URL_HINTS: tuple[str, ...] = (
    "arkoselabs",
    "funcaptcha",
    "hcaptcha",
    "recaptcha",
    "challenges.cloudflare.com",
    "turnstile",
)


async def is_captcha_present(page: Page, extra_selectors: Sequence[str] = ()) -> bool:
    """
    Return True if any default or extra selector matches, or a frame URL suggests a captcha vendor.
    """
    selectors: list[str] = list(DEFAULT_CAPTCHA_SELECTORS)
    for raw in extra_selectors:
        s = str(raw).strip()
        if s:
            selectors.append(s)

    for sel in selectors:
        try:
            n = await page.locator(sel).count()
            if n > 0:
                return True
        except Exception:
            continue

    for frame in page.frames:
        url = (frame.url or "").lower()
        for hint in FRAME_URL_HINTS:
            if hint in url:
                return True

    return False


async def try_click_cloudflare_turnstile_checkbox(
    page: Page, extra_selectors: Sequence[str] = ()
) -> bool:
    """
    Best-effort click on visible Cloudflare Turnstile / challenge checkbox.

    Use only when human-in-the-loop policy allows automated challenge interaction.
    """
    candidates: list[str] = [
        "iframe[src*='challenges.cloudflare.com']",
        "iframe[src*='turnstile']",
        "[class*='cf-turnstile']",
        "input[type='checkbox']",
    ]
    for raw in extra_selectors:
        s = str(raw).strip()
        if s:
            candidates.insert(0, s)

    for sel in candidates:
        try:
            loc = page.locator(sel).first
            if await loc.count() == 0:
                continue
            await loc.click(timeout=5_000)
            return True
        except Exception:
            continue
    return False
