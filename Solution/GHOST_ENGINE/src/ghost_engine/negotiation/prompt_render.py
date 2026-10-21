"""
Load and render negotiation prompt templates (``{{ var }}`` placeholders, no Jinja).

Contract:
- Cover letter: ``cover_letter_v1.txt`` via ``render_cover_letter_v1`` (vars: job_title, job_description, security_block, texture_beat).
- Chat thread replies: ``chat_reply_v1.txt`` via ``render_chat_reply_v1`` (vars: job_title, client_message, tone_hint).
- Directory: ``llm.yaml`` → ``prompts.system_root`` (repo-relative).
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Final

from ghost_engine.config.settings import get_settings

_PLACEHOLDER_RE = re.compile(r"\{\{\s*(\w+)\s*\}\}")
_COVER_LETTER_V1_VARS: Final[frozenset[str]] = frozenset(
    {"job_title", "job_description", "security_block", "texture_beat"}
)
_CHAT_REPLY_V1_VARS: Final[frozenset[str]] = frozenset(
    {"job_title", "client_message", "tone_hint"}
)


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def negotiation_prompts_dir() -> Path:
    """Resolve directory from ``llm.yaml`` ``prompts.system_root`` (repo-relative) or package fallback."""
    root = _project_root()
    cfg = get_settings().llm_config
    prompts_cfg = cfg.get("prompts") if isinstance(cfg.get("prompts"), dict) else {}
    rel = prompts_cfg.get("system_root")
    if isinstance(rel, str) and rel.strip():
        p = (root / rel.strip()).resolve()
        if p.is_dir():
            return p
    return Path(__file__).resolve().parent / "prompts"


def _escape_brace_placeholders(s: str) -> str:
    """Prevent user-controlled text from being interpreted as template holes."""
    return s.replace("{{", "{ {")


def load_prompt_text(filename: str) -> str:
    path = negotiation_prompts_dir() / filename
    return path.read_text(encoding="utf-8")


# Keep keys aligned with assign_persona() in scoring.roi_calculator.
_PERSONA_FILES: Final[dict[str, str]] = {
    "sniper": "persona_sniper.txt",
    "consultant": "persona_consultant.txt",
    "specialist": "persona_specialist.txt",
}


def load_persona_voice(persona_tag: str | None) -> str:
    """
    Role instructions prepended to the cover-letter user prompt (Gemini).

    Unknown or empty tag → consultant.
    """
    key = (persona_tag or "").strip().lower()
    fname = _PERSONA_FILES.get(key, _PERSONA_FILES["consultant"])
    try:
        return load_prompt_text(fname).strip()
    except OSError:
        return ""


def render_cover_letter_v1(
    *,
    job_title: str,
    job_description: str,
    security_block: str,
    texture_beat: str = "",
    template_text: str | None = None,
) -> str:
    """
    Substitute ``{{ job_title }}``, ``{{ job_description }}``, ``{{ security_block }}``, ``{{ texture_beat }}``.

    Unknown placeholders in the template raise ``KeyError``. User fields are escaped so
    literal ``{{`` in job text does not create extra holes.
    """
    text = template_text if template_text is not None else load_prompt_text("cover_letter_v1.txt")
    values: dict[str, str] = {
        "job_title": _escape_brace_placeholders(job_title),
        "job_description": _escape_brace_placeholders(job_description),
        "security_block": _escape_brace_placeholders(security_block),
        "texture_beat": _escape_brace_placeholders(texture_beat),
    }

    def repl(match: re.Match[str]) -> str:
        key = match.group(1)
        if key not in _COVER_LETTER_V1_VARS:
            raise KeyError(f"Unknown cover_letter_v1 template variable: {key!r}")
        return values[key]

    out = _PLACEHOLDER_RE.sub(repl, text)
    if "{{" in out:
        raise ValueError("Unclosed or unknown template syntax remains after substitution")
    return out


def render_chat_reply_v1(
    *,
    job_title: str,
    client_message: str,
    tone_hint: str = "",
    template_text: str | None = None,
) -> str:
    """
    Thread reply prompt: ``{{ job_title }}``, ``{{ client_message }}``, ``{{ tone_hint }}``.

    Add variables only by extending ``_CHAT_REPLY_V1_VARS`` and this function's parameters.
    """
    text = template_text if template_text is not None else load_prompt_text("chat_reply_v1.txt")
    values: dict[str, str] = {
        "job_title": _escape_brace_placeholders(job_title),
        "client_message": _escape_brace_placeholders(client_message),
        "tone_hint": _escape_brace_placeholders(tone_hint),
    }

    def repl(match: re.Match[str]) -> str:
        key = match.group(1)
        if key not in _CHAT_REPLY_V1_VARS:
            raise KeyError(f"Unknown chat_reply_v1 template variable: {key!r}")
        return values[key]

    out = _PLACEHOLDER_RE.sub(repl, text)
    if "{{" in out:
        raise ValueError("Unclosed or unknown template syntax remains after substitution")
    return out
