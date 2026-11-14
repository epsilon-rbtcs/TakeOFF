"""Store-and-forward sync: batch idempotency, ordered feed and opaque cursors."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from helpers import CATALOGUE_VERSION, now, observation_payload, run_analysis

API = "/api/v1"


def _event(ids, *, entity_id=None, payload=None, event_id=None, **overrides):
    entity = str(entity_id or uuid.uuid4())
    event = {
        "event_id": str(event_id or uuid.uuid4()),
        "entity_type": "observation",
        "entity_id": entity,
        "operation": "upsert",
        "schema_version": 1,
        "client_id": ids["client_id"],
        "mission_id": ids["mission_id"],
        "actor_id": "astronaut",
        "origin": "crew_client",
        "created_at": now().isoformat(),
        "payload": payload or {},
    }
    event.update(overrides)
    return event


def _push(client, headers, batch_id, events, key=None):
    return client.post(
        f"{API}/sync/push",
        json={"batch_id": str(batch_id), "events": events},
        headers={**headers, "Idempotency-Key": key or str(batch_id)},
    )


def _observation_event(ids, observation):
    return _event(
        ids,
        entity_id=observation["observation_id"],
        payload=observation,
    )


def test_push_accepts_an_observation_and_never_echoes_it_to_the_crew(
    client, crew_headers, ids
):
    observation = observation_payload(ids, observation_id=uuid.uuid4())
    event = _observation_event(ids, observation)
    batch_id = uuid.uuid4()
    response = _push(client, crew_headers, batch_id, [event])
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["batch_id"] == str(batch_id)
    assert body["summary"] == {
        "accepted": 1,
        "duplicate": 0,
        "rejected": 0,
        "conflict": 0,
    }
    assert body["results"][0]["status"] == "accepted"

    stored = client.get(
        f"{API}/observations",
        params={
            "astronaut_id": ids["astronaut_id"],
            "mission_id": ids["mission_id"],
            "measurement_code": observation["measurement_code"],
            "limit": 500,
        },
        headers=crew_headers,
    )
    assert stored.status_code == 200
    assert any(
        item["observation_id"] == observation["observation_id"]
        for item in stored.json()["items"]
    )

    # The pushed event is not appended to the ground feed that the crew pulls.
    seen: list[dict] = []
    cursor = None
    for _ in range(20):
        pull = client.get(
            f"{API}/sync/pull",
            params={"mission_id": ids["mission_id"], "limit": 100, "cursor": cursor},
            headers=crew_headers,
        )
        assert pull.status_code == 200, pull.text
        page = pull.json()
        seen.extend(page["changes"])
        if not page["has_more"]:
            break
        cursor = page["next_cursor"]
    assert all(
        change["entity_id"] != observation["observation_id"] for change in seen
    )


def test_duplicate_and_conflicting_event_ids(client, crew_headers, ids):
    observation = observation_payload(ids, observation_id=uuid.uuid4())
    event = _observation_event(ids, observation)
    assert _push(client, crew_headers, uuid.uuid4(), [event]).status_code == 200

    duplicate = _push(client, crew_headers, uuid.uuid4(), [event])
    assert duplicate.status_code == 200
    assert duplicate.json()["summary"]["duplicate"] == 1
    assert duplicate.json()["results"][0]["status"] == "duplicate"

    conflicting = dict(
        event,
        payload=dict(observation, value=99.0),
    )
    conflict = _push(client, crew_headers, uuid.uuid4(), [conflicting])
    assert conflict.status_code == 200
    assert conflict.json()["summary"]["conflict"] == 1
    result = conflict.json()["results"][0]
    assert result["status"] == "conflict"
    assert result["reason"] == "ID_REUSE_MISMATCH"


def test_batch_id_is_idempotent_and_bound_to_its_content(client, crew_headers, ids):
    observation = observation_payload(ids, observation_id=uuid.uuid4())
    event = _observation_event(ids, observation)
    batch_id = uuid.uuid4()

    first = _push(client, crew_headers, batch_id, [event])
    assert first.status_code == 200
    replay = _push(client, crew_headers, batch_id, [event])
    assert replay.status_code == 200
    assert replay.json() == first.json()

    other = dict(event, event_id=str(uuid.uuid4()), payload=dict(observation, value=88.0))
    mismatch = _push(client, crew_headers, batch_id, [other])
    assert mismatch.status_code == 409
    assert mismatch.json()["error"]["code"] == "ID_REUSE_MISMATCH"

    wrong_header = _push(client, crew_headers, batch_id, [event], key="another-key")
    assert wrong_header.status_code == 422
    assert wrong_header.json()["error"]["code"] == "BATCH_ID_MISMATCH"


def test_payload_hash_validation(client, crew_headers, ids):
    observation = observation_payload(ids, observation_id=uuid.uuid4())
    event = _observation_event(ids, observation)
    event["payload_hash"] = "a" * 64
    response = _push(client, crew_headers, uuid.uuid4(), [event])
    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["status"] == "rejected"
    assert result["reason"] == "PAYLOAD_HASH_MISMATCH"


def test_envelope_rejections_are_reported_per_event(client, crew_headers, ids):
    observation = observation_payload(ids, observation_id=uuid.uuid4())
    base = _observation_event(ids, observation)

    unsupported_schema = dict(base, event_id=str(uuid.uuid4()), schema_version=2)
    response = _push(client, crew_headers, uuid.uuid4(), [unsupported_schema])
    assert response.json()["results"][0]["reason"] == "UNSUPPORTED_SCHEMA_VERSION"

    unsupported_entity = dict(base, event_id=str(uuid.uuid4()), entity_type="planet")
    response = _push(client, crew_headers, uuid.uuid4(), [unsupported_entity])
    assert response.json()["results"][0]["reason"] == "UNSUPPORTED_ENTITY_TYPE"

    wrong_client = dict(base, event_id=str(uuid.uuid4()), client_id=str(uuid.uuid4()))
    response = _push(client, crew_headers, uuid.uuid4(), [wrong_client])
    assert response.json()["results"][0]["reason"] == "CLIENT_SCOPE_MISMATCH"

    wrong_mission = dict(base, event_id=str(uuid.uuid4()), mission_id=str(uuid.uuid4()))
    response = _push(client, crew_headers, uuid.uuid4(), [wrong_mission])
    assert response.json()["results"][0]["reason"] == "MISSION_ACCESS_MISMATCH"

    unsupported_operation = dict(base, event_id=str(uuid.uuid4()), operation="revoke")
    response = _push(client, crew_headers, uuid.uuid4(), [unsupported_operation])
    assert response.json()["results"][0]["reason"] == "UNSUPPORTED_OPERATION"


def test_crew_message_and_assessment_events_materialise(
    client, crew_headers, medical_headers, ids
):
    assessment_id = str(uuid.uuid4())
    assessment_event = _event(
        ids,
        entity_type="module_assessment",
        entity_id=assessment_id,
        payload={
            "assessment_id": assessment_id,
            "module_code": "cardiovascular",
            "status": "insufficient_data",
            "assessed_at": "2000-01-01T00:00:00+00:00",
            "summary": "Crew-local demonstration assessment with no evidence in this window.",
            "algorithm_version": "crew-demo-0.3.0",
            "rule_set_version": "crew-config-0.3.0",
            "data_sufficiency": "insufficient",
            "simulated": True,
        },
        expected_revision=1,
    )
    response = _push(client, crew_headers, uuid.uuid4(), [assessment_event])
    assert response.status_code == 200, response.text
    assert response.json()["results"][0]["status"] == "accepted"

    detail = client.get(f"{API}/assessments/{assessment_id}", headers=medical_headers)
    assert detail.status_code == 200, detail.text
    assert detail.json()["status"] == "insufficient_data"
    assert detail.json()["data_sufficiency"] == "insufficient"

    message_id = str(uuid.uuid4())
    message_event = _event(
        ids,
        entity_type="crew_message",
        entity_id=message_id,
        payload={
            "message_id": message_id,
            "message_type": "update",
            "title": "Crew-local demonstration update",
            "body": "Synthetic crew note; not medical advice.",
            "created_at": now().isoformat(),
            "simulated": True,
        },
    )
    response = _push(client, crew_headers, uuid.uuid4(), [message_event])
    assert response.status_code == 200, response.text
    assert response.json()["results"][0]["status"] == "accepted"

    message = client.get(f"{API}/messages/{message_id}", headers=medical_headers)
    assert message.status_code == 200
    assert message.json()["title"] == "Crew-local demonstration update"


def test_sync_is_crew_only(client, medical_headers, admin_headers, ids):
    observation = observation_payload(ids, observation_id=uuid.uuid4())
    event = _observation_event(ids, observation)
    for headers in (medical_headers, admin_headers):
        response = _push(client, headers, uuid.uuid4(), [event])
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "ROLE_FORBIDDEN"

    pull = client.get(
        f"{API}/sync/pull",
        params={"mission_id": ids["mission_id"]},
        headers=medical_headers,
    )
    assert pull.status_code == 403


def test_pull_is_ordered_and_cursor_replay_is_stable(client, crew_headers, ids):
    first = client.get(
        f"{API}/sync/pull",
        params={"mission_id": ids["mission_id"], "limit": 3},
        headers=crew_headers,
    )
    assert first.status_code == 200, first.text
    page = first.json()
    assert page["changes"]
    sequences = [change["server_sequence"] for change in page["changes"]]
    assert sequences == sorted(sequences)
    assert len(sequences) == len(set(sequences))
    assert page["next_cursor"]

    replay = client.get(
        f"{API}/sync/pull",
        params={"mission_id": ids["mission_id"], "limit": 3},
        headers=crew_headers,
    )
    assert replay.json()["changes"] == page["changes"]

    second = client.get(
        f"{API}/sync/pull",
        params={
            "mission_id": ids["mission_id"],
            "limit": 3,
            "cursor": page["next_cursor"],
        },
        headers=crew_headers,
    )
    assert second.status_code == 200, second.text
    next_page = second.json()
    assert all(
        change["server_sequence"] > sequences[-1] for change in next_page["changes"]
    )
    assert {change["event_id"] for change in page["changes"]}.isdisjoint(
        {change["event_id"] for change in next_page["changes"]}
    )


def test_pull_cursor_is_opaque_and_scoped(client, crew_headers, ids):
    first = client.get(
        f"{API}/sync/pull",
        params={"mission_id": ids["mission_id"], "limit": 1},
        headers=crew_headers,
    )
    cursor = first.json()["next_cursor"]
    assert cursor and cursor.count(".") == 1

    tampered = cursor[:-1] + ("a" if cursor[-1] != "a" else "b")
    response = client.get(
        f"{API}/sync/pull",
        params={"mission_id": ids["mission_id"], "cursor": tampered},
        headers=crew_headers,
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "INVALID_CURSOR"

    malformed = client.get(
        f"{API}/sync/pull",
        params={"mission_id": ids["mission_id"], "cursor": "not-a-cursor"},
        headers=crew_headers,
    )
    assert malformed.status_code == 409
    assert malformed.json()["error"]["code"] == "INVALID_CURSOR"


def test_ground_changes_appear_in_the_feed(client, crew_headers, medical_headers, ids):
    result = run_analysis(client, medical_headers, ids, modules=["environmental"])
    seen: list[dict] = []
    cursor = None
    for _ in range(50):
        response = client.get(
            f"{API}/sync/pull",
            params={"mission_id": ids["mission_id"], "limit": 200, "cursor": cursor},
            headers=crew_headers,
        )
        assert response.status_code == 200, response.text
        page = response.json()
        seen.extend(page["changes"])
        if not page["has_more"]:
            break
        cursor = page["next_cursor"]
    assert any(
        change["entity_type"] == "analysis_run" and change["entity_id"] == result["run_id"]
        for change in seen
    )
    assert any(change["origin"] == "backend" for change in seen)


def test_sync_status_never_manufactures_live(client, crew_headers, medical_headers, ids):
    crew = client.get(f"{API}/sync/status", headers=crew_headers)
    assert crew.status_code == 200, crew.text
    assert crew.json()["client_id"] == ids["client_id"]
    assert crew.json()["state"] in {"LIVE", "DELAYED", "BLACKOUT", None}

    ground = client.get(
        f"{API}/sync/status",
        params={"client_id": ids["client_id"], "mission_id": ids["mission_id"]},
        headers=medical_headers,
    )
    assert ground.status_code == 200
    assert ground.json()["client_id"] == ids["client_id"]
    assert ground.json()["state"] == crew.json()["state"]


def test_pushed_observation_values_keep_their_original_units(
    client, crew_headers, ids
):
    observation = observation_payload(
        ids,
        measurement_code="dose_equivalent",
        value=250,
        unit="uSv",
        source_type="dosimeter",
    )
    event = _observation_event(ids, observation)
    response = _push(client, crew_headers, uuid.uuid4(), [event])
    assert response.status_code == 200
    assert response.json()["results"][0]["status"] == "accepted"

    listing = client.get(
        f"{API}/observations",
        params={
            "astronaut_id": ids["astronaut_id"],
            "mission_id": ids["mission_id"],
            "measurement_code": "dose_equivalent",
            "limit": 200,
        },
        headers=crew_headers,
    )
    assert listing.status_code == 200
    matched = [
        item
        for item in listing.json()["items"]
        if item["observation_id"] == observation["observation_id"]
    ]
    assert matched
    assert matched[0]["value"] == 250
    assert matched[0]["unit"] == "uSv"
    assert matched[0]["canonical_value"] == 0.25
    assert matched[0]["canonical_unit"] == "mSv"
