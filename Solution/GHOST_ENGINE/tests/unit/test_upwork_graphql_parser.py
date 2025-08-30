"""Unit tests for Upwork GraphQL defensive parser."""

from __future__ import annotations

from ghost_engine.adapters.upwork_graphql_parser import (
    canonical_keys,
    normalize_listing_card,
    normalize_opening_job,
    parse_upwork_graphql_payload,
)


def test_canonical_keys_order() -> None:
    keys = canonical_keys()
    assert keys == (
        "id",
        "title",
        "description",
        "budget",
        "hourly_rate",
        "engagement_type",
        "country",
        "is_verified",
        "total_spent",
        "client_total_hires",
        "client_jobs_posted",
        "client_avg_rating",
        "client_total_reviews",
        "total_applicants",
    )


def test_parse_non_dict_returns_empty() -> None:
    assert parse_upwork_graphql_payload(None) == []
    assert parse_upwork_graphql_payload([]) == []
    assert parse_upwork_graphql_payload("x") == []


def test_parse_job_pub_details_opening_and_similar() -> None:
    payload = {
        "data": {
            "jobPubDetails": {
                "opening": {
                    "postedOn": "2026-03-15T08:00:00.000Z",
                    "description": "Do work",
                    "info": {
                        "id": "1978541375273687431",
                        "ciphertext": "~021978541375273687431",
                        "title": "Marketer",
                        "type": "HOURLY",
                    },
                    "budget": {"amount": 100.0, "currencyCode": "USD"},
                    "extendedBudgetInfo": {
                        "hourlyBudgetMin": 10.0,
                        "hourlyBudgetMax": 25.0,
                    },
                },
                "buyer": {
                    "location": {"country": "USA", "city": "Orlando"},
                    "stats": {"totalCharges": 500.0},
                    "isPaymentMethodVerified": True,
                },
                "similarJobs": [
                    {
                        "id": None,
                        "ciphertext": "~021969043400770771693",
                        "title": "Other job",
                        "description": "Other desc",
                        "amount": {"amount": 0.0},
                        "hourlyBudgetMin": 5.0,
                        "hourlyBudgetMax": 10.0,
                        "type": "HOURLY",
                    }
                ],
            }
        }
    }
    rows = parse_upwork_graphql_payload(payload)
    assert len(rows) == 2

    opening = rows[0]
    assert opening["id"] == "1978541375273687431"
    assert opening["title"] == "Marketer"
    assert opening["description"] == "Do work"
    assert opening["budget"] == 100.0
    assert opening["hourly_rate"] == "10-25"
    assert opening["country"] == "USA"
    assert opening["is_verified"] is True
    assert opening["total_spent"] == 500.0
    assert opening.get("posted_at") == "2026-03-15T08:00:00.000Z"

    sim = rows[1]
    assert sim["id"] == "~021969043400770771693"
    assert sim["hourly_rate"] == "5-10"
    assert sim["country"] == "USA"


def test_parse_standalone_similar_jobs() -> None:
    payload = {
        "data": {
            "similarJobs": [
                {
                    "ciphertext": "~abc",
                    "title": "T",
                    "description": "D",
                    "amount": {"amount": 50.0},
                    "hourlyBudgetMin": 0.0,
                    "hourlyBudgetMax": 0.0,
                }
            ]
        }
    }
    rows = parse_upwork_graphql_payload(payload)
    assert len(rows) == 1
    assert rows[0]["id"] == "~abc"
    assert rows[0]["budget"] == 50.0
    assert rows[0]["country"] is None


def test_normalize_opening_missing_nested_no_keyerror() -> None:
    rec = normalize_opening_job({}, None)
    for k in canonical_keys():
        assert k in rec
        assert rec[k] is None


def test_listing_card_posted_at_passthrough() -> None:
    node = {
        "ciphertext": "~0abc",
        "title": "T",
        "description": "D",
        "postedOn": "2026-04-01T10:00:00.000Z",
        "amount": {"amount": 10.0},
        "hourlyBudgetMin": 1.0,
        "hourlyBudgetMax": 2.0,
    }
    rec = normalize_listing_card(node, None)
    assert rec.get("posted_at") == "2026-04-01T10:00:00.000Z"


def test_listing_card_rich_client_wins_over_weak_buyer() -> None:
    """Card-level client with spend/verification must override sparse jobPubDetails.buyer."""
    weak_buyer: dict = {
        "location": {"country": "USA"},
        "stats": {},
        "isPaymentMethodVerified": False,
    }
    node = {
        "ciphertext": "~card",
        "title": "T",
        "description": "D",
        "amount": {"amount": 100.0},
        "client": {
            "location": {"country": "Germany"},
            "totalSpent": {"rawValue": "5000", "currency": "USD"},
            "paymentVerificationStatus": 1,
            "totalReviews": 42,
        },
    }
    rec = normalize_listing_card(node, weak_buyer)
    assert rec["country"] == "Germany"
    assert rec["total_spent"] == 5000.0
    assert rec["is_verified"] is True
    assert rec["client_total_reviews"] == 42


def test_listing_card_embedded_client_feed_shape() -> None:
    """userSavedSearches / jobSearch nodes carry client on the card, not only jobPubDetails.buyer."""
    node = {
        "id": "2042669369291004581",
        "ciphertext": "~022042669369291004581",
        "title": "Web Data Scraping of auction site",
        "description": "Scrape auction data " * 15,
        "type": "FIXED",
        "amount": {"amount": "250.0"},
        "totalApplicants": 35,
        "client": {
            "totalHires": 86,
            "totalPostedJobs": 84,
            "totalSpent": {"rawValue": "8774.5", "currency": "USD"},
            "paymentVerificationStatus": 1,
            "location": {"country": "Poland"},
            "totalFeedback": 4.93,
            "totalReviews": 120,
        },
    }
    rec = normalize_listing_card(node, buyer=None)
    assert rec["country"] == "Poland"
    assert rec["is_verified"] is True
    assert rec["total_spent"] == 8774.5
    assert rec["client_total_hires"] == 86
    assert rec["client_jobs_posted"] == 84
    assert rec["client_avg_rating"] == 4.93
    assert rec["client_total_reviews"] == 120
    assert rec["total_applicants"] == 35


def test_listing_card_nested_hourly_budget_object() -> None:
    """Feed/saved-search nodes use hourlyBudget{{min,max}}; amount.amount is often 0 for HOURLY."""
    node = {
        "id": "2042643142203514858",
        "ciphertext": "~022042643142203514858",
        "title": "Cloudflare Configuration Specialist Needed",
        "description": "Fix DNS",
        "type": "HOURLY",
        "amount": {"amount": "0.0"},
        "hourlyBudget": {"type": "DEFAULT", "min": 20.0, "max": 50.0},
    }
    rec = normalize_listing_card(node, None)
    assert rec["hourly_rate"] == "20-50"


def test_listing_card_top_level_hourly_wins_over_nested_when_both() -> None:
    node = {
        "ciphertext": "~x",
        "title": "T",
        "description": "D",
        "amount": {"amount": 0.0},
        "hourlyBudgetMin": 15.0,
        "hourlyBudgetMax": 25.0,
        "hourlyBudget": {"min": 1.0, "max": 2.0},
    }
    rec = normalize_listing_card(node, None)
    assert rec["hourly_rate"] == "15-25"


def test_normalize_listing_card_uses_ciphertext_when_id_null() -> None:
    node = {
        "id": None,
        "ciphertext": "~x",
        "title": "A",
        "description": "B",
        "amount": {"amount": 1.0},
        "hourlyBudgetMin": None,
        "hourlyBudgetMax": None,
    }
    rec = normalize_listing_card(node, None)
    assert rec["id"] == "~x"


def test_dedupe_by_id() -> None:
    payload = {
        "data": {
            "jobPubDetails": {
                "opening": {
                    "description": "d",
                    "info": {"id": "same", "title": "t"},
                    "budget": {"amount": 1.0},
                },
                "buyer": {},
                "similarJobs": [
                    {
                        "id": "same",
                        "title": "dup",
                        "description": "x",
                        "amount": {"amount": 2.0},
                    }
                ],
            }
        }
    }
    rows = parse_upwork_graphql_payload(payload)
    assert len(rows) == 1


def test_job_auth_details_opening_job_shape() -> None:
    """Job page alias gql-query-get-auth-job-details nests fields under opening.job."""
    payload = {
        "data": {
            "jobAuthDetails": {
                "buyer": {
                    "isPaymentMethodVerified": True,
                    "stats": {"totalCharges": 100.0, "score": 4.5},
                },
                "opening": {
                    "job": {
                        "description": "Do the thing",
                        "budget": {"amount": 150.0, "currencyCode": "USD"},
                        "info": {
                            "id": "2042703052912320897",
                            "title": "Browser Automation",
                            "type": "FIXED",
                        },
                        "extendedBudgetInfo": {
                            "hourlyBudgetMin": 0.0,
                            "hourlyBudgetMax": 0.0,
                        },
                    }
                },
            }
        }
    }
    rows = parse_upwork_graphql_payload(payload)
    assert len(rows) == 1
    assert rows[0]["id"] == "2042703052912320897"
    assert rows[0]["budget"] == 150.0
    assert rows[0]["engagement_type"] == "FIXED"


def test_listing_fixed_degenerate_hourly_cleared() -> None:
    node = {
        "id": "1",
        "title": "T",
        "description": "D" * 50,
        "type": "FIXED",
        "amount": {"amount": 200.0},
        "hourlyBudget": {"min": 0.0, "max": 0.0},
    }
    rec = normalize_listing_card(node, None)
    assert rec["budget"] == 200.0
    assert rec["hourly_rate"] is None


def test_extra_data_roots_configurable(monkeypatch) -> None:
    from ghost_engine.adapters import upwork_graphql_parser as ugp

    monkeypatch.setattr(ugp, "_extra_graphql_list_roots", lambda: ("customJobList",))
    payload = {
        "data": {
            "customJobList": [
                {
                    "id": "99",
                    "title": "From extra root",
                    "description": "y" * 60,
                    "amount": {"amount": 10.0},
                }
            ]
        }
    }
    rows = parse_upwork_graphql_payload(payload)
    assert len(rows) == 1
    assert rows[0]["id"] == "99"
    assert rows[0]["title"] == "From extra root"


def test_user_saved_searches_results() -> None:
    """Find-work feed GraphQL often returns saved search hits under userSavedSearches.results."""
    payload = {
        "data": {
            "userSavedSearches": {
                "results": [
                    {
                        "id": "2041726643582158897",
                        "ciphertext": "~022041726643582158897",
                        "title": "Video Editor for Reels",
                        "description": "Long-term collaboration.",
                    }
                ]
            }
        }
    }
    rows = parse_upwork_graphql_payload(payload)
    assert len(rows) == 1
    assert rows[0]["title"] == "Video Editor for Reels"
    assert rows[0]["id"] == "2041726643582158897"
