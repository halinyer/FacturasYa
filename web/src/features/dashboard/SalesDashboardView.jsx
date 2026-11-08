import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  Receipt,
  CreditCard,
  Smartphone,
  Calendar,
  ArrowUpRight,
  Printer,
  Search,
  Download,
  Filter,
  Banknote,
  Sparkles,
  ShoppingBag,
  RotateCcw,
  Trash2,
  XCircle,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers
} from 'lucide-react';
import { useData, getTodayLocalDateStr } from '../../pos-core/contexts/DataContext';
import InvoicePreview from '../../pos-core/components/InvoicePreview';
import { BankLogo, findBank } from '../../pos-core/utils/venezuelaBanks';

export default function SalesDashboardView() {
  const data = useData() || {};
  const exchangeRate = Number(data?.exchangeRate) || 876.80;
  const invoices = data?.invoices || [];
  const clients = data?.clients || [];
  const products = data?.products || [];
  const currentLocalDate = data?.currentLocalDate;

  const {
    voidInvoice,
    restoreInvoice,
    deleteInvoice
  } = data;

  // Moneda activa de visualización: 'USD' | 'BS'
  const [currencyView, setCurrencyView] = useState(() => {
    return localStorage.getItem('pos_dash_currency') || 'USD';
  });

  const toggleCurrency = (curr) => {
    setCurrencyView(curr);
    localStorage.setItem('pos_dash_currency', curr);
  };

  // Rango de fecha: 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState(() => currentLocalDate || getTodayLocalDateStr());
  const [customEndDate, setCustomEndDate] = useState(() => currentLocalDate || getTodayLocalDateStr());
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceToVoid, setInvoiceToVoid] = useState(null);
  const [voidReasonText, setVoidReasonText] = useState('');
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Rollover a las 12:00 AM medianoche para actualizar automáticamente el Dashboard a 0
  useEffect(() => {
    if (currentLocalDate && dateRange === 'today') {
      setCustomStartDate(currentLocalDate);
      setCustomEndDate(currentLocalDate);
    }
  }, [currentLocalDate, dateRange]);

  // Filtrar facturas según el rango de fecha
  const filteredInvoices = useMemo(() => {
    const todayStr = currentLocalDate || getTodayLocalDateStr();

    // Helper fecha ayer
    const dYesterday = new Date();
    dYesterday.setDate(dYesterday.getDate() - 1);
    const yStr = `${dYesterday.getFullYear()}-${String(dYesterday.getMonth() + 1).padStart(2, '0')}-${String(dYesterday.getDate()).padStart(2, '0')}`;

    return (invoices || []).filter((inv) => {
      if (!inv.date) return true;
      const invDateStr = inv.date.includes('T') ? inv.date.split('T')[0] : inv.date.slice(0, 10);

      if (dateRange === 'today') {
        if (invDateStr !== todayStr) return false;
      } else if (dateRange === 'yesterday') {
        if (invDateStr !== yStr) return false;
      } else if (dateRange === 'week') {
        const invTime = new Date(inv.date).getTime();
        const diffDays = (Date.now() - invTime) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (dateRange === 'month') {
        const invTime = new Date(inv.date).getTime();
        const diffDays = (Date.now() - invTime) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) return false;
      } else if (dateRange === 'custom') {
        if (customStartDate && invDateStr < customStartDate) return false;
        if (customEndDate && invDateStr > customEndDate) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const clientName = String(inv.client?.name || inv.clientName || '').toLowerCase();
        const clientRif = String(inv.client?.rif || inv.clientRif || inv.clientCedula || '').toLowerCase();
        const num = String(inv.invoiceNumber || inv.id || '').toLowerCase();
        return clientName.includes(q) || clientRif.includes(q) || num.includes(q);
      }

      return true;
    });
  }, [invoices, dateRange, currentLocalDate, customStartDate, customEndDate, searchQuery]);

  // Cálculos estadísticos y desglose financiero
  const stats = useMemo(() => {
    let totalUsd = 0;
    let totalBs = 0;
    let totalIgtfUsd = 0;
    let validCount = 0;
    let voidedCount = 0;
    let fiscalCount = 0;

    let cashTotalUsd = 0;
    let cashTotalBs = 0;
    let pmTotalBs = 0;
    let cardTotalBs = 0;
    let zelleTotalUsd = 0;

    filteredInvoices.forEach((inv) => {
      const stat = (inv.status || '').toLowerCase();
      const isVoided = stat === 'voided' || stat === 'anulada';
      const isFiscal = Boolean(inv.isFiscalInvoice || inv.docType === 'fiscal');

      if (isVoided) {
        voidedCount++;
        return; // Facturas anuladas no suman en el balance neto
      }

      validCount++;
      if (isFiscal) fiscalCount++;

      const usd = Number(inv.total || inv.totalUSD || inv.totalUsd || 0);
      const invRate = Number(inv.exchangeRate) || exchangeRate;
      const bs = Number(inv.totalBs || usd * invRate);
      const igtf = Number(inv.igtfUsd || (inv.igtfBs ? inv.igtfBs / invRate : 0));

      totalUsd += usd;
      totalBs += bs;
      totalIgtfUsd += igtf;

      const method = (inv.paymentMethod || 'efectivo_usd').toLowerCase();
      if (method === 'efectivo_usd' || method === 'usd_cash' || method === 'cash') {
        cashTotalUsd += usd;
      } else if (method === 'efectivo_bs') {
        cashTotalBs += bs;
      } else if (method === 'pago_movil') {
        pmTotalBs += bs;
      } else if (method === 'punto' || method === 'pos' || method === 'tarjeta') {
        cardTotalBs += bs;
      } else if (method === 'zelle') {
        zelleTotalUsd += usd;
      } else if (method === 'mixto') {
        const cUsd = Number(inv.paymentDetails?.cashUsd || 0);
        const cBs = Number(inv.paymentDetails?.cashBs || 0);
        const pBs = Number(inv.paymentDetails?.pagoMovilBs || 0);
        const ptBs = Number(inv.paymentDetails?.puntoBs || 0);
        const zUsd = Number(inv.paymentDetails?.zelleUsd || 0);
        cashTotalUsd += cUsd;
        cashTotalBs += cBs;
        pmTotalBs += pBs;
        cardTotalBs += ptBs;
        zelleTotalUsd += zUsd;
      } else {
        cardTotalBs += bs;
      }
    });

    const avgTicketUsd = validCount > 0 ? totalUsd / validCount : 0;
    const avgTicketBs = validCount > 0 ? totalBs / validCount : 0;

    return {
      totalUsd,
      totalBs,
      totalIgtfUsd,
      validCount,
      voidedCount,
      fiscalCount,
      totalCount: filteredInvoices.length,
      avgTicketUsd,
      avgTicketBs,
      cashTotalUsd,
      cashTotalBs,
      pmTotalBs,
      cardTotalBs,
      zelleTotalUsd
    };
  }, [filteredInvoices, exchangeRate]);

  // Ranking de "Los Items" / Productos más vendidos en el período
  const topItems = useMemo(() => {
    const itemMap = new Map();
    let totalItemsQty = 0;

    filteredInvoices.forEach((inv) => {
      const stat = (inv.status || '').toLowerCase();
      if (stat === 'voided' || stat === 'anulada') return;

      const itemsList = inv.items || inv.products || [];
      itemsList.forEach((it) => {
        const id = it.id || it.productId || it.name;
        const name = it.name || 'Producto sin nombre';
        const qty = Number(it.qty || it.quantity || 1);
        const priceUsd = Number(it.priceUsd ?? it.priceUSD ?? it.unitPrice ?? it.price ?? 0);
        const invRate = Number(inv.exchangeRate) || exchangeRate;
        const totalUsd = Number(it.totalUsd ?? it.totalUSD ?? (priceUsd * qty));
        const totalBs = Number(it.totalBs || totalUsd * invRate);

        totalItemsQty += qty;

        if (itemMap.has(id)) {
          const prev = itemMap.get(id);
          prev.qty += qty;
          prev.totalUsd += totalUsd;
          prev.totalBs += totalBs;
        } else {
          itemMap.set(id, {
            id,
            name,
            qty,
            totalUsd,
            totalBs,
            priceUsd
          });
        }
      });
    });

    const list = Array.from(itemMap.values());
    list.sort((a, b) => b.qty - a.qty);

    return list.slice(0, 8).map((it) => ({
      ...it,
      share: totalItemsQty > 0 ? (it.qty / totalItemsQty) * 100 : 0
    }));
  }, [filteredInvoices, exchangeRate]);

  // Anular factura desde el dashboard para cuadrar caja
  const handleConfirmVoid = () => {
    if (!invoiceToVoid) return;
    const reason = voidReasonText.trim() || 'Anulada en Dashboard de Ventas';
    if (voidInvoice) {
      voidInvoice(invoiceToVoid.id, reason);
      showToast(`Factura #${invoiceToVoid.invoiceNumber || invoiceToVoid.id} anulada con éxito.`, 'info');
    }
    setInvoiceToVoid(null);
    setVoidReasonText('');
  };

  // Restaurar factura
  const handleRestore = (inv) => {
    if (restoreInvoice) {
      restoreInvoice(inv.id);
      showToast(`Factura #${inv.invoiceNumber || inv.id} restaurada.`);
    }
  };

  // Eliminar factura
  const handleConfirmDelete = () => {
    if (!invoiceToDelete) return;
    if (deleteInvoice) {
      deleteInvoice(invoiceToDelete.id);
      showToast(`Factura #${invoiceToDelete.invoiceNumber || invoiceToDelete.id} eliminada.`);
    }
    setInvoiceToDelete(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-y-auto">
      {/* HEADER DE MÓDULO NOTION */}
      <div className="bg-white border-b border-zinc-200/80 px-6 py-4 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
                <LayoutDashboard size={18} />
              </span>
              <h1 className="text-xl font-bold text-zinc-950 tracking-tight">Dashboard de Ventas</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                En Vivo · Tasa BCV: Bs. {exchangeRate.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Métricas financieras, recaudación fiscal, items más vendidos y conciliación en tiempo real
            </p>
          </div>

          {/* SELECTOR DE MONEDA Y RANGO DE FECHAS */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle USD / BS */}
            <div className="flex items-center bg-zinc-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => toggleCurrency('USD')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  currencyView === 'USD' ? 'bg-white text-zinc-950 shadow-xs font-bold' : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                $ USD
              </button>
              <button
                type="button"
                onClick={() => toggleCurrency('BS')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  currencyView === 'BS' ? 'bg-white text-zinc-950 shadow-xs font-bold' : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Bs. Digital
              </button>
            </div>

            {/* Presets de Fecha */}
            <div className="flex bg-zinc-100 p-1 rounded-xl text-xs font-semibold">
              {[
                { id: 'today', label: 'Hoy' },
                { id: 'yesterday', label: 'Ayer' },
                { id: 'week', label: '7 Días' },
                { id: 'month', label: '30 Días' },
                { id: 'all', label: 'Todo' },
                { id: 'custom', label: 'Rango' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDateRange(tab.id)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    dateRange === tab.id ? 'bg-white text-zinc-950 shadow-xs font-bold' : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {dateRange === 'custom' && (
              <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-1 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="font-semibold bg-transparent text-zinc-800 focus:outline-none cursor-pointer"
                />
                <span className="text-zinc-400">a</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="font-semibold bg-transparent text-zinc-800 focus:outline-none cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl w-full">
        {/* CARDS DE KPIS FINANCIEROS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Ventas Totales</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-zinc-950 font-mono">
              {currencyView === 'USD'
                ? `$${stats.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `Bs. ${stats.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            <span className="text-xs text-zinc-400 font-mono block">
              {currencyView === 'USD'
                ? `Bs. ${stats.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `$${stats.totalUsd.toFixed(2)} USD`}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Facturas Emitidas</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-zinc-950 font-mono">
              {stats.validCount}
            </div>
            <span className="text-xs text-zinc-400 block">
              {stats.fiscalCount} fiscales SENIAT {stats.voidedCount > 0 ? `· ${stats.voidedCount} anuladas` : ''}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Ticket Promedio</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-zinc-950 font-mono">
              {currencyView === 'USD' ? `$${stats.avgTicketUsd.toFixed(2)}` : `Bs. ${stats.avgTicketBs.toFixed(2)}`}
            </div>
            <span className="text-xs text-zinc-400 font-mono block">
              {currencyView === 'USD' ? `Bs. ${stats.avgTicketBs.toFixed(2)} por comanda` : `$${stats.avgTicketUsd.toFixed(2)} USD`}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">IGTF 3% Percibido</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Printer size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-zinc-950 font-mono">
              ${stats.totalIgtfUsd.toFixed(2)}
            </div>
            <span className="text-xs text-zinc-400 font-mono block">
              Bs. {(stats.totalIgtfUsd * exchangeRate).toFixed(2)} para declaración SENIAT
            </span>
          </div>
        </div>

        {/* DESGLOSE DE RECAUDACIÓN POR MÉTODO */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
          <h2 className="font-extrabold text-sm text-zinc-950">Desglose de Recaudación por Método de Pago</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <Banknote size={14} />
                <span>Efectivo USD ($)</span>
              </div>
              <span className="text-lg font-bold text-emerald-950 font-mono block">
                ${stats.cashTotalUsd.toFixed(2)}
              </span>
              <span className="text-[10px] text-emerald-700 font-mono block">
                Bs. {(stats.cashTotalUsd * exchangeRate).toFixed(2)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                <Banknote size={14} />
                <span>Efectivo Bs</span>
              </div>
              <span className="text-lg font-bold text-teal-950 font-mono block truncate">
                Bs. {stats.cashTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-teal-700 font-mono block">
                ${(stats.cashTotalBs / exchangeRate).toFixed(2)} equiv.
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <Smartphone size={14} />
                <span>Pago Móvil (Bs)</span>
              </div>
              <span className="text-lg font-bold text-blue-950 font-mono block truncate">
                Bs. {stats.pmTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-blue-700 font-mono block">
                ${(stats.pmTotalBs / exchangeRate).toFixed(2)} equiv.
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                <CreditCard size={14} />
                <span>Punto de Venta (Bs)</span>
              </div>
              <span className="text-lg font-bold text-sky-950 font-mono block truncate">
                Bs. {stats.cardTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-sky-700 font-mono block">
                ${(stats.cardTotalBs / exchangeRate).toFixed(2)} equiv.
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <DollarSign size={14} />
                <span>Zelle ($ USD)</span>
              </div>
              <span className="text-lg font-bold text-indigo-950 font-mono block">
                ${stats.zelleTotalUsd.toFixed(2)}
              </span>
              <span className="text-[10px] text-indigo-700 font-mono block">
                Bs. {(stats.zelleTotalUsd * exchangeRate).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* RANKING DE ITEMS MÁS VENDIDOS ("LOS ITEMS") */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-amber-600" />
              <div>
                <h2 className="font-extrabold text-sm text-zinc-950">Items y Platos Más Vendidos</h2>
                <p className="text-xs text-zinc-500">Ranking por volumen y recaudación en el período</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-zinc-500">Top {topItems.length} Productos</span>
          </div>

          {topItems.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-xs">
              No hay items registrados en el período seleccionado.
            </div>
          ) : (
            <div className="space-y-3">
              {topItems.map((it, idx) => (
                <div key={it.id || idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-zinc-100 text-zinc-700 font-bold text-[11px] flex items-center justify-center font-mono">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-zinc-900">{it.name}</span>
                      <span className="text-zinc-500 text-[11px]">({it.qty} unidades vendidas)</span>
                    </div>

                    <div className="text-right font-mono">
                      <span className="font-bold text-zinc-950">
                        {currencyView === 'USD' ? `$${it.totalUsd.toFixed(2)}` : `Bs. ${it.totalBs.toFixed(2)}`}
                      </span>
                      <span className="text-zinc-400 text-[10px] ml-2">({it.share.toFixed(1)}%)</span>
                    </div>
                  </div>

                  {/* Barra de progreso de volumen */}
                  <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, it.share))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TABLA DE VENTAS EN VIVO CON GESTIÓN DE FACTURAS PARA CUADRE */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-sm text-zinc-950">
                Registro de Ventas en Vivo ({stats.validCount} válidas {stats.voidedCount > 0 ? `· ${stats.voidedCount} anuladas` : ''})
              </h2>
              <p className="text-xs text-zinc-500">
                Visualiza comprobantes o anula facturas con descuadre directamente desde el dashboard.
              </p>
            </div>

            <div className="relative max-w-xs w-full">
              <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar cliente, RIF o factura..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400 bg-zinc-50/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Comprobante</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Cliente / RIF</th>
                  <th className="py-3 px-4">Método de Pago</th>
                  <th className="py-3 px-4 text-right">Total ($)</th>
                  <th className="py-3 px-4 text-right">Total (Bs)</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-400">
                      No hay ventas registradas para el período seleccionado.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
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
                          isVoided ? 'bg-rose-50/40 text-zinc-400' : 'hover:bg-zinc-50/80'
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
                          {inv.date ? inv.date.slice(0, 16).replace('T', ' ') : 'Hoy'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-zinc-900 block truncate max-w-[170px]">
                            {inv.client?.name || inv.clientName || 'Consumidor Final'}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {inv.client?.rif || inv.clientRif || inv.clientCedula || 'V-00000000-0'}
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
                              title="Ver detalle del ticket"
                            >
                              <Eye size={14} />
                            </button>

                            {!isVoided ? (
                              <button
                                type="button"
                                onClick={() => setInvoiceToVoid(inv)}
                                className="p-1 rounded-lg hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                                title="Anular factura"
                              >
                                <XCircle size={14} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRestore(inv)}
                                className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                                title="Restaurar factura"
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setInvoiceToDelete(inv)}
                              className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Eliminar factura"
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
      </div>

      {/* MODAL PARA ANULAR FACTURA */}
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
                  {invoiceToVoid.client?.name || invoiceToVoid.clientName || 'Consumidor'} · ${Number(invoiceToVoid.total || invoiceToVoid.totalUSD || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Al anular esta factura, se excluirá automáticamente del total de ventas y de los libros contables SENIAT.
            </p>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">Motivo de anulación:</label>
              <input
                type="text"
                placeholder="Ej. Cobro duplicado, devolución, error de facturación..."
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
                onClick={handleConfirmVoid}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA ELIMINAR FACTURA */}
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
              </div>
            </div>

            <p className="text-xs text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200">
              ⚠️ Esta acción borrará la factura permanentemente de la base de datos y de todos los módulos.
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
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW DE FACTURA */}
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
