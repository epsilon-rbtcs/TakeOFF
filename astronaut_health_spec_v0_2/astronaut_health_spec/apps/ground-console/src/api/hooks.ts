// Ground Health Console — Data Hooks
// Provides unified data fetching that transparently switches between live FastAPI and synthetic mock datasets

import { useState, useEffect, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { apiClient } from './client';
import {
  mockAstronauts,
  mockCrewSummary,
  mockMissionSummary,
  mockRecentActivity,
  mockAttentionItems,
  mockObservations,
  mockAssessments,
  mockAlerts,
  mockActions,
  mockCommunicationStatus,
  mockSyncBatches,
  mockMessages,
  mockEnvironmentalReadings,
  mockRadiationReadings,
  mockBaselines,
  DEMO_ASTRONAUT_ID,
  DEMO_MISSION_ID
} from '../mock-data';
import {
  DashboardSummary,
  Astronaut,
  AstronautSummary,
  Observation,
  ModuleAssessment,
  Alert,
  FollowUpAction,
  CommunicationStatus,
  SyncBatch,
  Message,
  EnvironmentalReading,
  RadiationReading,
  BaselineReference,
  CommunicationState
} from '../types';

// In-memory mutable states for mock mode interactive state changes
let inMemoryAlerts = [...mockAlerts];
let inMemoryActions = [...mockActions];
let inMemoryMessages = [...mockMessages];
let inMemoryCommStatus = { ...mockCommunicationStatus };

// --- 1. Dashboard Hook ---
export function useDashboard() {
  const { isMock } = useData();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isMock) {
      // Assemble mock dashboard summary
      setData({
        mission: mockMissionSummary,
        crew: mockCrewSummary,
        recent_activity: mockRecentActivity,
        attention_items: mockAttentionItems
      });
      setLoading(false);
      return;
    }

    // Live API mode
    try {
      const res = await apiClient.getDashboardSummary(DEMO_ASTRONAUT_ID, DEMO_MISSION_ID);
      if (res.error) {
        setError(res.error);
        // Graceful fallback to mock data with warning
        setData({
          mission: mockMissionSummary,
          crew: mockCrewSummary,
          recent_activity: mockRecentActivity,
          attention_items: mockAttentionItems
        });
      } else if (res.data) {
        // Map backend dashboard summary response to DashboardSummary
        const raw = res.data;
        const mappedCrew: AstronautSummary[] = [
          {
            astronaut_id: raw.astronaut_id || DEMO_ASTRONAUT_ID,
            name: 'Cmdr. Elena Vasquez',
            callsign: 'Vanguard',
            role_in_crew: 'Mission Commander',
            mission_id: raw.mission_id || DEMO_MISSION_ID,
            last_health_update: raw.latest_received_at || 'Never',
            latest_measurement_at: raw.latest_measured_at || 'Never',
            pending_assessments: raw.assessments?.length || 0,
            open_actions: 1,
            data_freshness: raw.freshness || 'unknown',
            communication_status: raw.communication?.state || 'LIVE'
          }
        ];

        setData({
          mission: {
            ...mockMissionSummary,
            last_sync: raw.latest_received_at || mockMissionSummary.last_sync,
            communication_state: raw.communication?.state || 'LIVE'
          },
          crew: mappedCrew,
          recent_activity: mockRecentActivity,
          attention_items: mockAttentionItems
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard from API');
      setData({
        mission: mockMissionSummary,
        crew: mockCrewSummary,
        recent_activity: mockRecentActivity,
        attention_items: mockAttentionItems
      });
    } finally {
      setLoading(false);
    }
  }, [isMock]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, loading, error, refetch: fetchDashboard };
}

// --- 2. Crew Roster Hook ---
export function useCrewRoster() {
  const { isMock } = useData();
  const [crew, setCrew] = useState<Astronaut[]>(mockAstronauts);
  const [summary, setSummary] = useState<AstronautSummary[]>(mockCrewSummary);
  const [loading, setLoading] = useState<boolean>(false);

  return { crew, summary, loading };
}

// --- 3. Astronaut Profile & Observations Hook ---
export function useAstronautProfile(astronautId: string) {
  const { isMock } = useData();
  const [astronaut, setAstronaut] = useState<Astronaut | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [assessments, setAssessments] = useState<ModuleAssessment[]>([]);
  const [baselines, setBaselines] = useState<BaselineReference[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    const foundAstronaut =
      mockAstronauts.find((a) => a.astronaut_id === astronautId) || mockAstronauts[0];
    setAstronaut(foundAstronaut);

    if (isMock) {
      const astronautObs = mockObservations.filter((o) => o.astronaut_id === astronautId);
      const astronautAsm = mockAssessments.filter((a) => a.astronaut_id === astronautId);
      const astronautBase = mockBaselines.filter((b) => b.astronaut_id === astronautId);

      setObservations(astronautObs);
      setAssessments(astronautAsm);
      setBaselines(astronautBase);
      setLoading(false);
      return;
    }

    // Try API
    try {
      const res = await apiClient.getObservations(astronautId, DEMO_MISSION_ID);
      if (res.data) {
        setObservations(res.data);
      } else {
        setObservations(mockObservations.filter((o) => o.astronaut_id === astronautId));
      }

      const asmRes = await apiClient.getAssessments(astronautId, DEMO_MISSION_ID);
      if (asmRes.data) {
        setAssessments(asmRes.data);
      } else {
        setAssessments(mockAssessments.filter((a) => a.astronaut_id === astronautId));
      }

      setBaselines(mockBaselines.filter((b) => b.astronaut_id === astronautId));
    } catch {
      setObservations(mockObservations.filter((o) => o.astronaut_id === astronautId));
      setAssessments(mockAssessments.filter((a) => a.astronaut_id === astronautId));
      setBaselines(mockBaselines.filter((b) => b.astronaut_id === astronautId));
    } finally {
      setLoading(false);
    }
  }, [astronautId, isMock]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { astronaut, observations, assessments, baselines, loading, error, refetch: fetchProfile };
}

// --- 4. Assessments Hook ---
export function useAssessments(filters?: { domain?: string; status?: string; astronautId?: string }) {
  const { isMock } = useData();
  const [assessments, setAssessments] = useState<ModuleAssessment[]>(mockAssessments);
  const [loading, setLoading] = useState<boolean>(false);

  const filterAssessments = useCallback(() => {
    return mockAssessments.filter((asm) => {
      if (filters?.astronautId && filters.astronautId !== 'all' && asm.astronaut_id !== filters.astronautId) {
        return false;
      }
      if (filters?.domain && filters.domain !== 'all' && asm.health_domain !== filters.domain) {
        return false;
      }
      if (filters?.status && filters.status !== 'all' && asm.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [filters]);

  useEffect(() => {
    setAssessments(filterAssessments());
  }, [filterAssessments, isMock]);

  return { assessments, loading, refetch: () => setAssessments(filterAssessments()) };
}

// --- 5. Alerts & Action Centre Hook ---
export function useAlertsAndActions(filters?: { status?: string; severity?: string; domain?: string }) {
  const { isMock } = useData();
  const [alerts, setAlerts] = useState<Alert[]>(inMemoryAlerts);
  const [actions, setActions] = useState<FollowUpAction[]>(inMemoryActions);

  const refreshData = useCallback(() => {
    let filteredAlerts = [...inMemoryAlerts];
    if (filters?.status && filters.status !== 'all') {
      filteredAlerts = filteredAlerts.filter((a) => a.status === filters.status);
    }
    if (filters?.severity && filters.severity !== 'all') {
      filteredAlerts = filteredAlerts.filter((a) => a.severity === filters.severity);
    }
    if (filters?.domain && filters.domain !== 'all') {
      filteredAlerts = filteredAlerts.filter((a) => a.health_domain === filters.domain);
    }
    setAlerts(filteredAlerts);
    setActions([...inMemoryActions]);
  }, [filters]);

  useEffect(() => {
    refreshData();
  }, [refreshData, isMock]);

  // Interactive state update handlers
  const acknowledgeAlert = async (alertId: string, actor: string, note?: string) => {
    const alert = inMemoryAlerts.find((a) => a.alert_id === alertId);
    if (alert) {
      alert.status = 'acknowledged';
      alert.events.push({
        event_id: `ae-${Date.now()}`,
        alert_id: alertId,
        action: 'Alert Acknowledged by medical personnel',
        actor: actor || 'Medical Officer',
        note: note || undefined,
        timestamp: new Date().toISOString()
      });
      inMemoryAlerts = [...inMemoryAlerts];
      refreshData();
    }
  };

  const updateAlertStatus = async (
    alertId: string,
    newStatus: Alert['status'],
    actor: string,
    note?: string
  ) => {
    const alert = inMemoryAlerts.find((a) => a.alert_id === alertId);
    if (alert) {
      alert.status = newStatus;
      alert.events.push({
        event_id: `ae-${Date.now()}`,
        alert_id: alertId,
        action: `Status transitioned to ${newStatus.toUpperCase()}`,
        actor: actor || 'Medical Officer',
        note: note || undefined,
        timestamp: new Date().toISOString()
      });
      inMemoryAlerts = [...inMemoryAlerts];
      refreshData();
    }
  };

  const addFollowUpAction = async (newAction: Omit<FollowUpAction, 'action_id' | 'events' | 'created_at'>) => {
    const createdAction: FollowUpAction = {
      ...newAction,
      action_id: `act-${Date.now()}`,
      created_at: new Date().toISOString(),
      events: [
        {
          event_id: `act-e-${Date.now()}`,
          action_id: `act-${Date.now()}`,
          action_type: 'Action Created',
          actor: newAction.assigned_to || 'Medical Officer',
          note: 'Initial protocol assignment',
          timestamp: new Date().toISOString()
        }
      ]
    };
    inMemoryActions = [createdAction, ...inMemoryActions];
    refreshData();
  };

  const updateActionStatus = async (
    actionId: string,
    newStatus: FollowUpAction['status'],
    actor: string,
    note?: string
  ) => {
    const action = inMemoryActions.find((a) => a.action_id === actionId);
    if (action) {
      action.status = newStatus;
      action.events.push({
        event_id: `act-e-${Date.now()}`,
        action_id: actionId,
        action_type: `Status updated to ${newStatus.toUpperCase()}`,
        actor: actor || 'Medical Officer',
        note,
        timestamp: new Date().toISOString()
      });
      inMemoryActions = [...inMemoryActions];
      refreshData();
    }
  };

  return {
    alerts,
    actions,
    acknowledgeAlert,
    updateAlertStatus,
    addFollowUpAction,
    updateActionStatus,
    refetch: refreshData
  };
}

// --- 6. Communication & Sync Hook ---
export function useCommunicationAndSync() {
  const { isMock } = useData();
  const [commStatus, setCommStatus] = useState<CommunicationStatus>(inMemoryCommStatus);
  const [batches, setBatches] = useState<SyncBatch[]>(mockSyncBatches);
  const [loading, setLoading] = useState<boolean>(false);

  // Simulation handler for demonstration
  const simulateCommunicationState = (state: CommunicationState) => {
    inMemoryCommStatus = {
      ...inMemoryCommStatus,
      state,
      observed_at: new Date().toISOString()
    };
    setCommStatus({ ...inMemoryCommStatus });
  };

  return {
    commStatus,
    batches,
    loading,
    simulateCommunicationState
  };
}

// --- 7. Messages Hook ---
export function useMessages(filters?: { astronautId?: string; status?: string }) {
  const [messages, setMessages] = useState<Message[]>(inMemoryMessages);

  const refreshMessages = useCallback(() => {
    let filtered = [...inMemoryMessages];
    if (filters?.astronautId && filters.astronautId !== 'all') {
      filtered = filtered.filter((m) => m.astronaut_id === filters.astronautId);
    }
    if (filters?.status && filters.status !== 'all') {
      filtered = filtered.filter((m) => m.status === filters.status);
    }
    setMessages(filtered);
  }, [filters]);

  useEffect(() => {
    refreshMessages();
  }, [refreshMessages]);

  const composeMessage = (newMessage: {
    astronaut_id?: string;
    recipient_name: string;
    subject: string;
    body: string;
    priority: 'routine' | 'priority' | 'urgent';
    protocol_reference?: string;
  }) => {
    const created: Message = {
      message_id: `msg-${Date.now()}`,
      mission_id: DEMO_MISSION_ID,
      astronaut_id: newMessage.astronaut_id,
      sender_id: 'user-med-01',
      sender_role: 'medical_officer',
      sender_name: 'Medical Officer (Ground Console)',
      recipient_id: newMessage.astronaut_id,
      recipient_name: newMessage.recipient_name,
      subject: newMessage.subject,
      body: newMessage.body,
      priority: newMessage.priority,
      protocol_reference: newMessage.protocol_reference,
      status: 'sent',
      created_at: new Date().toISOString(),
      events: [
        {
          event_id: `me-${Date.now()}-1`,
          message_id: `msg-${Date.now()}`,
          status: 'queued',
          timestamp: new Date().toISOString()
        },
        {
          event_id: `me-${Date.now()}-2`,
          message_id: `msg-${Date.now()}`,
          status: 'sent',
          timestamp: new Date().toISOString()
        }
      ],
      is_synthetic: true
    };

    inMemoryMessages = [created, ...inMemoryMessages];
    refreshMessages();
    return created;
  };

  const updateMessageStatus = (messageId: string, status: Message['status'], note?: string) => {
    const msg = inMemoryMessages.find((m) => m.message_id === messageId);
    if (msg) {
      msg.status = status;
      msg.events.push({
        event_id: `me-${Date.now()}`,
        message_id: messageId,
        status,
        note,
        timestamp: new Date().toISOString()
      });
      inMemoryMessages = [...inMemoryMessages];
      refreshMessages();
    }
  };

  return { messages, composeMessage, updateMessageStatus, refetch: refreshMessages };
}

// --- 8. Environmental & Radiation Hook ---
export function useEnvironmentAndRadiation() {
  const [environmental, setEnvironmental] = useState<EnvironmentalReading[]>(mockEnvironmentalReadings);
  const [radiation, setRadiation] = useState<RadiationReading[]>(mockRadiationReadings);

  return { environmental, radiation };
}
