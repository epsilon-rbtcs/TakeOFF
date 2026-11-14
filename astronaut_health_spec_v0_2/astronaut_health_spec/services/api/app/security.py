"""Demo bearer authentication and mission-scoped authorization."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import audit
from .config import settings
from .db import get_db
from .errors import (
    ASTRONAUT_SCOPE_MISMATCH,
    FORBIDDEN,
    MISSION_ACCESS_MISMATCH,
    ROLE_FORBIDDEN,
    TOKEN_EXPIRED,
    TOKEN_INVALID,
    UNAUTHENTICATED,
    VALIDATION_ERROR,
    ApiError,
)
from .models import AppUser, Mission, UserMissionScope
from .util import utc_now

ROLES = {"crew_member", "medical_officer", "administrator"}


def hash_password(password: str) -> str:
    raw = password.encode("utf-8")
    if len(raw) > 72:
        raise ValueError("demo passwords must be at most 72 UTF-8 bytes")
    return bcrypt.hashpw(raw, bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], password_hash.encode("ascii"))
    except (ValueError, TypeError):
        return False


@dataclass(frozen=True)
class MissionScope:
    mission_id: uuid.UUID
    astronaut_id: uuid.UUID | None


@dataclass
class Principal:
    user_id: uuid.UUID
    username: str
    role: str
    mission_scopes: list[MissionScope] = field(default_factory=list)
    astronaut_id: uuid.UUID | None = None
    client_id: uuid.UUID | None = None
    token_id: str | None = None

    @property
    def actor_id(self) -> str:
        return self.username

    @property
    def mission_ids(self) -> list[uuid.UUID]:
        return [scope.mission_id for scope in self.mission_scopes]

    def has_mission(self, mission_id: uuid.UUID) -> bool:
        return any(scope.mission_id == mission_id for scope in self.mission_scopes)

    def scope_for(self, mission_id: uuid.UUID) -> MissionScope | None:
        for scope in self.mission_scopes:
            if scope.mission_id == mission_id:
                return scope
        return None


def _bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise ApiError(401, UNAUTHENTICATED, "A bearer token is required.")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise ApiError(401, UNAUTHENTICATED, "Authorization must use the Bearer scheme.")
    return token.strip()


def create_access_token(
    *,
    user_id: uuid.UUID,
    username: str,
    role: str,
    mission_ids: list[uuid.UUID],
    astronaut_id: uuid.UUID | None,
    client_id: uuid.UUID | None = None,
) -> tuple[str, int, int]:
    issued_at = utc_now()
    expires_delta = settings.token_ttl_seconds
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "mission_ids": [str(item) for item in mission_ids],
        "astronaut_id": str(astronaut_id) if astronaut_id else None,
        "client_id": str(client_id) if client_id else None,
        "iss": settings.token_issuer,
        "iat": int(issued_at.timestamp()),
        "exp": int((issued_at + timedelta(seconds=expires_delta)).timestamp()),
        "jti": str(uuid.uuid4()),
    }
    token = jwt.encode(payload, settings.resolved_jwt_secret, algorithm=settings.jwt_algorithm)
    return token, expires_delta, int(issued_at.timestamp())


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.resolved_jwt_secret,
            algorithms=[settings.jwt_algorithm],
            issuer=settings.token_issuer,
            options={"require": ["exp", "iat", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise ApiError(401, TOKEN_EXPIRED, "The bearer token has expired.") from exc
    except jwt.PyJWTError as exc:
        raise ApiError(401, TOKEN_INVALID, "The bearer token is invalid.") from exc


def load_principal(db: Session, claims: dict) -> Principal:
    try:
        user_id = uuid.UUID(str(claims.get("sub")))
    except (ValueError, TypeError) as exc:
        raise ApiError(401, TOKEN_INVALID, "The bearer token subject is invalid.") from exc
    user = db.get(AppUser, user_id)
    if user is None or not user.active:
        raise ApiError(401, TOKEN_INVALID, "The demo identity is inactive or unknown.")
    rows = db.scalars(select(UserMissionScope).where(UserMissionScope.user_id == user.id)).all()
    scopes = [MissionScope(row.mission_id, row.astronaut_id) for row in rows]
    astronaut_id = None
    token_astronaut = claims.get("astronaut_id")
    if token_astronaut:
        try:
            astronaut_id = uuid.UUID(str(token_astronaut))
        except ValueError:
            astronaut_id = None
    if astronaut_id is None:
        assigned = [scope.astronaut_id for scope in scopes if scope.astronaut_id]
        astronaut_id = assigned[0] if assigned else None
    client_id = None
    token_client = claims.get("client_id")
    if token_client:
        try:
            client_id = uuid.UUID(str(token_client))
        except ValueError:
            client_id = None
    return Principal(
        user_id=user.id,
        username=user.username,
        role=user.role,
        mission_scopes=scopes,
        astronaut_id=astronaut_id,
        client_id=client_id,
        token_id=claims.get("jti"),
    )


def get_principal(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Principal:
    token = _bearer_token(authorization)
    claims = decode_access_token(token)
    return load_principal(db, claims)


def deny(
    db: Session,
    principal: Principal | None,
    *,
    status_code: int,
    code: str,
    message: str,
    action: str,
    mission_id: uuid.UUID | None = None,
    astronaut_id: uuid.UUID | None = None,
    entity_type: str = "authorization",
    details: dict | None = None,
) -> ApiError:
    if principal is not None:
        audit.record(
            db,
            actor_id=principal.actor_id,
            actor_role=principal.role,
            action=action,
            entity_type=entity_type,
            outcome="denied",
            mission_id=mission_id,
            astronaut_id=astronaut_id,
            details={"reason": code, **(details or {})},
        )
        db.commit()
    return ApiError(status_code, code, message, details)


def check_role(
    db: Session,
    principal: Principal,
    allowed: set[str],
    *,
    action: str,
    mission_id: uuid.UUID | None = None,
    astronaut_id: uuid.UUID | None = None,
) -> None:
    if principal.role not in allowed:
        raise deny(
            db,
            principal,
            status_code=403,
            code=ROLE_FORBIDDEN,
            message=f"Role '{principal.role}' may not perform this operation.",
            action=action,
            mission_id=mission_id,
            astronaut_id=astronaut_id,
            details={"allowed_roles": sorted(allowed)},
        )


def check_mission_scope(
    db: Session,
    principal: Principal,
    mission_id: uuid.UUID,
    *,
    action: str,
    astronaut_id: uuid.UUID | None = None,
    require_health_access: bool = True,
    allowed_roles: set[str] | None = None,
) -> MissionScope:
    if allowed_roles is not None:
        check_role(
            db,
            principal,
            allowed_roles,
            action=action,
            mission_id=mission_id,
            astronaut_id=astronaut_id,
        )
    if require_health_access and principal.role == "administrator":
        raise deny(
            db,
            principal,
            status_code=403,
            code=ROLE_FORBIDDEN,
            message="Administrator accounts do not receive health-record access by default.",
            action=action,
            mission_id=mission_id,
            astronaut_id=astronaut_id,
        )
    scope = principal.scope_for(mission_id)
    if scope is None:
        raise deny(
            db,
            principal,
            status_code=403,
            code=MISSION_ACCESS_MISMATCH,
            message="The authenticated actor is not scoped to this mission.",
            action=action,
            mission_id=mission_id,
            astronaut_id=astronaut_id,
        )
    if astronaut_id is not None:
        if principal.role == "crew_member":
            if principal.astronaut_id is not None and principal.astronaut_id != astronaut_id:
                raise deny(
                    db,
                    principal,
                    status_code=403,
                    code=ASTRONAUT_SCOPE_MISMATCH,
                    message="Crew members may only access their own crew record.",
                    action=action,
                    mission_id=mission_id,
                    astronaut_id=astronaut_id,
                )
        elif scope.astronaut_id is not None and scope.astronaut_id != astronaut_id:
            raise deny(
                db,
                principal,
                status_code=403,
                code=ASTRONAUT_SCOPE_MISMATCH,
                message="The authenticated actor is not scoped to this astronaut.",
                action=action,
                mission_id=mission_id,
                astronaut_id=astronaut_id,
            )
    return scope


def require_health_role(db: Session, principal: Principal, *, action: str, mission_id: uuid.UUID | None = None,
                        astronaut_id: uuid.UUID | None = None) -> None:
    if principal.role == "administrator":
        raise deny(
            db,
            principal,
            status_code=403,
            code=ROLE_FORBIDDEN,
            message="Administrator accounts do not receive health-record access by default.",
            action=action,
            mission_id=mission_id,
            astronaut_id=astronaut_id,
        )


def ensure_astronaut_assignment(db: Session, mission_id: uuid.UUID, astronaut_id: uuid.UUID) -> None:
    if db.get(Mission, mission_id) is None:
        raise ApiError(404, "NOT_FOUND", "Mission not found.")
    row = db.execute(
        select(UserMissionScope.__table__).select_from(UserMissionScope.__table__).where(
            UserMissionScope.mission_id == mission_id
        )
    )
    del row  # placeholder to keep the import surface explicit
    from .models import AstronautMission

    assignment = db.execute(
        select(AstronautMission).where(
            AstronautMission.astronaut_id == astronaut_id,
            AstronautMission.mission_id == mission_id,
        )
    ).scalar_one_or_none()
    if assignment is None:
        raise ApiError(
            403,
            MISSION_ACCESS_MISMATCH,
            "The astronaut is not assigned to this mission.",
            {"astronaut_id": str(astronaut_id), "mission_id": str(mission_id)},
        )


def scoped_astronaut_ids(principal: Principal, mission_id: uuid.UUID) -> list[uuid.UUID]:
    scope = principal.scope_for(mission_id)
    if scope is None:
        return []
    if scope.astronaut_id is not None:
        return [scope.astronaut_id]
    return []


def infer_mission(
    principal: Principal,
    *,
    requested: uuid.UUID | None = None,
    astronaut_id: uuid.UUID | None = None,
) -> uuid.UUID:
    """Resolve an omitted mission for routes that only document astronaut_id."""
    if requested is not None:
        return requested
    candidates = {
        scope.mission_id
        for scope in principal.mission_scopes
        if astronaut_id is None or scope.astronaut_id in (None, astronaut_id)
    }
    if len(candidates) == 1:
        return next(iter(candidates))
    if not candidates:
        raise ApiError(
            403,
            MISSION_ACCESS_MISMATCH,
            "The authenticated actor has no mission scope for this astronaut.",
        )
    raise ApiError(
        422,
        VALIDATION_ERROR,
        "mission_id is required because the actor is scoped to more than one mission.",
        {"mission_ids": [str(item) for item in sorted(candidates)]},
    )


def token_expiry_iso(seconds: int) -> str:
    return (utc_now() + timedelta(seconds=seconds)).astimezone(timezone.utc).isoformat()


def principal_debug(principal: Principal) -> dict:  # pragma: no cover - diagnostics only
    return {
        "username": principal.username,
        "role": principal.role,
        "missions": [str(item) for item in principal.mission_ids],
        "astronaut_id": str(principal.astronaut_id) if principal.astronaut_id else None,
    }


_ = FORBIDDEN  # re-exported constant used by routers
