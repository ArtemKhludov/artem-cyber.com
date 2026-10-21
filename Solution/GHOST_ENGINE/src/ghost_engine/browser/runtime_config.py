"""
Runtime Configuration Manager: handles live selector overrides stored in Redis.
Enables self-healing by allowing AI-driven fixes to be applied without restarts.
"""

from __future__ import annotations

import json
from typing import Any

import redis.asyncio as aioredis

from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

def _redis_override_key(site_id: str) -> str:
    return f"ghost:config:overrides:{site_id}"

class RuntimeConfigManager:
    def __init__(self, redis_client: aioredis.Redis | None = None) -> None:
        self.redis = redis_client
        self._local_cache: dict[str, dict[str, str]] = {}

    async def get_selector_override(self, site_id: str, selector_key: str) -> str | None:
        """Fetch a specific selector override from Redis or local cache."""
        if self.redis is None:
            return None

        # Check local cache first to avoid Redis RTT on every selector access
        site_cache = self._local_cache.get(site_id, {})
        if selector_key in site_cache:
            return site_cache[selector_key]

        try:
            # We fetch the entire map for the site
            data = await self.redis.hget(_redis_override_key(site_id), selector_key)
            if data:
                val = data.decode("utf-8") if isinstance(data, bytes) else str(data)
                # Update local cache
                self._local_cache.setdefault(site_id, {})[selector_key] = val
                return val
        except Exception as exc:
            log.debug("runtime_config.fetch_failed", site_id=site_id, error=str(exc))
        
        return None

    async def set_selector_override(self, site_id: str, selector_key: str, new_value: str) -> None:
        """Store a new selector override in Redis."""
        if self.redis is None:
            return

        try:
            await self.redis.hset(_redis_override_key(site_id), selector_key, new_value)
            self._local_cache.setdefault(site_id, {})[selector_key] = new_value
            log.info("runtime_config.override_set", site_id=site_id, key=selector_key, val=new_value)
        except Exception as exc:
            log.warning("runtime_config.set_failed", site_id=site_id, error=str(exc))

    async def clear_overrides(self, site_id: str) -> None:
        """Remove all runtime overrides for a site (e.g. after manual YAML update)."""
        if self.redis is None:
            return
        try:
            await self.redis.delete(_redis_override_key(site_id))
            self._local_cache.pop(site_id, None)
            log.info("runtime_config.overrides_cleared", site_id=site_id)
        except Exception as exc:
            log.warning("runtime_config.clear_failed", site_id=site_id, error=str(exc))
