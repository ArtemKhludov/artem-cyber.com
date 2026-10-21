"""Shared GraphQL HTTP + WebSocket listeners for all site adapters (УЗЕЛ 0)."""

from __future__ import annotations

import asyncio
import json
import os
import random
import time
from collections import deque
from collections.abc import Awaitable, Callable, Sequence
from pathlib import Path
from typing import Any

from playwright.async_api import Page, WebSocket

from ghost_engine.adapters.graphql_raw_storage import capture_raw_graphql_response
from ghost_engine.adapters.run_graphql_artifact import append_graphql_payload_sync
from ghost_engine.config.settings import get_settings
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

_BODY_PREVIEW_LEN = 500
_WS_FRAME_PREVIEW = 320

SaveToDiscCallback = Callable[[dict[str, Any]], Awaitable[None]]


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _graphql_analytics_enabled() -> bool:
    return os.environ.get("GHOST_GRAPHQL_ANALYTICS", "").strip().lower() in ("1", "true", "yes")


def _graphql_analytics_file_path() -> Path | None:
    """
    When GHOST_GRAPHQL_ANALYTICS=1, append compact JSON lines here for offline analysis.

    Override with GHOST_GRAPHQL_ANALYTICS_FILE (absolute or relative to repo root).
    """
    if not _graphql_analytics_enabled():
        return None
    raw = (os.environ.get("GHOST_GRAPHQL_ANALYTICS_FILE") or "").strip()
    root = _repo_root()
    if raw:
        p = Path(raw)
        return p if p.is_absolute() else (root / p)
    return root / "logs" / "graphql_analytics.jsonl"


def _append_analytics_line(path: Path, record: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(record, ensure_ascii=False) + "\n"
    with path.open("a", encoding="utf-8") as f:
        f.write(line)


async def _save_payload_with_log(
    persist: SaveToDiscCallback,
    payload: dict[str, Any],
    *,
    prefix: str,
    site_id: str,
    url: str,
) -> None:
    try:
        await persist(payload)
    except Exception as exc:  # noqa: BLE001
        log.warning(
            f"{prefix}.save_to_disc_failed",
            site_id=site_id,
            url=url,
            error=str(exc),
        )


def _url_matches(url: str, jobs_graphql_url: str) -> bool:
    return (bool(jobs_graphql_url) and jobs_graphql_url in url) or (
        "graphql" in url.lower()
    )


def _sniff_config() -> tuple[float, int, int]:
    raw = get_settings().base_config.get("graphql_sniff")
    cfg = raw if isinstance(raw, dict) else {}
    try:
        rate = float(cfg.get("log_sample_rate", 1.0))
    except (TypeError, ValueError):
        rate = 1.0
    env_rate = (os.environ.get("GHOST_GRAPHQL_LOG_SAMPLE_RATE") or "").strip()
    if env_rate:
        try:
            rate = float(env_rate)
        except ValueError:
            pass
    rate = max(0.0, min(1.0, rate))
    if _graphql_analytics_enabled():
        rate = 1.0
    try:
        max_conc = int(cfg.get("persist_max_concurrent", 3))
    except (TypeError, ValueError):
        max_conc = 3
    max_conc = max(1, min(32, max_conc))
    try:
        min_interval_ms = int(cfg.get("persist_min_interval_ms", 0))
    except (TypeError, ValueError):
        min_interval_ms = 0
    min_interval_ms = max(0, min_interval_ms)
    return rate, max_conc, min_interval_ms


def attach_graphql_sniffers(
    page: Page,
    *,
    site_id: str,
    jobs_graphql_url: str,
    snippets: deque[dict[str, Any]],
    log_prefix: str | None = None,
    save_to_disc_callbacks: Sequence[SaveToDiscCallback] = (),
) -> None:
    """
    Register `response` and `websocket` handlers matching GraphQL traffic.

    log_prefix: event name prefix (e.g. ``upwork`` for backward-compatible logs).
    If None, uses ``site_id`` (e.g. ``arc_dev``, ``contra``).
    save_to_disc_callbacks: optional async callables ``(payload: dict) -> None``
    invoked after a successful GraphQL JSON dict parse.
    """
    prefix = (log_prefix or site_id).strip() or "site"
    log_sample_rate, persist_max_concurrent, persist_min_interval_ms = _sniff_config()
    analytics_path = _graphql_analytics_file_path()
    persist_sem = asyncio.Semaphore(persist_max_concurrent)
    last_persist_mono: dict[str, float] = {}

    if _graphql_analytics_enabled():
        log.info(
            f"{prefix}.graphql_analytics_mode",
            site_id=site_id,
            log_sample_rate_effective=log_sample_rate,
            analytics_file=str(analytics_path) if analytics_path else None,
            hint="INFO logs for every matched GraphQL response; JSONL for aggregation",
        )

    def _verbose_log() -> bool:
        if _graphql_analytics_enabled():
            return True
        return random.random() < log_sample_rate

    async def _persist_guarded(
        persist: SaveToDiscCallback,
        payload: dict[str, Any],
        *,
        url: str,
    ) -> None:
        sid = site_id.strip() or "unknown"
        if persist_min_interval_ms > 0:
            now = time.monotonic()
            gap = persist_min_interval_ms / 1000.0
            prev = last_persist_mono.get(sid, 0.0)
            if now - prev < gap:
                log.warning(
                    f"{prefix}.persist_throttled",
                    site_id=sid,
                    min_interval_ms=persist_min_interval_ms,
                )
                return
            last_persist_mono[sid] = now
        async with persist_sem:
            await _save_payload_with_log(
                persist, payload, prefix=prefix, site_id=sid, url=url
            )

    async def on_response(response) -> None:
        url = response.url
        if not _url_matches(url, jobs_graphql_url):
            return
        line_verbose = _verbose_log()
        log_fn = log.info if line_verbose else log.debug
        log_fn(
            f"{prefix}.graphql_response",
            site_id=site_id,
            url=url,
            status=response.status,
        )
        try:
            text = await response.text()
            preview = text[:_BODY_PREVIEW_LEN] + (
                "..." if len(text) > _BODY_PREVIEW_LEN else ""
            )
            log_fn(
                f"{prefix}.graphql_body_preview",
                site_id=site_id,
                preview=preview,
            )
        except Exception as exc:  # noqa: BLE001
            log.warning(f"{prefix}.graphql_body_skip", site_id=site_id, error=str(exc))
            return

        try:
            payload = json.loads(text)
        except json.JSONDecodeError as exc:
            log.warning(
                f"{prefix}.graphql_json_invalid",
                site_id=site_id,
                url=url,
                error=str(exc),
            )
        else:
            if not isinstance(payload, dict):
                log.warning(
                    f"{prefix}.graphql_json_not_dict",
                    site_id=site_id,
                    url=url,
                    type_name=type(payload).__name__,
                )
            else:
                top_keys = list(payload.keys())[:16]
                data_obj = payload.get("data")
                data_field_keys: list[str] = []
                if isinstance(data_obj, dict):
                    data_field_keys = [str(k) for k in list(data_obj.keys())[:32]]
                log_fn(
                    f"{prefix}.graphql_json_ok",
                    site_id=site_id,
                    url=url,
                    top_keys=top_keys,
                    data_field_keys=data_field_keys,
                    has_errors="errors" in payload,
                )
                snippets.append(
                    {
                        "url": url,
                        "status": response.status,
                        "top_keys": top_keys,
                        "data_field_keys": data_field_keys,
                    }
                )

                if analytics_path is not None:
                    rec_http = {
                        "ts": time.time(),
                        "channel": "http",
                        "site_id": site_id,
                        "prefix": prefix,
                        "url": url[:500],
                        "status": response.status,
                        "data_field_keys": data_field_keys,
                        "top_keys": top_keys,
                        "body_chars": len(text),
                        "has_errors": "errors" in payload,
                    }
                    await asyncio.to_thread(_append_analytics_line, analytics_path, rec_http)

                await asyncio.to_thread(
                    append_graphql_payload_sync, payload, url=url, channel="http"
                )
                await asyncio.to_thread(
                    capture_raw_graphql_response,
                    site_id,
                    payload,
                    channel="http",
                    url=url,
                    http_status=response.status,
                )

                for persist in save_to_disc_callbacks:
                    await _persist_guarded(persist, payload, url=url)

    def on_websocket(ws: WebSocket) -> None:
        url = ws.url
        if not _url_matches(url, jobs_graphql_url):
            log.debug(f"{prefix}.websocket", site_id=site_id, url=url)
            return

        (log.info if _verbose_log() else log.debug)(
            f"{prefix}.graphql_websocket",
            site_id=site_id,
            url=url,
        )

        def on_frame(payload: bytes | str) -> None:
            if isinstance(payload, bytes):
                text = payload.decode("utf-8", errors="replace")
            else:
                text = payload
            preview = text[:_WS_FRAME_PREVIEW] + (
                "..." if len(text) > _WS_FRAME_PREVIEW else ""
            )
            ws_log = log.info if _verbose_log() else log.debug
            ws_log(
                f"{prefix}.graphql_ws_frame",
                site_id=site_id,
                url=url,
                preview=preview,
                byte_len=len(text.encode("utf-8", errors="replace")),
            )
            try:
                obj = json.loads(text)
            except json.JSONDecodeError:
                return
            if isinstance(obj, dict):
                top_keys = list(obj.keys())[:12]
                d0 = obj.get("data")
                dfk: list[str] = []
                if isinstance(d0, dict):
                    dfk = [str(k) for k in list(d0.keys())[:32]]
                (log.info if _verbose_log() else log.debug)(
                    f"{prefix}.graphql_ws_json_ok",
                    site_id=site_id,
                    url=url,
                    top_keys=top_keys,
                    data_field_keys=dfk,
                    has_errors="errors" in obj,
                )
                try:
                    loop = asyncio.get_running_loop()
                except RuntimeError:
                    log.warning(
                        f"{prefix}.save_to_disc_no_event_loop",
                        site_id=site_id,
                        url=url,
                    )
                else:
                    if analytics_path is not None:
                        rec_ws = {
                            "ts": time.time(),
                            "channel": "websocket",
                            "site_id": site_id,
                            "prefix": prefix,
                            "url": url[:500],
                            "status": None,
                            "data_field_keys": dfk,
                            "top_keys": top_keys,
                            "body_chars": len(text),
                            "has_errors": "errors" in obj,
                        }
                        loop.create_task(
                            asyncio.to_thread(_append_analytics_line, analytics_path, rec_ws)
                        )
                    loop.create_task(
                        asyncio.to_thread(append_graphql_payload_sync, obj, url=url, channel="ws")
                    )
                    loop.create_task(
                        asyncio.to_thread(
                            capture_raw_graphql_response,
                            site_id,
                            obj,
                            channel="websocket",
                            url=url,
                            http_status=None,
                        )
                    )
                    for persist in save_to_disc_callbacks:
                        loop.create_task(_persist_guarded(persist, obj, url=url))

        ws.on("framereceived", on_frame)

    page.on("response", on_response)
    page.on("websocket", on_websocket)
