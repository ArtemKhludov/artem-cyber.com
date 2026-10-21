"""
Camoufox launcher: persistent BrowserContext per profile_name (tenant isolation).

Launch options are driven by `config/browser.yaml` + `ghost_engine.browser.launch_config`
(main_plan УЗЕЛ 1: geoip, humanize, WebRTC policy, cache, locale).
"""

from __future__ import annotations

import asyncio
import re
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from camoufox.async_api import AsyncCamoufox
from playwright.async_api import BrowserContext, Page

try:
    from playwright._impl._errors import TargetClosedError as _PWTargetClosedError
except ImportError:
    _PWTargetClosedError = None

from ghost_engine.browser.launch_config import GeoIPInput, build_camoufox_options, oauth_popup_resize_target
from ghost_engine.config.settings import get_settings
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

_OAUTH_URL_HINT = re.compile(
    r"accounts\.google\.|google\.com/(o/oauth|signin/oauth)|googleusercontent\.com",
    re.I,
)


async def _maybe_enlarge_oauth_popup(page: Page, target_w: int, target_h: int) -> None:
    """Widen tiny OAuth popups; main Upwork tab is usually already large — skip those."""
    try:
        await page.wait_for_load_state("domcontentloaded", timeout=20_000)
    except Exception:
        pass
    url = ""
    try:
        url = page.url or ""
    except Exception:
        pass
    try:
        too_small = await page.evaluate(
            """() => window.outerWidth < 880 || window.outerHeight < 640"""
        )
    except Exception:
        too_small = True
    oauth_like = bool(url and _OAUTH_URL_HINT.search(url))
    if not oauth_like and not too_small:
        return
    if oauth_like or too_small:
        try:
            await page.set_viewport_size({"width": target_w, "height": target_h})
        except Exception as exc:
            log.debug("browser.popup_viewport_skip", error=str(exc))
        try:
            await page.evaluate(
                """([tw, th]) => {
                    try {
                        const w = Math.max(tw, window.outerWidth || 0);
                        const h = Math.max(th, window.outerHeight || 0);
                        window.resizeTo(w, h);
                    } catch (e) {}
                }""",
                [target_w, target_h],
            )
        except Exception as exc:
            log.debug("browser.popup_resize_to_skip", error=str(exc))
        log.info(
            "browser.oauth_popup_resized",
            target_w=target_w,
            target_h=target_h,
            url_preview=url[:100] if url else None,
        )


def _attach_oauth_popup_handler(context: BrowserContext, target_w: int, target_h: int) -> None:
    if target_w <= 0 or target_h <= 0:
        return

    def _on_page(page: Page) -> None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        loop.create_task(_maybe_enlarge_oauth_popup(page, target_w, target_h))

    context.on("page", _on_page)


def _is_target_closed_error(exc: BaseException) -> bool:
    if _PWTargetClosedError is not None and isinstance(exc, _PWTargetClosedError):
        return True
    return type(exc).__name__ == "TargetClosedError"


@asynccontextmanager
async def launch_camoufox(
    profile_name: str,
    *,
    headless: bool = False,
    humanize: bool = True,
    geoip: GeoIPInput = True,
) -> AsyncIterator[BrowserContext]:
    """
    Yield a persistent Camoufox BrowserContext. profile_name maps to profiles_dir / profile_name.

    geoip: True = resolve public IP and spoof geolocation; False/None = skip Camoufox geoip block;
    str = target IP string (see camoufox launch_options).
    """
    settings = get_settings()
    kwargs = build_camoufox_options(
        settings,
        profile_name,
        headless=headless,
        humanize=humanize,
        geoip=geoip,
    )
    cam = AsyncCamoufox(**kwargs)
    context = await cam.__aenter__()
    assert isinstance(context, BrowserContext)
    tw, th = oauth_popup_resize_target(settings)
    _attach_oauth_popup_handler(context, tw, th)
    try:
        yield context
    finally:
        exc_t, exc_v, exc_tb = sys.exc_info()
        try:
            await cam.__aexit__(exc_t, exc_v, exc_tb)
        except BaseException as close_exc:
            if _is_target_closed_error(close_exc):
                log.debug("browser.context_already_closed_on_exit", error=str(close_exc))
            else:
                raise
