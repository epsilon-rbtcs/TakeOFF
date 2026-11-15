// Live crew-client <-> FastAPI <-> ground integration check.
//
// Runs only when SYNC_INTEGRATION_API points at a seeded API, so the default
// unit-test run stays offline. It uses the real crew sync module (fetch, push,
// pull, acknowledgement) against the real backend, then verifies the persisted
// result through the medical-officer API used by the Ground Console.
//
// Example (PowerShell):
//   $env:SYNC_INTEGRATION_API="http://127.0.0.1:8000/api/v1"; npm test
import { beforeAll, describe, expect, it } from "vitest";
import { authenticate, messageLifecycleEvent, pullChanges, pushPending, type GroundMessage, type PullHandlers } from "./sync";

declare const process: { env: Record<string, string | undefined> };

const API = (process.env.SYNC_INTEGRATION_API ?? "").replace(/\/+$/, "");
const MISSION_ID = "11111111-1111-1111-1111-111111111111";
const ASTRONAUT_ID = "22222222-2222-2222-2222-222222222222";
const CLIENT_ID = "33333333-3333-3333-3333-333333333333";
const CATALOGUE_VERSION = "demo-catalog-0.3.0";

type Json = Record<string, unknown>;

async function call(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(init.headers as Record<string, string> | undefined) },
  });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as Json) : null;
  return { status: response.status, body };
}

class MemoryMessages implements PullHandlers {
  readonly messages = new Map<string, GroundMessage>();
  async saveMessage(message: GroundMessage) {
    this.messages.set(message.message_id, structuredClone(message));
  }
}

function observationEvent(options: { eventId: string; observationId: string; measuredAt: string; value: number }) {
  return {
    event_id: options.eventId,
    entity_type: "observation",
    entity_id: options.observationId,
    operation: "upsert",
    schema_version: 1,
    client_id: CLIENT_ID,
    mission_id: MISSION_ID,
    actor_id: "demo-astronaut",
    origin: "crew_client",
    created_at: options.measuredAt,
    payload: {
      observation_id: options.observationId,
      astronaut_id: ASTRONAUT_ID,
      mission_id: MISSION_ID,
      measurement_code: "heart_rate",
      catalogue_version: CATALOGUE_VERSION,
      value: options.value,
      unit: "bpm",
      measured_at: options.measuredAt,
      created_at: options.measuredAt,
      clock_quality: { status: "good", method: "integration_test" },
      source: { type: "manual" },
      quality: { status: "unknown" },
      context: { synthetic: true, integration_test: true },
      simulated: true,
    },
  };
}

describe.skipIf(!API)("live crew to ground synchronization", () => {
  let crewToken = "";
  let medicalToken = "";
  let adminToken = "";

  beforeAll(async () => {
    crewToken = await authenticate(API, "astronaut", "crew-demo");
    medicalToken = await authenticate(API, "medical", "ground-demo");
    adminToken = await authenticate(API, "admin", "admin-demo");
  });

  it("drops an offline observation into the ground record with preserved timestamps and provenance", async () => {
    const observationId = crypto.randomUUID();
    const eventId = crypto.randomUUID();
    const measuredAt = new Date(Date.now() - 60_000).toISOString();
    const event = observationEvent({ eventId, observationId, measuredAt, value: 71 });

    const pending = [{ event_id: eventId, entity_type: "observation", payload: JSON.stringify(event), payload_hash: "" }];
    const first = await pushPending(API, crewToken, pending);
    expect(first.results[0].status).toBe("accepted");

    // Re-sending the same event under a new batch must not duplicate it.
    const replay = await pushPending(API, crewToken, pending);
    expect(replay.results[0].status).toBe("duplicate");

    const listed = await call(
      `/observations?astronaut_id=${ASTRONAUT_ID}&mission_id=${MISSION_ID}&measurement_code=heart_rate&limit=500`,
      medicalToken,
    );
    expect(listed.status).toBe(200);
    const stored = (listed.body?.items as Array<Json>).find((item) => item.observation_id === observationId);
    expect(stored).toBeTruthy();
    expect(stored?.value).toBe(71);
    expect(Date.parse(String(stored?.measured_at))).toBe(Date.parse(measuredAt));
    expect(stored?.received_at).toBeTruthy();
    expect(stored?.measurement_code).toBe("heart_rate");
    expect((stored?.source as Json).type).toBe("manual");
    expect(stored?.catalogue_version).toBe(CATALOGUE_VERSION);
    expect(stored?.simulated).toBe(true);
  });

  it("pulls a ground message, acknowledges it, and the ground status becomes read", async () => {
    const medical = await call("/messages", medicalToken, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        mission_id: MISSION_ID,
        astronaut_id: ASTRONAUT_ID,
        message_type: "message",
        title: `Integration follow-up ${crypto.randomUUID()}`,
        body: "Synthetic ground message used by the integration test.",
        version: "integration-test",
      }),
    });
    expect(medical.status).toBe(201);
    const messageId = String(medical.body?.message_id);

    const local = new MemoryMessages();
    // First pull replays the whole mission feed; later pulls use the cursor.
    const firstPull = await pullChanges(API, crewToken, MISSION_ID, null);
    for (const change of firstPull.changes) {
      if (change.entity_type === "ground_message" || change.entity_type === "crew_update") {
        await local.saveMessage(change.payload as unknown as GroundMessage);
      }
    }
    expect(local.messages.get(messageId)?.body).toBe("Synthetic ground message used by the integration test.");

    for (const eventType of ["received_by_crew", "read"] as const) {
      const event = messageLifecycleEvent({ messageId, missionId: MISSION_ID, clientId: CLIENT_ID, eventType });
      const pushed = await pushPending(API, crewToken, [
        { event_id: event.eventId, entity_type: "message_lifecycle_event", payload: JSON.stringify(event.body), payload_hash: "" },
      ]);
      expect(pushed.results[0].status).toBe("accepted");
    }

    const ground = await call(`/messages/${messageId}`, medicalToken);
    expect(ground.status).toBe(200);
    expect(ground.body?.status).toBe("read");
    const lifecycle = ground.body?.lifecycle as Array<Json>;
    expect(lifecycle.map((event) => event.event_type)).toEqual(
      expect.arrayContaining(["received_by_crew", "read"]),
    );

    // A cursor-based pull advances the local cursor without inventing a
    // crew-side echo: crew acknowledgements are authoritative on the ground
    // view above, not replayed back through the crew pull feed.
    const secondPull = await pullChanges(API, crewToken, MISSION_ID, firstPull.next_cursor);
    expect(Array.isArray(secondPull.changes)).toBe(true);
  });

  it("reports LIVE only as an explicit adapter observation and keeps roles enforced", async () => {
    const observedAt = new Date().toISOString();
    const event = {
      event_id: crypto.randomUUID(),
      entity_type: "communication_status",
      entity_id: CLIENT_ID,
      operation: "upsert",
      schema_version: 1,
      client_id: CLIENT_ID,
      mission_id: MISSION_ID,
      actor_id: "demo-astronaut",
      origin: "crew_client",
      created_at: observedAt,
      payload: { state: "LIVE", observed_at: observedAt, queued_event_count: 0, details: { integration_test: true } },
    };
    const pushed = await pushPending(API, crewToken, [
      { event_id: event.event_id, entity_type: "communication_status", payload: JSON.stringify(event), payload_hash: "" },
    ]);
    expect(pushed.results[0].status).toBe("accepted");

    const status = await call(`/sync/status?mission_id=${MISSION_ID}&client_id=${CLIENT_ID}`, medicalToken);
    expect(status.status).toBe(200);
    expect(status.body?.state).toBe("LIVE");
    expect(status.body?.observed_at).toBeTruthy();

    const crewCreate = await call("/messages", crewToken, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        mission_id: MISSION_ID,
        astronaut_id: ASTRONAUT_ID,
        message_type: "message",
        title: "Crew must not author ground messages",
        body: "Denied by role policy.",
      }),
    });
    expect(crewCreate.status).toBe(403);

    const adminRead = await call("/messages", adminToken);
    expect(adminRead.status).toBe(403);
  });
});
