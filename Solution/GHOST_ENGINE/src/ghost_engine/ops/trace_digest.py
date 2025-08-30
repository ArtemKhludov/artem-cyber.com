"""
Summarize ``logs/runs/<GHOST_RUN_ID>/trace.jsonl`` after a full-trace session.

Extracts navigation targets, GraphQL aliases, ``savePersonJob`` / apply flow signals,
and Cloudflare challenge hints — without loading the whole file into RAM.

Usage::

    python -m ghost_engine.ops.trace_digest
    python -m ghost_engine.ops.trace_digest /path/to/trace.jsonl

Env: ``GHOST_RUN_ID`` resolves default path under ``logs/runs/<id>/trace.jsonl``.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, parse_qs


def _default_trace_path() -> Path | None:
    import os

    rid = (os.environ.get("GHOST_RUN_ID") or "").strip()
    if not rid:
        return None
    root = Path(__file__).resolve().parents[3]
    p = root / "logs" / "runs" / rid / "trace.jsonl"
    return p if p.is_file() else None


def _alias_from_graphql_url(url: str) -> str | None:
    if "graphql" not in url.lower():
        return None
    q = parse_qs(urlparse(url).query)
    a = q.get("alias")
    if a and isinstance(a[0], str):
        return a[0]
    return None


def digest_trace_file(path: Path, *, max_save_samples: int = 8) -> dict[str, Any]:
    kinds: Counter[str] = Counter()
    nav_apply: list[str] = []
    nav_details: list[str] = []
    graphql_aliases: Counter[str] = Counter()
    cf_nav_hits = 0
    save_person_job_hits: list[dict[str, Any]] = []

    alias_re = re.compile(r"[?&]alias=([^&]+)")

    with path.open("r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(rec, dict):
                continue
            k = rec.get("kind")
            if isinstance(k, str):
                kinds[k] += 1

            if k == "navigation":
                u = rec.get("url")
                if isinstance(u, str):
                    if "/apply/" in u and "upwork.com" in u.lower():
                        nav_apply.append(u)
                        if "__cf_chl" in u or "challenges.cloudflare" in u.lower():
                            cf_nav_hits += 1
                    if "/details/~" in u or "Job%20Details" in u or "job-details" in u.lower():
                        nav_details.append(u[:300])

            if k == "http_response":
                u = rec.get("url")
                if isinstance(u, str) and "graphql" in u.lower():
                    al = _alias_from_graphql_url(u)
                    if al:
                        graphql_aliases[al] += 1
                    else:
                        m = alias_re.search(u)
                        if m:
                            graphql_aliases[m.group(1)] += 1
                js = rec.get("json")
                if isinstance(js, dict) and _has_save_person_job(js):
                    if len(save_person_job_hits) < max_save_samples:
                        save_person_job_hits.append(_extract_save_person_job(js))

    return {
        "path": str(path),
        "line_kinds": dict(kinds),
        "navigation_apply_urls_unique": len(set(nav_apply)),
        "navigation_apply_sample": list(dict.fromkeys(nav_apply))[:5],
        "cloudflare_tokens_in_apply_nav": cf_nav_hits,
        "job_details_nav_sample": nav_details[:3],
        "top_graphql_aliases": graphql_aliases.most_common(25),
        "save_person_job_samples": save_person_job_hits,
    }


def _has_save_person_job(obj: dict[str, Any]) -> bool:
    s = json.dumps(obj, ensure_ascii=False)
    return "savePersonJob" in s


def _extract_save_person_job(obj: dict[str, Any]) -> dict[str, Any]:
    """Shallow extract for operator visibility."""
    data = obj.get("data")
    if not isinstance(data, dict):
        return {"raw": "unstructured"}
    sp = data.get("savePersonJob")
    if isinstance(sp, dict):
        job = sp.get("job")
        jid = None
        if isinstance(job, dict):
            jid = job.get("id")
        return {"followed": sp.get("followed"), "job_id": jid}
    return {"keys": list(data.keys())[:12]}


def main() -> None:
    ap = argparse.ArgumentParser(description="Digest GHOST full trace JSONL")
    ap.add_argument(
        "trace_file",
        nargs="?",
        default="",
        help="Path to trace.jsonl (default: from GHOST_RUN_ID)",
    )
    args = ap.parse_args()
    if args.trace_file.strip():
        p = Path(args.trace_file)
    else:
        d = _default_trace_path()
        p = d if d is not None else Path()
    if not p.is_file():
        raise SystemExit(
            "trace.jsonl not found. Pass path or set GHOST_RUN_ID and run from repo root."
        )
    out = digest_trace_file(p)
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
