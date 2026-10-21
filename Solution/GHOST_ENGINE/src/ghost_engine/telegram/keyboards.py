"""Inline keyboards for operator actions (apply / skip / edit)."""

from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup


def job_action_keyboard(action_token: str) -> InlineKeyboardMarkup:
    """
    Short callback_data: ``ap:`` / ``sk:`` / ``ed:`` + 16-char hex (under Telegram 64-byte limit).
    """
    t = action_token.lower()
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="✅ SEND", callback_data=f"ap:{t}"),
                InlineKeyboardButton(text="❌ SKIP", callback_data=f"sk:{t}"),
            ],
            [
                InlineKeyboardButton(text="📝 EDIT", callback_data=f"ed:{t}"),
            ],
        ]
    )


def placeholder_ack_keyboard() -> InlineKeyboardMarkup:
    """Minimal inline row so callback wiring exists without secret-bearing data."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="—", callback_data="noop")],
        ]
    )
