"""Operational CLI for local setup.

Examples::

    python -m app.cli init-db
    python -m app.cli seed
    python -m app.cli serve --port 8000
    python -m app.cli reset-db --yes     # destructive local reset
"""
from __future__ import annotations

import argparse
import sys

from .config import settings
from .db import SessionLocal, apply_schema, engine, reset_schema, schema_exists
from .seed import seed_demo_data


def _init_db() -> None:
    if schema_exists():
        print("Schema already present; nothing to do.")
        return
    apply_schema()
    print("Applied schema.sql.")


def _seed() -> None:
    if not schema_exists():
        apply_schema()
        print("Applied schema.sql.")
    if settings.is_production:
        raise SystemExit("Refusing to seed demo data in a production environment.")
    with SessionLocal() as db:
        summary = seed_demo_data(db)
    print("Demo data ensured (synthetic, not clinical):")
    for key, value in summary.items():
        print(f"  {key}: {value}")


def _reset(yes: bool) -> None:
    if not yes:
        raise SystemExit(
            "reset-db deletes all ground data. Re-run with --yes for an explicit local reset."
        )
    if settings.is_production:
        raise SystemExit("Refusing to reset a production database.")
    reset_schema()
    print("Schema dropped and recreated.")
    _seed()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init-db", help="Apply schema.sql when the schema is absent.")
    sub.add_parser("seed", help="Ensure deterministic synthetic demo data exists.")
    reset = sub.add_parser("reset-db", help="Drop, recreate and reseed the local database.")
    reset.add_argument("--yes", action="store_true", help="Required confirmation for deletion.")
    serve = sub.add_parser("serve", help="Run the FastAPI application with uvicorn.")
    serve.add_argument("--host", default="0.0.0.0")
    serve.add_argument("--port", type=int, default=8000)
    serve.add_argument("--reload", action="store_true")

    args = parser.parse_args(argv)

    if args.command == "init-db":
        _init_db()
    elif args.command == "seed":
        _seed()
    elif args.command == "reset-db":
        _reset(args.yes)
    elif args.command == "serve":
        import uvicorn

        uvicorn.run("app.main:app", host=args.host, port=args.port, reload=args.reload)
    return 0


if __name__ == "__main__":
    sys.exit(main())

# Ensure the engine is importable for diagnostics without opening a connection.
_ = engine
