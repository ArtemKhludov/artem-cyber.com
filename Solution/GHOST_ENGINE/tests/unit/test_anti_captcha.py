"""browser.anti_captcha: failure detection and freeze path."""

from __future__ import annotations

from typing import Any

import pytest

from ghost_engine.browser import anti_captcha


class _Loc:
    def __init__(self, count: int, visible: bool) -> None:
        self._count = count
        self._visible = visible

    async def count(self) -> int:
        return self._count

    @property
    def first(self) -> _Loc:
        return self

    async def is_visible(self) -> bool:
        return self._visible


class _PageTextOnly:
    def __init__(self, inner_text: str) -> None:
        self._inner = inner_text

    async def evaluate(self, script: str) -> str:
        return self._inner

    def locator(self, sel: str) -> _Loc:
        return _Loc(0, False)


class _PageErrorVisible:
    def locator(self, sel: str) -> _Loc:
        return _Loc(1, True)

    async def evaluate(self, script: str) -> str:
        return ""


@pytest.mark.asyncio
async def test_is_failed_captcha_attempt_visible_text_hcaptcha() -> None:
    page = _PageTextOnly("Please solve: multiple correct solutions were required.")
    assert await anti_captcha.is_failed_captcha_attempt_visible(page) is True


@pytest.mark.asyncio
async def test_is_failed_captcha_attempt_visible_selector_recaptcha() -> None:
    page = _PageErrorVisible()
    assert await anti_captcha.is_failed_captcha_attempt_visible(page) is True


@pytest.mark.asyncio
async def test_is_failed_captcha_attempt_visible_false_when_clean() -> None:
    page = _PageTextOnly("Welcome to the dashboard. No captcha here.")
    assert await anti_captcha.is_failed_captcha_attempt_visible(page) is False


@pytest.mark.asyncio
async def test_check_for_captcha_noop_without_captcha(monkeypatch: pytest.MonkeyPatch) -> None:
    async def absent(*a: Any, **kw: Any) -> bool:
        return False

    monkeypatch.setattr("ghost_engine.adapters.captcha_detect.is_captcha_present", absent)
    called: list[str] = []

    async def no_freeze() -> None:
        called.append("freeze")

    monkeypatch.setattr(anti_captcha, "_freeze_forever", no_freeze)

    class P:
        async def screenshot(self, **kw: Any) -> bytes:
            return b""

    await anti_captcha.check_for_captcha(P(), ())
    assert called == []


@pytest.mark.asyncio
async def test_check_for_captcha_freeze_after_failure_sends_photo(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def present(*a: Any, **kw: Any) -> bool:
        return True

    monkeypatch.setattr("ghost_engine.adapters.captcha_detect.is_captcha_present", present)

    async def always_fail_visible(page: Any) -> bool:
        return True

    monkeypatch.setattr(
        "ghost_engine.browser.anti_captcha.is_failed_captcha_attempt_visible",
        always_fail_visible,
    )

    photos: list[dict[str, Any]] = []

    async def cap_photo(**kw: Any) -> None:
        photos.append(kw)

    texts: list[dict[str, Any]] = []

    async def cap_text(**kw: Any) -> None:
        texts.append(kw)

    monkeypatch.setattr(
        "ghost_engine.telegram.operator_alert.send_operator_photo_alert",
        cap_photo,
    )
    monkeypatch.setattr(
        "ghost_engine.telegram.operator_alert.send_operator_text_alert",
        cap_text,
    )

    frozen = {"n": 0}

    async def fake_freeze() -> None:
        frozen["n"] += 1

    monkeypatch.setattr(anti_captcha, "_freeze_forever", fake_freeze)

    class P:
        async def screenshot(self, **kw: Any) -> bytes:
            return b"\x89PNG\r\n\x1a\nx"

    await anti_captcha.check_for_captcha(P(), (), site_id="upwork")
    assert len(photos) == 1
    assert texts == []
    assert "FAILED_ATTEMPT" in photos[0]["caption"]
    assert frozen["n"] == 1


@pytest.mark.asyncio
async def test_check_for_captcha_freeze_sends_text_when_screenshot_empty(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def present(*a: Any, **kw: Any) -> bool:
        return True

    monkeypatch.setattr("ghost_engine.adapters.captcha_detect.is_captcha_present", present)

    async def always_fail_visible(page: Any) -> bool:
        return True

    monkeypatch.setattr(
        "ghost_engine.browser.anti_captcha.is_failed_captcha_attempt_visible",
        always_fail_visible,
    )

    photos: list[Any] = []
    texts: list[dict[str, Any]] = []

    async def cap_photo(**kw: Any) -> None:
        photos.append(kw)

    async def cap_text(**kw: Any) -> None:
        texts.append(kw)

    monkeypatch.setattr(
        "ghost_engine.telegram.operator_alert.send_operator_photo_alert",
        cap_photo,
    )
    monkeypatch.setattr(
        "ghost_engine.telegram.operator_alert.send_operator_text_alert",
        cap_text,
    )
    async def noop_freeze() -> None:
        return None

    monkeypatch.setattr(anti_captcha, "_freeze_forever", noop_freeze)

    class P:
        async def screenshot(self, **kw: Any) -> bytes:
            return b""

    await anti_captcha.check_for_captcha(P(), (), site_id="x")
    assert photos == []
    assert len(texts) == 1
    assert "FAILED_ATTEMPT" in texts[0]["text"]
