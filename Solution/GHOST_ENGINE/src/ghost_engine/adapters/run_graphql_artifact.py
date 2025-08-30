"""Optional full GraphQL JSONL per ``GHOST_RUN_ID`` under ``logs/runs/<id>/``."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

_REPO_ROOT = Path(__file__).resolve().parents[3]
_BYTES: dict[str, int] = {}
_WARNED_CAP: set[str] = set()


def _run_artifacts_enabled() -> bool:
    return os.environ.get("GHOST_RUN_ARTIFACTS", "").strip().lower() in ("1", "true", "yes")


def _max_bytes() -> int:
    try:
        mb = float(os.environ.get("GHOST_RUN_ARTIFACTS_MAX_MB", "256"))
    except ValueError:
        mb = 256.0
    return max(1, int(mb * 1024 * 1024))


def _run_dir() -> Path | None:
    rid = (os.environ.get("GHOST_RUN_ID") or "").strip()
    if not rid:
        return None
    d = _REPO_ROOT / "logs" / "runs" / rid
    return d


def append_graphql_payload_sync(
    payload: dict[str, Any],
    *,
    url: str,
    channel: str,
) -> None:
    if not _run_artifacts_enabled():
        return
    run_dir = _run_dir()
    if run_dir is None:
        return
    cap = _max_bytes()
    key = str(run_dir)
    line_obj = {
        "ts": time.time(),
        "channel": channel,
        "url": url[:800],
        "body": payload,
    }
    line = json.dumps(line_obj, ensure_ascii=False) + "\n"
    enc = line.encode("utf-8")
    prev = _BYTES.get(key, 0)
    if prev + len(enc) > cap:
        if key not in _WARNED_CAP:
            _WARNED_CAP.add(key)
            log.warning(
                "run_artifacts.cap_reached",
                run_dir=str(run_dir),
                max_mb=cap // (1024 * 1024),
                hint="Raise GHOST_RUN_ARTIFACTS_MAX_MB or disable GHOST_RUN_ARTIFACTS",
            )
        return
    run_dir.mkdir(parents=True, exist_ok=True)
    path = run_dir / "graphql.jsonl"
    with path.open("a", encoding="utf-8") as f:
        f.write(line)
    _BYTES[key] = prev + len(enc)
