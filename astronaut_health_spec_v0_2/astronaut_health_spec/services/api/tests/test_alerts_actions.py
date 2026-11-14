"""Alert lifecycle and recommended-action optimistic concurrency."""
from __future__ import annotations

import uuid

from helpers import alert_for_run, run_analysis

API = "/api/v1"


def test_list_alerts_and_get_history(client, medical_headers, ids):
    result = run_analysis(client, medical_headers, ids)
    alert = alert_for_run(client, medical_headers, ids, result["run_id"])
    assert alert["status"] == "open"
    assert alert["revision"] == 1
    assert alert["provenance"]["analysis_run_id"] == result["run_id"]
    assert alert["provenance"]["demo_only"] is True

    detail = client.get(f"{API}/alerts/{alert['alert_id']}", headers=medical_headers)
    assert detail.status_code == 200, detail.text
    assert detail.json()["alert_id"] == alert["alert_id"]
    assert detail.json()["history"] == []

    listing = client.get(
        f"{API}/alerts",
        params={
            "astronaut_id": ids["astronaut_id"],
            "mission_id": ids["mission_id"],
            "status": "open",
        },
        headers=medical_headers,
    )
    assert listing.status_code == 200
    assert all(item["status"] == "open" for item in listing.json()["items"])


def test_alert_acknowledgement_and_revision_conflict(client, medical_headers, ids):
    result = run_analysis(client, medical_headers, ids)
    alert = alert_for_run(client, medical_headers, ids, result["run_id"])

    acknowledged = client.post(
        f"{API}/alerts/{alert['alert_id']}/acknowledgements",
        json={"expected_revision": 1, "note": "Reviewed by the demonstration officer."},
        headers=medical_headers,
    )
    assert acknowledged.status_code == 200, acknowledged.text
    body = acknowledged.json()
    assert body["status"] == "acknowledged"
    assert body["revision"] == 2
    assert body["acknowledged_by"] == "medical"
    assert body["acknowledged_at"]

    stale = client.post(
        f"{API}/alerts/{alert['alert_id']}/acknowledgements",
        json={"expected_revision": 1},
        headers=medical_headers,
    )
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "REVISION_CONFLICT"
    assert stale.json()["error"]["details"]["current_revision"] == 2

    resolved = client.post(
        f"{API}/alerts/{alert['alert_id']}/events",
        json={"event_type": "resolved", "expected_revision": 2, "note": "Closed."},
        headers=medical_headers,
    )
    assert resolved.status_code == 200, resolved.text
    event = resolved.json()
    assert event["event_type"] == "resolved"
    assert event["result_revision"] == 3
    assert event["alert"]["status"] == "resolved"

    closed = client.post(
        f"{API}/alerts/{alert['alert_id']}/events",
        json={"event_type": "dismissed", "expected_revision": 3},
        headers=medical_headers,
    )
    assert closed.status_code == 409
    assert closed.json()["error"]["code"] == "MESSAGE_STATE_INVALID"

    history = client.get(
        f"{API}/alerts/{alert['alert_id']}/history", headers=medical_headers
    )
    assert history.status_code == 200
    event_types = [item["event_type"] for item in history.json()["items"]]
    assert event_types == ["acknowledged", "resolved"]


def test_alert_events_are_medical_only(client, crew_headers, medical_headers, ids):
    result = run_analysis(client, medical_headers, ids)
    alert = alert_for_run(client, medical_headers, ids, result["run_id"])

    forbidden = client.post(
        f"{API}/alerts/{alert['alert_id']}/acknowledgements",
        json={"expected_revision": 1},
        headers=crew_headers,
    )
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "ROLE_FORBIDDEN"


def _action_payload(ids, **overrides):
    payload = {
        "mission_id": ids["mission_id"],
        "astronaut_id": ids["astronaut_id"],
        "action_type": "repeat_measurement",
        "priority": "normal",
        "title": f"Pytest repeat measurement {uuid.uuid4()}",
        "description": "Demonstration follow-up created by the test suite.",
        "demo_only": True,
    }
    payload.update(overrides)
    return payload


def test_action_lifecycle_and_optimistic_concurrency(
    client, crew_headers, medical_headers, ids
):
    created = client.post(
        f"{API}/actions", json=_action_payload(ids), headers=medical_headers
    )
    assert created.status_code == 201, created.text
    action = created.json()
    assert action["status"] == "pending"
    assert action["revision"] == 1
    assert action["demo_only"] is True

    started = client.post(
        f"{API}/actions/{action['action_id']}/events",
        json={"event_type": "started", "expected_revision": 1},
        headers=crew_headers,
    )
    assert started.status_code == 201, started.text
    started_body = started.json()
    assert started_body["result_revision"] == 2
    assert started_body["action"]["status"] == "in_progress"

    stale = client.post(
        f"{API}/actions/{action['action_id']}/events",
        json={"event_type": "completed", "expected_revision": 1},
        headers=medical_headers,
    )
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "REVISION_CONFLICT"
    assert stale.json()["error"]["details"]["current_revision"] == 2

    updated = client.patch(
        f"{API}/actions/{action['action_id']}",
        json={
            "expected_revision": 2,
            "status": "deferred",
            "priority": "high",
            "note": "Deferred for the demonstration schedule.",
        },
        headers=medical_headers,
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["status"] == "deferred"
    assert updated.json()["revision"] == 3

    stale_update = client.patch(
        f"{API}/actions/{action['action_id']}",
        json={"expected_revision": 1, "priority": "low"},
        headers=medical_headers,
    )
    assert stale_update.status_code == 409
    assert stale_update.json()["error"]["code"] == "REVISION_CONFLICT"

    note = client.post(
        f"{API}/actions/{action['action_id']}/events",
        json={
            "event_type": "note_added",
            "expected_revision": 3,
            "note": "Crew confirmed the repeat measurement.",
        },
        headers=crew_headers,
    )
    assert note.status_code == 201, note.text
    assert note.json()["action"]["revision"] == 4

    completed = client.post(
        f"{API}/actions/{action['action_id']}/events",
        json={"event_type": "completed", "expected_revision": 4},
        headers=crew_headers,
    )
    assert completed.status_code == 201, completed.text
    assert completed.json()["action"]["status"] == "completed"
    assert completed.json()["action"]["revision"] == 5

    closed = client.post(
        f"{API}/actions/{action['action_id']}/events",
        json={"event_type": "started", "expected_revision": 5},
        headers=crew_headers,
    )
    assert closed.status_code == 409
    assert closed.json()["error"]["code"] == "MESSAGE_STATE_INVALID"

    history = client.get(
        f"{API}/actions/{action['action_id']}/history", headers=medical_headers
    )
    assert history.status_code == 200
    event_types = [item["event_type"] for item in history.json()["items"]]
    assert event_types == ["started", "deferred", "note_added", "completed"]


def test_action_creation_requires_medical_role(client, crew_headers, ids):
    response = client.post(
        f"{API}/actions", json=_action_payload(ids), headers=crew_headers
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ROLE_FORBIDDEN"


def test_action_links_must_be_in_scope(client, medical_headers, ids):
    response = client.post(
        f"{API}/actions",
        json=_action_payload(ids, alert_id=str(uuid.uuid4())),
        headers=medical_headers,
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_VALUE"


def test_action_listing_filters_status(client, medical_headers, ids):
    created = client.post(
        f"{API}/actions",
        json=_action_payload(ids, action_type="informational", priority="low"),
        headers=medical_headers,
    )
    assert created.status_code == 201

    listing = client.get(
        f"{API}/actions",
        params={
            "astronaut_id": ids["astronaut_id"],
            "mission_id": ids["mission_id"],
            "status": "pending",
        },
        headers=medical_headers,
    )
    assert listing.status_code == 200
    assert all(item["status"] == "pending" for item in listing.json()["items"])
    assert any(item["action_id"] == created.json()["action_id"] for item in listing.json()["items"])
