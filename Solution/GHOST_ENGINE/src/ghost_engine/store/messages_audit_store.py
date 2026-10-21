"""SQLite audit trail for Messages domain (searchable, low volume)."""

from __future__ import annotations

import asyncio
import json
import os
import sqlite3
import time
from pathlib import Path
from typing import Any

from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


def _default_db_path() -> Path:
    raw = (os.environ.get("GHOST_MESSAGES_AUDIT_DB") or "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    repo = Path(__file__).resolve().parents[3]
    return (repo / "data" / "messages" / "chats_audit.sqlite").resolve()


def _connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), timeout=30)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS messages_audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            site_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            thread_id TEXT,
            snippet TEXT,
            payload_json TEXT,
            created_at REAL NOT NULL
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_messages_audit_site_time ON messages_audit (site_id, created_at)"
    )
    conn.commit()
    return conn


def _insert_sync(
    path: Path,
    *,
    site_id: str,
    event_type: str,
    thread_id: str | None,
    snippet: str | None,
    payload: dict[str, Any] | None,
) -> None:
    conn = _connect(path)
    try:
        conn.execute(
            """
            INSERT INTO messages_audit (site_id, event_type, thread_id, snippet, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                site_id.strip().lower(),
                event_type,
                thread_id,
                (snippet or "")[:4000] or None,
                json.dumps(payload, ensure_ascii=False) if payload else None,
                time.time(),
            ),
        )
        conn.commit()
    finally:
        conn.close()


async def record_messages_audit_event(
    *,
    site_id: str,
    event_type: str,
    thread_id: str | None = None,
    snippet: str | None = None,
    payload: dict[str, Any] | None = None,
    db_path: Path | None = None,
) -> None:
    path = db_path or _default_db_path()
    try:
        await asyncio.to_thread(
            _insert_sync,
            path,
            site_id=site_id,
            event_type=event_type,
            thread_id=thread_id,
            snippet=snippet,
            payload=payload,
        )
    except Exception as exc:
        log.warning("messages_audit.insert_failed", error=str(exc), event_type=event_type)
