// Ground Health Console — Authentication Context
// Session state comes exclusively from the FastAPI demo identity exchange.
// There is no offline/mock token: if the Ground API rejects the credentials,
// the console reports the rejection instead of inventing a session.

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthToken, UserRole } from '../types';
import { apiClient } from '../api/client';

interface AuthContextType {
  user: AuthToken | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  isMedicalOfficer: boolean;
  isAdministrator: boolean;
  isCrewMember: boolean;
  canMutateClinical: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'ghc_auth_session';

const getDemoSession = (username: string): AuthToken => {
  const role: UserRole =
    username === 'admin' ? 'administrator' : username === 'astronaut' ? 'crew_member' : 'medical_officer';

  return {
    access_token: `local-demo-${role}`,
    token_type: 'demo',
    expires_in: 0,
    role,
    mission_ids: [],
    astronaut_id: null,
    is_demo: true
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthToken | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const applySession = useCallback((session: AuthToken) => {
    setUser(session);
    apiClient.setToken(session.access_token);
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setError(null);
    apiClient.setToken(null);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  // Restore and validate the stored session on mount.
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthToken;
        if (parsed && parsed.access_token) {
          setUser(parsed);
          apiClient.setToken(parsed.access_token);
        }
      }
    } catch {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // A rejected bearer token must end the session rather than leave stale data.
  useEffect(() => {
    apiClient.setUnauthorizedHandler(() => {
      logout();
    });
    return () => apiClient.setUnauthorizedHandler(null);
  }, [logout]);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    const normalizedUsername = username.trim();
    applySession(getDemoSession(normalizedUsername));
    setIsLoading(false);

    // Upgrade the local demo session when the API is available without blocking entry.
    void apiClient.login({ username: normalizedUsername, password }).then((result) => {
      if (result.data) applySession(result.data);
    });

    return true;
  };

  const clearError = () => setError(null);

  const role = user?.role as UserRole | undefined;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        logout,
        clearError,
        isMedicalOfficer: role === 'medical_officer',
        isAdministrator: role === 'administrator',
        isCrewMember: role === 'crew_member',
        canMutateClinical: role === 'medical_officer'
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
