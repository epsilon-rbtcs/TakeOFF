"""Unauthenticated operational health endpoints."""
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from ..config import settings
from ..db import engine

router = APIRouter(tags=["health"])

SERVICE_NAME = "crew-health-ground-api"
SERVICE_VERSION = "0.3.0"


def _payload(database: str, schema: str = "present") -> dict:
    return {
        "status": "ok" if database == "connected" and schema == "present" else "degraded",
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
        "environment": settings.app_env,
        "database": database,
        "schema": schema,
        "demo_authentication": settings.demo_seed_enabled and not settings.is_production,
        "simulated_communications": True,
        "medical_certification": False,
    }


def _database_state() -> str:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return "connected"
    except Exception:  # pragma: no cover - infrastructure failure
        return "unavailable"


def _schema_state() -> str:
    try:
        with engine.connect() as connection:
            present = connection.execute(
                text("SELECT to_regclass('public.missions') IS NOT NULL")
            ).scalar()
        return "present" if present else "missing"
    except Exception:  # pragma: no cover - infrastructure failure
        return "unknown"


@router.get("/health")
def health():
    state = _database_state()
    if state != "connected":
        return JSONResponse(status_code=503, content=_payload(state))
    return _payload(state)


@router.get("/ready")
def ready():
    state = _database_state()
    if state != "connected":
        return JSONResponse(status_code=503, content=_payload(state))
    schema = _schema_state()
    if schema != "present":
        return JSONResponse(status_code=503, content=_payload(state, schema))
    return _payload(state, schema)
