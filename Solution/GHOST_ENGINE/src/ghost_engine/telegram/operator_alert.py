"""Direct Telegram Bot API alerts from browser / adapter process (no Redis worker)."""

from __future__ import annotations

import os

import httpx

from ghost_engine.config.settings import get_settings
from ghost_engine.config.telegram_routing import load_telegram_routing
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

TELEGRAM_CAPTION_MAX: int = 1024
TELEGRAM_MESSAGE_MAX: int = 4096


def format_captcha_alert_caption(*, site_id: str) -> str:
    greeting = os.getenv("GHOST_CAPTCHA_ALERT_GREETING", "Operator").strip() or "Operator"
    base = get_settings().base_config
    tg = base.get("telegram") if isinstance(base.get("telegram"), dict) else {}
    tpl = tg.get("captcha_alert_template")
    if isinstance(tpl, str) and tpl.strip():
        try:
            return tpl.format(greeting=greeting, site_id=site_id)
        except (KeyError, ValueError) as exc:
            log.warning("operator_alert.template_format_failed", error=str(exc))
    return (
        f'{greeting}, captcha detected on site "{site_id}". '
        "Please solve in the browser or connect a solver (2Captcha/CapMonster). "
        "Session is paused to avoid blind login clicks."
    )


async def send_operator_photo_alert(
    *,
    photo_png: bytes,
    caption: str,
    ops_topic: str = "captcha",
) -> None:
    """
    Send captcha (or other ops) screenshot using ``telegram_routing.yaml`` → ``ops`` when set,
    else ``TELEGRAM_OPERATOR_CHAT_IDS`` (no topic).
    """
    settings = get_settings()
    token = settings.telegram_bot_token
    secret = token.get_secret_value().strip() if token else ""
    if not secret:
        log.warning("operator_alert.no_token", hint="Set TELEGRAM_BOT_TOKEN")
        return
    fallback = settings.telegram_operator_chat_ids
    if not fallback:
        log.warning("operator_alert.no_operators", hint="Set TELEGRAM_CHAT_ID / TELEGRAM_OPERATOR_CHAT_IDS")
        return

    routing = load_telegram_routing(settings.config_dir)
    targets = routing.ops_targets(ops_topic, fallback)

    cap = caption[:TELEGRAM_CAPTION_MAX]
    url = f"https://api.telegram.org/bot{secret}/sendPhoto"
    async with httpx.AsyncClient(timeout=60.0) as client:
        for t in targets:
            data: dict[str, str | int] = {"chat_id": t.chat_id, "caption": cap}
            if t.message_thread_id is not None:
                data["message_thread_id"] = t.message_thread_id
            try:
                resp = await client.post(
                    url,
                    data=data,
                    files={"photo": ("captcha.png", photo_png, "image/png")},
                )
                if resp.status_code >= 400:
                    log.warning(
                        "operator_alert.send_failed",
                        chat_id=t.chat_id,
                        message_thread_id=t.message_thread_id,
                        status=resp.status_code,
                        body=resp.text[:500],
                    )
                else:
                    log.info(
                        "operator_alert.sent",
                        chat_id=t.chat_id,
                        message_thread_id=t.message_thread_id,
                    )
            except Exception as exc:
                log.warning(
                    "operator_alert.send_exception",
                    chat_id=t.chat_id,
                    error=str(exc),
                )


async def send_operator_text_alert(
    *,
    text: str,
    ops_topic: str = "captcha",
) -> None:
    """
    Same routing as ``send_operator_photo_alert``, but ``sendMessage`` (no screenshot).
    """
    settings = get_settings()
    token = settings.telegram_bot_token
    secret = token.get_secret_value().strip() if token else ""
    if not secret:
        log.warning("operator_alert.no_token", hint="Set TELEGRAM_BOT_TOKEN")
        return
    fallback = settings.telegram_operator_chat_ids
    if not fallback:
        log.warning("operator_alert.no_operators", hint="Set TELEGRAM_CHAT_ID / TELEGRAM_OPERATOR_CHAT_IDS")
        return

    routing = load_telegram_routing(settings.config_dir)
    targets = routing.ops_targets(ops_topic, fallback)

    body = text[:TELEGRAM_MESSAGE_MAX]
    url = f"https://api.telegram.org/bot{secret}/sendMessage"
    async with httpx.AsyncClient(timeout=60.0) as client:
        for t in targets:
            data: dict[str, str | int] = {"chat_id": t.chat_id, "text": body}
            if t.message_thread_id is not None:
                data["message_thread_id"] = t.message_thread_id
            try:
                resp = await client.post(url, data=data)
                if resp.status_code >= 400:
                    log.warning(
                        "operator_alert.text_send_failed",
                        chat_id=t.chat_id,
                        message_thread_id=t.message_thread_id,
                        status=resp.status_code,
                        body=resp.text[:500],
                    )
                else:
                    log.info(
                        "operator_alert.text_sent",
                        chat_id=t.chat_id,
                        message_thread_id=t.message_thread_id,
                    )
            except Exception as exc:
                log.warning(
                    "operator_alert.text_send_exception",
                    chat_id=t.chat_id,
                    error=str(exc),
                )


async def send_ops_system_line(text: str) -> None:
    """Post to ``ops.topics.system`` (worker boot, health, deploy hooks)."""
    await send_operator_text_alert(text=text, ops_topic="system")


async def send_ops_errors_line(text: str) -> None:
    """Post to ``ops.topics.errors`` (worker/API failures mirrored from hot paths)."""
    await send_operator_text_alert(text=text, ops_topic="errors")


async def send_operator_alert(text: str, *, ops_topic: str = "errors") -> None:
    """Alias for Markdown-style diagnostics (legacy callers); routes to ops forum topic."""
    await send_operator_text_alert(text=text, ops_topic=ops_topic)
