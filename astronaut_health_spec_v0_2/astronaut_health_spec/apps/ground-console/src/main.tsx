// Ground Health Console — application entry point
// Routes mirror the operational navigation. Legacy `/sync` and `/environment`
// URLs redirect to their current locations so bookmarks keep working.

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
import Audit from './pages/Audit';
import DomainWorkspace from './pages/DomainWorkspace';
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

const AppRoutes: React.FC = () => (
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
      <Route path="domains/:domainKey" element={<DomainWorkspace />} />
      <Route path="alerts" element={<AlertsActionCenter />} />
      <Route path="communications" element={<CommunicationSync />} />
      <Route path="sync" element={<Navigate to="/communications" replace />} />
      <Route path="environment" element={<Navigate to="/domains/environmental" replace />} />
      <Route path="audit" element={<Audit />} />
      <Route path="assessments" element={<HealthAssessments />} />
      <Route path="messages" element={<Messages />} />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <DataProvider>
        <AppRoutes />
      </DataProvider>
    </AuthProvider>
  </BrowserRouter>
);

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
