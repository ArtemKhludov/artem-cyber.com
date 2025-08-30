"""Delete old ``job_scoring_events`` rows and optional stale files under ``data/*/jobs`` / ``graphql_raw``."""

from __future__ import annotations

import asyncio
import os
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import delete

from ghost_engine.adapters.graphql_raw_storage import prune_stale_graphql_raw_files
from ghost_engine.db.models import JobScoringEvent
from ghost_engine.db.session import session_scope
from ghost_engine.utils.logger import configure_logging, get_logger

log = get_logger(__name__)

_REPO_ROOT = Path(__file__).resolve().parents[3]


async def cleanup_database(*, retention_days: int, noise_retention_days: int) -> int:
    raw_noise = (os.environ.get("GHOST_DB_NOISE_OUTCOMES") or "").strip()
    noise_outcomes = frozenset(x.strip() for x in raw_noise.split(",") if x.strip())
    now = datetime.now(UTC)
    default_cutoff = now - timedelta(days=max(1, retention_days))
    noise_cutoff = now - timedelta(days=max(1, noise_retention_days))
    async with session_scope() as session:
        if noise_outcomes:
            cond = (
                (
                    JobScoringEvent.outcome.in_(list(noise_outcomes))
                    & (JobScoringEvent.created_at < noise_cutoff)
                )
                | (
                    ~JobScoringEvent.outcome.in_(list(noise_outcomes))
                    & (JobScoringEvent.created_at < default_cutoff)
                )
            )
        else:
            cond = JobScoringEvent.created_at < default_cutoff
        r = await session.execute(delete(JobScoringEvent).where(cond))
        removed = r.rowcount or 0
        await session.commit()
    log.info("db_cleanup.job_scoring_events", removed=removed)
    return removed


def cleanup_data_jobs_files(*, retention_days: int, site_glob: str) -> int:
    try:
        days = max(1, int(retention_days))
    except ValueError:
        days = 90
    cutoff = time.time() - days * 86400
    data_root = _REPO_ROOT / "data"
    if not data_root.is_dir():
        return 0
    deleted = 0
    for site_dir in data_root.iterdir():
        if not site_dir.is_dir():
            continue
        if site_glob != "*" and site_dir.name != site_glob:
            continue
        jobs_root = site_dir / "jobs"
        if not jobs_root.is_dir():
            continue
        for day_dir in jobs_root.iterdir():
            if not day_dir.is_dir():
                continue
            for f in day_dir.glob("*.json"):
                try:
                    if f.stat().st_mtime < cutoff:
                        f.unlink()
                        deleted += 1
                except OSError as exc:
                    log.warning("db_cleanup.file_unlink_failed", path=str(f), error=str(exc))
    log.info("db_cleanup.data_jobs_files", deleted=deleted, site_filter=site_glob)
    return deleted


def cleanup_data_graphql_raw_files(*, retention_days: int, site_glob: str) -> int:
    """Prune ``data/*/graphql_raw`` (same mtime rule as jobs file cleanup)."""
    return prune_stale_graphql_raw_files(
        retention_days=max(1, int(retention_days)),
        site_glob=site_glob,
    )


async def async_main() -> None:
    try:
        retention = int(os.environ.get("GHOST_DB_JOB_EVENTS_RETENTION_DAYS", "90"))
    except ValueError:
        retention = 90
    try:
        noise_ret = int(os.environ.get("GHOST_DB_JOB_EVENTS_RETENTION_DAYS_NOISE", "14"))
    except ValueError:
        noise_ret = 14

    await cleanup_database(retention_days=retention, noise_retention_days=noise_ret)

    jobs_days_raw = os.environ.get("GHOST_DATA_JOBS_RETENTION_DAYS", "").strip()
    if jobs_days_raw:
        try:
            jd = int(jobs_days_raw)
        except ValueError:
            jd = 0
        if jd > 0:
            site = os.environ.get("GHOST_DATA_CLEANUP_SITE_ID", "upwork").strip() or "upwork"
            cleanup_data_jobs_files(retention_days=jd, site_glob=site)

    raw_days_raw = os.environ.get("GHOST_DATA_GRAPHQL_RAW_RETENTION_DAYS", "").strip()
    if raw_days_raw:
        try:
            rd = int(raw_days_raw)
        except ValueError:
            rd = 0
        if rd > 0:
            site_r = os.environ.get("GHOST_DATA_CLEANUP_SITE_ID", "upwork").strip() or "upwork"
            cleanup_data_graphql_raw_files(retention_days=rd, site_glob=site_r)


def main() -> None:
    configure_logging("INFO")
    asyncio.run(async_main())


if __name__ == "__main__":
    main()
