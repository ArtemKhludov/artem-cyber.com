"""LangGraph shared state (TypedDict)."""

from __future__ import annotations

from typing import TypedDict


class AgentState(TypedDict, total=False):
    order_id: str
    site_id: str
    raw_json: dict[str, object]
    chat_history: list[dict[str, str]]
    confidence: float
    needs_handover: bool
    needs_manual_review: bool
    decision_logs: list[str]
    job_signal: dict[str, object]
    approved_jobs: list[dict[str, object]]
    required_keywords: list[str]
    l0_passed: bool
    l1_score: int
    cover_letter_security_addon: str
    cover_letter_prompt_rendered: str
    cover_letter_text: str
    cover_letter_llm_tier: str
    cover_letter_gemini_model: str
    cover_letter_llm_meta: dict[str, object]
    cover_letter_draft_raw: str
    cover_letter_draft: str
    cover_letter_footprint_blocked: bool
    cover_letter_gemini_error: str
    cover_letter_pipeline_skip_llm: bool
    cover_letter_pipeline_tags: list[str]
    cover_letter_pipeline_desc_len: int
    cover_letter_gen_t0: float
    scoring_traversal: dict[str, object]
    cover_pipeline_traversal: dict[str, object]
