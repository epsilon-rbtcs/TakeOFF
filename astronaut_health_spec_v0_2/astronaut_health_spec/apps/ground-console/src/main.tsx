// Ground Health Console — Main Entry Point
// React 18, React Router v7 / v6, Auth and Data Providers

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import Login from './pages/Login';
import MissionOverview from './pages/MissionOverview';
import CrewRoster from './pages/CrewRoster';
import AstronautProfile from './pages/AstronautProfile';
import HealthAssessments from './pages/HealthAssessments';
import AlertsActionCenter from './pages/AlertsActionCenter';
import CommunicationSync from './pages/CommunicationSync';
import Messages from './pages/Messages';
import EnvironmentalRadiation from './pages/EnvironmentalRadiation';
import './styles.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#FFFFFF',
          fontFamily: 'monospace',
          fontWeight: 700
        }}
      >
        INITIALIZING GROUND HEALTH CONSOLE...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MissionOverview />} />
        <Route path="crew" element={<CrewRoster />} />
        <Route path="crew/:astronautId" element={<AstronautProfile />} />
        <Route path="assessments" element={<HealthAssessments />} />
        <Route path="alerts" element={<AlertsActionCenter />} />
        <Route path="sync" element={<CommunicationSync />} />
        <Route path="messages" element={<Messages />} />
        <Route path="environment" element={<EnvironmentalRadiation />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
