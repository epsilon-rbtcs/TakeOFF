"""Synchronous analysis, explicit insufficiency and persisted provenance."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from helpers import ALGORITHM_VERSION, RULE_SET_VERSION, iso, now, run_analysis

API = "/api/v1"


def test_analysis_returns_persisted_provenance(client, medical_headers, ids):
    result = run_analysis(
        client,
        medical_headers,
        ids,
        modules=["cardiovascular", "behavioural_cognitive"],
    )
    assert result["status"] == "completed"
    assert result["execution_location"] == "ground_backend"
    assert result["algorithm_version"] == ALGORITHM_VERSION
    assert result["rule_set_version"] == RULE_SET_VERSION
    assert result["implementation_build"]
    assert len(result["input_snapshot_hash"]) == 64
    assert len(result["output_hash"]) == 64
    assert result["integrated_assessment_id"]
    assert len(result["module_assessment_ids"]) == 2

    run = client.get(f"{API}/analysis/runs/{result['run_id']}", headers=medical_headers)
    assert run.status_code == 200, run.text
    assert run.json()["run_id"] == result["run_id"]
    assert run.json()["input_snapshot_hash"] == result["input_snapshot_hash"]
    assert run.json()["status"] == "completed"
    assert run.json()["error_code"] is None

    listing = client.get(
        f"{API}/analysis/runs",
        params={"astronaut_id": ids["astronaut_id"], "mission_id": ids["mission_id"]},
        headers=medical_headers,
    )
    assert listing.status_code == 200
    ids_returned = {item["run_id"] for item in listing.json()["items"]}
    assert result["run_id"] in ids_returned


def test_assessment_detail_links_evidence_baselines_and_run(
    client, medical_headers, ids
):
    result = run_analysis(
        client,
        medical_headers,
        ids,
        modules=["cardiovascular", "behavioural_cognitive"],
    )
    details = []
    for assessment_id in result["module_assessment_ids"]:
        response = client.get(f"{API}/assessments/{assessment_id}", headers=medical_headers)
        assert response.status_code == 200, response.text
        details.append(response.json())

    assert {item["assessment_type"] for item in details} == {"module"}
    assert all(item["analysis_run_id"] == result["run_id"] for item in details)
    assert all(item["limitations"] for item in details)
    assert all(item["algorithm_version"] == ALGORITHM_VERSION for item in details)
    # The seeded recent synthetic values are intentionally elevated, so at least
    # one module carries a transparent statistical finding with evidence.
    findings = [finding for item in details for finding in item["findings"]]
    assert findings
    for finding in findings:
        assert finding["evidence_observation_ids"]
        assert finding["explanation"]
        assert "not a diagnosis" in finding["explanation"].lower()
        assert finding["baseline_value"] is not None
    assert any(item["baseline_versions"] for item in details)

    integrated = client.get(
        f"{API}/assessments/{result['integrated_assessment_id']}",
        headers=medical_headers,
    )
    assert integrated.status_code == 200, integrated.text
    payload = integrated.json()
    assert payload["assessment_type"] == "integrated"
    assert payload["analysis_run_id"] == result["run_id"]
    assert set(payload["component_assessment_ids"]) == set(result["module_assessment_ids"])
    assert payload["uncertainty_notes"]


def test_insufficient_data_is_explicit(client, medical_headers, ids):
    start = datetime(2000, 1, 1, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    result = run_analysis(
        client,
        medical_headers,
        ids,
        modules=["immune"],
        window_start=start,
        window_end=end,
        include_integrated_assessment=False,
    )
    assert result["integrated_assessment_id"] is None

    assessment_id = result["module_assessment_ids"][0]
    response = client.get(f"{API}/assessments/{assessment_id}", headers=medical_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "insufficient_data"
    assert body["data_sufficiency"] == "insufficient"
    assert body["findings"] == []
    assert "No sufficiently recent" in body["summary"]


def test_analysis_provenance_hash_is_deterministic(client, medical_headers, ids):
    window_end = now() + timedelta(days=1)
    window_start = window_end - timedelta(days=30)
    first = run_analysis(
        client,
        medical_headers,
        ids,
        modules=["environmental"],
        window_start=window_start,
        window_end=window_end,
    )
    second = run_analysis(
        client,
        medical_headers,
        ids,
        modules=["environmental"],
        window_start=window_start,
        window_end=window_end,
    )
    assert first["run_id"] != second["run_id"]
    assert first["input_snapshot_hash"] == second["input_snapshot_hash"]
    assert first["output_hash"] == second["output_hash"]


def test_unavailable_versions_return_conflict(client, medical_headers, ids):
    from helpers import analysis_payload

    algorithm = client.post(
        f"{API}/analysis/runs",
        json=analysis_payload(ids, algorithm_version="not-a-real-algorithm"),
        headers=medical_headers,
    )
    assert algorithm.status_code == 409
    assert algorithm.json()["error"]["code"] == "ALGORITHM_VERSION_UNAVAILABLE"

    rule_set = client.post(
        f"{API}/analysis/runs",
        json=analysis_payload(ids, rule_set_version="not-a-real-rule-set"),
        headers=medical_headers,
    )
    assert rule_set.status_code == 409
    assert rule_set.json()["error"]["code"] == "RULE_SET_VERSION_UNAVAILABLE"


def test_invalid_analysis_requests(client, medical_headers, ids):
    from helpers import analysis_payload

    module = client.post(
        f"{API}/analysis/runs",
        json=analysis_payload(ids, modules=["astrology"]),
        headers=medical_headers,
    )
    assert module.status_code == 422
    assert module.json()["error"]["code"] == "UNSUPPORTED_ENTITY_TYPE"

    end = now()
    reversed_window = client.post(
        f"{API}/analysis/runs",
        json=analysis_payload(
            ids, window_start=end, window_end=end - timedelta(days=1)
        ),
        headers=medical_headers,
    )
    assert reversed_window.status_code == 422
    assert reversed_window.json()["error"]["code"] == "INVALID_TIMESTAMP"


def test_analysis_requires_health_access(client, admin_headers, ids):
    from helpers import analysis_payload

    response = client.post(
        f"{API}/analysis/runs",
        json=analysis_payload(ids),
        headers=admin_headers,
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ROLE_FORBIDDEN"


def test_unknown_assessment_and_run_are_not_found(client, medical_headers):
    import uuid

    assessment = client.get(
        f"{API}/assessments/{uuid.uuid4()}", headers=medical_headers
    )
    assert assessment.status_code == 404
    assert assessment.json()["error"]["code"] == "NOT_FOUND"

    run = client.get(f"{API}/analysis/runs/{uuid.uuid4()}", headers=medical_headers)
    assert run.status_code == 404
    assert run.json()["error"]["code"] == "NOT_FOUND"
