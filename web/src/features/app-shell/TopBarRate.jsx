import React, { useState } from 'react';
import { DollarSign, RefreshCw, Edit3, Check, X } from 'lucide-react';
import { useData } from '@pos/contexts/DataContext';

export default function TopBarRate() {
  const { exchangeRate, updateExchangeRate, fetchBcvRate } = useData() || {};
  const [isEditing, setIsEditing] = useState(false);
  const [manualRate, setManualRate] = useState('');
  const [syncing, setSyncing] = useState(false);

  const handleSyncBcv = async () => {
    if (!fetchBcvRate) return;
    try {
      setSyncing(true);
      await fetchBcvRate();
    } catch (e) {
      console.warn('Error al sincronizar tasa BCV:', e);
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveManual = (e) => {
    e.preventDefault();
    const val = parseFloat(manualRate);
    if (!isNaN(val) && val > 100 && updateExchangeRate) {
      updateExchangeRate(val);
      setIsEditing(false);
      setManualRate('');
    }
  };

  const rate = exchangeRate || 876.80;

  return (
    <div className="flex items-center gap-2">
      {isEditing ? (
        <form onSubmit={handleSaveManual} className="flex items-center gap-1 bg-zinc-800 p-1 rounded-lg border border-zinc-700">
          <span className="text-[10px] text-zinc-400 font-bold pl-1">Bs.</span>
          <input
            type="number"
            step="0.01"
            min="100"
            autoFocus
            value={manualRate}
            onChange={(e) => setManualRate(e.target.value)}
            placeholder={rate.toFixed(2)}
            className="w-20 px-1.5 py-0.5 text-xs bg-zinc-900 text-white rounded border border-zinc-600 focus:outline-none font-mono font-bold"
          />
          <button
            type="submit"
            className="p-1 rounded text-emerald-400 hover:bg-zinc-700"
            title="Guardar Tasa"
          >
            <Check size={13} />
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="p-1 rounded text-zinc-400 hover:bg-zinc-700"
            title="Cancelar"
          >
            <X size={13} />
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors px-2.5 py-1 rounded-xl shadow-2xs">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tasa BCV:</span>
          <span className="text-xs font-mono font-extrabold text-white">
            Bs. {Number(rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>

          <div className="flex items-center gap-0.5 ml-1 border-l border-zinc-800 pl-1">
            <button
              type="button"
              onClick={handleSyncBcv}
              disabled={syncing}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Sincronizar con el Banco Central de Venezuela"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin text-emerald-400' : ''} />
            </button>
            <button
              type="button"
              onClick={() => {
                setManualRate(rate.toString());
                setIsEditing(true);
              }}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Ajustar tasa manualmente"
            >
              <Edit3 size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
