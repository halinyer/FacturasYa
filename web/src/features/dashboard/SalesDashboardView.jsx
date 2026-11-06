import React, { useState, useMemo } from 'react';
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
  Sparkles
} from 'lucide-react';
import { useData } from '../../pos-core/contexts/DataContext';

export default function SalesDashboardView() {
  const data = useData();
  const exchangeRate = Number(data?.exchangeRate) || 876.80;
  const invoices = data?.invoices || [];

  const [dateRange, setDateRange] = useState('today'); // 'today' | 'week' | 'month' | 'all'
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar facturas según rango de fecha (excluyendo facturas anuladas)
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return invoices.filter((inv) => {
      if (!inv.date) return true;
      if (inv.status === 'voided') return false;

      const invDateStr = inv.date.slice(0, 10);
      const invDateObj = new Date(inv.date);

      if (dateRange === 'today') {
        const isSameDay =
          invDateStr === todayStr ||
          (invDateObj.getFullYear() === now.getFullYear() &&
           invDateObj.getMonth() === now.getMonth() &&
           invDateObj.getDate() === now.getDate());
        if (!isSameDay) return false;
      } else if (dateRange === 'week') {
        const diffDays = (now - invDateObj) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (dateRange === 'month') {
        const diffDays = (now - invDateObj) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const clientName = (inv.client?.name || inv.clientName || '').toLowerCase();
        const clientRif = (inv.client?.rif || inv.clientRif || '').toLowerCase();
        const num = (inv.invoiceNumber || inv.id || '').toLowerCase();
        return clientName.includes(q) || clientRif.includes(q) || num.includes(q);
      }

      return true;
    });
  }, [invoices, dateRange, searchQuery]);

  // Cálculos estadísticos
  const stats = useMemo(() => {
    let totalUsd = 0;
    let totalBs = 0;
    let totalIgtfUsd = 0;
    let pmCount = 0;
    let cashCount = 0;
    let cardCount = 0;
    let pmTotalUsd = 0;
    let cashTotalUsd = 0;
    let cardTotalUsd = 0;

    filteredInvoices.forEach((inv) => {
      const usd = Number(inv.total || inv.totalUsd || 0);
      const bs = Number(inv.totalBs || usd * exchangeRate);
      const igtf = Number(inv.igtfUsd || 0);

      totalUsd += usd;
      totalBs += bs;
      totalIgtfUsd += igtf;

      const method = inv.paymentMethod || 'efectivo_usd';
      if (method === 'pago_movil') {
        pmCount++;
        pmTotalUsd += usd;
      } else if (method === 'efectivo_usd' || method === 'usd_cash' || method === 'cash' || method === 'zelle') {
        cashCount++;
        cashTotalUsd += usd;
      } else if (method === 'punto') {
        cardCount++;
        cardTotalUsd += usd;
      } else if (method === 'mixto') {
        const cUsd = Number(inv.paymentDetails?.cashUsd || 0);
        const pBs = Number(inv.paymentDetails?.pagoMovilBs || 0);
        cashTotalUsd += cUsd;
        pmTotalUsd += pBs / exchangeRate;
        cardTotalUsd += Math.max(0, usd - cUsd - (pBs / exchangeRate));
        cashCount++;
      } else {
        cardCount++;
        cardTotalUsd += usd;
      }
    });

    const count = filteredInvoices.length;
    const avgTicketUsd = count > 0 ? totalUsd / count : 0;

    return {
      totalUsd,
      totalBs,
      totalIgtfUsd,
      count,
      avgTicketUsd,
      pmTotalUsd,
      cashTotalUsd,
      cardTotalUsd
    };
  }, [filteredInvoices, exchangeRate]);

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-y-auto">
      {/* HEADER NOTION */}
      <div className="bg-white border-b border-zinc-200/80 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
                <LayoutDashboard size={18} />
              </span>
              <h1 className="text-xl font-bold text-zinc-950 tracking-tight">Dashboard de Ventas</h1>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Métricas financieras, recaudación fiscal y facturación en tiempo real
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-100 p-1 rounded-xl text-xs font-semibold">
              {[
                { id: 'today', label: 'Hoy' },
                { id: 'week', label: '7 Días' },
                { id: 'month', label: '30 Días' },
                { id: 'all', label: 'Todo' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDateRange(tab.id)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    dateRange === tab.id ? 'bg-white text-zinc-950 shadow-xs font-bold' : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl">
        {/* KPI CARDS PRINCIPALES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Ventas Totales ($)</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-zinc-950 font-mono">
              ${stats.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-zinc-400 font-mono block">
              Bs. {stats.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              {stats.count}
            </div>
            <span className="text-[11px] text-zinc-400 block">
              {stats.count === 1 ? '1 venta procesada' : `${stats.count} ventas procesadas`}
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
              ${stats.avgTicketUsd.toFixed(2)}
            </div>
            <span className="text-[11px] text-zinc-400 font-mono block">
              Bs. {(stats.avgTicketUsd * exchangeRate).toFixed(2)} por orden
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
            <span className="text-[11px] text-zinc-400 font-mono block">
              Bs. {(stats.totalIgtfUsd * exchangeRate).toFixed(2)} para declaración SENIAT
            </span>
          </div>
        </div>

        {/* MÉTODOS DE PAGO */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
          <h2 className="font-extrabold text-sm text-zinc-950">Desglose de Recaudación por Método</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <Banknote size={15} />
                <span>Efectivo Divisas ($ USD)</span>
              </div>
              <span className="text-xl font-black text-emerald-950 font-mono block">
                ${stats.cashTotalUsd.toFixed(2)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <Smartphone size={15} />
                <span>Pago Móvil (Bs)</span>
              </div>
              <span className="text-xl font-black text-blue-950 font-mono block">
                ${stats.pmTotalUsd.toFixed(2)}
              </span>
              <span className="text-[10px] text-blue-800 font-mono block">
                Bs. {(stats.pmTotalUsd * exchangeRate).toFixed(2)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                <CreditCard size={15} />
                <span>Punto de Venta POS (Bs)</span>
              </div>
              <span className="text-xl font-black text-sky-950 font-mono block">
                ${stats.cardTotalUsd.toFixed(2)}
              </span>
              <span className="text-[10px] text-sky-800 font-mono block">
                Bs. {(stats.cardTotalUsd * exchangeRate).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* TABLA DE ÚLTIMAS VENTAS */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-200/80 flex items-center justify-between gap-3">
            <h2 className="font-extrabold text-sm text-zinc-950">Ventas en Vivo ({filteredInvoices.length})</h2>
            <div className="relative max-w-xs">
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
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4 text-right">Total ($)</th>
                  <th className="py-3 px-4 text-right">Total (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400">
                      No hay ventas registradas para el período seleccionado.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const usd = Number(inv.total || inv.totalUsd || 0);
                    const bs = Number(inv.totalBs || usd * exchangeRate);
                    const isFiscal = inv.isFiscalInvoice || inv.docType === 'fiscal';

                    return (
                      <tr key={inv.id || inv.invoiceNumber} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-zinc-950 block">
                            {inv.invoiceNumber || inv.id}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                            isFiscal ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isFiscal ? 'Factura SENIAT' : 'Nota de Entrega'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-500 text-[11px]">
                          {inv.date ? inv.date.slice(0, 16).replace('T', ' ') : 'Hoy'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-zinc-900 block truncate max-w-[180px]">
                            {inv.client?.name || inv.clientName || 'Consumidor Final'}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {inv.client?.rif || inv.clientRif || 'V-00000000-0'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize px-2 py-0.5 rounded-full bg-zinc-100 font-bold text-zinc-700 text-[10px]">
                            {inv.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-zinc-950">
                          ${usd.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-500 text-[11px]">
                          Bs. {bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
    </div>
  );
}
