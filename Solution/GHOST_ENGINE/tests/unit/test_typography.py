"""negotiation.typography outbound normalization."""

from __future__ import annotations

from ghost_engine.negotiation.typography import apply_outbound_typography


def test_typography_replaces_em_dash_when_enabled() -> None:
    cfg = {"enabled": True, "replace_unicode_dashes": True}
    assert apply_outbound_typography("a\u2014b", cfg) == "a-b"


def test_typography_disabled_passthrough() -> None:
    cfg = {"enabled": False}
    assert apply_outbound_typography("a\u2014b", cfg) == "a\u2014b"
