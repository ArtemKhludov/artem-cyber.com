"""Append-only JSONL audit for L0 drops (lightweight vs full job JSON dumps).

Canonical queryable outcomes for scoring live in PostgreSQL ``job_scoring_events`` (see
``ghost_engine.db.job_scoring_repository``); this file remains a disk audit trail.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

from ghost_engine.adapters.graphql_payload_storage import _sanitize_site_id
from ghost_engine.utils.data_layout import data_archive_day_str
from ghost_engine.utils.sanitizer import TextSanitizer

REASON_INSUFFICIENT_SIGNAL = "INSUFFICIENT_SIGNAL"


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def build_trash_record(
    sig: Mapping[str, Any],
    site_id: str,
    reason_code: str,
    *,
    detail: str = "",
    run_id: str | None = None,
) -> dict[str, Any]:
    """Sanitize title (Layer 1) before persisting to disk."""
    title_raw = sig.get("title")
    title_clean = TextSanitizer(max_chars=500).sanitize(
        str(title_raw) if title_raw is not None else ""
    ).sanitized_text
    bv = sig.get("budget_value")
    try:
        budget = float(bv) if bv is not None else None
    except (TypeError, ValueError):
        budget = None
    out: dict[str, Any] = {
        "time": datetime.now(timezone.utc).isoformat(),
        "site_id": _sanitize_site_id(site_id),
        "job_id": sig.get("job_id"),
        "reason_code": reason_code,
        "title": title_clean or None,
        "budget": budget,
        "detail": (detail or "")[:400],
    }
    rid = (run_id or "").strip()
    if rid:
        out["run_id"] = rid[:64]
    return out


def append_trash_entry(
    site_id: str,
    record: Mapping[str, Any],
    *,
    root: Path | None = None,
) -> None:
    """
    Append one JSON line under ``data/<site_id>/trash/<YYYY-MM-DD>/events.jsonl``.

    Mirrors ``data/<site_id>/jobs/<date>/`` layout (same day policy as jobs; UTC unless ``GHOST_USE_LOCAL_TIME``).

    ``root`` is for tests (temporary project root); production uses repo root.
    """
    base = root if root is not None else _repo_root()
    sid = _sanitize_site_id(site_id)
    day = data_archive_day_str()
    day_dir = base / "data" / sid / "trash" / day
    day_dir.mkdir(parents=True, exist_ok=True)
    path = day_dir / "events.jsonl"
    line = json.dumps(dict(record), ensure_ascii=False) + "\n"
    with path.open("a", encoding="utf-8") as f:
        f.write(line)
