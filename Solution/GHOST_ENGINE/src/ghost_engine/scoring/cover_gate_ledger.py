"""
Cover-letter LangGraph traversal: render → Gemini → typography → footprint → judge.
"""

from __future__ import annotations

from typing import Any, Mapping


def _row(
    gate: str,
    outcome: str,
    code: str,
    why: str,
    proceeds: bool,
    next_step: str,
) -> dict[str, Any]:
    return {
        "gate": gate,
        "outcome": outcome,
        "code": code,
        "why": why,
        "proceeds": proceeds,
        "next": next_step,
    }


def _finalize(steps: list[dict[str, Any]], flow_continues: bool) -> dict[str, Any]:
    parts = [f"{s['gate']}:{s['outcome']}({s['code']})→{s['next']}" for s in steps]
    return {
        "pipeline": "cover_letter",
        "steps": steps,
        "summary_ru": " | ".join(parts),
        "flow_continues": flow_continues,
    }


def build_cover_traversal_report(state: Mapping[str, Any]) -> dict[str, Any]:
    """
    Interpret final dict from ``ainvoke_cover_letter_graph`` (full state, not merge-only).
    """
    steps: list[dict[str, Any]] = []

    if not state.get("cover_letter_prompt_rendered"):
        steps.append(
            _row(
                "render",
                "fail",
                "NO_PROMPT",
                "Шаблон/данные не собрали cover_letter_prompt_rendered",
                False,
                "Граф завершён на START→render; письмо не генерировалось",
            )
        )
        return _finalize(steps, False)

    steps.append(
        _row(
            "render",
            "pass",
            "OK",
            "Промпт для LLM собран",
            True,
            "Узел Gemini (если не skip_llm)",
        )
    )

    if state.get("cover_letter_pipeline_skip_llm"):
        steps.append(
            _row(
                "gemini",
                "skip",
                "SKIP_LLM",
                "Политика пайплайна или отсутствие ключа / nested loop",
                False,
                "END: уведомление может уйти без текста письма",
            )
        )
        return _finalize(steps, False)

    if state.get("cover_letter_gemini_error"):
        err = str(state.get("cover_letter_gemini_error") or "")[:240]
        steps.append(
            _row(
                "gemini",
                "fail",
                "GEMINI_ERROR",
                err or "Ошибка generateContent",
                False,
                "END: needs_manual_review, черновик без API",
            )
        )
        return _finalize(steps, False)

    steps.append(
        _row(
            "gemini",
            "pass",
            "OK",
            "Черновик получен (cover_letter_draft_raw)",
            True,
            "typography → footprint → judge",
        )
    )

    draft = state.get("cover_letter_draft")
    fp_blocked = bool(state.get("cover_letter_footprint_blocked"))
    if not (isinstance(draft, str) and draft.strip()):
        if fp_blocked:
            steps.append(
                _row(
                    "typography",
                    "fail",
                    "NO_DRAFT",
                    "Нет текста после typography; footprint пометил блокировку",
                    False,
                    "END: needs_manual_review",
                )
            )
        else:
            steps.append(
                _row(
                    "typography",
                    "fail",
                    "NO_DRAFT",
                    "После typography нет текста",
                    False,
                    "Остановка перед footprint",
                )
            )
        return _finalize(steps, False)

    steps.append(
        _row(
            "typography",
            "pass",
            "OK",
            "Типографика применена",
            True,
            "Проверка footprint regex",
        )
    )

    if fp_blocked:
        steps.append(
            _row(
                "footprint",
                "fail",
                "FOOTPRINT_HIT",
                "Сработали запрещённые паттерны в тексте",
                False,
                "END: needs_manual_review",
            )
        )
        return _finalize(steps, False)

    steps.append(
        _row(
            "footprint",
            "pass",
            "OK",
            "Отпечатков нет",
            True,
            "Ollama output judge",
        )
    )

    final_text = state.get("cover_letter_text")
    meta = state.get("cover_letter_llm_meta")
    blocked_by_judge = isinstance(meta, dict) and meta.get("error_code") == "output_safety"
    if blocked_by_judge or not (isinstance(final_text, str) and final_text.strip()):
        steps.append(
            _row(
                "judge",
                "fail",
                "OUTPUT_SAFETY" if blocked_by_judge else "NO_FINAL_TEXT",
                "Судья Ollama заблокировал или финальный текст пуст" if blocked_by_judge else "Нет cover_letter_text",
                False,
                "END: письмо не в продакшен-поле",
            )
        )
        return _finalize(steps, False)

    steps.append(
        _row(
            "judge",
            "pass",
            "OK",
            "Текст одобрен судьёй",
            True,
            "Redis notify с cover_letter",
        )
    )
    return _finalize(steps, True)
