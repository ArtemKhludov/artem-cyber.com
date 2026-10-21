"""Stealth feed caps (env-driven)."""

from __future__ import annotations

import pytest

from ghost_engine.adapters.upwork_adapter import UpworkAdapter
from ghost_engine.browser import feed_policy as fp


def _minimal_upwork_yaml(tmp_path: object) -> object:
    p = tmp_path / "upwork.yaml"
    p.write_text(
        "site_id: upwork\n"
        "url: https://www.upwork.com/nx/find-work/\n"
        "graphql:\n"
        "  jobs_endpoint: https://www.upwork.com/api/graphql/v1\n"
        "selectors:\n"
        '  load_more_button: "button"\n',
        encoding="utf-8",
    )
    return p


def test_no_interest_gentle_scroll_enabled_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GHOST_FEED_NO_INTEREST_GENTLE_SCROLL", raising=False)
    assert fp.feed_no_interest_gentle_scroll_enabled() is True


def test_no_interest_gentle_passes_bounds() -> None:
    lo, hi = fp.feed_no_interest_gentle_passes_min(), fp.feed_no_interest_gentle_passes_max()
    assert 1 <= lo <= hi <= 12


def test_all_visible_cores_known_below_linger(tmp_path: object) -> None:
    a = UpworkAdapter(_minimal_upwork_yaml(tmp_path))
    a._feed_gri_by_core["aa"] = 0.2
    a._feed_gri_by_core["bb"] = 0.4
    assert a._all_visible_cores_known_below_linger(frozenset({"aa", "bb"}), 0.58) is True
    assert a._all_visible_cores_known_below_linger(frozenset({"aa", "bb"}), 0.15) is False
    assert a._all_visible_cores_known_below_linger(frozenset({"aa", "unknown"}), 0.58) is False
    assert a._all_visible_cores_known_below_linger(frozenset(), 0.58) is False


def test_stealth_max_load_more_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GHOST_FEED_STEALTH_MAX_LOAD_MORE", raising=False)
    assert fp.feed_stealth_max_load_more() == 15


def test_stealth_max_load_more_clamped(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GHOST_FEED_STEALTH_MAX_LOAD_MORE", "999")
    assert fp.feed_stealth_max_load_more() == 80
    monkeypatch.setenv("GHOST_FEED_STEALTH_MAX_LOAD_MORE", "0")
    assert fp.feed_stealth_max_load_more() == 1
