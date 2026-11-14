"""Alembic environment for the Ground API.

The application's published ``schema.sql`` is the canonical DDL.  Migrations
therefore record revisions and execute that file rather than maintaining a
second, drifting copy of every table.  See ``versions/0001_initial_schema.py``.
"""
from __future__ import annotations

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.config import settings  # noqa: E402
from app.db import engine as app_engine  # noqa: E402

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None


def _database_url() -> str:
    return settings.database_url


def run_migrations_offline() -> None:
    """Emit the canonical schema for review without a database connection."""
    from app.db import schema_sql

    print("-- Ground API schema (from schema.sql)")
    print(schema_sql())


def run_migrations_online() -> None:
    connectable = app_engine
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=False,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
