"""aiogram application factory (Command Center)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from ghost_engine.telegram import handlers

if TYPE_CHECKING:
    import redis.asyncio as aioredis


def create_bot_application(
    token: str,
    *,
    allowed_chat_ids: frozenset[int],
    redis_client: aioredis.Redis | None = None,
) -> tuple[Bot, Dispatcher]:
    """Return configured Bot + Dispatcher (polling started separately via worker)."""
    bot = Bot(
        token.strip(),
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher()
    dp.include_router(
        handlers.build_router(allowed_chat_ids=allowed_chat_ids, redis_client=redis_client)
    )
    return bot, dp
