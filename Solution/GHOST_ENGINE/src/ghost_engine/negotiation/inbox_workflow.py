"""
Semi-automated client messaging (planned): digest → draft → operator approve → ``message_input``.

Redis contract (future wiring, not implemented here):
- ``ghost:negotiation:draft:{site_id}:{thread_id}`` — LLM draft text + metadata JSON
- ``ghost:negotiation:approve`` — BLPOP queue for operator-approved sends
- Dev session consumes approve commands and types into ``selectors.message_input`` (Upwork YAML).

This module only hooks inbox open for future digest/Telegram routing; no LLM or Redis I/O yet.
"""

from __future__ import annotations

from typing import Any

from playwright.async_api import Page

from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


async def on_inbox_opened_for_negotiation(*, adapter: Any, page: Page) -> None:
    """
    Called after a successful navigation to the messages UI (badge-driven).

    Next steps (product): snapshot thread list → Redis/Telegram digest → draft queue → approve.
    """
    sid = getattr(adapter, "site_id", "") or ""
    _ = page
    log.info(
        "negotiation.inbox_opened_stub",
        site_id=sid,
        hint="Wire digest → draft → ghost:negotiation:approve → message_input",
    )
