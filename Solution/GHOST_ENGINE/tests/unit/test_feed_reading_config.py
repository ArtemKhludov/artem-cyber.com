"""feed_reading scoring block and inter Load More pause bounds."""

from __future__ import annotations

import pytest

from ghost_engine.browser.feed_policy import (
    feed_inter_load_more_fast_ms_bounds,
    feed_inter_load_more_ms_bounds,
)
from ghost_engine.scoring.feed_reading import (
    default_feed_reading_config,
    feed_reading_from_scoring_root,
)


def test_default_feed_reading_config() -> None:
    c = default_feed_reading_config()
    assert c.enabled is True
    assert c.save_min_gri == 0.85
    assert c.linger_min_gri == 0.58
    assert c.defer_notify_until_job_detail is False
    assert c.detail_notify_wait_timeout_sec == 28.0


def test_feed_reading_from_scoring_root_merge() -> None:
    root = {
        "feed_reading": {
            "enabled": False,
            "save_min_gri": 0.9,
            "linger_sleep_ms_min": 1000,
        }
    }
    c = feed_reading_from_scoring_root(root)
    assert c.enabled is False
    assert c.save_min_gri == 0.9
    assert c.linger_sleep_ms_min == 1000


def test_feed_reading_defer_detail_merge() -> None:
    root = {
        "feed_reading": {
            "defer_notify_until_job_detail": True,
            "detail_notify_wait_timeout_sec": 35,
        }
    }
    c = feed_reading_from_scoring_root(root)
    assert c.defer_notify_until_job_detail is True
    assert c.detail_notify_wait_timeout_sec == 35.0


def test_feed_inter_load_more_ms_bounds_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GHOST_FEED_INTER_LOAD_MORE_SEC_MIN", raising=False)
    monkeypatch.delenv("GHOST_FEED_INTER_LOAD_MORE_SEC_MAX", raising=False)
    lo, hi = feed_inter_load_more_ms_bounds()
    assert lo == 10_000 and hi == 15_000


def test_feed_inter_load_more_fast_bounds_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GHOST_FEED_INTER_FAST_SEC_MIN", raising=False)
    monkeypatch.delenv("GHOST_FEED_INTER_FAST_SEC_MAX", raising=False)
    lo, hi = feed_inter_load_more_fast_ms_bounds()
    assert lo == 4_000 and hi == 7_000
