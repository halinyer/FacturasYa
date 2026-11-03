import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, User, Lock, ArrowRight, Building2, Mail, KeyRound, Sparkles, RefreshCw } from 'lucide-react';
import { CLIENT_CONFIG } from '../config/clientConfig';
import { getAssetUrl } from '../utils/assetHelper';

const Login = () => {
  const [role, setRole] = useState('cajero');
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];
  const { login, tenant, subStatus, loginTenant, registerTenant } = useAuth();
  const navigate = useNavigate();

  // Estado para vinculación de cuenta SaaS (Correo / Contraseña del Restaurante)
  const [showTenantModal, setShowTenantModal] = useState(!tenant);
  const [tenantMode, setTenantMode] = useState('login'); // 'login' | 'register'
  const [tenantForm, setTenantForm] = useState({
    businessName: '',
    rif: 'J-',
    phone: '',
    email: tenant?.owner_email || 'admin@happydays.com',
    password: ''
  });
  const [tenantError, setTenantError] = useState('');
  const [tenantLoading, setTenantLoading] = useState(false);

  useEffect(() => {
    if (!showTenantModal) {
      inputRefs[0].current?.focus();
    }
  }, [role, showTenantModal]);

  const handlePinChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value.substring(value.length - 1);
    setPin(newPin);
    setError(false);

    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pinStr = pin.join('');
    if (pinStr.length !== 4) {
      setError(true);
      return;
    }

    try {
      const success = await login(role, pinStr);
      if (success) {
        navigate(role === 'admin' ? '/dashboard' : '/pos');
      } else {
        handleError();
      }
    } catch (err) {
      handleError();
    }
  };

  const handleError = () => {
    setError(true);
    setPin(['', '', '', '']);
    inputRefs[0].current?.focus();
  };

  const handleTenantSubmit = async (e) => {
    e.preventDefault();
    setTenantError('');
    setTenantLoading(true);
    try {
      if (tenantMode === 'register') {
        await registerTenant(tenantForm);
      } else {
        await loginTenant(tenantForm.email, tenantForm.password || '123456');
      }
      setShowTenantModal(false);
    } catch (err) {
      setTenantError(err?.message || 'Error al autenticar la cuenta del restaurante');
    } finally {
      setTenantLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background"></div>
      
      <div className={`login-card ${error ? 'shake-animation' : ''}`}>
        {/* Insignia Superior de Cuenta SaaS Vinculada */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          fontSize: '0.78rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: '#0f172a' }}>
            <Building2 size={15} color="#2563eb" />
            <span>{tenant?.name || CLIENT_CONFIG.branding.logoText}</span>
            <span style={{
              padding: '2px 7px',
              borderRadius: '999px',
              fontSize: '0.68rem',
              fontWeight: '800',
              background: subStatus?.isExpired ? '#fef2f2' : '#f0fdf4',
              color: subStatus?.isExpired ? '#dc2626' : '#15803d',
              border: `1px solid ${subStatus?.isExpired ? '#fecaca' : '#bbf7d0'}`
            }}>
              {subStatus?.isExpired ? 'Vencida' : `${subStatus?.daysRemaining ?? 14}d activos`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowTenantModal(!showTenantModal)}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              fontWeight: '700',
              fontSize: '0.75rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {showTenantModal ? 'Volver al PIN' : 'Cambiar Cuenta'}
          </button>
        </div>

        <div className="login-header">
          {CLIENT_CONFIG.branding.logoImage && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <img 
                src={getAssetUrl(CLIENT_CONFIG.branding.logoImage)} 
                alt={CLIENT_CONFIG.branding.logoText} 
                style={{ width: '80px', height: '80px', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(213, 40, 41, 0.25))' }}
              />
            </div>
          )}
          <div className="logo-container">
            <h1 className="logo-text glow-animation">{tenant?.name || CLIENT_CONFIG.branding.logoText}</h1>
          </div>
          <p className="login-subtitle">{CLIENT_CONFIG.subtitle}</p>
        </div>

        {showTenantModal ? (
          /* FORMULARIO DE CUENTA DEL RESTAURANTE (SUPABASE SAAS) */
          <form onSubmit={handleTenantSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} noValidate>
            <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                onClick={() => { setTenantMode('login'); setTenantError(''); }}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer',
                  background: tenantMode === 'login' ? '#ffffff' : 'transparent',
                  color: tenantMode === 'login' ? '#0f172a' : '#64748b',
                  boxShadow: tenantMode === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Iniciar Sesión Local
              </button>
              <button
                type="button"
                onClick={() => { setTenantMode('register'); setTenantError(''); }}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer',
                  background: tenantMode === 'register' ? '#ffffff' : 'transparent',
                  color: tenantMode === 'register' ? '#16a34a' : '#64748b',
                  boxShadow: tenantMode === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Crear Cuenta (14d Gratis)
              </button>
            </div>

            {tenantMode === 'register' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Nombre del Restaurante:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Burger King / Pizzería Napoli"
                    value={tenantForm.businessName}
                    onChange={(e) => setTenantForm({ ...tenantForm, businessName: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      RIF:
                    </label>
                    <input
                      type="text"
                      placeholder="J-12345678-9"
                      value={tenantForm.rif}
                      onChange={(e) => setTenantForm({ ...tenantForm, rif: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      Teléfono:
                    </label>
                    <input
                      type="text"
                      placeholder="0412-0000000"
                      value={tenantForm.phone}
                      onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Correo del Restaurante:
              </label>
              <input
                type="email"
                placeholder="admin@turestaurante.com"
                value={tenantForm.email}
                onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Contraseña:
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={tenantForm.password}
                onChange={(e) => setTenantForm({ ...tenantForm, password: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            {tenantError && (
              <p className="error-message">{tenantError}</p>
            )}

            <button type="submit" className="submit-btn" disabled={tenantLoading}>
              <span>{tenantLoading ? 'Conectando...' : (tenantMode === 'register' ? 'Activar 14 Días Gratis' : 'Vincular Restaurante')}</span>
              <ArrowRight size={20} />
            </button>
          </form>
        ) : (
          /* ACCESO DIARIO RÁPIDO POR PIN (CAJERO / ADMIN) */
          <>
            <div className="role-selector">
              <button 
                type="button"
                className={`role-btn ${role === 'admin' ? 'active' : ''}`}
                onClick={() => { setRole('admin'); setPin(['','','','']); setError(false); }}
              >
                <Shield size={20} />
                <span>Administrador</span>
              </button>
              <button 
                type="button"
                className={`role-btn ${role === 'cajero' ? 'active' : ''}`}
                onClick={() => { setRole('cajero'); setPin(['','','','']); setError(false); }}
              >
                <User size={20} />
                <span>Cajero</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="pin-form">
              <div className="pin-label">
                <Lock size={16} />
                <span>Ingrese PIN de acceso</span>
              </div>
              
              <div className="pin-inputs">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={inputRefs[index]}
                    type="password"
                    className={`pin-digit ${error ? 'error' : ''}`}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    maxLength={1}
                    autoComplete="off"
                  />
                ))}
              </div>

              {error && <p className="error-message">PIN incorrecto. Intente de nuevo.</p>}

              <button type="submit" className="submit-btn" disabled={pin.join('').length !== 4}>
                <span>Ingresar</span>
                <ArrowRight size={20} />
              </button>
            </form>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --bg-dark: #f4f5f7;
          --card-bg: #ffffff;
          --accent: #f59e0b;
          --accent-hover: #d97706;
          --text-main: #0f172a;
          --text-muted: #64748b;
          --error: #ef4444;
          --glass-border: rgba(0,0,0,0.1);
        }

        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--bg-dark);
          position: relative;
          overflow: hidden;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .login-background {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% -20%, #3b82f6 0%, transparent 40%),
                      radial-gradient(circle at 100% 100%, #1e1b4b 0%, transparent 40%);
          opacity: 0.6;
          animation: pulse 10s ease-in-out infinite alternate;
        }

        @keyframes pulse {
          0% { opacity: 0.4; }
          100% { opacity: 0.7; }
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 2rem 2.25rem;
          background: var(--card-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
          border-radius: 1.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .login-header {
          text-align: center;
        }

        .logo-text {
          font-size: 2.25rem;
          font-weight: 800;
          color: #111827;
          margin: 0;
          letter-spacing: -0.025em;
        }

        .glow-animation {
          text-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          animation: glow 3s infinite alternate;
        }

        @keyframes glow {
          0% { text-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
          100% { text-shadow: 0 0 30px rgba(59, 130, 246, 0.8), 0 0 10px rgba(255, 255, 255, 0.2); }
        }

        .login-subtitle {
          color: var(--text-muted);
          font-size: 1rem;
          margin-top: 0.35rem;
        }

        .role-selector {
          display: flex;
          gap: 1rem;
          padding: 0.25rem;
          background: #f9fafb;
          border-radius: 1rem;
          border: 1px solid var(--glass-border);
        }

        .role-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: transparent;
          border: none;
          border-radius: 0.75rem;
          color: var(--text-muted);
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .role-btn:hover {
          color: var(--text-main);
        }

        .role-btn.active {
          background: var(--accent);
          color: #111827;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .pin-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .pin-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: var(--text-main);
          font-weight: 500;
        }

        .pin-inputs {
          display: flex;
          justify-content: center;
          gap: 1rem;
        }

        .pin-digit {
          width: 3.5rem;
          height: 4rem;
          border-radius: 0.75rem;
          background: rgba(0, 0, 0, 0.3);
          border: 2px solid var(--glass-border);
          color: #111827;
          font-size: 2rem;
          text-align: center;
          transition: all 0.2s ease;
        }

        .pin-digit:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .pin-digit.error {
          border-color: var(--error);
          background: rgba(239, 68, 68, 0.1);
        }

        .error-message {
          color: var(--error);
          text-align: center;
          font-size: 0.9rem;
          margin: 0;
        }

        .submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
          color: #111827;
          border: none;
          border-radius: 0.75rem;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .submit-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .shake-animation {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }

        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}} />
    </div>
  );
};

export default Login;
