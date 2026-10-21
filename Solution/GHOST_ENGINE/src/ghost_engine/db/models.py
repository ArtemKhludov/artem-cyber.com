"""SQLAlchemy models: scoring registry (canonical outcome trail in PostgreSQL).

Disk layout (data/.../jobs, data/.../trash) remains for raw dumps and JSONL audit;
``job_scoring_events`` is the queryable source of truth for outcomes per job_id + run.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class BrowserRun(Base):
    """One browser dev_session (or future worker run) keyed by ``GHOST_RUN_ID``."""

    __tablename__ = "browser_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True, nullable=False)
    site_id: Mapped[str] = mapped_column(Text, nullable=False)
    profile_name: Mapped[str] = mapped_column(Text, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    meta: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)


class JobScoringEvent(Base):
    """Append-only outcome row after scoring sieve (and related notify paths)."""

    __tablename__ = "job_scoring_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("browser_runs.run_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    site_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    job_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    outcome: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    gri: Mapped[float | None] = mapped_column(Float, nullable=True)
    job_tier: Mapped[str | None] = mapped_column(Text, nullable=True)
    l0_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    skip_notify_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    artifact_relpath: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
