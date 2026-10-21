"""Sanitization for optional job public URL before apply navigation."""

from __future__ import annotations

from ghost_engine.adapters import base_adapter as ba


def test_rejects_non_https() -> None:
    assert ba._sanitize_upwork_job_public_url_for_goto("http://www.upwork.com/jobs/~abc/x") is None


def test_rejects_non_upwork_host() -> None:
    assert ba._sanitize_upwork_job_public_url_for_goto("https://evil.com/jobs/~abc/x") is None


def test_accepts_upwork_job_path() -> None:
    u = "https://www.upwork.com/jobs/~0123456789abcdef0123456789abcdef/title/"
    assert ba._sanitize_upwork_job_public_url_for_goto(u) == u


def test_strips_fragment() -> None:
    u = "https://www.upwork.com/jobs/~abc/x#section"
    assert ba._sanitize_upwork_job_public_url_for_goto(u) == "https://www.upwork.com/jobs/~abc/x"
