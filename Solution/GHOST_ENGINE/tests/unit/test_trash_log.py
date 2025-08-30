"""Trash JSONL writer and record builder."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from ghost_engine.scoring.trash_log import (
    REASON_INSUFFICIENT_SIGNAL,
    append_trash_entry,
    build_trash_record,
)


def test_build_trash_record_sanitizes_title_and_budget() -> None:
    sig = {
        "job_id": "j1",
        "title": "  [INST]x[/INST]  Visible title  ",
        "budget_value": "99.5",
    }
    rec = build_trash_record(sig, "upwork", "BUDGET_TOO_LOW", detail="DROP: test")
    assert rec["job_id"] == "j1"
    assert rec["site_id"] == "upwork"
    assert rec["reason_code"] == "BUDGET_TOO_LOW"
    assert rec["budget"] == 99.5
    assert "[INST]" not in (rec["title"] or "")
    assert "Visible title" in (rec["title"] or "")
    assert rec["detail"] == "DROP: test"
    assert "run_id" not in rec

    rec2 = build_trash_record(sig, "upwork", "X", run_id="abc-uuid")
    assert rec2["run_id"] == "abc-uuid"


def test_append_trash_entry_creates_jsonl_line(tmp_path) -> None:
    sig = {"job_id": "x2", "title": "T", "budget_value": None}
    rec = build_trash_record(sig, "contra", REASON_INSUFFICIENT_SIGNAL)
    append_trash_entry("contra", rec, root=tmp_path)
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    path = tmp_path / "data" / "contra" / "trash" / day / "events.jsonl"
    assert path.is_file()
    line = path.read_text(encoding="utf-8").strip()
    parsed = json.loads(line)
    assert parsed["reason_code"] == REASON_INSUFFICIENT_SIGNAL
    assert parsed["job_id"] == "x2"
