"""Messages inbox URL fallback (nav click bypass)."""

from __future__ import annotations

from ghost_engine.adapters.upwork_adapter import (
    _DEFAULT_MESSAGES_FALLBACK_URL,
    _sanitize_upwork_messages_inbox_url,
)


def test_sanitize_accepts_messages_path() -> None:
    u = _sanitize_upwork_messages_inbox_url(_DEFAULT_MESSAGES_FALLBACK_URL)
    assert u == _DEFAULT_MESSAGES_FALLBACK_URL


def test_sanitize_rejects_non_messages_path() -> None:
    assert (
        _sanitize_upwork_messages_inbox_url("https://www.upwork.com/nx/find-work/")
        is None
    )


def test_sanitize_rejects_non_upwork() -> None:
    assert _sanitize_upwork_messages_inbox_url("https://evil.com/messages/inbox") is None
