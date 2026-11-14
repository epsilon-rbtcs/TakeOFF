"""Ground-to-crew message lifecycle and its distinct persisted states."""
from __future__ import annotations

import uuid
from datetime import timedelta

from helpers import iso, now

API = "/api/v1"


def _message_payload(ids, **overrides):
    payload = {
        "mission_id": ids["mission_id"],
        "astronaut_id": ids["astronaut_id"],
        "message_type": "message",
        "title": f"Pytest demonstration message {uuid.uuid4()}",
        "body": "Synthetic demonstration content; not medical advice.",
        "version": "1",
    }
    payload.update(overrides)
    return payload


def _create(client, headers, ids, **overrides):
    key = overrides.pop("idempotency_key", f"pytest-message-{uuid.uuid4()}")
    payload = _message_payload(ids, **overrides)
    response = client.post(
        f"{API}/messages",
        json=payload,
        headers={**headers, "Idempotency-Key": key},
    )
    return response, key, payload


def test_messages_are_listed_with_distinct_states(client, crew_headers, medical_headers, ids):
    response = client.get(
        f"{API}/messages",
        params={"mission_id": ids["mission_id"], "astronaut_id": ids["astronaut_id"]},
        headers=medical_headers,
    )
    assert response.status_code == 200, response.text
    items = response.json()["items"]
    assert items
    # The seeded message has transmitted + received_by_crew lifecycle events.
    seeded = [item for item in items if item["title"].startswith("Demo mission:")]
    assert seeded and seeded[0]["status"] == "received"
    assert seeded[0]["simulated"] is True

    crew_view = client.get(f"{API}/messages", headers=crew_headers)
    assert crew_view.status_code == 200
    assert all(
        item["astronaut_id"] == ids["astronaut_id"] for item in crew_view.json()["items"]
    )


def test_message_creation_is_idempotent_and_validated(client, crew_headers, medical_headers, ids):
    response, key, payload = _create(client, medical_headers, ids)
    assert response.status_code == 201, response.text
    message = response.json()
    assert message["status"] == "queued"
    assert message["lifecycle"] == []
    assert message["simulated"] is True

    replay = client.post(
        f"{API}/messages",
        json=payload,
        headers={**medical_headers, "Idempotency-Key": key},
    )
    assert replay.status_code == 201
    assert replay.json()["message_id"] == message["message_id"]

    reused = client.post(
        f"{API}/messages",
        json=_message_payload(ids, title="Different demo message"),
        headers={**medical_headers, "Idempotency-Key": key},
    )
    assert reused.status_code == 409
    assert reused.json()["error"]["code"] == "IDEMPOTENCY_KEY_REUSED"

    crew = client.post(
        f"{API}/messages",
        json=_message_payload(ids),
        headers={**crew_headers, "Idempotency-Key": f"crew-{uuid.uuid4()}"},
    )
    assert crew.status_code == 403
    assert crew.json()["error"]["code"] == "ROLE_FORBIDDEN"

    missing_key = client.post(
        f"{API}/messages", json=_message_payload(ids), headers=medical_headers
    )
    assert missing_key.status_code == 422
    assert missing_key.json()["error"]["code"] == "VALIDATION_ERROR"


def test_message_lifecycle_events(client, crew_headers, medical_headers, ids):
    response, _, _ = _create(client, medical_headers, ids)
    message_id = response.json()["message_id"]

    read_key = f"pytest-read-{uuid.uuid4()}"
    read = client.post(
        f"{API}/messages/{message_id}/events",
        json={"event_type": "read", "client_created_at": iso(now())},
        headers={**crew_headers, "Idempotency-Key": read_key},
    )
    assert read.status_code == 201, read.text
    assert read.json()["event_type"] == "read"
    assert read.json()["message_status"] == "read"

    replay = client.post(
        f"{API}/messages/{message_id}/events",
        json={"event_type": "read", "client_created_at": iso(now())},
        headers={**crew_headers, "Idempotency-Key": read_key},
    )
    assert replay.status_code == 201
    assert replay.json()["event_id"] == read.json()["event_id"]

    reused = client.post(
        f"{API}/messages/{message_id}/events",
        json={"event_type": "withdrawn", "client_created_at": iso(now())},
        headers={**crew_headers, "Idempotency-Key": read_key},
    )
    assert reused.status_code == 409
    assert reused.json()["error"]["code"] == "IDEMPOTENCY_KEY_REUSED"

    transmitted = client.post(
        f"{API}/messages/{message_id}/events",
        json={"event_type": "transmitted", "client_created_at": iso(now())},
        headers={**medical_headers, "Idempotency-Key": f"ground-{uuid.uuid4()}"},
    )
    assert transmitted.status_code == 201, transmitted.text
    assert transmitted.json()["message_status"] == "read"

    crew_ground_event = client.post(
        f"{API}/messages/{message_id}/events",
        json={"event_type": "transmitted", "client_created_at": iso(now())},
        headers={**crew_headers, "Idempotency-Key": f"crew-ground-{uuid.uuid4()}"},
    )
    assert crew_ground_event.status_code == 403
    assert crew_ground_event.json()["error"]["code"] == "ROLE_FORBIDDEN"

    detail = client.get(f"{API}/messages/{message_id}", headers=crew_headers)
    assert detail.status_code == 200
    assert detail.json()["status"] == "read"
    lifecycle = [item["event_type"] for item in detail.json()["lifecycle"]]
    assert lifecycle == ["read", "transmitted"]


def test_withdrawn_and_expired_messages_are_terminal(client, crew_headers, medical_headers, ids):
    withdrawn_response, _, _ = _create(client, medical_headers, ids)
    withdrawn_id = withdrawn_response.json()["message_id"]
    withdrawn = client.post(
        f"{API}/messages/{withdrawn_id}/events",
        json={"event_type": "withdrawn", "client_created_at": iso(now())},
        headers={**crew_headers, "Idempotency-Key": f"withdraw-{uuid.uuid4()}"},
    )
    assert withdrawn.status_code == 201
    assert withdrawn.json()["message_status"] == "withdrawn"

    after = client.post(
        f"{API}/messages/{withdrawn_id}/events",
        json={"event_type": "read", "client_created_at": iso(now())},
        headers={**crew_headers, "Idempotency-Key": f"after-withdraw-{uuid.uuid4()}"},
    )
    assert after.status_code == 409
    assert after.json()["error"]["code"] == "MESSAGE_STATE_INVALID"

    expired_response, _, _ = _create(
        client,
        medical_headers,
        ids,
        expires_at=iso(now() - timedelta(minutes=1)),
    )
    expired_id = expired_response.json()["message_id"]
    expired = client.post(
        f"{API}/messages/{expired_id}/events",
        json={"event_type": "read", "client_created_at": iso(now())},
        headers={**crew_headers, "Idempotency-Key": f"expired-{uuid.uuid4()}"},
    )
    assert expired.status_code == 409
    assert expired.json()["error"]["code"] == "MESSAGE_EXPIRED"

    # Withdrawal is still allowed after expiry.
    withdrawn_after_expiry = client.post(
        f"{API}/messages/{expired_id}/events",
        json={"event_type": "withdrawn", "client_created_at": iso(now())},
        headers={**medical_headers, "Idempotency-Key": f"withdraw-expired-{uuid.uuid4()}"},
    )
    assert withdrawn_after_expiry.status_code == 201
    assert withdrawn_after_expiry.json()["message_status"] == "withdrawn"


def test_message_scope_and_not_found(client, admin_headers, medical_headers):
    missing = client.get(f"{API}/messages/{uuid.uuid4()}", headers=medical_headers)
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "NOT_FOUND"

    forbidden = client.get(f"{API}/messages", headers=admin_headers)
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "ROLE_FORBIDDEN"

    unassigned = client.get(
        f"{API}/messages",
        params={"mission_id": str(uuid.uuid4())},
        headers=medical_headers,
    )
    assert unassigned.status_code == 403
    assert unassigned.json()["error"]["code"] == "MISSION_ACCESS_MISMATCH"
