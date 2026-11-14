"""Database engine, session handling and schema application helpers."""
from __future__ import annotations

import logging
import os
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings

logger = logging.getLogger("crew_health.api")


class Base(DeclarativeBase):
    """Declarative base; ORM models mirror ``schema.sql`` exactly."""


def _build_engine(url: str):
    kwargs: dict = {"future": True, "pool_pre_ping": True}
    if url.startswith("sqlite"):
        kwargs.pop("pool_pre_ping", None)
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs["pool_size"] = int(os.getenv("DB_POOL_SIZE", "10"))
        kwargs["max_overflow"] = int(os.getenv("DB_MAX_OVERFLOW", "20"))
        kwargs["pool_recycle"] = int(os.getenv("DB_POOL_RECYCLE_SECONDS", "1800"))
    return create_engine(url, **kwargs)


engine = _build_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, autoflush=False, future=True)


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one transactional session per request."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _schema_path() -> Path:
    if settings.schema_sql_path:
        return Path(settings.schema_sql_path).expanduser().resolve()
    # services/api/app/db.py -> repository root
    return Path(__file__).resolve().parents[3] / "schema.sql"


SCHEMA_PATH = _schema_path()


def schema_sql() -> str:
    if not SCHEMA_PATH.exists():  # pragma: no cover - deployment misconfiguration
        raise RuntimeError(f"Ground schema file not found: {SCHEMA_PATH}")
    return SCHEMA_PATH.read_text(encoding="utf-8")


def _apply_postgres_schema(apply_engine, sql: str) -> None:
    """Execute the multi-statement script using psycopg's simple query protocol.

    SQLAlchemy's ``exec_driver_sql`` uses the extended protocol, which rejects a
    script containing more than one command.  A raw psycopg cursor sends the
    published script as a single simple query instead.

    ``schema.sql`` requests the ``pgcrypto`` extension for ``gen_random_uuid()``.
    PostgreSQL 13+ provides that function in core, so a build without contrib
    extensions can still apply the schema.  Only that specific, optional line is
    dropped; every table, constraint and seed statement is executed unchanged.
    """
    pooled = apply_engine.raw_connection()
    try:
        driver = pooled.driver_connection
        with driver.cursor() as cursor:
            try:
                cursor.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
                driver.commit()
            except Exception:
                driver.rollback()
                logger.warning(
                    "pgcrypto is not available on this PostgreSQL build; "
                    "using the built-in gen_random_uuid() instead."
                )
                sql = sql.replace(
                    "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
                    "-- pgcrypto unavailable; gen_random_uuid() is built into PostgreSQL 13+.",
                )
            cursor.execute(sql)
        driver.commit()
    except Exception:
        try:
            pooled.driver_connection.rollback()
        finally:
            raise
    finally:
        pooled.close()


def apply_schema(target_engine=None) -> None:
    """Create the ground schema exactly as published in ``schema.sql``."""
    apply_engine = target_engine or engine
    sql = schema_sql()
    if apply_engine.dialect.name == "postgresql":
        _apply_postgres_schema(apply_engine, sql)
        return
    with apply_engine.begin() as connection:
        connection.exec_driver_sql(sql)


def schema_exists(target_engine=None) -> bool:
    """Return True when the core ``missions`` table is already present."""
    inspect_engine = target_engine or engine
    with inspect_engine.connect() as connection:
        value = connection.execute(
            text("SELECT to_regclass('public.missions') IS NOT NULL")
        ).scalar()
    return bool(value)


def reset_schema(target_engine=None) -> None:
    """Destructive helper for explicit local/demo resets only."""
    drop_schema(target_engine)
    apply_schema(target_engine)


def drop_schema(target_engine=None) -> None:
    apply_engine = target_engine or engine
    with apply_engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
