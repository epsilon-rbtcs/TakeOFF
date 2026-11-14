"""Append-only, strictly ordered per-mission change feed."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import ChangeFeed, Mission
from .util import canonical_hash, iso, jsonable, utc_now


def next_sequence(db: Session, mission_id: uuid.UUID) -> int:
    """Increment ``missions.change_seq`` while holding the row lock.

    The caller must keep the transaction open until commit.  PostgreSQL releases
    the row lock at commit, so a later feed row cannot commit ahead of an
    earlier sequence number.
    """
    mission = db.execute(
        select(Mission).where(Mission.id == mission_id).with_for_update()
    ).scalar_one_or_none()
    if mission is None:
        raise ValueError("Mission not found while appending to the change feed.")
    mission.change_seq = int(mission.change_seq) + 1
    return mission.change_seq


def append_change(
    db: Session,
    *,
    mission_id: uuid.UUID,
    entity_type: str,
    entity_id: uuid.UUID,
    operation: str,
    actor_id: str,
    origin: str,
    payload: dict[str, Any],
    client_id: uuid.UUID | None = None,
    expected_revision: int | None = None,
    schema_version: int = 1,
    created_at: datetime | None = None,
    event_id: uuid.UUID | None = None,
) -> ChangeFeed:
    sequence = next_sequence(db, mission_id)
    safe_payload = jsonable(payload)
    row = ChangeFeed(
        mission_id=mission_id,
        sequence=sequence,
        event_id=event_id or uuid.uuid4(),
        client_id=client_id,
        actor_id=actor_id,
        origin=origin,
        entity_type=entity_type,
        entity_id=entity_id,
        operation=operation,
        schema_version=schema_version,
        created_at=created_at or utc_now(),
        server_received_at=utc_now(),
        payload_hash=canonical_hash(safe_payload),
        expected_revision=expected_revision,
        payload=safe_payload,
    )
    db.add(row)
    return row


def feed_item(row: ChangeFeed) -> dict[str, Any]:
    return {
        "event_id": str(row.event_id),
        "entity_type": row.entity_type,
        "entity_id": str(row.entity_id),
        "operation": row.operation,
        "schema_version": row.schema_version,
        "client_id": str(row.client_id) if row.client_id else None,
        "mission_id": str(row.mission_id),
        "actor_id": row.actor_id,
        "origin": row.origin,
        "created_at": iso(row.created_at),
        "server_sequence": row.sequence,
        "server_received_at": iso(row.server_received_at),
        "payload_hash": row.payload_hash,
        "expected_revision": row.expected_revision,
        "payload": jsonable(row.payload),
    }
