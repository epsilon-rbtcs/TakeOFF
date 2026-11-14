"""Demo identity exchange."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import audit, security
from ..config import settings
from ..db import get_db
from ..errors import DEMO_AUTH_DISABLED, TOKEN_INVALID, ApiError
from ..models import AppUser, UserMissionScope
from ..schemas import DemoTokenIn
from ..util import utc_now

router = APIRouter(tags=["auth"])


@router.post("/auth/demo-token")
def create_demo_token(body: DemoTokenIn, db: Session = Depends(get_db)) -> dict:
    if settings.is_production or not settings.demo_seed_enabled:
        raise ApiError(
            403,
            DEMO_AUTH_DISABLED,
            "Demo identity exchange is disabled; configure a production identity provider.",
        )
    user = db.execute(
        select(AppUser).where(AppUser.username == body.username)
    ).scalar_one_or_none()
    if user is None or not user.active or not security.verify_password(body.password, user.password_hash):
        audit.record_and_commit(
            db,
            actor_id=body.username[:120],
            actor_role="unknown",
            action="auth.demo_token",
            entity_type="app_user",
            outcome="denied",
            details={"reason": TOKEN_INVALID},
        )
        raise ApiError(401, TOKEN_INVALID, "Demo identity credentials are invalid or inactive.")

    scopes = db.execute(
        select(UserMissionScope).where(UserMissionScope.user_id == user.id)
    ).scalars().all()
    mission_ids = sorted({scope.mission_id for scope in scopes}, key=str)
    astronaut_id = next((scope.astronaut_id for scope in scopes if scope.astronaut_id), None)
    token, expires_in, issued_at = security.create_access_token(
        user_id=user.id,
        username=user.username,
        role=user.role,
        mission_ids=mission_ids,
        astronaut_id=astronaut_id,
    )
    audit.record(
        db,
        actor_id=user.username,
        actor_role=user.role,
        action="auth.demo_token",
        entity_type="app_user",
        entity_id=user.id,
        outcome="success",
        astronaut_id=astronaut_id,
        details={"mission_count": len(mission_ids), "issued_at": issued_at},
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": expires_in,
        "role": user.role,
        "mission_ids": [str(item) for item in mission_ids],
        "astronaut_id": str(astronaut_id) if astronaut_id else None,
    }
