"""Rotate outbound proxies from env-backed pools (no secrets in YAML)."""

from __future__ import annotations

from ghost_engine.config.settings import get_settings


def get_next_proxy_url() -> str | None:
    settings = get_settings()
    if settings.brightdata_proxy_url:
        return settings.brightdata_proxy_url.get_secret_value()
    return None
