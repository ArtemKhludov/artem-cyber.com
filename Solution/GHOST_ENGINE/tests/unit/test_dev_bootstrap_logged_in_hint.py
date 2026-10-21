"""Unit tests for dev_session logged-in bootstrap hint (no browser)."""

from __future__ import annotations

from ghost_engine.browser.dev_session import _bootstrap_logged_in_css_hint


class _FakeAdapter:
    def __init__(self, selectors: dict[str, str]) -> None:
        self.selectors = selectors


def test_logged_in_hint_custom_overrides_upwork_nav() -> None:
    a = _FakeAdapter({"logged_in_bootstrap": "#session", "nav_messages_button": "nav a"})
    assert _bootstrap_logged_in_css_hint(a, "upwork") == "#session"


def test_logged_in_hint_upwork_fallback_nav_messages() -> None:
    a = _FakeAdapter({"nav_messages_button": "nav a[href*='/messages/main']"})
    assert _bootstrap_logged_in_css_hint(a, "upwork") == "nav a[href*='/messages/main']"


def test_logged_in_hint_non_upwork_requires_explicit() -> None:
    a = _FakeAdapter({"nav_messages_button": "nav"})
    assert _bootstrap_logged_in_css_hint(a, "other") == ""


def test_logged_in_hint_empty_logged_in_bootstrap_falls_through() -> None:
    a = _FakeAdapter({"logged_in_bootstrap": "", "nav_messages_button": "nav x"})
    assert _bootstrap_logged_in_css_hint(a, "upwork") == "nav x"
