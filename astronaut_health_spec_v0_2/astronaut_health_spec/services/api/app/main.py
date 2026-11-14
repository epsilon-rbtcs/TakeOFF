"""Single FastAPI application for the v0.3 ground health backend.

One process serves the versioned REST contract in ``openapi.yaml``.  There are
no microservices: the API, authorization, audit, analysis and sync engine share
one PostgreSQL database and one SQLAlchemy session per request.
"""
from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .errors import register_exception_handlers, request_id_var
from .routers import (
    actions,
    alerts,
    analysis,
    assessments,
    astronauts,
    audit,
    auth,
    baselines,
    communications,
    dashboard,
    health,
    measurements,
    messages,
    missions,
    observations,
    protocols,
    sync,
)

logger = logging.getLogger("crew_health.api")

API_PREFIX = "/api/v1"
SERVICE_VERSION = "0.3.0"


@asynccontextmanager
async def lifespan(_: FastAPI):
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    logger.info(
        "Starting crew-health API environment=%s demo_seed_enabled=%s",
        settings.app_env,
        settings.demo_seed_enabled,
    )
    if not settings.is_production and not settings.jwt_secret:
        logger.warning(
            "JWT_SECRET is not configured; using an ephemeral development secret. "
            "Demo tokens are invalidated when the process restarts."
        )
    if settings.auto_apply_schema:
        from .db import apply_schema, schema_exists

        if not schema_exists():
            apply_schema()
            logger.info("Applied schema.sql to the configured database.")
    if settings.seed_on_startup:
        from .db import SessionLocal
        from .seed import seed_demo_data

        with SessionLocal() as db:
            seed_demo_data(db)
        logger.info("Demo data ensured.")
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Crew Health Dual-Client API",
        version=SERVICE_VERSION,
        description=(
            "Hackathon MVP API shared by the offline crew desktop client and hosted "
            "ground health console. Includes store-and-forward sync and crew messaging. "
            "Simulated communications only; not a NASA integration or medical "
            "diagnostic API."
        ),
        openapi_url=f"{API_PREFIX}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    allow_credentials = "*" not in settings.cors_origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=allow_credentials,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "Accept",
            "Idempotency-Key",
            "X-Request-ID",
        ],
        expose_headers=["X-Request-ID"],
        max_age=600,
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        incoming = request.headers.get("X-Request-ID")
        request_id = incoming.strip()[:200] if incoming and incoming.strip() else str(uuid.uuid4())
        token = request_id_var.set(request_id)
        try:
            response = await call_next(request)
        finally:
            request_id_var.reset(token)
        response.headers["X-Request-ID"] = request_id
        return response

    register_exception_handlers(app)

    for module in (
        health,
        auth,
        measurements,
        protocols,
        astronauts,
        missions,
        observations,
        baselines,
        dashboard,
        analysis,
        assessments,
        alerts,
        actions,
        messages,
        communications,
        sync,
        audit,
    ):
        app.include_router(module.router, prefix=API_PREFIX)

    @app.get("/", include_in_schema=False)
    def root() -> dict:
        return {
            "service": "crew-health-ground-api",
            "version": SERVICE_VERSION,
            "api_base": API_PREFIX,
            "documentation": "/docs",
            "openapi": f"{API_PREFIX}/openapi.json",
            "health": f"{API_PREFIX}/health",
            "simulated": True,
            "medical_certification": False,
        }

    @app.get(f"{API_PREFIX}", include_in_schema=False)
    def api_root() -> dict:
        return root()

    return app


app = create_app()


def run() -> None:  # pragma: no cover - CLI helper
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)


__all__ = ["app", "create_app"]
