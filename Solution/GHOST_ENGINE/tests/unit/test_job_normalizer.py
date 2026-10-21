"""Tests for scoring JobNormalizer funnel."""

from __future__ import annotations

import json

from ghost_engine.scoring.normalizer import (
    JobNormalizer,
    normalize_upwork_job_signals,
    normalized_job_keys,
)


def test_normalize_from_json_string_and_smart_budget_hourly() -> None:
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
                    "stats": {"totalCharges": 100.0, "score": 4.8},
                    "isPaymentMethodVerified": True,
                },
                "similarJobs": [],
            }
        }
    }
    n = JobNormalizer()
    rows = n.normalize(json.dumps(payload))
    assert len(rows) == 1
    r = rows[0]
    assert r["budget"] == 25.0
    assert r["hourly_rate"] == "10-25"
    assert r["country"] == "USA"
    assert r["total_spent"] == 100.0
    assert r["client_rating"] == 4.8
    assert r["is_verified"] is True
    for k in normalized_job_keys():
        assert k in r


def test_normalize_fixed_budget_unchanged_when_no_hourly_range() -> None:
    payload = {
        "data": {
            "jobPubDetails": {
                "opening": {
                    "description": "D",
                    "info": {"id": "2", "title": "Fixed job", "type": "FIXED"},
                    "budget": {"amount": 500.0},
                    "extendedBudgetInfo": {
                        "hourlyBudgetMin": None,
                        "hourlyBudgetMax": None,
                    },
                },
                "buyer": {"location": {"country": "UK"}, "stats": {}},
            }
        }
    }
    rows = JobNormalizer().normalize(payload)
    assert rows[0]["budget"] == 500.0
    assert rows[0]["client_rating"] is None


def test_invalid_json_returns_empty() -> None:
    assert JobNormalizer().normalize("{not json") == []


def test_non_upwork_site_returns_empty_until_parser_exists() -> None:
    payload = {
        "data": {
            "jobPubDetails": {
                "opening": {
                    "description": "D",
                    "info": {"id": "1", "title": "T"},
                    "budget": {"amount": 1.0},
                },
                "buyer": {},
            }
        }
    }
    assert JobNormalizer(site_id="contra").normalize(payload) == []


def test_alternate_data_job_opening_path() -> None:
    payload = {
        "data": {
            "job": {
                "opening": {
                    "description": "Alt",
                    "info": {"id": "3", "title": "Alt title", "type": "HOURLY"},
                    "budget": {"amount": 0.0},
                    "extendedBudgetInfo": {"hourlyBudgetMin": 5.0, "hourlyBudgetMax": 15.0},
                }
            }
        }
    }
    rows = JobNormalizer().normalize(payload)
    assert len(rows) == 1
    assert rows[0]["title"] == "Alt title"
    assert rows[0]["budget"] == 15.0


def test_saved_search_card_nested_hourly_budget_flows_to_budget_value() -> None:
    payload = {
        "data": {
            "userSavedSearches": {
                "results": [
                    {
                        "id": "2042643142203514858",
                        "ciphertext": "~022042643142203514858",
                        "title": "Cloudflare Configuration Specialist Needed",
                        "description": "x" * 80,
                        "type": "HOURLY",
                        "amount": {"amount": "0.0"},
                        "hourlyBudget": {"type": "DEFAULT", "min": 20.0, "max": 50.0},
                    }
                ]
            }
        }
    }
    rows = JobNormalizer().normalize(payload)
    assert len(rows) == 1
    assert rows[0]["hourly_rate"] == "20-50"
    assert rows[0]["budget"] == 50.0


def test_fixed_job_zero_hourly_stub_does_not_wipe_amount() -> None:
    """Listing cards may carry hourlyBudget 0–0 on FIXED jobs; fixed amount must stay."""
    payload = {
        "data": {
            "userSavedSearches": {
                "results": [
                    {
                        "id": "fixed-stub-hr",
                        "title": "Fixed with zero hourly stub",
                        "description": "d" * 80,
                        "type": "FIXED",
                        "amount": {"amount": "300.0"},
                        "hourlyBudget": {"type": None, "min": 0.0, "max": 0.0},
                    }
                ]
            }
        }
    }
    rows = JobNormalizer().normalize(payload)
    assert len(rows) == 1
    assert rows[0]["budget"] == 300.0


def test_saved_search_per_row_client_rating_without_buyer() -> None:
    """Feed rows: each card's client_avg_rating must not be replaced by a single batch buyer score."""
    payload = {
        "data": {
            "userSavedSearches": {
                "results": [
                    {
                        "id": "a1",
                        "title": "One",
                        "description": "d" * 50,
                        "amount": {"amount": 100.0},
                        "client": {"totalFeedback": 4.9, "totalSpent": {"rawValue": "1", "currency": "USD"}},
                    },
                    {
                        "id": "a2",
                        "title": "Two",
                        "description": "e" * 50,
                        "amount": {"amount": 200.0},
                        "client": {"totalFeedback": 3.1, "totalSpent": {"rawValue": "2", "currency": "USD"}},
                    },
                ]
            }
        }
    }
    rows = JobNormalizer().normalize(payload)
    assert rows[0]["client_rating"] == 4.9
    assert rows[1]["client_rating"] == 3.1


def test_normalize_upwork_job_signals_listing_fills_feedback_count() -> None:
    payload = {
        "data": {
            "userSavedSearches": {
                "results": [
                    {
                        "id": "z1",
                        "title": "T",
                        "description": "d" * 80,
                        "amount": {"amount": 50.0},
                        "client": {
                            "totalSpent": {"rawValue": "500", "currency": "USD"},
                            "paymentVerificationStatus": 1,
                            "totalReviews": 37,
                            "totalFeedback": 4.5,
                        },
                    }
                ]
            }
        }
    }
    sigs = normalize_upwork_job_signals(payload, "upwork")
    assert len(sigs) == 1
    st = sigs[0].get("client_stats")
    assert isinstance(st, dict)
    assert st.get("feedback_count") == 37
    assert st.get("client_feedback_score") == 4.5


def test_normalize_upwork_job_signals_job_auth_details_gri_and_qualifications() -> None:
    """RJP payload: no jobPubDetails — opening for GRI must be opening.job; qualifications on opening."""
    payload = {
        "data": {
            "jobAuthDetails": {
                "buyer": {
                    "location": {"country": "USA"},
                    "stats": {"score": 4.5, "feedbackCount": 28},
                    "paymentVerificationStatus": True,
                },
                "opening": {
                    "qualifications": {
                        "countries": ["US"],
                        "minHoursWeek": None,
                        "minOdeskHours": 10.0,
                        "locationCheckRequired": True,
                    },
                    "job": {
                        "status": "ACTIVE",
                        "postedOn": "2026-04-10T12:00:00.000Z",
                        "description": "x" * 120,
                        "info": {
                            "id": "2042703052912320897",
                            "ciphertext": "~022042703052912320897",
                            "type": "FIXED",
                            "title": "Browser Automation",
                        },
                        "budget": {"amount": 150.0},
                        "extendedBudgetInfo": {
                            "hourlyBudgetMin": 0.0,
                            "hourlyBudgetMax": 0.0,
                        },
                        "clientActivity": {
                            "totalApplicants": 3,
                            "totalHired": 0,
                            "totalInvitedToInterview": 0,
                        },
                    },
                },
            }
        }
    }
    sigs = normalize_upwork_job_signals(payload, "upwork")
    assert len(sigs) == 1
    s = sigs[0]
    assert str(s.get("job_id")) == "2042703052912320897"
    assert s.get("budget_value") == 150.0
    assert s.get("total_applicants") == 3
    assert s.get("qualification_min_hours_week") == 10.0
    assert s.get("qualification_countries") == ["US"]
    assert s.get("qualification_location_check_required") is True
    st = s.get("client_stats")
    assert isinstance(st, dict)
    assert st.get("feedback_count") == 28
    assert st.get("client_feedback_score") == 4.5


def test_normalize_upwork_job_signals_returns_all_search_edges() -> None:
    """Feed / Load More: one GraphQL body with many edges → many signals (not only jobs[0])."""
    payload = {
        "data": {
            "jobSearch": {
                "edges": [
                    {
                        "node": {
                            "id": "111",
                            "title": "First",
                            "description": "a" * 50,
                            "amount": {"amount": 100.0},
                        }
                    },
                    {
                        "node": {
                            "id": "222",
                            "title": "Second",
                            "description": "b" * 50,
                            "amount": {"amount": 200.0},
                        }
                    },
                ]
            }
        }
    }
    sigs = normalize_upwork_job_signals(payload, "upwork", sniffed_at="2026-01-01T00:00:00+00:00")
    assert len(sigs) == 2
    ids = {str(s.get("job_id")) for s in sigs}
    assert ids == {"111", "222"}
