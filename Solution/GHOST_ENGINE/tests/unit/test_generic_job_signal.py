"""Generic (non-Upwork) normalize_job_signal paths."""

from __future__ import annotations

from ghost_engine.scoring.normalizer import normalize_job_signal


def test_normalize_generic_uses_name_headline_and_body() -> None:
    payload = {
        "data": {
            "project": {
                "name": "Rebuild payment API",
                "body": "Need Stripe + idempotency keys.",
                "uuid": "proj-99",
                "minHourlyRate": 85,
                "maxHourlyRate": 120,
                "status": "open",
            }
        }
    }
    sig = normalize_job_signal("contra", payload)
    assert sig.get("title") == "Rebuild payment API"
    assert "idempotency" in (sig.get("description") or "")
    assert sig.get("job_id") == "proj-99"
    assert sig.get("budget_type") == "hourly"
    assert sig.get("budget_value") == 120.0
    assert sig.get("opening_status") == "OPEN"
    assert sig.get("source_site") == "contra"


def test_normalize_generic_fixed_price_paths() -> None:
    payload = {
        "data": {
            "gig": {
                "headline": "Terraform modules",
                "summary": "AWS only.",
                "id": "g1",
                "fixedPrice": 5000,
            }
        }
    }
    sig = normalize_job_signal("gun_io", payload)
    assert sig.get("title") == "Terraform modules"
    assert sig.get("budget_type") == "fixed"
    assert sig.get("budget_value") == 5000.0
