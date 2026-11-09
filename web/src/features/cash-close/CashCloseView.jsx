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
  ChevronRight,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Check
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

  const {
    createCashClose,
    addCashClose,
    addZReport,
    voidInvoice,
    restoreInvoice,
    deleteInvoice,
    deleteCashClose,
    clearInvoicesByDate,
    clearAllSalesData,
    currentLocalDate
  } = data;

  // Fecha seleccionada (por defecto hoy, sincronizada a medianoche)
  const [selectedDate, setSelectedDate] = useState(() => currentLocalDate || getTodayLocalDateStr());
  const [activeTab, setActiveTab] = useState('cierre'); // 'cierre' | 'historial'
  const [invoiceFilter, setInvoiceFilter] = useState('all'); // 'all' | 'fiscal' | 'nota' | 'voided'

  // Arqueo físico de gaveta (Dual $ USD y Bs)
  const [physicalCashUSD, setPhysicalCashUSD] = useState('');
  const [physicalCashBs, setPhysicalCashBs] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Estados de hardware fiscal y modales
  const [activeReceiptModal, setActiveReceiptModal] = useState(null); // 'X' | 'Z'
  const [isProcessingFiscal, setIsProcessingFiscal] = useState(false);
  const [isFiscalMemoryModalOpen, setIsFiscalMemoryModalOpen] = useState(false);
  const [showFiscalToolsModal, setShowFiscalToolsModal] = useState(false);
  const [s1StatusData, setS1StatusData] = useState(null);

  // Modales de auditoría
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

  // Sincronización automática de medianoche
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
    let voidedTotalUsd = 0;
    let fiscalCount = 0;
    let notaCount = 0;

    // Conteo por métodos de pago
    const methodCounts = {
      cashUsd: 0,
      cashBs: 0,
      pagoMovil: 0,
      card: 0,
      zelle: 0
    };

    dateInvoices.forEach((inv) => {
      const stat = (inv.status || '').toLowerCase();
      const isVoided = stat === 'voided' || stat === 'anulada';
      const isFiscal = Boolean(inv.isFiscalInvoice || inv.docType === 'fiscal');
      const usd = Number(inv.total || inv.totalUSD || inv.totalUsd || 0);
      const invRate = Number(inv.exchangeRate) || exchangeRate;
      const bs = Number(inv.totalBs || usd * invRate);
      const igtf = Number(inv.igtfUsd || (inv.igtfBs ? inv.igtfBs / invRate : 0));

      if (isVoided) {
        voidedCount++;
        voidedTotalUsd += usd;
        return; // Facturas anuladas NO suman en recaudación ni en gaveta
      }

      validCount++;
      if (isFiscal) fiscalCount++;
      else notaCount++;

      totalUsd += usd;
      totalBs += bs;
      igtfUsd += igtf;

      const m = (inv.paymentMethod || 'efectivo_usd').toLowerCase();
      if (m === 'efectivo_usd' || m === 'usd_cash' || m === 'cash') {
        cashUsd += usd;
        methodCounts.cashUsd++;
      } else if (m === 'efectivo_bs') {
        cashBs += bs;
        methodCounts.cashBs++;
      } else if (m === 'pago_movil') {
        pagoMovilBs += bs;
        methodCounts.pagoMovil++;
      } else if (m === 'punto' || m === 'pos' || m === 'tarjeta') {
        cardBs += bs;
        methodCounts.card++;
      } else if (m === 'zelle') {
        zelleUsd += usd;
        methodCounts.zelle++;
      } else if (m === 'mixto') {
        const cUsd = Number(inv.paymentDetails?.cashUsd || 0);
        const cBs = Number(inv.paymentDetails?.cashBs || 0);
        const pmBs = Number(inv.paymentDetails?.pagoMovilBs || 0);
        const ptBs = Number(inv.paymentDetails?.puntoBs || 0);
        const zUsd = Number(inv.paymentDetails?.zelleUsd || 0);
        if (cUsd > 0) { cashUsd += cUsd; methodCounts.cashUsd++; }
        if (cBs > 0) { cashBs += cBs; methodCounts.cashBs++; }
        if (pmBs > 0) { pagoMovilBs += pmBs; methodCounts.pagoMovil++; }
        if (ptBs > 0) { cardBs += ptBs; methodCounts.card++; }
        if (zUsd > 0) { zelleUsd += zUsd; methodCounts.zelle++; }
      } else {
        cardBs += bs;
        methodCounts.card++;
      }
    });

    const enteredUsd = physicalCashUSD !== '' ? Number(physicalCashUSD) : null;
    const diffUsd = enteredUsd !== null ? enteredUsd - cashUsd : 0;

    const enteredBs = physicalCashBs !== '' ? Number(physicalCashBs) : null;
    const diffBs = enteredBs !== null ? enteredBs - cashBs : 0;

    // Determinar estado de cuadre general
    let drawerStatus = 'waiting'; // 'waiting' | 'perfect' | 'discrepancy'
    if (enteredUsd !== null || enteredBs !== null) {
      const isUsdOk = enteredUsd === null || Math.abs(diffUsd) < 0.01;
      const isBsOk = enteredBs === null || Math.abs(diffBs) < 0.01;
      drawerStatus = (isUsdOk && isBsOk) ? 'perfect' : 'discrepancy';
    }

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
      voidedTotalUsd,
      fiscalCount,
      notaCount,
      totalInvoices: dateInvoices.length,
      methodCounts,
      enteredUsd,
      diffUsd,
      enteredBs,
      diffBs,
      drawerStatus
    };
  }, [dateInvoices, physicalCashUSD, physicalCashBs, exchangeRate]);

  // Cierre previo guardado para la fecha
  const existingCloseForDate = useMemo(() => {
    return (cashCloses || []).find((c) => {
      const cDate = (c.date || '').includes('T') ? c.date.split('T')[0] : (c.date || '').slice(0, 10);
      return cDate === selectedDate;
    });
  }, [cashCloses, selectedDate]);

  // Facturas filtradas por buscador y categoría
  const filteredInvoices = useMemo(() => {
    let list = dateInvoices;

    if (invoiceFilter === 'fiscal') {
      list = list.filter((inv) => (inv.status || '').toLowerCase() !== 'voided' && Boolean(inv.isFiscalInvoice || inv.docType === 'fiscal'));
    } else if (invoiceFilter === 'nota') {
      list = list.filter((inv) => (inv.status || '').toLowerCase() !== 'voided' && !inv.isFiscalInvoice && inv.docType !== 'fiscal');
    } else if (invoiceFilter === 'voided') {
      list = list.filter((inv) => (inv.status || '').toLowerCase() === 'voided' || (inv.status || '').toLowerCase() === 'anulada');
    }

    if (!searchInvoiceQuery.trim()) return list;
    const q = searchInvoiceQuery.toLowerCase();
    return list.filter((inv) => {
      const num = String(inv.invoiceNumber || inv.id || '').toLowerCase();
      const cli = String(inv.client?.name || inv.clientName || '').toLowerCase();
      const rif = String(inv.client?.rif || inv.clientRif || '').toLowerCase();
      return num.includes(q) || cli.includes(q) || rif.includes(q);
    });
  }, [dateInvoices, invoiceFilter, searchInvoiceQuery]);

  const getClientDisplayName = (inv) => {
    if (inv.client?.name) return inv.client.name;
    if (inv.clientName) return inv.clientName;
    const found = clients.find((c) => c.id === inv.clientId);
    return found ? found.name : 'Consumidor Final';
  };

  const getClientRif = (inv) => {
    if (inv.client?.rif) return inv.client.rif;
    if (inv.clientRif || inv.clientCedula) return inv.clientRif || inv.clientCedula;
    const found = clients.find((c) => c.id === inv.clientId);
    return found ? (found.rif || found.cedula) : 'V-00000000';
  };

  // Test conexión e información S1
  const handleTestFiscalConnection = async () => {
    setIsProcessingFiscal(true);
    const port = fiscalSettings.port || 'COM2';
    try {
      if (isElectron && window?.electronAPI?.fiscal?.getS1Status) {
        const s1 = await window.electronAPI.fiscal.getS1Status(port);
        if (s1 && s1.success !== false) {
          setS1StatusData(s1);
          showToast(`Impresora fiscal HKA80 conectada en ${port}. Acumuladores al día.`);
          return;
        }
      }
      if (isElectron && data?.fiscalGetS1Status) {
        const s1 = await data.fiscalGetS1Status(port);
        if (s1 && s1.success !== false) {
          setS1StatusData(s1);
          showToast(`Impresora fiscal conectada en ${port}.`);
          return;
        }
      }
      showToast('Modo Web: Conexión fiscal simulada activa.');
    } catch (e) {
      showToast(`Error de puerto fiscal: ${e.message}`, 'error');
    } finally {
      setIsProcessingFiscal(false);
    }
  };

  // Reporte X (Corte Parcial)
  const handleExecuteReportX = async () => {
    if (isElectron && data?.fiscalPrintReportX) {
      setIsProcessingFiscal(true);
      try {
        const res = await data.fiscalPrintReportX(fiscalSettings.port || 'COM2');
        if (res && res.success === false) {
          showToast(`Aviso impresora: ${res.error || 'Verifique papel'}`, 'error');
        } else {
          showToast('¡Reporte X impreso con éxito en máquina fiscal!');
        }
      } catch (err) {
        console.warn('Error reporte X fiscal:', err);
      } finally {
        setIsProcessingFiscal(false);
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

  // Cierre Z Definitivo
  const handleExecuteCloseZ = async () => {
    if (!window.confirm(`¿Confirmar Cierre de Caja y Reporte Z para la fecha ${selectedDate}? Esta acción emite el cierre contable del día.`)) {
      return;
    }

    setIsProcessingFiscal(true);

    if (isElectron && data?.fiscalPrintReportZ) {
      try {
        const res = await data.fiscalPrintReportZ(fiscalSettings.port || 'COM2');
        if (res && res.success === false) {
          alert(`Aviso Impresora Fiscal: ${res.error || 'Verifique la conexión COM2'}`);
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
      notes: closingNotes || 'Cierre diario de jornada'
    };

    if (createCashClose) {
      createCashClose(closeRecord);
    } else if (addCashClose) {
      addCashClose(closeRecord);
    }

    // Registrar en Z reports para la exportación SENIAT
    try {
      const fiscalInvs = (dateInvoices || []).filter(inv => {
        const stat = (inv.status || '').toLowerCase();
        if (stat === 'voided' || stat === 'anulada') return false;
        return Boolean(inv.isFiscalInvoice || inv.docType === 'fiscal' || inv.fiscalInvoiceNumber);
      });

      const zTotalBs = summary.totalBs;
      const zBaseBs = zTotalBs / 1.16;
      const zIvaBs = zTotalBs - zBaseBs;

      const zItem = {
        id: 'z-rec-' + Date.now(),
        zNumber: (cashCloses.length + 1).toString().padStart(4, '0'),
        date: selectedDate,
        dateStr: selectedDate,
        machineSerial: s1StatusData?.registered_machine_number || 'Z1B8049210',
        firstInvoice: fiscalInvs[0]?.fiscalInvoiceNumber || fiscalInvs[0]?.invoiceNumber || '00000001',
        lastInvoice: fiscalInvs[fiscalInvs.length - 1]?.fiscalInvoiceNumber || fiscalInvs[fiscalInvs.length - 1]?.invoiceNumber || '00000001',
        fiscalInvoiceCount: fiscalInvs.length,
        totalSalesBs: zTotalBs,
        baseGeneral16Bs: zBaseBs,
        ivaGeneral16Bs: zIvaBs,
        exemptSalesBs: 0,
        igtfSalesBs: summary.igtfUsd * exchangeRate,
        dailyAudit: closeRecord
      };

      if (addZReport) {
        addZReport(zItem);
      }
    } catch (e) {
      console.warn('Error registrando Z report:', e);
    }

    setIsProcessingFiscal(false);
    showToast(`¡Cierre de Caja del ${selectedDate} registrado exitosamente!`);

    setActiveReceiptModal({
      type: 'Z',
      data: closeRecord
    });
  };

  // Desatascar documento fiscal
  const handleCancelTruncatedDocument = async () => {
    setIsProcessingFiscal(true);
    try {
      if (isElectron && window?.electronAPI?.fiscal?.cancelDocument) {
        await window.electronAPI.fiscal.cancelDocument(fiscalSettings.port || 'COM2');
      }
      showToast('Comando de anulación enviado a la impresora fiscal.');
    } catch (err) {
      showToast(`Error al enviar comando: ${err.message}`, 'error');
    } finally {
      setIsProcessingFiscal(false);
    }
  };

  // Anular factura para cuadrar caja
  const handleConfirmVoidInvoice = () => {
    if (!invoiceToVoid) return;
    if (voidInvoice) {
      voidInvoice(invoiceToVoid.id, voidReasonText || 'Corrección de caja y forma de pago');
      showToast(`Factura #${invoiceToVoid.invoiceNumber || invoiceToVoid.id} anulada y excluida de caja.`);
    }
    setInvoiceToVoid(null);
    setVoidReasonText('');
  };

  // Restaurar factura anulada
  const handleRestoreInvoice = (inv) => {
    if (!inv) return;
    if (restoreInvoice) {
      restoreInvoice(inv.id);
      showToast(`Factura #${inv.invoiceNumber || inv.id} restaurada con éxito.`);
    }
  };

  // Eliminar factura de prueba
  const handleConfirmDeleteInvoice = () => {
    if (!invoiceToDelete) return;
    if (deleteInvoice) {
      deleteInvoice(invoiceToDelete.id);
      showToast(`Factura #${invoiceToDelete.invoiceNumber || invoiceToDelete.id} eliminada.`, 'info');
    }
    setInvoiceToDelete(null);
  };

  // Reiniciar solo la fecha seleccionada
  const handleResetCurrentDateCash = () => {
    if (clearInvoicesByDate) clearInvoicesByDate(selectedDate);
    if (deleteCashClose) deleteCashClose(selectedDate);
    setShowResetModal(false);
    showToast(`Caja de la fecha ${selectedDate} reiniciada a $0.00.`);
  };

  // Reset total del sistema
  const handleResetAllSystemSales = () => {
    if (clearAllSalesData) clearAllSalesData();
    setShowResetModal(false);
    showToast('Todo el sistema ha sido reseteado a 0.');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-y-auto select-none">
      
      {/* HEADER PRINCIPAL LIMPIO (ESTILO NOTION / LINEAR) */}
      <header className="bg-white border-b border-zinc-200/80 px-6 py-3.5 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Título & Estado del Día */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <Calculator size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-zinc-950 tracking-tight">Cierre & Arqueo de Caja</h1>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 border ${
                  existingCloseForDate
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${existingCloseForDate ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                  <span>{existingCloseForDate ? 'Cierre Z Registrado' : `Turno Abierto · ${summary.validCount} ventas`}</span>
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Verifica el efectivo físico de gaveta, concilia canales bancarios y emite el Cierre Z fiscal.
              </p>
            </div>
          </div>

          {/* Selector de Fecha, Pestañas y Acciones */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Pestañas Cierre vs Historial */}
            <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl text-xs font-bold border border-zinc-200/80">
              <button
                type="button"
                onClick={() => setActiveTab('cierre')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'cierre' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Cierre del Día
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('historial')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'historial' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <History size={13} />
                <span>Historial ({cashCloses.length})</span>
              </button>
            </div>

            {/* Selector de Fecha */}
            <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-xl px-2.5 py-1 shadow-2xs">
              <Calendar size={13} className="text-zinc-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-bold bg-transparent text-zinc-800 focus:outline-none cursor-pointer"
              />
              {selectedDate !== (currentLocalDate || getTodayLocalDateStr()) && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(currentLocalDate || getTodayLocalDateStr())}
                  className="text-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors"
                  title="Volver al día de hoy"
                >
                  Hoy
                </button>
              )}
            </div>

            {/* Acciones Rápidas */}
            <button
              type="button"
              disabled={isProcessingFiscal}
              onClick={handleExecuteReportX}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
              title="Emitir Reporte X parcial sin cerrar el turno contable"
            >
              <Printer size={13} className="text-zinc-500" />
              <span>Reporte X</span>
            </button>

            <button
              type="button"
              disabled={isProcessingFiscal}
              onClick={handleExecuteCloseZ}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              title="Realizar Cierre Z definitivo y archivar la jornada"
            >
              <Lock size={13} className="text-emerald-400" />
              <span>Cierre Z Fiscal</span>
            </button>

            {/* Herramientas Secundarias */}
            <button
              type="button"
              onClick={() => setShowFiscalToolsModal(true)}
              className="p-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-600 cursor-pointer shadow-2xs transition-colors"
              title="Opciones avanzadas, impresora fiscal y reinicio"
            >
              <SlidersHorizontal size={14} />
            </button>

          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-5 max-w-7xl w-full mx-auto space-y-5">
        
        {activeTab === 'cierre' ? (
          <>
            {/* 1. LAS 3 TARJETAS MAESTRAS DE RESUMEN (VISIBLES, CLARAS, SIN REPETICIÓN) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              
              {/* Tarjeta 1: Total Facturado */}
              <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-500 text-xs font-bold uppercase tracking-wider">
                  <span>Total Facturado</span>
                  <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
                    <Receipt size={14} />
                  </div>
                </div>
                <div className="my-2">
                  <div className="text-2xl font-black font-mono text-zinc-950">
                    ${summary.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs font-mono font-bold text-zinc-500 mt-0.5">
                    Bs. {summary.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-2 border-t border-zinc-100">
                  <span>{summary.validCount} ventas activas</span>
                  <span className="font-mono text-zinc-500">Tasa: {exchangeRate.toFixed(2)} Bs</span>
                </div>
              </div>

              {/* Tarjeta 2: Dinero Cobrado Real */}
              <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-500 text-xs font-bold uppercase tracking-wider">
                  <span>Dinero en Caja & Bancos</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <DollarSign size={14} />
                  </div>
                </div>
                <div className="my-2">
                  <div className="text-2xl font-black font-mono text-emerald-700">
                    ${summary.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-600 mt-0.5">
                    ${summary.cashUsd.toFixed(2)} en efectivo · ${(summary.totalUsd - summary.cashUsd).toFixed(2)} en bancos
                  </div>
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-2 border-t border-zinc-100">
                  <span>Excluye facturas anuladas</span>
                  {summary.voidedCount > 0 && (
                    <span className="text-rose-600 font-bold">({summary.voidedCount} anuladas)</span>
                  )}
                </div>
              </div>

              {/* Tarjeta 3: Estado del Arqueo de Gaveta */}
              <div className={`p-4 rounded-2xl border shadow-2xs flex flex-col justify-between transition-all ${
                summary.drawerStatus === 'perfect'
                  ? 'bg-emerald-50/60 border-emerald-300'
                  : summary.drawerStatus === 'discrepancy'
                  ? 'bg-amber-50/60 border-amber-300'
                  : 'bg-white border-zinc-200/90'
              }`}>
                <div className="flex items-center justify-between text-zinc-500 text-xs font-bold uppercase tracking-wider">
                  <span className={summary.drawerStatus === 'perfect' ? 'text-emerald-900' : summary.drawerStatus === 'discrepancy' ? 'text-amber-900' : 'text-zinc-600'}>
                    Cuadre de Gaveta Física
                  </span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    summary.drawerStatus === 'perfect'
                      ? 'bg-emerald-200 text-emerald-800'
                      : summary.drawerStatus === 'discrepancy'
                      ? 'bg-amber-200 text-amber-800'
                      : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    {summary.drawerStatus === 'perfect' ? <Check size={14} /> : <Banknote size={14} />}
                  </div>
                </div>

                <div className="my-2">
                  {summary.drawerStatus === 'perfect' ? (
                    <>
                      <div className="text-xl font-black text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 size={20} className="text-emerald-600" />
                        <span>¡Caja Cuadrada!</span>
                      </div>
                      <p className="text-xs text-emerald-800 mt-1 font-medium">
                        El dinero contado coincide exactamente con el sistema.
                      </p>
                    </>
                  ) : summary.drawerStatus === 'discrepancy' ? (
                    <>
                      <div className="text-xl font-black text-amber-950 flex items-center gap-1.5">
                        <AlertTriangle size={20} className="text-amber-600" />
                        <span>Diferencia Detectada</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-amber-900 mt-1">
                        {summary.diffUsd !== 0 && `USD: ${summary.diffUsd > 0 ? '+' : ''}$${summary.diffUsd.toFixed(2)} `}
                        {summary.diffBs !== 0 && `Bs: ${summary.diffBs > 0 ? '+' : ''}Bs. ${summary.diffBs.toFixed(2)}`}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-lg font-bold text-zinc-800">
                        Esperando conteo
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Ingresa en la columna izquierda los billetes contados en gaveta.
                      </p>
                    </>
                  )}
                </div>

                <div className="text-[11px] text-zinc-400 pt-2 border-t border-zinc-200/60">
                  {summary.drawerStatus === 'perfect' ? 'Listo para archivar cierre' : 'Arqueo bimonetario dual ($ / Bs)'}
                </div>
              </div>

            </div>

            {/* 2. ESPACIO DE TRABAJO EQUILIBRADO EN 2 COLUMNAS (MODELO HAPPY DAYS MEJORADO) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* COLUMNA IZQUIERDA (5 de 12 cols = 41%): ARQUEO DE GAVETA & CANALES BANCARIOS */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* BLOQUE A: ARQUEO FÍSICO DE GAVETA (BILLETES EN MANO) */}
                <div className="bg-white p-4.5 rounded-2xl border border-zinc-200/90 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-emerald-100 text-emerald-800">
                        <Banknote size={15} />
                      </div>
                      <h2 className="font-extrabold text-xs text-zinc-950 uppercase tracking-wider">
                        Efectivo en Gaveta (Billetes Físicos)
                      </h2>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-semibold">Conteo Físico</span>
                  </div>

                  {/* Arqueo Dólares en Efectivo ($ USD) */}
                  <div className="p-3 rounded-xl bg-zinc-50/80 border border-zinc-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-800 flex items-center gap-1">
                        <span>💵</span>
                        <span>Dólares ($ USD)</span>
                      </span>
                      <span className="text-[11px] text-zinc-500 font-medium">
                        Sistema espera: <strong className="font-mono text-zinc-950 font-bold">${summary.cashUsd.toFixed(2)}</strong>
                      </span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-2 font-mono font-bold text-zinc-400 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={physicalCashUSD}
                        onChange={(e) => setPhysicalCashUSD(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-zinc-300 font-mono font-bold text-sm text-zinc-950 focus:outline-none focus:border-zinc-950 shadow-2xs"
                      />
                    </div>

                    {/* Resultado en vivo de diferencia USD */}
                    {physicalCashUSD !== '' && (
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono flex items-center justify-between ${
                        summary.diffUsd === 0
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : summary.diffUsd > 0
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}>
                        <span>
                          {summary.diffUsd === 0 ? 'Diferencia: $0.00' : summary.diffUsd > 0 ? `Sobrante: +$${summary.diffUsd.toFixed(2)}` : `Faltante: -$${Math.abs(summary.diffUsd).toFixed(2)}`}
                        </span>
                        <span className="font-sans text-[10px] font-semibold">
                          {summary.diffUsd === 0 ? '✅ Cuadre Exacto' : summary.diffUsd > 0 ? '⬆️ Hay más en gaveta' : '⚠️ Falta dinero'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Arqueo Bolívares en Efectivo (Bs) */}
                  <div className="p-3 rounded-xl bg-zinc-50/80 border border-zinc-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-800 flex items-center gap-1">
                        <span>🇻🇪</span>
                        <span>Bolívares en Efectivo (Bs)</span>
                      </span>
                      <span className="text-[11px] text-zinc-500 font-medium truncate max-w-[170px]">
                        Sistema espera: <strong className="font-mono text-zinc-950 font-bold">Bs. {summary.cashBs.toFixed(2)}</strong>
                      </span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-2 font-mono font-bold text-zinc-400 text-xs">Bs.</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={physicalCashBs}
                        onChange={(e) => setPhysicalCashBs(e.target.value)}
                        className="w-full pl-10 pr-3 py-1.5 rounded-lg bg-white border border-zinc-300 font-mono font-bold text-sm text-zinc-950 focus:outline-none focus:border-zinc-950 shadow-2xs"
                      />
                    </div>

                    {/* Resultado en vivo de diferencia Bs */}
                    {physicalCashBs !== '' && (
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono flex items-center justify-between ${
                        summary.diffBs === 0
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : summary.diffBs > 0
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}>
                        <span>
                          {summary.diffBs === 0 ? 'Diferencia: Bs. 0.00' : summary.diffBs > 0 ? `Sobrante: +Bs. ${summary.diffBs.toFixed(2)}` : `Faltante: -Bs. ${Math.abs(summary.diffBs).toFixed(2)}`}
                        </span>
                        <span className="font-sans text-[10px] font-semibold">
                          {summary.diffBs === 0 ? '✅ Cuadre Exacto' : summary.diffBs > 0 ? '⬆️ Hay más en gaveta' : '⚠️ Falta dinero'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* BLOQUE B: CONCILIACIÓN DE CANALES DIGITALES (BANCOS) */}
                <div className="bg-white p-4.5 rounded-2xl border border-zinc-200/90 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-blue-100 text-blue-800">
                        <Smartphone size={15} />
                      </div>
                      <h2 className="font-extrabold text-xs text-zinc-950 uppercase tracking-wider">
                        Conciliación Bancaria (Digital)
                      </h2>
                    </div>
                    <span className="text-[10px] text-zinc-400">Verifica contra banco</span>
                  </div>

                  <div className="space-y-2">
                    
                    {/* Pago Móvil */}
                    <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-200/70 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                          PM
                        </div>
                        <div>
                          <span className="text-xs font-bold text-zinc-900 block">Pago Móvil (Bs)</span>
                          <span className="text-[10px] text-zinc-500 font-medium">
                            {summary.methodCounts.pagoMovil} {summary.methodCounts.pagoMovil === 1 ? 'operación' : 'operaciones'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="font-bold text-xs text-blue-950">
                          Bs. {summary.pagoMovilBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          ${(summary.pagoMovilBs / exchangeRate).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Punto de Venta / Tarjetas */}
                    <div className="p-2.5 rounded-xl bg-sky-50/50 border border-sky-200/70 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                          <CreditCard size={15} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-zinc-900 block">Punto de Venta (Lote POS)</span>
                          <span className="text-[10px] text-zinc-500 font-medium">
                            {summary.methodCounts.card} {summary.methodCounts.card === 1 ? 'voucher' : 'vouchers'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="font-bold text-xs text-sky-950">
                          Bs. {summary.cardBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          ${(summary.cardBs / exchangeRate).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Zelle */}
                    {summary.zelleUsd > 0 && (
                      <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-200/70 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                            Z
                          </div>
                          <div>
                            <span className="text-xs font-bold text-zinc-900 block">Zelle ($ USD)</span>
                            <span className="text-[10px] text-zinc-500 font-medium">
                              {summary.methodCounts.zelle} {summary.methodCounts.zelle === 1 ? 'transferencia' : 'transferencias'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="font-bold text-xs text-purple-950">
                            ${summary.zelleUsd.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            Bs. {(summary.zelleUsd * exchangeRate).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* BLOQUE C: OBSERVACIONES & BOTÓN DE CIERRE */}
                <div className="bg-white p-4.5 rounded-2xl border border-zinc-200/90 shadow-xs space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-700 block mb-1 uppercase tracking-wider">
                      Observaciones del Turno (Opcional):
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ej: $5 de gaveta para comprar hielo de emergencia, vuelto pendiente..."
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 bg-zinc-50/40"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isProcessingFiscal}
                    onClick={handleExecuteCloseZ}
                    className="w-full py-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-extrabold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Lock size={14} className="text-emerald-400" />
                    <span>Guardar Cierre de Caja & Imprimir Ticket</span>
                  </button>
                </div>

              </div>

              {/* COLUMNA DERECHA (7 de 12 cols = 59%): FACTURAS DE LA JORNADA & RESOLUCIÓN DE ERRORES */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden flex flex-col">
                
                {/* Header de la Tabla */}
                <div className="p-4 border-b border-zinc-200/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h2 className="font-black text-sm text-zinc-950 flex items-center gap-2">
                        <span>Facturas de la Jornada</span>
                        <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-zinc-100 text-zinc-700 font-bold">
                          {summary.validCount}
                        </span>
                      </h2>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Si la caja no cuadra, anula la factura errónea para corregir el balance de inmediato.
                      </p>
                    </div>

                    {/* Buscador Rápido */}
                    <div className="relative max-w-xs w-full">
                      <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Buscar por factura, cliente o RIF..."
                        value={searchInvoiceQuery}
                        onChange={(e) => setSearchInvoiceQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs bg-zinc-50/50 text-zinc-800 focus:outline-none focus:border-zinc-400 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Filtros por Categoría */}
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    {[
                      { id: 'all', label: `Todas (${summary.totalInvoices})` },
                      { id: 'fiscal', label: `Fiscales (${summary.fiscalCount})` },
                      { id: 'nota', label: `Notas (${summary.notaCount})` },
                      { id: 'voided', label: `Anuladas (${summary.voidedCount})` }
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setInvoiceFilter(f.id)}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] ${
                          invoiceFilter === f.id
                            ? 'bg-zinc-900 text-white shadow-2xs'
                            : 'bg-zinc-100 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tabla de Facturas */}
                <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-400 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 backdrop-blur-xs">
                      <tr>
                        <th className="py-2.5 px-3.5">N° / Tipo</th>
                        <th className="py-2.5 px-3">Hora</th>
                        <th className="py-2.5 px-3">Cliente</th>
                        <th className="py-2.5 px-3">Método</th>
                        <th className="py-2.5 px-3 text-right">Total ($)</th>
                        <th className="py-2.5 px-3 text-center">Estado</th>
                        <th className="py-2.5 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-zinc-400 text-xs">
                            No se encontraron facturas con el filtro seleccionado en {selectedDate}.
                          </td>
                        </tr>
                      ) : (
                        filteredInvoices.map((inv) => {
                          const stat = (inv.status || '').toLowerCase();
                          const isVoided = stat === 'voided' || stat === 'anulada';
                          const isFiscal = Boolean(inv.isFiscalInvoice || inv.docType === 'fiscal');
                          const usd = Number(inv.total || inv.totalUSD || inv.totalUsd || 0);
                          const method = (inv.paymentMethod || 'efectivo_usd').toLowerCase();
                          const bankInfo = inv.pagoMovilBank ? findBank(inv.pagoMovilBank) : null;

                          return (
                            <tr
                              key={inv.id || inv.invoiceNumber}
                              className={`transition-colors ${
                                isVoided ? 'bg-rose-50/40 text-zinc-400' : 'hover:bg-zinc-50/80'
                              }`}
                            >
                              <td className="py-2.5 px-3.5">
                                <span className={`font-mono font-bold block ${isVoided ? 'line-through text-rose-500' : 'text-zinc-950'}`}>
                                  #{inv.invoiceNumber || inv.id}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  isFiscal ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-zinc-100 text-zinc-600'
                                }`}>
                                  {isFiscal ? 'Fiscal' : 'Nota'}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 font-mono text-zinc-400 text-[11px]">
                                {inv.date ? inv.date.slice(11, 16) || 'Hoy' : 'Hoy'}
                              </td>

                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-zinc-900 block truncate max-w-[140px]">
                                  {getClientDisplayName(inv)}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-400">
                                  {getClientRif(inv)}
                                </span>
                                {isVoided && inv.voidReason && (
                                  <span className="text-[9px] text-rose-600 block italic">
                                    Motivo: {inv.voidReason}
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  {bankInfo && <BankLogo code={bankInfo.code} size={16} />}
                                  <div>
                                    <span className="capitalize font-semibold text-zinc-800 text-[11px] block">
                                      {method.replace('_', ' ')}
                                    </span>
                                    {inv.pagoMovilRef && (
                                      <span className="text-[9px] font-mono text-blue-700 block">
                                        Ref: {inv.pagoMovilRef}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className={`py-2.5 px-3 text-right font-mono font-extrabold ${isVoided ? 'line-through text-zinc-400' : 'text-zinc-950'}`}>
                                ${usd.toFixed(2)}
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                {isVoided ? (
                                  <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[9px]">
                                    Anulada
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[9px]">
                                    Cobrada
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedInvoice(inv)}
                                    className="p-1 rounded-md hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                                    title="Ver detalle del comprobante"
                                  >
                                    <Eye size={13} />
                                  </button>

                                  {!isVoided ? (
                                    <button
                                      type="button"
                                      onClick={() => setInvoiceToVoid(inv)}
                                      className="p-1 rounded-md hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                                      title="Anular factura errónea para arreglar la caja"
                                    >
                                      <XCircle size={13} />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreInvoice(inv)}
                                      className="p-1 rounded-md hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                                      title="Restaurar factura anulada"
                                    >
                                      <RotateCcw size={13} />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setInvoiceToDelete(inv)}
                                    className="p-1 rounded-md hover:bg-zinc-200 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                                    title="Eliminar factura"
                                  >
                                    <Trash2 size={13} />
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

            </div>
          </>
        ) : (
          /* PESTAÑA HISTORIAL DE CIERRES ANTERIORES */
          <div className="bg-white p-6 rounded-2xl border border-zinc-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="font-extrabold text-sm text-zinc-950 flex items-center gap-2">
                  <History size={16} />
                  <span>Historial de Cierres Emitidos ({cashCloses.length})</span>
                </h2>
                <p className="text-xs text-zinc-500">Fotografías históricas de caja, arqueo y recaudación por fecha.</p>
              </div>
            </div>

            {cashCloses.length === 0 ? (
              <div className="py-16 text-center text-zinc-400 text-xs">
                No hay cierres Z guardados en el historial aún.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {cashCloses.map((c) => (
                  <div key={c.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-zinc-50 px-3 rounded-xl transition-colors">
                    <div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-zinc-950 text-sm">#{c.id}</span>
                        <span className="text-zinc-500 text-xs">· {c.date?.slice(0, 16).replace('T', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-3 text-zinc-500 text-xs mt-0.5">
                        <span>{c.invoicesCount || 0} facturas procesadas</span>
                        {c.notes && <span className="italic text-zinc-400">· "{c.notes}"</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right font-mono">
                        <span className="font-bold text-zinc-950 block text-sm">
                          ${Number(c.totalUsd || 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          Bs. {Number(c.totalBs || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveReceiptModal({ type: 'Z', data: c })}
                          className="px-2.5 py-1 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Printer size={12} />
                          <span>Ticket</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedHistoricalClose(c)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>Ver Fotografía</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* MODAL 1: HERRAMIENTAS FISCALES Y REINICIO (OCULTO EN LA PANTALLA PRINCIPAL PARA EVITAR CONGESTIÓN) */}
      {showFiscalToolsModal && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowFiscalToolsModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-800">
                  <SlidersHorizontal size={16} />
                </div>
                <h3 className="font-bold text-sm text-zinc-950">Herramientas Fiscales & Mantenimiento</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFiscalToolsModal(false)}
                className="w-6 h-6 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <span className="font-bold text-zinc-800 block">Impresora Fiscal SENIAT:</span>
                <span className="text-zinc-500 block text-[11px]">
                  Puerto {fiscalSettings.port || 'COM2'} (HKA80 / Protocolo oficial)
                </span>
                {s1StatusData && (
                  <span className="text-emerald-700 font-mono font-bold block text-[11px] mt-1">
                    Última Factura S1: #{s1StatusData.last_invoice_number || 0}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowFiscalToolsModal(false);
                  setIsFiscalMemoryModalOpen(true);
                }}
                className="w-full py-2 px-3 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-zinc-800 font-bold flex items-center justify-between cursor-pointer"
              >
                <span>Consultar Memoria Fiscal Z por Rango</span>
                <ChevronRight size={14} className="text-zinc-400" />
              </button>

              <button
                type="button"
                onClick={handleTestFiscalConnection}
                className="w-full py-2 px-3 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-zinc-800 font-bold flex items-center justify-between cursor-pointer"
              >
                <span>Probar Comunicación S1 (Hardware)</span>
                <RefreshCw size={13} className={isProcessingFiscal ? 'animate-spin' : 'text-zinc-400'} />
              </button>

              <button
                type="button"
                onClick={handleCancelTruncatedDocument}
                className="w-full py-2 px-3 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-800 font-bold flex items-center justify-between cursor-pointer"
              >
                <span>Desatascar Factura Fiscal Truncada (Comando 7)</span>
                <XCircle size={14} className="text-rose-500" />
              </button>

              <div className="pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowFiscalToolsModal(false);
                    setShowResetModal(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-bold flex items-center justify-between cursor-pointer"
                >
                  <span>Poner Caja en 0 (Reiniciar ventas)</span>
                  <RotateCcw size={13} className="text-rose-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ANULAR FACTURA PARA CORREGIR DESCUADRE */}
      {invoiceToVoid && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setInvoiceToVoid(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-rose-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-rose-950">
                  Anular Factura #{invoiceToVoid.invoiceNumber || invoiceToVoid.id}
                </h3>
                <span className="text-xs text-zinc-500 font-mono">
                  ${Number(invoiceToVoid.total || invoiceToVoid.totalUSD || 0).toFixed(2)} USD
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Al anular esta factura, se descuenta de inmediato del dinero esperado en caja y de la contabilidad fiscal para corregir el descuadre.
            </p>

            <div>
              <label className="text-[11px] font-bold text-zinc-700 block mb-1">Motivo de anulación:</label>
              <input
                type="text"
                placeholder="Ej: Error en método de pago, cliente canceló..."
                value={voidReasonText}
                onChange={(e) => setVoidReasonText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:outline-none focus:border-zinc-950"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceToVoid(null)}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 text-zinc-600 text-xs font-bold hover:bg-zinc-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmVoidInvoice}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: COMPROBANTE TICKET (REPORTE X O Z) */}
      {activeReceiptModal && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setActiveReceiptModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-1 border-b border-zinc-200 pb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block">Comprobante Fiscal</span>
              <h3 className="font-black text-base text-zinc-950">
                REPORTE {activeReceiptModal.type} FISCAL
              </h3>
              <p className="text-xs text-zinc-500 font-mono">
                Fecha: {activeReceiptModal.data.date?.slice(0, 16).replace('T', ' ')}
              </p>
            </div>

            <div className="font-mono text-xs space-y-1.5 divide-y divide-zinc-100">
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Ventas Válidas:</span>
                <span className="font-bold text-zinc-950">{activeReceiptModal.data.invoicesCount || 0}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Total Dólares:</span>
                <strong className="text-zinc-950 text-sm font-bold">
                  ${Number(activeReceiptModal.data.totalUsd || 0).toFixed(2)}
                </strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Total Bolívares:</span>
                <span className="font-bold text-zinc-950">
                  Bs. {Number(activeReceiptModal.data.totalBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Efectivo en Gaveta:</span>
                <span className="font-bold text-emerald-700">
                  ${Number(activeReceiptModal.data.cashUsd || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Pago Móvil (Bs):</span>
                <span className="text-zinc-900">
                  Bs. {Number(activeReceiptModal.data.pagoMovilBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Punto de Venta (Bs):</span>
                <span className="text-zinc-900">
                  Bs. {Number(activeReceiptModal.data.cardBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl border border-zinc-300 text-zinc-800 text-xs font-bold hover:bg-zinc-50 flex items-center gap-1 cursor-pointer"
              >
                <Printer size={13} />
                <span>Imprimir</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveReceiptModal(null)}
                className="px-4 py-1.5 rounded-xl bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: FOTOGRAFÍA DE CIERRE HISTÓRICO */}
      {selectedHistoricalClose && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedHistoricalClose(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <span className="text-[10px] font-mono text-zinc-400 block uppercase">Fotografía Contable</span>
                <h3 className="font-black text-sm text-zinc-950">
                  Cierre Z #{selectedHistoricalClose.id} · {selectedHistoricalClose.date?.slice(0, 10)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoricalClose(null)}
                className="w-6 h-6 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
                <span className="text-[10px] text-zinc-400 uppercase font-sans block">Total Facturado</span>
                <strong className="text-base text-zinc-950 font-bold block">
                  ${Number(selectedHistoricalClose.totalUsd || 0).toFixed(2)}
                </strong>
                <span className="text-[11px] text-zinc-500">
                  Bs. {Number(selectedHistoricalClose.totalBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80">
                <span className="text-[10px] text-emerald-800 uppercase font-sans block">Efectivo en Gaveta</span>
                <strong className="text-base text-emerald-950 font-bold block">
                  ${Number(selectedHistoricalClose.cashUsd || 0).toFixed(2)}
                </strong>
                <span className="text-[11px] text-emerald-700">
                  Bs. {Number(selectedHistoricalClose.cashBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {selectedHistoricalClose.notes && (
              <div className="p-3 rounded-xl bg-zinc-50 text-xs text-zinc-700 italic border border-zinc-200/60">
                Nota: "{selectedHistoricalClose.notes}"
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedHistoricalClose(null)}
                className="px-4 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 cursor-pointer"
              >
                Cerrar Fotografía
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: REINICIAR Y PONER CAJA EN 0 */}
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowResetModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-rose-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="font-black text-sm text-rose-950">Poner Caja en Cero ($0.00)</h3>
                <span className="text-xs text-zinc-500">Selecciona el tipo de reinicio que deseas aplicar</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <button
                type="button"
                onClick={handleResetCurrentDateCash}
                className="w-full p-3 rounded-xl border border-amber-300 bg-amber-50/60 hover:bg-amber-100 text-left cursor-pointer transition-colors"
              >
                <strong className="text-amber-950 block font-bold">
                  Opción A: Reiniciar solo la fecha {selectedDate} ({dateInvoices.length} facturas)
                </strong>
                <span className="text-[11px] text-amber-800 mt-0.5 block">
                  Elimina solo las ventas y cierre de este día. Las ventas de otras fechas no se tocan.
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('⚠️ ADVERTENCIA: ¿Confirmas borrar absolutamente TODAS las ventas y cierres históricos de todo el sistema y dejar todo nuevo desde cero?')) {
                    handleResetAllSystemSales();
                  }
                }}
                className="w-full p-3 rounded-xl border border-rose-300 bg-rose-50/60 hover:bg-rose-100 text-left cursor-pointer transition-colors"
              >
                <strong className="text-rose-950 block font-bold">
                  Opción B: Reset Total de Todo el Sistema (Limpieza general)
                </strong>
                <span className="text-[11px] text-rose-800 mt-0.5 block">
                  Borra todos los datos de prueba y deja la aplicación 100% limpia como recién instalada.
                </span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-200 text-zinc-600 text-xs font-bold hover:bg-zinc-50 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MEMORIA FISCAL Z */}
      <FiscalMemoryModal
        isOpen={isFiscalMemoryModalOpen}
        onClose={() => setIsFiscalMemoryModalOpen(false)}
        initialDate={selectedDate}
        fiscalSettings={fiscalSettings}
        fiscalGetFiscalMemory={data?.fiscalGetFiscalMemory}
        fiscalPrintFiscalMemory={data?.fiscalPrintFiscalMemory}
        posInvoices={invoices}
        exchangeRate={exchangeRate}
      />

      {/* MODAL DETALLE DE FACTURA SELECCIONADA */}
      {selectedInvoice && (
        <InvoicePreview
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* TOAST DE NOTIFICACIÓN */}
      {toastMessage && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl text-xs font-bold shadow-xl flex items-center gap-2 z-50 text-white ${
          toastMessage.type === 'error' ? 'bg-rose-600' : 'bg-zinc-950'
        }`}>
          <CheckCircle2 size={15} className="text-emerald-400" />
          <span>{toastMessage.msg}</span>
        </div>
      )}

    </div>
  );
}
