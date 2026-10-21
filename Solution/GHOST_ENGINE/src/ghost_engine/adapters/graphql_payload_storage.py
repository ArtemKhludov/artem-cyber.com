"""Persist sniffed GraphQL JSON under data/<site_id>/jobs/<date>/ (shared by all adapters).

After L0 pass, payloads land here as full JSON files. Queryable scoring outcomes (outcome,
GRI, notify path) are recorded in PostgreSQL ``job_scoring_events`` when
``GHOST_DB_SCORING_REGISTRY`` is enabled; use the same retention policy as DB rows or
``GHOST_DATA_JOBS_RETENTION_DAYS`` for file cleanup. Ephemeral full sniff dumps live under
``data/<site>/graphql_raw/`` (``graphql_sniff.raw_capture``; ``GHOST_DATA_GRAPHQL_RAW_RETENTION_DAYS`` in db-cleanup).
"""

from __future__ import annotations

import asyncio
import json
import re
import uuid
from pathlib import Path
from typing import Any, Mapping

from ghost_engine.utils.data_layout import data_archive_day_str, data_archive_time_prefix

_SAFE_SITE_ID = re.compile(r"^[a-z0-9_]{1,64}$")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _sanitize_site_id(site_id: str) -> str:
    s = (site_id or "unknown").strip().lower()
    if _SAFE_SITE_ID.match(s):
        return s
    return "unknown"


def _write_json_sync(target_dir: Path, file_name: str, text: str) -> None:
    target_dir.mkdir(parents=True, exist_ok=True)
    (target_dir / file_name).write_text(text, encoding="utf-8")


async def save_graphql_payload_async(site_id: str, data: Mapping[str, Any]) -> str:
    """
    Write one JSON payload; CPU-bound serialization and IO in a thread.

    Returns repo-relative POSIX path (for ``job_scoring_events.artifact_relpath``).
    Full dumps are optional TTL on disk; canonical outcomes live in PostgreSQL.
    """
    sid = _sanitize_site_id(site_id)
    date = data_archive_day_str()
    time_prefix = data_archive_time_prefix()
    target_dir = _repo_root() / "data" / sid / "jobs" / date
    file_name = f"{time_prefix}-{uuid.uuid4()}.json"
    json_text = json.dumps(data, indent=4, ensure_ascii=False)
    await asyncio.to_thread(_write_json_sync, target_dir, file_name, json_text)
    return f"data/{sid}/jobs/{date}/{file_name}"
