"""Alembic environment: sync engine from ``DATABASE_URL`` (asyncpg URL rewritten for psycopg)."""

from __future__ import annotations

import os
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

from ghost_engine.db.models import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_sync_database_url() -> str:
    # Load repo ``.env`` so ``make db-migrate`` works without exporting variables in the shell.
    load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)
    raw = (os.environ.get("DATABASE_URL") or "").strip()
    if not raw:
        raise RuntimeError("DATABASE_URL is not set")
    u = raw.replace("+asyncpg", "+psycopg")
    if u.startswith("postgresql+psycopg://") or u.startswith("postgres+psycopg://"):
        return u
    if u.startswith("postgresql://") or u.startswith("postgres://"):
        rest = u.split("://", 1)[1]
        return f"postgresql+psycopg://{rest}"
    raise RuntimeError("DATABASE_URL must be a PostgreSQL URL")


def run_migrations_offline() -> None:
    url = get_sync_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    ini_section = config.get_section(config.config_ini_section) or {}
    ini_section["sqlalchemy.url"] = get_sync_database_url()
    connectable = engine_from_config(
        ini_section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
