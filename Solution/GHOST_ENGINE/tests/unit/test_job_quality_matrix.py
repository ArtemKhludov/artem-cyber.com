"""job_quality_matrix: post-GRI gate helpers."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from ghost_engine.scoring.job_quality_matrix import evaluate_job_quality_matrix


def _base_root(**overrides: object) -> dict:
    cfg = {
        "enabled": True,
        "site_ids": ["upwork"],
        "min_effective_total": 5,
        "min_client_pts": 1,
        "min_activity_pts": 0,
        "min_description_pts": 1,
        "max_penalty_points": 2,
        "hard_block_untrusted_client": True,
        "client": {
            "spend_strong_usd": 1000,
            "min_hires_for_spend_bonus": 1,
            "hire_rate_good": 0.5,
            "new_client_max_open_jobs": 3,
        },
        "activity": {
            "proposals_good_max": 10,
            "proposals_stall_min": 50,
            "freshness_max_hours": 48,
            "stale_job_min_hours": 168,
            "stale_buyer_gap_hours": 168,
        },
        "description": {
            "min_desc_chars_for_deliverable_hint": 220,
            "deliverable_markers": ["deliverable", "milestone"],
            "senior_keywords": ["senior"],
            "senior_min_budget_usd": 500,
            "complexity_keywords": ["automation"],
            "complexity_min_budget_usd": 100,
        },
    }
    cfg.update(overrides)
    return {"job_quality_matrix": cfg}


def _final(**kwargs: object) -> dict:
    now = datetime.now(UTC)
    base = {
        "job_signal": {
            "job_id": "job-1",
            "title": "Senior automation engineer",
            "description": "x" * 230 + "\ndeliverable\n1. step one\n2. step two",
            "source_site": "upwork",
            "budget_value": 800,
            "client_stats": {
                "total_spent": 5000,
                "hire_rate": 0.55,
                "is_payment_verified": True,
                "total_jobs_with_hires": 3,
                "buyer_open_jobs_count": 2,
            },
        },
        "total_applicants": 4,
        "posted_at": now.isoformat(),
        "last_buyer_activity": now.isoformat(),
    }
    base.update(kwargs)
    return base


def test_matrix_disabled_passes() -> None:
    root = _base_root(enabled=False)
    r = evaluate_job_quality_matrix(_final(), site_id="upwork", scoring_root=root)
    assert not r.enabled
    assert r.passed


def test_matrix_pass_strong_job() -> None:
    root = _base_root()
    r = evaluate_job_quality_matrix(_final(), site_id="upwork", scoring_root=root)
    assert r.enabled
    assert r.passed
    assert not r.blocking_reasons


def test_matrix_zero_trust_exempt_high_imputed_budget() -> None:
    root = _base_root(min_client_pts=0, zero_trust_exempt_min_budget_usd=1000)
    now = datetime.now(UTC)
    sig = {
        "job_id": "j-whale",
        "title": "Senior automation",
        "description": "x" * 230 + "\ndeliverable\n1. step",
        "source_site": "upwork",
        "budget_value": None,
        "hourly_budget_max": 150.0,
        "client_stats": {
            "total_spent": 0,
            "hire_rate": 0.0,
            "is_payment_verified": False,
        },
    }
    final = {
        "job_signal": sig,
        "gri_breakdown": {"B_raw": 5000.0, "B_source": "hourly_budget_max_x_hours"},
        "total_applicants": 4,
        "posted_at": now.isoformat(),
        "last_buyer_activity": now.isoformat(),
    }
    r = evaluate_job_quality_matrix(final, site_id="upwork", scoring_root=root)
    assert "MATRIX_HARD_ZERO_TRUST" not in r.blocking_reasons


def test_matrix_hard_zero_trust_and_client_min() -> None:
    root = _base_root()
    sig = {
        "job_id": "j2",
        "title": "Task",
        "description": "x" * 230 + "\ndeliverable\n1. step",
        "source_site": "upwork",
        "budget_value": 800,
        "client_stats": {
            "total_spent": 0,
            "hire_rate": 0.0,
            "is_payment_verified": False,
        },
    }
    now = datetime.now(UTC)
    final = {
        "job_signal": sig,
        "total_applicants": 4,
        "posted_at": now.isoformat(),
        "last_buyer_activity": now.isoformat(),
    }
    r = evaluate_job_quality_matrix(final, site_id="upwork", scoring_root=root)
    assert not r.passed
    assert "MATRIX_HARD_ZERO_TRUST" in r.blocking_reasons
    assert "MATRIX_CLIENT_BELOW_MIN" in r.blocking_reasons


def test_matrix_complexity_ignored_when_budget_unknown() -> None:
    root = _base_root(hard_block_untrusted_client=False)
    now = datetime.now(UTC)
    sig = {
        "job_id": "j3b",
        "title": "Automation help",
        "description": "x" * 230 + "\nmilestone\nworkflow integration\n1. step",
        "source_site": "upwork",
        "client_stats": {
            "total_spent": 2000,
            "hire_rate": 0.6,
            "is_payment_verified": True,
            "total_jobs_with_hires": 2,
        },
    }
    final = {
        "job_signal": sig,
        "total_applicants": 3,
        "posted_at": now.isoformat(),
        "last_buyer_activity": now.isoformat(),
    }
    r = evaluate_job_quality_matrix(final, site_id="upwork", scoring_root=root)
    assert "MATRIX_DESC_COMPLEXITY_BUDGET_LOW" not in r.blocking_reasons


def test_matrix_senior_budget_mismatch() -> None:
    root = _base_root(hard_block_untrusted_client=False)
    now = datetime.now(UTC)
    sig = {
        "job_id": "j3",
        "title": "Senior role",
        "description": "x" * 230 + "\nmilestone\n1. step",
        "source_site": "upwork",
        "budget_value": 50,
        "client_stats": {
            "total_spent": 2000,
            "hire_rate": 0.6,
            "is_payment_verified": True,
            "total_jobs_with_hires": 2,
        },
    }
    final = {
        "job_signal": sig,
        "total_applicants": 3,
        "posted_at": now.isoformat(),
        "last_buyer_activity": now.isoformat(),
    }
    r = evaluate_job_quality_matrix(final, site_id="upwork", scoring_root=root)
    assert not r.passed
    assert "MATRIX_DESC_SENIOR_BUDGET_MISMATCH" in r.blocking_reasons


def test_matrix_penalty_only_no_block_if_sum_ok() -> None:
    root = _base_root()
    now = datetime.now(UTC)
    sig = {
        "job_id": "j4",
        "title": "Role",
        "description": "x" * 230 + "\ndeliverable\n1. step",
        "source_site": "upwork",
        "budget_value": 900,
        "client_stats": {
            "total_spent": 3000,
            "hire_rate": 0.01,
            "is_payment_verified": True,
            "total_jobs_with_hires": 2,
            "buyer_open_jobs_count": 2,
        },
    }
    final = {
        "job_signal": sig,
        "total_applicants": 60,
        "invited_to_interview": 0,
        "posted_at": now.isoformat(),
        "last_buyer_activity": now.isoformat(),
    }
    r = evaluate_job_quality_matrix(final, site_id="upwork", scoring_root=root)
    assert r.passed
    assert r.penalty_hits >= 1
    assert not r.blocking_reasons


def test_matrix_stall_not_applied_when_invites_unknown() -> None:
    root = _base_root(min_effective_total=8)
    now = datetime.now(UTC)
    sig = {
        "job_id": "j4b",
        "title": "Role",
        "description": "x" * 230 + "\ndeliverable\n1. step",
        "source_site": "upwork",
        "budget_value": 900,
        "client_stats": {
            "total_spent": 3000,
            "hire_rate": 0.01,
            "is_payment_verified": True,
            "total_jobs_with_hires": 2,
            "buyer_open_jobs_count": 2,
        },
    }
    final = {
        "job_signal": sig,
        "total_applicants": 60,
        "posted_at": now.isoformat(),
        "last_buyer_activity": now.isoformat(),
    }
    r = evaluate_job_quality_matrix(final, site_id="upwork", scoring_root=root)
    assert r.penalty_hits == 0


def test_matrix_senior_passes_with_b_raw_from_gri_breakdown() -> None:
    root = _base_root(hard_block_untrusted_client=False)
    now = datetime.now(UTC)
    sig = {
        "job_id": "j6",
        "title": "Senior engineer",
        "description": "x" * 230 + "\nmilestone\n1. step",
        "source_site": "upwork",
        "hourly_budget_max": 150,
        "client_stats": {
            "total_spent": 2000,
            "hire_rate": 0.6,
            "is_payment_verified": True,
            "total_jobs_with_hires": 2,
        },
    }
    final = {
        "job_signal": sig,
        "gri_breakdown": {"B_raw": 6000.0, "B_source": "hourly_budget_max_x_hours"},
        "total_applicants": 3,
        "posted_at": now.isoformat(),
        "last_buyer_activity": now.isoformat(),
    }
    r = evaluate_job_quality_matrix(final, site_id="upwork", scoring_root=root)
    assert r.passed
    assert "MATRIX_DESC_SENIOR_BUDGET_MISMATCH" not in r.blocking_reasons


def test_matrix_stale_penalty_contributes_to_fail_reasons() -> None:
    root = _base_root(min_effective_total=8)
    old = datetime.now(UTC) - timedelta(hours=200)
    stale_buyer = datetime.now(UTC) - timedelta(hours=200)
    sig = {
        "job_id": "j5",
        "title": "Role",
        "description": "x" * 230 + "\ndeliverable\n1. step",
        "source_site": "upwork",
        "budget_value": 900,
        "client_stats": {
            "total_spent": 3000,
            "hire_rate": 0.55,
            "is_payment_verified": True,
            "total_jobs_with_hires": 2,
        },
    }
    final = {
        "job_signal": sig,
        "total_applicants": 5,
        "posted_at": old.isoformat(),
        "last_buyer_activity": stale_buyer.isoformat(),
    }
    r = evaluate_job_quality_matrix(final, site_id="upwork", scoring_root=root)
    assert not r.passed
    assert "MATRIX_PENALTY_STALE_JOB_BUYER" in r.blocking_reasons
    assert "MATRIX_EFFECTIVE_TOTAL_BELOW_MIN" in r.blocking_reasons
