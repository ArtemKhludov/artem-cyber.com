"""
Ops AI diagnosis cascade ledger (local text → local vision → API text only).

Stage ids: ollama_text | ollama_vision | gemini_text — align with ops_ai_diag.py.
"""

from __future__ import annotations

from typing import Any


STAGE_IDS = ("ollama_text", "ollama_vision", "gemini_text")

_STAGE_TITLES: dict[str, str] = {
    "ollama_text": "Ollama текст (локально)",
    "ollama_vision": "Ollama vision + скрин (локально)",
    "gemini_text": "Gemini текст без изображения (API)",
}


def format_ops_diag_stages_for_manager(stages_failed: list[tuple[str, str]]) -> list[str]:
    """Numbered lines for Telegram manager escalation (ops.system)."""
    lines: list[str] = []
    for i, (sid, outcome) in enumerate(stages_failed, start=1):
        title = _STAGE_TITLES.get(sid, sid)
        lines.append(f"  • {i}) {title}: {outcome}")
    return lines


def build_ops_diag_traversal_report(
    *,
    had_image: bool,
    source: str,
    all_failed: bool,
    stages_failed: list[tuple[str, str]],
) -> dict[str, Any]:
    """
    ``stages_failed``: ordered (stage_id, outcome_detail) for each attempted step that did not yield a brief.
    """
    if not all_failed:
        sid = {"ollama": "ollama_text", "ollama_vision": "ollama_vision", "gemini": "gemini_text"}.get(
            source, source
        )
        won = _STAGE_TITLES.get(sid, source)
        return {
            "pipeline": "ops_ai_diag",
            "had_image": had_image,
            "terminal_source": source,
            "all_failed": False,
            "steps": [{"gate": won, "outcome": "pass", "why": "Достаточный ответ для Telegram"}],
            "summary_ru": f"Успех на этапе: {won}",
        }

    steps = [
        {"gate": _STAGE_TITLES.get(sid, sid), "outcome": "fail", "why": why}
        for sid, why in stages_failed
    ]
    tail = "Все этапы исчерпаны; см. ops.system для менеджера и ops.errors."
    return {
        "pipeline": "ops_ai_diag",
        "had_image": had_image,
        "terminal_source": "none",
        "all_failed": True,
        "steps": steps,
        "summary_ru": " → ".join(f"{s['gate']}: {s['why']}" for s in steps) + f". {tail}",
    }
