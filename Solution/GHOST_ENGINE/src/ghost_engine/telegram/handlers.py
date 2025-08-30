"""Telegram commands and callbacks (operator whitelist)."""

from __future__ import annotations

import os

import redis.asyncio as aioredis
from aiogram import F, Router
from aiogram.filters import CommandStart
from aiogram.types import CallbackQuery, Message

from ghost_engine.notify.operator_commands import enqueue_operator_command, load_operator_card_context
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


def build_router(
    *,
    allowed_chat_ids: frozenset[int],
    redis_client: aioredis.Redis | None = None,
) -> Router:
    r = Router()

    @r.message(CommandStart())
    async def on_start(message: Message) -> None:
        if message.chat.id not in allowed_chat_ids:
            log.warning("telegram.unauthorized_start", chat_id=message.chat.id)
            await message.answer("Unauthorized.")
            return
        await message.answer("GHOST Command Center online. Job batches will appear here.")

    @r.callback_query(F.data == "noop")
    async def on_noop(cb: CallbackQuery) -> None:
        if cb.message and cb.message.chat.id not in allowed_chat_ids:
            await cb.answer("Unauthorized.", show_alert=True)
            return
        await cb.answer()

    @r.callback_query(F.data.startswith("ap:") | F.data.startswith("sk:") | F.data.startswith("ed:"))
    async def on_job_action(cb: CallbackQuery) -> None:
        if cb.message is None or cb.message.chat.id not in allowed_chat_ids:
            await cb.answer("Unauthorized.", show_alert=True)
            return
        if redis_client is None:
            log.warning("telegram.callback_no_redis", data=cb.data)
            await cb.answer("Redis unavailable.", show_alert=True)
            return

        data = cb.data or ""
        if len(data) < 4 or data[2] != ":":
            await cb.answer("Bad callback.", show_alert=True)
            return
        prefix, token = data[:2], data[3:]
        chat_id = cb.message.chat.id

        ctx = await load_operator_card_context(
            redis_client, token=token, operator_chat_id=chat_id
        )
        if ctx is None:
            await cb.answer("Контекст устарел или недоступен.", show_alert=True)
            return

        site_id = ctx.get("site_id")
        job_id = ctx.get("job_id")
        idem = ctx.get("idempotency_key")
        cover = ctx.get("cover_letter")
        job_url = ctx.get("job_public_url")
        raw_strat = ctx.get("apply_strategy")
        if raw_strat in ("dom_first", "url_only"):
            eff_strat: str = raw_strat
        elif raw_strat == "auto" or raw_strat is None:
            ju = job_url if isinstance(job_url, str) else ""
            eff_strat = "dom_first" if ju.strip().lower().startswith("http") else "url_only"
        else:
            eff_strat = "url_only"

        if prefix == "ap":
            await enqueue_operator_command(
                redis_client,
                {
                    "action": "save_job",
                    "site_id": site_id,
                    "job_id": job_id,
                    "idempotency_key": idem,
                    "source": "telegram",
                    **(
                        {"job_public_url": job_url.strip()}
                        if isinstance(job_url, str) and job_url.strip()
                        else {}
                    ),
                },
            )
            ep = ctx.get("estimated_price_usd")
            bid_s = ""
            if isinstance(ep, (int, float)) and ep > 0:
                v = float(ep)
                bid_s = str(int(v)) if v == int(v) else f"{v:.2f}".rstrip("0").rstrip(".")
            eth = ctx.get("estimated_time_hours")
            dur_s = (os.environ.get("GHOST_APPLY_DURATION_LABEL") or "").strip()
            if not dur_s and isinstance(eth, (int, float)) and eth > 0:
                dur_s = f"{max(1, int(round(float(eth))))} hours"
            cmd: dict = {
                "action": "apply",
                "site_id": site_id,
                "job_id": job_id,
                "cover_letter": cover,
                "idempotency_key": idem,
                "source": "telegram",
                "apply_strategy": eff_strat,
            }
            if isinstance(job_url, str) and job_url.strip():
                cmd["job_public_url"] = job_url.strip()
            if bid_s:
                cmd["proposal_bid"] = bid_s
            if dur_s:
                cmd["proposal_duration"] = dur_s
            await enqueue_operator_command(redis_client, cmd)
            await cb.answer("Команда ОТПРАВИТЬ записана в Redis.")
            log.info(
                "telegram.apply_command",
                chat_id=chat_id,
                site_id=site_id,
                job_id=job_id,
            )
            return

        if prefix == "sk":
            await enqueue_operator_command(
                redis_client,
                {
                    "action": "unsave_job",
                    "site_id": site_id,
                    "job_id": job_id,
                    "idempotency_key": idem,
                    "source": "telegram",
                    **(
                        {"job_public_url": job_url.strip()}
                        if isinstance(job_url, str) and job_url.strip()
                        else {}
                    ),
                },
            )
            await enqueue_operator_command(
                redis_client,
                {
                    "action": "skip",
                    "site_id": site_id,
                    "job_id": job_id,
                    "idempotency_key": idem,
                    "source": "telegram",
                },
            )
            await cb.answer("Пропущено.")
            log.info("telegram.skip_command", chat_id=chat_id, site_id=site_id, job_id=job_id)
            return

        # ed — MVP: no FSM; operator copies text from the message
        await cb.answer(
            "Правка вручную: скопируйте текст отклика из сообщения выше и вставьте на сайте. "
            "Полноценный сценарий правки в боте — позже.",
            show_alert=True,
        )
        log.info("telegram.edit_hint", chat_id=chat_id, site_id=site_id, job_id=job_id)

    return r
