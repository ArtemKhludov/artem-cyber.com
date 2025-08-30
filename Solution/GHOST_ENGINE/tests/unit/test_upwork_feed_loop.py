"""Pure helpers for find-work feed loop (no Playwright)."""

from __future__ import annotations

from ghost_engine.browser.upwork_feed_loop import (
    _cores_from_href_string,
    feed_seen_redis_key,
)


def test_feed_seen_redis_key_normalizes() -> None:
    assert feed_seen_redis_key(" Upwork ", "  Dev ") == "ghost:feed:seen:upwork:dev"
    assert feed_seen_redis_key("x", "") == "ghost:feed:seen:x:default"


def test_cores_from_href_classic_and_nx_paths() -> None:
    assert _cores_from_href_string("/nx/find-work/best-matches/jobs/~01abc") == ["01abc"]
    assert _cores_from_href_string("https://www.upwork.com/jobs/~Xy9deadbeef") == ["Xy9deadbeef"]
    nx = (
        "https://www.upwork.com/nx/find-work/details/~01e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1?q=test"
    )
    assert _cores_from_href_string(nx) == ["01e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1"]


def test_cores_from_href_tilde_fallback() -> None:
    odd = "https://www.upwork.com/nx/some-variant/path/~feedcore1234567890/apply"
    cores = _cores_from_href_string(odd)
    assert "feedcore1234567890" in cores
