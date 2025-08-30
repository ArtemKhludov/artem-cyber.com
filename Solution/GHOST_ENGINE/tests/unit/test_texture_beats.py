"""negotiation.texture_beats — deterministic pool selection."""

from __future__ import annotations

from pathlib import Path

import pytest

from ghost_engine.negotiation import prompt_render, texture_beats as tb


def test_select_texture_beat_same_inputs_same_output() -> None:
    tb.clear_texture_beats_cache()
    a = tb.select_texture_beat("vac-42", "upwork")
    b = tb.select_texture_beat("vac-42", "upwork")
    assert a == b
    assert isinstance(a, str)


def test_select_texture_beat_empty_job_id_stable_for_same_title_desc() -> None:
    tb.clear_texture_beats_cache()
    a = tb.select_texture_beat("", "upwork", title="API Lead", description="GraphQL")
    b = tb.select_texture_beat("", "upwork", title="API Lead", description="GraphQL")
    assert a == b
    assert isinstance(a, str)


def test_texture_identity_key_prefers_job_id_and_anon_differs() -> None:
    assert tb._texture_identity_key("jid-1", "any", "any") == "jid-1"
    assert tb._texture_identity_key("", "t", "d1") != tb._texture_identity_key("", "t", "d2")


def test_select_texture_beat_is_from_pool_when_non_empty() -> None:
    tb.clear_texture_beats_cache()
    pool = tb.load_texture_beats()
    choice = tb.select_texture_beat("stable-job-id", "upwork")
    if not pool:
        assert choice == ""
    else:
        assert choice in pool


def test_empty_beats_file_returns_empty_string(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    prompts = tmp_path / "prompts"
    prompts.mkdir()
    (prompts / "cover_letter_texture_beats.txt").write_text("# empty\n\n", encoding="utf-8")
    monkeypatch.setattr(tb, "negotiation_prompts_dir", lambda: prompts)
    tb.clear_texture_beats_cache()
    try:
        assert tb.load_texture_beats() == ()
        assert tb.select_texture_beat("any", "site") == ""
    finally:
        tb.clear_texture_beats_cache()


def test_render_cover_letter_v1_substitutes_texture_beat() -> None:
    tpl = "X={{ texture_beat }}"
    out = prompt_render.render_cover_letter_v1(
        job_title="",
        job_description="",
        security_block="",
        texture_beat="beat line",
        template_text=tpl,
    )
    assert out == "X=beat line"
