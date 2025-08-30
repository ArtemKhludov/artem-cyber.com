"""
Application entrypoint. Keep the event loop non-blocking: no sync I/O on hot paths.

Modes:
  default / idle   — placeholder boot (browser uses dev_session entrypoint).
  telegram-bot     — Command Center: aiogram polling + Redis notify consumer.
  emergency-agent  — Self-healing: watches Redis for UI failures and fixes them using LLM.
  telegram-ping    — one-shot sendMessage to each routed forum topic (verify routing).
  notify-ping      — RPUSH one synthetic job notify to Redis (needs worker: telegram-bot).
  health           — print Redis + Ollama reachability (exit 1 if Redis down).
"""

from __future__ import annotations

import asyncio
import os
import sys

from ghost_engine.config.settings import get_settings
from ghost_engine.utils.logger import configure_logging, get_logger

log = get_logger(__name__)


def _resolve_mode(argv: list[str]) -> str:
    if len(argv) > 1:
        return argv[1].strip().lower()
    return (os.environ.get("GHOST_ENGINE_MODE") or "idle").strip().lower()


async def _main_idle() -> None:
    settings = get_settings()
    configure_logging(settings.log_level)
    log.info("ghost_engine.boot", env=settings.app_env, ollama=settings.ollama_host, mode="idle")
    # Browser: `python -m ghost_engine.browser.dev_session`. Telegram: mode=telegram-bot.
    await asyncio.sleep(0)


async def _main_telegram_bot() -> None:
    from ghost_engine.telegram.worker import run_command_center

    await run_command_center()


async def _main_telegram_ping() -> None:
    from ghost_engine.telegram.routing_ping import run_telegram_routing_ping

    code = await run_telegram_routing_ping()
    raise SystemExit(code)


def _main_notify_ping() -> None:
    from ghost_engine.notify.notify_ping import run_notify_queue_ping

    raise SystemExit(run_notify_queue_ping())


async def _main_health() -> None:
    from ghost_engine.config.settings import get_settings
    from ghost_engine.core.healthcheck import check_ollama, check_redis
    from ghost_engine.utils.logger import configure_logging

    settings = get_settings()
    configure_logging(settings.log_level)
    ok_r = await check_redis()
    ok_o = await check_ollama()
    print(f"redis={ok_r} ollama={ok_o}")
    if os.getenv("GHOST_HEALTH_NOTIFY_SYSTEM", "").strip().lower() in ("1", "true", "yes"):
        try:
            from ghost_engine.telegram.operator_alert import send_ops_system_line

            await send_ops_system_line(f"GHOST health check: redis={ok_r} ollama={ok_o}")
        except Exception as exc:
            log.warning("health.system_notify_failed", error=str(exc))
    raise SystemExit(0 if ok_r else 1)


async def _main_emergency_agent() -> None:
    from ghost_engine.agents.emergency_agent import run_agent

    await run_agent()


def run() -> None:
    mode = _resolve_mode(sys.argv)
    try:
        if mode in ("telegram-bot", "telegram", "tg"):
            asyncio.run(_main_telegram_bot())
        elif mode in ("emergency-agent", "emergency"):
            asyncio.run(_main_emergency_agent())
        elif mode in ("telegram-ping", "tg-ping", "telegram-test"):
            asyncio.run(_main_telegram_ping())
        elif mode in ("notify-ping", "redis-notify-ping"):
            _main_notify_ping()
        elif mode in ("health", "deps"):
            asyncio.run(_main_health())
        else:
            asyncio.run(_main_idle())
    except KeyboardInterrupt:
        sys.exit(130)


if __name__ == "__main__":
    run()
