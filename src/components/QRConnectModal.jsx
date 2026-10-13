import React, { useState, useEffect } from 'react';
import { QrCode, Wifi, Smartphone, RefreshCw, X, Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { CLIENT_CONFIG } from '../config/clientConfig';

const QRConnectModal = ({ onClose }) => {
  const [serverInfo, setServerInfo] = useState({
    isRunning: false,
    ip: '127.0.0.1',
    port: 3001,
    url: 'http://127.0.0.1:3001/waiter',
    qrCode: '',
    connectedCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchServerInfo = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    let info = null;

    // 1. Try Electron IPC
    if (window.electronAPI && typeof window.electronAPI.getServerInfo === 'function') {
      try {
        info = await window.electronAPI.getServerInfo();
      } catch (err) {
        console.warn('IPC getServerInfo failed:', err);
      }
    }

    // 2. Fallback: try local HTTP endpoint (e.g. if testing in browser)
    if (!info || !info.qrCode) {
      try {
        const res = await fetch('http://localhost:3001/api/status');
        if (res.ok) {
          info = await res.json();
          info.isRunning = true;
        }
      } catch (e) {
        console.warn('HTTP /api/status fetch failed:', e);
      }
    }

    // Default info if both failed
    if (!info) {
      info = {
        isRunning: true,
        ip: '192.168.1.127',
        port: 3001,
        url: 'http://192.168.1.127:3001/waiter',
        qrCode: '',
        connectedCount: 0
      };
    }

    // 3. Guaranteed client-side QR generation if qrCode is empty
    if (!info.qrCode && info.url) {
      try {
        info.qrCode = await QRCode.toDataURL(info.url, {
          width: 320,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' }
        });
      } catch (qrErr) {
        console.error('Error generating QR on client:', qrErr);
      }
    }

    const count = typeof info.connectedCount === 'number' 
      ? info.connectedCount 
      : (typeof info.connectedDevices === 'number' ? info.connectedDevices : 0);
    info.connectedCount = count;

    setServerInfo(prev => ({ ...prev, ...info }));
    setLoading(false);
  };

  useEffect(() => {
    // Generate immediate fallback QR so it displays on millisecond 1
    QRCode.toDataURL('http://192.168.1.127:3001/waiter', { width: 320, margin: 2 })
      .then(qr => {
        setServerInfo(prev => ({ ...prev, qrCode: qr }));
        setLoading(false);
      })
      .catch(() => {});

    fetchServerInfo(true);
    const interval = setInterval(() => fetchServerInfo(false), 2000); // Poll status every 2s
    return () => clearInterval(interval);
  }, []);

  const handleCopy = () => {
    if (serverInfo.url) {
      navigator.clipboard.writeText(serverInfo.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleRestart = async () => {
    if (window.electronAPI && typeof window.electronAPI.restartServer === 'function') {
      setLoading(true);
      try {
        const info = await window.electronAPI.restartServer();
        if (info) setServerInfo(info);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2100, backdropFilter: 'blur(3px)', padding: '16px'
    }}>
      <div style={{
        background: '#ffffff', borderRadius: '20px', padding: '28px',
        maxWidth: '460px', width: '100%', border: '1px solid #eaedf2',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', color: '#111827',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fdf2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={22} color="#D52829" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: '#18181b' }}>Vincular Tablets</h2>
              <div style={{ fontSize: '0.78rem', color: '#601718', fontWeight: '700' }}>{CLIENT_CONFIG.name} — Red Wi-Fi Local</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Status pill */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: serverInfo.isRunning ? '#f0fdf4' : '#fef2f2',
          border: `1.5px solid ${serverInfo.isRunning ? '#7CBE43' : '#fecaca'}`,
          borderRadius: '12px', padding: '10px 14px', marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '800', color: serverInfo.isRunning ? '#15803d' : '#991b1b' }}>
            <Wifi size={16} />
            <span>{serverInfo.isRunning ? 'Servidor Local: EN LÍNEA' : 'Servidor Desconectado'}</span>
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: '900', background: serverInfo.isRunning ? '#7CBE43' : '#ef4444', color: '#fff', padding: '3px 9px', borderRadius: '8px' }}>
            {serverInfo.connectedCount} {serverInfo.connectedCount === 1 ? 'tablet' : 'tablets'}
          </span>
        </div>

        {/* QR Code Canvas */}
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px',
          padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', marginBottom: '20px'
        }}>
          {serverInfo.qrCode ? (
            <img
              src={serverInfo.qrCode}
              alt="Código QR de Conexión"
              style={{ width: '220px', height: '220px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
            />
          ) : (
            <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.9rem' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
              <div style={{ fontSize: '0.82rem' }}>Cargando código QR...</div>
            </div>
          )}

          <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#4b5563', textAlign: 'center', fontWeight: '600' }}>
            Apunta la cámara de la tablet o teléfono a este código QR para abrir el módulo de mesero.
          </div>
        </div>

        {/* Manual URL box */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', marginBottom: '6px' }}>
            O escribe esta dirección en la tablet:
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', background: '#f8fafc',
            border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px'
          }}>
            <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: '800', color: '#601718', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {serverInfo.url}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                background: copied ? '#7CBE43' : '#ffffff', border: '1px solid #cbd5e1',
                color: copied ? '#ffffff' : '#475569', borderRadius: '6px', padding: '5px 9px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem',
                fontWeight: '700', transition: 'all 0.15s'
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Actions / Refresh */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleRestart}
            style={{
              background: '#f8fafc', border: '1.5px solid #cbd5e1', color: '#334155',
              padding: '9px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.82rem',
              fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <RefreshCw size={14} /> Reiniciar Servidor Local
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#601718', color: '#ffffff', border: 'none',
              padding: '10px 22px', borderRadius: '10px', cursor: 'pointer',
              fontSize: '0.9rem', fontWeight: '800', letterSpacing: '0.3px'
            }}
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};

export default QRConnectModal;
