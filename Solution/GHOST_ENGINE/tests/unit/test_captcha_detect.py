"""captcha_detect.is_captcha_present heuristics."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from ghost_engine.adapters import captcha_detect


class _Loc0:
    async def count(self) -> int:
        return 0


class _Loc1:
    async def count(self) -> int:
        return 1


class PageAllZero:
    def __init__(self) -> None:
        self.frames: list[object] = []

    def locator(self, sel: str) -> object:
        return _Loc0()


@pytest.mark.asyncio
async def test_is_captcha_present_false_when_no_match() -> None:
    assert await captcha_detect.is_captcha_present(PageAllZero()) is False


@pytest.mark.asyncio
async def test_is_captcha_present_true_on_frame_url() -> None:
    page = PageAllZero()
    page.frames = [SimpleNamespace(url="https://assets.hcaptcha.com/c/1")]
    assert await captcha_detect.is_captcha_present(page) is True


@pytest.mark.asyncio
async def test_is_captcha_present_true_on_locator_count() -> None:
    class P:
        frames: list[object] = []

        def locator(self, sel: str) -> object:
            if "hcaptcha" in sel:
                return _Loc1()
            return _Loc0()

    assert await captcha_detect.is_captcha_present(P()) is True


@pytest.mark.asyncio
async def test_is_captcha_present_extra_selector() -> None:
    class P(PageAllZero):
        def locator(self, sel: str) -> object:
            if sel == "#site-captcha-widget":
                return _Loc1()
            return _Loc0()

    assert await captcha_detect.is_captcha_present(P(), ["#site-captcha-widget"]) is True
