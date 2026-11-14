"""Shared builders for API tests."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

ALGORITHM_VERSION = "demo-rules-0.3.0"
RULE_SET_VERSION = "demo-config-0.3.0"
CATALOGUE_VERSION = "demo-catalog-0.3.0"


def now() -> datetime:
    return datetime.now(timezone.utc)


def iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat()


def observation_payload(
    ids: dict[str, str],
    *,
    observation_id: uuid.UUID | None = None,
    measurement_code: str = "resting_heart_rate",
    value: Any = 60.0,
    unit: str | None = "bpm",
    measured_at: datetime | None = None,
    source_type: str = "wearable",
    quality_status: str = "valid",
    context: dict[str, Any] | None = None,
    idempotency_key: str | None = None,
    mission_id: str | None = None,
    astronaut_id: str | None = None,
    catalogue_version: str = CATALOGUE_VERSION,
    simulated: bool = True,
) -> dict[str, Any]:
    measured = measured_at or now()
    return {
        "observation_id": str(observation_id or uuid.uuid4()),
        "astronaut_id": astronaut_id or ids["astronaut_id"],
        "mission_id": mission_id or ids["mission_id"],
        "measurement_code": measurement_code,
        "catalogue_version": catalogue_version,
        "value": value,
        "unit": unit,
        "measured_at": iso(measured),
        "created_at": iso(measured),
        "clock_quality": {"status": "good", "method": "test_fixture"},
        "source": {"type": source_type, "external_id": "pytest"},
        "quality": {"status": quality_status, "score": 0.9, "details": {}},
        "context": context or {"synthetic": True},
        "simulated": simulated,
        "idempotency_key": idempotency_key,
    }


def analysis_payload(
    ids: dict[str, str],
    *,
    modules: list[str] | None = None,
    window_start: datetime | None = None,
    window_end: datetime | None = None,
    include_integrated_assessment: bool = True,
    algorithm_version: str = ALGORITHM_VERSION,
    rule_set_version: str = RULE_SET_VERSION,
) -> dict[str, Any]:
    end = window_end or now() + timedelta(days=1)
    start = window_start or end - timedelta(days=30)
    return {
        "astronaut_id": ids["astronaut_id"],
        "mission_id": ids["mission_id"],
        "window_start": iso(start),
        "window_end": iso(end),
        "modules": modules or ["cardiovascular", "behavioural_cognitive"],
        "include_integrated_assessment": include_integrated_assessment,
        "algorithm_version": algorithm_version,
        "rule_set_version": rule_set_version,
    }


def run_analysis(
    client,
    headers: dict[str, str],
    ids: dict[str, str],
    **kwargs,
) -> dict[str, Any]:
    response = client.post(
        "/api/v1/analysis/runs",
        json=analysis_payload(ids, **kwargs),
        headers=headers,
    )
    assert response.status_code == 200, response.text
    return response.json()


def alert_for_run(client, headers: dict[str, str], ids: dict[str, str], run_id: str) -> dict:
    response = client.get(
        "/api/v1/alerts",
        params={"astronaut_id": ids["astronaut_id"], "mission_id": ids["mission_id"]},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    matches = [
        item
        for item in response.json()["items"]
        if (item.get("provenance") or {}).get("analysis_run_id") == run_id
    ]
    assert matches, "analysis run did not create an alert"
    return matches[0]
