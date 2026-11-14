// Ground Health Console — Auth Layout Shell

import React from 'react';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>{children}</div>
    </div>
  );
};
export default AuthLayout;
