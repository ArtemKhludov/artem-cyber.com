"""Full GraphQL response capture under data/<site_id>/graphql_raw/ (short TTL, noise archive).

Separate from data/.../jobs/ (L0-pass artifacts). Used for debugging parser coverage and DOM gaps.
"""

from __future__ import annotations

import json
import re
import threading
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Mapping

from ghost_engine.config.settings import get_settings
from ghost_engine.utils.data_layout import data_archive_day_str, data_archive_time_prefix
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

_SAFE_SITE_ID = re.compile(r"^[a-z0-9_]{1,64}$")
_last_prune_mono: float = 0.0
_prune_lock = threading.Lock()

_DEFAULT_RETENTION_DAYS = 2
_DEFAULT_PRUNE_INTERVAL_SEC = 3600


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _sanitize_site_id(site_id: str) -> str:
    s = (site_id or "unknown").strip().lower()
    if _SAFE_SITE_ID.match(s):
        return s
    return "unknown"


def _raw_config() -> tuple[bool, int, int]:
    raw = get_settings().base_config.get("graphql_sniff")
    cfg = raw if isinstance(raw, dict) else {}
    inner = cfg.get("raw_capture")
    inner_d: dict[str, Any] = inner if isinstance(inner, dict) else {}
    enabled = bool(inner_d.get("enabled", True))
    try:
        retention = int(inner_d.get("retention_days", _DEFAULT_RETENTION_DAYS))
    except (TypeError, ValueError):
        retention = _DEFAULT_RETENTION_DAYS
    try:
        prune_iv = int(inner_d.get("prune_interval_sec", _DEFAULT_PRUNE_INTERVAL_SEC))
    except (TypeError, ValueError):
        prune_iv = _DEFAULT_PRUNE_INTERVAL_SEC
    retention = max(1, min(365, retention))
    prune_iv = max(60, min(86400 * 7, prune_iv))
    return enabled, retention, prune_iv


def raw_capture_enabled() -> bool:
    import os

    env = (os.environ.get("GHOST_GRAPHQL_RAW") or "").strip().lower()
    if env in ("0", "false", "no", "off"):
        return False
    if env in ("1", "true", "yes", "on"):
        return True
    enabled, _, _ = _raw_config()
    return enabled


def retention_days_effective() -> int:
    import os

    raw = (os.environ.get("GHOST_GRAPHQL_RAW_RETENTION_DAYS") or "").strip()
    if raw:
        try:
            return max(1, min(365, int(raw)))
        except ValueError:
            pass
    _, d, _ = _raw_config()
    return d


def prune_interval_sec_effective() -> int:
    import os

    raw = (os.environ.get("GHOST_GRAPHQL_RAW_PRUNE_INTERVAL_SEC") or "").strip()
    if raw:
        try:
            return max(60, min(86400 * 7, int(raw)))
        except ValueError:
            pass
    _, _, iv = _raw_config()
    return iv


def save_graphql_raw_payload_sync(
    site_id: str,
    payload: Mapping[str, Any],
    *,
    channel: str,
    url: str,
    http_status: int | None,
) -> str | None:
    """
    Write one envelope JSON (full body under ``graphql``). Returns repo-relative path or None if skipped.
    """
    if not raw_capture_enabled():
        return None
    sid = _sanitize_site_id(site_id)
    root = _repo_root()
    day = data_archive_day_str()
    time_prefix = data_archive_time_prefix()
    target_dir = root / "data" / sid / "graphql_raw" / day
    file_name = f"{time_prefix}-{uuid.uuid4()}.json"
    saved_at = datetime.now(UTC).isoformat()
    envelope: dict[str, Any] = {
        "saved_at": saved_at,
        "channel": channel,
        "url": url[:2000],
        "http_status": http_status,
        "graphql": dict(payload),
    }
    text = json.dumps(envelope, indent=2, ensure_ascii=False)
    target_dir.mkdir(parents=True, exist_ok=True)
    (target_dir / file_name).write_text(text, encoding="utf-8")
    rel = f"data/{sid}/graphql_raw/{day}/{file_name}"
    log.debug("graphql_raw.saved", site_id=sid, relpath=rel, channel=channel)
    return rel


def prune_stale_graphql_raw_files(
    *,
    retention_days: int | None = None,
    site_glob: str = "*",
) -> int:
    """
    Delete *.json under data/<site>/graphql_raw/<day>/ when mtime is older than retention window.

    Empty day directories are removed. Returns count of deleted files.
    """
    days = retention_days if retention_days is not None else retention_days_effective()
    try:
        days_i = max(1, int(days))
    except (TypeError, ValueError):
        days_i = _DEFAULT_RETENTION_DAYS
    cutoff = time.time() - days_i * 86400
    data_root = _repo_root() / "data"
    if not data_root.is_dir():
        return 0
    deleted = 0
    for site_dir in data_root.iterdir():
        if not site_dir.is_dir():
            continue
        if site_glob != "*" and site_dir.name != site_glob:
            continue
        raw_root = site_dir / "graphql_raw"
        if not raw_root.is_dir():
            continue
        for day_dir in raw_root.iterdir():
            if not day_dir.is_dir():
                continue
            for f in day_dir.glob("*.json"):
                try:
                    if f.stat().st_mtime < cutoff:
                        f.unlink()
                        deleted += 1
                except OSError as exc:
                    log.warning(
                        "graphql_raw.unlink_failed",
                        path=str(f),
                        error=str(exc),
                    )
            try:
                if day_dir.is_dir() and not any(day_dir.iterdir()):
                    day_dir.rmdir()
            except OSError:
                pass
    if deleted:
        log.info(
            "graphql_raw.prune_done",
            deleted_files=deleted,
            retention_days=days_i,
            site_filter=site_glob,
        )
    return deleted


def maybe_prune_graphql_raw() -> None:
    """Run prune at most once per configured interval (process-wide)."""
    global _last_prune_mono
    if not raw_capture_enabled():
        return
    interval = float(prune_interval_sec_effective())
    now = time.monotonic()
    with _prune_lock:
        if now - _last_prune_mono < interval:
            return
        _last_prune_mono = now
    try:
        prune_stale_graphql_raw_files()
    except Exception as exc:  # noqa: BLE001
        log.warning("graphql_raw.prune_failed", error=str(exc))


def capture_raw_graphql_response(
    site_id: str,
    payload: Mapping[str, Any],
    *,
    channel: str,
    url: str,
    http_status: int | None,
) -> None:
    """Persist full body and occasionally prune stale files (thread entrypoint for sniffers)."""
    save_graphql_raw_payload_sync(
        site_id, payload, channel=channel, url=url, http_status=http_status
    )
    maybe_prune_graphql_raw()
