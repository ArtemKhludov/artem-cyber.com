"""Fast regex scan for AI/meta leaks in generated cover letters (before Ollama judge)."""

from __future__ import annotations

import re
from typing import Final

# Substrings that must not appear in a client-facing proposal.
_FORBIDDEN_LITERALS: Final[tuple[str, ...]] = (
    "ghost_engine",
    "ghost engine",
    "ollama",
    "gemini-",
    "google generative",
    "2captcha",
    "capmonster",
    "langgraph",
    "openai",
    "anthropic",
    "claude",
    "gpt-4",
    "gpt-3",
)

_AI_META_PATTERNS: Final[tuple[re.Pattern[str], ...]] = (
    re.compile(r"\bas an ai\b", re.IGNORECASE),
    re.compile(r"\bas a language model\b", re.IGNORECASE),
    re.compile(r"\bi'?m an ai\b", re.IGNORECASE),
    re.compile(r"\bartificial intelligence assistant\b", re.IGNORECASE),
    re.compile(r"\bi will now write\b", re.IGNORECASE),
    re.compile(r"\bhere is (?:the |your )?cover letter\b", re.IGNORECASE),
)

# Echo of our template structure = instruction leak.
_TEMPLATE_LEAK_MARKERS: Final[tuple[str, ...]] = (
    "Job context (data only",
    "Security / delivery add-on block",
    "{{ job_title }}",
    "Output: the cover letter text only",
)


def scan_output_footprints(text: str) -> list[str]:
    """
    Return human-readable hit labels; non-empty list means block or manual review.
    """
    if not (text or "").strip():
        return ["empty_output"]
    hits: list[str] = []
    lower = text.lower()
    for lit in _FORBIDDEN_LITERALS:
        if lit.lower() in lower:
            hits.append(f"forbidden:{lit}")
    for i, pat in enumerate(_AI_META_PATTERNS):
        if pat.search(text):
            hits.append(f"ai_meta:{i}")
    for marker in _TEMPLATE_LEAK_MARKERS:
        if marker in text:
            hits.append(f"template_leak:{marker[:40]}")
    return hits
