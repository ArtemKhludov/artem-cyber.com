"""Append-only audit log for jobs auto-saved (heart) from the find-work feed."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def append_upwork_feed_liked(
    *,
    ciphertext_core: str,
    gri: float,
    title: str | None = None,
    extra: dict[str, Any] | None = None,
) -> Path:
    """
    Write one JSON line under ``data/upwork/liked/YYYY-MM-DD.jsonl``.

    Thread-safe enough for single-process browser; use ``asyncio.to_thread`` from async callers.
    """
    day = datetime.now(UTC).strftime("%Y-%m-%d")
    out_dir = repo_root() / "data" / "upwork" / "liked"
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{day}.jsonl"
    row: dict[str, Any] = {
        "time": datetime.now(UTC).isoformat(),
        "site_id": "upwork",
        "ciphertext_core": ciphertext_core.strip().lstrip("~"),
        "gri": round(float(gri), 6),
    }
    if title:
        row["title"] = title[:500]
    if extra:
        row.update(extra)
    line = json.dumps(row, ensure_ascii=False) + "\n"
    with path.open("a", encoding="utf-8") as f:
        f.write(line)
    return path
