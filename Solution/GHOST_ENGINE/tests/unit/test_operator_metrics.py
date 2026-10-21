"""Operator dispatch metrics + JSONL audit (fix_1 §11)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from ghost_engine.notify import operator_metrics


def test_append_operator_action_jsonl_writes_line(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    p = tmp_path / "op.jsonl"
    monkeypatch.setenv("GHOST_OPERATOR_ACTION_JSONL", "1")
    monkeypatch.setenv("GHOST_OPERATOR_ACTION_LOG", str(p))
    operator_metrics.append_operator_action_jsonl({"action": "apply", "status": "apply_ok", "job_id": "j1"})
    assert p.is_file()
    line = p.read_text(encoding="utf-8").strip()
    row = json.loads(line)
    assert row["action"] == "apply"
    assert row["status"] == "apply_ok"
    assert row["job_id"] == "j1"
    assert "timestamp" in row
