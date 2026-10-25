import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  Lock, 
  Calendar, 
  DollarSign, 
  CheckCircle,
  FileText,
  AlertCircle,
  Banknote,
  TrendingUp,
  Printer,
  RefreshCw,
  Cpu,
  Eye,
  Camera,
  X
} from 'lucide-react';
import InvoicePreview from '../components/InvoicePreview';
import FiscalMachineLivePanel from '../components/cashClose/FiscalMachineLivePanel';
import DailyInvoicesTable from '../components/cashClose/DailyInvoicesTable';
import FiscalMemoryModal from '../components/cashClose/FiscalMemoryModal';

export default function CashClose() {
  const { 
    invoices = [], 
    cashCloses = [], 
    createCashClose, 
    voidInvoice,
    restoreInvoice,
    deleteInvoice,
    deleteCashClose,
    clearInvoicesByDate,
    clearAllSalesData,
    currentLocalDate,
    clients = [], 
    exchangeRate = 876.80,
    fiscalSettings,
    fiscalPrintReportX,
    fiscalPrintReportZ,
    fiscalGetS1Status,
    fiscalGetAuditStatus,
    fiscalGetFiscalMemory,
    fiscalPrintFiscalMemory
  } = useData() || {};

  const getLocalDateStr = (dateInput = new Date()) => {
    if (!dateInput) return '';
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [activeTab, setActiveTab] = useState('cierre'); // 'cierre' or 'historial'
  const [selectedDate, setSelectedDate] = useState(() => currentLocalDate || getLocalDateStr(new Date()));
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showFiscalZConfirm, setShowFiscalZConfirm] = useState(false);
  const [showFiscalMemoryModal, setShowFiscalMemoryModal] = useState(false);
  const [printingFiscalX, setPrintingFiscalX] = useState(false);
  const [printingFiscalZ, setPrintingFiscalZ] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedHistoricalClose, setSelectedHistoricalClose] = useState(null);
  const [invoiceToVoid, setInvoiceToVoid] = useState(null);
  const [voidReasonText, setVoidReasonText] = useState('');
  const [invoiceToRestore, setInvoiceToRestore] = useState(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [s1Data, setS1Data] = useState(null);
  const [u0xData, setU0xData] = useState(null);
  const [fetchingS1, setFetchingS1] = useState(false);
  const [physicalCountUSD, setPhysicalCountUSD] = useState('');
  const [physicalCountBs, setPhysicalCountBs] = useState('');
  const [fiscalZDoneDates, setFiscalZDoneDates] = useState(() => {
    try {
      const stored = localStorage.getItem('pos_fiscal_z_done_dates');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  // A las 12:00 AM medianoche, el cambio de fecha actualiza la caja automáticamente a 0
  useEffect(() => {
    if (currentLocalDate) {
      setSelectedDate(currentLocalDate);
    }
  }, [currentLocalDate]);

  const isZDoneForSelectedDate = Boolean(fiscalZDoneDates[selectedDate]);

  // Detector de Cierre Previo para la fecha seleccionada
  const existingCloseForSelectedDate = useMemo(() => {
    return (cashCloses || []).find(c => {
      const cDate = (c.date || '').includes('T') ? c.date.split('T')[0] : c.date;
      return cDate === selectedDate;
    });
  }, [cashCloses, selectedDate]);

  const getClientName = (inv) => {
    if (inv.clientName) return inv.clientName;
    const c = (clients || []).find(client => client.id === inv.clientId);
    return c ? c.name : 'Cliente Genérico';
  };

  // Filtrado de facturas de la fecha seleccionada (usando hora local para evitar desfase de medianoche)
  const todaysInvoices = useMemo(() => {
    return (invoices || []).filter(inv => {
      if (!inv.date) return false;
      return getLocalDateStr(inv.date) === selectedDate;
    });
  }, [invoices, selectedDate]);

  // Calculate stats for selected date (EXCLUDING voided/annulled invoices from cash and sales totals)
  const stats = useMemo(() => {
    return todaysInvoices.reduce((acc, inv) => {
      const totalUSD = Number(inv.totalUSD) || 0;
      const totalBs = Number(inv.totalBs) || 0;
      const stat = (inv.status || '').toLowerCase();
      const isVoided = stat === 'voided' || stat === 'anulada';
      const isFiscal = Boolean(inv.isFiscalInvoice || inv.docType === 'fiscal');
      const currentInvRate = Number(inv.exchangeRate) || exchangeRate || 876.80;
      const invTotalBs = totalBs > 0 ? totalBs : (totalUSD * currentInvRate);

      if (isVoided) {
        acc.voidedCount += 1;
        acc.voidedTotalUSD += totalUSD;
        acc.voidedTotalBs += invTotalBs;
        if (isFiscal) acc.fiscalVoidedCount += 1;
        return acc;
      }

      acc.totalFacturado += totalUSD;
      acc.totalBs += invTotalBs;
      acc.count += 1;

      if (isFiscal) {
        acc.fiscalValidCount += 1;
        acc.fiscalValidTotalBs += invTotalBs;
        acc.fiscalValidTotalUSD += totalUSD;
      } else {
        acc.notaEntregaCount += 1;
      }

      if (stat === 'paid' || stat === 'pagada') {
        acc.ingresoReal += totalUSD;
        acc.ingresoRealBs += invTotalBs;
        const method = inv.paymentMethod || 'efectivo_usd';

        if (method === 'mixto' && inv.mixedPayments) {
          if (!acc.breakdown['mixto']) {
            acc.breakdown['mixto'] = { count: 0, total: 0, totalBs: 0 };
          }
          acc.breakdown['mixto'].count += 1;
          acc.breakdown['mixto'].total += totalUSD;
          acc.breakdown['mixto'].totalBs = (acc.breakdown['mixto'].totalBs || 0) + invTotalBs;

          const mixedUsd = parseFloat(inv.mixedPayments.efectivo_usd) || 0;
          const mixedBs = parseFloat(inv.mixedPayments.efectivo_bs) || 0;
          const mixedPm = parseFloat(inv.mixedPayments.pago_movil) || parseFloat(inv.mixedPayments.pago_movil_bs) || ((parseFloat(inv.mixedPayments.pago_movil_usd) || 0) * currentInvRate);
          const mixedPunto = parseFloat(inv.mixedPayments.punto) || parseFloat(inv.mixedPayments.punto_bs) || ((parseFloat(inv.mixedPayments.punto_usd) || 0) * currentInvRate);
          
          acc.expectedCashUSD += mixedUsd;
          acc.expectedCashBs += mixedBs;
          acc.expectedPagoMovilBs += mixedPm;
          acc.expectedPuntoBs += mixedPunto;
        } else {
          if (!acc.breakdown[method]) {
            acc.breakdown[method] = { count: 0, total: 0, totalBs: 0 };
          }
          acc.breakdown[method].count += 1;
          acc.breakdown[method].total += totalUSD;
          acc.breakdown[method].totalBs = (acc.breakdown[method].totalBs || 0) + invTotalBs;

          if (method === 'efectivo_usd') {
            acc.expectedCashUSD += totalUSD;
          } else if (method === 'efectivo_bs') {
            acc.expectedCashBs += invTotalBs;
          } else if (method === 'pago_movil') {
            acc.expectedPagoMovilBs += invTotalBs;
          } else if (method === 'punto' || method === 'tarjeta' || method === 'debito') {
            acc.expectedPuntoBs += invTotalBs;
          }
        }
      } else if (stat === 'pending' || stat === 'pendiente') {
        acc.deudaNueva += totalUSD;
        acc.deudaNuevaBs += invTotalBs;
      } else if (stat === 'partial' || stat === 'parcial') {
        const paid = Number(inv.paidAmountUSD) || 0;
        const paidBs = Number(inv.paidAmountBs) || (paid * currentInvRate);
        acc.ingresoReal += paid;
        acc.ingresoRealBs += paidBs;
        acc.deudaNueva += (totalUSD - paid);
        acc.deudaNuevaBs += Math.max(0, invTotalBs - paidBs);
      }

      return acc;
    }, {
      totalFacturado: 0,
      totalBs: 0,
      ingresoReal: 0,
      ingresoRealBs: 0,
      deudaNueva: 0,
      deudaNuevaBs: 0,
      count: 0,
      voidedCount: 0,
      voidedTotalUSD: 0,
      voidedTotalBs: 0,
      fiscalValidCount: 0,
      fiscalValidTotalBs: 0,
      fiscalValidTotalUSD: 0,
      fiscalVoidedCount: 0,
      notaEntregaCount: 0,
      expectedCashUSD: 0,
      expectedCashBs: 0,
      expectedPagoMovilBs: 0,
      expectedPuntoBs: 0,
      breakdown: {
        'efectivo_usd': { count: 0, total: 0, totalBs: 0 },
        'pago_movil': { count: 0, total: 0, totalBs: 0 },
        'punto': { count: 0, total: 0, totalBs: 0 },
        'efectivo_bs': { count: 0, total: 0, totalBs: 0 },
        'zelle': { count: 0, total: 0, totalBs: 0 },
        'mixto': { count: 0, total: 0, totalBs: 0 }
      }
    });
  }, [todaysInvoices, exchangeRate]);

  // Calculations for Arqueo Físico (Bimonetario)
  const expectedCashUSD = Number((stats.expectedCashUSD || 0).toFixed(2));
  const expectedCashBs = Number((stats.expectedCashBs || 0).toFixed(2));
  const expectedCashBsInUSD = Number((expectedCashBs / exchangeRate).toFixed(2));

  const countedUSD = physicalCountUSD !== '' ? (parseFloat(physicalCountUSD) || 0) : expectedCashUSD;
  const countedBs = physicalCountBs !== '' ? (parseFloat(physicalCountBs) || 0) : expectedCashBs;
  const countedBsInUSD = Number((countedBs / exchangeRate).toFixed(2));

  const diffUSD = Number((countedUSD - expectedCashUSD).toFixed(2));
  const diffBs = Number((countedBs - expectedCashBs).toFixed(2));

  // Unified official Drawer Balance in USD
  const totalExpectedUSD = Number((expectedCashUSD + expectedCashBsInUSD).toFixed(2));
  const totalCountedUSD = Number((countedUSD + countedBsInUSD).toFixed(2));
  const unifiedDiffUSD = Number((totalCountedUSD - totalExpectedUSD).toFixed(2));

  const handleCloseCash = () => {
    const rateSnapshot = Number(exchangeRate) || 876.80;
    const newClose = {
      id: Date.now().toString(),
      date: selectedDate,
      // Fotografía inmutable de la Tasa BCV al momento del cierre
      exchangeRate: rateSnapshot,
      
      // Totales en Dólares ($ fijado)
      totalVentas: stats.totalFacturado,
      totalCobrado: stats.ingresoReal,
      totalPendiente: stats.deudaNueva,
      
      // Totales en Bolívares (Fotografía fija congelada en Bs al momento del cierre)
      totalVentasBs: Number((stats.totalBs || (stats.totalFacturado * rateSnapshot)).toFixed(2)),
      totalCobradoBs: Number((stats.ingresoRealBs || (stats.ingresoReal * rateSnapshot)).toFixed(2)),
      totalPendienteBs: Number((stats.deudaNueva * rateSnapshot).toFixed(2)),
      
      // Arqueo físico de gaveta
      expectedCashUSD,
      countedCashUSD: countedUSD,
      differenceUSD: diffUSD,
      expectedCashBs,
      countedCashBs: countedBs,
      differenceBs: diffBs,
      
      // Totales en Bancos (Pago Móvil y Punto de Venta)
      expectedPagoMovilBs: Number((stats.expectedPagoMovilBs || (stats.breakdown.pago_movil?.totalBs || (stats.breakdown.pago_movil?.total || 0) * rateSnapshot)).toFixed(2)),
      expectedPuntoBs: Number((stats.expectedPuntoBs || (stats.breakdown.punto?.totalBs || (stats.breakdown.punto?.total || 0) * rateSnapshot)).toFixed(2)),
      
      totalExpectedUSD,
      totalCountedUSD,
      unifiedDiffUSD,
      breakdown: stats.breakdown,
      invoicesCount: stats.count,
      createdAt: new Date().toISOString()
    };
    createCashClose(newClose);
    setShowConfirm(false);
    setToast('¡Caja cerrada y arqueada exitosamente (fotografía congelada en Bs y $)!');
    setTimeout(() => setToast(null), 3000);
  };

  const handlePrintFiscalX = async () => {
    setPrintingFiscalX(true);
    try {
      if (fiscalPrintReportX) {
        const res = await fiscalPrintReportX();
        if (res && res.success) {
          setToast('¡Reporte X impreso exitosamente en la impresora fiscal!');
        } else {
          setToast(`Error Fiscal: ${res?.error || 'Sin respuesta'}`);
        }
      }
    } catch (err) {
      setToast(`Error: ${err.message}`);
    } finally {
      setPrintingFiscalX(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handlePrintFiscalZ = async () => {
    setPrintingFiscalZ(true);
    setShowFiscalZConfirm(false);
    try {
      if (fiscalPrintReportZ) {
        const res = await fiscalPrintReportZ();
        if (res && res.success) {
          const updated = { ...fiscalZDoneDates, [selectedDate]: new Date().toLocaleTimeString('es-VE') };
          setFiscalZDoneDates(updated);
          localStorage.setItem('pos_fiscal_z_done_dates', JSON.stringify(updated));
          setToast('¡Cierre Z ejecutado e impreso exitosamente en la impresora fiscal!');
        } else {
          const errStr = (res?.error || '').toLowerCase();
          if (errStr.includes('ya fue emitido') || errStr.includes('rechazo') || errStr.includes('ya se imprimio') || res?.alreadyPrinted) {
            const updated = { ...fiscalZDoneDates, [selectedDate]: 'Emitido previamente' };
            setFiscalZDoneDates(updated);
            localStorage.setItem('pos_fiscal_z_done_dates', JSON.stringify(updated));
            setToast('Aviso SENIAT: La máquina fiscal indica que el Reporte Z de hoy ya fue emitido previamente.');
          } else {
            setToast(`Error Fiscal: ${res?.error || 'Sin respuesta'}`);
          }
        }
      }
    } catch (err) {
      setToast(`Error: ${err.message}`);
    } finally {
      setPrintingFiscalZ(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleFetchS1Status = async () => {
    setFetchingS1(true);
    try {
      if (fiscalGetAuditStatus) {
        const res = await fiscalGetAuditStatus();
        if (res && res.success && res.s1) {
          setS1Data(res.s1);
          if (res.u0x && res.u0x.success) {
            setU0xData(res.u0x);
          }
          setToast('¡Auditoría en vivo de la máquina fiscal (S1 + Memoria X) consultada exitosamente!');
          return;
        }
      }
      if (fiscalGetS1Status) {
        const res = await fiscalGetS1Status();
        if (res && res.success) {
          setS1Data(res);
          setToast('¡Memoria viva de la máquina fiscal consultada exitosamente!');
        } else {
          setToast(`Aviso Impresora: ${res?.error || 'Sin respuesta de la máquina fiscal'}`);
        }
      }
    } catch (err) {
      setToast(`Error: ${err.message}`);
    } finally {
      setFetchingS1(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleVoidInvoiceFromCashClose = (inv) => {
    setInvoiceToVoid(inv);
    setVoidReasonText(inv.isFiscalInvoice ? 'Anulada por la impresora fiscal HKA (Cancelación 7)' : 'Anulada en Cierre de Caja');
  };

  const handleConfirmVoidInvoice = () => {
    if (!invoiceToVoid || !voidInvoice) return;
    const finalReason = voidReasonText.trim() || 'Anulada en Cierre de Caja';
    voidInvoice(invoiceToVoid.id, finalReason);
    setToast(`Factura #${invoiceToVoid.invoiceNumber} marcada como ANULADA. Descontada de Caja y Libro SENIAT.`);
    setInvoiceToVoid(null);
    setVoidReasonText('');
    setTimeout(() => setToast(null), 4000);
  };

  const handleRestoreInvoiceFromCashClose = (inv) => {
    setInvoiceToRestore(inv);
  };

  const handleConfirmRestoreInvoice = () => {
    if (!invoiceToRestore || !restoreInvoice) return;
    restoreInvoice(invoiceToRestore.id);
    setToast(`Factura #${invoiceToRestore.invoiceNumber} restaurada exitosamente.`);
    setInvoiceToRestore(null);
    setTimeout(() => setToast(null), 3500);
  };

  const handleConfirmDeleteInvoice = () => {
    if (!invoiceToDelete || !deleteInvoice) return;
    deleteInvoice(invoiceToDelete.id);
    setToast(`Factura #${invoiceToDelete.invoiceNumber} eliminada permanentemente (borrada de Caja, Dashboard y SENIAT).`);
    setInvoiceToDelete(null);
    setTimeout(() => setToast(null), 4000);
  };

  const handleResetTodayCash = () => {
    if (!clearInvoicesByDate) return;
    clearInvoicesByDate(selectedDate);
    setPhysicalCountUSD('');
    setPhysicalCountBs('');
    setShowResetConfirm(false);
    setToast(`¡Caja de la fecha ${selectedDate} reiniciada! Facturas eliminadas y contador en 0.`);
    setTimeout(() => setToast(null), 4000);
  };

  const handleResetAllSalesData = () => {
    if (!clearAllSalesData) return;
    clearAllSalesData();
    setPhysicalCountUSD('');
    setPhysicalCountBs('');
    setCashierNote('');
    setAuditS1Report(null);
    setShowResetConfirm(false);
    setToast('¡Sistema reiniciado por completo! Todo el Cierre de Caja y ventas quedaron en 0 (Nuevo).');
    setTimeout(() => setToast(null), 4000);
  };

  const formatUSD = (val) => `$${(Number(val) || 0).toFixed(2)}`;
  const formatBsNumber = (val) => `Bs. ${(Number(val) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const methodName = (k) => {
    if (k === 'efectivo_usd') return '💵 Efectivo $';
    if (k === 'pago_movil') return '📱 Pago Móvil';
    if (k === 'punto' || k === 'tarjeta' || k === 'debito') return '💳 Punto de Venta (Bs)';
    if (k === 'efectivo_bs') return '🇻🇪 Efectivo Bs';
    if (k === 'zelle') return '🏦 Zelle ($ USD)';
    if (k === 'mixto') return '🔀 Pago Dividido / Mixto';
    return k;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: '#111827' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>Cierre y Arqueo de Caja</h1>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
            Balance del día, ingresos reales vs créditos otorgados
          </p>
        </div>

        {/* Date Selector & Action Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="#f59e0b" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                padding: '8px 12px',
                borderRadius: '8px',
                outline: 'none',
                fontWeight: '600'
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            style={{
              padding: '8px 14px',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem'
            }}
            title="Vaciar facturas y cierre de esta fecha para dejar el contador en 0"
          >
            🗑️ Poner Caja en 0
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #eaedf2', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('cierre')}
          style={{
            background: activeTab === 'cierre' ? '#10b981' : '#f8fafc',
            color: activeTab === 'cierre' ? '#ffffff' : '#64748b',
            border: activeTab === 'cierre' ? 'none' : '1px solid #e2e8f0',
            padding: '8px 20px',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Hacer Cierre del Día
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          style={{
            background: activeTab === 'historial' ? '#10b981' : '#f8fafc',
            color: activeTab === 'historial' ? '#ffffff' : '#64748b',
            border: activeTab === 'historial' ? 'none' : '1px solid #e2e8f0',
            padding: '8px 20px',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Historial de Cierres
        </button>
      </div>

      {activeTab === 'cierre' && (
        <>

      {/* Stats Cards (Bimonetario USD y Bolívares) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        <div style={{ background: '#ffffff', border: '1.5px solid #fde68a', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '4px', fontWeight: '600' }}>Total Facturado Válido</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827' }}>{formatUSD(stats.totalFacturado)}</div>
          <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#b45309', marginTop: '2px' }}>
            {formatBsNumber(stats.totalBs || stats.totalFacturado * exchangeRate)}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            {stats.count} activas ({stats.fiscalValidCount} fiscales / {stats.notaEntregaCount} notas)
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1.5px solid #a7f3d0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '4px', fontWeight: '600' }}>Dinero Real Ingresado (Caja)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#059669' }}>{formatUSD(stats.ingresoReal)}</div>
          <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>
            {formatBsNumber(stats.ingresoRealBs || stats.ingresoReal * exchangeRate)}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>Total cobrado en caja (excluye anuladas)</div>
        </div>

        <div style={{ background: '#ffffff', border: '1.5px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '4px', fontWeight: '600' }}>Facturas Anuladas Hoy</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: stats.voidedCount > 0 ? '#dc2626' : '#94a3b8' }}>
            {stats.voidedCount} {stats.voidedCount === 1 ? 'anulada' : 'anuladas'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            {stats.voidedCount > 0 ? `${formatUSD(stats.voidedTotalUSD)} excluidos de caja y SENIAT` : '0 anulaciones registradas'}
          </div>
        </div>

      </div>

      {/* Breakdown by Payment Method & Invoices */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '24px' }}>
        
        {/* Payment Methods */}
        <div style={{ background: '#ffffff', border: '1px solid #eaedf2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Desglose por Método</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.keys(stats.breakdown).map(k => {
              const item = stats.breakdown[k] || { count: 0, total: 0, totalBs: 0 };
              const itemBs = item.totalBs || (item.total * exchangeRate);
              return (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f9fafb', borderRadius: '8px', fontSize: '0.9rem' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#111827' }}>{methodName(k)}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.count} {item.count === 1 ? 'transacción' : 'transacciones'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '800', color: '#0284c7', fontSize: '0.95rem' }}>
                      {formatUSD(item.total)}
                    </div>
                    <div style={{ fontWeight: '700', color: '#475563', fontSize: '0.78rem', marginTop: '1px' }}>
                      {formatBsNumber(itemBs)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Arqueo Físico de Gaveta Bimonetario (Efectivo $ y Efectivo Bs) */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #fde68a',
            borderRadius: '12px',
            padding: '14px',
            marginTop: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#b45309' }}>
                💵 Conteo Físico en Gaveta (Bimonetario)
              </div>
              <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                Tasa: {Number(exchangeRate).toFixed(4)}
              </span>
            </div>

            {/* Subsección 1: Efectivo en Dólares ($) */}
            <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '10px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569', marginBottom: '6px' }}>
                <span style={{ fontWeight: '700', color: '#059669' }}>💵 Efectivo Dólares ($)</span>
                <span>Esperado: <strong style={{ color: '#0f172a' }}>{formatUSD(expectedCashUSD)}</strong></span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontWeight: '800', color: '#059669' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder={`Ej: ${expectedCashUSD.toFixed(2)}`}
                  value={physicalCountUSD}
                  onChange={e => setPhysicalCountUSD(e.target.value)}
                  style={{
                    flex: 1, padding: '7px 10px', background: '#ffffff',
                    border: '1px solid #cbd5e1', borderRadius: '8px',
                    fontWeight: '700', fontSize: '0.9rem', color: '#111827'
                  }}
                />
              </div>
              {physicalCountUSD !== '' && (
                <div style={{
                  marginTop: '6px', fontSize: '0.74rem', fontWeight: '700',
                  color: diffUSD === 0 ? '#059669' : diffUSD > 0 ? '#b45309' : '#dc2626'
                }}>
                  {diffUSD === 0 ? '✓ Cuadrado exacto' : diffUSD > 0 ? `+${formatUSD(diffUSD)} sobrante` : `-${formatUSD(Math.abs(diffUSD))} faltante`}
                </div>
              )}
            </div>

            {/* Subsección 2: Efectivo en Bolívares (Bs) */}
            <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '10px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569', marginBottom: '6px' }}>
                <span style={{ fontWeight: '700', color: '#d97706' }}>🇻🇪 Efectivo Bolívares (Bs en Gaveta)</span>
                <span>Esperado: <strong style={{ color: '#0f172a' }}>{formatBsNumber(expectedCashBs)}</strong></span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontWeight: '800', color: '#d97706', fontSize: '0.82rem' }}>Bs</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder={`Ej: ${expectedCashBs.toFixed(2)}`}
                  value={physicalCountBs}
                  onChange={e => setPhysicalCountBs(e.target.value)}
                  style={{
                    flex: 1, padding: '7px 10px', background: '#ffffff',
                    border: '1px solid #cbd5e1', borderRadius: '8px',
                    fontWeight: '700', fontSize: '0.9rem', color: '#111827'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                Equiv. oficial: {formatUSD(countedBsInUSD)} (Esperado: {formatUSD(expectedCashBsInUSD)})
              </div>
              {physicalCountBs !== '' && (
                <div style={{
                  marginTop: '4px', fontSize: '0.74rem', fontWeight: '700',
                  color: diffBs === 0 ? '#059669' : diffBs > 0 ? '#b45309' : '#dc2626'
                }}>
                  {diffBs === 0 ? '✓ Cuadrado exacto' : diffBs > 0 ? `+${formatBsNumber(diffBs)} sobrante` : `-${formatBsNumber(Math.abs(diffBs))} faltante`}
                </div>
              )}
            </div>

            {/* Subsección 3: Total Recibido en Banco por Pago Móvil (Bs) */}
            <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '10px', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#1e40af', marginBottom: '2px' }}>
                <span style={{ fontWeight: '700' }}>📱 Pago Móvil Recibido en Banco:</span>
                <span style={{ fontWeight: '900', fontSize: '0.92rem' }}>
                  {formatBsNumber(stats.expectedPagoMovilBs || (stats.breakdown.pago_movil?.totalBs || (stats.breakdown.pago_movil?.total || 0) * exchangeRate))}
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {stats.breakdown.pago_movil?.count || 0} transferencias verificadas en portal bancario ({formatUSD((stats.expectedPagoMovilBs || 0) / exchangeRate)})
              </div>
            </div>

            {/* Subsección 4: Total Recibido en Banco por Punto de Venta (Bs) */}
            <div style={{ background: '#f0f9ff', borderRadius: '10px', padding: '10px', border: '1px solid #bae6fd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#0369a1', marginBottom: '2px' }}>
                <span style={{ fontWeight: '700' }}>💳 Punto de Venta (Tarjetas en Banco):</span>
                <span style={{ fontWeight: '900', fontSize: '0.92rem' }}>
                  {formatBsNumber(stats.expectedPuntoBs || (stats.breakdown.punto?.totalBs || (stats.breakdown.punto?.total || 0) * exchangeRate))}
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {stats.breakdown.punto?.count || 0} vouchers de tarjeta / punto bancario ({formatUSD((stats.expectedPuntoBs || 0) / exchangeRate)})
              </div>
            </div>

            {/* Total Unificado en Moneda Oficial Dólar ($) */}
            <div style={{
              padding: '10px 12px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: '700',
              background: (physicalCountUSD === '' && physicalCountBs === '') || unifiedDiffUSD === 0 ? '#ecfdf5' : unifiedDiffUSD > 0 ? '#fef3c7' : '#fee2e2',
              color: (physicalCountUSD === '' && physicalCountBs === '') || unifiedDiffUSD === 0 ? '#065f46' : unifiedDiffUSD > 0 ? '#92400e' : '#991b1b',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Total Físico en Gaveta ($ Oficial):</span>
                <span style={{ fontSize: '1rem', fontWeight: '900' }}>{formatUSD(totalCountedUSD)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', opacity: 0.9 }}>
                <span>
                  {unifiedDiffUSD === 0 ? '✅ Caja Total Cuadrada' : unifiedDiffUSD > 0 ? '🟢 Sobrante Neto Total:' : '🔴 Faltante Neto Total:'}
                </span>
                <span>
                  {unifiedDiffUSD > 0 ? `+${formatUSD(unifiedDiffUSD)}` : unifiedDiffUSD < 0 ? `-${formatUSD(Math.abs(unifiedDiffUSD))}` : '$0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* Close Cash Button */}
          {existingCloseForSelectedDate && (
            <div style={{ marginTop: '14px', padding: '10px 12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '0.78rem', color: '#92400e', lineHeight: '1.4' }}>
              ℹ️ Esta fecha ya tiene un cierre previo registrado ({new Date(existingCloseForSelectedDate.createdAt || (existingCloseForSelectedDate.date + 'T12:00:00')).toLocaleDateString('es-VE')}). Al confirmar, se <b>actualizará la fotografía contable</b> con las facturas anuladas o correcciones actuales.
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            style={{
              marginTop: '12px', width: '100%', padding: '12px',
              background: existingCloseForSelectedDate ? '#0284c7' : '#dc2626', color: '#ffffff', border: 'none',
              borderRadius: '8px', fontWeight: '800', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.95rem'
            }}
          >
            <Lock size={18} /> {existingCloseForSelectedDate ? 'ACTUALIZAR Y RE-CERRAR CAJA' : 'CERRAR CAJA DE ESTA FECHA'}
          </button>

          {/* Acciones Fiscales SENIAT (HKA80) */}
          <FiscalMachineLivePanel
            fiscalSettings={fiscalSettings}
            printingFiscalX={printingFiscalX}
            printingFiscalZ={printingFiscalZ}
            isZDoneForSelectedDate={isZDoneForSelectedDate}
            fiscalZDoneTime={fiscalZDoneDates[selectedDate]}
            fetchingS1={fetchingS1}
            s1Data={s1Data}
            u0xData={u0xData}
            fiscalValidCount={stats.fiscalValidCount}
            onPrintFiscalX={handlePrintFiscalX}
            onOpenFiscalZConfirm={() => setShowFiscalZConfirm(true)}
            onFetchS1Status={handleFetchS1Status}
            onOpenFiscalMemoryModal={() => setShowFiscalMemoryModal(true)}
          />
        </div>

        {/* Today's Invoices Table */}
        <DailyInvoicesTable
          todaysInvoices={todaysInvoices}
          validCount={stats.count}
          voidedCount={stats.voidedCount}
          getClientName={getClientName}
          methodName={methodName}
          formatUSD={formatUSD}
          onSelectInvoice={setSelectedInvoice}
          onVoidInvoice={handleVoidInvoiceFromCashClose}
          onRestoreInvoice={handleRestoreInvoiceFromCashClose}
          onDeleteInvoice={(inv) => setInvoiceToDelete(inv)}
        />

      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '440px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', color: '#f59e0b' }}>
              {existingCloseForSelectedDate ? 'Actualizar y Re-Cerrar Caja' : 'Confirmar Cierre de Caja'}
            </h3>
            <p style={{ margin: '0 0 20px 0', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5' }}>
              ¿Estás seguro de que deseas {existingCloseForSelectedDate ? 'actualizar' : 'cerrar'} la caja para la fecha <strong>{selectedDate}</strong> con un total de <strong>{formatUSD(stats.ingresoReal)}</strong> cobrados ({formatBsNumber(stats.ingresoRealBs || (stats.ingresoReal * exchangeRate))})?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCloseCash}
                style={{ padding: '8px 18px', background: '#10b981', color: '#0f172a', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
              >
                {existingCloseForSelectedDate ? 'Sí, Guardar y Re-Cerrar' : 'Confirmar Cierre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fiscal Z Close Confirmation Modal */}
      {showFiscalZConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', padding: '24px',
            maxWidth: '460px', width: '90%', border: '1.5px solid #fca5a5',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)', color: '#0f172a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ padding: '8px', background: '#fee2e2', borderRadius: '10px', color: '#dc2626' }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#991b1b', fontWeight: '800' }}>
                  ¿Ejecutar Cierre Diario Z (SENIAT)?
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Impresora Fiscal HKA80</span>
              </div>
            </div>

            <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '0.88rem', lineHeight: '1.5' }}>
              ⚠️ <strong>Atención Legal:</strong> El Reporte Z es el cierre fiscal definitivo de la jornada. Al emitirlo, la memoria fiscal se bloquea para nuevas facturas del día y guarda el registro auditado ante el SENIAT.
            </p>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px', marginBottom: '20px', fontSize: '0.8rem', color: '#991b1b' }}>
              • Asegúrate de haber emitido todas las facturas del día antes de continuar.<br/>
              • La operación puede demorar de 10 a 25 segundos en finalizar.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowFiscalZConfirm(false)}
                style={{ padding: '9px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePrintFiscalZ}
                style={{ padding: '9px 20px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
              >
                Sí, Emitir Cierre Z
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {activeTab === 'historial' && (
        <div style={{ background: '#ffffff', border: '1px solid #eaedf2', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #eaedf2', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#111827', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={20} color="#0284c7" /> Historial de Cierres Diarios (Fotografías Congeladas)
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Cada cierre guarda una fotografía inmutable con su propia tasa de cambio y montos congelados en Bolívares y Dólares.
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', background: '#f0f9ff', color: '#0369a1', padding: '6px 12px', borderRadius: '8px', fontWeight: '600', border: '1px solid #bae6fd' }}>
              {cashCloses.length} {cashCloses.length === 1 ? 'cierre archivado' : 'cierres archivados'}
            </div>
          </div>

          {cashCloses.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No hay cierres de caja registrados todavía.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Fecha</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Tasa Cierre</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Facturado</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Cobrado Real</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Pendiente</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Físico Gaveta</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Diferencia</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center' }}>Facturas</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {cashCloses.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(close => {
                    const closeRate = Number(close.exchangeRate) || 876.80;
                    const ventasUSD = Number(close.totalVentas || 0);
                    const ventasBs = Number(close.totalVentasBs) || (ventasUSD * closeRate);
                    const cobradoUSD = Number(close.totalCobrado || 0);
                    const cobradoBs = Number(close.totalCobradoBs) || (cobradoUSD * closeRate);
                    const pendienteUSD = Number(close.totalPendiente || 0);
                    const pendienteBs = Number(close.totalPendienteBs) || (pendienteUSD * closeRate);
                    const countedUSD = Number(close.countedCashUSD || 0);
                    const countedBs = Number(close.countedCashBs || 0);
                    const diffUSD = Number(close.differenceUSD || 0);
                    const diffBs = Number(close.differenceBs || 0);
                    const isDiffExact = diffUSD === 0 && diffBs === 0;

                    return (
                      <tr key={close.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {new Date(close.date + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 7px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700' }}>
                            Bs. {closeRate.toFixed(2)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: '600', color: '#334155' }}>{formatUSD(ventasUSD)}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatBsNumber(ventasBs)}</div>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: '700', color: '#059669' }}>{formatUSD(cobradoUSD)}</div>
                          <div style={{ fontSize: '0.75rem', color: '#059669' }}>{formatBsNumber(cobradoBs)}</div>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: '600', color: pendienteUSD > 0 ? '#d97706' : '#94a3b8' }}>{formatUSD(pendienteUSD)}</div>
                          <div style={{ fontSize: '0.75rem', color: pendienteUSD > 0 ? '#d97706' : '#94a3b8' }}>{formatBsNumber(pendienteBs)}</div>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#0f172a' }}>
                            💵 {formatUSD(countedUSD)}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                            🇻🇪 {formatBsNumber(countedBs)}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          {isDiffExact ? (
                            <span style={{ color: '#059669', fontWeight: '700', fontSize: '0.82rem' }}>✓ Cuadrada</span>
                          ) : (
                            <div style={{ fontSize: '0.78rem' }}>
                              <span style={{ color: diffUSD > 0 ? '#059669' : diffUSD < 0 ? '#dc2626' : '#64748b', fontWeight: '700' }}>
                                $: {diffUSD > 0 ? `+${formatUSD(diffUSD)}` : formatUSD(diffUSD)}
                              </span>
                              {diffBs !== 0 && (
                                <div style={{ color: diffBs > 0 ? '#059669' : '#dc2626', fontWeight: '600' }}>
                                  Bs: {diffBs > 0 ? `+${formatBsNumber(diffBs)}` : formatBsNumber(diffBs)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
                          {close.invoicesCount || 0}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedHistoricalClose(close)}
                            style={{
                              padding: '6px 12px',
                              background: '#f0f9ff',
                              color: '#0284c7',
                              border: '1px solid #bae6fd',
                              borderRadius: '6px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.78rem',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = '#0284c7';
                              e.currentTarget.style.color = '#ffffff';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = '#f0f9ff';
                              e.currentTarget.style.color = '#0284c7';
                            }}
                          >
                            <Camera size={14} /> Ver Fotografía
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Historical Close Snapshot Modal (Fotografía Inmutable) */}
      {selectedHistoricalClose && (() => {
        const hClose = selectedHistoricalClose;
        const rate = Number(hClose.exchangeRate) || 876.80;
        const vUSD = Number(hClose.totalVentas || 0);
        const vBs = Number(hClose.totalVentasBs) || (vUSD * rate);
        const cUSD = Number(hClose.totalCobrado || 0);
        const cBs = Number(hClose.totalCobradoBs) || (cUSD * rate);
        const pUSD = Number(hClose.totalPendiente || 0);
        const pBs = Number(hClose.totalPendienteBs) || (pUSD * rate);
        const expUSD = Number(hClose.expectedCashUSD || 0);
        const cntUSD = Number(hClose.countedCashUSD || 0);
        const dUSD = Number(hClose.differenceUSD || 0);
        const expBs = Number(hClose.expectedCashBs || 0);
        const cntBs = Number(hClose.countedCashBs || 0);
        const dBs = Number(hClose.differenceBs || 0);
        const pmBs = Number(hClose.expectedPagoMovilBs) || (hClose.breakdown?.pago_movil?.totalBs || (hClose.breakdown?.pago_movil?.total || 0) * rate);
        const puntoBs = Number(hClose.expectedPuntoBs) || (hClose.breakdown?.punto?.totalBs || (hClose.breakdown?.punto?.total || 0) * rate);

        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1200, padding: '20px'
          }}>
            <div style={{
              background: '#ffffff', borderRadius: '16px', maxWidth: '680px', width: '100%',
              maxHeight: '92vh', overflowY: 'auto', padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0',
              color: '#0f172a'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                    <Camera size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                      Fotografía de Cierre de Caja
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.82rem', color: '#64748b' }}>
                      <span>Fecha: <strong>{new Date(hClose.date + 'T12:00:00').toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
                      <span>•</span>
                      <span style={{ background: '#f1f5f9', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                        Tasa BCV fija: Bs. {rate.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHistoricalClose(null)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Inmutability banner */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: '#166534' }}>
                <CheckCircle size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Fotografía Contable Inmutable:</strong> Este registro preserva los valores exactos en Bolívares y Dólares del día cerrado. Cambios posteriores en la tasa de cambio no alteran este balance.
                </div>
              </div>

              {/* 3 Main Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Facturado</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{formatUSD(vUSD)}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{formatBsNumber(vBs)}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>{hClose.invoicesCount || 0} facturas emitidas</div>
                </div>

                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '12px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#065f46', fontWeight: '700', textTransform: 'uppercase' }}>Total Cobrado Real</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#059669', marginTop: '2px' }}>{formatUSD(cUSD)}</div>
                  <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: '600' }}>{formatBsNumber(cBs)}</div>
                  <div style={{ fontSize: '0.7rem', color: '#065f46', marginTop: '4px' }}>Ingreso neto percibido</div>
                </div>

                <div style={{ background: pUSD > 0 ? '#fffbeb' : '#f8fafc', border: `1px solid ${pUSD > 0 ? '#fde68a' : '#e2e8f0'}`, borderRadius: '10px', padding: '12px' }}>
                  <span style={{ fontSize: '0.72rem', color: pUSD > 0 ? '#92400e' : '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Crédito Pendiente</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '800', color: pUSD > 0 ? '#d97706' : '#94a3b8', marginTop: '2px' }}>{formatUSD(pUSD)}</div>
                  <div style={{ fontSize: '0.78rem', color: pUSD > 0 ? '#d97706' : '#94a3b8' }}>{formatBsNumber(pBs)}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>Por cobrar a clientes</div>
                </div>
              </div>

              {/* Arqueo de Gaveta Física */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Banknote size={18} color="#059669" /> Arqueo Físico de Gaveta (Efectivo)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* USD Gaveta */}
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>💵 Efectivo Dólares ($ USD)</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: '2px' }}>
                      <span>Esperado:</span>
                      <strong>{formatUSD(expUSD)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#0f172a', marginBottom: '2px' }}>
                      <span>Contado en gaveta:</span>
                      <strong>{formatUSD(cntUSD)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', borderTop: '1px dashed #cbd5e1', paddingTop: '4px', marginTop: '4px' }}>
                      <span>Diferencia:</span>
                      <strong style={{ color: dUSD === 0 ? '#059669' : dUSD > 0 ? '#059669' : '#dc2626' }}>
                        {dUSD === 0 ? '✓ Cuadrado exacto' : dUSD > 0 ? `+${formatUSD(dUSD)} sobrante` : `${formatUSD(dUSD)} faltante`}
                      </strong>
                    </div>
                  </div>

                  {/* Bs Gaveta */}
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>🇻🇪 Efectivo Bolívares (Bs)</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: '2px' }}>
                      <span>Esperado:</span>
                      <strong>{formatBsNumber(expBs)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#0f172a', marginBottom: '2px' }}>
                      <span>Contado en gaveta:</span>
                      <strong>{formatBsNumber(cntBs)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', borderTop: '1px dashed #cbd5e1', paddingTop: '4px', marginTop: '4px' }}>
                      <span>Diferencia:</span>
                      <strong style={{ color: dBs === 0 ? '#059669' : dBs > 0 ? '#059669' : '#dc2626' }}>
                        {dBs === 0 ? '✓ Cuadrado exacto' : dBs > 0 ? `+${formatBsNumber(dBs)} sobrante` : `${formatBsNumber(dBs)} faltante`}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conciliación Bancaria (Pago Móvil y Punto de Venta) */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={18} color="#0284c7" /> Conciliación Bancaria Recibida
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0369a1', marginBottom: '4px' }}>📱 Pago Móvil (Bs)</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0369a1' }}>{formatBsNumber(pmBs)}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      Eq. {formatUSD(pmBs / rate)} • Verificado en cuenta bancaria
                    </div>
                  </div>

                  <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0369a1', marginBottom: '4px' }}>💳 Punto de Venta (Bs)</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0369a1' }}>{formatBsNumber(puntoBs)}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      Eq. {formatUSD(puntoBs / rate)} • Lote de tarjeta / vouchers
                    </div>
                  </div>
                </div>
              </div>

              {/* Desglose por Métodos */}
              {hClose.breakdown && Object.keys(hClose.breakdown).length > 0 && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: '700', color: '#334155' }}>
                    Desglose Registrado por Método de Pago
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {Object.entries(hClose.breakdown).map(([k, item]) => {
                      const itemUSD = Number(item.total || 0);
                      const itemBs = Number(item.totalBs) || (itemUSD * rate);
                      if (item.count === 0 && itemUSD === 0) return null;
                      return (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', padding: '6px 10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                          <span style={{ fontWeight: '600', color: '#475569' }}>{methodName(k)} ({item.count || 0})</span>
                          <span style={{ fontWeight: '700', color: '#0f172a' }}>
                            {formatUSD(itemUSD)} <span style={{ color: '#64748b', fontWeight: 'normal', fontSize: '0.76rem' }}>({formatBsNumber(itemBs)})</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setSelectedHistoricalClose(null)}
                  style={{
                    padding: '9px 20px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '0.88rem'
                  }}
                >
                  Cerrar Fotografía
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Modal In-App para Anular Factura en Caja y SENIAT */}
      {invoiceToVoid && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2500, backdropFilter: 'blur(4px)', padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', padding: '24px',
            maxWidth: '480px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            border: '1.5px solid #fecaca', color: '#0f172a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ padding: '10px', background: '#fee2e2', borderRadius: '10px', color: '#dc2626' }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#991b1b', fontWeight: '800' }}>
                  Anular Factura #{invoiceToVoid.invoiceNumber}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {getClientName(invoiceToVoid)} • {formatUSD(invoiceToVoid.totalUSD)} ({formatBsNumber(invoiceToVoid.totalBs || (invoiceToVoid.totalUSD * exchangeRate))})
                </span>
              </div>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '0.82rem', color: '#991b1b', lineHeight: '1.4' }}>
              ⚠️ <b>Efecto Inmediato en Caja y SENIAT:</b><br/>
              • Se <b>descontará al instante</b> del total vendido y cobrado de esta caja.<br/>
              • En el Libro de Ventas SENIAT figurará como <b>03-ANUL con Bs 0,00</b>.<br/>
              • Úsalo para cuadrar el sistema con las facturas anuladas en la impresora fiscal.
            </div>

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Motivo de Anulación:
            </label>
            <textarea
              autoFocus
              value={voidReasonText}
              onChange={(e) => setVoidReasonText(e.target.value)}
              placeholder="Indica la razón de anulación..."
              style={{
                width: '100%', boxSizing: 'border-box', minHeight: '75px', padding: '10px',
                borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem',
                color: '#0f172a', marginBottom: '12px', outline: 'none'
              }}
            />

            {/* Quick Reason Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
              {[
                'Anulada en Impresora Fiscal (Cancelación 7)',
                'Error en monto o cobro',
                'Cliente canceló el pedido',
                'Prueba de sistema'
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setVoidReasonText(reason)}
                  style={{
                    background: voidReasonText === reason ? '#fee2e2' : '#f1f5f9',
                    border: `1px solid ${voidReasonText === reason ? '#fca5a5' : '#e2e8f0'}`,
                    color: voidReasonText === reason ? '#991b1b' : '#475569',
                    padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem',
                    cursor: 'pointer', fontWeight: '600'
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => { setInvoiceToVoid(null); setVoidReasonText(''); }}
                style={{ padding: '9px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmVoidInvoice}
                style={{ padding: '9px 22px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
              >
                🚫 Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal In-App para Restaurar Factura */}
      {invoiceToRestore && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2500, backdropFilter: 'blur(4px)', padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', padding: '24px',
            maxWidth: '440px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            border: '1.5px solid #a7f3d0', color: '#0f172a'
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.15rem', color: '#065f46', fontWeight: '800' }}>
              Restaurar Factura #{invoiceToRestore.invoiceNumber}
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '0.85rem', lineHeight: '1.4' }}>
              ¿Deseas restaurar esta factura a estado <strong>válido/pagado</strong>? Volverá a sumar en el balance de caja y en el Libro SENIAT.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setInvoiceToRestore(null)}
                style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRestoreInvoice}
                style={{ padding: '8px 20px', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
              >
                ↩️ Confirmar Restauración
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Eliminar Factura Permanentemente (Caja, Dashboard, SENIAT) */}
      {invoiceToDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2600, backdropFilter: 'blur(4px)', padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', padding: '24px',
            maxWidth: '460px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            border: '2px solid #ef4444', color: '#0f172a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ padding: '10px', background: '#fee2e2', borderRadius: '10px', color: '#dc2626' }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#991b1b', fontWeight: '800' }}>
                  ¿Eliminar Factura #{invoiceToDelete.invoiceNumber}?
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  {getClientName(invoiceToDelete)} • {formatUSD(invoiceToDelete.totalUSD)} ({formatBsNumber(invoiceToDelete.totalBs || (invoiceToDelete.totalUSD * exchangeRate))})
                </span>
              </div>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px', marginBottom: '18px', fontSize: '0.82rem', color: '#991b1b', lineHeight: '1.45' }}>
              ⚠️ <b>Eliminación Completa de Todo el Sistema:</b><br/>
              • Este registro será <b>borrado definitivamente</b>.<br/>
              • Desaparecerá de <b>Cierre de Caja</b>, del <b>Dashboard</b> y del <b>Libro SENIAT</b>.<br/>
              • Se restará del saldo de cuenta del cliente y del balance de ventas.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                style={{ padding: '9px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteInvoice}
                style={{ padding: '9px 22px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                🗑️ Sí, Eliminar de Todo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Reiniciar Contador de Caja de Hoy a 0 */}
      {showResetConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2600, backdropFilter: 'blur(4px)', padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', padding: '24px',
            maxWidth: '520px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            border: '2px solid #ef4444', color: '#0f172a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ padding: '10px', background: '#fee2e2', borderRadius: '10px', color: '#dc2626' }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#991b1b', fontWeight: '800' }}>
                  Reiniciar y Poner Caja en 0
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Dejar contador y balances en $0.00 / Bs 0.00 (Nuevo)
                </span>
              </div>
            </div>

            <p style={{ margin: '0 0 14px 0', color: '#334155', fontSize: '0.88rem', lineHeight: '1.45' }}>
              Seleccione la opción de reinicio que desea aplicar para dejar la caja limpia y en cero:
            </p>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px', marginBottom: '18px', fontSize: '0.82rem', color: '#991b1b', lineHeight: '1.45' }}>
              • <b>Opción A (Solo {selectedDate}):</b> Elimina las {todaysInvoices.length} facturas y el cierre de esta fecha. Las ventas de otros días se conservan.<br/>
              • <b>Opción B (Reset Total de Todo el Sistema):</b> Borra <b>todas</b> las ventas, cierres y pagos de todas las fechas. Todo el sistema queda 100% como nuevo desde cero.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleResetTodayCash}
                style={{
                  padding: '11px 16px',
                  background: '#ea580c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '800',
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>🗑️ Poner en 0 SOLO la Fecha {selectedDate} ({todaysInvoices.length} facturas)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('⚠️ ADVERTENCIA: ¿Está completamente seguro de borrar TODAS las ventas y cierres históricos de todo el sistema y dejar todo nuevo en 0?')) {
                    handleResetAllSalesData();
                  }
                }}
                style={{
                  padding: '11px 16px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '800',
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>🔥 RESET TOTAL DEL SISTEMA (Borrar TODO y dejar nuevo en 0)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                style={{
                  padding: '9px 18px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  borderRadius: '8px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Consulta de Memoria Fiscal SENIAT */}
      <FiscalMemoryModal
        isOpen={showFiscalMemoryModal}
        onClose={() => setShowFiscalMemoryModal(false)}
        initialDate={selectedDate}
        fiscalSettings={fiscalSettings}
        fiscalGetFiscalMemory={fiscalGetFiscalMemory}
        fiscalPrintFiscalMemory={fiscalPrintFiscalMemory}
        posInvoices={invoices}
        exchangeRate={exchangeRate}
      />

      {/* Invoice Preview */}
      {selectedInvoice && (
        <InvoicePreview 
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: '#10b981', color: '#fff', padding: '10px 20px', borderRadius: '24px',
          fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1000
        }}>
          <CheckCircle size={18} /> {toast}
        </div>
      )}

    </div>
  );
}
