"""Initial Ground schema.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-15

This revision applies the published ``schema.sql`` verbatim.  The SQL file is
the canonical description of the ground database; duplicating its tables in
Alembic metadata would create a second source of truth that could drift.

The script is executed through the raw psycopg connection because SQLAlchemy's
extended query protocol cannot send a multi-statement script.  ``pgcrypto`` is
optional on PostgreSQL 13+, where ``gen_random_uuid()`` is built in; only the
``CREATE EXTENSION`` statement is skipped when the extension is unavailable.
"""
from __future__ import annotations

import os

from alembic import op

from app.db import schema_sql

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None

PGCrypto_LINE = "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
FALLBACK = "-- pgcrypto unavailable; gen_random_uuid() is built into PostgreSQL 13+."


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        raise RuntimeError(
            "The Ground schema targets PostgreSQL. "
            f"Current dialect is {bind.dialect.name!r}."
        )

    raw = bind.connection.driver_connection
    sql = schema_sql()
    # Probe the optional extension inside a savepoint so a failure does not
    # abort the migration transaction.  An explicit savepoint is used rather
    # than a nested psycopg transaction, because SQLAlchemy has already begun
    # an implicit transaction on this connection.
    with raw.cursor() as cursor:
        cursor.execute("SAVEPOINT pgcrypto_probe")
    try:
        with raw.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    except Exception:
        with raw.cursor() as cursor:
            cursor.execute("ROLLBACK TO SAVEPOINT pgcrypto_probe")
        sql = sql.replace(PGCrypto_LINE, FALLBACK)
    else:
        with raw.cursor() as cursor:
            cursor.execute("RELEASE SAVEPOINT pgcrypto_probe")

    with raw.cursor() as cursor:
        cursor.execute(sql)


def downgrade() -> None:
    if os.getenv("ALLOW_DESTRUCTIVE_DOWNGRADE") != "1":
        raise RuntimeError(
            "Downgrading the initial revision drops the entire Ground schema. "
            "Set ALLOW_DESTRUCTIVE_DOWNGRADE=1 for an explicit local reset, or use "
            "'python -m app.cli reset-db --yes'."
        )
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        raise RuntimeError("The Ground schema targets PostgreSQL.")
    raw = bind.connection.driver_connection
    with raw.cursor() as cursor:
        cursor.execute("DROP SCHEMA public CASCADE")
        cursor.execute("CREATE SCHEMA public")
        # Alembic deletes its bookkeeping row after this migration returns;
        # recreate the version table holding the current revision so that step
        # does not fail on a full schema reset.
        cursor.execute(
            "CREATE TABLE alembic_version ("
            "version_num VARCHAR(32) NOT NULL, "
            "CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num))"
        )
        cursor.execute(
            "INSERT INTO alembic_version (version_num) VALUES ('0001_initial_schema')"
        )
