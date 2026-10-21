"""telegram.operator_alert — Bot API side channel from browser."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from ghost_engine.telegram import operator_alert


@pytest.mark.asyncio
async def test_send_operator_photo_alert_skips_without_token(monkeypatch: pytest.MonkeyPatch) -> None:
    class S:
        telegram_bot_token = None
        telegram_operator_chat_ids = [1]

    monkeypatch.setattr(operator_alert, "get_settings", lambda: S())
    await operator_alert.send_operator_photo_alert(photo_png=b"x", caption="c")


@pytest.mark.asyncio
async def test_send_operator_photo_alert_skips_without_operators(monkeypatch: pytest.MonkeyPatch) -> None:
    from pydantic import SecretStr

    class S:
        telegram_bot_token = SecretStr("dummy")
        telegram_operator_chat_ids: list[int] = []

    monkeypatch.setattr(operator_alert, "get_settings", lambda: S())
    await operator_alert.send_operator_photo_alert(photo_png=b"x", caption="c")


def test_format_captcha_alert_caption_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GHOST_CAPTCHA_ALERT_GREETING", raising=False)

    class S:
        base_config: dict = {"telegram": {}}

    monkeypatch.setattr(operator_alert, "get_settings", lambda: S())
    text = operator_alert.format_captcha_alert_caption(site_id="upwork")
    assert "upwork" in text
    assert "Operator" in text or "operator" in text.lower()


def test_format_captcha_alert_caption_custom_template(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GHOST_CAPTCHA_ALERT_GREETING", raising=False)

    class S:
        base_config = {"telegram": {"captcha_alert_template": "Hi {greeting} on {site_id}"}}

    monkeypatch.setattr(operator_alert, "get_settings", lambda: S())
    text = operator_alert.format_captcha_alert_caption(site_id="x")
    assert text == "Hi Operator on x"


@pytest.mark.asyncio
async def test_send_ops_system_line_delegates() -> None:
    with patch.object(operator_alert, "send_operator_text_alert", new_callable=AsyncMock) as m:
        await operator_alert.send_ops_system_line("boot")
    m.assert_awaited_once_with(text="boot", ops_topic="system")


@pytest.mark.asyncio
async def test_send_ops_errors_line_delegates() -> None:
    with patch.object(operator_alert, "send_operator_text_alert", new_callable=AsyncMock) as m:
        await operator_alert.send_ops_errors_line("fail")
    m.assert_awaited_once_with(text="fail", ops_topic="errors")
