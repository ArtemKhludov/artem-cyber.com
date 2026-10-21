"""Inbox unread count from GraphQL JSON fixtures."""

from __future__ import annotations

import json
from pathlib import Path

from ghost_engine.adapters.upwork_graphql_parser import try_parse_inbox_unread_count

_FIX = Path(__file__).resolve().parents[1] / "fixtures"


def _load(name: str) -> dict:
    path = _FIX / name
    with path.open(encoding="utf-8") as f:
        raw = json.load(f)
    assert isinstance(raw, dict)
    return raw


def test_fixture_viewer_inbox() -> None:
    assert try_parse_inbox_unread_count(_load("graphql_inbox_viewer_inbox.json")) == 4


def test_fixture_message_threads() -> None:
    assert try_parse_inbox_unread_count(_load("graphql_inbox_message_threads.json")) == 2


def test_fixture_max_when_multiple_fields() -> None:
    assert try_parse_inbox_unread_count(_load("graphql_inbox_max_of_fields.json")) == 7


def test_unknown_shape_returns_none() -> None:
    assert try_parse_inbox_unread_count({"data": {"viewer": {"unread": 1}}}) is None
    assert try_parse_inbox_unread_count({}) is None
