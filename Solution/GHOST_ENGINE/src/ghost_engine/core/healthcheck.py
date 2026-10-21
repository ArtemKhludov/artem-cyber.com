"""Process and dependency health checks."""

from __future__ import annotations

import httpx
import redis.asyncio as aioredis

from ghost_engine.config.settings import get_settings
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


async def check_redis(redis_url: str | None = None, *, timeout_sec: float = 2.0) -> bool:
    """True if Redis responds to PING."""
    url = (redis_url or get_settings().redis_url).strip()
    if not url:
        return False
    client = aioredis.from_url(
        url,
        decode_responses=True,
        socket_connect_timeout=timeout_sec,
    )
    try:
        return bool(await client.ping())
    except Exception as exc:
        log.debug("healthcheck.redis_failed", error=str(exc))
        return False
    finally:
        await client.aclose()


async def check_ollama(base_url: str | None = None, *, timeout_sec: float = 3.0) -> bool:
    """True if Ollama HTTP API responds (GET /api/tags)."""
    host = (base_url or get_settings().ollama_host).strip().rstrip("/")
    if not host:
        return False
    url = f"{host}/api/tags"
    try:
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            resp = await client.get(url)
            return resp.status_code == 200
    except Exception as exc:
        log.debug("healthcheck.ollama_failed", error=str(exc))
        return False
