"""Deterministic typography and LLM-artifact cleanup (no tokens)."""

from __future__ import annotations

import re
from typing import Final

# Leading lines / blocks often produced by chat models before the actual letter.
_LLM_PREAMBLE_PATTERNS: Final[tuple[re.Pattern[str], ...]] = (
    re.compile(
        r"^\s*(?:sure[!.,]?|of course[!.,]?|absolutely[!.,]?)\s+"
        r"(?:here(?:'s| is)|below is|i(?:'ve| have))\s+"
        r"(?:the |your )?(?:cover letter|proposal|response|draft)\s*[:\s]*\n+",
        re.IGNORECASE | re.MULTILINE,
    ),
    re.compile(
        r"^\s*(?:here(?:'s| is)|below is)\s+(?:the |your )?"
        r"(?:cover letter|proposal|response)\s*[:\s]*\n+",
        re.IGNORECASE | re.MULTILINE,
    ),
    re.compile(
        r"^\s*output\s*:\s*(?:the )?cover letter[^\n]*\n+",
        re.IGNORECASE | re.MULTILINE,
    ),
)

_LINE_START_TRIM: Final[tuple[re.Pattern[str], ...]] = (
    re.compile(r"^\s*(?:sure|okay|ok)[!.,]?\s+", re.IGNORECASE),
)


def _strip_llm_preambles(text: str) -> str:
    out = text.strip()
    for pat in _LLM_PREAMBLE_PATTERNS:
        out = pat.sub("", out)
    for pat in _LINE_START_TRIM:
        out = pat.sub("", out)
    return out.strip()


def _spaced_hyphen_to_em_dash(text: str) -> str:
    """Turn 'word - word' clause dashes into em dashes; avoids '-' in tokens/URLs."""

    def repl(m: re.Match[str]) -> str:
        a, b = m.group(1), m.group(2)
        return f"{a}\u2014{b}"

    return re.sub(r"([a-zA-Z0-9])\s-\s([a-zA-Z0-9])", repl, text)


def _normalize_quotes(text: str) -> str:
    """Use curly double quotes for plain English pairs."""
    out: list[str] = []
    open_curly = False
    for ch in text:
        if ch == '"':
            if not open_curly:
                out.append("\u201c")
                open_curly = True
            else:
                out.append("\u201d")
                open_curly = False
        else:
            out.append(ch)
    return "".join(out)


def _collapse_blank_lines(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", text)


def _strip_outer_wrapping_quotes(text: str) -> str:
    s = text.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in ('"', "\u201c", "\u201d"):
        inner = s[1:-1].strip()
        if inner:
            return inner
    return text


def clean_typography(text: str) -> str:
    """
    Clean model output: remove common AI wrappers, normalize clause dashes and quotes,
    collapse excessive blank lines.

    Run before footprint / judge. Platform-specific ASCII downgrade (e.g. Upwork) can
    follow via ``negotiation.typography.apply_outbound_typography``.
    """
    if not text or not isinstance(text, str):
        return text or ""
    out = text.replace("\r\n", "\n").strip()
    out = _strip_llm_preambles(out)
    out = _spaced_hyphen_to_em_dash(out)
    out = _normalize_quotes(out)
    out = _collapse_blank_lines(out)
    out = _strip_outer_wrapping_quotes(out)
    return out.strip()
