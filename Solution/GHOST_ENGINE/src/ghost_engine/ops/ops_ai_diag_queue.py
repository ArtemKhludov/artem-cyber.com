"""
Redis-backed FIFO for ops LLM diagnosis jobs + in-process fallback queue.

Monitors backlog / wait time / per-job duration and posts to Telegram ops.system
when thresholds are exceeded (rate-limited per alert kind).
"""

from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from typing import Any

from ghost_engine.core.redis_queue import get_redis
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

OPS_AI_DIAG_QUEUE_KEY_DEFAULT = "ghost:ops_ai_diag:queue"

_worker_task: asyncio.Task[None] | None = None
_fallback_memory_queue: asyncio.Queue[str] = asyncio.Queue()
_last_system_alert_mono: dict[str, float] = {}
_redis_enqueue_warned: bool = False


def _queue_key() -> str:
    k = os.environ.get("GHOST_OPS_AI_DIAG_QUEUE_KEY", OPS_AI_DIAG_QUEUE_KEY_DEFAULT).strip()
    return k or OPS_AI_DIAG_QUEUE_KEY_DEFAULT


def _max_payload_bytes() -> int:
    try:
        return max(50_000, int(os.environ.get("GHOST_OPS_AI_DIAG_MAX_PAYLOAD_BYTES", "1800000")))
    except ValueError:
        return 1_800_000


def _depth_alert_threshold() -> int:
    try:
        return max(1, int(os.environ.get("GHOST_OPS_AI_QUEUE_DEPTH_ALERT", "5")))
    except ValueError:
        return 5


def _wait_alert_sec() -> float:
    try:
        return max(30.0, float(os.environ.get("GHOST_OPS_AI_QUEUE_WAIT_ALERT_SEC", "120")))
    except ValueError:
        return 120.0


def _job_slow_sec() -> float:
    try:
        return max(30.0, float(os.environ.get("GHOST_OPS_AI_JOB_SLOW_SEC", "180")))
    except ValueError:
        return 180.0


def _system_alert_cooldown_sec() -> float:
    try:
        return max(60.0, float(os.environ.get("GHOST_OPS_AI_QUEUE_SYSTEM_ALERT_COOLDOWN_SEC", "300")))
    except ValueError:
        return 300.0


def _should_emit_system_alert(reason: str) -> bool:
    now = time.monotonic()
    gap = _system_alert_cooldown_sec()
    last = _last_system_alert_mono.get(reason, 0.0)
    if now - last < gap:
        return False
    _last_system_alert_mono[reason] = now
    return True


async def _send_system_alert(text: str, *, reason: str) -> None:
    if not _should_emit_system_alert(reason):
        return
    from ghost_engine.telegram.operator_alert import send_ops_system_line

    try:
        await send_ops_system_line(text)
    except Exception as exc:
        log.warning("ops_ai_diag_queue.system_telegram_failed", error=str(exc))


def trim_job_for_redis(job: dict[str, Any], *, max_bytes: int) -> dict[str, Any]:
    """Drop image if JSON payload would exceed ``max_bytes`` (UTF-8)."""
    out = dict(job)
    payload = json.dumps(out, ensure_ascii=False)
    if len(payload.encode("utf-8")) <= max_bytes:
        return out
    out.pop("image_base64", None)
    out["image_omitted_reason"] = "payload_size_cap"
    payload2 = json.dumps(out, ensure_ascii=False)
    if len(payload2.encode("utf-8")) > max_bytes:
        # Last resort: shrink context
        ctx = out.get("context")
        if isinstance(ctx, dict):
            out["context"] = {"truncated": True, "keys": list(ctx.keys())[:40]}
        out.pop("image_base64", None)
    return out


async def _maybe_alert_queue_depth(depth: int) -> None:
    thr = _depth_alert_threshold()
    if depth < thr:
        return
    await _send_system_alert(
        "GHOST / system: очередь ops AI диагностики перегружена.\n"
        f"Сейчас в Redis-очереди ~{depth} задач (порог {thr}). Это «энергозатратная» цепочка "
        "(Ollama текст + локальный vision + Gemini только текст).\n"
        "Действия: снизить частоту инцидентов (GHOST_OPS_AI_DIAG_ENABLED=0 на время), "
        "отключить картинки (GHOST_OPS_AI_DIAG_IMAGE=0), уменьшить GHOST_OPS_AI_DIAG_MIN_SEC, "
        "ускорить Ollama/GPU или поднять отдельный воркер только под ghost:ops_ai_diag:queue.",
        reason="queue_depth",
    )


async def _maybe_alert_wait(wait_sec: float, incident: str) -> None:
    thr = _wait_alert_sec()
    if wait_sec < thr:
        return
    await _send_system_alert(
        "GHOST / system: задачи ops AI долго висят в очереди.\n"
        f"Ожидание до старта обработки ~{wait_sec:.0f}s (порог {thr:.0f}s), инцидент `{incident}`.\n"
        "Воркер не успевает или Ollama занята другими запросами. Проверь один активный consumer, "
        "нагрузку на GPU и длину очереди `LLEN ghost:ops_ai_diag:queue`.",
        reason="queue_wait",
    )


async def _maybe_alert_slow(processing_sec: float, incident: str) -> None:
    thr = _job_slow_sec()
    if processing_sec < thr:
        return
    await _send_system_alert(
        "GHOST / system: одна ops AI диагностика выполнялась слишком долго.\n"
        f"Обработка ~{processing_sec:.0f}s (порог {thr:.0f}s), инцидент `{incident}`.\n"
        "Смягчение: лёгкая модель, меньше num_ctx, отключить скрин (GHOST_OPS_AI_DIAG_IMAGE=0), "
        "сократить очередь или отключить GHOST_OPS_AI_DIAG_USE_QUEUE.",
        reason="job_slow",
    )


async def enqueue_ops_ai_diag_job(job: dict[str, Any]) -> None:
    """
    Push a JSON job (incident, context, site_id, ops_topic, optional image_base64).
    Uses Redis RPUSH + BLPOP consumer; on Redis errors uses in-process asyncio.Queue.
    """
    global _redis_enqueue_warned
    job = {
        **job,
        "v": int(job.get("v", 1)),
        "job_id": str(job.get("job_id") or uuid.uuid4()),
        "enqueued_at": time.time(),
    }
    job = trim_job_for_redis(job, max_bytes=_max_payload_bytes())
    payload = json.dumps(job, ensure_ascii=False)

    try:
        client = await get_redis()
        try:
            depth = int(await client.llen(_queue_key()))
            await _maybe_alert_queue_depth(depth + 1)
            await client.rpush(_queue_key(), payload)
            log.info(
                "ops_ai_diag_queue.enqueued",
                job_id=job["job_id"],
                incident=job.get("incident"),
                queue_depth_after=depth + 1,
                has_image=bool(job.get("image_base64")),
            )
        finally:
            await client.aclose()
    except Exception as exc:
        if not _redis_enqueue_warned:
            log.warning(
                "ops_ai_diag_queue.redis_enqueue_failed_fallback_memory",
                error=str(exc),
                hint="Jobs will use in-process queue until Redis is reachable",
            )
            _redis_enqueue_warned = True
        await _fallback_memory_queue.put(payload)
        log.info(
            "ops_ai_diag_queue.enqueued_memory",
            job_id=job["job_id"],
            incident=job.get("incident"),
        )


async def _process_one_raw(raw: str) -> None:
    from ghost_engine.ops.ops_ai_diag import process_ops_ai_diag_from_job

    job = json.loads(raw)
    incident = str(job.get("incident", "unknown"))
    enqueued_at = float(job.get("enqueued_at", 0))
    wait_sec = max(0.0, time.time() - enqueued_at) if enqueued_at > 0 else 0.0
    await _maybe_alert_wait(wait_sec, incident)

    t0 = time.time()
    try:
        await process_ops_ai_diag_from_job(job)
    except Exception as exc:
        log.error("ops_ai_diag_queue.job_failed", incident=incident, error=str(exc))
        await _send_system_alert(
            f"GHOST / system: ops AI job crashed after dequeue.\n"
            f"Инцидент `{incident}`, ошибка: {type(exc).__name__}: {str(exc)[:500]}",
            reason="job_crash",
        )
        return

    processing_sec = time.time() - t0
    await _maybe_alert_slow(processing_sec, incident)


async def _worker_loop() -> None:
    log.info("ops_ai_diag_queue.worker_started", queue_key=_queue_key())
    key = _queue_key()
    while True:
        raw: str | None = None
        try:
            raw = _fallback_memory_queue.get_nowait()
        except asyncio.QueueEmpty:
            pass
        if raw is None:
            try:
                client = await get_redis()
                try:
                    popped = await client.blpop(key, timeout=4)
                finally:
                    await client.aclose()
                if popped:
                    raw = popped[1]
            except Exception as exc:
                log.warning("ops_ai_diag_queue.blpop_failed", error=str(exc))
                await asyncio.sleep(2.0)
                continue
        if raw is None:
            continue
        try:
            await _process_one_raw(raw)
        except json.JSONDecodeError as exc:
            log.error("ops_ai_diag_queue.bad_json", error=str(exc))


def ensure_ops_ai_diag_worker() -> None:
    """Start background consumer (idempotent). Requires running event loop."""
    global _worker_task
    if _worker_task is not None and not _worker_task.done():
        return
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        log.debug("ops_ai_diag_queue.worker_skip_no_loop")
        return

    _worker_task = loop.create_task(_worker_loop(), name="ghost_ops_ai_diag_worker")
