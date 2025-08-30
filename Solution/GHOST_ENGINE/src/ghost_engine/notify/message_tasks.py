"""
Redis lists for future Messages-domain tasks (ghost:msg:*).

v1: keys are defined and drained in orchestrator order; producers may be added later.
"""

from __future__ import annotations

import os

# Default lists: high-priority first (same pattern as operator commands).
DEFAULT_MSG_TASKS_KEY = "ghost:msg:tasks"
DEFAULT_MSG_TASKS_HIGH_KEY = "ghost:msg:tasks:high"


def message_tasks_redis_key() -> str:
    k = os.environ.get("GHOST_MESSAGE_TASKS_KEY", DEFAULT_MSG_TASKS_KEY).strip()
    return k or DEFAULT_MSG_TASKS_KEY


def message_tasks_high_priority_key() -> str:
    raw = os.environ.get("GHOST_MESSAGE_TASKS_HIGH_KEY", "").strip()
    if raw:
        return raw
    return f"{message_tasks_redis_key()}:high"


def message_tasks_blpop_keys() -> list[str]:
    return [message_tasks_high_priority_key(), message_tasks_redis_key()]
