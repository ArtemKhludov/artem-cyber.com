"""Feed driver env knobs and small Upwork feed helpers."""

from __future__ import annotations

import pytest

from ghost_engine.adapters import upwork_adapter as ua
from ghost_engine.adapters.upwork_graphql_parser import index_posted_at_by_core_from_graphql_snippets
from ghost_engine.browser import feed_policy as fp


def test_ordered_unique_cores() -> None:
    assert ua._ordered_unique_cores(["a", "b", "a", "", "b", "c"]) == ["a", "b", "c"]


def test_duplicate_load_streak_need_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GHOST_FEED_DUPLICATE_LOAD_STREAK_NEED", raising=False)
    assert fp.feed_duplicate_load_streak_need() == 2


def test_duplicate_load_streak_need_clamped(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GHOST_FEED_DUPLICATE_LOAD_STREAK_NEED", "99")
    assert fp.feed_duplicate_load_streak_need() == 10


def test_after_load_scroll_rounds_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GHOST_FEED_AFTER_LOAD_SCROLL_ROUNDS", raising=False)
    assert fp.feed_after_load_scroll_rounds() == 8


def test_redis_seen_wall_ratio_default_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GHOST_FEED_REDIS_SEEN_WALL_MIN_RATIO", raising=False)
    assert fp.feed_redis_seen_wall_min_ratio() == 0.0


def test_max_posted_age_days_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GHOST_FEED_MAX_POSTED_AGE_DAYS", raising=False)
    assert fp.feed_max_posted_age_days() == 0.0


def test_fresh_temporal_wall_missing_posted_skips() -> None:
    assert not ua._fresh_temporal_wall(
        frozenset({"x", "y"}),
        {"x": "2026-01-01T00:00:00Z"},
        30.0,
    )


def test_fresh_temporal_wall_all_old() -> None:
    assert ua._fresh_temporal_wall(
        frozenset({"a"}),
        {"a": "2020-01-01T00:00:00Z"},
        30.0,
    )


def test_index_posted_at_from_snippets() -> None:
    payload = {
        "data": {
            "jobSearch": {
                "edges": [
                    {
                        "node": {
                            "ciphertext": "~corexyz",
                            "title": "Job",
                            "postedOn": "2025-06-01T12:00:00.000Z",
                        },
                    },
                ],
            },
        },
    }
    idx = index_posted_at_by_core_from_graphql_snippets([payload])
    assert idx.get("corexyz") == "2025-06-01T12:00:00.000Z"


def test_fresh_temporal_wall_recent_not_wall() -> None:
    from datetime import datetime, timedelta, timezone

    recent = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    assert not ua._fresh_temporal_wall(frozenset({"a"}), {"a": recent}, 30.0)
