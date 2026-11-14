// Ground Health Console — App Layout Shell
// Fixed Header, Sidebar, and Responsive Main Content Canvas

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        color: '#000000',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Header onToggleSidebar={() => setCollapsed(!collapsed)} />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

        <main
          style={{
            flex: 1,
            padding: '24px 32px',
            backgroundColor: '#FFFFFF',
            overflowY: 'auto',
            minWidth: 0
          }}
        >
          <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
export default AppLayout;
