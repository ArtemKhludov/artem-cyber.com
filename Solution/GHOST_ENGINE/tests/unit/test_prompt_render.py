"""negotiation.prompt_render — cover letter v1 placeholders."""

from __future__ import annotations

import pytest

from ghost_engine.negotiation import prompt_render
from ghost_engine.scoring.devsec_upsell import devsec_upsell_paragraph


def test_render_cover_letter_v1_inserts_security_paragraph_when_non_empty() -> None:
    sec = devsec_upsell_paragraph()
    tpl = "T={{ job_title }}\nD={{ job_description }}\nS={{ security_block }}\nB={{ texture_beat }}"
    out = prompt_render.render_cover_letter_v1(
        job_title="API",
        job_description="docker",
        security_block=sec,
        texture_beat="",
        template_text=tpl,
    )
    assert "API" in out
    assert "docker" in out
    assert "Semgrep" in out
    assert "My delivery standard includes" in out


def test_render_cover_letter_v1_empty_security_omits_devsec_paragraph() -> None:
    tpl = "T={{ job_title }}\nD={{ job_description }}\nS={{ security_block }}\nB={{ texture_beat }}"
    out = prompt_render.render_cover_letter_v1(
        job_title="x",
        job_description="y",
        security_block="",
        texture_beat="",
        template_text=tpl,
    )
    assert "My delivery standard includes" not in out
    assert out.endswith("S=") or "S=\n" in out or "S=" in out


def test_render_cover_letter_v1_escapes_user_double_braces() -> None:
    tpl = "{{ job_title }}"
    out = prompt_render.render_cover_letter_v1(
        job_title="a{{b}}c",
        job_description="",
        security_block="",
        template_text=tpl,
    )
    assert out == "a{ {b}}c"


def test_render_cover_letter_v1_unknown_placeholder_raises() -> None:
    with pytest.raises(KeyError, match="Unknown"):
        prompt_render.render_cover_letter_v1(
            job_title="",
            job_description="",
            security_block="",
            template_text="{{ job_title }} {{ typo }}",
        )


def test_load_cover_letter_v1_from_package() -> None:
    out = prompt_render.render_cover_letter_v1(
        job_title="t",
        job_description="d",
        security_block="",
    )
    assert "t" in out
    assert "d" in out
    assert "expert freelance" in out.lower()
    assert "My delivery standard includes" not in out
