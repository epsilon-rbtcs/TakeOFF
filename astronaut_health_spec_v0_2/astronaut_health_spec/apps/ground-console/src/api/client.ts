// Ground Health Console — FastAPI client
// Parses the documented success envelopes and `{ error: { code, message,
// details, request_id } }` failure envelope. No request ever fabricates a
// fallback payload: callers receive either real data or an explicit error.

import type {
  ActionCreateInput,
  ActionDetailDto,
  ActionDto,
  ActionEventDto,
  ActionEventInput,
  ActionUpdateInput,
  AlertDetailDto,
  AlertDto,
  AlertEventDto,
  AnalysisRunDto,
  ApiFailure,
  ApiResult,
  AssessmentDetailDto,
  AssessmentSummaryDto,
  AstronautDto,
  AuditEventDto,
  AuditPageDto,
  AuthTokenDto,
  BaselineDto,
  CatalogueDto,
  CommunicationStatusDto,
  DashboardDto,
  HealthDto,
  MessageDto,
  MessageEventDto,
  MessageEventTypeDto,
  MessageTypeDto,
  MissionDto,
  ObservationDto,
  ObservationPageDto,
  SyncStatusDto
} from './types';

const DEFAULT_BASE = '/api/v1';

function normaliseBase(value: string | undefined): string {
  const raw = (value ?? DEFAULT_BASE).trim();
  if (!raw) return DEFAULT_BASE;
  return raw.replace(/\/+$/, '');
}

export const API_BASE_URL = normaliseBase(import.meta.env.VITE_API_URL);

export const TOKEN_STORAGE_KEY = 'ghc_auth_token';

type QueryValue = string | number | boolean | null | undefined;

function queryString(params: Record<string, QueryValue>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export function newIdempotencyKey(prefix = 'ghc'): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  query?: Record<string, QueryValue>;
  idempotencyKey?: string;
  authenticated?: boolean;
}

function parseFailure(
  status: number,
  payload: unknown,
  requestId: string | null,
  fallback: string
): ApiFailure {
  const body = payload as
    | {
        error?: { code?: string; message?: string; details?: unknown; request_id?: string };
        detail?: unknown;
      }
    | null;

  const envelope = body?.error;
  if (envelope && typeof envelope === 'object') {
    return {
      status,
      code: typeof envelope.code === 'string' ? envelope.code : `HTTP_${status}`,
      message: typeof envelope.message === 'string' ? envelope.message : fallback,
      details:
        envelope.details && typeof envelope.details === 'object'
          ? (envelope.details as Record<string, unknown>)
          : {},
      requestId: envelope.request_id ?? requestId
    };
  }

  const detail = body?.detail;
  let message = fallback;
  if (typeof detail === 'string') {
    message = detail;
  } else if (Array.isArray(detail)) {
    message = detail
      .map((item) =>
        item && typeof item === 'object' && 'msg' in item
          ? String((item as { msg: unknown }).msg)
          : String(item)
      )
      .join('; ');
  }

  return {
    status,
    code: `HTTP_${status}`,
    message,
    details: {},
    requestId
  };
}

class ApiClient {
  private token: string | null = null;
  private baseUrl: string = API_BASE_URL;
  private unauthorizedHandler: (() => void) | null = null;

  constructor() {
    const saved = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (saved) this.token = saved;
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public setUnauthorizedHandler(handler: (() => void) | null): void {
    this.unauthorizedHandler = handler;
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
    const { method = 'GET', body, query, idempotencyKey, authenticated = true } = options;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (authenticated && this.token) headers.Authorization = `Bearer ${this.token}`;
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}${queryString(query ?? {})}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (error) {
      return {
        data: null,
        status: 0,
        error: {
          status: 0,
          code: 'NETWORK_ERROR',
          message:
            error instanceof Error
              ? `Ground API unreachable: ${error.message}`
              : 'Ground API unreachable.',
          details: {},
          requestId: null
        }
      };
    }

    const requestId = response.headers.get('X-Request-ID');
    const raw = await response.text();
    let parsed: unknown = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }

    if (!response.ok) {
      if (response.status === 401 && authenticated) {
        this.unauthorizedHandler?.();
      }
      return {
        data: null,
        status: response.status,
        error: parseFailure(
          response.status,
          parsed,
          requestId,
          response.statusText || 'The Ground API rejected the request.'
        )
      };
    }

    if (raw && parsed === null) {
      return {
        data: null,
        status: response.status,
        error: {
          status: response.status,
          code: 'INVALID_RESPONSE',
          message: 'The Ground API returned a response that was not valid JSON.',
          details: {},
          requestId
        }
      };
    }

    return { data: parsed as T, error: null, status: response.status };
  }

  private async requestList<T>(path: string, query?: Record<string, QueryValue>): Promise<ApiResult<T[]>> {
    const result = await this.request<{ items?: T[] }>(path, { query });
    if (result.error) return { data: null, error: result.error, status: result.status };
    return { data: result.data?.items ?? [], error: null, status: result.status };
  }

  // --- Service health & authentication -----------------------------------

  public async getHealth(): Promise<ApiResult<HealthDto>> {
    return this.request<HealthDto>('/health', { authenticated: false });
  }

  public async login(credentials: {
    username: string;
    password: string;
  }): Promise<ApiResult<AuthTokenDto>> {
    return this.request<AuthTokenDto>('/auth/demo-token', {
      method: 'POST',
      body: credentials,
      authenticated: false
    });
  }

  // --- Mission & crew -----------------------------------------------------

  public async listMissions(): Promise<ApiResult<MissionDto[]>> {
    return this.requestList<MissionDto>('/missions');
  }

  public async getMission(missionId: string): Promise<ApiResult<MissionDto>> {
    return this.request<MissionDto>(`/missions/${missionId}`);
  }

  public async listAstronauts(missionId?: string): Promise<ApiResult<AstronautDto[]>> {
    return this.requestList<AstronautDto>('/astronauts', { mission_id: missionId });
  }

  public async getAstronaut(astronautId: string): Promise<ApiResult<AstronautDto>> {
    return this.request<AstronautDto>(`/astronauts/${astronautId}`);
  }

  public async listBaselines(
    astronautId: string,
    missionId?: string
  ): Promise<ApiResult<BaselineDto[]>> {
    return this.requestList<BaselineDto>(`/astronauts/${astronautId}/baselines`, {
      mission_id: missionId
    });
  }

  // --- Measurement catalogue ---------------------------------------------

  public async getCatalogue(missionId: string): Promise<ApiResult<CatalogueDto>> {
    return this.request<CatalogueDto>('/measurements/catalog', { query: { mission_id: missionId } });
  }

  // --- Observations -------------------------------------------------------

  public async listObservations(params: {
    astronautId: string;
    missionId: string;
    measurementCode?: string;
    from?: string;
    to?: string;
    limit?: number;
    cursor?: string;
  }): Promise<ApiResult<ObservationPageDto>> {
    return this.request<ObservationPageDto>('/observations', {
      query: {
        astronaut_id: params.astronautId,
        mission_id: params.missionId,
        measurement_code: params.measurementCode,
        from: params.from,
        to: params.to,
        limit: params.limit,
        cursor: params.cursor
      }
    });
  }

  // --- Dashboard ----------------------------------------------------------

  public async getDashboard(
    astronautId: string,
    missionId: string
  ): Promise<ApiResult<DashboardDto>> {
    return this.request<DashboardDto>('/dashboard/summary', {
      query: { astronaut_id: astronautId, mission_id: missionId }
    });
  }

  // --- Assessments --------------------------------------------------------

  public async listAssessments(
    astronautId: string,
    missionId: string,
    moduleCode?: string
  ): Promise<ApiResult<AssessmentSummaryDto[]>> {
    return this.requestList<AssessmentSummaryDto>('/assessments', {
      astronaut_id: astronautId,
      mission_id: missionId,
      module_code: moduleCode
    });
  }

  public async getAssessment(assessmentId: string): Promise<ApiResult<AssessmentDetailDto>> {
    return this.request<AssessmentDetailDto>(`/assessments/${assessmentId}`);
  }

  // --- Analysis provenance ------------------------------------------------

  public async listAnalysisRuns(
    astronautId: string,
    missionId: string,
    limit = 50
  ): Promise<ApiResult<AnalysisRunDto[]>> {
    return this.requestList<AnalysisRunDto>('/analysis/runs', {
      astronaut_id: astronautId,
      mission_id: missionId,
      limit
    });
  }

  public async getAnalysisRun(runId: string): Promise<ApiResult<AnalysisRunDto>> {
    return this.request<AnalysisRunDto>(`/analysis/runs/${runId}`);
  }

  // --- Alerts -------------------------------------------------------------

  public async listAlerts(params: {
    astronautId: string;
    missionId?: string;
    status?: string;
    limit?: number;
  }): Promise<ApiResult<AlertDto[]>> {
    return this.requestList<AlertDto>('/alerts', {
      astronaut_id: params.astronautId,
      mission_id: params.missionId,
      status: params.status,
      limit: params.limit
    });
  }

  public async getAlert(alertId: string): Promise<ApiResult<AlertDetailDto>> {
    return this.request<AlertDetailDto>(`/alerts/${alertId}`);
  }

  public async listAlertHistory(alertId: string): Promise<ApiResult<AlertEventDto[]>> {
    return this.requestList<AlertEventDto>(`/alerts/${alertId}/history`);
  }

  public async acknowledgeAlert(
    alertId: string,
    input: { expected_revision: number; note?: string }
  ): Promise<ApiResult<AlertDto>> {
    return this.request<AlertDto>(`/alerts/${alertId}/acknowledgements`, {
      method: 'POST',
      body: input
    });
  }

  public async createAlertEvent(
    alertId: string,
    input: {
      event_type: 'acknowledged' | 'resolved' | 'dismissed';
      expected_revision: number;
      note?: string;
    }
  ): Promise<ApiResult<AlertEventDto & { alert: AlertDto }>> {
    return this.request<AlertEventDto & { alert: AlertDto }>(`/alerts/${alertId}/events`, {
      method: 'POST',
      body: input
    });
  }

  // --- Recommended actions ------------------------------------------------

  public async listActions(params: {
    astronautId: string;
    missionId?: string;
    status?: string;
    limit?: number;
  }): Promise<ApiResult<ActionDto[]>> {
    return this.requestList<ActionDto>('/actions', {
      astronaut_id: params.astronautId,
      mission_id: params.missionId,
      status: params.status,
      limit: params.limit
    });
  }

  public async getAction(actionId: string): Promise<ApiResult<ActionDetailDto>> {
    return this.request<ActionDetailDto>(`/actions/${actionId}`);
  }

  public async createAction(input: ActionCreateInput): Promise<ApiResult<ActionDto>> {
    return this.request<ActionDto>('/actions', { method: 'POST', body: input });
  }

  public async updateAction(
    actionId: string,
    input: ActionUpdateInput
  ): Promise<ApiResult<ActionDto>> {
    return this.request<ActionDto>(`/actions/${actionId}`, { method: 'PATCH', body: input });
  }

  public async createActionEvent(
    actionId: string,
    input: ActionEventInput
  ): Promise<ApiResult<ActionEventDto & { action: ActionDto }>> {
    return this.request<ActionEventDto & { action: ActionDto }>(`/actions/${actionId}/events`, {
      method: 'POST',
      body: input
    });
  }

  public async listActionHistory(actionId: string): Promise<ApiResult<ActionEventDto[]>> {
    return this.requestList<ActionEventDto>(`/actions/${actionId}/history`);
  }

  // --- Communications & sync ---------------------------------------------

  public async getCommunicationStatus(params: {
    astronautId?: string;
    missionId?: string;
    clientId?: string;
  }): Promise<ApiResult<CommunicationStatusDto>> {
    return this.request<CommunicationStatusDto>('/communications/status', {
      query: {
        astronaut_id: params.astronautId,
        mission_id: params.missionId,
        client_id: params.clientId
      }
    });
  }

  public async getSyncStatus(params: {
    clientId: string;
    missionId?: string;
  }): Promise<ApiResult<SyncStatusDto>> {
    return this.request<SyncStatusDto>('/sync/status', {
      query: { client_id: params.clientId, mission_id: params.missionId }
    });
  }

  /** Crew-scoped sync status. Ground roles must supply an explicit client id. */
  public async getOwnSyncStatus(): Promise<ApiResult<SyncStatusDto>> {
    return this.request<SyncStatusDto>('/sync/status');
  }

  // --- Messages -----------------------------------------------------------

  public async listMessages(params?: {
    missionId?: string;
    astronautId?: string;
    limit?: number;
  }): Promise<ApiResult<MessageDto[]>> {
    return this.requestList<MessageDto>('/messages', {
      mission_id: params?.missionId,
      astronaut_id: params?.astronautId,
      limit: params?.limit
    });
  }

  public async getMessage(messageId: string): Promise<ApiResult<MessageDto>> {
    return this.request<MessageDto>(`/messages/${messageId}`);
  }

  public async createMessage(
    input: {
      mission_id: string;
      astronaut_id: string;
      message_type: MessageTypeDto;
      title: string;
      body: string;
      version?: string;
      expires_at?: string;
    },
    idempotencyKey: string = newIdempotencyKey('message')
  ): Promise<ApiResult<MessageDto>> {
    return this.request<MessageDto>('/messages', {
      method: 'POST',
      body: input,
      idempotencyKey
    });
  }

  public async createMessageEvent(
    messageId: string,
    input: { event_type: MessageEventTypeDto; client_created_at: string },
    idempotencyKey: string = newIdempotencyKey('message-event')
  ): Promise<ApiResult<MessageEventDto & { message_status: string }>> {
    return this.request<MessageEventDto & { message_status: string }>(
      `/messages/${messageId}/events`,
      { method: 'POST', body: input, idempotencyKey }
    );
  }

  // --- Audit --------------------------------------------------------------

  public async listAuditEvents(params?: {
    missionId?: string;
    astronautId?: string;
    action?: string;
    entityType?: string;
    outcome?: string;
    occurredFrom?: string;
    occurredTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResult<AuditEventDto[]>> {
    const result = await this.request<AuditPageDto>('/audit/events', {
      query: {
        mission_id: params?.missionId,
        astronaut_id: params?.astronautId,
        action: params?.action,
        entity_type: params?.entityType,
        outcome: params?.outcome,
        occurred_from: params?.occurredFrom,
        occurred_to: params?.occurredTo,
        limit: params?.limit,
        offset: params?.offset
      }
    });
    if (result.error) return { data: null, error: result.error, status: result.status };
    return { data: result.data?.items ?? [], error: null, status: result.status };
  }
}

export const apiClient = new ApiClient();

export type { ObservationDto };
