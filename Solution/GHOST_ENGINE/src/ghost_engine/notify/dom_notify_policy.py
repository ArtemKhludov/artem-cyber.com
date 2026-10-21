"""
When to defer Upwork job notifications until ``page.url`` is captured in the browser.

Default: defer (real public URL in Telegram). Opt out with ``GHOST_NOTIFY_IMMEDIATE=1``.
Explicit ``GHOST_NOTIFY_AFTER_DOM_URL=0`` also disables defer for operators who set it.
"""

from __future__ import annotations

import os


def should_defer_upwork_notify_for_dom_url() -> bool:
    """
    Return True if Upwork notify should go through Redis + ``pending_dom_resolve_loop``.

    - ``GHOST_NOTIFY_IMMEDIATE=1`` (or true/yes): legacy immediate ``cover_letter_node`` path.
    - ``GHOST_NOTIFY_AFTER_DOM_URL=0`` (or false/no/off): do not defer.
    - Otherwise: defer (default).
    """
    if os.environ.get("GHOST_NOTIFY_IMMEDIATE", "").strip().lower() in ("1", "true", "yes"):
        return False
    after = os.environ.get("GHOST_NOTIFY_AFTER_DOM_URL", "").strip().lower()
    if after in ("0", "false", "no", "off"):
        return False
    return True
