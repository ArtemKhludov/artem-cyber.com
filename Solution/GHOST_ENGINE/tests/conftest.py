"""Pytest defaults: avoid writing operator audit JSONL during unit runs."""

from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def _disable_operator_action_jsonl(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GHOST_OPERATOR_ACTION_JSONL", "0")
