"""Phase 1 FastAPI monolith: demo auth, crew sync, and ground retrieval."""
from __future__ import annotations

import hashlib
import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, Integer, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ground-health.db")
engine = create_engine(DATABASE_URL, future=True)
SessionLocal = sessionmaker(engine, expire_on_commit=False)

DEMO_ASTRONAUT_ID = "11111111-1111-1111-1111-111111111111"
DEMO_MISSION_ID = "22222222-2222-2222-2222-222222222222"
DEMO_CLIENT_ID = "33333333-3333-3333-3333-333333333333"
DEMO_CREW_TOKEN = "demo-crew-token"
DEMO_GROUND_TOKEN = "demo-ground-token"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class SyncEventRow(Base):
    __tablename__ = "sync_events"
    event_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    mission_id: Mapped[str] = mapped_column(String(36), nullable=False)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ObservationRow(Base):
    __tablename__ = "observations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    astronaut_id: Mapped[str] = mapped_column(String(36), nullable=False)
    mission_id: Mapped[str] = mapped_column(String(36), nullable=False)
    value: Mapped[float] = mapped_column(nullable=False)
    measured_at: Mapped[str] = mapped_column(String, nullable=False)
    client_created_at: Mapped[str] = mapped_column(String, nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)


class AssessmentRow(Base):
    __tablename__ = "assessments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    astronaut_id: Mapped[str] = mapped_column(String(36), nullable=False)
    mission_id: Mapped[str] = mapped_column(String(36), nullable=False)
    assessed_at: Mapped[str] = mapped_column(String, nullable=False)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)


class CommunicationRow(Base):
    __tablename__ = "communications"
    client_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    state: Mapped[str] = mapped_column(String(16), nullable=False)
    observed_at: Mapped[str] = mapped_column(String, nullable=False)
    last_successful_contact_at: Mapped[str | None] = mapped_column(String, nullable=True)
    queued_event_count: Mapped[int] = mapped_column(Integer, nullable=False)


class DemoTokenIn(BaseModel):
    username: str
    password: str


class SyncEvent(BaseModel):
    event_id: str
    entity_type: Literal["observation", "analysis_run", "module_assessment", "communication_status"]
    entity_id: str
    operation: Literal["upsert", "append_event", "revoke"] = "upsert"
    schema_version: int = Field(ge=1)
    client_id: str
    mission_id: str
    actor_id: str
    origin: Literal["crew_client"]
    created_at: str
    payload_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    payload: dict[str, Any]


class SyncPushIn(BaseModel):
    batch_id: str
    events: list[SyncEvent] = Field(min_length=1, max_length=50)


def actor(authorization: str | None = Header(default=None)) -> str:
    if authorization == f"Bearer {DEMO_CREW_TOKEN}":
        return "crew"
    if authorization == f"Bearer {DEMO_GROUND_TOKEN}":
        return "ground"
    raise HTTPException(401, "Valid demo bearer token required")


def canonical_hash(event: SyncEvent) -> str:
    document = event.model_dump(exclude={"payload_hash"})
    return hashlib.sha256(json.dumps(document, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def ensure_scope(event: SyncEvent) -> None:
    if event.mission_id != DEMO_MISSION_ID or event.client_id != DEMO_CLIENT_ID:
        raise HTTPException(403, "Event is outside this demo crew scope")


def apply_event(db: Session, event: SyncEvent, received_at: datetime) -> None:
    if event.entity_type == "observation":
        payload = event.payload
        if payload.get("astronaut_id") != DEMO_ASTRONAUT_ID or payload.get("mission_id") != event.mission_id:
            raise HTTPException(422, "Observation is outside the seeded demo crew scope")
        if payload.get("observation_id") != event.entity_id or not isinstance(payload.get("value"), (int, float)):
            raise HTTPException(422, "Observation identity or numeric value is invalid")
        db.merge(ObservationRow(id=event.entity_id, astronaut_id=DEMO_ASTRONAUT_ID,
                 mission_id=event.mission_id, value=float(payload["value"]),
                 measured_at=payload["measured_at"], client_created_at=payload["created_at"],
                 received_at=received_at, payload_json=json.dumps(payload)))
    elif event.entity_type == "module_assessment":
        payload = event.payload
        db.merge(AssessmentRow(id=event.entity_id, astronaut_id=DEMO_ASTRONAUT_ID,
                 mission_id=event.mission_id, assessed_at=payload["assessed_at"],
                 payload_json=json.dumps(payload)))
    elif event.entity_type == "communication_status":
        payload = event.payload
        db.merge(CommunicationRow(client_id=event.client_id, state=payload["state"],
                 observed_at=payload["observed_at"],
                 last_successful_contact_at=payload.get("last_successful_contact_at"),
                 queued_event_count=int(payload["queued_event_count"])))


app = FastAPI(title="Crew Health Dual-Client API", version="0.3.0-phase1")


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(engine)


@app.post("/api/v1/auth/demo-token")
def demo_token(body: DemoTokenIn) -> dict[str, Any]:
    users = {"astronaut": ("crew-demo", DEMO_CREW_TOKEN, "crew_member"),
             "medical": ("ground-demo", DEMO_GROUND_TOKEN, "medical_officer")}
    account = users.get(body.username)
    if not account or body.password != account[0]:
        raise HTTPException(401, "Invalid demo credentials")
    return {"access_token": account[1], "token_type": "bearer", "expires_in": 3600,
            "role": account[2], "mission_ids": [DEMO_MISSION_ID],
            "astronaut_id": DEMO_ASTRONAUT_ID if account[2] == "crew_member" else None}


@app.post("/api/v1/sync/push")
def push(body: SyncPushIn, _: str = Depends(actor)) -> dict[str, Any]:
    results = []
    with SessionLocal.begin() as db:
        for event in body.events:
            ensure_scope(event)
            if canonical_hash(event) != event.payload_hash:
                results.append({"event_id": event.event_id, "status": "rejected", "reason": "PAYLOAD_HASH_MISMATCH"})
                continue
            existing = db.get(SyncEventRow, event.event_id)
            if existing:
                if existing.payload_hash != event.payload_hash:
                    results.append({"event_id": event.event_id, "status": "conflict", "reason": "ID_REUSE_MISMATCH"})
                else:
                    results.append({"event_id": event.event_id, "status": "duplicate", "received_at": existing.received_at.isoformat()})
                continue
            received_at = utc_now()
            apply_event(db, event, received_at)
            db.add(SyncEventRow(event_id=event.event_id, payload_hash=event.payload_hash,
                   entity_type=event.entity_type, entity_id=event.entity_id,
                   mission_id=event.mission_id, payload_json=json.dumps(event.payload), received_at=received_at))
            results.append({"event_id": event.event_id, "status": "accepted", "received_at": received_at.isoformat()})
        # The successful request is evidence of contact, not proof that the crew was
        # previously in blackout. The explicit communication_status event remains
        # available for a later phase; this bounded Phase 1 path reports LIVE only
        # after the simulated adapter has restored a route.
        if any(item["status"] in ("accepted", "duplicate") for item in results):
            db.merge(CommunicationRow(client_id=DEMO_CLIENT_ID, state="LIVE", observed_at=utc_now().isoformat(),
                     last_successful_contact_at=utc_now().isoformat(), queued_event_count=0))
    return {"batch_id": body.batch_id, "acknowledged_at": utc_now().isoformat(), "results": results}


@app.get("/api/v1/dashboard/summary")
def dashboard(astronaut_id: str, mission_id: str, _: str = Depends(actor)) -> dict[str, Any]:
    if astronaut_id != DEMO_ASTRONAUT_ID or mission_id != DEMO_MISSION_ID:
        raise HTTPException(403, "Demo scope mismatch")
    with SessionLocal() as db:
        observations = db.scalars(select(ObservationRow).order_by(ObservationRow.received_at.desc())).all()
        assessments = db.scalars(select(AssessmentRow).order_by(AssessmentRow.assessed_at.desc())).all()
        comm = db.get(CommunicationRow, DEMO_CLIENT_ID)
    now = utc_now()
    items = [{**json.loads(row.payload_json), "received_at": row.received_at.isoformat()} for row in observations]
    assessment_items = [json.loads(row.payload_json) for row in assessments]
    latest = observations[0] if observations else None
    freshness = "unknown" if not latest else "current"
    return {"astronaut_id": astronaut_id, "mission_id": mission_id, "simulated": True,
            "observations": items, "assessments": assessment_items,
            "latest_measured_at": latest.measured_at if latest else None,
            "latest_received_at": latest.received_at.isoformat() if latest else None,
            "freshness": freshness, "generated_at": now.isoformat(),
            "communication": None if not comm else {"state": comm.state, "observed_at": comm.observed_at,
              "last_successful_contact_at": comm.last_successful_contact_at, "queued_event_count": comm.queued_event_count}}
