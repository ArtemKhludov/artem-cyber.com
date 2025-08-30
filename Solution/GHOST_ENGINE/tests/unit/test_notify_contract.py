"""Approved job notify payload contract."""

from __future__ import annotations

import pytest

from ghost_engine.notify.contract import ApprovedJobNotifyPayload
from ghost_engine.notify.payload_builder import build_notify_payload_from_adapter_signal
from ghost_engine.scoring.engine import TAG_SECURITY_VALUED


def test_idempotency_key_normalizes_site() -> None:
    p = ApprovedJobNotifyPayload(
        site_id=" Upwork ",
        l1_score=10,
        job_id="abc",
        job_signal={"title": "t"},
        notify_source="adapter_sniff",
    )
    assert p.idempotency_key == "upwork:abc"


def test_roundtrip_json() -> None:
    p = ApprovedJobNotifyPayload(
        site_id="contra",
        l1_score=55,
        job_id="j1",
        job_signal={"title": "Hello"},
        opsec={"regex_risk": 0.1},
        needs_manual_review=False,
        notify_source="scoring_node",
        cover_letter="Hello client,\nready to start.",
        job_public_url="https://www.upwork.com/jobs/~abc/",
        apply_strategy="dom_first",
    )
    raw = p.to_redis_json()
    back = ApprovedJobNotifyPayload.from_json_bytes(raw)
    assert back.model_dump(exclude_computed_fields=True) == p.model_dump(
        exclude_computed_fields=True
    )


def test_from_scoring_entry_job_tags() -> None:
    entry = {
        "job_id": "x",
        "site_id": "upwork",
        "l1_score": 10,
        "job_signal": {},
        "opsec": {},
        "needs_manual_review": False,
        "job_tags": [TAG_SECURITY_VALUED, "other"],
    }
    p = ApprovedJobNotifyPayload.from_scoring_entry(entry)
    assert TAG_SECURITY_VALUED in p.job_tags


def test_from_scoring_entry() -> None:
    entry = {
        "job_id": "x",
        "site_id": "upwork",
        "l1_score": 71,
        "job_signal": {"title": "t"},
        "opsec": {"semantic_is_safe": True},
        "needs_manual_review": True,
        "cover_letter": "  draft  ",
        "gri": 0.812,
        "persona_tag": "consultant",
        "job_tier": "MANUAL_REVIEW",
    }
    p = ApprovedJobNotifyPayload.from_scoring_entry(entry)
    assert p.notify_source == "scoring_node"
    assert p.l1_score == 71
    assert p.needs_manual_review is True
    assert p.cover_letter == "draft"
    assert p.gri == pytest.approx(0.812)
    assert p.persona_tag == "consultant"
    assert p.job_tier == "MANUAL_REVIEW"

def test_from_scoring_entry_estimates() -> None:
    entry = {
        "job_id": "x",
        "site_id": "upwork",
        "l1_score": 50,
        "job_signal": {"title": "t"},
        "opsec": {},
        "needs_manual_review": False,
        "estimated_price_usd": 300.0,
        "estimated_time_hours": 40.0,
        "estimate_confidence": 0.55,
    }
    p = ApprovedJobNotifyPayload.from_scoring_entry(entry)
    assert p.estimated_price_usd == pytest.approx(300.0)
    assert p.estimated_time_hours == pytest.approx(40.0)
    assert p.estimate_confidence == pytest.approx(0.55)


def test_from_scoring_entry_cover_letter_empty_string() -> None:
    entry = {
        "job_id": "x",
        "site_id": "upwork",
        "l1_score": 10,
        "job_signal": {},
        "opsec": {},
        "needs_manual_review": False,
        "cover_letter": "   ",
    }
    p = ApprovedJobNotifyPayload.from_scoring_entry(entry)
    assert p.cover_letter is None


def test_from_json_rejects_non_object() -> None:
    with pytest.raises(ValueError):
        ApprovedJobNotifyPayload.from_json_bytes("[]")


def test_adapter_builder_clamps_score() -> None:
    sig = {"job_id": "1", "title": "ok", "description": "d", "budget_value": 100.0}
    p = build_notify_payload_from_adapter_signal(sig, "upwork", 999)
    assert p.l1_score == 100
    assert p.notify_source == "adapter_sniff"
    assert p.job_tags == []


def test_adapter_builder_job_tags() -> None:
    sig = {"job_id": "1", "title": "ok", "description": "d", "budget_value": 100.0}
    p = build_notify_payload_from_adapter_signal(
        sig, "upwork", 50, job_tags=[TAG_SECURITY_VALUED]
    )
    assert TAG_SECURITY_VALUED in p.job_tags
