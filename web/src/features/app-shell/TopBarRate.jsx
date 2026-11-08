import React, { useState, useEffect } from 'react';
import { RefreshCw, Edit3, Check, X } from 'lucide-react';
import { useData } from '@pos/contexts/DataContext';
import { supabase, isConfigured } from '../../lib/supabase';
import { getCurrentTenant } from '@pos/lib/syncEngine';

export default function TopBarRate() {
  const { exchangeRate, setManualRate, loadExchangeRate, updateExchangeRate, fetchBcvRate } = useData() || {};
  const [isEditing, setIsEditing] = useState(false);
  const [manualRateInput, setManualRateInput] = useState('');
  const [syncing, setSyncing] = useState(false);

  const pushRateToCloud = async (newRate) => {
    if (!isConfigured || !supabase || !newRate || Number(newRate) <= 10) return;
    try {
      const tenant = getCurrentTenant();
      if (tenant?.id) {
        await supabase
          .from('tenants')
          .update({ exchange_rate: Number(newRate) })
          .eq('id', tenant.id);
        await supabase
          .from('tenant_snapshots')
          .update({ exchange_rate: Number(newRate), updated_at: new Date().toISOString() })
          .eq('tenant_id', tenant.id);
      }
    } catch (e) {}
  };

  // Al montar el TopBar, sincronizar con la tasa oficial BCV en vivo automáticamente
  useEffect(() => {
    const syncInitial = async () => {
      const fn = loadExchangeRate || fetchBcvRate;
      if (!fn) return;
      try {
        const freshRate = await fn(true);
        if (freshRate && Number(freshRate) > 10) {
          pushRateToCloud(freshRate);
        }
      } catch (e) {}
    };
    syncInitial();
  }, []);

  const handleSyncBcv = async () => {
    const fn = loadExchangeRate || fetchBcvRate;
    if (!fn) return;
    try {
      setSyncing(true);
      const freshRate = await fn(true);
      if (freshRate && Number(freshRate) > 10) {
        await pushRateToCloud(freshRate);
      }
    } catch (e) {
      console.warn('Error al sincronizar tasa BCV:', e);
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveManual = async (e) => {
    e.preventDefault();
    const val = parseFloat(manualRateInput);
    const saveFn = setManualRate || updateExchangeRate;
    if (!isNaN(val) && val > 10 && saveFn) {
      saveFn(val);
      setIsEditing(false);
      setManualRateInput('');
      await pushRateToCloud(val);
    }
  };

  const rate = Number(exchangeRate) || 896.12;

  return (
    <div className="flex items-center gap-2 app-no-drag">
      {isEditing ? (
        <form onSubmit={handleSaveManual} className="flex items-center gap-1 bg-zinc-800 p-1 rounded-lg border border-zinc-700">
          <span className="text-[10px] text-zinc-400 font-bold pl-1">Bs.</span>
          <input
            type="number"
            step="0.01"
            min="10"
            autoFocus
            value={manualRateInput}
            onChange={(e) => setManualRateInput(e.target.value)}
            placeholder={rate.toFixed(2)}
            className="w-20 px-1.5 py-0.5 text-xs bg-zinc-900 text-white rounded border border-zinc-600 focus:outline-none font-mono font-bold"
          />
          <button
            type="submit"
            className="p-1 rounded text-emerald-400 hover:bg-zinc-700 cursor-pointer"
            title="Guardar Tasa"
          >
            <Check size={13} />
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="p-1 rounded text-zinc-400 hover:bg-zinc-700 cursor-pointer"
            title="Cancelar"
          >
            <X size={13} />
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors px-2.5 py-1 rounded-xl shadow-2xs">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">BCV:</span>
          <span className="text-xs font-mono font-extrabold text-white">
            Bs. {Number(rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>

          <div className="flex items-center gap-0.5 ml-1 border-l border-zinc-800 pl-1">
            <button
              type="button"
              onClick={handleSyncBcv}
              disabled={syncing}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Sincronizar con el Banco Central de Venezuela en vivo"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin text-emerald-400' : ''} />
            </button>
            <button
              type="button"
              onClick={() => {
                setManualRateInput(rate.toString());
                setIsEditing(true);
              }}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
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
