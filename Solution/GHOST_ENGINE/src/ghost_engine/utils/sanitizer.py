"""
Layer-1 deterministic text sanitizer for untrusted job copy (prompt-injection hygiene).

Regex is not sufficient alone (see OPSEC docs); this module is the fast first gate.
"""

from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass
from typing import Pattern

_HONEY_PATTERNS: tuple[Pattern[str], ...] = (
    re.compile(
        r"start\s+your\s+(?:proposal|response|reply|cover\s*letter)\s+with\s+['\"]([^'\"]{1,120})['\"]",
        re.IGNORECASE,
    ),
    re.compile(
        r"begin\s+(?:your\s+)?(?:proposal|response|reply)\s+with\s+['\"]([^'\"]{1,120})['\"]",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:open|start)\s+with\s+the\s+(?:phrase|words?)\s+['\"]([^'\"]{1,120})['\"]",
        re.IGNORECASE,
    ),
)

_TOKEN_SUB_PATTERNS: tuple[tuple[str, str], ...] = (
    (r"\[INST\][\s\S]*?\[/INST\]", "[STRIPPED]"),
    (r"<\|im_start\|>[\s\S]*?<\|im_end\|>", "[STRIPPED]"),
    (r"<\|im_start\|>[\s\S]*?(?=<\|im_start\|>|$)", "[STRIPPED]"),
    (r"<<<\s*SYS\s*>>>[\s\S]*?<<<\s*/SYS\s*>>>", "[STRIPPED]"),
    (r"(?im)^\s*System\s*:\s*.*$", "[STRIPPED]"),
    (r"(?im)^\s*Human\s*:\s*.*$", "[STRIPPED]"),
    (r"(?im)^\s*Assistant\s*:\s*.*$", "[STRIPPED]"),
    (r"(?im)^\s*User\s*:\s*.*$", "[STRIPPED]"),
)

_SUSPICIOUS_LINE_PATTERNS: tuple[Pattern[str], ...] = (
    re.compile(
        r"^.*\bignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?\b.*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    re.compile(r"^.*\breset\s+(?:your\s+)?instructions?\b.*$", re.IGNORECASE | re.MULTILINE),
    re.compile(
        r"^.*\b(?:reveal|disclose|tell\s+me)\s+(?:your\s+)?(?:system\s+)?prompt\b.*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    re.compile(
        r"^.*\boverride\s+(?:safety|security|guidelines?)\b.*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    re.compile(
        r"^.*\byou\s+are\s+now\s+(?:in\s+)?(?:developer|debug|admin)\s+mode\b.*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    re.compile(
        r"^.*\bDAN\s+mode\b.*$",
        re.IGNORECASE | re.MULTILINE,
    ),
)


@dataclass(frozen=True, slots=True)
class SanitizeResult:
    sanitized_text: str
    risk_score: float
    stripped_token_hits: int
    suspicious_line_hits: int


def extract_proposal_keywords(text: str) -> list[str]:
    if not text or not isinstance(text, str):
        return []
    found: list[str] = []
    seen: set[str] = set()
    for pat in _HONEY_PATTERNS:
        for m in pat.finditer(text):
            g = (m.group(1) or "").strip()
            if len(g) >= 2 and g.lower() not in seen:
                seen.add(g.lower())
                found.append(g)
    return found


def _apply_token_scrub(text: str) -> tuple[str, int]:
    out = text
    hits = 0
    for pat, repl in _TOKEN_SUB_PATTERNS:
        new_out, n = re.subn(pat, repl, out, flags=re.IGNORECASE)
        if n:
            hits += n
            out = new_out
    return out, hits


def _apply_suspicious_lines(text: str) -> tuple[str, int]:
    out = text
    total = 0
    for pat in _SUSPICIOUS_LINE_PATTERNS:
        new_out, n = pat.subn("[STRIPPED]", out)
        if n:
            total += n
            out = new_out
    return out, total


def _risk_from_hits(token_hits: int, suspicious_hits: int) -> float:
    r = 0.0
    r += min(0.45, token_hits * 0.12)
    r += min(0.65, suspicious_hits * 0.22)
    return max(0.0, min(1.0, r))


class TextSanitizer:
    __slots__ = ("_max_chars",)

    def __init__(self, max_chars: int = 4000) -> None:
        self._max_chars = max(1, int(max_chars))

    def sanitize(self, text: str) -> SanitizeResult:
        if not isinstance(text, str):
            text = ""
        raw = text[: self._max_chars]
        scrubbed, th = _apply_token_scrub(raw)
        cleaned, sh = _apply_suspicious_lines(scrubbed)
        risk = _risk_from_hits(th, sh)
        return SanitizeResult(
            sanitized_text=cleaned.strip(),
            risk_score=risk,
            stripped_token_hits=th,
            suspicious_line_hits=sh,
        )

    async def sanitize_async(self, text: str) -> SanitizeResult:
        return await asyncio.to_thread(self.sanitize, text)
