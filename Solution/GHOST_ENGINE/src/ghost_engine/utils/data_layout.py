"""Shared UTC/local day naming for data/<site>/jobs/ and data/<site>/trash/.

Use GHOST_USE_LOCAL_TIME=1 for naive local machine dates; default matches trash_log (UTC day).
"""

from __future__ import annotations

import os
from datetime import datetime, timezone


def _use_local_time_for_archive() -> bool:
    return os.environ.get("GHOST_USE_LOCAL_TIME", "").strip().lower() in ("1", "true", "yes")


def data_archive_day_str() -> str:
    """YYYY-MM-DD directory segment under data/<site>/jobs/ and trash/."""
    if _use_local_time_for_archive():
        return datetime.now().strftime("%Y-%m-%d")
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def data_archive_time_prefix() -> str:
    """HH-MM-SS prefix for timestamped JSON files under jobs/."""
    if _use_local_time_for_archive():
        return datetime.now().strftime("%H-%M-%S")
    return datetime.now(timezone.utc).strftime("%H-%M-%S")
