import FiscalMemoryModal from '../../pos-core/components/cashClose/FiscalMemoryModal';
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
  History,
  Cpu,
  RefreshCw,
  XCircle,
  ShieldCheck
} from 'lucide-react';
import { useData } from '../../pos-core/contexts/DataContext';

export default function CashCloseView() {
  const data = useData();
  const isElectron = Boolean(window?.electronAPI?.fiscal);
  const exchangeRate = Number(data?.exchangeRate) || 876.80;
  const invoices = data?.invoices || [];
  const cashCloses = data?.cashCloses || [];
  const fiscalSettings = data?.fiscalSettings || { port: 'COM2', enabled: true };

  const [physicalCashInput, setPhysicalCashInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [activeReceiptModal, setActiveReceiptModal] = useState(null); // 'x' | 'z'
  const [fiscalActionStatus, setFiscalActionStatus] = useState(null);
  const [isProcessingFiscal, setIsProcessingFiscal] = useState(false);
  const [isFiscalMemoryModalOpen, setIsFiscalMemoryModalOpen] = useState(false);
  const [s1StatusData, setS1StatusData] = useState(null);

  // Ventas del turno / día de hoy (excluyendo facturas anuladas)
  const todayInvoices = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return invoices.filter((inv) => {
      if (!inv.date) return true;
      if (inv.status === 'voided') return false;
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
    let zelleUsd = 0;

    todayInvoices.forEach((inv) => {
      const usd = Number(inv.total || inv.totalUsd || 0);
      const bs = Number(inv.totalBs || usd * exchangeRate);
      totalUsd += usd;
      totalBs += bs;

      const m = inv.paymentMethod || 'efectivo_usd';
      if (m === 'efectivo_usd' || m === 'usd_cash' || m === 'cash') {
        cashUsd += usd;
      } else if (m === 'pago_movil') {
        pagoMovilBs += bs;
      } else if (m === 'punto') {
        cardBs += bs;
      } else if (m === 'efectivo_bs') {
        cashUsd += bs / exchangeRate;
      } else if (m === 'zelle') {
        zelleUsd += usd;
      } else if (m === 'mixto') {
        const cashDiv = Number(inv.paymentDetails?.cashUsd || 0);
        const pmBs = Number(inv.paymentDetails?.pagoMovilBs || 0);
        const ptBs = Number(inv.paymentDetails?.puntoBs || 0);
        cashUsd += cashDiv;
        pagoMovilBs += pmBs;
        cardBs += ptBs;
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
      zelleUsd,
      count: todayInvoices.length,
      enteredCash,
      diff
    };
  }, [todayInvoices, physicalCashInput, exchangeRate]);

  // Probar Conexión Fiscal y Leer Acumuladores en Vivo (Status S1)
  const handleTestFiscalConnection = async () => {
    setIsProcessingFiscal(true);
    const port = fiscalSettings.port || 'COM2';
    setFiscalActionStatus({ msg: `Consultando estado y acumuladores S1 en puerto ${port}...`, type: 'info' });
    try {
      if (isElectron && window?.electronAPI?.fiscal?.getS1Status) {
        const s1 = await window.electronAPI.fiscal.getS1Status(port);
        if (s1 && s1.success !== false) {
          setS1StatusData(s1);
          setFiscalActionStatus({ msg: `✅ Máquina fiscal conectada en ${port} · Acumuladores S1 sincronizados.`, type: 'success' });
          return;
        }
      }
      if (isElectron && data?.fiscalTestConnection) {
        const res = await data.fiscalTestConnection(port);
        if (res && res.success) {
          setFiscalActionStatus({ msg: `✅ Máquina fiscal conectada y lista en ${port}.`, type: 'success' });
        } else {
          setFiscalActionStatus({ msg: `⚠️ Respuesta fiscal: ${res?.error || 'Sin respuesta en ' + port}`, type: 'error' });
        }
      } else {
        setFiscalActionStatus({ msg: 'Modo Web: Para leer acumuladores S1 del chip fiscal use la versión Desktop.', type: 'info' });
      }
    } catch (e) {
      setFiscalActionStatus({ msg: `Error fiscal: ${e.message}`, type: 'error' });
    } finally {
      setIsProcessingFiscal(false);
      setTimeout(() => setFiscalActionStatus(null), 5000);
    }
  };

  // Ejecutar Reporte X (Corte Parcial de Turno)
  const handleExecuteReportX = async () => {
    if (isElectron && data?.fiscalPrintReportX) {
      setIsProcessingFiscal(true);
      setFiscalActionStatus({ msg: 'Imprimiendo Reporte X en la máquina fiscal...', type: 'info' });
      try {
        const res = await data.fiscalPrintReportX(fiscalSettings.port || 'COM2');
        if (res && res.success === false) {
          setFiscalActionStatus({ msg: `Aviso impresora fiscal: ${res.error || 'Verifique papel'}`, type: 'error' });
        } else {
          setFiscalActionStatus({ msg: '✅ Reporte X emitido con éxito.', type: 'success' });
        }
      } catch (err) {
        console.warn('Error reporte X fiscal:', err);
      } finally {
        setIsProcessingFiscal(false);
        setTimeout(() => setFiscalActionStatus(null), 3500);
      }
    }

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
    });
  };

  // Ejecutar Cierre Z Fiscal Definitivo
  const handleExecuteCloseZ = async () => {
    if (!window.confirm('¿Estás seguro de emitir el Cierre Z fiscal definitivo? Esta acción cierra las operaciones contables del día ante el SENIAT y resetea los acumuladores diarios.')) {
      return;
    }

    setIsProcessingFiscal(true);

    // Si estamos en Desktop Electron, enviar comando Z oficial por puerto COM2
    if (isElectron && data?.fiscalPrintReportZ) {
      try {
        setFiscalActionStatus({ msg: 'Enviando comando Z a la máquina fiscal...', type: 'info' });
        const res = await data.fiscalPrintReportZ(fiscalSettings.port || 'COM2');
        if (res && res.success === false) {
          alert(`Aviso Máquina Fiscal: ${res.error || 'Verifique la conexión COM2'}`);
        }
      } catch (err) {
        console.error('Error fiscal Cierre Z:', err);
      }
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

    if (data?.createCashClose) {
      data.createCashClose(closeRecord);
    } else if (data?.addCashClose) {
      data.addCashClose(closeRecord);
    }

    setActiveReceiptModal({
      type: 'Z',
      data: closeRecord
    });
    setPhysicalCashInput('');
    setClosingNotes('');
    setIsProcessingFiscal(false);
  };

  // Cancelar Documento Fiscal Truncado (Comando 7)
  const handleCancelTruncatedDocument = async () => {
    if (!window.confirm('¿Enviar comando de cancelación de emergencia (Comando 7) a la máquina fiscal? Se usará si un ticket quedó a medio imprimir o trabado.')) {
      return;
    }
    if (isElectron && data?.fiscalCancelInvoice) {
      setIsProcessingFiscal(true);
      try {
        const res = await data.fiscalCancelInvoice(fiscalSettings.port || 'COM2');
        if (res && res.success) {
          setFiscalActionStatus({ msg: '✅ Documento fiscal truncado cancelado con éxito.', type: 'success' });
        } else {
          setFiscalActionStatus({ msg: `Aviso cancelación: ${res?.error || 'Sin respuesta'}`, type: 'error' });
        }
      } catch (e) {
        setFiscalActionStatus({ msg: `Error: ${e.message}`, type: 'error' });
      } finally {
        setIsProcessingFiscal(false);
        setTimeout(() => setFiscalActionStatus(null), 3500);
      }
    } else {
      alert('Comando de cancelación enviado (Modo Web simulado).');
    }
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
                Turno en Curso · {summary.count} ventas
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Arqueo de efectivo físico, corte X provisional y cierre Z fiscal definitivo SENIAT
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isProcessingFiscal}
              onClick={handleExecuteReportX}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
            >
              <Printer size={14} />
              <span>Reporte X (Corte Parcial)</span>
            </button>

            <button
              type="button"
              disabled={isProcessingFiscal}
              onClick={handleExecuteCloseZ}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
            >
              <Lock size={14} className="text-emerald-400" />
              <span>Realizar Cierre Z Fiscal</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-5xl">
        {/* PANEL DE CONTROL DE HARDWARE FISCAL SENIAT (HKA80 / COM2) */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Cpu size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-zinc-900">Máquina Fiscal SENIAT (HKA80 / Serial)</h3>
                <p className="text-[10px] text-zinc-500">
                  {isElectron ? `Conectada en puerto ${fiscalSettings.port || 'COM2'} (9600 baud)` : 'Modo Web Cloud · Emisión fiscal digital'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFiscalMemoryModalOpen(true)}
                className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
                title="Consultar Reportes Z directamente de la memoria fiscal HKA80 por rango de fechas"
              >
                <span>Memoria Fiscal Z</span>
              </button>
              <button
                type="button"
                onClick={handleTestFiscalConnection}
                disabled={isProcessingFiscal}
                className="px-2.5 py-1 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                title="Consultar acumuladores en vivo (S1) y estado de la máquina fiscal"
              >
                <RefreshCw size={12} className={isProcessingFiscal ? 'animate-spin' : ''} />
                <span>Test Conexión S1</span>
              </button>

              <button
                type="button"
                onClick={handleCancelTruncatedDocument}
                disabled={isProcessingFiscal}
                className="px-2.5 py-1 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                title="Desatascar o cancelar factura fiscal interrumpida"
              >
                <XCircle size={12} />
                <span>Cancelar Truncado (Cmd 7)</span>
              </button>
            </div>
          </div>

          {s1StatusData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-zinc-100 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Ventas en Máquina (S1)</span>
                <span className="font-black text-emerald-700 font-mono text-sm">
                  Bs. {Number(s1StatusData.total_daily_sales_bs ?? s1StatusData.totalDailySales ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Facturas Hoy (Máq / POS)</span>
                <span className="font-black text-zinc-900 font-mono text-sm">
                  {Number(s1StatusData.quantity_of_invoices_today ?? s1StatusData.quantityOfInvoicesToday ?? 0)} / {summary.count}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Última Factura Fiscal</span>
                <span className="font-black text-zinc-900 font-mono text-sm">
                  #{String(s1StatusData.last_invoice_number ?? s1StatusData.lastInvoiceNumber ?? 0).padStart(8, '0')}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Próximo Cierre Z</span>
                <span className="font-black text-amber-700 font-mono text-sm">
                  Z #{Number(s1StatusData.z_counter ?? s1StatusData.dailyClosureCounter ?? 0) + 1} · {s1StatusData.registered_machine_number || s1StatusData.registeredMachineNumber || 'HKA80'}
                </span>
              </div>
            </div>
          )}

          {fiscalActionStatus && (
            <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
              fiscalActionStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : fiscalActionStatus.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-zinc-100 text-zinc-800'
            }`}>
              {fiscalActionStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              <span>{fiscalActionStatus.msg}</span>
            </div>
          )}
        </div>

        {/* RESUMEN DE VENTAS DEL DÍA */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Total Ventas de Hoy</span>
            <span className="text-2xl font-black text-zinc-950 font-mono block">
              ${summary.totalUsd.toFixed(2)}
            </span>
            <span className="text-xs text-zinc-500 font-mono block">
              Bs. {summary.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Efectivo Sistema ($ USD)</span>
            <span className="text-2xl font-black text-emerald-700 font-mono block">
              ${summary.cashUsd.toFixed(2)}
            </span>
            <span className="text-xs text-zinc-400 font-mono block">
              Debe existir físicamente en gaveta
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">Pago Móvil + Tarjetas</span>
            <span className="text-2xl font-black text-blue-700 font-mono block">
              Bs. {(summary.pagoMovilBs + summary.cardBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-zinc-400 font-mono block">
              Pago Móvil: Bs. {summary.pagoMovilBs.toFixed(2)} · Punto: Bs. {summary.cardBs.toFixed(2)}
            </span>
          </div>
        </div>

        {/* ARQUEO DE CAJA FÍSICA */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
            <DollarSign size={18} className="text-emerald-600" />
            <h2 className="font-extrabold text-sm text-zinc-950">Arqueo Físico de Gaveta (Efectivo $)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">
                Efectivo Real Contado en Gaveta ($ USD):
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={physicalCashInput}
                onChange={(e) => setPhysicalCashInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 font-mono font-bold text-base focus:outline-none focus:border-zinc-950 bg-zinc-50/50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">Diferencia (Sobrante / Faltante):</label>
              <div
                className={`px-3.5 py-2.5 rounded-xl border font-mono font-extrabold text-base flex items-center justify-between ${
                  physicalCashInput === ''
                    ? 'border-zinc-200 bg-zinc-50 text-zinc-400'
                    : summary.diff === 0
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : summary.diff > 0
                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                    : 'border-rose-300 bg-rose-50 text-rose-800'
                }`}
              >
                <span>{summary.diff >= 0 ? `+$${summary.diff.toFixed(2)}` : `-$${Math.abs(summary.diff).toFixed(2)}`}</span>
                <span className="text-xs font-sans font-bold">
                  {physicalCashInput === ''
                    ? 'Ingresa monto'
                    : summary.diff === 0
                    ? 'Cuadre Perfecto'
                    : summary.diff > 0
                    ? 'Sobrante en Caja'
                    : 'Faltante en Caja'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 block mb-1">Observaciones del Cierre de Turno:</label>
            <textarea
              rows={2}
              placeholder="Notas sobre el turno, diferencias de caja, compras menores realizadas con efectivo de gaveta..."
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-xs focus:outline-none focus:border-zinc-950 bg-zinc-50/50"
            />
          </div>
        </div>

        {/* LISTADO DE CIERRES ANTERIORES */}
        {cashCloses.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <History size={16} className="text-zinc-500" />
              <h2 className="font-extrabold text-sm text-zinc-950">Historial de Cierres Z Anteriores</h2>
            </div>

            <div className="divide-y divide-zinc-100 text-xs font-mono">
              {cashCloses.slice(0, 10).map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-zinc-900 block font-sans">
                      Cierre #{c.id} · {c.date?.slice(0, 10)}
                    </span>
                    <span className="text-zinc-500 text-[11px] font-sans">
                      {c.invoicesCount} facturas procesadas
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-zinc-950 block">${Number(c.totalUsd || 0).toFixed(2)}</span>
                    <span className="text-[10px] text-zinc-400">Bs. {Number(c.totalBs || 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL IMPRIMIBLE DE REPORTE X / Z */}
      {activeReceiptModal && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setActiveReceiptModal(null)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 text-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center border-b border-zinc-100 pb-3">
              <h3 className="font-black text-base">
                {activeReceiptModal.type === 'X' ? 'CORTE PARCIAL (REPORTE X)' : 'CIERRE DIARIO (REPORTE Z)'}
              </h3>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                {activeReceiptModal.data.date?.slice(0, 16).replace('T', ' ')}
              </p>
            </div>

            <div className="bg-zinc-50 p-4 rounded-xl border border-dashed border-zinc-300 font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span>Ventas Registradas:</span>
                <span className="font-bold">{activeReceiptModal.data.invoicesCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Facturado ($):</span>
                <span className="font-bold">${activeReceiptModal.data.totalUsd?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Facturado (Bs):</span>
                <span className="font-bold">Bs. {activeReceiptModal.data.totalBs?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>Efectivo ($):</span>
                <span className="font-bold">${activeReceiptModal.data.cashUsd?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-blue-800">
                <span>Pago Móvil (Bs):</span>
                <span className="font-bold">Bs. {activeReceiptModal.data.pagoMovilBs?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sky-800">
                <span>Punto de Venta (Bs):</span>
                <span className="font-bold">Bs. {activeReceiptModal.data.cardBs?.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 text-white font-bold text-xs hover:bg-zinc-800 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer size={15} />
                <span>Imprimir Comprobante</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveReceiptModal(null)}
                className="w-full py-2 rounded-xl text-zinc-500 hover:text-zinc-950 text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AUDITORÍA DE MEMORIA FISCAL Z */}
      <FiscalMemoryModal
        isOpen={isFiscalMemoryModalOpen}
        onClose={() => setIsFiscalMemoryModalOpen(false)}
        fiscalSettings={fiscalSettings}
        fiscalGetFiscalMemory={data?.fiscalGetFiscalMemory}
        fiscalPrintFiscalMemory={data?.fiscalPrintFiscalMemory}
        posInvoices={invoices}
        exchangeRate={exchangeRate}
      />
    </div>
  );
}
