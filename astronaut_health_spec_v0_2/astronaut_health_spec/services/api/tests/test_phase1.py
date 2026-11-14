from app.main import (Base, DEMO_ASTRONAUT_ID, DEMO_CLIENT_ID, DEMO_MISSION_ID,
                      ObservationRow, SessionLocal, SyncEvent, SyncEventRow, apply_event, canonical_hash,
                      engine, utc_now)


def event(entity_type: str, entity_id: str, payload: dict) -> SyncEvent:
    value = {"event_id": entity_id, "entity_type": entity_type, "entity_id": entity_id,
      "schema_version": 1, "client_id": DEMO_CLIENT_ID, "mission_id": DEMO_MISSION_ID,
      "actor_id": "demo-astronaut", "origin": "crew_client", "created_at": "2026-11-14T08:30:01Z", "payload": payload}
    provisional = SyncEvent(payload_hash="0" * 64, **value)
    return SyncEvent(payload_hash=canonical_hash(provisional), **value)


def test_event_hash_and_ground_persistence_are_idempotent():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    observation = event("observation", "44444444-4444-4444-4444-444444444444", {"observation_id": "44444444-4444-4444-4444-444444444444", "astronaut_id": DEMO_ASTRONAUT_ID, "mission_id": DEMO_MISSION_ID, "measurement_code": "heart_rate", "catalogue_version": "demo-catalog-0.3.0", "value": 72, "unit": "bpm", "measured_at": "2026-11-14T08:30:00Z", "created_at": "2026-11-14T08:30:01Z", "source": {"type": "simulation"}, "quality": {"status": "valid"}, "simulated": True})
    assert canonical_hash(observation) == observation.payload_hash
    with SessionLocal.begin() as db:
        apply_event(db, observation, utc_now())
        db.add(SyncEventRow(event_id=observation.event_id, payload_hash=observation.payload_hash, entity_type=observation.entity_type, entity_id=observation.entity_id, mission_id=observation.mission_id, payload_json="{}", received_at=utc_now()))
    with SessionLocal() as db:
        assert db.get(SyncEventRow, observation.event_id).payload_hash == observation.payload_hash


def test_scoped_synthetic_checkin_observation_is_persisted():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    record = event("observation", "55555555-5555-5555-5555-555555555555", {"observation_id": "55555555-5555-5555-5555-555555555555", "astronaut_id": DEMO_ASTRONAUT_ID, "mission_id": DEMO_MISSION_ID, "measurement_code": "sleep_duration", "catalogue_version": "demo-catalog-0.3.0", "value": 7.5, "unit": "h", "measured_at": "2026-11-14T08:30:00Z", "created_at": "2026-11-14T08:30:01Z", "source": {"type": "manual"}, "quality": {"status": "unreviewed"}, "simulated": True})
    with SessionLocal.begin() as db:
        apply_event(db, record, utc_now())
    with SessionLocal() as db:
        stored = db.get(ObservationRow, record.event_id)
        assert stored is not None
        assert stored.value == 7.5
