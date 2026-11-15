// Ground Health Console — Live mission context
// Loads service health, the authenticated mission scope and enrolled crew from
// the Ground API. Nothing here falls back to synthetic demo records.

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { apiClient } from '../api/client';
import type {
  AstronautDto,
  CommunicationStatusDto,
  HealthDto,
  MissionDto
} from '../api/types';

export type ApiStatus = 'checking' | 'connected' | 'degraded' | 'offline';

interface DataContextType {
  apiStatus: ApiStatus;
  health: HealthDto | null;
  healthError: string | null;
  missions: MissionDto[];
  missionsLoading: boolean;
  missionError: string | null;
  mission: MissionDto | null;
  missionId: string | null;
  selectMission: (missionId: string) => void;
  astronauts: AstronautDto[];
  crewLoading: boolean;
  crewError: string | null;
  selectedAstronautId: string | null;
  selectAstronaut: (astronautId: string | null) => void;
  selectedAstronaut: AstronautDto | null;
  commStatus: CommunicationStatusDto | null;
  commError: string | null;
  commSupported: boolean;
  lastRefreshedAt: string | null;
  refreshAll: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const MISSION_STORAGE_KEY = 'ghc_selected_mission';
const ASTRONAUT_STORAGE_KEY = 'ghc_selected_astronaut';

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isMedicalOfficer, isCrewMember } = useAuth();

  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');
  const [health, setHealth] = useState<HealthDto | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [missions, setMissions] = useState<MissionDto[]>([]);
  const [missionsLoading, setMissionsLoading] = useState<boolean>(false);
  const [missionError, setMissionError] = useState<string | null>(null);
  const [missionId, setMissionId] = useState<string | null>(null);

  const [astronauts, setAstronauts] = useState<AstronautDto[]>([]);
  const [crewLoading, setCrewLoading] = useState<boolean>(false);
  const [crewError, setCrewError] = useState<string | null>(null);
  const [selectedAstronautId, setSelectedAstronautId] = useState<string | null>(null);

  const [commStatus, setCommStatus] = useState<CommunicationStatusDto | null>(null);
  const [commError, setCommError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);

  const accessToken = user?.is_demo ? null : user?.access_token ?? null;
  const sessionAstronautId = user?.astronaut_id ?? null;
  const commSupported = isMedicalOfficer || isCrewMember;

  // Service health is public and is also the honest connectivity indicator.
  useEffect(() => {
    let cancelled = false;
    setApiStatus('checking');
    apiClient.getHealth().then((result) => {
      if (cancelled) return;
      if (result.error || !result.data) {
        setApiStatus('offline');
        setHealth(null);
        setHealthError(result.error?.message ?? 'No health payload was returned.');
        return;
      }
      setHealth(result.data);
      setHealthError(null);
      setApiStatus(result.data.status === 'ok' ? 'connected' : 'degraded');
      setLastRefreshedAt(new Date().toISOString());
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Mission scope and crew roster belong to the authenticated session.
  useEffect(() => {
    if (!accessToken) {
      setMissions([]);
      setAstronauts([]);
      setMissionId(null);
      setSelectedAstronautId(null);
      setCommStatus(null);
      return;
    }

    let cancelled = false;
    setMissionsLoading(true);
    setCrewLoading(true);
    setMissionError(null);
    setCrewError(null);

    apiClient.listMissions().then((result) => {
      if (cancelled) return;
      if (result.error || !result.data) {
        setMissions([]);
        setMissionError(result.error?.message ?? 'Mission scope could not be loaded.');
        setMissionsLoading(false);
        return;
      }
      setMissions(result.data);
      setMissionsLoading(false);
      setLastRefreshedAt(new Date().toISOString());
    });

    apiClient.listAstronauts().then((result) => {
      if (cancelled) return;
      if (result.error || !result.data) {
        setAstronauts([]);
        setCrewError(result.error?.message ?? 'Crew roster could not be loaded.');
        setCrewLoading(false);
        return;
      }
      setAstronauts(result.data);
      setCrewLoading(false);
      setLastRefreshedAt(new Date().toISOString());
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken, reloadKey]);

  // Keep the selected mission valid for the current scope.
  useEffect(() => {
    if (!accessToken || missions.length === 0) return;
    setMissionId((current) => {
      if (current && missions.some((item) => item.mission_id === current)) return current;
      const saved = sessionStorage.getItem(MISSION_STORAGE_KEY);
      const savedMatch = saved ? missions.find((item) => item.mission_id === saved) : undefined;
      const chosen = savedMatch ?? missions[0];
      sessionStorage.setItem(MISSION_STORAGE_KEY, chosen.mission_id);
      return chosen.mission_id;
    });
  }, [accessToken, missions]);

  // Crew-member identities are pinned to their own record; ground roles choose.
  useEffect(() => {
    if (!accessToken) return;
    if (sessionAstronautId) {
      setSelectedAstronautId(sessionAstronautId);
      return;
    }
    if (astronauts.length === 0) return;
    setSelectedAstronautId((current) => {
      if (current && astronauts.some((item) => item.astronaut_id === current)) return current;
      const saved = sessionStorage.getItem(ASTRONAUT_STORAGE_KEY);
      const savedMatch = saved ? astronauts.find((item) => item.astronaut_id === saved) : undefined;
      const chosen = savedMatch ?? astronauts[0];
      sessionStorage.setItem(ASTRONAUT_STORAGE_KEY, chosen.astronaut_id);
      return chosen.astronaut_id;
    });
  }, [accessToken, sessionAstronautId, astronauts]);

  // Reported adapter state is fetched, never inferred from a successful request.
  useEffect(() => {
    if (!accessToken || !commSupported || !missionId || !selectedAstronautId) {
      setCommStatus(null);
      setCommError(null);
      return;
    }
    let cancelled = false;
    apiClient
      .getCommunicationStatus({ astronautId: selectedAstronautId, missionId })
      .then((result) => {
        if (cancelled) return;
        if (result.error || !result.data) {
          setCommStatus(null);
          setCommError(result.error?.message ?? 'Communication state could not be loaded.');
          return;
        }
        setCommStatus(result.data);
        setCommError(null);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, commSupported, missionId, selectedAstronautId, reloadKey]);

  const selectMission = useCallback((nextMissionId: string) => {
    setMissionId(nextMissionId);
    sessionStorage.setItem(MISSION_STORAGE_KEY, nextMissionId);
  }, []);

  const selectAstronaut = useCallback((nextAstronautId: string | null) => {
    setSelectedAstronautId(nextAstronautId);
    if (nextAstronautId) {
      sessionStorage.setItem(ASTRONAUT_STORAGE_KEY, nextAstronautId);
    } else {
      sessionStorage.removeItem(ASTRONAUT_STORAGE_KEY);
    }
  }, []);

  const refreshAll = useCallback(() => setReloadKey((value) => value + 1), []);

  const mission = missionId
    ? missions.find((item) => item.mission_id === missionId) ?? null
    : null;
  const selectedAstronaut = selectedAstronautId
    ? astronauts.find((item) => item.astronaut_id === selectedAstronautId) ?? null
    : null;

  return (
    <DataContext.Provider
      value={{
        apiStatus,
        health,
        healthError,
        missions,
        missionsLoading,
        missionError,
        mission,
        missionId,
        selectMission,
        astronauts,
        crewLoading,
        crewError,
        selectedAstronautId,
        selectAstronaut,
        selectedAstronaut,
        commStatus,
        commError,
        commSupported,
        lastRefreshedAt,
        refreshAll
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
