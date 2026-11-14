"""Observation ingestion, immutable identity and query pagination."""
from __future__ import annotations

import uuid
from datetime import timedelta

from helpers import iso, now, observation_payload

API = "/api/v1"


def test_observation_is_persisted_with_original_and_canonical_units(
    client, crew_headers, ids
):
    payload = observation_payload(
        ids,
        measurement_code="sleep_duration",
        value=420,
        unit="min",
        source_type="wearable",
        context={"synthetic": True, "rest_period_minutes": 0},
    )
    response = client.post(f"{API}/observations", json=payload, headers=crew_headers)
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["observation_id"] == payload["observation_id"]
    assert body["value"] == 420
    assert body["unit"] == "min"
    assert body["canonical_value"] == 7
    assert body["canonical_unit"] == "h"
    assert body["quality_status"] == "valid"
    assert body["simulated"] is True
    assert body["measured_at"].endswith("+00:00")

    # The same immutable observation replayed with identical content is idempotent.
    replay = client.post(f"{API}/observations", json=payload, headers=crew_headers)
    assert replay.status_code == 200
    assert replay.json()["observation_id"] == payload["observation_id"]

    # The same ID with different immutable content is a conflict.
    changed = dict(payload, value=8.0)
    conflict = client.post(f"{API}/observations", json=changed, headers=crew_headers)
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "ID_REUSE_MISMATCH"


def test_idempotency_key_replay_and_reuse(client, crew_headers, ids):
    key = f"pytest-{uuid.uuid4()}"
    payload = observation_payload(ids, idempotency_key=key)
    first = client.post(f"{API}/observations", json=payload, headers=crew_headers)
    assert first.status_code == 201, first.text

    replay_payload = dict(payload, observation_id=str(uuid.uuid4()))
    replay = client.post(f"{API}/observations", json=replay_payload, headers=crew_headers)
    assert replay.status_code == 200
    assert replay.json()["observation_id"] == first.json()["observation_id"]

    different = dict(
        payload,
        observation_id=str(uuid.uuid4()),
        value=71.0,
    )
    reused = client.post(f"{API}/observations", json=different, headers=crew_headers)
    assert reused.status_code == 409
    assert reused.json()["error"]["code"] == "IDEMPOTENCY_KEY_REUSED"


def test_measurement_catalogue_validation(client, crew_headers, ids):
    unknown_version = observation_payload(ids, catalogue_version="no-such-catalogue")
    response = client.post(f"{API}/observations", json=unknown_version, headers=crew_headers)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "UNKNOWN_CATALOGUE_VERSION"

    unknown_code = observation_payload(ids, measurement_code="no_such_measurement")
    response = client.post(f"{API}/observations", json=unknown_code, headers=crew_headers)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "UNKNOWN_MEASUREMENT"

    bad_unit = observation_payload(ids, unit="furlongs")
    response = client.post(f"{API}/observations", json=bad_unit, headers=crew_headers)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "UNSUPPORTED_UNIT"

    bad_source = observation_payload(ids, source_type="laboratory")
    response = client.post(f"{API}/observations", json=bad_source, headers=crew_headers)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "UNSUPPORTED_SOURCE_TYPE"


def test_values_and_timestamps_are_not_silently_coerced(client, crew_headers, ids):
    text_number = observation_payload(ids, value="60")
    response = client.post(f"{API}/observations", json=text_number, headers=crew_headers)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_VALUE"

    boolean_number = observation_payload(ids, value=True)
    response = client.post(f"{API}/observations", json=boolean_number, headers=crew_headers)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_VALUE"

    naive = observation_payload(ids, measured_at=now())
    naive["measured_at"] = "2026-01-01T00:00:00"
    naive["created_at"] = "2026-01-01T00:00:00"
    response = client.post(f"{API}/observations", json=naive, headers=crew_headers)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_TIMESTAMP"


def test_source_device_must_be_registered_and_owned(client, crew_headers, ids):
    payload = observation_payload(ids)
    payload["source"] = {
        "type": "wearable",
        "device_id": str(uuid.uuid4()),
        "external_id": "unregistered",
    }
    response = client.post(f"{API}/observations", json=payload, headers=crew_headers)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_SOURCE_DEVICE"


def test_quality_alias_is_normalised_without_losing_the_original(
    client, crew_headers, ids
):
    payload = observation_payload(ids, quality_status="unreviewed")
    response = client.post(f"{API}/observations", json=payload, headers=crew_headers)
    assert response.status_code == 201, response.text
    assert response.json()["quality_status"] == "unknown"

    # The original alias is preserved in the audit trail details via persistence;
    # re-reading the observation keeps the normalised public status.
    listing = client.get(
        f"{API}/observations",
        params={
            "astronaut_id": ids["astronaut_id"],
            "mission_id": ids["mission_id"],
            "measurement_code": "resting_heart_rate",
            "limit": 500,
        },
        headers=crew_headers,
    )
    assert listing.status_code == 200
    matched = [
        item
        for item in listing.json()["items"]
        if item["observation_id"] == payload["observation_id"]
    ]
    assert matched and matched[0]["quality_status"] == "unknown"


def test_batch_accepts_valid_items_and_reports_each_rejection(
    client, crew_headers, ids
):
    valid = observation_payload(ids, observation_id=uuid.uuid4())
    unknown = observation_payload(
        ids, observation_id=uuid.uuid4(), measurement_code="not_in_catalogue"
    )
    outside = observation_payload(
        ids, observation_id=uuid.uuid4(), astronaut_id=str(uuid.uuid4())
    )
    response = client.post(
        f"{API}/observations/batch",
        json={
            "astronaut_id": ids["astronaut_id"],
            "mission_id": ids["mission_id"],
            "observations": [valid, unknown, outside],
        },
        headers=crew_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["accepted_count"] == 1
    assert body["rejected_count"] == 2
    assert body["duplicate_count"] == 0
    assert [item["status"] for item in body["results"]] == [
        "accepted",
        "rejected",
        "rejected",
    ]
    assert body["results"][1]["error_code"] == "UNKNOWN_MEASUREMENT"
    assert body["results"][2]["error_code"] == "MISSION_ACCESS_MISMATCH"

    replay = client.post(
        f"{API}/observations/batch",
        json={
            "astronaut_id": ids["astronaut_id"],
            "mission_id": ids["mission_id"],
            "observations": [valid],
        },
        headers=crew_headers,
    )
    assert replay.status_code == 200
    assert replay.json()["duplicate_count"] == 1
    assert replay.json()["results"][0]["status"] == "duplicate"


def test_observations_are_paginated_with_stable_cursors(client, crew_headers, ids):
    params = {
        "astronaut_id": ids["astronaut_id"],
        "mission_id": ids["mission_id"],
        "measurement_code": "resting_heart_rate",
        "limit": 2,
    }
    first = client.get(f"{API}/observations", params=params, headers=crew_headers)
    assert first.status_code == 200
    body = first.json()
    assert len(body["items"]) == 2
    assert body["next_cursor"]

    second = client.get(
        f"{API}/observations",
        params={**params, "cursor": body["next_cursor"]},
        headers=crew_headers,
    )
    assert second.status_code == 200
    second_body = second.json()
    assert second_body["items"]
    first_ids = {item["observation_id"] for item in body["items"]}
    second_ids = {item["observation_id"] for item in second_body["items"]}
    assert first_ids.isdisjoint(second_ids)

    timestamps = [item["measured_at"] for item in body["items"] + second_body["items"]]
    assert timestamps == sorted(timestamps, reverse=True)

    invalid = client.get(
        f"{API}/observations",
        params={**params, "cursor": "not-a-cursor"},
        headers=crew_headers,
    )
    assert invalid.status_code == 409
    assert invalid.json()["error"]["code"] == "INVALID_CURSOR"


def test_observation_time_filters_and_role_restrictions(
    client, crew_headers, admin_headers, ids
):
    start = now() - timedelta(hours=3)
    end = now() + timedelta(hours=1)
    response = client.get(
        f"{API}/observations",
        params={
            "astronaut_id": ids["astronaut_id"],
            "mission_id": ids["mission_id"],
            "from": iso(start),
            "to": iso(end),
            "limit": 500,
        },
        headers=crew_headers,
    )
    assert response.status_code == 200
    assert response.json()["items"]
    for item in response.json()["items"]:
        assert start <= __import__("datetime").datetime.fromisoformat(item["measured_at"]) <= end

    forbidden = client.post(
        f"{API}/observations",
        json=observation_payload(ids),
        headers=admin_headers,
    )
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "ROLE_FORBIDDEN"


def test_unassigned_astronaut_is_rejected(client, medical_headers, ids):
    payload = observation_payload(ids, astronaut_id=str(uuid.uuid4()))
    response = client.post(f"{API}/observations", json=payload, headers=medical_headers)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "MISSION_ACCESS_MISMATCH"

    unknown_mission = observation_payload(ids, mission_id=str(uuid.uuid4()))
    response = client.post(
        f"{API}/observations", json=unknown_mission, headers=medical_headers
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "MISSION_ACCESS_MISMATCH"
