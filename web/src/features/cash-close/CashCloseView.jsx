import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  DollarSign,
  Smartphone,
  CreditCard,
  Lock,
  History
} from 'lucide-react';
import { useData } from '../../pos-core/contexts/DataContext';

export default function CashCloseView() {
  const data = useData();
  const exchangeRate = Number(data?.exchangeRate) || 876.80;
  const invoices = data?.invoices || [];
  const cashCloses = data?.cashCloses || [];

  const [physicalCashInput, setPhysicalCashInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [activeReceiptModal, setActiveReceiptModal] = useState(null); // 'x' | 'z'

  // Ventas del turno / día de hoy
  const todayInvoices = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return invoices.filter((inv) => {
      if (!inv.date) return true;
      return inv.date.slice(0, 10) === todayStr;
    });
  }, [invoices]);

  // Totales de recaudación de hoy
  const summary = useMemo(() => {
    let totalUsd = 0;
    let totalBs = 0;
    let cashUsd = 0;
    let pagoMovilBs = 0;
    let cardBs = 0;

    todayInvoices.forEach((inv) => {
      const usd = Number(inv.total || inv.totalUsd || 0);
      const bs = Number(inv.totalBs || usd * exchangeRate);
      totalUsd += usd;
      totalBs += bs;

      const m = inv.paymentMethod || 'cash';
      if (m === 'usd_cash' || m === 'cash') {
        cashUsd += usd;
      } else if (m === 'pago_movil') {
        pagoMovilBs += bs;
      } else {
        cardBs += bs;
      }
    });

    const enteredCash = Number(physicalCashInput) || 0;
    const diff = physicalCashInput !== '' ? enteredCash - cashUsd : 0;

    return {
      totalUsd,
      totalBs,
      cashUsd,
      pagoMovilBs,
      cardBs,
      count: todayInvoices.length,
      enteredCash,
      diff
    };
  }, [todayInvoices, physicalCashInput, exchangeRate]);

  // Ejecutar Cierre Z
  const handleExecuteCloseZ = () => {
    if (!window.confirm('¿Estás seguro de emitir el Cierre Z fiscal? Esta acción cierra las operaciones del día.')) {
      return;
    }

    const closeRecord = {
      id: 'Z-' + Date.now(),
      date: new Date().toISOString(),
      invoicesCount: summary.count,
      totalUsd: summary.totalUsd,
      totalBs: summary.totalBs,
      cashUsd: summary.cashUsd,
      enteredCashUsd: summary.enteredCash,
      cashDiffUsd: summary.diff,
      pagoMovilBs: summary.pagoMovilBs,
      cardBs: summary.cardBs,
      notes: closingNotes
    };

    if (data?.addCashClose) {
      data.addCashClose(closeRecord);
    }

    setActiveReceiptModal({
      type: 'Z',
      data: closeRecord
    });
    setPhysicalCashInput('');
    setClosingNotes('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-y-auto">
      {/* HEADER DE MÓDULO ESTILO NOTION */}
      <div className="bg-white border-b border-zinc-200/80 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
                <Calculator size={18} />
              </span>
              <h1 className="text-xl font-bold text-zinc-950 tracking-tight">Cierre de Caja</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Turno en Curso
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Arqueo de efectivo físico, corte X provisional y cierre Z fiscal definitivo
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setActiveReceiptModal({
                  type: 'X',
                  data: {
                    date: new Date().toISOString(),
                    invoicesCount: summary.count,
                    totalUsd: summary.totalUsd,
                    totalBs: summary.totalBs,
                    cashUsd: summary.cashUsd,
                    pagoMovilBs: summary.pagoMovilBs,
                    cardBs: summary.cardBs
                  }
                })
              }
              className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer size={14} />
              <span>Reporte X (Corte Parcial)</span>
            </button>

            <button
              type="button"
              onClick={handleExecuteCloseZ}
              className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Lock size={14} />
              <span>Realizar Cierre Z</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-5xl">
        {/* RESUMEN DE VENTAS DEL DÍA */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-600" /> Efectivo Divisas
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                Caja
              </span>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-zinc-950 mono-num">
                ${summary.cashUsd.toFixed(2)}
              </div>
              <div className="text-xs text-zinc-400 font-semibold mono-num">
                Esperado en gaveta
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Smartphone size={14} className="text-indigo-600" /> Pago Móvil
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                Banco
              </span>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-zinc-950 mono-num">
                Bs. {summary.pagoMovilBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-zinc-400 font-semibold mono-num">
                ≈ ${(summary.pagoMovilBs / exchangeRate).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <CreditCard size={14} className="text-sky-600" /> Punto de Venta
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-bold">
                Lote POS
              </span>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-zinc-950 mono-num">
                Bs. {summary.cardBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-zinc-400 font-semibold mono-num">
                ≈ ${(summary.cardBs / exchangeRate).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* MÓDULO DE ARQUEO DE CAJA FÍSICA */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-5">
          <div className="border-b border-zinc-100 pb-3">
            <h2 className="text-sm font-bold text-zinc-950">Arqueo y Cuadre de Gaveta</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Cuenta el efectivo billete a billete e ingresa el monto para verificar diferencias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                  Efectivo Físico Contado ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-400 font-bold text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={physicalCashInput}
                    onChange={(e) => setPhysicalCashInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-zinc-200 text-sm font-bold mono-num focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                  Observaciones de Cierre (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Billete de $20 desgastado, propina separada..."
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400"
                />
              </div>
            </div>

            {/* PANEL DE RESULTADO DEL CUADRE */}
            <div className="p-5 rounded-xl border border-zinc-100 bg-zinc-50/60 space-y-3">
              <span className="text-xs font-bold text-zinc-800 block">Resultado del Arqueo</span>

              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Monto Esperado (Sistema):</span>
                <span className="font-bold text-zinc-950 mono-num">${summary.cashUsd.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Monto Físico Reportado:</span>
                <span className="font-bold text-zinc-950 mono-num">
                  ${(Number(physicalCashInput) || 0).toFixed(2)}
                </span>
              </div>

              <div className="pt-3 border-t border-zinc-200 flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-800">Diferencia de Caja:</span>
                <div className="text-right">
                  <span
                    className={`font-extrabold text-base mono-num ${
                      summary.diff === 0 && physicalCashInput !== ''
                        ? 'text-emerald-600'
                        : summary.diff < 0
                        ? 'text-rose-600'
                        : summary.diff > 0
                        ? 'text-amber-600'
                        : 'text-zinc-400'
                    }`}
                  >
                    {summary.diff > 0 ? '+' : ''}${summary.diff.toFixed(2)}
                  </span>
                  <div className="text-[10px] text-zinc-500 font-semibold">
                    {physicalCashInput === ''
                      ? 'Sin ingresar conteo'
                      : summary.diff === 0
                      ? 'Caja cuadrada exactamente'
                      : summary.diff < 0
                      ? 'Faltante en caja'
                      : 'Sobrante en caja'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HISTORIAL DE CIERRES ANTERIORES */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-100 flex items-center gap-2">
            <History size={16} className="text-zinc-500" />
            <h2 className="text-sm font-bold text-zinc-950">Historial de Cierres Z Anteriores</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50/80 text-zinc-500 font-semibold border-b border-zinc-100">
                <tr>
                  <th className="py-3 px-4">Cierre ID</th>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4 text-center">Facturas</th>
                  <th className="py-3 px-4 text-right">Total ($)</th>
                  <th className="py-3 px-4 text-right">Efectivo ($)</th>
                  <th className="py-3 px-4 text-right">Pago Móvil (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {cashCloses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-zinc-400">
                      No hay registros de cierres anteriores en esta máquina.
                    </td>
                  </tr>
                ) : (
                  cashCloses.map((c, idx) => (
                    <tr key={c.id || idx} className="hover:bg-zinc-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-zinc-950">{c.id}</td>
                      <td className="py-3 px-4 text-zinc-500">
                        {c.date ? new Date(c.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Hoy'}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold">{c.invoicesCount || 0}</td>
                      <td className="py-3 px-4 text-right font-bold font-mono">${Number(c.totalUsd || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono">${Number(c.cashUsd || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        Bs. {Number(c.pagoMovilBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DEL COMPROBANTE DE REPORTE X / Z */}
      {activeReceiptModal && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveReceiptModal(null)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center border-b border-zinc-100 pb-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 block">
                Comprobante de Caja
              </span>
              <h3 className="text-lg font-extrabold text-zinc-950">
                REPORTE FISCAL {activeReceiptModal.type}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {new Date(activeReceiptModal.data.date).toLocaleString()}
              </p>
            </div>

            <div className="space-y-2 text-xs divide-y divide-zinc-100">
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Comprobantes Emitidos:</span>
                <span className="font-bold text-zinc-900">{activeReceiptModal.data.invoicesCount}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Ventas Totales ($):</span>
                <span className="font-bold text-zinc-900 mono-num">${Number(activeReceiptModal.data.totalUsd || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Ventas Totales (Bs):</span>
                <span className="font-bold text-zinc-900 mono-num">
                  Bs. {Number(activeReceiptModal.data.totalBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Efectivo en Divisas:</span>
                <span className="font-bold text-emerald-700 mono-num">${Number(activeReceiptModal.data.cashUsd || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Pago Móvil:</span>
                <span className="font-bold text-indigo-700 mono-num">
                  Bs. {Number(activeReceiptModal.data.pagoMovilBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 text-white font-bold text-xs hover:bg-zinc-800 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer size={15} />
                <span>Imprimir Ticket</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveReceiptModal(null)}
                className="w-full py-2 px-4 rounded-xl text-zinc-500 hover:text-zinc-900 font-semibold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
