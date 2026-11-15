# Ground API

One FastAPI application and one PostgreSQL database for the v0.3 astronaut
health dual-client system. It implements the REST contract published in
[`../../openapi.yaml`](../../openapi.yaml) and the semantics in
[`../../README.md`](../../README.md): observations, versioned personal
baselines, ground analysis with provenance, assessments and evidence, alerts
and corrective actions with optimistic concurrency, crew messaging, and
store-and-forward synchronization.

Everything in the demo dataset is **synthetic and simulated**. This service is
not a medical device, has no clinical thresholds, and makes no HIPAA, NASA, or
medical-certification claim.

---

## Layout

```
services/api/
  app/
    main.py            FastAPI app, prefix /api/v1, CORS, request IDs
    config.py          environment-backed settings
    db.py              engine, sessions, schema.sql application
    models.py          SQLAlchemy ORM mirroring schema.sql
    schemas.py         Pydantic request/response models
    security.py        bearer auth, password hashing, scope checks
    errors.py          stable error codes + ErrorResponse rendering
    audit.py           append-only audit writer
    feed.py            per-mission ordered change feed
    catalogue.py       measurement catalogue + unit metadata
    units.py           explicit, documented unit conversions
    seed.py            deterministic synthetic demo dataset
    cli.py             init-db / seed / reset-db / serve
    routers/           one router per documented resource
    services/          domain logic (plain functions over a Session)
  migrations/          Alembic; revision 0001 executes schema.sql
  tests/               pytest suite against a real PostgreSQL server
  requirements.txt     runtime dependencies
  requirements-dev.txt runtime + test dependencies
  .env.example         documented configuration
  docker-compose.yml   PostgreSQL 16 for local development
```

`../../schema.sql` is the canonical DDL. The ORM mirrors it, and the initial
Alembic revision executes it rather than duplicating table definitions.

---

## Quick start

### 1. PostgreSQL

With Docker:

```bash
docker compose up -d postgres
```

The Compose database uses `ground` / `ground` on `localhost:5432` with database
`astronaut_health`. Those credentials are local-only.

Without Docker, point `DATABASE_URL` at any PostgreSQL 13+ instance.

### 2. Python environment

From `services/api`:

```bash
python -m venv .venv
. .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
```

### 3. Configure

```bash
cp .env.example .env
```

The application reads process environment variables, not `.env` files. Export
them in your shell, or pass them explicitly. At minimum set `DATABASE_URL`; set
`JWT_SECRET` for tokens that survive a restart.

### 4. Create the schema

```bash
alembic upgrade head
```

Equivalently, `python -m app.cli init-db` applies `schema.sql` directly when the
schema is absent. Do not run both against the same empty database: `schema.sql`
uses plain `CREATE TABLE` statements and is intentionally not idempotent.

### 5. Seed demo data

```bash
python -m app.cli seed
```

The seed is deterministic, safe to re-run, and refuses to run when
`APP_ENV=production`. It creates:

| Item | Value |
| --- | --- |
| Mission | `11111111-1111-1111-1111-111111111111` (`DEMO-LEO-01`, simulated) |
| Astronaut | `22222222-2222-2222-2222-222222222222` (`ASTRO-DEMO-01`) |
| Crew client | `33333333-3333-3333-3333-333333333333` |
| Crew user | `astronaut` / `crew-demo` |
| Medical officer | `medical` / `ground-demo` |
| Administrator | `admin` / `admin-demo` |

Demo credentials exist only because the seed created them; there are no
hardcoded fallback credentials in production paths. `POST /auth/demo-token`
returns `403 DEMO_AUTH_DISABLED` when `APP_ENV=production` or
`DEMO_SEED_ENABLED=false`.

### 6. Run

```bash
python -m app.cli serve --reload
# or
uvicorn app.main:app --reload --port 8000
```

- API base: `http://127.0.0.1:8000/api/v1`
- Interactive docs: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/api/v1/openapi.json`
- Liveness: `GET /api/v1/health` (unauthenticated, checks the database)
- Readiness: `GET /api/v1/ready` (also verifies that the Ground schema exists)

Get a token:

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/auth/demo-token \
  -H 'Content-Type: application/json' \
  -d '{"username":"medical","password":"ground-demo"}'
```

Then send `Authorization: Bearer <token>` on every other request.

---

## REST surface

All routes below are under `/api/v1`. Routes marked **extension** are additive,
documented here because `openapi.yaml` does not define them; no documented route
was renamed or replaced.

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/demo-token` | Demo identity exchange (demo mode only) |
| GET | `/measurements/catalog` | Published catalogue version |
| POST | `/measurements/catalog/versions` | Publish catalogue (administrator) |
| POST | `/protocols/versions` | Publish protocol version (administrator) |
| GET | `/astronauts/{astronaut_id}` | Assigned astronaut profile |
| GET | `/astronauts` | **extension** list within actor scope |
| GET | `/missions/{mission_id}` | Mission detail |
| GET | `/missions` | **extension** list within actor scope |
| POST | `/observations` | Single observation ingestion |
| GET | `/observations` | Filter by astronaut/mission/measurement/time |
| POST | `/observations/batch` | Batch ingestion, per-item results |
| POST | `/sync/push` | Crew batch push (per-event results) |
| GET | `/sync/pull` | Ordered per-mission change feed |
| GET | `/sync/status` | Last contact, last push/pull, freshness |
| GET | `/communications/status` | Reported link state + data freshness |
| GET | `/messages` | Ground-to-crew messages |
| POST | `/messages` | Create a message (medical officer) |
| GET | `/messages/{message_id}` | **extension** message detail |
| POST | `/messages/{message_id}/events` | Lifecycle event (transmitted/read/...) |
| GET | `/astronauts/{astronaut_id}/baselines` | Active/provisional baselines |
| GET | `/dashboard/summary` | Ground console summary |
| POST | `/analysis/runs` | Synchronous ground analysis |
| GET | `/analysis/runs/{run_id}` | **extension** run provenance |
| GET | `/analysis/runs` | **extension** run history |
| GET | `/assessments` | Module and integrated assessments |
| GET | `/assessments/{assessment_id}` | Assessment with evidence |
| GET | `/alerts` | Alerts with status/lifecycle |
| GET | `/alerts/{alert_id}` | **extension** alert detail |
| GET | `/alerts/{alert_id}/history` | **extension** alert lifecycle history |
| POST | `/alerts/{alert_id}/acknowledgements` | Acknowledge; does not resolve |
| POST | `/alerts/{alert_id}/events` | **extension** resolution/dismissal workflow |
| GET | `/actions` | Corrective actions |
| POST | `/actions` | **extension** create an action |
| GET | `/actions/{action_id}` | **extension** action detail |
| GET | `/actions/{action_id}/history` | **extension** action event history |
| PATCH | `/actions/{action_id}` | **extension** update with `expected_revision` |
| POST | `/actions/{action_id}/events` | Apply action event with expected revision |
| GET | `/audit/events` | **extension** append-only audit retrieval |

### Contract conventions

- Timestamps are ISO-8601 UTC with an explicit offset.
- Lists use the documented envelopes: `{"items": [...]}` for collection
  routes, plus `next_cursor` on observation paging, and the raw arrays
  specified by `openapi.yaml` where the contract defines them. Pagination
  parameters are `limit` and `cursor`/`offset` exactly as documented.
- Errors always use `{"error": {"code", "message", "details", "request_id"}}`.
  `X-Request-ID` is echoed on every response.
- Original observation units are stored verbatim. Canonicalization happens only
  through the explicit conversions in `app/units.py`; an unsupported unit is a
  `422`, never a silent substitution.
- Missing data stays missing: no zero/empty fabrication, and analysis returns
  `insufficient_data` rather than an invented result.

---

## Synchronization semantics

- **Batch idempotency**: `Idempotency-Key` must equal `batch_id`. Replaying a
  batch with the same canonical payload returns the stored acknowledgement;
  different content returns `409 ID_REUSE_MISMATCH`.
- **Event idempotency**: each event has a stable `event_id` and a canonical
  SHA-256 `payload_hash`. Same ID + same hash = `duplicate`. Same ID + different
  hash = `conflict` with `ID_REUSE_MISMATCH`. Entity IDs bound to different
  immutable content are rejected the same way.
- **Ordering**: the ground feed assigns a per-mission monotonic sequence under a
  row lock on `missions.change_seq` inside the writing transaction, so pull
  order matches commit order. Crew pushes are acknowledged but not echoed back
  into the ground feed; ground-originated changes are appended to it.
- **Cursors**: opaque, HMAC-signed, bound to one `client_id` and `mission_id`.
  A cursor from another client/mission or a tampered cursor returns
  `409 INVALID_CURSOR`. Replaying an old cursor is stable and returns the same
  events (no tombstones are manufactured).
- **Scope**: the client is resolved from the authenticated crew identity, not
  from `event.client_id`. Wrong client/mission claims are rejected per event as
  `CLIENT_SCOPE_MISMATCH` / `MISSION_ACCESS_MISMATCH`.
- **Communication**: a successful request is evidence of contact, never proof
  of `LIVE`. The reported state, its observation time, last contact, last
  push/pull and data age are surfaced separately.

---

## Analysis

`POST /analysis/runs` executes synchronously on the ground. Every run persists:

- algorithm version, rule-set/protocol version, implementation build
- actor and execution location
- input observation IDs and content snapshot hash
- baseline IDs and versions used
- status (`completed`/`failed`), failure code, output hash

The demo engine is a transparent statistical deviation-from-own-baseline rule
(`demo-rules-0.3.0`, rule set `demo-config-0.3.0`) marked `demo_only`. It does
not invent ML models or clinical thresholds and does not emit `urgent` unless a
future, explicitly versioned rule set configures it.

---

## Testing

```bash
python -m pytest -q
```

The suite starts a real PostgreSQL instance through the bundled `pgserver`
package, applies `schema.sql`, seeds once, and then exercises:

- startup, OpenAPI availability, and documented route presence
- authentication (valid, invalid, expired, wrong role, forged mission claims)
- schema integrity (assignments, composite foreign keys, catalogue)
- observations, units, and duplicates
- assessments, evidence links, and dashboard summary
- alerts and actions with `expected_revision` conflicts
- sync push/pull idempotency, hash mismatches, cursors, and scope rejections
- analysis provenance and `insufficient_data`
- message lifecycle and revival/idempotency

No test writes to `ground-health.db`; that file is a legacy Phase 1 SQLite
artefact kept for reference and is not used by this service.

### Schema vs. Alembic

- `alembic upgrade head` — apply `schema.sql` and record revision
  `0001_initial_schema`.
- `python -m app.cli init-db` — apply `schema.sql` directly if absent.
- `python -m app.cli reset-db --yes` — destructive local reset + reseed.
- `alembic downgrade base` — refuses to drop the schema unless
  `ALLOW_DESTRUCTIVE_DOWNGRADE=1` is set.

A fresh PostgreSQL database can be initialised entirely through Alembic; no
manual SQL is required. Do not point Alembic at a database that was already
initialised with `schema.sql`/`init-db` but has no `alembic_version` row: the
initial revision would try to create existing tables.

---

## Container deployment

`docker-compose.yml` defines both services. The `api` image builds from the
repository root so it can include the canonical `schema.sql`.

Demo deployment (migrations + synthetic seed on first start):

```bash
cd services/api
JWT_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')" \
  docker compose up --build
```

That serves the API on `http://localhost:8000` and PostgreSQL on
`localhost:5432`. On each start the container runs `alembic upgrade head`
(idempotent), optionally reseeds the deterministic demo dataset, then starts
Uvicorn. Set `AUTO_MIGRATE=false` or `DEMO_SEED_ENABLED=false` to change that.

Production-style deployment:

```bash
cd services/api
export APP_ENV=production
export JWT_SECRET="<48+ random bytes>"
export POSTGRES_PASSWORD="<strong password>"
export CORS_ORIGINS="https://ground.example"
export DEMO_SEED_ENABLED=false
export AUTO_MIGRATE=false
docker compose up -d postgres
docker compose run --rm api alembic upgrade head
docker compose up -d api
```

Production checklist:

- Set `APP_ENV=production`, a strong `JWT_SECRET`, and real database
  credentials; the app refuses to use an ephemeral secret in production.
- Disable `DEMO_SEED_ENABLED`, `AUTO_APPLY_SCHEMA` and `SEED_ON_STARTUP`.
- Run migrations as an explicit deploy step, not from every replica.
- Terminate TLS at a reverse proxy; tokens are bearer credentials.
- Point `CORS_ORIGINS` at the exact Ground Console origin.
- Back up the PostgreSQL volume; audit rows are append-only application-side.

Build the image directly if not using Compose:

```bash
# from astronaut_health_spec_v0_2/astronaut_health_spec (the directory with schema.sql)
docker build -f services/api/Dockerfile -t ground-api:0.3.0 .
```

---

## Configuration

See [`.env.example`](.env.example) for every variable. Key ones:

| Variable | Purpose |
| --- | --- |
| `APP_ENV` | `development`, `test`, or `production` |
| `DATABASE_URL` | PostgreSQL DSN using `postgresql+psycopg://` |
| `JWT_SECRET` | Signing secret; required in production |
| `JWT_EXPIRES_SECONDS` | Token lifetime (default 3600) |
| `CORS_ORIGINS` | Comma-separated allowed browser origins |
| `DEMO_SEED_ENABLED` | Enables `/auth/demo-token` |
| `AUTO_APPLY_SCHEMA` | Apply `schema.sql` at startup if absent |
| `SEED_ON_STARTUP` | Seed demo data at startup |
| `CONTACT_*`, `FRESHNESS_*` | Contact/freshness thresholds |

Production notes:

- Set a strong `JWT_SECRET`; startup fails if production has none.
- Disable demo auth and never seed synthetic users into production.
- Terminate TLS in front of the API; tokens are bearer credentials.
- Audit records are append-only and retrieved only by `medical_officer` /
  `administrator` within their scopes.

---

## Ground Console compatibility

The unmodified Ground Console consumes:

- `GET /dashboard/summary`, which returns the documented `DashboardSummary`
  plus legacy `communication`, `observations`, and `assessments` aliases
- `GET /communications/status?astronaut_id=...&mission_id=...`
- `GET /sync/status?client_id=...` for scoped ground reads
- list endpoints used by its views

CORS is environment-configured; the default allows the Vite dev server on
`localhost:5173`.

### NASA OSD-575 research data is not live telemetry

The Crew Health Client has its own local NASA OSD-575 research adapter. Those
records are retrospective research data held in the client's SQLite store with
`data_origin="retrospective_research"`, `is_live_telemetry=false`,
`clinical_threshold_applied=false` and no invented measurement timestamps. They
are **not** pushed through `/sync/push`, are not accepted as mission
observations, and are not exposed by this API or the Ground Console. This
backend did not need changes for that adapter and its files are left untouched.

Ground observations remain synthetic mission telemetry from the demo client;
historical NASA research rows are never presented as current crew health data.

---

## Known contract gaps (documented here, not invented as replacements)

The v0.3 prose and schema imply a few operations that `openapi.yaml` does not
define. They are called out rather than silently redesigned:

1. **No REST route to publish/recalculate a baseline.** The schema and README
   describe versioned baseline activation as a controlled medical-officer or
   backend operation, but only `GET /astronauts/{astronaut_id}/baselines` is
   documented. Baselines can arrive through crew sync (`baseline_revision`) or
   be seeded; there is no documented `POST` for ground activation.
2. **No documented alert resolve/dismiss route.** `POST
   /alerts/{alert_id}/acknowledgements` is the only documented alert write, and
   acknowledgement explicitly does not resolve. The additive
   `POST /alerts/{alert_id}/events` route provides resolution/dismissal with
   expected-revision concurrency for clients that need it.
3. **No dedicated message-acknowledgement endpoint beyond lifecycle events.**
   `POST /messages/{message_id}/events` covers transmitted/received/read/
   withdrawn/expired, which is sufficient; no separate `ack` route is defined.
4. **No documented action-creation route.** `GET /actions` and
   `POST /actions/{action_id}/events` are documented, but creating an action is
   not. The additive `POST /actions` route fills that gap with the same
   revision and scope rules.
5. **No documented read routes for analysis runs, audit events, or single
   alerts/actions/messages.** Additive detail/history routes exist so the
   provenance and lifecycle records can actually be inspected.

If a future revision of `openapi.yaml` standardizes these, the additive routes
should be reconciled with it rather than kept as parallel vocabulary.
