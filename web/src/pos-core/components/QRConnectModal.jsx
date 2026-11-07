import React, { useState, useEffect } from 'react';
import { Wifi, Smartphone, RefreshCw, X, Check, Copy } from 'lucide-react';
import QRCode from 'qrcode';

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

    try {
      const res = await fetch('http://localhost:3001/api/status');
      if (res.ok) {
        info = await res.json();
        info.isRunning = true;
      }
    } catch (e) {}

    if (!info && window.electronAPI && typeof window.electronAPI.getServerInfo === 'function') {
      try {
        info = await window.electronAPI.getServerInfo();
      } catch (err) {}
    }

    if (!info) {
      const fallbackIp =
        window.location.hostname && window.location.hostname !== 'localhost'
          ? window.location.hostname
          : '127.0.0.1';
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

    if (!info.qrCode && info.url) {
      try {
        info.qrCode = await QRCode.toDataURL(info.url, {
          width: 320,
          margin: 2,
          color: { dark: '#09090b', light: '#ffffff' }
        });
      } catch (qrErr) {}
    }

    const count =
      typeof info.connectedCount === 'number'
        ? info.connectedCount
        : typeof info.connectedDevices === 'number'
        ? info.connectedDevices
        : 0;
    info.connectedCount = count;

    setServerInfo((prev) => ({ ...prev, ...info }));
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

  const handleRestart = async () => {
    if (window.electronAPI && typeof window.electronAPI.restartServer === 'function') {
      setLoading(true);
      try {
        const info = await window.electronAPI.restartServer();
        if (info) setServerInfo(info);
      } catch (e) {}
      setLoading(false);
    } else {
      setRefreshing(true);
      await fetchServerInfo(false);
      setRefreshing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-zinc-200 shadow-2xl space-y-5">
        {/* Header Notion */}
        <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center border border-zinc-200">
              <Smartphone size={20} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-zinc-950 tracking-tight">
                Vincular Tablets / Meseros
              </h2>
              <p className="text-[11px] text-zinc-500">
                Conexión directa por Red Wi-Fi Local (Puerto {serverInfo.port || 3001})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Estado del Servidor Local */}
        <div
          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold ${
            serverInfo.isRunning
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Wifi size={15} className={serverInfo.isRunning ? 'text-emerald-600' : 'text-rose-600'} />
            <span>{serverInfo.isRunning ? 'Servidor Local: EN LÍNEA' : 'Servidor Desconectado'}</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
              serverInfo.isRunning ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            {serverInfo.connectedCount} {serverInfo.connectedCount === 1 ? 'dispositivo' : 'dispositivos'}
          </span>
        </div>

        {/* Código QR */}
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
          {serverInfo.qrCode ? (
            <img
              src={serverInfo.qrCode}
              alt="Código QR de Conexión"
              className="w-52 h-52 rounded-xl border border-zinc-200 bg-white p-2 shadow-2xs"
            />
          ) : (
            <div className="h-52 flex flex-col items-center justify-center text-zinc-400 text-xs">
              <RefreshCw size={22} className="animate-spin mb-2" />
              <span>Generando código QR...</span>
            </div>
          )}

          <p className="mt-3 text-xs text-zinc-600 font-medium max-w-xs">
            Escanea este código QR con la cámara de la tablet o teléfono del mesero e ingresa su{' '}
            <strong className="text-zinc-900">PIN de 4 dígitos</strong>.
          </p>
        </div>

        {/* URL Manual */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
            O abre este enlace en el navegador de la tablet:
          </label>
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2">
            <span className="flex-1 font-mono text-xs font-bold text-zinc-900 truncate">
              {serverInfo.url}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors border ${
                copied
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200'
              }`}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Botones inferiores */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={handleRestart}
            className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw size={13} className={loading || refreshing ? 'animate-spin' : ''} />
            <span>Actualizar Red / IP</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRConnectModal;
