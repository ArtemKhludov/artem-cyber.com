"""llm_cascade tier selection, footprint scan, and Gemini pipeline (mocked)."""

from __future__ import annotations

from typing import Any

import pytest
from pydantic import SecretStr

from ghost_engine.negotiation import llm_cascade
from ghost_engine.negotiation.llm_cascade import (
    CoverLetterGenResult,
    generate_cover_letter_async,
    select_gemini_model_for_job,
)
from ghost_engine.negotiation.output_footprint import scan_output_footprints
from ghost_engine.scoring.engine import TAG_SECURITY_VALUED
from ghost_engine.scoring.safety import SafetyReport


def test_select_pro_when_security_tag() -> None:
    cfg = {
        "cascade": {
            "tier_1_model": "gemini-2.0-flash",
            "tier_2_model": "gemini-1.5-pro",
            "min_l1_score_for_pro": 70,
        }
    }
    m, tier = select_gemini_model_for_job([TAG_SECURITY_VALUED], 10, llm_config=cfg)
    assert tier == "pro"
    assert m == "gemini-1.5-pro"


def test_select_pro_when_l1_high() -> None:
    cfg = {
        "cascade": {
            "tier_1_model": "flash-x",
            "tier_2_model": "pro-x",
            "min_l1_score_for_pro": 70,
        }
    }
    m, tier = select_gemini_model_for_job([], 85, llm_config=cfg)
    assert tier == "pro" and m == "pro-x"


def test_select_flash_by_default() -> None:
    cfg = {
        "cascade": {
            "tier_1_model": "flash-x",
            "tier_2_model": "pro-x",
            "min_l1_score_for_pro": 70,
        }
    }
    m, tier = select_gemini_model_for_job([], 50, llm_config=cfg)
    assert tier == "flash" and m == "flash-x"


def test_select_pro_when_long_description() -> None:
    cfg = {
        "cascade": {
            "tier_1_model": "flash-x",
            "tier_2_model": "pro-x",
            "min_l1_score_for_pro": 70,
            "min_description_chars_for_pro": 100,
        }
    }
    m, tier = select_gemini_model_for_job([], 10, 200, llm_config=cfg)
    assert tier == "pro" and m == "pro-x"


def test_select_respects_gemini_alias_block() -> None:
    cfg = {
        "cascade": {
            "tier_1_model": "wrong-flash",
            "tier_2_model": "wrong-pro",
            "gemini": {"flash_model": "alias-flash", "pro_model": "alias-pro"},
            "min_l1_score_for_pro": 70,
        }
    }
    m_f, t_f = select_gemini_model_for_job([], 10, llm_config=cfg)
    assert t_f == "flash" and m_f == "alias-flash"
    m_p, t_p = select_gemini_model_for_job([TAG_SECURITY_VALUED], 0, llm_config=cfg)
    assert t_p == "pro" and m_p == "alias-pro"


def test_ops_fallback_gemini_model_is_flash_tier() -> None:
    cfg = {
        "cascade": {
            "tier_1_model": "flash-x",
            "tier_2_model": "pro-x",
            "min_l1_score_for_pro": 70,
        }
    }
    assert llm_cascade.ops_fallback_gemini_model(llm_config=cfg) == "flash-x"


def test_footprint_detects_ai_meta() -> None:
    hits = scan_output_footprints("Hello, as an AI I suggest we use Python.")
    assert any("ai_meta" in h for h in hits)


def test_footprint_detects_ghost() -> None:
    hits = scan_output_footprints("Built with GHOST_ENGINE internally.")
    assert any("ghost" in h.lower() for h in hits)


@pytest.mark.asyncio
async def test_generate_ok_path(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeSettings:
        gemini_api_key = SecretStr("fake-key")
        llm_config = {
            "cascade": {
                "tier_1_model": "m-flash",
                "tier_2_model": "m-pro",
                "min_l1_score_for_pro": 70,
            }
        }

    monkeypatch.setattr(llm_cascade, "get_settings", lambda: FakeSettings())

    async def fake_gen(*a: Any, **kw: Any) -> tuple[str | None, str | None]:
        return "Experienced Python developer. Happy to discuss timeline.", None

    monkeypatch.setattr(llm_cascade, "_gemini_generate_async", fake_gen)
    async def fake_cover_safe(*a: Any, **kw: Any) -> SafetyReport:
        return SafetyReport(is_safe=True, risk_level="low", reason="ok")

    monkeypatch.setattr(
        "ghost_engine.scoring.safety.check_cover_output_safety_async",
        fake_cover_safe,
    )

    r = await generate_cover_letter_async(
        rendered_prompt="prompt",
        job_tags=[],
        l1_score=10,
        site_id="upwork",
        notify_on_api_error=False,
    )
    assert isinstance(r, CoverLetterGenResult)
    assert r.ok is True
    assert r.cover_letter_text and "Python" in r.cover_letter_text
    assert r.latency_ms is not None and r.latency_ms >= 0


@pytest.mark.asyncio
async def test_generate_fails_footprint(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeSettings:
        gemini_api_key = SecretStr("fake-key")
        llm_config = {"cascade": {"tier_1_model": "m", "tier_2_model": "p", "min_l1_score_for_pro": 70}}

    monkeypatch.setattr(llm_cascade, "get_settings", lambda: FakeSettings())

    async def bad_gen(*a: Any, **kw: Any) -> tuple[str | None, str | None]:
        return "As an AI language model I will help.", None

    monkeypatch.setattr(llm_cascade, "_gemini_generate_async", bad_gen)

    r = await generate_cover_letter_async(
        rendered_prompt="x",
        job_tags=[],
        l1_score=0,
        site_id="upwork",
        notify_on_api_error=False,
    )
    assert r.ok is False
    assert r.error_code == "output_footprint"


@pytest.mark.asyncio
async def test_generate_api_error_notifies(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeSettings:
        gemini_api_key = SecretStr("fake-key")
        llm_config = {"cascade": {"tier_1_model": "m", "tier_2_model": "p", "min_l1_score_for_pro": 70}}

    monkeypatch.setattr(llm_cascade, "get_settings", lambda: FakeSettings())

    async def fail_gen(*a: Any, **kw: Any) -> tuple[str | None, str | None]:
        return None, "http_402:quota"

    monkeypatch.setattr(llm_cascade, "_gemini_generate_async", fail_gen)

    sent: list[dict[str, Any]] = []

    async def capture(**kw: Any) -> None:
        sent.append(kw)

    monkeypatch.setattr(
        "ghost_engine.telegram.operator_alert.send_operator_text_alert",
        capture,
    )

    r = await generate_cover_letter_async(
        rendered_prompt="x",
        job_tags=[],
        l1_score=0,
        site_id="upwork",
        notify_on_api_error=True,
    )
    assert r.ok is False
    assert r.error_code == "gemini_failed"
    assert len(sent) == 1
    assert "Gemini API error" in sent[0]["text"]
