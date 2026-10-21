"""infer_job_public_url helper."""

from __future__ import annotations

from ghost_engine.notify.job_urls import infer_job_public_url


def test_infer_from_signal_public_url() -> None:
    u = infer_job_public_url(
        "upwork",
        "x",
        {"public_url": "https://example.com/job/1"},
    )
    assert u == "https://example.com/job/1"


def test_infer_upwork_template() -> None:
    u = infer_job_public_url("upwork", "~Ab12cD", {})
    assert u == "https://www.upwork.com/jobs/~Ab12cD/"


def test_infer_unknown_site() -> None:
    assert infer_job_public_url("other", "jid", {}) is None
