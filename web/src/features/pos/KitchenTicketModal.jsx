import React, { useState, useEffect, useRef } from 'react';
import { ChefHat, Printer, X, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { printIsolatedTicket } from '../../pos-core/utils/printIsolatedTicket';

export default function KitchenTicketModal({
  isOpen,
  onClose,
  cart,
  orderNumber = 'CMD-101',
  tableName = 'Barra / Mostrador',
  waiter = 'Cajero 1',
  orderNotes = ''
}) {
  if (!isOpen) return null;

  const ticketRef = useRef(null);
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(() => {
    return localStorage.getItem('pos_comanda_printer') || '';
  });
  const [paperSize, setPaperSize] = useState(() => {
    return localStorage.getItem('pos_comanda_paper_size') || '58mm';
  });
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState(null);

  // Cargar impresoras nativas si estamos en Desktop Electron
  useEffect(() => {
    if (window?.electronAPI && typeof window.electronAPI.getPrinters === 'function') {
      window.electronAPI.getPrinters().then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setPrinters(list);
          const saved = localStorage.getItem('pos_comanda_printer');
          const exists = list.some((p) => p.name === saved);
          const posPrinter = list.find((p) => /pos|thermal|ticket|58|80/i.test(p.name)) || list.find((p) => p.isDefault) || list[0];
          
          if (saved && exists) {
            setSelectedPrinter(saved);
          } else if (posPrinter) {
            setSelectedPrinter(posPrinter.name);
            localStorage.setItem('pos_comanda_printer', posPrinter.name);
          }
        }
      }).catch((e) => console.warn('Error detectando impresoras nativas:', e));
    }
  }, []);

  const handlePrintComanda = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    setPrintStatus({ msg: 'Enviando comanda a la comandera...', type: 'info' });

    try {
      const html = ticketRef.current ? ticketRef.current.outerHTML : '';
      
      // Impresión aislada 1:1 térmica (en Electron usa IPC printWindow sin diálogo; en Web usa iframe aislado)
      const res = await printIsolatedTicket({
        html,
        paperSize,
        deviceName: selectedPrinter || '',
        silent: Boolean(window?.electronAPI)
      });

      if (res && res.success === false) {
        setPrintStatus({ msg: `Aviso impresora: ${res.failureReason || res.error || 'Verifique la impresora de cocina'}`, type: 'error' });
      } else {
        setPrintStatus({ msg: '¡Comanda enviada a la cocina con éxito!', type: 'success' });
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Error al imprimir comanda:', err);
      // Fallback estándar
      window.print();
      setPrintStatus({ msg: 'Comanda impresa.', type: 'info' });
    } finally {
      setIsPrinting(false);
      setTimeout(() => setPrintStatus(null), 3500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 text-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABECERA DE LA COMANDA */}
        <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <ChefHat size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Comanda de Cocina</h3>
              <p className="text-[11px] text-zinc-500 font-mono">Orden #{orderNumber} · {tableName}</p>
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

        {/* SELECTOR DE IMPRESORA TÉRMICA (SI EN ELECTRON DESKTOP) */}
        {printers.length > 0 && (
          <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-200 text-xs flex items-center justify-between">
            <span className="font-bold text-zinc-600">Impresora Cocina:</span>
            <select
              value={selectedPrinter}
              onChange={(e) => {
                setSelectedPrinter(e.target.value);
                localStorage.setItem('pos_comanda_printer', e.target.value);
              }}
              className="px-2 py-1 rounded-lg border border-zinc-300 font-semibold bg-white text-xs max-w-[180px] truncate"
            >
              {printers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} {p.isDefault ? '(Predeterminada)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* TICKET TÉRMICO DE COCINA (REF PARA IMPRESIÓN AISLADA 1:1) */}
        <div
          ref={ticketRef}
          className="kitchen-paper bg-zinc-50 p-4 rounded-xl border border-dashed border-zinc-300 font-mono text-xs space-y-3"
        >
          <div className="text-center border-b border-dashed border-zinc-300 pb-2">
            <span className="font-black text-sm block">*** PEDIDO DE COCINA ***</span>
            <div className="flex justify-between text-[11px] text-zinc-600 mt-1">
              <span>Mesa: <strong>{tableName}</strong></span>
              <span>Hora: {now}</span>
            </div>
            <div className="text-[10px] text-zinc-500 text-left mt-0.5">
              Atiende: {waiter}
            </div>
          </div>

          {/* LISTADO DE PLATOS CON CANTIDAD CLARA Y SIN PRECIOS */}
          <div className="space-y-2 py-1">
            {cart.map((item, idx) => (
              <div key={item.id || idx} className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <span className="font-black text-sm bg-zinc-900 text-white rounded px-1.5 py-0.2">
                    {item.qty}x
                  </span>
                  <div>
                    <span className="font-bold text-zinc-900 block leading-tight">{item.name}</span>
                    {item.notes && (
                      <span className="text-[10px] text-amber-800 font-sans italic bg-amber-100/60 px-1 rounded block mt-0.5">
                        ⚠️ {item.notes}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {orderNotes && (
            <div className="border-t border-dashed border-zinc-300 pt-2 text-[11px] text-zinc-700 bg-amber-50/50 p-2 rounded">
              <span className="font-bold block">Observaciones generales:</span>
              <p>{orderNotes}</p>
            </div>
          )}

          <div className="text-center border-t border-dashed border-zinc-300 pt-2 text-[10px] text-zinc-400">
            FacturasYa · Comandera de Cocina
          </div>
        </div>

        {/* MENSAJES DE ESTADO DE IMPRESIÓN */}
        {printStatus && (
          <div
            className={`p-2 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 ${
              printStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : printStatus.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-zinc-100 text-zinc-800'
            }`}
          >
            {printStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>{printStatus.msg}</span>
          </div>
        )}

        {/* ACCIONES DEL MODAL */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={isPrinting}
            onClick={handlePrintComanda}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
          >
            <Printer size={15} />
            <span>{isPrinting ? 'Enviando...' : 'Imprimir en Comandera Térmica'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl text-zinc-600 hover:text-zinc-950 text-xs font-semibold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
