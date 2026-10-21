"""browser_runs and job_scoring_events

Revision ID: 20260407120000
Revises:
Create Date: 2026-04-07

"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260407120000"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "browser_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("site_id", sa.Text(), nullable=False),
        sa.Column("profile_name", sa.Text(), nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("run_id"),
    )
    op.create_table(
        "job_scoring_events",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("run_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("site_id", sa.Text(), nullable=False),
        sa.Column("job_id", sa.Text(), nullable=False),
        sa.Column("outcome", sa.String(length=64), nullable=False),
        sa.Column("gri", sa.Double(), nullable=True),
        sa.Column("job_tier", sa.Text(), nullable=True),
        sa.Column("l0_code", sa.Text(), nullable=True),
        sa.Column("skip_notify_reason", sa.Text(), nullable=True),
        sa.Column("artifact_relpath", sa.Text(), nullable=True),
        sa.Column("summary", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["run_id"], ["browser_runs.run_id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_job_scoring_events_run_id", "job_scoring_events", ["run_id"])
    op.create_index("ix_job_scoring_events_site_id", "job_scoring_events", ["site_id"])
    op.create_index("ix_job_scoring_events_job_id", "job_scoring_events", ["job_id"])
    op.create_index("ix_job_scoring_events_outcome", "job_scoring_events", ["outcome"])
    op.create_index(
        "ix_job_scoring_events_created_at", "job_scoring_events", ["created_at"]
    )
    op.create_index(
        "ix_job_scoring_events_site_job",
        "job_scoring_events",
        ["site_id", "job_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_job_scoring_events_site_job", table_name="job_scoring_events")
    op.drop_index("ix_job_scoring_events_created_at", table_name="job_scoring_events")
    op.drop_index("ix_job_scoring_events_outcome", table_name="job_scoring_events")
    op.drop_index("ix_job_scoring_events_job_id", table_name="job_scoring_events")
    op.drop_index("ix_job_scoring_events_site_id", table_name="job_scoring_events")
    op.drop_index("ix_job_scoring_events_run_id", table_name="job_scoring_events")
    op.drop_table("job_scoring_events")
    op.drop_table("browser_runs")
