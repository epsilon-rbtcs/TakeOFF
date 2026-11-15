# Phase 1 implementation

The v0.3 source documents remain authoritative. This implementation covers only the Phase 1 entities: `observation`, `analysis_run` metadata within the local assessment workflow, `module_assessment`, and `communication_status`.

## Run

1. Create a Python virtual environment and install `services/api/requirements.txt`.
2. Run `uvicorn app.main:app --reload` from `services/api`.
3. Install npm workspaces, then run the Crew Client with Tauri after Rust/Cargo is installed. Use `npm run dev` inside either frontend for browser development.

Crew demo credentials are `astronaut` / `crew-demo`; ground demo credentials are `medical` / `ground-demo`. They are development-only placeholders.

The crew desktop client uses the Tauri SQL plugin and a local SQLite database. SQLCipher is not installed, configured, or verified; the UI says so. The Ground API requires PostgreSQL for its current schema and uses `DATABASE_URL` to select the deployment database. Run the bundled Docker Compose stack for local development.
