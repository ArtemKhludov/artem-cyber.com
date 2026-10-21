"""Tests for L0/L1 scoring engine and JobSignal normalization."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from ghost_engine.scoring.engine import (
    L0_CODE_BLACKLISTED_COUNTRY,
    L0_CODE_CLOSED_JOB,
    L0_CODE_MISSING_BUDGET_DROP,
    L0_CODE_SOFT_HOLD_MISSING_BUDGET,
    L0_CODE_BUDGET_TOO_LOW,
    L0_CODE_FORBIDDEN_ILLEGAL_PHRASE,
    L0_CODE_PLATFORM_TOS_VIOLATION,
    L0_CODE_LOW_AVG_HOURLY_PAID,
    L0_CODE_LOW_HIRE_RATE,
    L0_CODE_LOW_RATING,
    L0_CODE_LOW_TOTAL_SPENT,
    L0_CODE_NO_PROVEN_CLIENT_SPEND,
    L0_CODE_NO_CONFIG,
    L0_CODE_PASS,
    L0_CODE_PAYMENT_UNVERIFIED,
    L0_CODE_TOXIC_FREELANCER_FEEDBACK,
    TAG_SECURITY_VALUED,
    ScoringEngine,
)
from ghost_engine.scoring.normalizer import (
    normalize_job_signal,
    normalize_upwork_job,
    scoring_signal_nonempty,
)


def _minimal_l0() -> dict:
    return {
        "l0_filters": {
            "blacklisted_countries": ["India"],
            "min_client_rating": 4.0,
            "require_payment_verified": False,
            "min_budget": 100,
            "override_blacklist_min_budget": 10000,
            "drop_closed_openings": False,
            "missing_budget_policy": "pass",
        },
        "l1_weights": {
            "keyword_match_bonus": 20,
            "keyword_terms": ["python"],
            "vip_client_spent_threshold": 50000,
            "vip_client_bonus": 50,
            "budget_above_median_bonus": 10,
            "budget_median_reference": 500,
            "preferred_country_bonus": 15,
            "preferred_countries": ["USA"],
            "stop_words": ["wordpress"],
            "stop_word_penalty": 50,
        },
    }


def test_l0_forbidden_illegal_phrase_drops() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["global_forbidden_phrases"] = ["bypass 2FA", "crack account"]
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "ill",
        "title": "Need help",
        "description": "Someone must bypass 2FA on a wallet",
        "budget_value": 500.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }
    ok, code, detail = eng.evaluate_l0_with_code(sig)
    assert ok is False
    assert code == L0_CODE_FORBIDDEN_ILLEGAL_PHRASE
    assert "bypass 2FA" in detail or "bypass 2fa" in detail.lower()


def test_l0_forbidden_phrase_case_insensitive() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["global_forbidden_phrases"] = ["DDoS attack"]
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "x",
        "title": "URGENT DDOS ATTACK needed",
        "description": "",
        "budget_value": 500.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is False and code == L0_CODE_FORBIDDEN_ILLEGAL_PHRASE


def test_l0_contextual_veto_youtube_smm() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["contextual_vetoes"] = [
        {
            "code": "YOUTUBE_SMM_NOT_DEV",
            "when_all": ["youtube"],
            "when_any": ["social media", "smm"],
            "unless_any": ["parser", "scraping"],
        }
    ]
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "y1",
        "title": "YouTube social media manager",
        "description": "Grow our channel",
        "budget_value": 500.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is False
    assert code == "CTX_YOUTUBE_SMM_NOT_DEV"


def test_l0_smm_manager_role_drops() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["contextual_vetoes"] = [
        {
            "code": "SMM_ROLE_NOT_DEV",
            "when_any": ["social media manager"],
            "unless_any": ["api", "python", "automation"],
        }
    ]
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "sm1",
        "title": "Social Media Manager for Games",
        "description": "Daily posts and engagement",
        "budget_value": 500.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is False
    assert code == "CTX_SMM_ROLE_NOT_DEV"


def test_l0_cold_caller_lead_qualification_passes() -> None:
    """fix_1 narrative: Real Estate + lead qualification stays in funnel."""
    cfg = _minimal_l0()
    cfg["l0_filters"]["contextual_vetoes"] = [
        {
            "code": "COLD_CALLING_PURE_SDR",
            "when_any": ["cold caller", "cold calling"],
            "unless_any": [
                "lead qualification",
                "artificial intelligence",
                "automation",
            ],
        }
    ]
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "re1",
        "title": "Real Estate Cold Caller, Need for Lead Qualification",
        "description": "Qualify cold leads for our team",
        "budget_value": 150.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is True


def test_l0_contextual_veto_escape_parser() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["contextual_vetoes"] = [
        {
            "code": "YOUTUBE_SMM_NOT_DEV",
            "when_all": ["youtube"],
            "when_any": ["social media"],
            "unless_any": ["parser"],
        }
    ]
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "y2",
        "title": "YouTube data parser",
        "description": "Extract captions via API for social media analytics",
        "budget_value": 500.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is True


def test_l0_blacklist_country() -> None:
    eng = ScoringEngine(_minimal_l0())
    sig = {
        "job_id": "a",
        "budget_value": 500.0,
        "client_stats": {"country": "India", "avg_rating": 5.0},
    }
    assert eng.evaluate_l0(sig) is False
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is False and code == L0_CODE_BLACKLISTED_COUNTRY


def test_l0_override_budget_skips_blacklist() -> None:
    eng = ScoringEngine(_minimal_l0())
    sig = {
        "job_id": "b",
        "budget_value": 15000.0,
        "client_stats": {"country": "India", "avg_rating": 5.0},
    }
    assert eng.evaluate_l0(sig) is True
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is True and code == L0_CODE_PASS


def test_l0_payment_verified_false_drops() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["require_payment_verified"] = True
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "c",
        "budget_value": 500.0,
        "client_stats": {
            "country": "USA",
            "avg_rating": 5.0,
            "is_payment_verified": False,
        },
    }
    assert eng.evaluate_l0(sig) is False
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is False and code == L0_CODE_PAYMENT_UNVERIFIED


def test_evaluate_l0_with_code_no_l0_config() -> None:
    eng = ScoringEngine({})
    sig = {"job_id": "z", "client_stats": {}}
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is True and code == L0_CODE_NO_CONFIG


def test_evaluate_l0_with_code_budget_too_low() -> None:
    eng = ScoringEngine(_minimal_l0())
    sig = {
        "job_id": "lowbud",
        "budget_value": 10.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is False and code == L0_CODE_BUDGET_TOO_LOW


def test_l0_min_budget_hourly_floor() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["min_budget_hourly"] = 20
    cfg["l0_filters"]["min_budget_fixed"] = 150
    del cfg["l0_filters"]["min_budget"]
    eng = ScoringEngine(cfg)
    low = {
        "job_id": "h1",
        "budget_type": "hourly",
        "budget_value": 15.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }
    ok, code, _ = eng.evaluate_l0_with_code(low)
    assert ok is False and code == L0_CODE_BUDGET_TOO_LOW
    ok, code, _ = eng.evaluate_l0_with_code({**low, "budget_value": 25.0})
    assert ok is True and code == L0_CODE_PASS


def test_l0_min_budget_fixed_floor() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["min_budget_hourly"] = 20
    cfg["l0_filters"]["min_budget_fixed"] = 150
    del cfg["l0_filters"]["min_budget"]
    eng = ScoringEngine(cfg)
    low = {
        "job_id": "f1",
        "budget_type": "fixed",
        "budget_value": 100.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }
    ok, code, _ = eng.evaluate_l0_with_code(low)
    assert ok is False and code == L0_CODE_BUDGET_TOO_LOW
    ok, code, _ = eng.evaluate_l0_with_code({**low, "budget_value": 200.0})
    assert ok is True and code == L0_CODE_PASS


def test_evaluate_l0_with_code_low_rating() -> None:
    eng = ScoringEngine(_minimal_l0())
    sig = {
        "job_id": "lr",
        "budget_value": 500.0,
        "client_stats": {"country": "USA", "avg_rating": 3.0},
    }
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is False and code == L0_CODE_LOW_RATING


def test_collect_upsell_tags_legacy_terms_dict() -> None:
    """``upsell_triggers`` must be a dict; ``terms`` matches → ``TAG_SECURITY_VALUED``."""
    cfg = _minimal_l0()
    cfg["upsell_triggers"] = {
        "min_client_total_spent": 0,
        "terms": ["docker", "kubernetes"],
    }
    eng = ScoringEngine(cfg)
    sig = {"title": "DevOps", "description": "Need kubernetes helm", "client_stats": {}}
    assert eng.collect_upsell_tags(sig) == [TAG_SECURITY_VALUED]


def test_collect_upsell_tags_clusters_dict() -> None:
    """``upsell_triggers.clusters`` adds uppercase cluster keys when any term hits the blob."""
    cfg = _minimal_l0()
    cfg["upsell_triggers"] = {
        "min_client_total_spent": 0,
        "clusters": {
            "DevSecOps": ["kubernetes security", "checkov"],
            "SOAR": ["wazuh"],
        },
        "terms": ["api"],
    }
    eng = ScoringEngine(cfg)
    sig = {
        "title": "Cloud API hardening",
        "description": "We need kubernetes security and checkov in CI",
        "client_stats": {},
    }
    tags = eng.collect_upsell_tags(sig)
    assert "DEVSECOPS" in tags
    assert "SOAR" not in tags
    assert TAG_SECURITY_VALUED in tags


def test_collect_upsell_tags_min_spent_gate() -> None:
    cfg = _minimal_l0()
    cfg["upsell_triggers"] = {
        "terms": ["aws"],
        "min_client_total_spent": 5000,
    }
    eng = ScoringEngine(cfg)
    sig = {
        "title": "AWS lambda",
        "description": "",
        "client_stats": {"total_spent": 100.0},
    }
    assert eng.collect_upsell_tags(sig) == []
    sig2 = {
        "title": "AWS lambda",
        "description": "",
        "client_stats": {"total_spent": 10000.0},
    }
    assert eng.collect_upsell_tags(sig2) == [TAG_SECURITY_VALUED]


def test_l1_keyword_and_clamp() -> None:
    eng = ScoringEngine(_minimal_l0())
    sig = {
        "job_id": "d",
        "title": "Need python automation",
        "description": "Playwright",
        "budget_value": 600.0,
        "client_stats": {"country": "USA", "total_spent": 60000.0, "avg_rating": 5.0},
    }
    s = eng.evaluate_l1(sig)
    assert 0 <= s <= 100
    assert s >= 20


def test_normalize_upwork_job_shape() -> None:
    payload = {
        "data": {
            "jobPubDetails": {
                "opening": {
                    "description": "Desc",
                    "info": {"id": "1", "title": "T", "type": "HOURLY"},
                    "budget": {"amount": 0.0},
                    "extendedBudgetInfo": {
                        "hourlyBudgetMin": 10.0,
                        "hourlyBudgetMax": 25.0,
                    },
                },
                "buyer": {
                    "location": {"country": "USA"},
                    "stats": {
                        "totalCharges": 100.0,
                        "score": 4.8,
                        "feedbackCount": 3,
                        "avgHourlyRatePaid": 22.0,
                    },
                    "isPaymentMethodVerified": True,
                },
            }
        }
    }
    sig = normalize_upwork_job(payload)
    assert sig["job_id"] == "1"
    assert sig["budget_type"] == "hourly"
    assert sig["budget_value"] == 25.0
    assert sig["client_stats"]["country"] == "USA"
    assert sig["client_stats"]["avg_hourly_rate_paid"] == 22.0
    assert sig["client_stats"]["feedback_count"] == 3
    assert sig["client_stats"]["client_feedback_score"] == 4.8
    assert sig["source_site"] == "upwork"


def test_l0_drops_low_avg_hourly_rate_paid_when_exposed() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["min_avg_hourly_rate_paid"] = 15.0
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "e",
        "budget_value": 500.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0, "avg_hourly_rate_paid": 8.0},
    }
    assert eng.evaluate_l0(sig) is False
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is False and code == L0_CODE_LOW_AVG_HOURLY_PAID


def test_l0_passes_when_avg_hourly_rate_paid_missing() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["min_avg_hourly_rate_paid"] = 15.0
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "f",
        "budget_value": 500.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }
    assert eng.evaluate_l0(sig) is True


def test_l0_drops_low_client_total_spent_when_exposed() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["min_client_total_spent"] = 500.0
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "sp",
        "budget_value": 500.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0, "total_spent": 100.0},
    }
    assert eng.evaluate_l0(sig) is False
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is False and code == L0_CODE_LOW_TOTAL_SPENT


def test_l0_passes_when_total_spent_missing_with_min_spent_configured() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["min_client_total_spent"] = 500.0
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "sp2",
        "budget_value": 500.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }
    assert eng.evaluate_l0(sig) is True


def test_l0_drops_when_require_proven_client_spend_and_spent_missing_or_zero() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["require_proven_client_spend"] = True
    eng = ScoringEngine(cfg)
    sig_missing = {
        "job_id": "np1",
        "budget_value": 500.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }
    ok, code, _ = eng.evaluate_l0_with_code(sig_missing)
    assert ok is False and code == L0_CODE_NO_PROVEN_CLIENT_SPEND
    sig_zero = {
        "job_id": "np2",
        "budget_value": 500.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0, "total_spent": 0.0},
    }
    ok2, code2, _ = eng.evaluate_l0_with_code(sig_zero)
    assert ok2 is False and code2 == L0_CODE_NO_PROVEN_CLIENT_SPEND
    sig_ok = {
        "job_id": "np3",
        "budget_value": 500.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0, "total_spent": 50.0},
    }
    ok3, code3, _ = eng.evaluate_l0_with_code(sig_ok)
    assert ok3 is True and code3 == L0_CODE_PASS


def test_l0_drops_low_client_hire_rate_when_exposed() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["min_client_hire_rate"] = 0.25
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "hr",
        "budget_value": 500.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0, "hire_rate": 0.1},
    }
    assert eng.evaluate_l0(sig) is False
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is False and code == L0_CODE_LOW_HIRE_RATE


def test_l0_passes_when_hire_rate_missing_with_min_hire_configured() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["min_client_hire_rate"] = 0.25
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "hr2",
        "budget_value": 500.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }
    assert eng.evaluate_l0(sig) is True


def test_l0_drops_toxic_freelancer_feedback() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["min_freelancer_client_rating"] = 4.0
    eng = ScoringEngine(cfg)
    bad = {
        "job_id": "g",
        "budget_value": 500.0,
        "client_stats": {
            "country": "USA",
            "avg_rating": 5.0,
            "feedback_count": 2,
            "client_feedback_score": 3.5,
        },
    }
    assert eng.evaluate_l0(bad) is False
    ok, code, _ = eng.evaluate_l0_with_code(bad)
    assert ok is False and code == L0_CODE_TOXIC_FREELANCER_FEEDBACK
    good = {
        "job_id": "h",
        "budget_value": 500.0,
        "client_stats": {
            "country": "USA",
            "avg_rating": 5.0,
            "feedback_count": 0,
            "client_feedback_score": 0.0,
        },
    }
    assert eng.evaluate_l0(good) is True


def test_l0_drop_closed_opening_when_enabled() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["drop_closed_openings"] = True
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "cl",
        "title": "x",
        "description": "y",
        "budget_value": 500.0,
        "opening_status": "CLOSED",
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is False and code == L0_CODE_CLOSED_JOB


def test_l0_missing_budget_drop_policy() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["missing_budget_policy"] = "drop"
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "mb",
        "title": "x",
        "description": "y",
        "budget_value": None,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is False and code == L0_CODE_MISSING_BUDGET_DROP


def test_l0_missing_budget_soft_hold_passes() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["missing_budget_policy"] = "soft_hold"
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "sh",
        "title": "x",
        "description": "y",
        "budget_value": None,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is True and code == L0_CODE_SOFT_HOLD_MISSING_BUDGET


def test_l1_heavy_stop_word_penalty() -> None:
    cfg = _minimal_l0()
    cfg["l1_weights"]["heavy_stop_words"] = ["homework", "exam"]
    cfg["l1_weights"]["heavy_stop_word_penalty"] = 100
    cfg["gri"] = {"enabled": False}
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "i",
        "title": "Need CS homework done tonight",
        "description": "python",
        "budget_value": 600.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }
    score, parts, _extras = eng.evaluate_l1_with_breakdown(sig)
    assert any(p.startswith("heavy_stop:") for p in parts)
    assert score == 0


def test_normalize_job_signal_generic_site() -> None:
    payload = {
        "data": {
            "feed": {
                "items": [
                    {
                        "title": "Build API",
                        "description": "REST",
                        "id": "x1",
                        "amount": {"amount": 300.0},
                    }
                ]
            }
        }
    }
    sig = normalize_job_signal("contra", payload)
    assert sig["source_site"] == "contra"
    assert sig["job_id"] == "x1"
    assert sig["title"] == "Build API"
    assert scoring_signal_nonempty(sig) is True


def test_scoring_signal_nonempty_false_for_empty() -> None:
    sig = {
        "job_id": None,
        "title": None,
        "description": None,
        "budget_type": "unknown",
        "budget_value": None,
        "client_stats": {},
        "source_site": "toptal",
    }
    assert scoring_signal_nonempty(sig) is False


def test_normalize_upwork_job_pub_details_gri_fields() -> None:
    repo = Path(__file__).resolve().parents[2]
    path = (
        repo
        / "data"
        / "upwork"
        / "jobs"
        / "2026-04-01"
        / "10-41-07-d66628f4-f3e8-4f04-96f2-24135cfc4f8c.json"
    )
    if not path.is_file():
        pytest.skip(f"missing fixture {path}")
    raw = json.loads(path.read_text(encoding="utf-8"))
    sig = normalize_job_signal("upwork", raw)
    assert sig.get("posted_at")
    assert sig.get("total_applicants") == 0
    assert sig.get("invitations_sent") == 20
    assert sig.get("invited_to_interview") == 6
    assert sig.get("number_of_positions_to_hire") == 1
    assert sig.get("segmentation_employment_ongoing") is True
    assert sig.get("engagement_weeks") == 52
    assert sig.get("contractor_tier") == "INTERMEDIATE"
    skills = sig.get("ontology_skills")
    assert isinstance(skills, list) and len(skills) >= 1
    assert any("Social Media" in str(x.get("prefLabel", "")) for x in skills if isinstance(x, dict))
    assert sig.get("qualification_location_check_required") is True
    assert sig.get("qualification_countries") == ["United States"]
    assert sig.get("last_buyer_activity")
    assert sig.get("opening_status") == "CLOSED"
    cs = sig.get("client_stats") or {}
    assert cs.get("total_spent") is None
    assert cs.get("total_jobs_with_hires") == 1
    assert cs.get("buyer_open_jobs_count") == 0


def test_l0_platform_tos_phrase_drop() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["upwork_tos_violation_phrases"] = ["payment outside upwork"]
    cfg["l0_filters"]["upwork_tos_site_ids"] = ["upwork"]
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "tos1",
        "title": "Dev",
        "description": "We pay payment outside upwork only.",
        "budget_value": 500.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
        "source_site": "upwork",
    }
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is False and code == L0_CODE_PLATFORM_TOS_VIOLATION


def test_l0_upwork_tos_ignored_on_non_upwork_site() -> None:
    cfg = _minimal_l0()
    cfg["l0_filters"]["upwork_tos_violation_phrases"] = ["payment outside upwork"]
    cfg["l0_filters"]["upwork_tos_site_ids"] = ["upwork"]
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "tos2",
        "title": "Dev",
        "description": "We pay payment outside upwork only.",
        "budget_value": 500.0,
        "client_stats": {"country": "USA", "avg_rating": 5.0},
        "source_site": "contra",
    }
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert code != L0_CODE_PLATFORM_TOS_VIOLATION


def _gri_stub_for_l0_impute() -> dict:
    return {
        "micro_budget_max": 5.0,
        "budget_ref_for_norm": 5000.0,
        "estimated_hours_default": 10.0,
        "median_fallback_budget": 500.0,
        "impute_from_total_spent_factor": 0.02,
    }


def test_l0_imputed_hourly_overrides_blacklist_when_enabled() -> None:
    cfg = _minimal_l0()
    cfg["gri"] = _gri_stub_for_l0_impute()
    cfg["l0_filters"]["override_blacklist_use_imputed_budget"] = True
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "imbl",
        "hourly_budget_max": 1000.0,
        "client_stats": {"country": "India", "avg_rating": 5.0},
    }
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is True and code == L0_CODE_PASS


def test_l0_imputed_override_disabled_still_blacklists() -> None:
    cfg = _minimal_l0()
    cfg["gri"] = _gri_stub_for_l0_impute()
    cfg["l0_filters"]["override_blacklist_use_imputed_budget"] = False
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "imbl2",
        "hourly_budget_max": 1000.0,
        "client_stats": {"country": "India", "avg_rating": 5.0},
    }
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is False and code == L0_CODE_BLACKLISTED_COUNTRY


def test_l0_min_spent_exempt_when_verified_and_imputed_high() -> None:
    cfg = _minimal_l0()
    cfg["gri"] = _gri_stub_for_l0_impute()
    cfg["l0_filters"]["min_client_total_spent"] = 500.0
    cfg["l0_filters"]["min_client_total_spent_exempt_if_payment_verified"] = True
    cfg["l0_filters"]["min_client_total_spent_exempt_min_imputed_usd"] = 4000.0
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "mex",
        "hourly_budget_max": 500.0,
        "client_stats": {
            "country": "USA",
            "avg_rating": 5.0,
            "total_spent": 100.0,
            "is_payment_verified": True,
        },
    }
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is True and code == L0_CODE_PASS


def test_l0_min_spent_exempt_requires_payment_verified() -> None:
    cfg = _minimal_l0()
    cfg["gri"] = _gri_stub_for_l0_impute()
    cfg["l0_filters"]["min_client_total_spent"] = 500.0
    cfg["l0_filters"]["min_client_total_spent_exempt_if_payment_verified"] = True
    cfg["l0_filters"]["min_client_total_spent_exempt_min_imputed_usd"] = 4000.0
    eng = ScoringEngine(cfg)
    sig = {
        "job_id": "mex2",
        "hourly_budget_max": 500.0,
        "client_stats": {
            "country": "USA",
            "avg_rating": 5.0,
            "total_spent": 100.0,
            "is_payment_verified": False,
        },
    }
    ok, code, _ = eng.evaluate_l0_with_code(sig)
    assert ok is False and code == L0_CODE_LOW_TOTAL_SPENT
