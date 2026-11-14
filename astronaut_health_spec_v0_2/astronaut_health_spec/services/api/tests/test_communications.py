"""Communication truthfulness, data freshness and dashboard compatibility."""
from __future__ import annotations

import uuid

API = "/api/v1"


def test_communication_status_exposes_reported_state_and_freshness(
    client, crew_headers, medical_headers, ids
):
    crew = client.get(f"{API}/communications/status", headers=crew_headers)
    assert crew.status_code == 200, crew.text
    body = crew.json()
    assert body["astronaut_id"] == ids["astronaut_id"]
    assert body["mission_id"] == ids["mission_id"]
    assert body["state"] == "DELAYED"
    assert body["observed_at"]
    assert body["last_successful_contact_at"]
    assert body["last_push_at"]
    assert body["last_pull_at"]
    assert body["contact_recency"] in {"recent", "stale", "unknown"}
    assert body["queued_event_count"] >= 0
    assert body["queued_event_count_reported"] is True
    assert body["freshness"]
    entry = body["freshness"][0]
    assert entry["astronaut_id"] == ids["astronaut_id"]
    assert entry["latest_measured_at"]
    assert entry["age_seconds"] is not None and entry["age_seconds"] >= 0
    assert entry["status"] in {"current", "delayed", "stale"}

    ground = client.get(
        f"{API}/communications/status",
        params={"client_id": ids["client_id"]},
        headers=medical_headers,
    )
    assert ground.status_code == 200, ground.text
    assert ground.json()["client_id"] == ids["client_id"]
    assert ground.json()["state"] == "DELAYED"
    assert ground.json()["freshness"][0]["astronaut_id"] == ids["astronaut_id"]


def test_communication_status_by_astronaut_scope(
    client, medical_headers, ids
):
    response = client.get(
        f"{API}/communications/status",
        params={
            "astronaut_id": ids["astronaut_id"],
            "mission_id": ids["mission_id"],
        },
        headers=medical_headers,
    )
    assert response.status_code == 200, response.text
    assert response.json()["state"] == "DELAYED"

    unknown = client.get(
        f"{API}/communications/status",
        params={"client_id": str(uuid.uuid4())},
        headers=medical_headers,
    )
    assert unknown.status_code == 404
    assert unknown.json()["error"]["code"] == "NOT_FOUND"


def test_communication_status_role_and_scope_checks(
    client, admin_headers, medical_headers
):
    forbidden = client.get(f"{API}/communications/status", headers=admin_headers)
    assert forbidden.status_code in {403, 422}
    if forbidden.status_code == 403:
        assert forbidden.json()["error"]["code"] == "ROLE_FORBIDDEN"

    outside_mission = client.get(
        f"{API}/communications/status",
        params={"client_id": str(uuid.uuid4()), "mission_id": str(uuid.uuid4())},
        headers=medical_headers,
    )
    assert outside_mission.status_code in {403, 404}


def test_sync_status_views(client, crew_headers, medical_headers, admin_headers, ids):
    crew = client.get(f"{API}/sync/status", headers=crew_headers)
    assert crew.status_code == 200
    assert crew.json()["client_id"] == ids["client_id"]
    assert crew.json()["state"] == "DELAYED"

    ground = client.get(
        f"{API}/sync/status",
        params={"client_id": ids["client_id"], "mission_id": ids["mission_id"]},
        headers=medical_headers,
    )
    assert ground.status_code == 200
    assert ground.json()["client_id"] == ids["client_id"]

    missing_client = client.get(f"{API}/sync/status", headers=medical_headers)
    assert missing_client.status_code == 422
    assert missing_client.json()["error"]["code"] == "VALIDATION_ERROR"

    forbidden = client.get(f"{API}/sync/status", headers=admin_headers)
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "ROLE_FORBIDDEN"


def test_dashboard_summary_contract_and_legacy_aliases(
    client, crew_headers, medical_headers, ids
):
    response = client.get(
        f"{API}/dashboard/summary",
        params={"astronaut_id": ids["astronaut_id"], "mission_id": ids["mission_id"]},
        headers=medical_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()

    required = {
        "astronaut_id",
        "mission_id",
        "mission_day",
        "integrated_status",
        "domains",
        "open_alert_count",
        "pending_action_count",
        "data_quality",
        "simulated",
        "adapter_state",
        "adapter_state_observed_at",
        "contact_recency",
        "latest_measured_at",
        "latest_received_at",
        "freshness",
        "generated_at",
    }
    assert required <= set(body)
    assert body["astronaut_id"] == ids["astronaut_id"]
    assert body["mission_id"] == ids["mission_id"]
    assert body["adapter_state"] == "DELAYED"
    assert body["freshness"] in {"current", "delayed", "stale"}
    assert body["contact_recency"] in {"recent", "stale", "unknown"}
    assert body["simulated"] is True
    assert len(body["domains"]) == 6
    assert {item["module_code"] for item in body["domains"]} == {
        "cardiovascular",
        "behavioural_cognitive",
        "immune",
        "musculoskeletal",
        "radiation",
        "environmental",
    }
    assert body["open_alert_count"] >= 1
    assert body["pending_action_count"] >= 1
    assert body["data_quality"]["observation_count"] > 0
    assert body["data_quality"]["latest_measured_at"]

    # Additive aliases used by the unmodified Ground Console.
    assert body["communication"]["state"] == "DELAYED"
    assert isinstance(body["observations"], list) and body["observations"]
    assert isinstance(body["assessments"], list) and body["assessments"]

    crew = client.get(
        f"{API}/dashboard/summary",
        params={"astronaut_id": ids["astronaut_id"], "mission_id": ids["mission_id"]},
        headers=crew_headers,
    )
    assert crew.status_code == 200
    assert crew.json()["integrated_status"] == body["integrated_status"]


def test_dashboard_scope_restrictions(client, admin_headers, medical_headers, ids):
    forbidden = client.get(
        f"{API}/dashboard/summary",
        params={"astronaut_id": ids["astronaut_id"], "mission_id": ids["mission_id"]},
        headers=admin_headers,
    )
    assert forbidden.status_code == 403

    unassigned = client.get(
        f"{API}/dashboard/summary",
        params={
            "astronaut_id": str(uuid.uuid4()),
            "mission_id": ids["mission_id"],
        },
        headers=medical_headers,
    )
    assert unassigned.status_code == 403
    assert unassigned.json()["error"]["code"] == "MISSION_ACCESS_MISMATCH"
