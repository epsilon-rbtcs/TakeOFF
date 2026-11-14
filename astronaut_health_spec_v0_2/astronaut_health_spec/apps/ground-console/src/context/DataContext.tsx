// Ground Health Console — Data Mode Context
// Provides seamless toggle between Live FastAPI backend mode and Synthetic Mock mode

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DataMode } from '../types';

interface DataContextType {
  mode: DataMode;
  setMode: (mode: DataMode) => void;
  isMock: boolean;
  toggleMode: () => void;
  apiStatus: 'connected' | 'offline' | 'checking';
  checkApiHealth: () => Promise<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const MODE_STORAGE_KEY = 'ghc_data_mode';

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<DataMode>(() => {
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    return saved === 'api' ? 'api' : 'mock';
  });

  const [apiStatus, setApiStatus] = useState<'connected' | 'offline' | 'checking'>('checking');

  const checkApiHealth = async (): Promise<boolean> => {
    setApiStatus('checking');
    try {
      const baseUrl =
        (import.meta as any).env?.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1';
      // Attempt quick probe to auth endpoint
      const res = await fetch(`${baseUrl}/auth/demo-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '', password: '' })
      });
      // 401 means endpoint is alive and responsive
      if (res.status === 401 || res.ok) {
        setApiStatus('connected');
        return true;
      }
      setApiStatus('offline');
      return false;
    } catch {
      setApiStatus('offline');
      return false;
    }
  };

  useEffect(() => {
    checkApiHealth();
  }, []);

  const setMode = (newMode: DataMode) => {
    setModeState(newMode);
    localStorage.setItem(MODE_STORAGE_KEY, newMode);
  };

  const toggleMode = () => {
    const newMode = mode === 'mock' ? 'api' : 'mock';
    setMode(newMode);
  };

  return (
    <DataContext.Provider
      value={{
        mode,
        setMode,
        isMock: mode === 'mock',
        toggleMode,
        apiStatus,
        checkApiHealth
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
