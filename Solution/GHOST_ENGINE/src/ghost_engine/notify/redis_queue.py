"""RPUSH/BLPOP FIFO queue + SET NX dedupe for notify payloads."""

from __future__ import annotations

import json
import os
from typing import TYPE_CHECKING, Any

import redis.asyncio as aioredis
from redis import Redis as SyncRedis

from ghost_engine.notify.contract import ApprovedJobNotifyPayload
from ghost_engine.utils.logger import get_logger

if TYPE_CHECKING:
    pass

log = get_logger(__name__)

DEFAULT_QUEUE_KEY = "ghost:notify:jobs"
DEFAULT_DEDUPE_PREFIX = "ghost:notify:dedupe:"
DEFAULT_PENDING_DOM_KEY = "ghost:notify:pending_dom_resolve"


def _queue_key() -> str:
    return os.environ.get("GHOST_NOTIFY_QUEUE_KEY", DEFAULT_QUEUE_KEY).strip() or DEFAULT_QUEUE_KEY


def _dedupe_prefix() -> str:
    p = os.environ.get("GHOST_NOTIFY_DEDUPE_PREFIX", DEFAULT_DEDUPE_PREFIX).strip()
    return p or DEFAULT_DEDUPE_PREFIX


def pending_dom_resolve_redis_key() -> str:
    k = os.environ.get("GHOST_NOTIFY_PENDING_DOM_KEY", DEFAULT_PENDING_DOM_KEY).strip()
    return k or DEFAULT_PENDING_DOM_KEY


def _pending_dom_queue_ttl_sec() -> int:
    raw = os.environ.get("GHOST_NOTIFY_PENDING_DOM_TTL_SEC", "172800")
    try:
        v = int(raw)
    except ValueError:
        v = 172800
    return max(3600, min(v, 86400 * 14))


async def enqueue_pending_dom_resolve_async(redis_url: str, scoring_final: dict[str, Any]) -> bool:
    """
    Queue scoring graph ``final`` for Upwork worker: open job in browser, set ``job_public_url``, then cover+notify.

    Used when Upwork defer policy is on (see ``dom_notify_policy.should_defer_upwork_notify_for_dom_url``).
    """
    if _notify_disabled():
        return False
    key = pending_dom_resolve_redis_key()
    blob = json.dumps({"v": 1, "final": scoring_final}, ensure_ascii=False, default=str).encode("utf-8")
    r = aioredis.from_url(redis_url, decode_responses=False, socket_connect_timeout=2.0)
    try:
        await r.rpush(key, blob)
        await r.expire(key, _pending_dom_queue_ttl_sec())
        log.info("notify.pending_dom_enqueued", redis_key=key)
        return True
    except Exception as exc:
        log.warning("notify.pending_dom_enqueue_failed", error=str(exc))
        return False
    finally:
        await r.aclose()


def _dedupe_ttl_sec() -> int:
    raw = os.environ.get("GHOST_NOTIFY_DEDUPE_TTL_SEC", "604800")
    try:
        v = int(raw)
    except ValueError:
        v = 604800
    return max(60, min(v, 86400 * 30))


def _notify_disabled() -> bool:
    return os.environ.get("DISABLE_JOB_NOTIFY", "").strip().lower() in ("1", "true", "yes")


def dedupe_redis_key(payload: ApprovedJobNotifyPayload) -> str:
    return f"{_dedupe_prefix()}{payload.idempotency_key}"


def enqueue_notify_job_sync(
    redis_url: str,
    payload: ApprovedJobNotifyPayload,
    *,
    queue_key: str | None = None,
) -> bool:
    """
    RPUSH payload if dedupe key was free. Returns True if enqueued.

    Uses a short-lived sync connection (LangGraph scoring_node runs sync).
    """
    if _notify_disabled():
        return False
    q = queue_key or _queue_key()
    dedupe_key = dedupe_redis_key(payload)
    line = payload.to_redis_json()
    try:
        r = SyncRedis.from_url(redis_url, decode_responses=False, socket_connect_timeout=2.0)
    except Exception as exc:
        log.warning("notify.redis_connect_failed", error=str(exc))
        return False
    try:
        if not r.set(dedupe_key, b"1", nx=True, ex=_dedupe_ttl_sec()):
            log.debug("notify.dedupe_skip", key=payload.idempotency_key)
            return False
        r.rpush(q, line.encode("utf-8"))
        log.info(
            "notify.enqueued",
            site_id=payload.site_id,
            job_id=payload.job_id,
            source=payload.notify_source,
        )
        return True
    except Exception as exc:
        log.warning("notify.enqueue_failed", error=str(exc), key=payload.idempotency_key)
        try:
            r.delete(dedupe_key)
        except Exception:
            pass
        return False
    finally:
        try:
            r.close()
        except Exception:
            pass


async def enqueue_notify_job_async(
    redis_url: str,
    payload: ApprovedJobNotifyPayload,
    *,
    queue_key: str | None = None,
) -> bool:
    """Async RPUSH for Playwright/async adapter path."""
    if _notify_disabled():
        return False
    q = queue_key or _queue_key()
    dedupe_key = dedupe_redis_key(payload)
    line = payload.to_redis_json()
    r = aioredis.from_url(redis_url, decode_responses=False, socket_connect_timeout=2.0)
    try:
        ok = await r.set(dedupe_key, b"1", nx=True, ex=_dedupe_ttl_sec())
        if not ok:
            log.debug("notify.dedupe_skip", key=payload.idempotency_key)
            return False
        await r.rpush(q, line.encode("utf-8"))
        log.info(
            "notify.enqueued",
            site_id=payload.site_id,
            job_id=payload.job_id,
            source=payload.notify_source,
        )
        return True
    except Exception as exc:
        log.warning("notify.enqueue_failed", error=str(exc), key=payload.idempotency_key)
        try:
            await r.delete(dedupe_key)
        except Exception:
            pass
        return False
    finally:
        await r.aclose()
