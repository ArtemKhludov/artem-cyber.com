"""chat_reply_v1 template render."""

from __future__ import annotations

from ghost_engine.negotiation.prompt_render import render_chat_reply_v1


def test_render_chat_reply_v1_substitutes() -> None:
    out = render_chat_reply_v1(
        job_title="API work",
        client_message="When can you start?",
        tone_hint="brief",
    )
    assert "API work" in out
    assert "When can you start?" in out
    assert "brief" in out
