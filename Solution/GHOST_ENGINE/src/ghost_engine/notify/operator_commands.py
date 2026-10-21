"""
Redis-backed operator actions from Telegram (apply/skip/edit callbacks).

Queue contract:

- Default lists: ``ghost:op:commands`` and ``ghost:op:commands:high`` (see ``operator_commands_redis_key``).
- Legacy lists ``ghost:operator:commands`` (+ ``:high``) are still **drained** so old RPUSH data is not lost.
- ``operator_commands_drain_keys_ordered()`` / ``operator_commands_blpop_keys()`` — new keys first, then legacy.
- High-priority actions: ``apply``, ``save_job`` (``HIGH_PRIORITY_ACTIONS``).
- Overrides: ``GHOST_OPERATOR_COMMANDS_KEY``, ``GHOST_OPERATOR_COMMANDS_HIGH_KEY``,
  ``GHOST_OPERATOR_COMMANDS_LEGACY_KEY``, ``GHOST_OPERATOR_COMMANDS_LEGACY_HIGH_KEY``.
"""

from __future__ import annotations

import hashlib
import json
import os
from typing import Any

import redis.asyncio as aioredis

from ghost_engine.notify.contract import ApprovedJobNotifyPayload
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

DEFAULT_CONTEXT_PREFIX = "ghost:telegram:ctx:"
# New canonical operator queue (plan: ghost:op:*).
DEFAULT_COMMANDS_KEY = "ghost:op:commands"
# Legacy list still drained by consumers so in-flight commands are not lost.
LEGACY_COMMANDS_KEY = "ghost:operator:commands"

# Higher priority list is drained first by dev_session BLPOP (see ``operator_commands_blpop_keys``).
HIGH_PRIORITY_ACTIONS = frozenset({"apply", "save_job"})


def _context_prefix() -> str:
    p = os.environ.get("GHOST_TELEGRAM_CTX_PREFIX", DEFAULT_CONTEXT_PREFIX).strip()
    return p or DEFAULT_CONTEXT_PREFIX


def _commands_key() -> str:
    k = os.environ.get("GHOST_OPERATOR_COMMANDS_KEY", DEFAULT_COMMANDS_KEY).strip()
    return k or DEFAULT_COMMANDS_KEY


def operator_commands_legacy_redis_key() -> str:
    """Pre-migration list key (still consumed after ``ghost:op:commands``)."""
    k = os.environ.get("GHOST_OPERATOR_COMMANDS_LEGACY_KEY", LEGACY_COMMANDS_KEY).strip()
    return k or LEGACY_COMMANDS_KEY


def operator_commands_legacy_high_priority_key() -> str:
    raw = os.environ.get("GHOST_OPERATOR_COMMANDS_LEGACY_HIGH_KEY", "").strip()
    if raw:
        return raw
    return f"{operator_commands_legacy_redis_key()}:high"


def operator_commands_redis_key() -> str:
    """Redis list key for operator commands (same as Telegram producer)."""
    return _commands_key()


def operator_commands_high_priority_key() -> str:
    """Redis list for time-sensitive operator actions (apply, save_job)."""
    raw = os.environ.get("GHOST_OPERATOR_COMMANDS_HIGH_KEY", "").strip()
    if raw:
        return raw
    base = _commands_key()
    return f"{base}:high"


def operator_commands_drain_keys_ordered() -> list[str]:
    """
    Keys to drain in one orchestrator phase (high before default; new before legacy).

    Producers should RPUSH to ``operator_commands_redis_key()`` / high key; legacy keys
    are read until empty for backward compatibility.
    """
    ordered = [
        operator_commands_high_priority_key(),
        operator_commands_redis_key(),
        operator_commands_legacy_high_priority_key(),
        operator_commands_legacy_redis_key(),
    ]
    out: list[str] = []
    seen: set[str] = set()
    for k in ordered:
        if k not in seen:
            seen.add(k)
            out.append(k)
    return out


def operator_commands_blpop_keys() -> list[str]:
    """
    Keys passed to BLPOP in priority order (left = highest).

    Same order as ``operator_commands_drain_keys_ordered`` for blocking waiters.
    """
    return operator_commands_drain_keys_ordered()


def action_context_hash(*, idempotency_key: str, operator_chat_id: int) -> str:
    """16-char hex token for callback_data (Telegram limit 64 bytes per button)."""
    raw = f"{idempotency_key}:{operator_chat_id}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:16]


async def store_operator_card_context(
    redis: aioredis.Redis,
    *,
    operator_chat_id: int,
    payload: ApprovedJobNotifyPayload,
) -> str:
    """
    Persist payload snapshot for callback handlers (TTL prevents stale apply after days).
    """
    h = action_context_hash(
        idempotency_key=payload.idempotency_key,
        operator_chat_id=operator_chat_id,
    )
    key = f"{_context_prefix()}{h}"
    blob = json.dumps(
        {
            "site_id": payload.site_id,
            "job_id": payload.job_id,
            "cover_letter": payload.cover_letter,
            "idempotency_key": payload.idempotency_key,
            "operator_chat_id": operator_chat_id,
            "job_public_url": payload.job_public_url,
            "apply_strategy": payload.apply_strategy,
            "estimated_price_usd": payload.estimated_price_usd,
            "estimated_time_hours": payload.estimated_time_hours,
            "estimate_confidence": payload.estimate_confidence,
        },
        ensure_ascii=False,
    ).encode("utf-8")
    ttl = 86400
    try:
        raw_ttl = int(os.environ.get("GHOST_TELEGRAM_CTX_TTL_SEC", str(ttl)))
        ttl = max(300, min(raw_ttl, 86400 * 14))
    except ValueError:
        pass
    await redis.setex(key, ttl, blob)
    return h


async def load_operator_card_context(
    redis: aioredis.Redis, *, token: str, operator_chat_id: int
) -> dict[str, Any] | None:
    t = token.lower()
    if len(t) != 16 or any(c not in "0123456789abcdef" for c in t):
        return None
    key = f"{_context_prefix()}{t}"
    raw = await redis.get(key)
    if raw is None:
        return None
    try:
        if isinstance(raw, bytes):
            data = json.loads(raw.decode("utf-8"))
        else:
            data = json.loads(str(raw))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None
    if not isinstance(data, dict):
        return None
    stored_chat = data.get("operator_chat_id")
    try:
        if int(stored_chat) != operator_chat_id:
            log.warning("telegram.ctx_chat_mismatch", token_prefix=t[:4])
            return None
    except (TypeError, ValueError):
        return None
    return data


async def enqueue_operator_command(redis: aioredis.Redis, cmd: dict[str, Any]) -> None:
    line = json.dumps(cmd, ensure_ascii=False).encode("utf-8")
    action = str(cmd.get("action") or "").strip().lower()
    dest = (
        operator_commands_high_priority_key()
        if action in HIGH_PRIORITY_ACTIONS
        else operator_commands_redis_key()
    )
    await redis.rpush(dest, line)
    log.info(
        "operator.command_enqueued",
        action=cmd.get("action"),
        site_id=cmd.get("site_id"),
        job_id=cmd.get("job_id"),
        redis_key=dest,
    )
