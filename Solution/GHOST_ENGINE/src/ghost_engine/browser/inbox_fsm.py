"""
Minimal inbox FSM: badge check → open messages (adapter-driven).

GraphQL: ``UpworkAdapter`` may set ``_gql_unread_bumped`` when
``try_parse_inbox_unread_count`` maps a stable field; until then the DOM badge
(``nav_messages_button``) is authoritative.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from playwright.async_api import Page

from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


class InboxDigestPhase(str, Enum):
    IDLE = "idle"
    OPENED = "opened"
    SKIPPED = "skipped"


async def open_inbox_if_unread_badge(
    adapter: Any,
    page: Page,
    *,
    humanize: bool,
) -> InboxDigestPhase:
    """If the adapter reports an unread badge, navigate to inbox via ``goto_messages``."""
    check = getattr(adapter, "check_new_messages", None)
    if not callable(check):
        return InboxDigestPhase.SKIPPED
    try:
        has_badge = await check(page)
    except Exception as exc:
        log.warning("inbox_fsm.badge_check_failed", error=str(exc))
        return InboxDigestPhase.SKIPPED
    if not has_badge:
        return InboxDigestPhase.IDLE
    goto = getattr(adapter, "goto_messages", None)
    if not callable(goto):
        return InboxDigestPhase.SKIPPED
    try:
        ok = bool(await goto(page, humanize=humanize))
    except Exception as exc:
        log.warning("inbox_fsm.goto_messages_failed", error=str(exc))
        return InboxDigestPhase.SKIPPED
    if ok:
        try:
            from ghost_engine.negotiation.inbox_workflow import on_inbox_opened_for_negotiation

            await on_inbox_opened_for_negotiation(adapter=adapter, page=page)
        except Exception as exc:
            log.debug("inbox_fsm.negotiation_hook_failed", error=str(exc))
        return InboxDigestPhase.OPENED
    return InboxDigestPhase.SKIPPED
