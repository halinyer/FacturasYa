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
    allIps: [],
    connectedCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchServerInfo = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    let info = null;

    // 1. Try local HTTP endpoint with fresh dynamic IP detection
    try {
      const res = await fetch('http://localhost:3001/api/status');
      if (res.ok) {
        info = await res.json();
        info.isRunning = true;
      }
    } catch (e) {
      console.warn('HTTP /api/status fetch failed:', e);
    }

    // 2. Try Electron IPC if available
    if (!info && window.electronAPI && typeof window.electronAPI.getServerInfo === 'function') {
      try {
        info = await window.electronAPI.getServerInfo();
      } catch (err) {
        console.warn('IPC getServerInfo failed:', err);
      }
    }

    // Default info if both failed
    if (!info) {
      const fallbackIp = window.location.hostname && window.location.hostname !== 'localhost' ? window.location.hostname : '127.0.0.1';
      info = {
        isRunning: true,
        ip: fallbackIp,
        port: 3001,
        url: `http://${fallbackIp}:3001/waiter`,
        qrCode: '',
        allIps: [],
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
    fetchServerInfo(true);
    const interval = setInterval(() => fetchServerInfo(false), 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = () => {
    if (serverInfo.url) {
      navigator.clipboard.writeText(serverInfo.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleRefreshIp = async (manualIp = null) => {
    setRefreshing(true);
    try {
      // 1. Try HTTP refresh endpoint
      const res = await fetch('http://localhost:3001/api/server/refresh-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: manualIp || '' })
      });
      if (res.ok) {
        const info = await res.json();
        if (info) setServerInfo(prev => ({ ...prev, ...info }));
      } else if (window.electronAPI && typeof window.electronAPI.refreshServerIp === 'function') {
        const info = await window.electronAPI.refreshServerIp(manualIp);
        if (info) setServerInfo(prev => ({ ...prev, ...info }));
      }
    } catch (e) {
      console.warn('Error refrescando IP:', e);
      if (window.electronAPI && typeof window.electronAPI.refreshServerIp === 'function') {
        try {
          const info = await window.electronAPI.refreshServerIp(manualIp);
          if (info) setServerInfo(prev => ({ ...prev, ...info }));
        } catch (ipcErr) {}
      }
    }
    await fetchServerInfo(false);
    setRefreshing(false);
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
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: CLIENT_CONFIG.branding?.colors?.accentSoft || '#eff6ff', border: `1px solid ${CLIENT_CONFIG.branding?.colors?.borderSubtle || '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={22} color={CLIENT_CONFIG.branding?.colors?.primary || '#2563eb'} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: '#18181b' }}>Vincular Tablets</h2>
              <div style={{ fontSize: '0.78rem', color: CLIENT_CONFIG.branding?.colors?.dark || '#0f172a', fontWeight: '700' }}>{CLIENT_CONFIG.name} — Red Wi-Fi Local</div>
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
          borderRadius: '12px', padding: '10px 14px', marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '800', color: serverInfo.isRunning ? '#15803d' : '#991b1b' }}>
            <Wifi size={16} />
            <span>{serverInfo.isRunning ? 'Servidor Local: EN LÍNEA' : 'Servidor Desconectado'}</span>
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: '900', background: serverInfo.isRunning ? '#7CBE43' : '#ef4444', color: '#fff', padding: '3px 9px', borderRadius: '8px' }}>
            {serverInfo.connectedCount} {serverInfo.connectedCount === 1 ? 'tablet' : 'tablets'}
          </span>
        </div>

        {/* Current IP & Multi-Network Selector */}
        <div style={{
          background: '#f1f5f9', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px',
          display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '700' }}>
              IP de Red Activa: <strong style={{ color: '#0f172a', fontSize: '0.84rem' }}>{serverInfo.ip}</strong>
            </div>
            <button
              type="button"
              onClick={() => handleRefreshIp()}
              disabled={refreshing}
              style={{
                background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
                padding: '4px 9px', fontSize: '0.72rem', fontWeight: '800', color: '#2563eb',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
              }}
              title="Detectar IP actual de la red o zona Wi-Fi compartida"
            >
              <RefreshCw size={12} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
              <span>{refreshing ? 'Detectando...' : 'Detectar IP'}</span>
            </button>
          </div>

          {serverInfo.allIps && serverInfo.allIps.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>Redes disponibles:</span>
              {serverInfo.allIps.map(iface => {
                const isSelected = serverInfo.ip === iface.address;
                return (
                  <button
                    key={iface.address}
                    type="button"
                    onClick={() => handleRefreshIp(iface.address)}
                    style={{
                      background: isSelected ? '#2563eb' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      border: isSelected ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
                      borderRadius: '6px', padding: '2px 8px', fontSize: '0.7rem',
                      fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    {iface.name}: {iface.address}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* QR Code Canvas */}
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px',
          padding: '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', marginBottom: '16px'
        }}>
          {serverInfo.qrCode ? (
            <img
              src={serverInfo.qrCode}
              alt="Código QR de Conexión"
              style={{ width: '210px', height: '210px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
            />
          ) : (
            <div style={{ height: '210px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.9rem' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
              <div style={{ fontSize: '0.82rem' }}>Cargando código QR...</div>
            </div>
          )}

          <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#4b5563', textAlign: 'center', fontWeight: '600' }}>
            Apunta la cámara de la tablet o teléfono a este código QR para abrir el módulo de mesero.
          </div>
        </div>

        {/* Manual URL box */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', marginBottom: '6px' }}>
            O escribe esta dirección en el navegador del teléfono:
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', background: '#f8fafc',
            border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px'
          }}>
            <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: '800', color: CLIENT_CONFIG.branding?.colors?.dark || '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {serverInfo.url}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                background: copied ? (CLIENT_CONFIG.branding?.colors?.green || '#10b981') : '#ffffff', border: '1px solid #cbd5e1',
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

        {/* Hotspot Tip Note */}
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px',
          padding: '8px 12px', marginBottom: '16px', fontSize: '0.74rem', color: '#1e40af', lineHeight: 1.35
        }}>
          💡 <strong>Zona Wi-Fi / Hotspot del teléfono:</strong> Tu laptop debe estar conectada a la red Wi-Fi emitida por tu teléfono. La IP del QR arriba debe ser la de tu laptop en esa red (ej: <code>{serverInfo.ip}</code>).
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
            <RefreshCw size={14} /> Reiniciar Servidor
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: CLIENT_CONFIG.branding?.colors?.dark || '#0f172a', color: '#ffffff', border: 'none',
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
