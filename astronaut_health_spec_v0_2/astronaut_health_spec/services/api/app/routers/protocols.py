"""Protocol/configuration publication."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import security
from ..db import get_db
from ..schemas import ProtocolVersionIn
from ..services import configuration

router = APIRouter(tags=["protocols"])


@router.post("/protocols/versions", status_code=201)
def publish_protocol_version(
    body: ProtocolVersionIn,
    principal: security.Principal = Depends(security.get_principal),
    db: Session = Depends(get_db),
) -> dict:
    return configuration.publish_protocol_version(db, principal, body)
