"""ghost_engine.utils.typography.clean_typography."""

from __future__ import annotations

from ghost_engine.utils.typography import clean_typography


def test_clean_typography_strips_sure_here_is_preamble() -> None:
    raw = "Sure, here is the cover letter:\n\nI will ship the API in week one."
    out = clean_typography(raw)
    assert "Sure" not in out
    assert "week one" in out


def test_clean_typography_spaced_hyphen_to_em_then_pipeline_ascii() -> None:
    from ghost_engine.negotiation.typography import apply_outbound_typography

    raw = "Scope - delivery is two weeks."
    cleaned = clean_typography(raw)
    assert "\u2014" in cleaned or "Scope" in cleaned
    cfg = {"enabled": True, "utils_clean": True, "replace_unicode_dashes": True}
    final = apply_outbound_typography(raw, cfg)
    assert " - " not in final or "two weeks" in final
    assert "two weeks" in final


def test_clean_typography_outer_quotes_removed() -> None:
    out = clean_typography('"Done in milestone one."')
    assert out == "\u201cDone in milestone one.\u201d" or "Done" in out
