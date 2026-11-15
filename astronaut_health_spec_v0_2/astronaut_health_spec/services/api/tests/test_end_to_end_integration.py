"""End-to-end crew -> API -> ground integration checks.

These tests use the real PostgreSQL-backed API, the seeded demonstration
identities and persisted rows.  Nothing is mocked: the medical-officer queries
below are the same endpoints the Ground Console calls.
"""
from __future__ import annotations

import uuid
from datetime import timedelta, timezone

from sqlalchemy import text

from helpers import CATALOGUE_VERSION, now, observation_payload

API = "/api/v1"


def _event(ids, entity_type, entity_id, payload, *, event_id=None, operation="upsert"):
    return {
        "event_id": str(event_id or uuid.uuid4()),
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "operation": operation,
        "schema_version": 1,
        "client_id": ids["client_id"],
        "mission_id": ids["mission_id"],
        "actor_id": "demo-astronaut",
        "origin": "crew_client",
        "created_at": now().isoformat(),
        "payload": payload,
    }


def _push(client, headers, events, batch_id=None, key=None):
    batch = str(batch_id or uuid.uuid4())
    return client.post(
        f"{API}/sync/push",
        json={"batch_id": batch, "events": events},
        headers={**headers, "Idempotency-Key": key or batch},
    )


def _pull_all(client, headers, ids, cursor=None):
    changes = []
    while True:
        response = client.get(
            f"{API}/sync/pull",
            params={"mission_id": ids["mission_id"], "cursor": cursor, "limit": 500},
            headers=headers,
        )
        assert response.status_code == 200, response.text
        body = response.json()
        changes.extend(body["changes"])
        cursor = body["next_cursor"]
        if not body["has_more"]:
            return changes, cursor


def test_observation_travels_from_crew_to_ground_with_timestamps_and_provenance(
    client, crew_headers, medical_headers, ids
):
    observation_id = uuid.uuid4()
    measured_at = now()
    payload = observation_payload(
        ids,
        observation_id=observation_id,
        measurement_code="heart_rate",
        value=71,
        unit="bpm",
        measured_at=measured_at,
        source_type="manual",
        quality_status="unknown",
        simulated=True,
    )
    event = _event(ids, "observation", observation_id, payload, event_id=uuid.uuid4())

    pushed = _push(client, crew_headers, [event])
    assert pushed.status_code == 200, pushed.text
    assert pushed.json()["results"][0]["status"] == "accepted"

    # Replaying the event under a fresh batch is an idempotent duplicate.
    replay = _push(client, crew_headers, [event])
    assert replay.status_code == 200, replay.text
    assert replay.json()["results"][0]["status"] == "duplicate"

    # Replaying the identical batch returns the stored acknowledgement.
    batch = uuid.uuid4()
    first = _push(client, crew_headers, [event], batch_id=batch)
    second = _push(client, crew_headers, [event], batch_id=batch)
    assert first.status_code == 200 and second.status_code == 200
    assert second.json() == first.json()

    ground = client.get(
        f"{API}/observations",
        params={
            "astronaut_id": ids["astronaut_id"],
            "mission_id": ids["mission_id"],
            "measurement_code": "heart_rate",
            "limit": 500,
        },
        headers=medical_headers,
    )
    assert ground.status_code == 200, ground.text
    stored = next(
        item
        for item in ground.json()["items"]
        if item["observation_id"] == str(observation_id)
    )
    assert stored["value"] == 71
    assert stored["measurement_code"] == "heart_rate"
    assert stored["catalogue_version"] == CATALOGUE_VERSION
    assert stored["measured_at"] == measured_at.astimezone(timezone.utc).isoformat()
    assert stored["received_at"] is not None
    assert stored["created_at"] == measured_at.astimezone(timezone.utc).isoformat()
    assert stored["source"]["type"] == "manual"
    assert stored["simulated"] is True
    # Exactly one persisted observation exists for this client-generated ID.
    assert sum(
        item["observation_id"] == str(observation_id) for item in ground.json()["items"]
    ) == 1


def test_ground_message_reaches_crew_and_acknowledgement_returns_to_ground(
    client, crew_headers, medical_headers, ids
):
    created = client.post(
        f"{API}/messages",
        json={
            "mission_id": ids["mission_id"],
            "astronaut_id": ids["astronaut_id"],
            "message_type": "message",
            "title": f"Integration follow-up {uuid.uuid4()}",
            "body": "Synthetic follow-up created by the end-to-end test.",
            "version": "integration-test",
        },
        headers={**medical_headers, "Idempotency-Key": str(uuid.uuid4())},
    )
    assert created.status_code == 201, created.text
    message_id = created.json()["message_id"]
    assert created.json()["status"] == "queued"

    # Crew pulls the message through the existing change feed.
    changes, _ = _pull_all(client, crew_headers, ids)
    delivered = [
        item
        for item in changes
        if item["entity_type"] in {"ground_message", "crew_update"}
        and item["payload"].get("message_id") == message_id
    ]
    assert delivered, "ground message was not published to the crew feed"
    assert delivered[0]["payload"]["body"] == "Synthetic follow-up created by the end-to-end test."
    assert delivered[0]["payload"]["simulated"] is True

    # Crew acknowledges receipt and read using append-only lifecycle events.
    for event_type in ("received_by_crew", "read"):
        lifecycle = _event(
            ids,
            "message_lifecycle_event",
            message_id,
            {
                "message_id": message_id,
                "event_type": event_type,
                "client_created_at": now().isoformat(),
            },
            operation="append_event",
        )
        ack = _push(client, crew_headers, [lifecycle])
        assert ack.status_code == 200, ack.text
        assert ack.json()["results"][0]["status"] == "accepted"

    ground = client.get(f"{API}/messages/{message_id}", headers=medical_headers)
    assert ground.status_code == 200, ground.text
    assert ground.json()["status"] == "read"
    lifecycle_types = {event["event_type"] for event in ground.json()["lifecycle"]}
    assert {"received_by_crew", "read"} <= lifecycle_types
    assert all(
        event["recorded_at"] is not None for event in ground.json()["lifecycle"]
    )

    # Crew-side acknowledgements are not echoed into the crew pull feed; the
    # ground view above is the authoritative acknowledgement record.

    # Crew clients cannot author ground messages; administrators have no message access.
    crew_create = client.post(
        f"{API}/messages",
        json={
            "mission_id": ids["mission_id"],
            "astronaut_id": ids["astronaut_id"],
            "message_type": "message",
            "title": "Not allowed",
            "body": "Not allowed",
        },
        headers={**crew_headers, "Idempotency-Key": str(uuid.uuid4())},
    )
    assert crew_create.status_code == 403

    admin_token = client.post(
        f"{API}/auth/demo-token",
        json={"username": "admin", "password": "admin-demo"},
    ).json()["access_token"]
    admin_read = client.get(f"{API}/messages", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_read.status_code == 403


def test_communication_state_is_reported_not_inferred(client, crew_headers, medical_headers, ids):
    observed_at = now()
    status_event = _event(
        ids,
        "communication_status",
        ids["client_id"],
        {
            "state": "LIVE",
            "observed_at": observed_at.isoformat(),
            "queued_event_count": 0,
            "details": {"adapter": "simulated", "integration_test": True},
        },
    )
    pushed = _push(client, crew_headers, [status_event])
    assert pushed.status_code == 200, pushed.text
    assert pushed.json()["results"][0]["status"] == "accepted"

    status = client.get(
        f"{API}/sync/status",
        params={"mission_id": ids["mission_id"], "client_id": ids["client_id"]},
        headers=medical_headers,
    )
    assert status.status_code == 200, status.text
    assert status.json()["state"] == "LIVE"
    assert status.json()["observed_at"] == observed_at.astimezone(timezone.utc).isoformat()
    assert status.json()["contact_recency"] == "recent"
    assert status.json()["freshness"][0]["status"] in {"current", "delayed", "stale"}

    # A later DELAYED report must survive contact: a successful pull is not
    # evidence of LIVE and must never promote the reported state.
    delayed_at = observed_at + timedelta(seconds=1)
    delayed = _event(
        ids,
        "communication_status",
        ids["client_id"],
        {
            "state": "DELAYED",
            "observed_at": delayed_at.isoformat(),
            "queued_event_count": 2,
            "details": {"adapter": "simulated", "reason": "store_and_forward"},
        },
    )
    pushed_delayed = _push(client, crew_headers, [delayed])
    assert pushed_delayed.status_code == 200, pushed_delayed.text
    assert pushed_delayed.json()["results"][0]["status"] == "accepted"

    contact = client.get(
        f"{API}/sync/pull",
        params={"mission_id": ids["mission_id"], "limit": 1},
        headers=crew_headers,
    )
    assert contact.status_code == 200, contact.text

    after_contact = client.get(
        f"{API}/sync/status",
        params={"mission_id": ids["mission_id"], "client_id": ids["client_id"]},
        headers=medical_headers,
    )
    assert after_contact.status_code == 200, after_contact.text
    assert after_contact.json()["state"] == "DELAYED"
    assert after_contact.json()["observed_at"] == delayed_at.astimezone(timezone.utc).isoformat()
    assert after_contact.json()["contact_recency"] == "recent"


def test_research_data_cannot_enter_the_live_feed(client, crew_headers, ids):
    # The live database has no research tables; retrospective OSD-575 records
    # are stored only in the crew client's separate local research schema.
    from app.db import SessionLocal

    with SessionLocal() as db:
        tables = db.execute(
            text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_name LIKE 'research_%'"
            )
        ).scalars().all()
    assert tables == []

    rejected = _push(
        client,
        crew_headers,
        [
            _event(
                ids,
                "research_observation",
                uuid.uuid4(),
                {"observation_id": "OSD575-test", "is_live_telemetry": False},
            )
        ],
    )
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["results"][0]["status"] == "rejected"
    assert rejected.json()["results"][0]["reason"] == "UNSUPPORTED_ENTITY_TYPE"

    changes, _ = _pull_all(client, crew_headers, ids)
    assert changes
    assert not any(
        item["entity_type"].startswith("research") for item in changes
    )
    # Retrosepctive research must not appear as live observations or alerts.
    assert not any(
        (item["payload"] or {}).get("data_origin") == "retrospective_research"
        for item in changes
    )
