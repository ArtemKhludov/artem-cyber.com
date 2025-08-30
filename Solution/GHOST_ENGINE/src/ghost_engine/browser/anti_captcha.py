"""
Captcha checkpoint: detection heuristics + hard stop on failed-attempt UI.

Uses the same vendor iframe/DOM signals as ``adapters.captcha_detect`` (battle-tested
Playwright patterns: reCAPTCHA / hCaptcha / Arkose / Cloudflare challenge iframes).
If a widget is visible *and* the page shows a post-failure state, we alert operators
and block forever (``asyncio.Future``) so the session does not spam clicks or burn reputation.
"""

from __future__ import annotations

import asyncio
import re
from collections.abc import Sequence

from playwright.async_api import Page

from ghost_engine.adapters import captcha_detect
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

# Visible error chrome from major vendors (main frame; challenge iframe content is often cross-origin).
_FAILURE_SELECTORS: tuple[str, ...] = (
    ".rc-anchor-error-msg-container",
    ".rc-anchor-error-msg",
    ".rc-audiochallenge-error-message",
    "[class*='hcaptcha-error']",
    "[class*='HCaptcha-error']",
    "[data-testid='error']",  # some challenge UIs
)

# High-specificity phrases (avoid matching random "try again" buttons site-wide).
_FAILURE_TEXT_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"multiple\s+correct\s+solutions", re.IGNORECASE),
    re.compile(r"verification\s+(?:expired|failed|unsuccessful)", re.IGNORECASE),
    re.compile(r"challenge\s+expired", re.IGNORECASE),
    re.compile(r"could\s+not\s+verify\s+you\s+are\s+human", re.IGNORECASE),
    re.compile(r"incorrect\.?\s*try\s+again", re.IGNORECASE),
    re.compile(r"wrong\.?\s*try\s+again", re.IGNORECASE),
    re.compile(r"invalid\s+site\s*key", re.IGNORECASE),
    re.compile(r"error:\s*incorrect\s+captcha", re.IGNORECASE),
    re.compile(r"failed\s+to\s+verify", re.IGNORECASE),
)


async def _body_inner_text(page: Page) -> str:
    try:
        raw = await page.evaluate(
            "() => (document.body && document.body.innerText) ? document.body.innerText : ''"
        )
    except Exception:
        return ""
    return raw if isinstance(raw, str) else ""


async def is_failed_captcha_attempt_visible(page: Page) -> bool:
    """
    True when the page shows a captcha *failure* / retry state (not merely "widget visible").
    """
    for sel in _FAILURE_SELECTORS:
        try:
            loc = page.locator(sel)
            n = await loc.count()
            if n <= 0:
                continue
            first = loc.first
            if await first.is_visible():
                return True
        except Exception:
            continue

    text = await _body_inner_text(page)
    if not text:
        return False
    sample = text[:12000]
    for pat in _FAILURE_TEXT_PATTERNS:
        if pat.search(sample):
            return True
    return False


async def _freeze_forever() -> None:
    """Intentionally never completes — operator must recover the browser session."""
    loop = asyncio.get_running_loop()
    fut: asyncio.Future[None] = loop.create_future()
    await fut


async def check_for_captcha(
    page: Page,
    extra_selectors: Sequence[str] = (),
    *,
    site_id: str = "unknown",
) -> None:
    """
    If a captcha is present *and* a failed-attempt UI is detected: log, Telegram (photo + text),
    then await a never-completing Future (session frozen).

    If there is no captcha, or captcha is present but no failure signal: return immediately.
    The adapter continues with manual wait / solver / standard escalation.
    """
    extra = tuple(extra_selectors)
    if not await captcha_detect.is_captcha_present(page, extra):
        return
    if not await is_failed_captcha_attempt_visible(page):
        return

    sid = (site_id or "unknown").strip() or "unknown"
    log.critical(
        "captcha.failed_attempt_freeze",
        site_id=sid,
        detail="Captcha failure UI detected; freezing automation until manual intervention.",
    )

    from ghost_engine.telegram import operator_alert

    base_caption = operator_alert.format_captcha_alert_caption(site_id=sid)
    freeze_note = (
        "\n\nFAILED_ATTEMPT — session frozen (infinite wait). "
        "Fix the challenge in the browser or rotate session; do not leave bot clicking."
    )
    caption = f"{base_caption}{freeze_note}"

    png: bytes = b""
    try:
        png = await page.screenshot(type="png", full_page=True)
    except Exception as exc:
        log.warning("captcha.freeze_screenshot_failed", site_id=sid, error=str(exc))

    if png:
        await operator_alert.send_operator_photo_alert(photo_png=png, caption=caption)
    else:
        await operator_alert.send_operator_text_alert(text=caption)

    await _freeze_forever()
