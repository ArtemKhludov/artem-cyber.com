"""Lightweight dispatch outcome counters (in-process; structlog for log aggregation)."""

from __future__ import annotations

import json
import os
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from typing import Any

from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

_lock = Lock()
_dispatch_outcomes: Counter[str] = Counter()


def _operator_action_jsonl_enabled() -> bool:
    return os.environ.get("GHOST_OPERATOR_ACTION_JSONL", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def _operator_action_jsonl_path() -> Path:
    raw = os.environ.get("GHOST_OPERATOR_ACTION_LOG", "").strip()
    if raw:
        return Path(raw)
    root = Path(__file__).resolve().parents[3]
    return root / "logs" / "operator_actions.jsonl"


def append_operator_action_jsonl(record: dict[str, Any]) -> None:
    """
    Append one JSON object per line (fix_1 §11). Disable with GHOST_OPERATOR_ACTION_JSONL=0.

    Default path: ``<repo>/logs/operator_actions.jsonl`` (usually gitignored).
    """
    if not _operator_action_jsonl_enabled():
        return
    path = _operator_action_jsonl_path()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        row = {
            "timestamp": datetime.now(UTC).isoformat(),
            **record,
        }
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    except OSError as exc:
        log.warning("operator.action_jsonl_write_failed", path=str(path), error=str(exc))


def record_operator_dispatch_outcome(label: str, **extra: Any) -> None:
    """Increment counter, structlog metric, and optional JSONL audit line (fix_1 §11)."""
    key = label.strip() if isinstance(label, str) else "unknown"
    if not key:
        key = "unknown"
    with _lock:
        _dispatch_outcomes[key] += 1
        n = _dispatch_outcomes[key]
    log.info("operator.dispatch_metric", outcome=key, count_total=n)
    append_operator_action_jsonl({"status": key, **extra})


def snapshot_operator_dispatch_outcomes() -> dict[str, int]:
    """Return a copy of counters (tests / debug)."""
    with _lock:
        return dict(_dispatch_outcomes)
