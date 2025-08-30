"""Redis BRPOP consumer + batched Telegram sends + aiogram polling."""

from __future__ import annotations

import asyncio
import html
import os
import time
from collections import deque
from typing import Any

import redis.asyncio as aioredis
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import InlineKeyboardMarkup

from ghost_engine.config.settings import Settings, get_settings
from ghost_engine.config.telegram_routing import load_telegram_routing
from ghost_engine.core.redis_queue import JobNotificationQueue
from ghost_engine.notify.contract import ApprovedJobNotifyPayload
from ghost_engine.notify.operator_commands import store_operator_card_context
from ghost_engine.notify.redis_queue import _queue_key
from ghost_engine.telegram import handlers
from ghost_engine.telegram.formatting import format_notify_batch_html, format_single_job_detailed
from ghost_engine.telegram.keyboards import job_action_keyboard
from ghost_engine.utils.logger import configure_logging, get_logger

log = get_logger(__name__)


def _worker_mirror_send_failures_to_ops() -> bool:
    v = os.getenv("GHOST_WORKER_SEND_FAIL_TELEGRAM", "1").strip().lower()
    return v not in ("0", "false", "no", "off")


def _worker_system_startup_notify_enabled() -> bool:
    v = os.getenv("GHOST_WORKER_SYSTEM_STARTUP_NOTIFY", "1").strip().lower()
    return v not in ("0", "false", "no", "off")


async def _mirror_notify_send_failed_to_ops_errors(
    *,
    site_id: str,
    chat_id: int,
    message_thread_id: int | None,
    error: str,
) -> None:
    if not _worker_mirror_send_failures_to_ops():
        return
    try:
        from ghost_engine.telegram.operator_alert import send_ops_errors_line

        tid = f" thread={message_thread_id}" if message_thread_id is not None else ""
        msg = f"[notify.send_failed] site={site_id} chat_id={chat_id}{tid}\n{error[:900]}"
        await send_ops_errors_line(msg)
    except Exception as exc:
        log.debug("notify.send_failed.ops_mirror_skipped", error=str(exc))


async def _system_worker_started_notify() -> None:
    if not _worker_system_startup_notify_enabled():
        return
    try:
        from ghost_engine.telegram.operator_alert import send_ops_system_line

        await send_ops_system_line(
            "GHOST Command Center: worker online (Redis job queue consumer + aiogram polling)."
        )
    except Exception as exc:
        log.debug("telegram.system_startup_notify_skipped", error=str(exc))


def _telegram_section(base: dict[str, Any]) -> dict[str, Any]:
    raw = base.get("telegram")
    return raw if isinstance(raw, dict) else {}


def _batch_interval_sec(settings: Settings) -> float:
    tg = _telegram_section(settings.base_config)
    v = tg.get("batch_interval_sec", 8.0)
    try:
        f = float(v)
    except (TypeError, ValueError):
        f = 8.0
    return max(1.0, min(f, 120.0))


def _max_lines_per_summary(settings: Settings) -> int:
    tg = _telegram_section(settings.base_config)
    v = tg.get("max_lines_per_summary", 12)
    try:
        n = int(v)
    except (TypeError, ValueError):
        n = 12
    return max(3, min(n, 40))


def _max_outbound_per_minute(settings: Settings) -> int:
    tg = _telegram_section(settings.base_config)
    v = tg.get("max_outbound_per_minute", 20)
    try:
        n = int(v)
    except (TypeError, ValueError):
        n = 20
    return max(1, min(n, 60))


def _max_batch_items(settings: Settings) -> int:
    tg = _telegram_section(settings.base_config)
    v = tg.get("max_batch_items", 50)
    try:
        n = int(v)
    except (TypeError, ValueError):
        n = 50
    return max(5, min(n, 200))


def _detailed_card_min_score(settings: Settings) -> int:
    tg = _telegram_section(settings.base_config)
    v = tg.get("detailed_card_min_score", 80)
    try:
        n = int(v)
    except (TypeError, ValueError):
        n = 80
    return max(0, min(n, 100))


def _brpop_idle_timeout_sec(settings: Settings) -> int:
    tg = _telegram_section(settings.base_config)
    v = tg.get("brpop_idle_timeout_sec", 30)
    try:
        n = int(v)
    except (TypeError, ValueError):
        n = 30
    return max(5, min(n, 300))


def _item_needs_detailed_card(
    p: ApprovedJobNotifyPayload, batch_len: int, min_score: int
) -> bool:
    if batch_len == 1:
        return True
    if p.needs_manual_review:
        return True
    if p.l1_score > min_score:
        return True
    return False


async def _throttle_send(
    bot: Bot,
    chat_id: int,
    text: str,
    send_times: deque[float],
    max_per_minute: int,
    *,
    message_thread_id: int | None = None,
    reply_markup: InlineKeyboardMarkup | None = None,
) -> None:
    window = 60.0
    while True:
        now = time.monotonic()
        while send_times and now - send_times[0] > window:
            send_times.popleft()
        if len(send_times) < max_per_minute:
            break
        await asyncio.sleep(0.35)
    kwargs: dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": ParseMode.HTML,
        "disable_web_page_preview": True,
    }
    if message_thread_id is not None:
        kwargs["message_thread_id"] = message_thread_id
    if reply_markup is not None:
        kwargs["reply_markup"] = reply_markup
    await bot.send_message(**kwargs)
    send_times.append(time.monotonic())


async def _notify_consumer_loop(
    bot: Bot,
    redis_client: aioredis.Redis,
    settings: Settings,
    operator_chat_ids: list[int],
) -> None:
    qkey = _queue_key()
    job_q = JobNotificationQueue.from_client(redis_client, qkey)
    interval = _batch_interval_sec(settings)
    max_lines = _max_lines_per_summary(settings)
    max_per_min = _max_outbound_per_minute(settings)
    max_items = _max_batch_items(settings)
    idle_wait = _brpop_idle_timeout_sec(settings)
    send_times: deque[float] = deque()

    while True:
        try:
            first = await job_q.dequeue(timeout=idle_wait)
        except Exception as exc:
            log.warning("notify.blpop_failed", error=str(exc))
            await asyncio.sleep(1.0)
            continue
        if first is None:
            continue
        try:
            batch: list[ApprovedJobNotifyPayload] = [ApprovedJobNotifyPayload.model_validate(first)]
        except Exception as exc:
            log.warning("notify.bad_payload", error=str(exc))
            continue

        deadline = time.monotonic() + interval
        while time.monotonic() < deadline and len(batch) < max_items:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            timeout = int(min(2.0, max(1.0, remaining)))
            try:
                nxt = await job_q.dequeue(timeout=timeout)
            except Exception as exc:
                log.warning("notify.blpop_failed", error=str(exc))
                break
            if nxt is None:
                continue
            try:
                batch.append(ApprovedJobNotifyPayload.model_validate(nxt))
            except Exception as exc:
                log.warning("notify.bad_payload", error=str(exc))
                continue

        routing = load_telegram_routing(settings.config_dir)
        by_site: dict[str, list[ApprovedJobNotifyPayload]] = {}
        for p in batch:
            by_site.setdefault(p.site_id, []).append(p)

        min_score = _detailed_card_min_score(settings)
        for site_id, items in by_site.items():
            n_batch = len(items)
            detailed_list: list[ApprovedJobNotifyPayload] = []
            rest: list[ApprovedJobNotifyPayload] = []
            
            # Special routing for chat messages
            chat_messages: list[ApprovedJobNotifyPayload] = []
            job_vacancies: list[ApprovedJobNotifyPayload] = []
            
            for p in items:
                if p.job_tags and "CHAT_MESSAGE" in p.job_tags:
                    chat_messages.append(p)
                else:
                    job_vacancies.append(p)

            # 1. Process Chat Messages (Dedicated topic: chat_client.topics.<site_id>)
            if chat_messages:
                chat_targets = routing.chat_client_targets_for_site(site_id)
                if not chat_targets:
                    log.warning(
                        "notify.chat_no_routing",
                        site_id=site_id,
                        count=len(chat_messages),
                        hint="Set chat_client.chat_id and chat_client.topics.<site_id> in telegram_routing.yaml",
                    )
                    asyncio.create_task(
                        _mirror_notify_send_failed_to_ops_errors(
                            site_id=site_id,
                            chat_id=0,
                            message_thread_id=None,
                            error=(
                                f"[CHAT_MESSAGE] no chat_client route for site={site_id!r}; "
                                f"{len(chat_messages)} payload(s) not delivered to Telegram"
                            ),
                        )
                    )
                for t in chat_targets:
                    for p in chat_messages:
                        try:
                            title = p.job_signal.get("title", "Chat") if isinstance(p.job_signal, dict) else "Chat"
                            desc = (
                                p.job_signal.get("description", "")
                                if isinstance(p.job_signal, dict)
                                else ""
                            )
                            body = (
                                f"💬 <b>{html.escape(str(title))}</b>\n\n{html.escape(str(desc))}"
                            )
                            await _throttle_send(
                                bot,
                                t.chat_id,
                                body,
                                send_times,
                                max_per_min,
                                message_thread_id=t.message_thread_id,
                            )
                        except Exception as exc:
                            log.warning("notify.chat_send_failed", site_id=site_id, error=str(exc))
                            asyncio.create_task(
                                _mirror_notify_send_failed_to_ops_errors(
                                    site_id=site_id,
                                    chat_id=t.chat_id,
                                    message_thread_id=t.message_thread_id,
                                    error=f"[CHAT_MESSAGE] {exc}",
                                )
                            )

            # 2. Process Job Vacancies (Standard flow)
            for p in job_vacancies:
                if _item_needs_detailed_card(p, n_batch, min_score):
                    detailed_list.append(p)
                else:
                    rest.append(p)

            targets = routing.jobs_targets_for_site(site_id, operator_chat_ids)
            for t in targets:
                for p in detailed_list:
                    try:
                        token = await store_operator_card_context(
                            redis_client,
                            operator_chat_id=t.chat_id,
                            payload=p,
                        )
                        body = format_single_job_detailed(p)
                        kb = job_action_keyboard(token)
                        await _throttle_send(
                            bot,
                            t.chat_id,
                            body,
                            send_times,
                            max_per_min,
                            message_thread_id=t.message_thread_id,
                            reply_markup=kb,
                        )
                    except Exception as exc:
                        log.warning(
                            "notify.send_failed",
                            chat_id=t.chat_id,
                            message_thread_id=t.message_thread_id,
                            site_id=site_id,
                            error=str(exc),
                        )
                        asyncio.create_task(
                            _mirror_notify_send_failed_to_ops_errors(
                                site_id=site_id,
                                chat_id=t.chat_id,
                                message_thread_id=t.message_thread_id,
                                error=str(exc),
                            )
                        )
                if rest:
                    body = format_notify_batch_html(rest, max_lines=max_lines)
                    try:
                        await _throttle_send(
                            bot,
                            t.chat_id,
                            body,
                            send_times,
                            max_per_min,
                            message_thread_id=t.message_thread_id,
                        )
                    except Exception as exc:
                        log.warning(
                            "notify.send_failed",
                            chat_id=t.chat_id,
                            message_thread_id=t.message_thread_id,
                            site_id=site_id,
                            error=str(exc),
                        )
                        asyncio.create_task(
                            _mirror_notify_send_failed_to_ops_errors(
                                site_id=site_id,
                                chat_id=t.chat_id,
                                message_thread_id=t.message_thread_id,
                                error=str(exc),
                            )
                        )


async def run_command_center() -> None:
    settings = get_settings()
    configure_logging(settings.log_level)

    token = settings.telegram_bot_token
    if token is None:
        log.error("telegram.missing_token", hint="Set TELEGRAM_BOT_TOKEN")
        raise SystemExit(2)

    raw_token = token.get_secret_value().strip()
    if not raw_token:
        log.error("telegram.empty_token")
        raise SystemExit(2)

    operators = settings.telegram_operator_chat_ids
    if not operators:
        log.error(
            "telegram.missing_operators",
            hint="Set TELEGRAM_CHAT_ID and/or TELEGRAM_OPERATOR_CHAT_IDS",
        )
        raise SystemExit(2)

    bot = Bot(
        raw_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher()
    redis_client = aioredis.from_url(settings.redis_url, decode_responses=False)
    try:
        dp.include_router(
            handlers.build_router(
                allowed_chat_ids=frozenset(operators),
                redis_client=redis_client,
            )
        )
        asyncio.create_task(_system_worker_started_notify())
        await asyncio.gather(
            dp.start_polling(bot),
            _notify_consumer_loop(bot, redis_client, settings, operators),
        )
    finally:
        await redis_client.aclose()
        await bot.session.close()
