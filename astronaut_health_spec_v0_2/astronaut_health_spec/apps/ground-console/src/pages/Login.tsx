// Ground Health Console — Authentication Page
// Clean medical access gateway with preset role selector

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PrimaryButton } from '../components/common/Buttons';

const DEMO_CREDENTIALS = {
  medical: { username: 'medical', password: 'ground-demo' },
  admin: { username: 'admin', password: 'admin-demo' },
  crew: { username: 'astronaut', password: 'crew-demo' }
} as const;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, error, clearError, isLoading } = useAuth();

  const [username, setUsername] = useState<string>('medical');
  const [password, setPassword] = useState<string>('ground-demo');
  const [activePreset, setActivePreset] = useState<string>('medical');

  const handlePreset = (user: string, pass: string, presetName: string) => {
    setUsername(user);
    setPassword(pass);
    setActivePreset(presetName);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const credentials = DEMO_CREDENTIALS[activePreset as keyof typeof DEMO_CREDENTIALS] ?? DEMO_CREDENTIALS.medical;
    const success = await login(credentials.username, credentials.password);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div
      style={{
        border: '2px solid #000000',
        boxShadow: '6px 6px 0px #000000',
        backgroundColor: '#FFFFFF',
        padding: '32px'
      }}
    >
      {/* Brand Header */}
      <div style={{ borderBottom: '2px solid #000000', paddingBottom: '16px', marginBottom: '24px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            backgroundColor: '#FFFF08',
            display: 'inline-block',
            padding: '2px 6px',
            marginBottom: '6px'
          }}
        >
          MISSION OPERATIONS CONSOLE
        </div>
        <h1
          style={{
            fontSize: '22px',
            fontWeight: 900,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            margin: 0
          }}
        >
          Ground Health Console
        </h1>
        <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.65)', margin: '4px 0 0 0' }}>
          Authorized medical personnel & flight surgeon telemetry portal
        </p>
      </div>

      {/* Role Preset Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'block',
            marginBottom: '8px'
          }}
        >
          Seeded Demo Identities
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            onClick={() => handlePreset('medical', 'ground-demo', 'medical')}
            style={{
              padding: '8px 10px',
              border: '1px solid #000000',
              backgroundColor: activePreset === 'medical' ? '#FFFF08' : '#FFFFFF',
              fontWeight: activePreset === 'medical' ? 700 : 500,
              fontSize: '11px',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontWeight: 800 }}>Medical Officer</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>medical / ground-demo</div>
          </button>
          <button
            type="button"
            onClick={() => handlePreset('admin', 'admin-demo', 'admin')}
            style={{
              padding: '8px 10px',
              border: '1px solid #000000',
              backgroundColor: activePreset === 'admin' ? '#FFFF08' : '#FFFFFF',
              fontWeight: activePreset === 'admin' ? 700 : 500,
              fontSize: '11px',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontWeight: 800 }}>Administrator</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>admin / admin-demo</div>
          </button>
          <button
            type="button"
            onClick={() => handlePreset('astronaut', 'crew-demo', 'crew')}
            style={{
              padding: '8px 10px',
              border: '1px solid #000000',
              backgroundColor: activePreset === 'crew' ? '#FFFF08' : '#FFFFFF',
              fontWeight: activePreset === 'crew' ? 700 : 500,
              fontSize: '11px',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontWeight: 800 }}>Crew Member</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>astronaut / crew-demo</div>
          </button>
        </div>
        <p style={{ fontSize: '10px', color: 'rgba(0,0,0,0.6)', margin: '8px 0 0 0' }}>
          Credentials are exchanged with the Ground API at <code>/auth/demo-token</code>. The console
          holds no offline identity fallback.
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '14px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '4px'
            }}
          >
            Account Identity
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #000000',
              fontSize: '13px',
              fontFamily: 'monospace'
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '4px'
            }}
          >
            Access Credential / Passkey
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #000000',
              fontSize: '13px',
              fontFamily: 'monospace'
            }}
            required
          />
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#000000',
              color: '#FFFF08',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '16px',
              border: '1px solid #000000'
            }}
          >
            ✕ {error}
          </div>
        )}

        <PrimaryButton type="submit" fullWidth disabled={isLoading}>
          {isLoading ? 'Opening Console...' : 'Enter Console'}
        </PrimaryButton>
      </form>

      {/* Security & Provenance Notice */}
      <div
        style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(0,0,0,0.1)',
          fontSize: '10px',
          color: 'rgba(0,0,0,0.6)',
          lineHeight: '1.4'
        }}
      >
        <span style={{ fontWeight: 700, color: '#000000' }}>SECURITY NOTICE:</span> Access is restricted to identities authorized by the Ground API. Health-data reads and lifecycle changes are recorded in the append-only audit log with the acting identity and request identifier.
      </div>
    </div>
  );
};
export default Login;
