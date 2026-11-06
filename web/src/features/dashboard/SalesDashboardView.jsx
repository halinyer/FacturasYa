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
  Filter
} from 'lucide-react';
import { useData } from '../../pos-core/contexts/DataContext';

export default function SalesDashboardView() {
  const data = useData();
  const exchangeRate = Number(data?.exchangeRate) || 876.80;
  const invoices = data?.invoices || [];

  const [dateRange, setDateRange] = useState('today'); // 'today' | 'week' | 'month' | 'all'
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar facturas según rango de fecha
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return invoices.filter((inv) => {
      if (!inv.date) return true;
      const invDateStr = inv.date.slice(0, 10);

      if (dateRange === 'today') {
        if (invDateStr !== todayStr) return false;
      } else if (dateRange === 'week') {
        const diffDays = (now - new Date(inv.date)) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (dateRange === 'month') {
        const diffDays = (now - new Date(inv.date)) / (1000 * 60 * 60 * 24);
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

      const method = inv.paymentMethod || 'cash';
      if (method === 'pago_movil') {
        pmCount++;
        pmTotalUsd += usd;
      } else if (method === 'usd_cash' || method === 'cash') {
        cashCount++;
        cashTotalUsd += usd;
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

          {/* SELECTOR DE PERÍODO */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs">
            <button
              type="button"
              onClick={() => setDateRange('today')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                dateRange === 'today'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setDateRange('week')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                dateRange === 'week'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              7 Días
            </button>
            <button
              type="button"
              onClick={() => setDateRange('month')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                dateRange === 'month'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => setDateRange('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                dateRange === 'all'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Histórico
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* TARJETAS DE MÉTRICAS PRINCIPALES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* TOTAL VENTAS */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
              <span>Ventas Netas</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <TrendingUp size={15} />
              </span>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-zinc-950 mono-num tracking-tight">
                ${stats.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-zinc-400 font-semibold mono-num">
                Bs. {stats.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* FACTURAS EMITIDAS */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
              <span>Facturas Emitidas</span>
              <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                <Receipt size={15} />
              </span>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-zinc-950 mono-num tracking-tight">
                {stats.count}
              </div>
              <div className="text-xs text-zinc-400 font-semibold">
                Transacciones registradas
              </div>
            </div>
          </div>

          {/* TICKET PROMEDIO */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
              <span>Ticket Promedio</span>
              <span className="p-1.5 rounded-lg bg-violet-50 text-violet-600">
                <DollarSign size={15} />
              </span>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-zinc-950 mono-num tracking-tight">
                ${stats.avgTicketUsd.toFixed(2)}
              </div>
              <div className="text-xs text-zinc-400 font-semibold mono-num">
                Bs. {(stats.avgTicketUsd * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* RECAUDACIÓN IGTF */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
              <span>IGTF Percibido (3%)</span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Receipt size={15} />
              </span>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-zinc-950 mono-num tracking-tight">
                ${stats.totalIgtfUsd.toFixed(2)}
              </div>
              <div className="text-xs text-zinc-400 font-semibold mono-num">
                Bs. {(stats.totalIgtfUsd * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* DESGLOSE POR MÉTODO DE PAGO */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-zinc-950">Desglose por Métodos de Pago</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 space-y-1">
              <span className="text-xs text-zinc-500 font-semibold flex items-center gap-1.5">
                <Smartphone size={14} className="text-indigo-600" /> Pago Móvil
              </span>
              <div className="text-lg font-bold text-zinc-950 mono-num">
                ${stats.pmTotalUsd.toFixed(2)}
              </div>
              <div className="text-[11px] text-zinc-400 mono-num">
                Bs. {(stats.pmTotalUsd * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 space-y-1">
              <span className="text-xs text-zinc-500 font-semibold flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-600" /> Divisas en Efectivo
              </span>
              <div className="text-lg font-bold text-zinc-950 mono-num">
                ${stats.cashTotalUsd.toFixed(2)}
              </div>
              <div className="text-[11px] text-zinc-400 mono-num">
                Bs. {(stats.cashTotalUsd * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 space-y-1">
              <span className="text-xs text-zinc-500 font-semibold flex items-center gap-1.5">
                <CreditCard size={14} className="text-sky-600" /> Punto de Venta / Tarjetas
              </span>
              <div className="text-lg font-bold text-zinc-950 mono-num">
                ${stats.cardTotalUsd.toFixed(2)}
              </div>
              <div className="text-[11px] text-zinc-400 mono-num">
                Bs. {(stats.cardTotalUsd * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* TABLA DE ÚLTIMAS FACTURAS */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-zinc-950">Registro de Facturas</h2>
            <div className="relative max-w-xs w-full">
              <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar por cliente o factura..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50/80 text-zinc-500 font-semibold border-b border-zinc-100">
                <tr>
                  <th className="py-3 px-4">Factura N°</th>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">RIF / C.I.</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4 text-right">Monto ($)</th>
                  <th className="py-3 px-4 text-right">Monto (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400">
                      No hay facturas registradas en este período.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv, idx) => {
                    const num = inv.invoiceNumber || inv.id || `FACT-${idx + 1}`;
                    const client = inv.client?.name || inv.clientName || 'Consumidor Final';
                    const rif = inv.client?.rif || inv.clientRif || 'V-00000000';
                    const usd = Number(inv.total || inv.totalUsd || 0);
                    const bs = Number(inv.totalBs || usd * exchangeRate);
                    const date = inv.date ? new Date(inv.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Hoy';

                    return (
                      <tr key={inv.id || idx} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-zinc-950 font-mono">{num}</td>
                        <td className="py-3 px-4 text-zinc-500">{date}</td>
                        <td className="py-3 px-4 font-semibold text-zinc-900">{client}</td>
                        <td className="py-3 px-4 font-mono text-zinc-500">{rif}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-zinc-100 text-zinc-700 border border-zinc-200">
                            {inv.paymentMethod || 'Efectivo / Mixto'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-zinc-950 font-mono">
                          ${usd.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-500">
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
