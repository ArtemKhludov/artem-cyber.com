"""healthcheck module (Redis ping, Ollama /api/tags)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from ghost_engine.core import healthcheck as hc


@pytest.mark.asyncio
async def test_check_redis_success(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = MagicMock()
    fake.ping = AsyncMock(return_value=True)
    fake.aclose = AsyncMock()
    monkeypatch.setattr(hc.aioredis, "from_url", lambda *_a, **_k: fake)
    monkeypatch.setattr(hc, "get_settings", lambda: MagicMock(redis_url="redis://x"))
    assert await hc.check_redis() is True


@pytest.mark.asyncio
async def test_check_redis_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = MagicMock()
    fake.ping = AsyncMock(side_effect=OSError("nope"))
    fake.aclose = AsyncMock()
    monkeypatch.setattr(hc.aioredis, "from_url", lambda *_a, **_k: fake)
    monkeypatch.setattr(hc, "get_settings", lambda: MagicMock(redis_url="redis://x"))
    assert await hc.check_redis() is False


@pytest.mark.asyncio
async def test_check_ollama_success(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(hc, "get_settings", lambda: MagicMock(ollama_host="http://127.0.0.1:11434"))
    resp = MagicMock()
    resp.status_code = 200
    client = AsyncMock()
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)
    client.get = AsyncMock(return_value=resp)
    with patch.object(hc.httpx, "AsyncClient", return_value=client):
        assert await hc.check_ollama() is True
