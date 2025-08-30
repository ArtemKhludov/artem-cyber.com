"""Deterministic outbound text cleanup (no LLM). Driven by negotiation_pipeline.yaml."""

from __future__ import annotations

import re
from typing import Any

from ghost_engine.utils.typography import clean_typography


def apply_outbound_typography(text: str, cfg: dict[str, Any] | None) -> str:
    """
    Apply optional normalizations to model output before guards / platform paste.

    ``cfg`` is the ``typography`` sub-mapping from ``negotiation_pipeline.yaml``.
    """
    if not text or not isinstance(text, str):
        return text or ""
    c = cfg if isinstance(cfg, dict) else {}
    if not c.get("enabled", True):
        return text
    out = clean_typography(text) if c.get("utils_clean", True) else text
    if c.get("replace_unicode_dashes", True):
        out = out.replace("\u2014", "-")  # em dash
        out = out.replace("\u2013", "-")  # en dash
        out = out.replace("\u2212", "-")  # minus
    if c.get("collapse_whitespace_runs", False):
        out = re.sub(r"[ \t]{2,}", " ", out)
        out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()
