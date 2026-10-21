"""Selector builder for find-work DOM (no Playwright)."""

from __future__ import annotations

from ghost_engine.browser.upwork_feed_dom import build_upwork_job_feed_selectors


def test_build_selectors_link_fallback() -> None:
    sels = build_upwork_job_feed_selectors({}, "~AbCdEf")
    assert any("~AbCdEf" in x for x in sels)
    assert any("AbCdEf" in x for x in sels)


def test_feed_job_card_template() -> None:
    sels = build_upwork_job_feed_selectors(
        {"feed_job_card": 'article[data-test="job-{job_id_core}"]'},
        "~Xy1",
    )
    assert 'article[data-test="job-Xy1"]' in sels


def test_empty_job_id() -> None:
    assert build_upwork_job_feed_selectors({}, "") == []
    assert build_upwork_job_feed_selectors({}, "   ") == []


