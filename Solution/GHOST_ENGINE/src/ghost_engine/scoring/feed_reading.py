"""Feed humanization thresholds (dwell / auto-save on find-work). Loaded from scoring.yaml ``feed_reading``."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class FeedReadingConfig:
    enabled: bool
    linger_min_gri: float
    linger_sleep_ms_min: int
    linger_sleep_ms_max: int
    save_min_gri: float
    pause_before_save_ms_min: int
    pause_before_save_ms_max: int
    max_cards_per_round: int
    # Two-phase notify: feed score → open job URL → detail GraphQL → cover + Telegram
    defer_notify_until_job_detail: bool
    detail_notify_wait_timeout_sec: float


def default_feed_reading_config() -> FeedReadingConfig:
    return FeedReadingConfig(
        enabled=True,
        linger_min_gri=0.58,
        linger_sleep_ms_min=2000,
        linger_sleep_ms_max=5000,
        save_min_gri=0.85,
        pause_before_save_ms_min=5000,
        pause_before_save_ms_max=10000,
        max_cards_per_round=24,
        defer_notify_until_job_detail=False,
        detail_notify_wait_timeout_sec=28.0,
    )


def feed_reading_from_scoring_root(scoring_root: Mapping[str, Any]) -> FeedReadingConfig:
    base = default_feed_reading_config()
    raw = scoring_root.get("feed_reading")
    if not isinstance(raw, dict):
        return base

    def _b(key: str, default: bool) -> bool:
        v = raw.get(key)
        if v is None:
            return default
        if isinstance(v, bool):
            return v
        s = str(v).strip().lower()
        if s in ("0", "false", "no", "off"):
            return False
        if s in ("1", "true", "yes", "on"):
            return True
        return default

    def _f(key: str, default: float) -> float:
        v = raw.get(key)
        if v is None:
            return default
        try:
            return float(v)
        except (TypeError, ValueError):
            return default

    def _i(key: str, default: int) -> int:
        v = raw.get(key)
        if v is None:
            return default
        try:
            return int(v)
        except (TypeError, ValueError):
            return default

    def _timeout_sec(key: str, default: float) -> float:
        v = raw.get(key)
        if v is None:
            return default
        try:
            return float(v)
        except (TypeError, ValueError):
            return default

    return FeedReadingConfig(
        enabled=_b("enabled", base.enabled),
        linger_min_gri=_f("linger_min_gri", base.linger_min_gri),
        linger_sleep_ms_min=max(0, _i("linger_sleep_ms_min", base.linger_sleep_ms_min)),
        linger_sleep_ms_max=max(0, _i("linger_sleep_ms_max", base.linger_sleep_ms_max)),
        save_min_gri=_f("save_min_gri", base.save_min_gri),
        pause_before_save_ms_min=max(0, _i("pause_before_save_ms_min", base.pause_before_save_ms_min)),
        pause_before_save_ms_max=max(0, _i("pause_before_save_ms_max", base.pause_before_save_ms_max)),
        max_cards_per_round=max(1, min(_i("max_cards_per_round", base.max_cards_per_round), 200)),
        defer_notify_until_job_detail=_b(
            "defer_notify_until_job_detail", base.defer_notify_until_job_detail
        ),
        detail_notify_wait_timeout_sec=max(
            5.0,
            min(_timeout_sec("detail_notify_wait_timeout_sec", base.detail_notify_wait_timeout_sec), 120.0),
        ),
    )
