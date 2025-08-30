"""Unit tests for GraphQL shape diagnostics helpers."""

from __future__ import annotations

from ghost_engine.ops.graphql_shape_diag import raw_payload_has_nested_listing_client


def test_raw_payload_detects_nested_client_spend() -> None:
    payload = {
        "data": {
            "userSavedSearches": {
                "results": [
                    {
                        "title": "Job",
                        "client": {"totalSpent": {"rawValue": "100", "currency": "USD"}},
                    }
                ]
            }
        }
    }
    assert raw_payload_has_nested_listing_client(payload) is True


def test_raw_payload_detects_payment_verification_only() -> None:
    payload = {"data": {"x": [{"client": {"paymentVerificationStatus": 1}}]}}
    assert raw_payload_has_nested_listing_client(payload) is True


def test_raw_payload_negative_empty() -> None:
    assert raw_payload_has_nested_listing_client({}) is False
    assert raw_payload_has_nested_listing_client({"data": {}}) is False
