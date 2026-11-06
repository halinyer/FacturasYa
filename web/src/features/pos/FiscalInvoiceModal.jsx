import React, { useState, useEffect } from 'react';
import { Printer, ShieldCheck, CheckCircle2, AlertTriangle, X, FileText, Cpu } from 'lucide-react';
import { useData } from '../../pos-core/contexts/DataContext';

export default function FiscalInvoiceModal({
  isOpen,
  onClose,
  cartTotals,
  bcvRate,
  client = { name: 'Consumidor Final', rif: 'V-00000000-0', address: 'Local' },
  fiscalSerial = 'Z4A1234567',
  onConfirmFiscalPrint = () => {}
}) {
  if (!isOpen) return null;

  const data = useData();
  const isElectron = Boolean(window?.electronAPI?.fiscal);

  const [printerMode, setPrinterMode] = useState(isElectron ? 'bridge_auto' : 'digital_seniat');
  const [fiscalPort, setFiscalPort] = useState(data?.fiscalSettings?.port || 'COM2');
  const [availablePorts, setAvailablePorts] = useState(['COM1', 'COM2', 'COM3', 'COM4']);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Detectar puertos serie en Desktop Electron
  useEffect(() => {
    if (isElectron && window.electronAPI.fiscal.getPorts) {
      window.electronAPI.fiscal.getPorts().then((ports) => {
        if (Array.isArray(ports) && ports.length > 0) {
          setAvailablePorts(ports.map((p) => p.path || p));
        }
      }).catch((e) => console.warn('Error detectando puertos COM:', e));
    }
  }, [isElectron]);

  const handlePrint = async () => {
    setIsProcessing(true);
    setStatusMessage({ msg: 'Comunicándose con la máquina fiscal homologada...', type: 'info' });

    try {
      await onConfirmFiscalPrint({
        printerMode,
        fiscalSerial,
        fiscalPort
      });
      setStatusMessage({ msg: '¡Factura Fiscal emitida con éxito!', type: 'success' });
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error fiscal print:', err);
      setStatusMessage({ msg: `Error fiscal: ${err.message || 'Fallo de comunicación en puerto ' + fiscalPort}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 text-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABECERA */}
        <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Printer size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Emisión Fiscal SENIAT</h3>
              <p className="text-[11px] text-zinc-500 font-mono">
                {isElectron ? 'Máquina Fiscal Física (HKA80 / Serial)' : 'Comprobante Fiscal Digital Homologado'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* DETALLE DEL CLIENTE FISCAL */}
        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500 font-semibold">Razón Social:</span>
            <span className="font-bold text-zinc-950 truncate max-w-[220px]">{client.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 font-semibold">RIF / C.I.:</span>
            <span className="font-mono font-bold text-zinc-950">{client.rif}</span>
          </div>
          {client.address && (
            <div className="flex justify-between">
              <span className="text-zinc-500 font-semibold">Dirección:</span>
              <span className="text-zinc-600 truncate max-w-[220px]">{client.address}</span>
            </div>
          )}
        </div>

        {/* DESGLOSE FISCAL */}
        <div className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 space-y-2 text-xs">
          <div className="flex justify-between text-zinc-600">
            <span>Base Imponible (16%):</span>
            <span className="font-mono font-semibold">Bs. {cartTotals.baseImponibleBs.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-emerald-700 font-semibold">
            <span>Débito Fiscal IVA (16%):</span>
            <span className="font-mono font-bold">+ Bs. {cartTotals.iva16Bs.toFixed(2)}</span>
          </div>
          {cartTotals.igtfBs > 0 && (
            <div className="flex justify-between text-amber-700 font-semibold">
              <span>IGTF Percibido (3%):</span>
              <span className="font-mono font-bold">+ Bs. {cartTotals.igtfBs.toFixed(2)}</span>
            </div>
          )}
          <div className="pt-2 border-t border-zinc-200 flex justify-between items-baseline">
            <span className="font-bold text-zinc-950">Total Factura Fiscal:</span>
            <div className="text-right">
              <span className="text-base font-extrabold text-zinc-950 font-mono block">
                Bs. {cartTotals.finalTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                (${cartTotals.finalTotalUsd.toFixed(2)} USD a {bcvRate.toFixed(2)})
              </span>
            </div>
          </div>
        </div>

        {/* MODO DE DESTINO FISCAL */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-700 block">Destino de la Factura:</label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPrinterMode('bridge_auto')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                printerMode === 'bridge_auto'
                  ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <Cpu size={14} className={printerMode === 'bridge_auto' ? 'text-emerald-400' : 'text-zinc-500'} />
                <span>Impresora HKA80</span>
              </div>
              <span className={`text-[10px] block leading-tight ${printerMode === 'bridge_auto' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                {isElectron ? `Puerto: ${fiscalPort}` : 'Serial COM2 / USB'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPrinterMode('digital_seniat')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                printerMode === 'digital_seniat'
                  ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <FileText size={14} className={printerMode === 'digital_seniat' ? 'text-sky-400' : 'text-zinc-500'} />
                <span>Comprobante Digital</span>
              </div>
              <span className={`text-[10px] block leading-tight ${printerMode === 'digital_seniat' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                Formato PDF / Térmico
              </span>
            </button>
          </div>
        </div>

        {/* MENSAJES DE ESTADO */}
        {statusMessage && (
          <div
            className={`p-2.5 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : statusMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-zinc-100 text-zinc-800'
            }`}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            <span>{statusMessage.msg}</span>
          </div>
        )}

        {/* ACCIONES */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handlePrint}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
          >
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>{isProcessing ? 'Comunicando con Máquina Fiscal...' : 'Confirmar y Emitir Factura Fiscal'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl text-zinc-500 hover:text-zinc-950 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
