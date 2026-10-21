"""
Single source of truth for feed driver env knobs (legacy Load More loop + stealth drive_feed).

Override via environment variables; defaults match historical hardcoded values in
``upwork_feed_loop`` / ``upwork_adapter``.
"""

from __future__ import annotations

import os


def _parse_int(raw: str, default: int, lo: int, hi: int) -> int:
    try:
        n = int(raw)
    except ValueError:
        n = default
    return max(lo, min(hi, n))


def _parse_float(raw: str, default: float, lo: float, hi: float) -> float:
    try:
        v = float(raw)
    except ValueError:
        v = default
    return max(lo, min(hi, v))


def feed_overlap_threshold() -> float:
    return _parse_float(os.environ.get("GHOST_FEED_OVERLAP_THRESHOLD", "0.4"), 0.4, 0.0, 1.0)


def feed_max_load_more() -> int:
    return _parse_int(os.environ.get("GHOST_FEED_MAX_LOAD_MORE", "50"), 50, 1, 500)


def feed_stealth_max_load_more() -> int:
    return _parse_int(os.environ.get("GHOST_FEED_STEALTH_MAX_LOAD_MORE", "15"), 15, 1, 80)


def feed_seen_ttl_sec() -> int:
    raw = os.environ.get("GHOST_FEED_SEEN_TTL_SEC", "604800")
    try:
        ttl = int(raw)
    except ValueError:
        ttl = 604800
    return max(3600, min(ttl, 86400 * 30))


def feed_after_load_scroll_rounds() -> int:
    """PageDown-style bursts toward feed bottom after each Load More (virtualized lists)."""
    return _parse_int(os.environ.get("GHOST_FEED_AFTER_LOAD_SCROLL_ROUNDS", "8"), 8, 1, 30)


def feed_no_interest_gentle_scroll_enabled() -> bool:
    """
    When enabled, use wheel-only gentle passes instead of PageDown+End if every visible
    job has a known GRI below feed_reading.linger_min_gri (no tile worth dwelling on).
    """
    raw = (os.environ.get("GHOST_FEED_NO_INTEREST_GENTLE_SCROLL", "1") or "1").strip().lower()
    return raw not in ("0", "false", "no", "off")


def feed_no_interest_gentle_passes_min() -> int:
    return _parse_int(os.environ.get("GHOST_FEED_NO_INTEREST_GENTLE_PASSES_MIN", "2"), 2, 1, 10)


def feed_no_interest_gentle_passes_max() -> int:
    hi = _parse_int(os.environ.get("GHOST_FEED_NO_INTEREST_GENTLE_PASSES_MAX", "3"), 3, 1, 12)
    lo = feed_no_interest_gentle_passes_min()
    return hi if hi >= lo else lo


def feed_empty_fresh_retries() -> int:
    """Extra recollect attempts when fresh ids are empty after Load More (after scroll rounds)."""
    return _parse_int(os.environ.get("GHOST_FEED_EMPTY_FRESH_RETRIES", "4"), 4, 0, 15)


def feed_duplicate_load_streak_need() -> int:
    """Consecutive Load More rounds with zero fresh ids (after settle) before end-of-feed stop."""
    return _parse_int(os.environ.get("GHOST_FEED_DUPLICATE_LOAD_STREAK_NEED", "2"), 2, 2, 10)


def feed_max_posted_age_days() -> float:
    """0 = disabled. If every id in ``fresh`` has parsed posted_at and all are older than this, stop."""
    raw = (os.environ.get("GHOST_FEED_MAX_POSTED_AGE_DAYS", "0") or "0").strip()
    try:
        v = float(raw)
    except ValueError:
        v = 0.0
    return max(0.0, min(v, 3650.0))


def feed_redis_seen_wall_min_ratio() -> float:
    """
    0 = disabled. After empty fresh, if this fraction of visible ids are already in Redis seen set, stop.

    Example: 0.95 means stop when >=95%% of after_ids are in ghost:feed:seen:*.
    """
    return _parse_float(os.environ.get("GHOST_FEED_REDIS_SEEN_WALL_MIN_RATIO", "0"), 0.0, 0.0, 1.0)


def feed_overlap_streak_before_stop() -> int:
    """Consecutive high-overlap rounds required before stopping (legacy loop). Default 1 = immediate."""
    return _parse_int(os.environ.get("GHOST_FEED_OVERLAP_STREAK_BEFORE_STOP", "1"), 1, 1, 20)


def feed_load_more_click_retries() -> int:
    """Extra attempts after a failed Load More click (0 = single attempt)."""
    return _parse_int(os.environ.get("GHOST_FEED_LOAD_MORE_CLICK_RETRIES", "2"), 2, 0, 5)


def feed_load_more_click_backoff_ms_min() -> int:
    return _parse_int(os.environ.get("GHOST_FEED_LOAD_MORE_RETRY_MS_MIN", "800"), 800, 0, 30_000)


def feed_load_more_click_backoff_ms_max() -> int:
    return _parse_int(os.environ.get("GHOST_FEED_LOAD_MORE_RETRY_MS_MAX", "2400"), 2400, 0, 60_000)


def feed_inter_load_more_ms_bounds() -> tuple[int, int]:
    """
    Pause between successful Load More rounds (legacy loop + stealth drive_feed).

    Default 10–15 s human pacing; override with GHOST_FEED_INTER_LOAD_MORE_SEC_MIN / _MAX.
    Set both env vars to 0 to disable (not recommended).
    """
    lo_s = _parse_int(os.environ.get("GHOST_FEED_INTER_LOAD_MORE_SEC_MIN", "10"), 10, 0, 600)
    hi_s = _parse_int(os.environ.get("GHOST_FEED_INTER_LOAD_MORE_SEC_MAX", "15"), 15, 0, 600)
    if lo_s == 0 and hi_s == 0:
        return 0, 0
    if hi_s < lo_s:
        lo_s, hi_s = hi_s, lo_s
    return lo_s * 1000, hi_s * 1000


def feed_inter_load_more_fast_ms_bounds() -> tuple[int, int]:
    """Shorter pause when GHOST_FEED_STEALTH_FAST=1 (still humanize=True). Default 4–7 s."""
    lo_s = _parse_int(os.environ.get("GHOST_FEED_INTER_FAST_SEC_MIN", "4"), 4, 0, 120)
    hi_s = _parse_int(os.environ.get("GHOST_FEED_INTER_FAST_SEC_MAX", "7"), 7, 0, 120)
    if lo_s == 0 and hi_s == 0:
        return 0, 0
    if hi_s < lo_s:
        lo_s, hi_s = hi_s, lo_s
    return lo_s * 1000, hi_s * 1000


def feed_stealth_fast() -> bool:
    """
    Fewer mouse moves / sleeps on find-work stealth path (less accidental filter clicks, faster Load More).

    **Default: on** (unset env). Disable with ``GHOST_FEED_STEALTH_FAST=0`` (or false/no/off) for legacy
    long warm-up / micro-moves before Load More.
    """
    raw = (os.environ.get("GHOST_FEED_STEALTH_FAST", "1") or "1").strip().lower()
    return raw not in ("0", "false", "no", "off")


def ops_l0_streak_threshold() -> int:
    """Consecutive identical L0 drop codes before ops Telegram (shared default with AI diag)."""
    raw = os.environ.get("GHOST_OPS_L0_STREAK_THRESHOLD", "").strip()
    if raw:
        return _parse_int(raw, 10, 1, 500)
    return _parse_int(os.environ.get("GHOST_AI_DIAG_THRESHOLD", "10"), 10, 1, 500)
