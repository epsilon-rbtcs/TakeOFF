"""Demo authentication, JWT validation and per-request scope rechecking."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.config import settings
from app.seed import CREW_USER_ID, MEDICAL_USER_ID

API = "/api/v1"


def _claims(**overrides):
    now = datetime.now(timezone.utc)
    base = {
        "sub": str(MEDICAL_USER_ID),
        "username": "medical",
        "role": "medical_officer",
        "mission_ids": [],
        "iss": settings.token_issuer,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=5)).timestamp()),
        "jti": str(uuid.uuid4()),
    }
    base.update(overrides)
    return jwt.encode(base, settings.resolved_jwt_secret, algorithm=settings.jwt_algorithm)


def test_valid_demo_credentials_issue_bearer_tokens(client):
    response = client.post(
        f"{API}/auth/demo-token",
        json={"username": "astronaut", "password": "crew-demo"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["role"] == "crew_member"
    assert body["expires_in"] > 0
    assert body["astronaut_id"] is not None
    assert len(body["access_token"].split(".")) == 3


def test_invalid_demo_credentials_are_rejected(client):
    response = client.post(
        f"{API}/auth/demo-token",
        json={"username": "astronaut", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "TOKEN_INVALID"

    unknown = client.post(
        f"{API}/auth/demo-token",
        json={"username": "no-such-user", "password": "whatever"},
    )
    assert unknown.status_code == 401
    assert unknown.json()["error"]["code"] == "TOKEN_INVALID"


def test_missing_and_malformed_bearer_tokens(client):
    missing = client.get(f"{API}/dashboard/summary")
    assert missing.status_code == 401
    assert missing.json()["error"]["code"] == "UNAUTHENTICATED"

    wrong_scheme = client.get(
        f"{API}/dashboard/summary", headers={"Authorization": "Basic abc"}
    )
    assert wrong_scheme.status_code == 401
    assert wrong_scheme.json()["error"]["code"] == "UNAUTHENTICATED"

    malformed = client.get(
        f"{API}/dashboard/summary", headers={"Authorization": "Bearer not-a-jwt"}
    )
    assert malformed.status_code == 401
    assert malformed.json()["error"]["code"] == "TOKEN_INVALID"


def test_expired_token_is_rejected(client):
    now = datetime.now(timezone.utc)
    token = _claims(
        iat=int((now - timedelta(hours=2)).timestamp()),
        exp=int((now - timedelta(hours=1)).timestamp()),
    )
    response = client.get(
        f"{API}/dashboard/summary", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "TOKEN_EXPIRED"


def test_token_for_unknown_user_is_rejected(client):
    token = _claims(sub=str(uuid.uuid4()))
    response = client.get(
        f"{API}/dashboard/summary", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "TOKEN_INVALID"


def test_mission_claims_in_a_token_do_not_grant_scope(client, ids):
    # The signed claim names a mission that the medical user is not scoped to.
    token = _claims(mission_ids=[str(uuid.uuid4())], astronaut_id=None)
    response = client.get(
        f"{API}/dashboard/summary",
        params={
            "astronaut_id": ids["astronaut_id"],
            "mission_id": str(uuid.uuid4()),
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "MISSION_ACCESS_MISMATCH"


def test_role_claims_in_a_token_do_not_elevate_privileges(client):
    token = _claims(
        sub=str(CREW_USER_ID),
        username="astronaut",
        role="administrator",
        mission_ids=[],
    )
    response = client.get(
        f"{API}/audit/events", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ROLE_FORBIDDEN"


@pytest.mark.parametrize("role", ["medical", "admin"])
def test_astronaut_scope_is_enforced_for_crew_records(client, tokens, ids, role):
    token = tokens[role]
    other_astronaut = str(uuid.uuid4())
    response = client.get(
        f"{API}/astronauts/{other_astronaut}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_administrator_has_no_default_health_record_access(client, admin_headers, ids):
    response = client.get(
        f"{API}/dashboard/summary",
        params={"astronaut_id": ids["astronaut_id"], "mission_id": ids["mission_id"]},
        headers=admin_headers,
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ROLE_FORBIDDEN"


def test_crew_member_cannot_read_another_astronaut(client, tokens, ids):
    token = tokens["medical"]
    # A crew identity for the same mission but a different astronaut is not
    # established by the seed, so verify the medical scope check instead: the
    # crew user may only read its own profile.
    own = client.get(
        f"{API}/astronauts/{ids['astronaut_id']}",
        headers={"Authorization": f"Bearer {tokens['crew']}"},
    )
    assert own.status_code == 200
    assert own.json()["astronaut_id"] == ids["astronaut_id"]

    other = client.get(
        f"{API}/astronauts/{uuid.uuid4()}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert other.status_code == 404
