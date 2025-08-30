"""
One-shot Bot API sends to verify forum topics (telegram_routing.yaml).

Exercises: Upwork ``topic_jobs``, ``chat_client`` (Upwork negotiation topic if configured),
ops ``captcha`` / ``errors`` / ``system``.

Run: uv run python -m ghost_engine.main telegram-ping
"""

from __future__ import annotations

import logging
import sys
from typing import Any

import httpx

from ghost_engine.config.settings import get_settings
from ghost_engine.config.telegram_routing import DeliveryTarget, load_telegram_routing
from ghost_engine.utils.logger import configure_logging, get_logger

log = get_logger(__name__)

_API = "https://api.telegram.org/bot{token}/sendMessage"


async def _send_one(
    client: httpx.AsyncClient,
    *,
    token: str,
    chat_id: int,
    message_thread_id: int | None,
    text: str,
) -> tuple[bool, str]:
    payload: dict[str, Any] = {"chat_id": chat_id, "text": text}
    if message_thread_id is not None:
        payload["message_thread_id"] = message_thread_id
    url = _API.format(token=token)
    try:
        r = await client.post(url, json=payload, timeout=30.0)
        body = r.text[:500]
        if r.status_code >= 400:
            return False, f"HTTP {r.status_code}: {body}"
        return True, body
    except Exception as exc:
        return False, str(exc)


async def run_telegram_routing_ping() -> int:
    settings = get_settings()
    configure_logging(settings.log_level)
    # Bot token is in the request URL; keep httpx/httpcore quiet.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    tok = settings.telegram_bot_token
    secret = tok.get_secret_value().strip() if tok else ""
    if not secret:
        log.error("telegram_ping.no_token", hint="Set TELEGRAM_BOT_TOKEN in .env")
        return 2

    routing = load_telegram_routing(settings.config_dir)

    targets: list[tuple[str, DeliveryTarget]] = []
    for dt in routing.jobs_targets_for_site("upwork", []):
        targets.append(("Upwork «Вакансии» (sites.upwork.topic_jobs)", dt))
    for dt in routing.chat_client_targets_for_site("upwork"):
        targets.append(("Upwork «Client / Negotiation» (chat_client.topics.upwork)", dt))
    for key, label in (
        ("captcha", "Операции / captcha (ops.topics.captcha)"),
        ("errors", "Операции / errors (ops.topics.errors)"),
        ("system", "Операции / system (ops.topics.system)"),
    ):
        for dt in routing.ops_targets(key, []):
            targets.append((label, dt))

    if not targets:
        log.error(
            "telegram_ping.no_routing",
            hint="Fill config/telegram_routing.yaml (ops + sites.upwork) or copy from .example",
        )
        return 3

    ok_all = True
    async with httpx.AsyncClient() as client:
        for label, t in targets:
            text = (
                f"GHOST_ENGINE routing ping\n"
                f"Target: {label}\n"
                f"chat_id={t.chat_id} message_thread_id={t.message_thread_id}"
            )
            ok, detail = await _send_one(
                client,
                token=secret,
                chat_id=t.chat_id,
                message_thread_id=t.message_thread_id,
                text=text,
            )
            if ok:
                log.info("telegram_ping.sent", target=label, chat_id=t.chat_id, thread=t.message_thread_id)
                print(f"OK  {label}", file=sys.stderr)
            else:
                ok_all = False
                log.warning("telegram_ping.failed", target=label, detail=detail)
                print(f"FAIL {label}: {detail}", file=sys.stderr)

    return 0 if ok_all else 1
