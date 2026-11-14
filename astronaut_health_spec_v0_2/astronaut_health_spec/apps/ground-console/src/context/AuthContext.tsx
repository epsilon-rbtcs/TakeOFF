// Ground Health Console — Authentication Context
// Handles authentication state, demo role credentials, and permissions

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthToken, UserRole } from '../types';
import { apiClient } from '../api/client';
import { DEMO_ASTRONAUT_ID, DEMO_MISSION_ID } from '../mock-data';

interface AuthContextType {
  user: AuthToken | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string, forceMock?: boolean) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'ghc_auth_session';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthToken | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed: AuthToken = JSON.parse(stored);
        setUser(parsed);
        apiClient.setToken(parsed.access_token);
      }
    } catch {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string, forceMock = false): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    // 1. If not forcing mock, try the live backend API first
    if (!forceMock) {
      try {
        const res = await apiClient.login({ username, password });
        if (res.data && res.data.access_token) {
          setUser(res.data);
          sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(res.data));
          setIsLoading(false);
          return true;
        }
      } catch (e: any) {
        // Backend unavailable, fall through to demo provider
      }
    }

    // 2. Demo fallback authentication for local demonstration
    const demoAccounts: Record<string, { pass: string; role: UserRole; astronaut_id: string | null }> = {
      medical: { pass: 'ground-demo', role: 'medical_officer', astronaut_id: null },
      admin: { pass: 'admin-demo', role: 'administrator', astronaut_id: null },
      astronaut: { pass: 'crew-demo', role: 'crew_member', astronaut_id: DEMO_ASTRONAUT_ID }
    };

    const matched = demoAccounts[username];
    if (matched && password === matched.pass) {
      const demoToken: AuthToken = {
        access_token: `demo-token-${username}-${Date.now()}`,
        token_type: 'bearer',
        expires_in: 3600,
        role: matched.role,
        mission_ids: [DEMO_MISSION_ID],
        astronaut_id: matched.astronaut_id
      };

      setUser(demoToken);
      apiClient.setToken(demoToken.access_token);
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(demoToken));
      setIsLoading(false);
      return true;
    }

    setError('Invalid demo credentials. Use medical / ground-demo or select a preset.');
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    setError(null);
    apiClient.setToken(null);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
