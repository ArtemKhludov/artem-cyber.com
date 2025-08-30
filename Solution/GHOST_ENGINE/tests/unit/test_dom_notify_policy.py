"""Defer-notify policy for Upwork."""

from __future__ import annotations

import pytest

from ghost_engine.notify import dom_notify_policy as dnp


def test_defer_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GHOST_NOTIFY_IMMEDIATE", raising=False)
    monkeypatch.delenv("GHOST_NOTIFY_AFTER_DOM_URL", raising=False)
    assert dnp.should_defer_upwork_notify_for_dom_url() is True


def test_immediate_opt_in(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GHOST_NOTIFY_IMMEDIATE", "1")
    assert dnp.should_defer_upwork_notify_for_dom_url() is False


def test_explicit_after_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GHOST_NOTIFY_IMMEDIATE", raising=False)
    monkeypatch.setenv("GHOST_NOTIFY_AFTER_DOM_URL", "0")
    assert dnp.should_defer_upwork_notify_for_dom_url() is False
