#!/usr/bin/env python3
"""
Summarize job scoring trash / notify-skip audit JSONL under data/<site>/trash/<day>/events.jsonl.

Examples:
  python scripts/audit_trash_stats.py
  python scripts/audit_trash_stats.py --site upwork --day 2026-04-07
  python scripts/audit_trash_stats.py --run-id 83f8847e-4e52-4130-85a1-bf737c91ae5f

Env GHOST_USE_LOCAL_TIME affects which folder is "today" (must match the browser run).
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def main() -> int:
    ap = argparse.ArgumentParser(description="Count trash JSONL rows and group by reason_code.")
    ap.add_argument("--site", default="upwork", help="site_id folder under data/")
    ap.add_argument(
        "--day",
        default="",
        help="YYYY-MM-DD trash subfolder; default: same as engine archive day",
    )
    ap.add_argument(
        "--run-id",
        default="",
        help="If set, count only lines whose JSON has matching run_id",
    )
    ap.add_argument(
        "--last",
        type=int,
        default=0,
        help="Print last N raw lines (after filters)",
    )
    args = ap.parse_args()
    root = _repo_root()
    if args.day.strip():
        day = args.day.strip()
    else:
        from ghost_engine.utils.data_layout import data_archive_day_str

        day = data_archive_day_str()

    path = root / "data" / args.site.strip() / "trash" / day / "events.jsonl"
    if not path.is_file():
        print(f"No file: {path}", file=sys.stderr)
        print("Hint: run dev_session with scoring; or pass --day for another UTC/local day.")
        return 1

    run_filter = (args.run_id or "").strip()
    reasons: Counter[str] = Counter()
    phases_notify = 0
    total = 0
    raw_last: list[str] = []

    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                reasons["__bad_json__"] += 1
                continue
            if run_filter and str(row.get("run_id") or "") != run_filter:
                continue
            total += 1
            rc = str(row.get("reason_code") or "?")
            reasons[rc] += 1
            if rc.startswith("NOTIFY_"):
                phases_notify += 1
            if args.last > 0:
                raw_last.append(line)
                if len(raw_last) > args.last:
                    raw_last.pop(0)

    print(f"path={path}")
    print(f"total_lines_matching={total}")
    if run_filter:
        print(f"run_id_filter={run_filter}")
    print("by_reason_code:")
    for rc, n in reasons.most_common():
        print(f"  {n:5d}  {rc}")
    if phases_notify:
        print(f"notify_gate_rows={phases_notify}  (Telegram not sent: below GRI tier threshold, etc.)")

    if args.last > 0 and raw_last:
        print(f"last_{args.last}_rows:")
        for ln in raw_last:
            print(ln)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
