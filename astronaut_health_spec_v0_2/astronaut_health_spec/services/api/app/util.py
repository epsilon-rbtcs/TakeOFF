"""Shared helpers: UTC timestamps, canonical JSON hashing and cursors."""
from __future__ import annotations

import base64
import binascii
import hashlib
import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any

_ISO_RE = re.compile(r"Z$|[+-]\d{2}:?\d{2}$")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_aware(value: datetime | None, field: str) -> datetime | None:
    """Reject naive timestamps instead of silently reinterpreting them."""
    if value is None:
        return None
    if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
        raise ValueError(f"{field} must include an explicit UTC offset")
    return value.astimezone(timezone.utc)


def _normalise_numbers(value: Any) -> Any:
    """Match JavaScript JSON semantics for integral floats (76.0 -> 76)."""
    if isinstance(value, bool):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, dict):
        return {str(k): _normalise_numbers(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_normalise_numbers(item) for item in value]
    return value


def canonical_json(document: Any) -> str:
    return json.dumps(
        _normalise_numbers(document),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )


def canonical_hash(document: Any) -> str:
    """SHA-256 over canonical immutable event JSON (UTF-8, sorted keys)."""
    return hashlib.sha256(canonical_json(document).encode("utf-8")).hexdigest()


def event_hash(event: dict) -> str:
    document = {key: value for key, value in event.items() if key != "payload_hash"}
    return canonical_hash(document)


def batch_hash(events: list[dict]) -> str:
    """Batch hash covers the ordered canonical event list."""
    ordered = [{key: value for key, value in event.items() if key != "payload_hash"} for event in events]
    return canonical_hash(ordered)


def encode_cursor(document: dict) -> str:
    raw = json.dumps(document, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def decode_cursor(cursor: str) -> dict:
    padded = cursor + "=" * (-len(cursor) % 4)
    try:
        raw = base64.urlsafe_b64decode(padded.encode("ascii"))
        value = json.loads(raw.decode("utf-8"))
    except (binascii.Error, ValueError, UnicodeDecodeError) as exc:
        raise ValueError("cursor is not decodable") from exc
    if not isinstance(value, dict):
        raise ValueError("cursor payload must be an object")
    return value


def as_uuid(value: str | uuid.UUID | None, field: str) -> uuid.UUID | None:
    if value is None:
        return None
    if isinstance(value, uuid.UUID):
        return value
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError, TypeError) as exc:
        raise ValueError(f"{field} must be a UUID") from exc


def safe_uuid(value: str | uuid.UUID | None) -> uuid.UUID | None:
    try:
        return as_uuid(value, "value")
    except ValueError:
        return None


def deterministic_event_id(*parts: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_URL, "crew-health:'" + "':".join(parts))


def truncate(value: str, limit: int = 2000) -> str:
    return value if len(value) <= limit else value[: limit - 1] + "\u2026"


def iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()


def jsonable(value: Any) -> Any:
    """Convert ORM-friendly values (UUID/datetime/Decimal) to JSON-safe values."""
    import decimal

    if isinstance(value, (uuid.UUID,)):
        return str(value)
    if isinstance(value, datetime):
        return iso(value)
    if isinstance(value, decimal.Decimal):
        return float(value)
    if isinstance(value, dict):
        return {str(key): jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [jsonable(item) for item in value]
    return value
