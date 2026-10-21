"""Insert-only registry for job scoring outcomes (PostgreSQL)."""

from __future__ import annotations

import os
import uuid
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import SQLAlchemyError

from ghost_engine.db.models import BrowserRun, JobScoringEvent
from ghost_engine.db.session import session_scope
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


def scoring_registry_enabled() -> bool:
    v = os.environ.get("GHOST_DB_SCORING_REGISTRY", "1").strip().lower()
    return v not in ("0", "false", "no", "off")


def parse_run_id_from_env() -> uuid.UUID | None:
    raw = (os.environ.get("GHOST_RUN_ID") or "").strip()
    if not raw:
        return None
    try:
        return uuid.UUID(raw)
    except ValueError:
        log.warning("job_scoring.bad_ghost_run_id", value_preview=raw[:80])
        return None


def build_summary_from_signal(sig: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(sig, dict) or not sig:
        return None
    out: dict[str, Any] = {}
    for k in ("job_id", "title", "budget_value", "job_public_url", "description"):
        v = sig.get(k)
        if v is not None:
            if k == "description" and isinstance(v, str) and len(v) > 400:
                out[k] = v[:400] + "…"
            else:
                out[k] = v
    return out or None


async def ensure_browser_run(
    *,
    run_id: uuid.UUID,
    site_id: str,
    profile_name: str,
    meta: dict[str, Any] | None = None,
) -> None:
    if not scoring_registry_enabled():
        return
    try:
        async with session_scope() as session:
            stmt = (
                pg_insert(BrowserRun)
                .values(
                    id=uuid.uuid4(),
                    run_id=run_id,
                    site_id=site_id.strip() or "unknown",
                    profile_name=(profile_name or "default").strip() or "default",
                    meta=meta,
                )
                .on_conflict_do_nothing(index_elements=["run_id"])
            )
            await session.execute(stmt)
            await session.commit()
    except SQLAlchemyError as exc:
        log.warning(
            "job_scoring.ensure_browser_run_failed",
            error=str(exc),
            error_type=type(exc).__name__,
        )


async def fetch_latest_job_public_url_from_registry(
    *,
    site_id: str,
    job_id: str,
) -> str | None:
    """
    Latest ``summary.job_public_url`` from scoring events (PostgreSQL anchor).

    Used when Telegram command lacks ``job_public_url`` or feed navigation fails.
    """
    if not scoring_registry_enabled():
        return None
    sid = (site_id or "").strip()
    jid = (job_id or "").strip()
    if not sid or not jid or jid == "?":
        return None
    try:
        async with session_scope() as session:
            stmt = (
                select(JobScoringEvent.summary)
                .where(
                    JobScoringEvent.site_id == sid,
                    JobScoringEvent.job_id == jid,
                )
                .order_by(desc(JobScoringEvent.created_at))
                .limit(32)
            )
            result = await session.execute(stmt)
            for (summary,) in result.all():
                if not isinstance(summary, dict):
                    continue
                u = summary.get("job_public_url")
                if isinstance(u, str):
                    s = u.strip()
                    if s.lower().startswith("https://"):
                        return s
    except SQLAlchemyError as exc:
        log.debug(
            "job_scoring.fetch_job_public_url_failed",
            site_id=sid,
            job_id=jid,
            error=str(exc),
        )
    return None


async def record_job_scoring_event(
    *,
    site_id: str,
    job_id: str,
    outcome: str,
    run_id: uuid.UUID | None = None,
    gri: float | None = None,
    job_tier: str | None = None,
    l0_code: str | None = None,
    skip_notify_reason: str | None = None,
    artifact_relpath: str | None = None,
    summary: dict[str, Any] | None = None,
) -> None:
    if not scoring_registry_enabled():
        return
    jid = (job_id or "").strip() or "?"
    sid = (site_id or "unknown").strip()
    if run_id is not None:
        prof = (os.environ.get("GHOST_BROWSER_PROFILE") or "default").strip() or "default"
        await ensure_browser_run(run_id=run_id, site_id=sid, profile_name=prof, meta=None)
    try:
        async with session_scope() as session:
            event = JobScoringEvent(
                run_id=run_id,
                site_id=sid,
                job_id=jid,
                outcome=outcome[:64],
                gri=gri,
                job_tier=job_tier,
                l0_code=l0_code,
                skip_notify_reason=skip_notify_reason,
                artifact_relpath=artifact_relpath,
                summary=summary,
            )
            session.add(event)
            await session.commit()
    except SQLAlchemyError as exc:
        log.warning(
            "job_scoring.record_event_failed",
            site_id=sid,
            job_id=jid,
            outcome=outcome,
            error=str(exc),
            error_type=type(exc).__name__,
        )
