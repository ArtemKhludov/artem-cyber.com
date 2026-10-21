"""Telegram HTML formatting and inline keyboard constraints."""

from __future__ import annotations

from ghost_engine.notify.contract import ApprovedJobNotifyPayload
from ghost_engine.notify.operator_commands import action_context_hash
from ghost_engine.telegram.formatting import format_single_job_detailed
from ghost_engine.telegram.keyboards import job_action_keyboard


def test_format_single_job_shows_gri_prefix_and_tension() -> None:
    p = ApprovedJobNotifyPayload(
        site_id="upwork",
        l1_score=95,
        job_id="j2",
        job_signal={"title": "Amazon scraper", "budget_value": 750.0},
        notify_source="adapter_sniff",
        gri=0.92,
        persona_tag="sniper",
        opsec={"high_gri_opsec_tension": True, "semantic_is_safe": False},
        needs_manual_review=True,
    )
    s = format_single_job_detailed(p)
    assert "<b>Title:</b>" in s
    assert "<b>Score:</b>" in s and "0.92" in s
    assert "🔥" in s
    assert "High GRI" in s or "semantic" in s


def test_format_single_job_shows_public_url_link() -> None:
    p = ApprovedJobNotifyPayload(
        site_id="upwork",
        l1_score=80,
        job_id="j1",
        job_signal={"title": "Job"},
        notify_source="scoring_node",
        job_public_url="https://www.upwork.com/jobs/~xx/",
    )
    s = format_single_job_detailed(p)
    assert "URL:" in s
    assert 'href="https://www.upwork.com/jobs/~xx/"' in s


def test_format_single_job_detailed_escapes_title_and_cover() -> None:
    p = ApprovedJobNotifyPayload(
        site_id="upwork",
        l1_score=90,
        job_id="j1",
        job_signal={
            "title": "<b>x</b>",
            "budget_value": 100.0,
            "budget_currency": "USD",
            "country": "United States",
        },
        notify_source="scoring_node",
        cover_letter="Hello <tag>\nsecond",
    )
    s = format_single_job_detailed(p)
    assert "<b>x</b>" not in s
    assert "&lt;tag&gt;" in s


def test_job_action_keyboard_callback_data_under_telegram_limit() -> None:
    h = action_context_hash(idempotency_key="upwork:job-uuid-123", operator_chat_id=999001)
    kb = job_action_keyboard(h)
    for row in kb.inline_keyboard:
        for btn in row:
            assert len((btn.callback_data or "").encode("utf-8")) <= 64
