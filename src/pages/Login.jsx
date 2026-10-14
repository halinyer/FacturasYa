import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, User, Lock, ArrowRight } from 'lucide-react';
import { CLIENT_CONFIG } from '../config/clientConfig';
import { getAssetUrl } from '../utils/assetHelper';

const Login = () => {
  const [role, setRole] = useState('cajero');
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    inputRefs[0].current?.focus();
  }, [role]);

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

  return (
    <div className="login-container">
      <div className="login-background"></div>
      
      <div className={`login-card ${error ? 'shake-animation' : ''}`}>
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
            <h1 className="logo-text glow-animation">{CLIENT_CONFIG.branding.logoText}</h1>
          </div>
          <p className="login-subtitle">{CLIENT_CONFIG.subtitle}</p>
        </div>

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
          padding: 2.5rem;
          background: var(--card-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
          border-radius: 1.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .login-header {
          text-align: center;
        }

        .logo-text {
          font-size: 2.5rem;
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
          font-size: 1.1rem;
          margin-top: 0.5rem;
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
          font-size: 1.1rem;
          font-weight: 600;
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
