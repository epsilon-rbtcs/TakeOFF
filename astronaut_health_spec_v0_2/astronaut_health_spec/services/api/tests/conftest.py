"""Pytest setup: a real PostgreSQL instance via the bundled ``pgserver`` package.

The API is exercised against PostgreSQL, not SQLite, so the documented schema
constraints (composite assignment/catalogue foreign keys, JSONB, arrays) are
part of every test.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pgserver
import pytest

_TMP_DIR = Path(tempfile.mkdtemp(prefix="takeoff-pg-"))
_SERVER = pgserver.get_server(str(_TMP_DIR), cleanup_mode="stop")
_URI = _SERVER.get_uri()
if _URI.startswith("postgresql://"):
    _URI = "postgresql+psycopg://" + _URI[len("postgresql://"):]

os.environ["APP_ENV"] = "test"
os.environ["JWT_SECRET"] = "test-only-secret-not-for-deployment"
os.environ["JWT_ISSUER"] = "crew-health-ground-api"
os.environ["DATABASE_URL"] = _URI
os.environ["CORS_ORIGINS"] = "http://localhost:5173"
os.environ["AUTO_APPLY_SCHEMA"] = "false"
os.environ["SEED_ON_STARTUP"] = "false"

from app.db import SessionLocal, apply_schema, drop_schema  # noqa: E402
from app.seed import (  # noqa: E402
    ASTRONAUT_ID,
    CLIENT_ID,
    MISSION_ID,
    seed_demo_data,
)


def pytest_sessionfinish(session, exitstatus):  # noqa: ARG001
    _SERVER.cleanup()


@pytest.fixture(scope="session", autouse=True)
def database():
    drop_schema()
    apply_schema()
    with SessionLocal() as db:
        seed_demo_data(db)
    yield


@pytest.fixture(scope="session")
def client(database):  # noqa: ARG001
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


def _token(client, username: str, password: str) -> str:
    response = client.post(
        "/api/v1/auth/demo-token",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture(scope="session")
def tokens(client) -> dict[str, str]:
    return {
        "crew": _token(client, "astronaut", "crew-demo"),
        "medical": _token(client, "medical", "ground-demo"),
        "admin": _token(client, "admin", "admin-demo"),
    }


@pytest.fixture
def crew_headers(tokens) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['crew']}"}


@pytest.fixture
def medical_headers(tokens) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['medical']}"}


@pytest.fixture
def admin_headers(tokens) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['admin']}"}


@pytest.fixture
def ids() -> dict[str, str]:
    return {
        "mission_id": str(MISSION_ID),
        "astronaut_id": str(ASTRONAUT_ID),
        "client_id": str(CLIENT_ID),
    }
