"""Prompt boundary helpers."""

from __future__ import annotations

from ghost_engine.agents.prompts.templates import wrap_untrusted_job_block


def test_wrap_untrusted_unique_tag() -> None:
    open_tag, block = wrap_untrusted_job_block("hello")
    assert open_tag.startswith("<untrusted_content_")
    assert open_tag in block
    assert "hello" in block
    tags = {wrap_untrusted_job_block("x")[0] for _ in range(24)}
    assert len(tags) >= 20
