import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Mail, Lock, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { CLIENT_CONFIG } from '../config/clientConfig';
import { getAssetUrl } from '../utils/assetHelper';

const Login = () => {
  const { loginTenant, registerTenant, tenant } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({
    businessName: '',
    rif: 'J-',
    phone: '',
    email: tenant?.owner_email || '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!form.businessName || !form.email || !form.password) {
          throw new Error('Por favor completa todos los campos requeridos.');
        }
        await registerTenant({
          businessName: form.businessName.trim(),
          rif: form.rif.trim().toUpperCase(),
          phone: form.phone.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password
        });
      } else {
        if (!form.email || !form.password) {
          throw new Error('Por favor ingresa tu correo y contraseña.');
        }
        await loginTenant(form.email.trim().toLowerCase(), form.password);
      }
      navigate('/pos');
    } catch (err) {
      setError(err?.message || 'Error al autenticar la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background"></div>

      <div className="login-card">
        {/* LOGO Y ENCABEZADO */}
        <div className="login-header">
          <div className="logo-badge">
            {CLIENT_CONFIG.branding.logoImage ? (
              <img
                src={getAssetUrl(CLIENT_CONFIG.branding.logoImage)}
                alt="Logo"
                style={{ width: '48px', height: '48px', objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontSize: '2rem' }}>{CLIENT_CONFIG.branding.logoIcon || '🍔'}</span>
            )}
          </div>
          <h1 className="logo-text">{CLIENT_CONFIG.branding.logoText || 'FacturasYa'}</h1>
          <p className="login-subtitle">
            {mode === 'login' ? 'Acceso al Punto de Venta & Facturación' : 'Registra tu negocio (14 días gratis)'}
          </p>
        </div>

        {/* PESTAÑAS LOGIN / REGISTRO */}
        <div className="auth-tabs">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
          >
            Crear Cuenta (14 días)
          </button>
        </div>

        {/* MENSAJE DE ERROR */}
        {error && (
          <div className="error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <>
              <div className="input-group">
                <label>Nombre del Restaurante / Negocio</label>
                <div className="input-wrapper">
                  <Building2 size={16} className="input-icon" />
                  <input
                    type="text"
                    required
                    placeholder="Mi Restaurante"
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>RIF SENIAT</label>
                  <input
                    type="text"
                    required
                    placeholder="J-50123456-0"
                    value={form.rif}
                    onChange={(e) => setForm({ ...form, rif: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Teléfono</label>
                  <input
                    type="text"
                    placeholder="0412-1234567"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          <div className="input-group">
            <label>Correo Electrónico</label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                required
                placeholder="admin@mirestaurante.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoFocus
              />
            </div>
          </div>

          <div className="input-group">
            <label>Contraseña</label>
            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Entrar a la Caja' : 'Crear y Comenzar'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: #09090b;
          position: relative;
          overflow: hidden;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
        }

        .login-background {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, #09090b 60%);
          opacity: 0.8;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 2.25rem 2rem;
          background: rgba(24, 24, 27, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1.25rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .login-header {
          text-align: center;
        }

        .logo-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
        }

        .logo-text {
          font-size: 1.75rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .login-subtitle {
          color: #a1a1aa;
          font-size: 0.82rem;
          margin-top: 0.35rem;
        }

        .auth-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.25rem;
          padding: 0.25rem;
          background: #18181b;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .auth-tab {
          padding: 0.5rem;
          background: transparent;
          border: none;
          border-radius: 0.5rem;
          color: #a1a1aa;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .auth-tab.active {
          background: #ffffff;
          color: #09090b;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 0.85rem;
          background: rgba(220, 38, 38, 0.15);
          border: 1px solid rgba(220, 38, 38, 0.3);
          border-radius: 0.6rem;
          color: #fca5a5;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .input-group label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #d4d4d8;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 0.75rem;
          color: #71717a;
        }

        .input-wrapper input {
          width: 100%;
          padding: 0.6rem 0.75rem 0.6rem 2.25rem;
          background: rgba(9, 9, 11, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 0.6rem;
          color: #ffffff;
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.15s;
        }

        .input-group input:not(.input-wrapper input) {
          width: 100%;
          padding: 0.6rem 0.75rem;
          background: rgba(9, 9, 11, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 0.6rem;
          color: #ffffff;
          font-size: 0.85rem;
          outline: none;
        }

        .input-wrapper input:focus,
        .input-group input:focus {
          border-color: #ffffff;
        }

        .input-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }

        .submit-btn {
          width: 100%;
          padding: 0.75rem;
          margin-top: 0.5rem;
          background: #ffffff;
          color: #09090b;
          border: none;
          border-radius: 0.65rem;
          font-size: 0.85rem;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.15s ease;
        }

        .submit-btn:hover {
          background: #e4e4e7;
          transform: translateY(-1px);
        }

        .submit-btn:active {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default Login;
