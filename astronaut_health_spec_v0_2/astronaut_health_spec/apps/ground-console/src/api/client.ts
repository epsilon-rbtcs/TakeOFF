// Ground Health Console — API Client
// Connects to FastAPI backend and implements contracts from openapi.yaml

import {
  AuthCredentials,
  AuthToken,
  DashboardSummary,
  Observation,
  ModuleAssessment,
  Alert,
  FollowUpAction,
  CommunicationStatus,
  Message,
  SyncBatch,
  BaselineReference,
  EnvironmentalReading,
  RadiationReading,
  Astronaut,
  Mission
} from '../types';

export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1';

class ApiClient {
  private token: string | null = null;
  private baseUrl: string = API_BASE_URL;

  constructor() {
    // Restore token from storage if present
    const saved = sessionStorage.getItem('ghc_auth_token');
    if (saved) {
      this.token = saved;
    }
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (token) {
      sessionStorage.setItem('ghc_auth_token', token);
    } else {
      sessionStorage.removeItem('ghc_auth_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string; status: number }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const status = response.status;

      if (status === 204) {
        return { status, data: {} as T };
      }

      let json: any = null;
      try {
        json = await response.json();
      } catch {
        json = null;
      }

      if (!response.ok) {
        const errorMsg =
          json?.detail ||
          json?.message ||
          `API request failed with HTTP status ${status}`;
        return { status, error: errorMsg };
      }

      return { status, data: json as T };
    } catch (err: any) {
      return {
        status: 0,
        error: err?.message || 'Network connectivity error: Server unreachable'
      };
    }
  }

  // --- Auth Endpoints ---
  public async login(credentials: AuthCredentials): Promise<{ data?: AuthToken; error?: string }> {
    const res = await this.request<AuthToken>('/auth/demo-token', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    if (res.data?.access_token) {
      this.setToken(res.data.access_token);
    }
    return { data: res.data, error: res.error };
  }

  // --- Dashboard Summary ---
  public async getDashboardSummary(
    astronautId: string,
    missionId: string
  ): Promise<{ data?: any; error?: string }> {
    return this.request(
      `/dashboard/summary?astronaut_id=${encodeURIComponent(astronautId)}&mission_id=${encodeURIComponent(missionId)}`,
      { method: 'GET' }
    );
  }

  // --- Astronauts & Missions ---
  public async getAstronaut(astronautId: string): Promise<{ data?: Astronaut; error?: string }> {
    return this.request(`/astronauts/${encodeURIComponent(astronautId)}`, { method: 'GET' });
  }

  public async getMission(missionId: string): Promise<{ data?: Mission; error?: string }> {
    return this.request(`/missions/${encodeURIComponent(missionId)}`, { method: 'GET' });
  }

  // --- Observations ---
  public async getObservations(
    astronautId: string,
    missionId: string,
    measurementCode?: string
  ): Promise<{ data?: Observation[]; error?: string }> {
    let url = `/observations?astronaut_id=${encodeURIComponent(astronautId)}&mission_id=${encodeURIComponent(missionId)}`;
    if (measurementCode) {
      url += `&measurement_code=${encodeURIComponent(measurementCode)}`;
    }
    return this.request(url, { method: 'GET' });
  }

  public async getBaselines(
    astronautId: string,
    missionId: string
  ): Promise<{ data?: BaselineReference[]; error?: string }> {
    return this.request(
      `/astronauts/${encodeURIComponent(astronautId)}/baselines?mission_id=${encodeURIComponent(missionId)}`,
      { method: 'GET' }
    );
  }

  // --- Assessments ---
  public async getAssessments(
    astronautId?: string,
    missionId?: string,
    domain?: string
  ): Promise<{ data?: ModuleAssessment[]; error?: string }> {
    const params = new URLSearchParams();
    if (astronautId) params.append('astronaut_id', astronautId);
    if (missionId) params.append('mission_id', missionId);
    if (domain) params.append('health_domain', domain);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/assessments${qs}`, { method: 'GET' });
  }

  public async getAssessment(
    assessmentId: string
  ): Promise<{ data?: ModuleAssessment; error?: string }> {
    return this.request(`/assessments/${encodeURIComponent(assessmentId)}`, { method: 'GET' });
  }

  // --- Alerts & Actions ---
  public async getAlerts(
    astronautId?: string,
    status?: string
  ): Promise<{ data?: Alert[]; error?: string }> {
    const params = new URLSearchParams();
    if (astronautId) params.append('astronaut_id', astronautId);
    if (status) params.append('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/alerts${qs}`, { method: 'GET' });
  }

  public async acknowledgeAlert(
    alertId: string,
    note?: string
  ): Promise<{ data?: any; error?: string }> {
    return this.request(`/alerts/${encodeURIComponent(alertId)}/acknowledgements`, {
      method: 'POST',
      body: JSON.stringify({ note: note || 'Acknowledged by medical officer' })
    });
  }

  public async getActions(
    astronautId?: string,
    status?: string
  ): Promise<{ data?: FollowUpAction[]; error?: string }> {
    const params = new URLSearchParams();
    if (astronautId) params.append('astronaut_id', astronautId);
    if (status) params.append('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/actions${qs}`, { method: 'GET' });
  }

  public async postActionEvent(
    actionId: string,
    event: { action_type: string; note?: string }
  ): Promise<{ data?: any; error?: string }> {
    return this.request(`/actions/${encodeURIComponent(actionId)}/events`, {
      method: 'POST',
      body: JSON.stringify(event)
    });
  }

  // --- Communication & Sync ---
  public async getCommunicationStatus(
    clientId?: string
  ): Promise<{ data?: CommunicationStatus; error?: string }> {
    const qs = clientId ? `?client_id=${encodeURIComponent(clientId)}` : '';
    return this.request(`/communications/status${qs}`, { method: 'GET' });
  }

  public async getSyncBatches(
    clientId?: string
  ): Promise<{ data?: SyncBatch[]; error?: string }> {
    const qs = clientId ? `?client_id=${encodeURIComponent(clientId)}` : '';
    return this.request(`/sync/status${qs}`, { method: 'GET' });
  }

  // --- Messages ---
  public async getMessages(
    missionId?: string,
    astronautId?: string
  ): Promise<{ data?: Message[]; error?: string }> {
    const params = new URLSearchParams();
    if (missionId) params.append('mission_id', missionId);
    if (astronautId) params.append('astronaut_id', astronautId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/messages${qs}`, { method: 'GET' });
  }

  public async sendMessage(message: Partial<Message>): Promise<{ data?: Message; error?: string }> {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(message)
    });
  }

  public async postMessageEvent(
    messageId: string,
    status: string,
    note?: string
  ): Promise<{ data?: any; error?: string }> {
    return this.request(`/messages/${encodeURIComponent(messageId)}/events`, {
      method: 'POST',
      body: JSON.stringify({ status, note })
    });
  }
}

export const apiClient = new ApiClient();
