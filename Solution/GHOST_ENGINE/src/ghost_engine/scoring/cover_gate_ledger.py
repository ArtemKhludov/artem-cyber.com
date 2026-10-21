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
        "summary": " | ".join(parts),
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
                "Template/data did not produce cover_letter_prompt_rendered",
                False,
                "Graph ended at START→render; no letter generated",
            )
        )
        return _finalize(steps, False)

    steps.append(
        _row(
            "render",
            "pass",
            "OK",
            "LLM prompt assembled",
            True,
            "Gemini node (unless skip_llm)",
        )
    )

    if state.get("cover_letter_pipeline_skip_llm"):
        steps.append(
            _row(
                "gemini",
                "skip",
                "SKIP_LLM",
                "Pipeline policy, missing key, or nested loop",
                False,
                "END: notification may go out without letter text",
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
                err or "generateContent error",
                False,
                "END: needs_manual_review, draft without API",
            )
        )
        return _finalize(steps, False)

    steps.append(
        _row(
            "gemini",
            "pass",
            "OK",
            "Draft received (cover_letter_draft_raw)",
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
                    "No text after typography; footprint marked a block",
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
                    "No text after typography",
                    False,
                    "Stopped before footprint",
                )
            )
        return _finalize(steps, False)

    steps.append(
        _row(
            "typography",
            "pass",
            "OK",
            "Typography applied",
            True,
            "Footprint regex check",
        )
    )

    if fp_blocked:
        steps.append(
            _row(
                "footprint",
                "fail",
                "FOOTPRINT_HIT",
                "Forbidden patterns matched in text",
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
            "No footprints",
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
                "Ollama judge blocked it or final text is empty" if blocked_by_judge else "No cover_letter_text",
                False,
                "END: letter not written to production field",
            )
        )
        return _finalize(steps, False)

    steps.append(
        _row(
            "judge",
            "pass",
            "OK",
            "Text approved by judge",
            True,
            "Redis notify with cover_letter",
        )
    )
    return _finalize(steps, True)
