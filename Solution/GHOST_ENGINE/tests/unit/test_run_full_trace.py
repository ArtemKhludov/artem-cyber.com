"""run_full_trace helpers (no browser)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from ghost_engine.browser import run_full_trace as rft


def test_full_trace_enabled_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GHOST_RUN_FULL_TRACE", raising=False)
    assert rft.full_trace_enabled() is False
    monkeypatch.setenv("GHOST_RUN_FULL_TRACE", "1")
    assert rft.full_trace_enabled() is True


def test_should_log_response_filters_binary(monkeypatch: pytest.MonkeyPatch) -> None:
    assert rft._should_log_response("https://www.upwork.com/x", "application/json", 200) is True
    assert rft._should_log_response("https://cdn.com/a.png", "image/png", 200) is False


def test_append_record_writes_jsonl(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GHOST_RUN_ID", "00000000-0000-4000-8000-000000000001")
    monkeypatch.setattr(rft, "_repo_root", lambda: tmp_path)
    rft._append_record({"kind": "test", "x": 1})
    p = tmp_path / "logs" / "runs" / "00000000-0000-4000-8000-000000000001" / "trace.jsonl"
    assert p.is_file()
    line = p.read_text(encoding="utf-8").strip()
    assert json.loads(line)["kind"] == "test"
