"""
Verbose single-run trace: DOM clicks + HTTP responses (JSON bodies when possible).

Writes ``logs/runs/<GHOST_RUN_ID>/trace.jsonl`` (NDJSON). Enable with ``GHOST_RUN_FULL_TRACE=1``.
Complements ``GHOST_RUN_ARTIFACTS`` (GraphQL-only file) — this is broader and noisier by design.
"""

from __future__ import annotations

import asyncio
import json
import os
import threading
import time
from pathlib import Path
from typing import Any

from playwright.async_api import BrowserContext, Page, Response

from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

_LOCK = threading.Lock()
_RESPONSE_SEM = asyncio.Semaphore(6)


def full_trace_enabled() -> bool:
    return os.environ.get("GHOST_RUN_FULL_TRACE", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _trace_path() -> Path | None:
    rid = (os.environ.get("GHOST_RUN_ID") or "").strip()
    if not rid:
        log.warning("run_full_trace.no_run_id", hint="Set GHOST_RUN_ID or use dev_session (sets it automatically)")
        return None
    d = _repo_root() / "logs" / "runs" / rid
    d.mkdir(parents=True, exist_ok=True)
    return d / "trace.jsonl"


def _append_record(rec: dict[str, Any]) -> None:
    path = _trace_path()
    if path is None:
        return
    line = json.dumps(rec, ensure_ascii=False, default=str) + "\n"
    with _LOCK:
        with path.open("a", encoding="utf-8") as f:
            f.write(line)


def _sync_click_callback(payload: Any) -> None:
    if not isinstance(payload, dict):
        return
    _append_record({"ts": time.time(), "kind": "dom_click", **payload})


def _should_log_response(url: str, content_type: str, status: int) -> bool:
    if status == 204 or status == 101:
        return False
    ct = content_type.lower()
    if any(x in ct for x in ("image/", "video/", "audio/", "font/", "octet-stream")):
        return False
    u = url.lower()
    if "upwork.com" in u or "graphql" in u or "api." in u:
        return True
    if "json" in ct or "javascript" in ct:
        return True
    return False


async def _log_response_body(response: Response) -> None:
    try:
        url = response.url
        status = response.status
        headers = await response.all_headers()
        ct = headers.get("content-type") or ""
        if not _should_log_response(url, ct, status):
            return
        try:
            body = await response.body()
        except Exception:
            return
        try:
            max_b = int(os.environ.get("GHOST_RUN_FULL_TRACE_MAX_RESPONSE_BYTES", "1500000"))
        except ValueError:
            max_b = 1_500_000
        max_b = max(50_000, min(max_b, 8_000_000))
        truncated = len(body) > max_b
        raw = body[:max_b]
        text = raw.decode("utf-8", errors="replace")
        parsed: dict[str, Any] | list[Any] | str | None = None
        if "json" in ct.lower() or "/graphql" in url.lower():
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                parsed = None
        _append_record(
            {
                "ts": time.time(),
                "kind": "http_response",
                "url": url[:2500],
                "status": status,
                "content_type": ct[:240],
                "body_bytes": len(body),
                "truncated": truncated,
                "json": parsed,
                "text_preview": None if parsed is not None else text[:4000],
            },
        )
    except Exception as exc:
        log.debug("run_full_trace.response_log_failed", error=str(exc))


def _wire_page_response_logger(page: Page, loop: asyncio.AbstractEventLoop) -> None:
    attr = "_ghost_full_trace_response_wired"
    if getattr(page, attr, False):
        return
    setattr(page, attr, True)

    def _schedule(resp: Response) -> None:
        try:
            loop.create_task(_response_guarded(resp))
        except RuntimeError:
            pass

    async def _response_guarded(resp: Response) -> None:
        async with _RESPONSE_SEM:
            await _log_response_body(resp)

    page.on("response", _schedule)


def _wire_page_navigation(page: Page) -> None:
    attr = "_ghost_full_trace_nav_wired"
    if getattr(page, attr, False):
        return
    setattr(page, attr, True)

    def _on_frame_nav(frame) -> None:
        try:
            if frame != page.main_frame:
                return
            u = frame.url or ""
            _append_record(
                {
                    "ts": time.time(),
                    "kind": "navigation",
                    "url": u[:2500],
                },
            )
        except Exception:
            pass

    page.on("framenavigated", _on_frame_nav)


_CLICK_INIT = """
(() => {
  if (window.__ghostFullTraceClickInstalled) return;
  window.__ghostFullTraceClickInstalled = true;
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || !t.tagName) return;
    let text = '';
    try { text = (t.innerText || '').slice(0, 220); } catch (_) {}
    const payload = {
      pageHref: (function(){ try { return String(location.href || ''); } catch(_) { return ''; } })(),
      tag: t.tagName,
      id: t.id || '',
      cls: (typeof t.className === 'string' ? t.className : '').slice(0, 280),
      name: t.getAttribute('name'),
      type: t.getAttribute('type'),
      role: t.getAttribute('role'),
      href: t.getAttribute('href'),
      dataTest: t.getAttribute('data-test') || t.getAttribute('data-testid'),
      ariaLabel: t.getAttribute('aria-label'),
      text: text,
      x: e.clientX,
      y: e.clientY,
    };
    try {
      const p = window.ghostEngineTraceClick;
      if (typeof p === 'function') {
        const r = p(payload);
        if (r && typeof r.then === 'function') r.catch(function() {});
      }
    } catch (_) {}
  }, true);
})();
"""


async def attach_full_trace_to_context(context: BrowserContext) -> None:
    if not full_trace_enabled():
        return
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        log.warning("run_full_trace.no_event_loop")
        return

    await context.expose_function("ghostEngineTraceClick", _sync_click_callback)
    await context.add_init_script(_CLICK_INIT)

    async def _on_new_page(page: Page) -> None:
        _wire_page_response_logger(page, loop)
        _wire_page_navigation(page)

    context.on("page", lambda p: loop.create_task(_on_new_page(p)))

    for p in context.pages:
        _wire_page_response_logger(p, loop)
        _wire_page_navigation(p)

    log.info(
        "run_full_trace.attached",
        trace_file=str(_trace_path() or ""),
        hint="dom_click + http_response + navigation lines in trace.jsonl",
    )
