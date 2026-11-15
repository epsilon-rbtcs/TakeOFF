// Crew store-and-forward synchronization helpers.
//
// The transport is deliberately small and dependency-free so the same code is
// exercised by the Tauri UI and by the live integration test.  Local SQLite
// access stays behind the `PullHandlers` interface.
export type PendingEvent = {
  event_id: string;
  entity_type: string;
  payload: string;
  payload_hash: string;
};

export type PushResult = {
  event_id: string;
  status: "accepted" | "duplicate" | "rejected" | "conflict";
  reason: string | null;
  received_at: string;
};

export type PushResponse = {
  batch_id: string;
  acknowledged_at: string;
  results: PushResult[];
  summary: {
    accepted: number;
    duplicate: number;
    rejected: number;
    conflict: number;
  };
};

export type FeedItem = {
  event_id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  schema_version: number;
  client_id: string | null;
  mission_id: string;
  actor_id: string;
  origin: string;
  created_at: string;
  server_sequence: number;
  server_received_at: string;
  payload_hash: string;
  payload: Record<string, unknown>;
};

export type PullResponse = {
  changes: FeedItem[];
  next_cursor: string | null;
  has_more: boolean;
};

export type MessageLifecycle = {
  event_id: string;
  event_type: string;
  actor_id: string;
  client_created_at: string | null;
  occurred_at: string | null;
  recorded_at: string | null;
};

export type GroundMessage = {
  message_id: string;
  mission_id: string;
  astronaut_id: string;
  message_type: string;
  title: string;
  body: string;
  version: string | null;
  created_at: string;
  expires_at: string | null;
  simulated: boolean;
  status: string;
  lifecycle: MessageLifecycle[];
};

export type PullHandlers = {
  saveMessage(message: GroundMessage): Promise<void>;
};

export type SyncOutcome = {
  pushed: PushResponse | null;
  pull: PullResponse;
  accepted: string[];
  failed: PushResult[];
  messagesApplied: number;
};

const JSON_HEADERS = { "Content-Type": "application/json", Accept: "application/json" };

async function readError(response: Response): Promise<Error> {
  let detail = `Server returned ${response.status}`;
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string } };
    if (body?.error?.message) detail = `${body.error.code ?? "ERROR"}: ${body.error.message}`;
  } catch {
    // Keep the status-only message when the body is not JSON.
  }
  return new Error(detail);
}

export async function authenticate(api: string, username: string, password: string): Promise<string> {
  const response = await fetch(`${api}/auth/demo-token`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw await readError(response);
  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("Authentication response did not include an access token.");
  return body.access_token;
}

export async function pushPending(
  api: string,
  token: string,
  pending: PendingEvent[],
  batchId: string = crypto.randomUUID(),
): Promise<PushResponse> {
  if (pending.length === 0) throw new Error("No queued events to push.");
  const response = await fetch(`${api}/sync/push`, {
    method: "POST",
    headers: {
      ...JSON_HEADERS,
      Authorization: `Bearer ${token}`,
      // The API requires the header to equal batch_id.
      "Idempotency-Key": batchId,
    },
    body: JSON.stringify({
      batch_id: batchId,
      events: pending.map((row) => JSON.parse(row.payload) as Record<string, unknown>),
    }),
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as PushResponse;
}

export async function pullChanges(
  api: string,
  token: string,
  missionId: string,
  cursor: string | null,
): Promise<PullResponse> {
  const query = new URLSearchParams({ mission_id: missionId, limit: "100" });
  if (cursor) query.set("cursor", cursor);
  const response = await fetch(`${api}/sync/pull?${query.toString()}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as PullResponse;
}

/** Apply only ground-authored message changes; ignore unrelated feed entities. */
export async function applyPull(response: PullResponse, handlers: PullHandlers): Promise<number> {
  let applied = 0;
  for (const item of response.changes) {
    if (item.entity_type === "ground_message" || item.entity_type === "crew_update") {
      const message = item.payload as unknown as GroundMessage;
      if (message?.message_id) {
        await handlers.saveMessage(message);
        applied += 1;
      }
    } else if (item.entity_type === "message_lifecycle_event") {
      // Ground lifecycle events carry the full message plus the new event so
      // the local status can be rebuilt without a second request.
      const message = (item.payload as { message?: GroundMessage }).message;
      if (message?.message_id) {
        await handlers.saveMessage(message);
        applied += 1;
      }
    }
  }
  return applied;
}

export async function syncNow(options: {
  api: string;
  token: string;
  missionId: string;
  pending: PendingEvent[];
  cursor: string | null;
  handlers: PullHandlers;
}): Promise<SyncOutcome> {
  const pushed = options.pending.length
    ? await pushPending(options.api, options.token, options.pending)
    : null;
  const pull = await pullChanges(options.api, options.token, options.missionId, options.cursor);
  const messagesApplied = await applyPull(pull, options.handlers);
  const results = pushed?.results ?? [];
  const accepted = results
    .filter((result) => result.status === "accepted" || result.status === "duplicate")
    .map((result) => result.event_id);
  const failed = results.filter(
    (result) => result.status === "rejected" || result.status === "conflict",
  );
  return { pushed, pull, accepted, failed, messagesApplied };
}

/** Build the append-only acknowledgement event for a ground message. */
export function messageLifecycleEvent(options: {
  messageId: string;
  missionId: string;
  clientId: string;
  eventType: "received_by_crew" | "read";
  createdAt?: string;
}) {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const eventId = crypto.randomUUID();
  return {
    eventId,
    createdAt,
    body: {
      event_id: eventId,
      entity_type: "message_lifecycle_event",
      entity_id: options.messageId,
      operation: "append_event",
      schema_version: 1,
      client_id: options.clientId,
      mission_id: options.missionId,
      actor_id: "demo-astronaut",
      origin: "crew_client",
      created_at: createdAt,
      payload: {
        message_id: options.messageId,
        event_type: options.eventType,
        client_created_at: createdAt,
      },
    },
  };
}
