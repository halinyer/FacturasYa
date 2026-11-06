import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Download,
  Printer,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  FileText,
  Search,
  Filter,
  Layers
} from 'lucide-react';
import { useData } from '../../pos-core/contexts/DataContext';
import FiscalMemoryModal from '../../pos-core/components/cashClose/FiscalMemoryModal';
import { exportZReportsToCSV } from '../../pos-core/utils/seniatCsvExporter';

export default function FiscalBooksView() {
  const data = useData();
  const exchangeRate = Number(data?.exchangeRate) || 876.80;
  const invoices = data?.invoices || [];
  const purchases = data?.purchases || [];
  const zReports = data?.zReports || [];
  const isElectron = Boolean(window?.electronAPI?.fiscal);
  const [isFiscalMemoryModalOpen, setIsFiscalMemoryModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'purchases' | 'zreports'
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Filtrar facturas del mes seleccionado
  const monthlyInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!inv.date) return true;
      return inv.date.startsWith(selectedMonth);
    });
  }, [invoices, selectedMonth]);

  // Totales fiscales del Libro de Ventas
  const salesTotals = useMemo(() => {
    let totalFacturadoBs = 0;
    let baseImponibleBs = 0;
    let exentoBs = 0;
    let iva16Bs = 0;
    let igtfBs = 0;

    monthlyInvoices.forEach((inv) => {
      const invRate = Number(inv.exchangeRate) || exchangeRate;
      const usdTotal = Number(inv.total || inv.totalUsd || 0);
      const bsTotal = Number(inv.totalBs || usdTotal * invRate);
      const bsBase = Number(inv.baseImponibleBs || (inv.baseImponibleUsd ? inv.baseImponibleUsd * invRate : bsTotal / 1.16));
      const bsIva = Number(inv.iva16Bs || bsBase * 0.16);
      const bsExento = Number(inv.exentoBs || 0);
      const bsIgtf = Number(inv.igtfBs || (inv.igtfUsd ? inv.igtfUsd * invRate : 0));

      totalFacturadoBs += bsTotal;
      baseImponibleBs += bsBase;
      exentoBs += bsExento;
      iva16Bs += bsIva;
      igtfBs += bsIgtf;
    });

    return {
      totalFacturadoBs,
      baseImponibleBs,
      exentoBs,
      iva16Bs,
      igtfBs,
      count: monthlyInvoices.length
    };
  }, [monthlyInvoices, exchangeRate]);

  // Exportar Libro de Ventas a CSV Oficial SENIAT
  const exportSeniatCsv = () => {
    const headers = [
      'Operacion',
      'Fecha',
      'RIF/CI',
      'Nombre o Razon Social',
      'Numero Factura',
      'Numero Control',
      'Total Ventas Incluyendo IVA (Bs)',
      'Ventas Exentas (Bs)',
      'Base Imponible 16% (Bs)',
      'Alicuota',
      'Impuesto IVA 16% (Bs)',
      'IGTF Percibido 3% (Bs)'
    ];

    const rows = monthlyInvoices.map((inv, idx) => {
      const invRate = Number(inv.exchangeRate) || exchangeRate;
      const usdTotal = Number(inv.total || inv.totalUsd || 0);
      const bsTotal = Number(inv.totalBs || usdTotal * invRate);
      const bsBase = Number(inv.baseImponibleBs || (inv.baseImponibleUsd ? inv.baseImponibleUsd * invRate : bsTotal / 1.16));
      const bsIva = Number(inv.iva16Bs || bsBase * 0.16);
      const bsExento = Number(inv.exentoBs || 0);
      const bsIgtf = Number(inv.igtfBs || (inv.igtfUsd ? inv.igtfUsd * invRate : 0));

      return [
        idx + 1,
        inv.date ? inv.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        `"${inv.client?.rif || inv.clientRif || 'V-00000000'}"`,
        `"${inv.client?.name || inv.clientName || 'Consumidor Final'}"`,
        `"${inv.invoiceNumber || inv.id || idx + 1}"`,
        `"${inv.fiscalSerial ? '00-' + inv.fiscalSerial : '00-000001'}"`,
        bsTotal.toFixed(2),
        bsExento.toFixed(2),
        bsBase.toFixed(2),
        '16%',
        bsIva.toFixed(2),
        bsIgtf.toFixed(2)
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Libro_Ventas_SENIAT_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-y-auto">
      {/* HEADER DE MÓDULO ESTILO NOTION */}
      <div className="bg-white border-b border-zinc-200/80 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
                <BookOpen size={18} />
              </span>
              <h1 className="text-xl font-bold text-zinc-950 tracking-tight">Libros Fiscales SENIAT</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Cumplimiento Tributario VE
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Libros legales de Ventas, Compras y archivo de Cierres Z según normativa SENIAT
            </p>
          </div>

          {/* ACCIONES Y FILTRO DE MES */}
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold bg-zinc-50 text-zinc-800 cursor-pointer"
            />

            <button
              type="button"
              onClick={exportSeniatCsv}
              className="px-3 py-1.5 rounded-xl bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download size={14} />
              <span>Exportar CSV SENIAT</span>
            </button>
          </div>
        </div>

        {/* PESTAÑAS SEGMENTADAS ESTILO NOTION */}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'sales'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Libro de Ventas ({monthlyInvoices.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('purchases')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'purchases'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Libro de Compras ({purchases.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('zreports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'zreports'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Reportes Z Fiscales ({zReports.length})
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* RESUMEN TRIBUTARIO FISCAL (CARDS NOTION) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Base Imponible 16%
            </span>
            <div className="text-lg font-bold text-zinc-950 mono-num">
              Bs. {salesTotals.baseImponibleBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-zinc-400">Gravado ordinario</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Débito Fiscal IVA (16%)
            </span>
            <div className="text-lg font-bold text-zinc-950 mono-num text-emerald-700">
              Bs. {salesTotals.iva16Bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-zinc-400">Impuesto recaudado</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Ventas Exentas
            </span>
            <div className="text-lg font-bold text-zinc-950 mono-num">
              Bs. {salesTotals.exentoBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-zinc-400">No sujetas a IVA</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
              IGTF Percibido (3%)
            </span>
            <div className="text-lg font-bold text-zinc-950 mono-num text-amber-700">
              Bs. {salesTotals.igtfBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-zinc-400">Divisas en efectivo</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Total Facturado con IVA
            </span>
            <div className="text-lg font-bold text-zinc-950 mono-num">
              Bs. {salesTotals.totalFacturadoBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-zinc-400 font-semibold">{salesTotals.count} comprobantes</span>
          </div>
        </div>

        {/* TABLA PRINCIPAL DE REGISTROS FISCALES */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50/80 text-zinc-500 font-semibold border-b border-zinc-100">
                <tr>
                  <th className="py-3 px-3">Op. N°</th>
                  <th className="py-3 px-3">Fecha</th>
                  <th className="py-3 px-3">RIF / C.I.</th>
                  <th className="py-3 px-4">Razón Social / Cliente</th>
                  <th className="py-3 px-3">Factura N°</th>
                  <th className="py-3 px-3 text-right">Total Facturado (Bs)</th>
                  <th className="py-3 px-3 text-right">Base Imponible (Bs)</th>
                  <th className="py-3 px-3 text-right">IVA 16% (Bs)</th>
                  <th className="py-3 px-3 text-right">IGTF 3% (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {monthlyInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-zinc-400">
                      No hay operaciones fiscales registradas en el mes seleccionado ({selectedMonth}).
                    </td>
                  </tr>
                ) : (
                  monthlyInvoices.map((inv, idx) => {
                    const invRate = Number(inv.exchangeRate) || exchangeRate;
                    const usdTotal = Number(inv.total || inv.totalUsd || 0);
                    const bsTotal = Number(inv.totalBs || usdTotal * invRate);
                    const bsBase = Number(inv.baseImponibleBs || (inv.baseImponibleUsd ? inv.baseImponibleUsd * invRate : bsTotal / 1.16));
                    const bsIva = Number(inv.iva16Bs || bsBase * 0.16);
                    const bsIgtf = Number(inv.igtfBs || (inv.igtfUsd ? inv.igtfUsd * invRate : 0));

                    return (
                      <tr key={inv.id || idx} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-3 px-3 font-mono text-zinc-400">{idx + 1}</td>
                        <td className="py-3 px-3 text-zinc-500">
                          {inv.date ? inv.date.slice(0, 10) : 'Hoy'}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-zinc-800">
                          {inv.client?.rif || inv.clientRif || 'V-00000000'}
                        </td>
                        <td className="py-3 px-4 font-medium text-zinc-900">
                          {inv.client?.name || inv.clientName || 'Consumidor Final'}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-zinc-950">
                          {inv.invoiceNumber || inv.id || idx + 1}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-zinc-950 font-mono">
                          {bsTotal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-zinc-600">
                          {bsBase.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold">
                          {bsIva.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-amber-700 font-semibold">
                          {bsIgtf.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
