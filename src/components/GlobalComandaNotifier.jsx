import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Printer, X, Utensils, CheckCircle } from 'lucide-react';
import KitchenTicketModal from './KitchenTicketModal';

export const GlobalComandaNotifier = () => {
  const [incomingComanda, setIncomingComanda] = useState(null);
  const [printData, setPrintData] = useState(null);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(() => {
    return localStorage.getItem('pos_auto_print_comandas') === 'true';
  });

  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playTone = (freq, time, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.start(time);
        osc.stop(time + duration);
      };

      const now = ctx.currentTime;
      playTone(523.25, now, 0.25);       // C5
      playTone(659.25, now + 0.15, 0.25); // E5
      playTone(783.99, now + 0.30, 0.45); // G5
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  };

  useEffect(() => {
    let socket;
    try {
      socket = io('http://localhost:3001', { reconnectionDelay: 1000 });
      socket.on('comanda:nueva', (data) => {
        if (!data || !data.round) return;
        playChime();
        
        const payload = {
          round: data.round,
          tableName: data.table?.name || data.order?.tableName || 'Mesa',
          waiterName: data.round.waiterName || data.order?.waiterName || 'Mesero',
          orderId: data.order?.id || ''
        };

        setIncomingComanda(payload);

        if (autoPrintEnabled) {
          setPrintData({ ...payload, autoPrint: true });
        }
      });
    } catch (e) {
      console.warn('Socket error in GlobalComandaNotifier:', e);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [autoPrintEnabled]);

  const handlePrintClick = () => {
    if (!incomingComanda) return;
    setPrintData({ ...incomingComanda, autoPrint: true });
    setIncomingComanda(null);
  };

  return (
    <>
      {/* Toast Alert Banner for Cashier */}
      {incomingComanda && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9990,
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: '16px',
          border: '2px solid #f59e0b',
          padding: '16px 20px',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          minWidth: '320px',
          maxWidth: '420px',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></div>
              <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ¡Nueva Comanda de Salón!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIncomingComanda(null)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#94a3b8',
                borderRadius: '6px',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={15} />
            </button>
          </div>

          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#f8fafc' }}>
              {incomingComanda.tableName.toUpperCase()}
            </div>
            <div style={{ fontSize: '0.86rem', color: '#94a3b8', marginTop: '2px' }}>
              Mesero(a): <strong style={{ color: '#ffffff' }}>{incomingComanda.waiterName}</strong>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '4px' }}>
              {incomingComanda.round.items?.length || 0} plato(s) para cocina
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={handlePrintClick}
              style={{
                flex: 1,
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                padding: '11px 16px',
                borderRadius: '10px',
                fontWeight: '900',
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
              }}
            >
              <Printer size={16} /> IMPRIMIR COMANDA CHEF
            </button>
          </div>
        </div>
      )}

      {/* Printable Modal */}
      {printData && (
        <KitchenTicketModal
          round={printData.round}
          tableName={printData.tableName}
          waiterName={printData.waiterName}
          orderId={printData.orderId}
          autoPrint={printData.autoPrint}
          onClose={() => setPrintData(null)}
        />
      )}
    </>
  );
};

export default GlobalComandaNotifier;
