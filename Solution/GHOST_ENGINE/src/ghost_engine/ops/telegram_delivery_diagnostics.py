"""
Operational checklist: why a job may not reach Telegram after a sniff/scoring run.

Run one pass with ``GHOST_RUN_ID`` set and optionally ``GHOST_RUN_FULL_TRACE=1``, then:

1. Query PostgreSQL ``job_scoring_events`` for ``run_id`` / ``job_id`` / ``outcome``.
2. Inspect structlog for ``job.scoring_skip_notify`` (``adapter_notify_policy``) and
   ``job.scoring_gate`` (L0 / GRI path).
3. If Upwork DOM defer is on: ``notify.deferred_for_dom_url`` and pending queue
   (``ghost_engine.browser.pending_dom_notify``).
4. Compare on-disk ``data/<site_id>/trash/`` vs ``data/<site_id>/jobs/`` JSONL.

Environment: ``DATABASE_URL`` / settings database_url, ``GHOST_DB_SCORING_REGISTRY`` (default on).
"""

from __future__ import annotations

import argparse
import asyncio
import os
import uuid
from typing import Any

from sqlalchemy import select

from ghost_engine.db.models import JobScoringEvent
from ghost_engine.db.session import session_scope
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


async def fetch_job_scoring_events(
    *,
    run_id: uuid.UUID | None = None,
    job_id: str | None = None,
    site_id: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Return recent registry rows (newest first) for CLI / notebooks."""
    lim = max(1, min(limit, 500))
    async with session_scope() as session:
        stmt = select(JobScoringEvent).order_by(JobScoringEvent.created_at.desc()).limit(lim * 3)
        res = await session.execute(stmt)
        rows = res.scalars().all()
    out: list[dict[str, Any]] = []
    for ev in rows:
        if run_id is not None and ev.run_id != run_id:
            continue
        if job_id is not None and (ev.job_id or "").strip() != job_id.strip():
            continue
        if site_id is not None and (ev.site_id or "").strip().lower() != site_id.strip().lower():
            continue
        out.append(
            {
                "created_at": ev.created_at.isoformat() if ev.created_at else None,
                "run_id": str(ev.run_id) if ev.run_id else None,
                "site_id": ev.site_id,
                "job_id": ev.job_id,
                "outcome": ev.outcome,
                "gri": ev.gri,
                "job_tier": ev.job_tier,
                "l0_code": ev.l0_code,
                "skip_notify_reason": ev.skip_notify_reason,
                "artifact_relpath": ev.artifact_relpath,
            }
        )
        if len(out) >= lim:
            break
    return out


def _parse_run_id(raw: str) -> uuid.UUID | None:
    t = raw.strip()
    if not t:
        return None
    try:
        return uuid.UUID(t)
    except ValueError:
        return None


async def _cli_main() -> int:
    p = argparse.ArgumentParser(description="GHOST: job_scoring_events lookup for Telegram miss diagnosis")
    p.add_argument("--run-id", default=os.environ.get("GHOST_RUN_ID", ""), help="UUID (default: GHOST_RUN_ID)")
    p.add_argument("--job-id", default="", help="Filter by job_id")
    p.add_argument("--site-id", default="", help="Filter by site_id")
    p.add_argument("--limit", type=int, default=40)
    args = p.parse_args()
    rid = _parse_run_id(args.run_id)
    jid = args.job_id.strip() or None
    sid = args.site_id.strip() or None
    try:
        rows = await fetch_job_scoring_events(run_id=rid, job_id=jid, site_id=sid, limit=args.limit)
    except Exception as exc:
        log.error("telegram_delivery_diagnostics.query_failed", error=str(exc), error_type=type(exc).__name__)
        return 1
    if not rows:
        print("No rows (check DATABASE_URL, filters, or GHOST_DB_SCORING_REGISTRY=0).")
        return 0
    for r in rows:
        print(r)
    return 0


def main() -> None:
    raise SystemExit(asyncio.run(_cli_main()))


if __name__ == "__main__":
    main()
