"""Application startup, published contract coverage and error envelope."""
from __future__ import annotations

import re
from pathlib import Path

import yaml

from app.main import app

API_PREFIX = "/api/v1"
OPENAPI_PATH = Path(__file__).resolve().parents[3] / "openapi.yaml"


def _documented_paths() -> set[str]:
    document = yaml.safe_load(OPENAPI_PATH.read_text(encoding="utf-8"))
    return set(document["paths"])


def test_application_starts_and_exposes_openapi(client):
    response = client.get(f"{API_PREFIX}/openapi.json")
    assert response.status_code == 200
    document = response.json()
    assert document["openapi"].startswith("3.")
    assert "Crew Health" in document["info"]["title"]


def test_every_documented_path_is_implemented(client):
    response = client.get(f"{API_PREFIX}/openapi.json")
    assert response.status_code == 200
    contract = response.json()
    documented = _documented_paths()
    implemented = {path[len(API_PREFIX):] or "/" for path in contract["paths"]}
    missing = documented - implemented
    assert missing == set(), f"documented endpoints are missing: {sorted(missing)}"


def test_health_and_ready_are_unauthenticated(client):
    for path in ("/health", "/ready"):
        response = client.get(f"{API_PREFIX}{path}")
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["status"] == "ok"
        assert body["database"] == "connected"
        assert body["simulated_communications"] is True
        assert body["medical_certification"] is False


def test_root_describes_the_service(client):
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "crew-health-ground-api"
    assert body["api_base"] == API_PREFIX
    assert body["simulated"] is True


def test_errors_use_the_documented_envelope_and_request_id(client):
    response = client.get(
        f"{API_PREFIX}/observations",
        headers={"X-Request-ID": "contract-test-request"},
    )
    assert response.status_code == 401
    assert response.headers["X-Request-ID"] == "contract-test-request"
    body = response.json()
    assert set(body) == {"error"}
    assert body["error"]["code"] == "UNAUTHENTICATED"
    assert body["error"]["request_id"] == "contract-test-request"

    unknown = client.get(f"{API_PREFIX}/does-not-exist")
    assert unknown.status_code == 404
    assert unknown.json()["error"]["code"] == "NOT_FOUND"


def test_validation_errors_never_echo_values(client):
    response = client.post(f"{API_PREFIX}/auth/demo-token", json={"username": ""})
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert re.search(r"password", str(body).lower())


def test_versioned_api_root_matches_root(client):
    assert client.get(f"{API_PREFIX}").json() == client.get("/").json()
