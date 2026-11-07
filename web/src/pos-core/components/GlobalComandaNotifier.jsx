import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Printer, X, Utensils } from 'lucide-react';
import KitchenTicketModal from './KitchenTicketModal';

export const GlobalComandaNotifier = () => {
  const [incomingComanda, setIncomingComanda] = useState(null);
  const [printData, setPrintData] = useState(null);
  const [autoPrintEnabled] = useState(() => {
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
      playTone(523.25, now, 0.25);
      playTone(659.25, now + 0.15, 0.25);
      playTone(783.99, now + 0.3, 0.45);
    } catch (e) {}
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
    } catch (e) {}

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
      {incomingComanda && (
        <div className="fixed top-5 right-5 z-50 bg-zinc-950 text-white rounded-2xl border border-zinc-800 p-4 shadow-2xl min-w-[300px] max-w-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                Nueva Comanda de Salón
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIncomingComanda(null)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800/80">
            <div className="text-base font-extrabold text-white flex items-center gap-2">
              <Utensils size={15} className="text-zinc-400" />
              <span>{incomingComanda.tableName}</span>
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Mesero: <strong className="text-zinc-100">{incomingComanda.waiterName}</strong> ·{' '}
              <span className="font-mono text-zinc-300">
                {incomingComanda.round.items?.length || 0} plato(s)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrintClick}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <Printer size={15} />
            <span>IMPRIMIR COMANDA CHEF (58mm)</span>
          </button>
        </div>
      )}

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
