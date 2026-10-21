"""BaseSiteAdapter.check_for_captcha escalation path."""

from __future__ import annotations

from typing import Any

import pytest

from ghost_engine.adapters.upwork_adapter import load_default


@pytest.mark.asyncio
async def test_check_for_captcha_escalate_sends_photo(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GHOST_CAPTCHA_MANUAL_WAIT_SEC", "0")
    monkeypatch.setenv("GHOST_CAPTCHA_POLL_INTERVAL_SEC", "0.01")
    monkeypatch.setenv("GHOST_CAPTCHA_BLOCK_ON_ALERT", "0")

    async def always_true(page: Any, extra: Any = ()) -> bool:
        return True

    monkeypatch.setattr(
        "ghost_engine.adapters.captcha_detect.is_captcha_present",
        always_true,
    )

    sent: list[dict[str, Any]] = []

    async def capture(**kw: Any) -> None:
        sent.append(kw)

    monkeypatch.setattr(
        "ghost_engine.telegram.operator_alert.send_operator_photo_alert",
        capture,
    )

    class FakePage:
        async def screenshot(self, **kwargs: Any) -> bytes:
            return b"\x89PNG\r\n\x1a\nfake"

    adapter = load_default()
    await adapter.check_for_captcha(FakePage())  # type: ignore[arg-type]
    assert len(sent) == 1
    assert sent[0]["photo_png"].startswith(b"\x89PNG")
    assert "upwork" in sent[0]["caption"].lower() or "captcha" in sent[0]["caption"].lower()


@pytest.mark.asyncio
async def test_check_for_captcha_noop_when_absent(monkeypatch: pytest.MonkeyPatch) -> None:
    async def always_false(page: Any, extra: Any = ()) -> bool:
        return False

    monkeypatch.setattr(
        "ghost_engine.adapters.captcha_detect.is_captcha_present",
        always_false,
    )

    called: list[Any] = []

    async def capture(**kw: Any) -> None:
        called.append(kw)

    monkeypatch.setattr(
        "ghost_engine.telegram.operator_alert.send_operator_photo_alert",
        capture,
    )

    class FakePage:
        async def screenshot(self, **kwargs: Any) -> bytes:
            return b""

    adapter = load_default()
    await adapter.check_for_captcha(FakePage())  # type: ignore[arg-type]
    assert called == []
