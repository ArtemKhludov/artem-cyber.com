"""telegram-ping sends without requiring real Bot API."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import yaml

from ghost_engine.config.telegram_routing import TelegramRouting
from ghost_engine.telegram import routing_ping as rp


@pytest.mark.asyncio
async def test_telegram_ping_posts_to_routing_targets(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    cfg = tmp_path / "telegram_routing.yaml"
    cfg.write_text(
        yaml.dump(
            {
                "version": 1,
                "ops": {"chat_id": -1003, "topics": {"captcha": 2, "errors": 3, "system": 4}},
                "sites": {"upwork": {"chat_id": -1002, "topic_jobs": 7}},
            },
        ),
        encoding="utf-8",
    )

    tok = SimpleNamespace(get_secret_value=lambda: "123456:FAKE_test_token")

    def fake_settings() -> SimpleNamespace:
        return SimpleNamespace(telegram_bot_token=tok, log_level="WARNING", config_dir=tmp_path)

    monkeypatch.setattr(rp, "get_settings", fake_settings)
    monkeypatch.setattr(rp, "load_telegram_routing", lambda _d: TelegramRouting.load(tmp_path))

    class _Resp:
        status_code = 200
        text = "{}"

    mock_post = AsyncMock(return_value=_Resp())
    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.post = mock_post

    with patch.object(rp.httpx, "AsyncClient", return_value=mock_client):
        code = await rp.run_telegram_routing_ping()

    assert code == 0
    assert mock_post.await_count == 4
