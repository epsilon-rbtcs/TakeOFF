// Ground Health Console — data hooks
// Every hook reads the Ground API. There are no synthetic fallbacks: a failed
// request produces an explicit error and an empty dataset.

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient, newIdempotencyKey } from './client';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { DOMAINS, definitionsForDomain } from './domains';
import type { DomainDescriptor } from './domains';
import type {
  ActionCreateInput,
  ActionDto,
  AlertDto,
  AlertEventDto,
  AnalysisRunDto,
  ApiFailure,
  ApiResult,
  AssessmentDetailDto,
  AssessmentSummaryDto,
  AstronautDto,
  AuditEventDto,
  BaselineDto,
  CatalogueDto,
  CommunicationStatusDto,
  DashboardDto,
  MeasurementDefinitionDto,
  MessageDto,
  MessageEventTypeDto,
  MessageTypeDto,
  ObservationDto,
  SyncStatusDto
} from './types';

interface QueryState<T> {
  data: T | null;
  error: ApiFailure | null;
  loading: boolean;
}

function useQuery<T>(key: string | null, loader: () => Promise<ApiResult<T>>) {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    error: null,
    loading: Boolean(key)
  });
  const [version, setVersion] = useState<number>(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (!key) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    let cancelled = false;
    setState((current) => ({ ...current, loading: true }));
    loaderRef.current().then((result) => {
      if (cancelled) return;
      setState({ data: result.data, error: result.error, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  const refetch = useCallback(() => setVersion((value) => value + 1), []);
  return { ...state, refetch };
}

// --- Single-resource hooks ------------------------------------------------

export function useDashboard(astronautId: string | null, missionId: string | null) {
  return useQuery<DashboardDto>(
    astronautId && missionId ? `dashboard:${missionId}:${astronautId}` : null,
    () => apiClient.getDashboard(astronautId as string, missionId as string)
  );
}

export function useCatalogue(missionId: string | null) {
  return useQuery<CatalogueDto>(
    missionId ? `catalogue:${missionId}` : null,
    () => apiClient.getCatalogue(missionId as string)
  );
}

export function useRecentObservations(
  astronautId: string | null,
  missionId: string | null,
  limit = 20
) {
  return useQuery<ObservationDto[]>(
    astronautId && missionId ? `recent-observations:${missionId}:${astronautId}:${limit}` : null,
    async () => {
      const result = await apiClient.listObservations({
        astronautId: astronautId as string,
        missionId: missionId as string,
        limit
      });
      if (result.error) return { data: null, error: result.error, status: result.status };
      return { data: result.data?.items ?? [], error: null, status: result.status };
    }
  );
}

export function useAstronaut(
  astronautId: string | null,
  missionId: string | null
) {
  return useQuery<AstronautDto>(
    astronautId && missionId ? `astronaut:${astronautId}` : null,
    () => apiClient.getAstronaut(astronautId as string)
  );
}

// --- Mission overview -----------------------------------------------------

export interface CrewOverviewRow {
  astronaut: AstronautDto;
  dashboard: DashboardDto | null;
  openAlerts: AlertDto[];
  acknowledgedAlerts: AlertDto[];
  error: ApiFailure | null;
}

export interface CrewOverviewData {
  rows: CrewOverviewRow[];
  generatedAt: string;
}

export function useCrewOverview() {
  const { astronauts, missionId } = useData();
  const key =
    missionId && astronauts.length > 0
      ? `crew-overview:${missionId}:${astronauts.map((item) => item.astronaut_id).join(',')}`
      : null;

  return useQuery<CrewOverviewData>(key, async () => {
    const rows = await Promise.all(
      astronauts.map(async (astronaut): Promise<CrewOverviewRow> => {
        const [dashboard, alerts] = await Promise.all([
          apiClient.getDashboard(astronaut.astronaut_id, missionId as string),
          apiClient.listAlerts({
            astronautId: astronaut.astronaut_id,
            missionId: missionId as string,
            limit: 200
          })
        ]);
        const alertItems = alerts.data ?? [];
        return {
          astronaut,
          dashboard: dashboard.data,
          openAlerts: alertItems.filter((item) => item.status === 'open'),
          acknowledgedAlerts: alertItems.filter((item) => item.status === 'acknowledged'),
          error: dashboard.error ?? alerts.error
        };
      })
    );
    return {
      data: { rows, generatedAt: new Date().toISOString() },
      error: null,
      status: 200
    };
  });
}

// --- Astronaut workspace --------------------------------------------------

export interface WorkspaceData {
  dashboard: DashboardDto | null;
  observations: ObservationDto[];
  assessments: AssessmentSummaryDto[];
  baselines: BaselineDto[];
  analysisRuns: AnalysisRunDto[];
  alerts: AlertDto[];
  actions: ActionDto[];
  catalogue: CatalogueDto | null;
  warnings: string[];
}

export function useAstronautWorkspace(astronautId: string | null, missionId: string | null) {
  return useQuery<WorkspaceData>(
    astronautId && missionId ? `workspace:${missionId}:${astronautId}` : null,
    async () => {
      const [dashboard, observations, assessments, baselines, runs, alerts, actions, catalogue] =
        await Promise.all([
          apiClient.getDashboard(astronautId as string, missionId as string),
          apiClient.listObservations({
            astronautId: astronautId as string,
            missionId: missionId as string,
            limit: 500
          }),
          apiClient.listAssessments(astronautId as string, missionId as string),
          apiClient.listBaselines(astronautId as string, missionId as string),
          apiClient.listAnalysisRuns(astronautId as string, missionId as string),
          apiClient.listAlerts({
            astronautId: astronautId as string,
            missionId: missionId as string,
            limit: 200
          }),
          apiClient.listActions({
            astronautId: astronautId as string,
            missionId: missionId as string,
            limit: 200
          }),
          apiClient.getCatalogue(missionId as string)
        ]);

      if (dashboard.error) {
        return { data: null, error: dashboard.error, status: dashboard.status };
      }

      const warnings: string[] = [];
      for (const [label, result] of [
        ['observations', observations],
        ['assessments', assessments],
        ['baselines', baselines],
        ['analysis runs', runs],
        ['alerts', alerts],
        ['recommended actions', actions],
        ['measurement catalogue', catalogue]
      ] as const) {
        if (result.error) warnings.push(`${label}: ${result.error.message}`);
      }

      return {
        data: {
          dashboard: dashboard.data,
          observations: observations.data?.items ?? [],
          assessments: assessments.data ?? [],
          baselines: baselines.data ?? [],
          analysisRuns: runs.data ?? [],
          alerts: alerts.data ?? [],
          actions: actions.data ?? [],
          catalogue: catalogue.data,
          warnings
        },
        error: null,
        status: 200
      };
    }
  );
}

// --- Domain workspace -----------------------------------------------------

export interface DomainData {
  definitions: MeasurementDefinitionDto[];
  observations: ObservationDto[];
  assessment: AssessmentSummaryDto | null;
  assessmentDetail: AssessmentDetailDto | null;
  baselines: BaselineDto[];
  alerts: AlertDto[];
  catalogue: CatalogueDto | null;
  warnings: string[];
}

export function useDomainData(domain: DomainDescriptor) {
  const { selectedAstronautId, missionId } = useData();

  return useQuery<DomainData>(
    selectedAstronautId && missionId
      ? `domain:${domain.key}:${missionId}:${selectedAstronautId}`
      : null,
    async () => {
      const [catalogue, observations, assessments, baselines, alerts] = await Promise.all([
        apiClient.getCatalogue(missionId as string),
        apiClient.listObservations({
          astronautId: selectedAstronautId as string,
          missionId: missionId as string,
          limit: 500
        }),
        apiClient.listAssessments(
          selectedAstronautId as string,
          missionId as string,
          domain.moduleCode
        ),
        apiClient.listBaselines(selectedAstronautId as string, missionId as string),
        apiClient.listAlerts({
          astronautId: selectedAstronautId as string,
          missionId: missionId as string,
          limit: 200
        })
      ]);

      if (catalogue.error) {
        return { data: null, error: catalogue.error, status: catalogue.status };
      }

      const definitions = catalogue.data
        ? definitionsForDomain(catalogue.data.items, domain)
        : [];
      const allowedCodes = new Set(definitions.map((item) => item.code));
      const domainObservations = (observations.data?.items ?? []).filter((item) =>
        allowedCodes.has(item.measurement_code)
      );
      const domainAlerts = (alerts.data ?? []).filter(
        (item) => item.alert_code.includes(`_${domain.moduleCode}_`)
      );

      const assessmentSummaries = assessments.data ?? [];
      const latestAssessment = assessmentSummaries[0] ?? null;
      let assessmentDetail: AssessmentDetailDto | null = null;
      let assessmentDetailError: ApiFailure | null = null;
      if (latestAssessment) {
        const detail = await apiClient.getAssessment(latestAssessment.assessment_id);
        assessmentDetail = detail.data;
        assessmentDetailError = detail.error;
      }

      const warnings: string[] = [];
      if (observations.error) warnings.push(`observations: ${observations.error.message}`);
      if (assessments.error) warnings.push(`assessments: ${assessments.error.message}`);
      if (baselines.error) warnings.push(`baselines: ${baselines.error.message}`);
      if (alerts.error) warnings.push(`alerts: ${alerts.error.message}`);
      if (assessmentDetailError) {
        warnings.push(`assessment detail: ${assessmentDetailError.message}`);
      }

      return {
        data: {
          definitions,
          observations: domainObservations,
          assessment: latestAssessment,
          assessmentDetail,
          baselines: (baselines.data ?? []).filter(
            (item) => item.measurement_code && allowedCodes.has(item.measurement_code)
          ),
          alerts: domainAlerts,
          catalogue: catalogue.data,
          warnings
        },
        error: null,
        status: 200
      };
    }
  );
}

// --- Alerts & actions -----------------------------------------------------

export interface AlertsActionsData {
  alerts: AlertDto[];
  actions: ActionDto[];
  warning: string | null;
}

export function useAlertsActions() {
  const { selectedAstronautId, missionId } = useData();

  const query = useQuery<AlertsActionsData>(
    selectedAstronautId && missionId
      ? `alerts-actions:${missionId}:${selectedAstronautId}`
      : null,
    async () => {
      const [alerts, actions] = await Promise.all([
        apiClient.listAlerts({
          astronautId: selectedAstronautId as string,
          missionId: missionId as string,
          limit: 500
        }),
        apiClient.listActions({
          astronautId: selectedAstronautId as string,
          missionId: missionId as string,
          limit: 500
        })
      ]);
      if (alerts.error) return { data: null, error: alerts.error, status: alerts.status };
      return {
        data: {
          alerts: alerts.data ?? [],
          actions: actions.data ?? [],
          warning: actions.error ? `recommended actions: ${actions.error.message}` : null
        },
        error: null,
        status: 200
      };
    }
  );

  const acknowledgeAlert = useCallback(
    async (alert: AlertDto, note?: string) =>
      apiClient.acknowledgeAlert(alert.alert_id, {
        expected_revision: alert.revision,
        note
      }),
    []
  );

  const transitionAlert = useCallback(
    async (alert: AlertDto, event: 'resolved' | 'dismissed', note?: string) =>
      apiClient.createAlertEvent(alert.alert_id, {
        event_type: event,
        expected_revision: alert.revision,
        note
      }),
    []
  );

  const createAction = useCallback(
    async (input: ActionCreateInput) => apiClient.createAction(input),
    []
  );

  const updateActionStatus = useCallback(
    async (action: ActionDto, status: string, note?: string) =>
      apiClient.updateAction(action.action_id, {
        expected_revision: action.revision,
        status,
        note
      }),
    []
  );

  const addActionNote = useCallback(
    async (action: ActionDto, note: string) =>
      apiClient.updateAction(action.action_id, {
        expected_revision: action.revision,
        note
      }),
    []
  );

  return {
    ...query,
    acknowledgeAlert,
    transitionAlert,
    createAction,
    updateActionStatus,
    addActionNote
  };
}

// --- Alert / action history ----------------------------------------------

export function useAlertHistory(alertId: string | null) {
  return useQuery<AlertEventDto[]>(
    alertId ? `alert-history:${alertId}` : null,
    () => apiClient.listAlertHistory(alertId as string)
  );
}

export function useAssessmentDetail(assessmentId: string | null) {
  return useQuery<AssessmentDetailDto>(
    assessmentId ? `assessment-detail:${assessmentId}` : null,
    () => apiClient.getAssessment(assessmentId as string)
  );
}

export function useAssessmentList(
  astronautId: string | null,
  missionId: string | null,
  moduleCode?: string
) {
  return useQuery<AssessmentSummaryDto[]>(
    astronautId && missionId
      ? `assessments:${missionId}:${astronautId}:${moduleCode ?? 'all'}`
      : null,
    () => apiClient.listAssessments(astronautId as string, missionId as string, moduleCode)
  );
}

export function useActionHistory(actionId: string | null) {
  return useQuery<import('./types').ActionEventDto[]>(
    actionId ? `action-history:${actionId}` : null,
    () => apiClient.listActionHistory(actionId as string)
  );
}

// --- Communications -------------------------------------------------------

/**
 * Communication state comes from the shared context (one request per crew
 * member). Sync status exists only for crew identities; ground roles have no
 * batch-history endpoint and the page says so explicitly.
 */
export function useCommunications() {
  const { missionId, commStatus, commError, commSupported } = useData();
  const { isCrewMember } = useAuth();

  const sync = useQuery<SyncStatusDto | null>(
    isCrewMember && missionId ? `sync-status:${missionId}` : null,
    async () => {
      const result = await apiClient.getOwnSyncStatus();
      if (result.error) {
        return { data: null, error: result.error, status: result.status };
      }
      return { data: result.data, error: null, status: result.status };
    }
  );

  return {
    status: commStatus,
    statusError: commError,
    commSupported,
    sync: sync.data,
    syncError: sync.error,
    syncLoading: sync.loading,
    refetchSync: sync.refetch
  };
}

// --- Audit ----------------------------------------------------------------

export interface AuditFilters {
  action?: string;
  entityType?: string;
  outcome?: string;
  astronautId?: string;
  occurredFrom?: string;
  occurredTo?: string;
}

export function useAudit(filters: AuditFilters, enabled = true) {
  const { missionId } = useData();
  const key =
    enabled && missionId
      ? `audit:${missionId}:${filters.action ?? ''}:${filters.entityType ?? ''}:${
          filters.outcome ?? ''
        }:${filters.astronautId ?? ''}:${filters.occurredFrom ?? ''}:${filters.occurredTo ?? ''}`
      : null;

  return useQuery<AuditEventDto[]>(key, () =>
    apiClient.listAuditEvents({
      missionId: missionId as string,
      astronautId: filters.astronautId,
      action: filters.action,
      entityType: filters.entityType,
      outcome: filters.outcome,
      occurredFrom: filters.occurredFrom,
      occurredTo: filters.occurredTo,
      limit: 200
    })
  );
}

// --- Messages -------------------------------------------------------------

export function useMessages(astronautIdOverride?: string | null) {
  const { missionId, selectedAstronautId } = useData();
  const effectiveAstronautId =
    astronautIdOverride === undefined ? selectedAstronautId : astronautIdOverride;

  const query = useQuery<MessageDto[]>(
    missionId ? `messages:${missionId}:${effectiveAstronautId ?? 'all'}` : null,
    () =>
      apiClient.listMessages({
        missionId: missionId as string,
        astronautId: effectiveAstronautId ?? undefined,
        limit: 200
      })
  );

  const sendMessage = useCallback(
    async (input: {
      missionId: string;
      astronautId: string;
      title: string;
      body: string;
      messageType: MessageTypeDto;
      version?: string;
      expiresAt?: string;
    }) =>
      apiClient.createMessage(
        {
          mission_id: input.missionId,
          astronaut_id: input.astronautId,
          message_type: input.messageType,
          title: input.title,
          body: input.body,
          version: input.version || undefined,
          expires_at: input.expiresAt
        },
        newIdempotencyKey('message')
      ),
    []
  );

  const recordMessageEvent = useCallback(
    async (messageId: string, eventType: MessageEventTypeDto) =>
      apiClient.createMessageEvent(
        messageId,
        {
          event_type: eventType,
          client_created_at: new Date().toISOString()
        },
        newIdempotencyKey('message-event')
      ),
    []
  );

  return { ...query, sendMessage, recordMessageEvent };
}

// Re-export the catalogue-derived domain list for navigation helpers.
export { DOMAINS };
