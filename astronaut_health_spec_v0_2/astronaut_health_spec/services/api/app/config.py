"""Environment-backed configuration for the ground API.

All values are read once at import time.  Tests set the relevant environment
variables before importing the application; production deployments must supply
``JWT_SECRET`` and ``DATABASE_URL`` explicitly.
"""
from __future__ import annotations

import os
import secrets
from dataclasses import dataclass, field
from functools import lru_cache

DEFAULT_DATABASE_URL = "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/astronaut_health"


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError:  # pragma: no cover - defensive configuration handling
        return default


@dataclass(frozen=True)
class Settings:
    app_env: str = "development"
    database_url: str = DEFAULT_DATABASE_URL
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    token_ttl_seconds: int = 3600
    token_issuer: str = "crew-health-ground-api"
    cors_origins: list[str] = field(default_factory=list)
    schema_sql_path: str = ""
    contact_recent_seconds: int = 900
    contact_stale_seconds: int = 3600
    freshness_current_seconds: int = 3600
    freshness_delayed_seconds: int = 21600
    demo_seed_enabled: bool = True
    auto_apply_schema: bool = False
    seed_on_startup: bool = False

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"production", "prod"}

    @property
    def is_demo(self) -> bool:
        return self.app_env.lower() in {"development", "dev", "demo", "test", "testing"}

    @property
    def resolved_jwt_secret(self) -> str:
        if self.jwt_secret:
            return self.jwt_secret
        if self.is_production:
            raise RuntimeError(
                "JWT_SECRET must be configured outside of demo/development environments"
            )
        # A per-process development secret keeps demo tokens short-lived and never
        # ships a fixed credential in source control.
        return _DEV_SECRET

    @property
    def allowed_schema_versions(self) -> set[int]:
        return {1}


_DEV_SECRET = secrets.token_urlsafe(48)


def load_settings() -> Settings:
    env = os.getenv("APP_ENV", "development")
    secret = os.getenv("JWT_SECRET", "")
    cors = _split_csv(os.getenv("CORS_ORIGINS"))
    if not cors:
        cors = ["http://localhost:5173", "http://127.0.0.1:5173"]
    return Settings(
        app_env=env,
        database_url=os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL),
        jwt_secret=secret,
        jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        token_ttl_seconds=_int_env("JWT_EXPIRES_SECONDS", 3600),
        token_issuer=os.getenv("JWT_ISSUER", "crew-health-ground-api"),
        cors_origins=cors,
        schema_sql_path=os.getenv("SCHEMA_SQL_PATH", ""),
        contact_recent_seconds=_int_env("CONTACT_RECENT_SECONDS", 900),
        contact_stale_seconds=_int_env("CONTACT_STALE_SECONDS", 3600),
        freshness_current_seconds=_int_env("FRESHNESS_CURRENT_SECONDS", 3600),
        freshness_delayed_seconds=_int_env("FRESHNESS_DELAYED_SECONDS", 21600),
        demo_seed_enabled=os.getenv("DEMO_SEED_ENABLED", "true").lower() not in {"0", "false", "no"},
        auto_apply_schema=os.getenv("AUTO_APPLY_SCHEMA", "false").lower() in {"1", "true", "yes"},
        seed_on_startup=os.getenv("SEED_ON_STARTUP", "false").lower() in {"1", "true", "yes"},
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return load_settings()


settings = get_settings()
