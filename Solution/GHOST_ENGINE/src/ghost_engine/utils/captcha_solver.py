"""2Captcha / similar integrations (keys from settings only)."""

from __future__ import annotations

from ghost_engine.config.settings import get_settings


async def solve_captcha_if_needed(image_bytes: bytes) -> str | None:
    settings = get_settings()
    if not settings.captcha_key:
        return None
    # TODO: httpx call to provider API
    return None
