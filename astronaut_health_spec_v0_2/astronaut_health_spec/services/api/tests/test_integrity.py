"""Mission/assignment integrity, versioned configuration and audit retrieval."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.seed import ASTRONAUT_ID

API = "/api/v1"


def test_mission_and_astronaut_listings_are_scoped(client, crew_headers, medical_headers, ids):
    missions = client.get(f"{API}/missions", headers=medical_headers)
    assert missions.status_code == 200
    assert [item["mission_id"] for item in missions.json()["items"]] == [ids["mission_id"]]
    assert missions.json()["items"][0]["mission_code"] == "DEMO-LEO-01"

    mission = client.get(f"{API}/missions/{ids['mission_id']}", headers=crew_headers)
    assert mission.status_code == 200
    assert mission.json()["simulated"] is True

    unknown = client.get(f"{API}/missions/{uuid.uuid4()}", headers=crew_headers)
    assert unknown.status_code == 404

    astronauts = client.get(f"{API}/astronauts", headers=medical_headers)
    assert astronauts.status_code == 200
    items = astronauts.json()["items"]
    assert len(items) == 1
    assert items[0]["astronaut_id"] == ids["astronaut_id"]
    assert items[0]["simulated"] is True

    crew_view = client.get(f"{API}/astronauts", headers=crew_headers)
    assert crew_view.status_code == 200
    assert [item["astronaut_id"] for item in crew_view.json()["items"]] == [ids["astronaut_id"]]


def test_mission_scope_is_rechecked_for_mission_routes(client, medical_headers):
    other = str(uuid.uuid4())
    response = client.get(f"{API}/missions/{other}", headers=medical_headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_versioned_baselines_are_exposed(client, crew_headers):
    response = client.get(
        f"{API}/astronauts/{ASTRONAUT_ID}/baselines", headers=crew_headers
    )
    assert response.status_code == 200, response.text
    items = response.json()["items"]
    assert items
    active = [item for item in items if item["status"] == "active"]
    assert active
    for item in active:
        assert item["version"] >= 1
        assert item["method"] == "demo_deterministic_summary"
        assert item["sample_count"] == 14
        assert item["unit"]
    codes = {item["measurement_code"] for item in active}
    assert {"resting_heart_rate", "sleep_duration", "cabin_co2"} <= codes

    unknown = client.get(
        f"{API}/astronauts/{uuid.uuid4()}/baselines", headers=crew_headers
    )
    assert unknown.status_code in {403, 404}


def test_measurement_catalogue_snapshot(client, crew_headers, medical_headers, ids):
    response = client.get(
        f"{API}/measurements/catalog",
        params={"mission_id": ids["mission_id"]},
        headers=crew_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["catalogue_version"] == "demo-catalog-0.3.0"
    assert body["effective_at"]
    codes = {item["code"] for item in body["items"]}
    assert {"heart_rate", "resting_heart_rate", "sleep_duration", "dose_rate", "cabin_co2"} <= codes
    # Explicit compatibility vocabulary for the unmodified crew client.
    assert "exercise_minutes" in codes
    assert "laboratory_biomarker" in codes
    compatibility = {item["code"] for item in body["items"] if item.get("compatibility")}
    assert "exercise_minutes" in compatibility

    admin_view = client.get(
        f"{API}/measurements/catalog",
        params={"mission_id": ids["mission_id"]},
        headers=medical_headers,
    )
    assert admin_view.status_code == 200


def test_catalogue_publication_is_administrator_only_and_versioned(
    client, crew_headers, admin_headers, ids
):
    version = f"pytest-catalogue-{uuid.uuid4()}"
    payload = {
        "mission_id": ids["mission_id"],
        "version": version,
        "effective_at": datetime.now(timezone.utc).isoformat(),
        "changes": [
            {
                "code": "pytest_integrity_marker",
                "display_name": "Pytest integrity marker",
                "domain_code": "environmental",
                "value_type": "numeric",
                "canonical_unit": "unitless",
                "allowed_units": ["unitless"],
                "allowed_source_types": ["manual"],
                "description": "Synthetic catalogue entry created by the test suite.",
                "sampling_guidance": None,
                "context_schema": {},
                "active": True,
            }
        ],
        "change_reason": "Verify administrator-only catalogue publication.",
    }
    forbidden = client.post(
        f"{API}/measurements/catalog/versions", json=payload, headers=crew_headers
    )
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "ROLE_FORBIDDEN"

    created = client.post(
        f"{API}/measurements/catalog/versions", json=payload, headers=admin_headers
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["catalogue_version"] == version
    assert body["changed_codes"] == ["pytest_integrity_marker"]

    duplicate = client.post(
        f"{API}/measurements/catalog/versions", json=payload, headers=admin_headers
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "ID_REUSE_MISMATCH"

    invalid = client.post(
        f"{API}/measurements/catalog/versions",
        json={
            **payload,
            "version": f"{version}-invalid",
            "changes": [
                {
                    **payload["changes"][0],
                    "code": "pytest_invalid_unit_marker",
                    "canonical_unit": "not-in-allowed",
                }
            ],
        },
        headers=admin_headers,
    )
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "INVALID_VALUE"


def test_protocol_publication_is_administrator_only_and_versioned(
    client, medical_headers, admin_headers, ids
):
    code = f"pytest-protocol-{uuid.uuid4()}"
    payload = {
        "mission_id": ids["mission_id"],
        "protocol_code": code,
        "version": "1.0.0",
        "approval_status": "demo_only",
        "source_reference": "Test-only demonstration configuration.",
        "effective_at": datetime.now(timezone.utc).isoformat(),
        "content": {
            "title": "Pytest demonstration protocol",
            "description": "Synthetic configuration; not clinical guidance.",
            "simulated": True,
        },
        "change_reason": "Verify administrator-only protocol publication.",
    }
    forbidden = client.post(f"{API}/protocols/versions", json=payload, headers=medical_headers)
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "ROLE_FORBIDDEN"

    created = client.post(f"{API}/protocols/versions", json=payload, headers=admin_headers)
    assert created.status_code == 201, created.text
    assert created.json()["approval_status"] == "demo_only"
    assert created.json()["protocol_code"] == code

    duplicate = client.post(f"{API}/protocols/versions", json=payload, headers=admin_headers)
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "ID_REUSE_MISMATCH"


def test_audit_events_are_append_only_and_role_scoped(
    client, crew_headers, medical_headers, admin_headers, ids
):
    # Generate a known audit event through an authenticated action.
    catalogue_version = f"pytest-audit-catalogue-{uuid.uuid4()}"
    published = client.post(
        f"{API}/measurements/catalog/versions",
        json={
            "mission_id": ids["mission_id"],
            "version": catalogue_version,
            "effective_at": datetime.now(timezone.utc).isoformat(),
            "changes": [
                {
                    "code": "pytest_audit_marker",
                    "display_name": "Pytest audit marker",
                    "domain_code": "environmental",
                    "value_type": "numeric",
                    "canonical_unit": "unitless",
                    "allowed_units": ["unitless"],
                    "allowed_source_types": ["manual"],
                    "description": "Synthetic audit test entry.",
                    "sampling_guidance": None,
                    "context_schema": {},
                    "active": True,
                }
            ],
            "change_reason": "Verify append-only audit retrieval.",
        },
        headers=admin_headers,
    )
    assert published.status_code == 201, published.text

    forbidden = client.get(f"{API}/audit/events", headers=crew_headers)
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "ROLE_FORBIDDEN"

    def _find(headers):
        response = client.get(
            f"{API}/audit/events",
            params={
                "mission_id": ids["mission_id"],
                "action": "catalogue.publish",
                "limit": 500,
            },
            headers=headers,
        )
        assert response.status_code == 200, response.text
        return response.json()

    medical_view = _find(medical_headers)
    admin_view = _find(admin_headers)
    assert medical_view["items"]
    assert admin_view["items"]
    matching = [
        item
        for item in medical_view["items"]
        if item["entity_id"] == published.json()["catalogue_version_id"]
    ]
    assert matching
    event = matching[0]
    assert event["actor_id"] == "admin"
    assert event["actor_role"] == "administrator"
    assert event["outcome"] == "success"
    assert event["mission_id"] == ids["mission_id"]

    # Audit retrieval itself never creates a mutable audit row.
    again = _find(medical_headers)
    assert again["items"] == medical_view["items"]
