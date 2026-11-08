import React, { useState, useMemo, useEffect } from 'react';
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
  ShieldCheck,
  Calendar,
  Eye,
  Trash2,
  RotateCcw,
  AlertCircle,
  FileText,
  Banknote,
  TrendingUp,
  Search,
  X,
  ChevronRight
} from 'lucide-react';
import { useData, getTodayLocalDateStr } from '../../pos-core/contexts/DataContext';
import InvoicePreview from '../../pos-core/components/InvoicePreview';
import FiscalMemoryModal from '../../pos-core/components/cashClose/FiscalMemoryModal';
import { BankLogo, findBank } from '../../pos-core/utils/venezuelaBanks';

export default function CashCloseView() {
  const data = useData() || {};
  const isElectron = typeof window !== 'undefined' && Boolean(window?.electronAPI?.fiscal);
  const exchangeRate = Number(data?.exchangeRate) || 876.80;
  const invoices = data?.invoices || [];
  const cashCloses = data?.cashCloses || [];
  const clients = data?.clients || [];
  const fiscalSettings = data?.fiscalSettings || { port: 'COM2', enabled: true };

  // Métodos de DataContext para auditar y cuadrar caja
  const {
    createCashClose,
    addCashClose,
    voidInvoice,
    restoreInvoice,
    deleteInvoice,
    deleteCashClose,
    clearInvoicesByDate,
    clearAllSalesData,
    syncZReports,
    currentLocalDate
  } = data;

  // Fecha seleccionada (por defecto hoy; se sincroniza automáticamente a las 12:00 AM)
  const [selectedDate, setSelectedDate] = useState(() => currentLocalDate || getTodayLocalDateStr());
  const [activeTab, setActiveTab] = useState('cierre'); // 'cierre' | 'historial'

  // Arqueo físico de gaveta (Dual $ USD y Bs)
  const [physicalCashUSD, setPhysicalCashUSD] = useState('');
  const [physicalCashBs, setPhysicalCashBs] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Estados de hardware y fiscal
  const [activeReceiptModal, setActiveReceiptModal] = useState(null); // 'x' | 'z'
  const [fiscalActionStatus, setFiscalActionStatus] = useState(null);
  const [isProcessingFiscal, setIsProcessingFiscal] = useState(false);
  const [isFiscalMemoryModalOpen, setIsFiscalMemoryModalOpen] = useState(false);
  const [s1StatusData, setS1StatusData] = useState(null);

  // Modales de auditoría y corrección
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceToVoid, setInvoiceToVoid] = useState(null);
  const [voidReasonText, setVoidReasonText] = useState('');
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedHistoricalClose, setSelectedHistoricalClose] = useState(null);
  const [searchInvoiceQuery, setSearchInvoiceQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Rollover a las 12:00 AM medianoche: actualiza automáticamente la caja para el nuevo día
  useEffect(() => {
    if (currentLocalDate) {
      setSelectedDate(currentLocalDate);
    }
  }, [currentLocalDate]);

  // Filtrado de facturas para la fecha seleccionada
  const dateInvoices = useMemo(() => {
    return (invoices || []).filter((inv) => {
      if (!inv.date) return false;
      const invDate = inv.date.includes('T') ? inv.date.split('T')[0] : inv.date.slice(0, 10);
      return invDate === selectedDate;
    });
  }, [invoices, selectedDate]);

  // Facturas filtradas por buscador dentro de la fecha seleccionada
  const filteredDateInvoices = useMemo(() => {
    if (!searchInvoiceQuery.trim()) return dateInvoices;
    const q = searchInvoiceQuery.toLowerCase();
    return dateInvoices.filter((inv) => {
      const num = String(inv.invoiceNumber || inv.id || '').toLowerCase();
      const cli = String(inv.client?.name || inv.clientName || '').toLowerCase();
      const rif = String(inv.client?.rif || inv.clientRif || '').toLowerCase();
      return num.includes(q) || cli.includes(q) || rif.includes(q);
    });
  }, [dateInvoices, searchInvoiceQuery]);

  // Totales y recaudación de la fecha seleccionada
  const summary = useMemo(() => {
    let totalUsd = 0;
    let totalBs = 0;
    let cashUsd = 0;
    let cashBs = 0;
    let pagoMovilBs = 0;
    let cardBs = 0;
    let zelleUsd = 0;
    let igtfUsd = 0;
    let validCount = 0;
    let voidedCount = 0;
    let fiscalCount = 0;

    dateInvoices.forEach((inv) => {
      const stat = (inv.status || '').toLowerCase();
      const isVoided = stat === 'voided' || stat === 'anulada';
      const isFiscal = Boolean(inv.isFiscalInvoice || inv.docType === 'fiscal');

      if (isVoided) {
        voidedCount++;
        return; // Las facturas anuladas NO suman en recaudación ni en gaveta
      }

      validCount++;
      if (isFiscal) fiscalCount++;

      const usd = Number(inv.total || inv.totalUSD || inv.totalUsd || 0);
      const invRate = Number(inv.exchangeRate) || exchangeRate;
      const bs = Number(inv.totalBs || usd * invRate);
      const igtf = Number(inv.igtfUsd || (inv.igtfBs ? inv.igtfBs / invRate : 0));

      totalUsd += usd;
      totalBs += bs;
      igtfUsd += igtf;

      const m = (inv.paymentMethod || 'efectivo_usd').toLowerCase();
      if (m === 'efectivo_usd' || m === 'usd_cash' || m === 'cash') {
        cashUsd += usd;
      } else if (m === 'efectivo_bs') {
        cashBs += bs;
      } else if (m === 'pago_movil') {
        pagoMovilBs += bs;
      } else if (m === 'punto' || m === 'pos' || m === 'tarjeta') {
        cardBs += bs;
      } else if (m === 'zelle') {
        zelleUsd += usd;
      } else if (m === 'mixto') {
        const cUsd = Number(inv.paymentDetails?.cashUsd || 0);
        const cBs = Number(inv.paymentDetails?.cashBs || 0);
        const pmBs = Number(inv.paymentDetails?.pagoMovilBs || 0);
        const ptBs = Number(inv.paymentDetails?.puntoBs || 0);
        const zUsd = Number(inv.paymentDetails?.zelleUsd || 0);
        cashUsd += cUsd;
        cashBs += cBs;
        pagoMovilBs += pmBs;
        cardBs += ptBs;
        zelleUsd += zUsd;
      } else {
        cardBs += bs;
      }
    });

    const enteredUsd = physicalCashUSD !== '' ? Number(physicalCashUSD) : null;
    const diffUsd = enteredUsd !== null ? enteredUsd - cashUsd : 0;

    const enteredBs = physicalCashBs !== '' ? Number(physicalCashBs) : null;
    const diffBs = enteredBs !== null ? enteredBs - cashBs : 0;

    return {
      totalUsd,
      totalBs,
      cashUsd,
      cashBs,
      pagoMovilBs,
      cardBs,
      zelleUsd,
      igtfUsd,
      validCount,
      voidedCount,
      fiscalCount,
      totalInvoices: dateInvoices.length,
      enteredUsd,
      diffUsd,
      enteredBs,
      diffBs
    };
  }, [dateInvoices, physicalCashUSD, physicalCashBs, exchangeRate]);

  // Cierre previo guardado para la fecha seleccionada (si ya se realizó)
  const existingCloseForDate = useMemo(() => {
    return (cashCloses || []).find((c) => {
      const cDate = (c.date || '').includes('T') ? c.date.split('T')[0] : (c.date || '').slice(0, 10);
      return cDate === selectedDate;
    });
  }, [cashCloses, selectedDate]);

  // Helper nombre cliente
  const getClientDisplayName = (inv) => {
    if (inv.client?.name) return inv.client.name;
    if (inv.clientName) return inv.clientName;
    const found = clients.find((c) => c.id === inv.clientId);
    return found ? found.name : 'Consumidor Final';
  };

  // Helper RIF cliente
  const getClientRif = (inv) => {
    if (inv.client?.rif) return inv.client.rif;
    if (inv.clientRif || inv.clientCedula) return inv.clientRif || inv.clientCedula;
    const found = clients.find((c) => c.id === inv.clientId);
    return found ? (found.rif || found.cedula) : 'V-00000000';
  };

  // Probar Conexión Fiscal y Leer Acumuladores en Vivo (Status S1)
  const handleTestFiscalConnection = async () => {
    setIsProcessingFiscal(true);
    const port = fiscalSettings.port || 'COM2';
    setFiscalActionStatus({ msg: `Consultando estado y acumuladores S1 en ${port}...`, type: 'info' });
    try {
      if (isElectron && window?.electronAPI?.fiscal?.getS1Status) {
        const s1 = await window.electronAPI.fiscal.getS1Status(port);
        if (s1 && s1.success !== false) {
          setS1StatusData(s1);
          setFiscalActionStatus({ msg: `✅ Máquina fiscal conectada en ${port} · Acumuladores S1 sincronizados.`, type: 'success' });
          return;
        }
      }
      if (isElectron && data?.fiscalGetS1Status) {
        const s1 = await data.fiscalGetS1Status(port);
        if (s1 && s1.success !== false) {
          setS1StatusData(s1);
          setFiscalActionStatus({ msg: `✅ Máquina fiscal conectada en ${port}.`, type: 'success' });
          return;
        }
      }
      setFiscalActionStatus({ msg: 'Modo Web Cloud: Simulación fiscal activa. Para leer hardware HKA80 use la app Desktop.', type: 'info' });
    } catch (e) {
      setFiscalActionStatus({ msg: `Error de puerto fiscal: ${e.message}`, type: 'error' });
    } finally {
      setIsProcessingFiscal(false);
      setTimeout(() => setFiscalActionStatus(null), 5000);
    }
  };

  // Ejecutar Reporte X (Corte Parcial de Turno)
  const handleExecuteReportX = async () => {
    if (isElectron && data?.fiscalPrintReportX) {
      setIsProcessingFiscal(true);
      setFiscalActionStatus({ msg: 'Imprimiendo Reporte X en impresora fiscal...', type: 'info' });
      try {
        const res = await data.fiscalPrintReportX(fiscalSettings.port || 'COM2');
        if (res && res.success === false) {
          showToast(`Aviso impresora fiscal: ${res.error || 'Verifique papel'}`, 'error');
        } else {
          showToast('¡Reporte X impreso con éxito en máquina fiscal!');
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
        invoicesCount: summary.validCount,
        totalUsd: summary.totalUsd,
        totalBs: summary.totalBs,
        cashUsd: summary.cashUsd,
        cashBs: summary.cashBs,
        pagoMovilBs: summary.pagoMovilBs,
        cardBs: summary.cardBs,
        zelleUsd: summary.zelleUsd
      }
    });
  };

  // Ejecutar Cierre Z Fiscal Definitivo
  const handleExecuteCloseZ = async () => {
    if (!window.confirm(`¿Confirmar Cierre Z Fiscal de la fecha ${selectedDate}? Esta acción emite el cierre diario oficial ante el SENIAT y resetea los acumuladores diarios de la máquina.`)) {
      return;
    }

    setIsProcessingFiscal(true);

    if (isElectron && data?.fiscalPrintReportZ) {
      try {
        setFiscalActionStatus({ msg: 'Enviando comando Z a la máquina fiscal HKA80...', type: 'info' });
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
      date: selectedDate + 'T' + new Date().toTimeString().slice(0, 8),
      dateStr: selectedDate,
      invoicesCount: summary.validCount,
      voidedCount: summary.voidedCount,
      totalUsd: summary.totalUsd,
      totalBs: summary.totalBs,
      cashUsd: summary.cashUsd,
      cashBs: summary.cashBs,
      enteredCashUsd: summary.enteredUsd ?? summary.cashUsd,
      cashDiffUsd: summary.diffUsd,
      enteredCashBs: summary.enteredBs ?? summary.cashBs,
      cashDiffBs: summary.diffBs,
      pagoMovilBs: summary.pagoMovilBs,
      cardBs: summary.cardBs,
      zelleUsd: summary.zelleUsd,
      notes: closingNotes || 'Cierre Z diario de turno'
    };

    if (createCashClose) {
      createCashClose(closeRecord);
    } else if (addCashClose) {
      addCashClose(closeRecord);
    }

    setActiveReceiptModal({
      type: 'Z',
      data: closeRecord
    });
    setPhysicalCashUSD('');
    setPhysicalCashBs('');
    setClosingNotes('');
    setIsProcessingFiscal(false);
    showToast(`¡Cierre Z #${closeRecord.id} registrado con éxito!`);
  };

  // Cancelar Documento Fiscal Truncado (Comando 7)
  const handleCancelTruncatedDocument = async () => {
    if (!window.confirm('¿Enviar comando de cancelación de emergencia (Comando 7) a la máquina fiscal? Desatasca la impresora si un ticket quedó a medio imprimir.')) {
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
      alert('Comando 7 enviado (Modo Web).');
    }
  };

  // Anulación confirmada de una factura (descuenta de inmediato para cuadrar caja)
  const handleConfirmVoidInvoice = () => {
    if (!invoiceToVoid) return;
    const reason = voidReasonText.trim() || 'Anulada en Cierre de Caja para corrección';
    if (voidInvoice) {
      voidInvoice(invoiceToVoid.id, reason);
      showToast(`Factura #${invoiceToVoid.invoiceNumber || invoiceToVoid.id} anulada. Caja recalculada.`, 'info');
    }
    setInvoiceToVoid(null);
    setVoidReasonText('');
  };

  // Restaurar factura previamente anulada
  const handleRestoreInvoice = (inv) => {
    if (restoreInvoice) {
      restoreInvoice(inv.id);
      showToast(`Factura #${inv.invoiceNumber || inv.id} restaurada con éxito.`);
    }
  };

  // Eliminar factura permanentemente
  const handleConfirmDeleteInvoice = () => {
    if (!invoiceToDelete) return;
    if (deleteInvoice) {
      deleteInvoice(invoiceToDelete.id);
      showToast(`Factura #${invoiceToDelete.invoiceNumber || invoiceToDelete.id} eliminada permanentemente.`, 'info');
    }
    setInvoiceToDelete(null);
  };

  // Reiniciar / Poner caja en 0 solo para la fecha seleccionada
  const handleResetCurrentDateCash = () => {
    if (clearInvoicesByDate) {
      clearInvoicesByDate(selectedDate);
    }
    if (deleteCashClose) {
      deleteCashClose(selectedDate);
    }
    setShowResetModal(false);
    showToast(`Caja de la fecha ${selectedDate} reiniciada a $0.00.`);
  };

  // Reset total del sistema
  const handleResetAllSystemSales = () => {
    if (clearAllSalesData) {
      clearAllSalesData();
    }
    setShowResetModal(false);
    showToast('Todo el sistema ha sido reseteado a 0.');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-y-auto">
      {/* HEADER DE MÓDULO NOTION MINIMALISTA */}
      <div className="bg-white border-b border-zinc-200/80 px-6 py-4 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
                <Calculator size={18} />
              </span>
              <h1 className="text-xl font-bold text-zinc-950 tracking-tight">Cierre de Caja & Arqueo</h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                existingCloseForDate
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {existingCloseForDate ? `Cierre Z Registrado · ${selectedDate}` : `Turno Abierto · ${summary.validCount} ventas`}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Arqueo físico multimoneda ($ y Bs), conciliación de facturas, corrección de descuadres y Cierre Z fiscal SENIAT
            </p>
          </div>

          {/* SELECTOR DE FECHA, PESTAÑAS Y ACCIONES */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-zinc-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('cierre')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'cierre' ? 'bg-white text-zinc-950 shadow-xs font-bold' : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Cierre de Turno
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('historial')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'historial' ? 'bg-white text-zinc-950 shadow-xs font-bold' : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <History size={13} />
                <span>Historial ({cashCloses.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1">
              <Calendar size={13} className="text-zinc-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-semibold bg-transparent text-zinc-800 focus:outline-none cursor-pointer"
              />
              {selectedDate !== (currentLocalDate || getTodayLocalDateStr()) && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(currentLocalDate || getTodayLocalDateStr())}
                  className="text-[10px] bg-zinc-200 hover:bg-zinc-300 text-zinc-800 px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer"
                  title="Volver a la fecha de hoy"
                >
                  Hoy
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={isProcessingFiscal}
              onClick={handleExecuteReportX}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              title="Emitir corte parcial provisional sin cerrar la jornada fiscal"
            >
              <Printer size={13} />
              <span>Reporte X</span>
            </button>

            <button
              type="button"
              disabled={isProcessingFiscal}
              onClick={handleExecuteCloseZ}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              title="Emitir Cierre Z fiscal oficial y archivar jornada contable"
            >
              <Lock size={13} className="text-emerald-400" />
              <span>Cierre Z Fiscal</span>
            </button>

            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Poner caja en cero o reiniciar datos de prueba"
            >
              <RotateCcw size={13} />
              <span>Poner en 0</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl w-full">
        {activeTab === 'cierre' ? (
          <>
            {/* PANEL DE MÁQUINA FISCAL SENIAT HKA80 */}
            <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Cpu size={16} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs text-zinc-900">Máquina Fiscal SENIAT (HKA80 / Serial)</h3>
                    <p className="text-[10px] text-zinc-500">
                      {isElectron
                        ? `Conectada en puerto ${fiscalSettings.port || 'COM2'} (9600 baud)`
                        : 'Modo Web Cloud · Emisión fiscal digital'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
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
                    <span className="font-bold text-emerald-700 font-mono text-sm">
                      Bs. {Number(s1StatusData.total_daily_sales_bs ?? s1StatusData.totalDailySales ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase block">Facturas Hoy (Máq / POS)</span>
                    <span className="font-bold text-zinc-900 font-mono text-sm">
                      {Number(s1StatusData.quantity_of_invoices_today ?? s1StatusData.quantityOfInvoicesToday ?? 0)} / {summary.validCount}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase block">Última Factura Fiscal</span>
                    <span className="font-bold text-zinc-900 font-mono text-sm">
                      #{String(s1StatusData.last_invoice_number ?? s1StatusData.lastInvoiceNumber ?? 0).padStart(8, '0')}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase block">Próximo Cierre Z</span>
                    <span className="font-bold text-amber-700 font-mono text-sm">
                      Z #{Number(s1StatusData.z_counter ?? s1StatusData.dailyClosureCounter ?? 0) + 1}
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

            {/* RESUMEN DE VENTAS Y FINANZAS DE LA FECHA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Facturado</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <DollarSign size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-zinc-950 font-mono">
                  ${summary.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-xs text-zinc-400 font-mono block">
                  Bs. {summary.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Ventas & Documentos</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Receipt size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-zinc-950 font-mono">
                  {summary.validCount}
                </div>
                <span className="text-xs text-zinc-400 block">
                  {summary.fiscalCount} fiscales SENIAT {summary.voidedCount > 0 ? `· ${summary.voidedCount} anuladas` : ''}
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Efectivo en Gaveta ($)</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Banknote size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-700 font-mono">
                  ${summary.cashUsd.toFixed(2)}
                </div>
                <span className="text-xs text-zinc-400 block">
                  Efectivo Bs: Bs. {summary.cashBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tasa BCV Oficial</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-zinc-950 font-mono">
                  Bs. {exchangeRate.toFixed(2)}
                </div>
                <span className="text-xs text-zinc-400 font-mono block">
                  IGTF 3%: ${summary.igtfUsd.toFixed(2)}
                </span>
              </div>
            </div>

            {/* DESGLOSE POR MÉTODOS DE PAGO */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
              <h2 className="font-extrabold text-sm text-zinc-950">Desglose de Recaudación del Turno</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <Banknote size={15} />
                    <span>Efectivo Divisas ($ USD)</span>
                  </div>
                  <span className="text-xl font-bold text-emerald-950 font-mono block">
                    ${summary.cashUsd.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-mono block">
                    Debe existir en billetes físicos
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                    <Banknote size={15} />
                    <span>Efectivo Bolívares (Bs)</span>
                  </div>
                  <span className="text-xl font-bold text-teal-950 font-mono block">
                    Bs. {summary.cashBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-teal-700 font-mono block">
                    ${(summary.cashBs / exchangeRate).toFixed(2)} equiv.
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <Smartphone size={15} />
                    <span>Pago Móvil (Bs)</span>
                  </div>
                  <span className="text-xl font-bold text-blue-950 font-mono block">
                    Bs. {summary.pagoMovilBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-blue-700 font-mono block">
                    ${(summary.pagoMovilBs / exchangeRate).toFixed(2)} equiv.
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                    <CreditCard size={15} />
                    <span>Punto de Venta / Tarjetas (Bs)</span>
                  </div>
                  <span className="text-xl font-bold text-sky-950 font-mono block">
                    Bs. {summary.cardBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-sky-700 font-mono block">
                    ${(summary.cardBs / exchangeRate).toFixed(2)} equiv.
                  </span>
                </div>
              </div>
            </div>

            {/* ARQUEO FÍSICO DE GAVETA (DUAL $ Y BS) */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                <DollarSign size={18} className="text-emerald-600" />
                <div>
                  <h2 className="font-extrabold text-sm text-zinc-950">Arqueo Físico de Gaveta (Conteo Real en Caja)</h2>
                  <p className="text-xs text-zinc-500">Ingresa el dinero físico contado en caja para verificar si la caja cuadra a la perfección.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Conteo Efectivo USD */}
                <div className="space-y-3 p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                  <span className="text-xs font-bold text-zinc-700 block uppercase tracking-wider">Efectivo en Dólares ($ USD)</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-500 block mb-1">Efectivo Sistema ($):</label>
                      <div className="px-3 py-2 rounded-lg bg-white border border-zinc-200 font-mono font-bold text-sm text-zinc-800">
                        ${summary.cashUsd.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-700 block mb-1">Contado en Gaveta ($):</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={physicalCashUSD}
                        onChange={(e) => setPhysicalCashUSD(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-300 font-mono font-bold text-sm focus:outline-none focus:border-zinc-950"
                      />
                    </div>
                  </div>

                  <div className={`px-3 py-2 rounded-lg border font-mono font-bold text-xs flex items-center justify-between ${
                    physicalCashUSD === ''
                      ? 'border-zinc-200 bg-white text-zinc-400'
                      : summary.diffUsd === 0
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : summary.diffUsd > 0
                          ? 'border-blue-300 bg-blue-50 text-blue-800'
                          : 'border-rose-300 bg-rose-50 text-rose-800'
                  }`}>
                    <span>Diferencia USD: {summary.diffUsd >= 0 ? `+$${summary.diffUsd.toFixed(2)}` : `-$${Math.abs(summary.diffUsd).toFixed(2)}`}</span>
                    <span className="font-sans text-[11px]">
                      {physicalCashUSD === ''
                        ? 'Esperando conteo'
                        : summary.diffUsd === 0
                          ? '✅ Cuadre Perfecto'
                          : summary.diffUsd > 0
                            ? '⬆️ Sobrante en Caja'
                            : '⚠️ Faltante en Caja'}
                    </span>
                  </div>
                </div>

                {/* Conteo Efectivo Bs */}
                <div className="space-y-3 p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                  <span className="text-xs font-bold text-zinc-700 block uppercase tracking-wider">Efectivo en Bolívares (Bs)</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-500 block mb-1">Efectivo Sistema (Bs):</label>
                      <div className="px-3 py-2 rounded-lg bg-white border border-zinc-200 font-mono font-bold text-sm text-zinc-800 truncate">
                        Bs. {summary.cashBs.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-700 block mb-1">Contado en Gaveta (Bs):</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={physicalCashBs}
                        onChange={(e) => setPhysicalCashBs(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-300 font-mono font-bold text-sm focus:outline-none focus:border-zinc-950"
                      />
                    </div>
                  </div>

                  <div className={`px-3 py-2 rounded-lg border font-mono font-bold text-xs flex items-center justify-between ${
                    physicalCashBs === ''
                      ? 'border-zinc-200 bg-white text-zinc-400'
                      : summary.diffBs === 0
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : summary.diffBs > 0
                          ? 'border-blue-300 bg-blue-50 text-blue-800'
                          : 'border-rose-300 bg-rose-50 text-rose-800'
                  }`}>
                    <span>Diferencia Bs: {summary.diffBs >= 0 ? `+Bs. ${summary.diffBs.toFixed(2)}` : `-Bs. ${Math.abs(summary.diffBs).toFixed(2)}`}</span>
                    <span className="font-sans text-[11px]">
                      {physicalCashBs === ''
                        ? 'Esperando conteo'
                        : summary.diffBs === 0
                          ? '✅ Cuadre Perfecto'
                          : summary.diffBs > 0
                            ? '⬆️ Sobrante en Caja'
                            : '⚠️ Faltante en Caja'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Observaciones / Notas del Cierre:</label>
                <textarea
                  rows={2}
                  placeholder="Notas del cajero, justificación de diferencias, compras menores de emergencia pagadas con efectivo de gaveta..."
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-xs focus:outline-none focus:border-zinc-950 bg-zinc-50/50"
                />
              </div>
            </div>

            {/* TABLA DE FACTURAS DEL DÍA CON GESTIÓN PARA CUADRAR CAJA ("SI NO CUADRA LA CAJA PODER ARREGLARLO") */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-zinc-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="font-extrabold text-sm text-zinc-950">
                    Facturas de la Jornada ({summary.validCount} válidas {summary.voidedCount > 0 ? `· ${summary.voidedCount} anuladas` : ''})
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Si hay un error o descuadre de caja, anula la factura errónea para excluirla inmediatamente del balance de caja y del libro SENIAT.
                  </p>
                </div>

                <div className="relative max-w-xs w-full">
                  <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Buscar por factura, cliente o RIF..."
                    value={searchInvoiceQuery}
                    onChange={(e) => setSearchInvoiceQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400 bg-zinc-50/50"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Comprobante</th>
                      <th className="py-3 px-4">Hora</th>
                      <th className="py-3 px-4">Cliente / RIF</th>
                      <th className="py-3 px-4">Método de Pago</th>
                      <th className="py-3 px-4 text-right">Total ($)</th>
                      <th className="py-3 px-4 text-right">Total (Bs)</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-center">Acciones para Cuadre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredDateInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-zinc-400">
                          No hay facturas registradas en la fecha {selectedDate}.
                        </td>
                      </tr>
                    ) : (
                      filteredDateInvoices.map((inv) => {
                        const stat = (inv.status || '').toLowerCase();
                        const isVoided = stat === 'voided' || stat === 'anulada';
                        const isFiscal = Boolean(inv.isFiscalInvoice || inv.docType === 'fiscal');
                        const usd = Number(inv.total || inv.totalUSD || inv.totalUsd || 0);
                        const invRate = Number(inv.exchangeRate) || exchangeRate;
                        const bs = Number(inv.totalBs || usd * invRate);
                        const method = (inv.paymentMethod || 'efectivo_usd').toLowerCase();
                        const bankInfo = inv.pagoMovilBank ? findBank(inv.pagoMovilBank) : null;

                        return (
                          <tr
                            key={inv.id || inv.invoiceNumber}
                            className={`transition-colors ${
                              isVoided ? 'bg-rose-50/50 text-zinc-400' : 'hover:bg-zinc-50/80'
                            }`}
                          >
                            <td className="py-3 px-4">
                              <span className={`font-mono font-bold block ${isVoided ? 'line-through text-rose-600' : 'text-zinc-950'}`}>
                                #{inv.invoiceNumber || inv.id}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                isFiscal ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-700'
                              }`}>
                                {isFiscal ? 'Fiscal SENIAT' : 'Nota de Entrega'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-zinc-500 text-[11px]">
                              {inv.date ? inv.date.slice(11, 16) || 'Hoy' : 'Hoy'}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-zinc-900 block truncate max-w-[170px]">
                                {getClientDisplayName(inv)}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500">
                                {getClientRif(inv)}
                              </span>
                              {isVoided && inv.voidReason && (
                                <span className="text-[10px] text-rose-700 block font-semibold mt-0.5">
                                  Motivo: {inv.voidReason}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                {bankInfo && <BankLogo code={bankInfo.code} size={18} />}
                                <div>
                                  <span className="capitalize font-semibold text-zinc-800 block text-[11px]">
                                    {method.replace('_', ' ')}
                                  </span>
                                  {inv.pagoMovilRef && (
                                    <span className="text-[10px] font-mono text-blue-700 block">
                                      Ref: {inv.pagoMovilRef}
                                    </span>
                                  )}
                                  {inv.puntoLote && (
                                    <span className="text-[10px] font-mono text-sky-700 block">
                                      Lote: {inv.puntoLote}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className={`py-3 px-4 text-right font-mono font-bold ${isVoided ? 'line-through text-zinc-400' : 'text-zinc-950'}`}>
                              ${usd.toFixed(2)}
                            </td>
                            <td className={`py-3 px-4 text-right font-mono text-[11px] ${isVoided ? 'line-through text-zinc-400' : 'text-zinc-500'}`}>
                              Bs. {bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isVoided ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                                  Anulada
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  Activa
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedInvoice(inv)}
                                  className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer"
                                  title="Ver detalle de factura / comanda"
                                >
                                  <Eye size={14} />
                                </button>

                                {!isVoided ? (
                                  <button
                                    type="button"
                                    onClick={() => setInvoiceToVoid(inv)}
                                    className="p-1 rounded-lg hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                                    title="Anular factura para arreglar descuadre de caja"
                                  >
                                    <XCircle size={14} />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreInvoice(inv)}
                                    className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                                    title="Restaurar factura anulada"
                                  >
                                    <RotateCcw size={14} />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setInvoiceToDelete(inv)}
                                  className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Eliminar factura de prueba"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* TAB HISTORIAL DE CIERRES ANTERIORES */
          <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <History size={18} className="text-zinc-600" />
                <h2 className="font-extrabold text-sm text-zinc-950">Historial Oficial de Cierres Z ({cashCloses.length})</h2>
              </div>
              <span className="text-xs text-zinc-500">Registros permanentes archivados</span>
            </div>

            {cashCloses.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs">
                No hay cierres Z emitidos en el historial todavía.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 text-xs font-mono">
                {cashCloses.map((c) => (
                  <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-zinc-50 px-2 rounded-xl transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-950 font-sans text-sm">
                          Cierre #{c.id}
                        </span>
                        <span className="text-zinc-500 font-sans text-xs">
                          {c.date?.slice(0, 16).replace('T', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-zinc-500 text-[11px] font-sans mt-0.5">
                        <span>{c.invoicesCount || 0} facturas procesadas</span>
                        {c.notes && <span className="italic text-zinc-400">· "{c.notes}"</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-bold text-zinc-950 block text-sm">${Number(c.totalUsd || 0).toFixed(2)}</span>
                        <span className="text-[10px] text-zinc-400">Bs. {Number(c.totalBs || 0).toFixed(2)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReceiptModal({
                              type: 'Z',
                              data: c
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <Printer size={12} />
                          <span>Ticket</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Eliminar registro histórico del Cierre Z #${c.id}?`)) {
                              if (deleteCashClose) deleteCashClose(c.id);
                              showToast('Cierre eliminado del historial.');
                            }
                          }}
                          className="p-1 rounded-lg hover:bg-rose-100 text-zinc-400 hover:text-rose-700 transition-colors cursor-pointer"
                          title="Eliminar registro"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL PARA ANULAR FACTURA Y ARREGLAR CUADRE */}
      {invoiceToVoid && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setInvoiceToVoid(null)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-3">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-950">
                  Anular Factura #{invoiceToVoid.invoiceNumber || invoiceToVoid.id}
                </h3>
                <p className="text-xs text-zinc-500">
                  {getClientDisplayName(invoiceToVoid)} · ${Number(invoiceToVoid.total || invoiceToVoid.totalUSD || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Al anular esta factura, se descontará inmediatamente de las ventas del día y del efectivo en gaveta para que tu caja cuadre con el conteo físico.
            </p>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">Motivo de la anulación:</label>
              <input
                type="text"
                placeholder="Ej. Cobro duplicado, cliente canceló, error de método de pago..."
                value={voidReasonText}
                onChange={(e) => setVoidReasonText(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-xs focus:outline-none focus:border-zinc-950 bg-zinc-50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceToVoid(null)}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmVoidInvoice}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Sí, Anular Factura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA ELIMINAR FACTURA PERMANENTEMENTE */}
      {invoiceToDelete && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setInvoiceToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl border border-rose-300 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-3">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-950">
                  ¿Eliminar Factura #{invoiceToDelete.invoiceNumber || invoiceToDelete.id}?
                </h3>
                <p className="text-xs text-zinc-500">
                  {getClientDisplayName(invoiceToDelete)} · ${Number(invoiceToDelete.total || invoiceToDelete.totalUSD || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <p className="text-xs text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200">
              ⚠️ Esta acción borrará la factura permanentemente de todo el sistema (Cierre de Caja, Dashboard y Libros SENIAT).
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteInvoice}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE REINICIAR Y PONER CAJA EN 0 */}
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowResetModal(false)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-3">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-950">Reiniciar y Poner Caja en 0</h3>
                <p className="text-xs text-zinc-500">Dejar contadores y balances en $0.00 / Bs 0.00</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Selecciona el alcance del reinicio que deseas aplicar:
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleResetCurrentDateCash}
                className="w-full text-left p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/60 transition-colors cursor-pointer space-y-1"
              >
                <span className="font-bold text-xs text-amber-950 block">
                  Opción A: Poner en 0 SOLO la Fecha {selectedDate} ({summary.totalInvoices} facturas)
                </span>
                <span className="text-[11px] text-amber-800 block">
                  Elimina únicamente las ventas y el cierre de este día. Las ventas de otros días se conservan intactas.
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('⚠️ ADVERTENCIA: ¿Está seguro de borrar TODAS las ventas históricas de prueba de todo el sistema y dejar la app como nueva en 0?')) {
                    handleResetAllSystemSales();
                  }
                }}
                className="w-full text-left p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/60 transition-colors cursor-pointer space-y-1"
              >
                <span className="font-bold text-xs text-rose-950 block">
                  Opción B: Reset Total de Todo el Sistema (Limpieza Completa)
                </span>
                <span className="text-[11px] text-rose-800 block">
                  Borra todas las ventas históricas, cierres y pagos de todas las fechas. Deja la contabilidad en blanco desde cero.
                </span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

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
              {Number(activeReceiptModal.data.cashBs || 0) > 0 && (
                <div className="flex justify-between text-teal-800">
                  <span>Efectivo (Bs):</span>
                  <span className="font-bold">Bs. {activeReceiptModal.data.cashBs?.toFixed(2)}</span>
                </div>
              )}
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
        onSyncZReports={(records, serial) => syncZReports && syncZReports(records, serial)}
        posInvoices={invoices}
        exchangeRate={exchangeRate}
      />

      {/* MODAL PREVIEW DE FACTURA COMPLETA */}
      {selectedInvoice && (
        <InvoicePreview
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* TOAST FLOTANTE */}
      {toastMessage && (
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 text-white animate-in fade-in slide-in-from-bottom-2 ${
          toastMessage.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          <span>{toastMessage.msg}</span>
        </div>
      )}
    </div>
  );
}
