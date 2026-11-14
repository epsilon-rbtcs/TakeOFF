"""Consistent API error objects and request identifiers."""
from __future__ import annotations

import logging
from contextvars import ContextVar
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("crew_health.api")

request_id_var: ContextVar[str] = ContextVar("request_id", default="")


def current_request_id() -> str:
    return request_id_var.get() or ""


class ApiError(Exception):
    """Domain error rendered using the documented ``ErrorResponse`` shape."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}


# Stable machine-readable codes used across the API.
UNAUTHENTICATED = "UNAUTHENTICATED"
TOKEN_EXPIRED = "TOKEN_EXPIRED"
TOKEN_INVALID = "TOKEN_INVALID"
FORBIDDEN = "FORBIDDEN"
ROLE_FORBIDDEN = "ROLE_FORBIDDEN"
MISSION_ACCESS_MISMATCH = "MISSION_ACCESS_MISMATCH"
ASTRONAUT_SCOPE_MISMATCH = "ASTRONAUT_SCOPE_MISMATCH"
NOT_FOUND = "NOT_FOUND"
VALIDATION_ERROR = "VALIDATION_ERROR"
INTERNAL_ERROR = "INTERNAL_ERROR"
UNKNOWN_MEASUREMENT = "UNKNOWN_MEASUREMENT"
UNKNOWN_CATALOGUE_VERSION = "UNKNOWN_CATALOGUE_VERSION"
UNSUPPORTED_UNIT = "UNSUPPORTED_UNIT"
UNSUPPORTED_SOURCE_TYPE = "UNSUPPORTED_SOURCE_TYPE"
INVALID_VALUE = "INVALID_VALUE"
INVALID_TIMESTAMP = "INVALID_TIMESTAMP"
INVALID_SOURCE_DEVICE = "INVALID_SOURCE_DEVICE"
DUPLICATE_OBSERVATION = "DUPLICATE_OBSERVATION"
IDEMPOTENCY_KEY_REUSED = "IDEMPOTENCY_KEY_REUSED"
REVISION_CONFLICT = "REVISION_CONFLICT"
ID_REUSE_MISMATCH = "ID_REUSE_MISMATCH"
PAYLOAD_HASH_MISMATCH = "PAYLOAD_HASH_MISMATCH"
UNSUPPORTED_SCHEMA_VERSION = "UNSUPPORTED_SCHEMA_VERSION"
UNSUPPORTED_ENTITY_TYPE = "UNSUPPORTED_ENTITY_TYPE"
UNSUPPORTED_OPERATION = "UNSUPPORTED_OPERATION"
CLIENT_SCOPE_MISMATCH = "CLIENT_SCOPE_MISMATCH"
BATCH_ID_MISMATCH = "BATCH_ID_MISMATCH"
INVALID_CURSOR = "INVALID_CURSOR"
BLOCKED_EVENT_SCHEMA = "BLOCKED_EVENT_SCHEMA"
ALGORITHM_VERSION_UNAVAILABLE = "ALGORITHM_VERSION_UNAVAILABLE"
RULE_SET_VERSION_UNAVAILABLE = "RULE_SET_VERSION_UNAVAILABLE"
EVIDENCE_SCOPE_MISMATCH = "EVIDENCE_SCOPE_MISMATCH"
BASELINE_SCOPE_MISMATCH = "BASELINE_SCOPE_MISMATCH"
MESSAGE_EXPIRED = "MESSAGE_EXPIRED"
MESSAGE_STATE_INVALID = "MESSAGE_STATE_INVALID"
DEMO_AUTH_DISABLED = "DEMO_AUTH_DISABLED"
CONFLICT = "CONFLICT"


def error_body(code: str, message: str, details: dict | None = None, request_id: str | None = None) -> dict:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
            "request_id": request_id if request_id is not None else current_request_id(),
        }
    }


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(exc.code, exc.message, exc.details),
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Never echo submitted values back; only field locations and messages.
        errors = [
            {"loc": list(item.get("loc", [])), "msg": item.get("msg", ""), "type": item.get("type", "")}
            for item in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content=error_body(VALIDATION_ERROR, "Request validation failed.", {"errors": errors}),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = {
            401: UNAUTHENTICATED,
            403: FORBIDDEN,
            404: NOT_FOUND,
            405: "METHOD_NOT_ALLOWED",
            409: CONFLICT,
            422: VALIDATION_ERROR,
        }.get(exc.status_code, f"HTTP_{exc.status_code}")
        detail = exc.detail if isinstance(exc.detail, str) else "Request could not be completed."
        return JSONResponse(status_code=exc.status_code, content=error_body(code, detail))

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception) -> JSONResponse:
        # Log the failure type without request bodies or health payloads.
        logger.error("Unhandled API error: %s", type(exc).__name__)
        return JSONResponse(
            status_code=500,
            content=error_body(INTERNAL_ERROR, "An internal error occurred while processing the request."),
        )
