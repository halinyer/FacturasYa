import { exportZReportsToCSV } from '../../utils/seniatCsvExporter';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Printer, 
  Search, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Cpu, 
  RefreshCw,
  Hash,
  Download
} from 'lucide-react';

function getMonthDateRange(dateStr) {
  if (!dateStr) {
    const today = new Date().toISOString().split('T')[0];
    return { start: today, end: today };
  }
  const parts = String(dateStr).split('-');
  if (parts.length >= 2) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const start = `${parts[0]}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${parts[0]}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  }
  return { start: dateStr, end: dateStr };
}

function FiscalMemoryModalInner({
  isOpen,
  onClose,
  initialDate,
  fiscalSettings,
  fiscalGetFiscalMemory,
  fiscalPrintFiscalMemory,
  onSyncZReports,
  posInvoices = [],
  exchangeRate = 876.80
}) {
  const initialRange = useMemo(() => getMonthDateRange(initialDate), [initialDate]);
  const [startDate, setStartDate] = useState(() => initialRange.start);
  const [endDate, setEndDate] = useState(() => initialRange.end);
  const [startZ, setStartZ] = useState('');
  const [endZ, setEndZ] = useState('');
  const [filterMode, setFilterMode] = useState('date'); // 'date' | 'zNumber'
  const [loading, setLoading] = useState(false);
  const [printingTicket, setPrintingTicket] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (isOpen && initialDate) {
      const r = getMonthDateRange(initialDate);
      setStartDate(r.start);
      setEndDate(r.end);
    }
  }, [isOpen, initialDate]);

  const handleQueryFiscalMemory = async () => {
    if (!fiscalGetFiscalMemory) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const options = {};
      if (filterMode === 'date') {
        if (startDate) options.startDate = startDate;
        if (endDate) options.endDate = endDate;
      } else {
        if (startZ) options.startZ = parseInt(startZ, 10);
        if (endZ) options.endZ = parseInt(endZ, 10);
      }

      const res = await fiscalGetFiscalMemory(options);
      if (res && res.success) {
        let records = res.records;
        if (!Array.isArray(records)) {
          records = (records && typeof records === 'object' && Object.keys(records).length > 0) ? [records] : [];
        }
        setResultData({ ...res, records });
        if (records.length === 0) {
          setSuccessMsg('Consulta exitosa: No se encontraron cierres Z registrados en ese rango específico en la memoria fiscal.');
        } else {
          setSuccessMsg(`¡Consulta exitosa! Se recuperaron ${records.length} reporte(s) Z directamente de la memoria fiscal.`);
        }
      } else {
        setErrorMsg(res?.error || 'No se pudo leer la memoria fiscal. Verifique que la impresora esté conectada por COM2 o el emulador en verde.');
      }
    } catch (err) {
      setErrorMsg(`Error de comunicación con máquina fiscal: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  const handlePrintPhysicalTicket = async () => {
    if (!fiscalPrintFiscalMemory) return;
    if (!window.confirm('¿Desea emitir la impresión física del Reporte de Memoria Fiscal en la tira de papel de la impresora?')) {
      return;
    }

    setPrintingTicket(true);
    setErrorMsg(null);
    try {
      const options = {};
      if (filterMode === 'date') {
        if (startDate) options.startDate = startDate;
        if (endDate) options.endDate = endDate;
      } else {
        if (startZ) options.startZ = parseInt(startZ, 10);
        if (endZ) options.endZ = parseInt(endZ, 10);
      }

      const res = await fiscalPrintFiscalMemory(options);
      if (res && res.success) {
        setSuccessMsg(res.message || 'Reporte de memoria fiscal enviado a la impresora.');
      } else {
        setErrorMsg(res?.error || 'La impresora rechazó el comando de impresión de memoria fiscal.');
      }
    } catch (err) {
      setErrorMsg(`Error al imprimir en papel: ${err.message}`);
    } finally {
      setPrintingTicket(false);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  // Comparativa con facturas fiscales del POS en el mismo rango
  const posComparison = useMemo(() => {
    if (!startDate) return { count: 0, totalBs: 0 };
    const filtered = posInvoices.filter((inv) => {
      if (inv.status === 'voided' || inv.status === 'anulada') return false;
      const d = (inv.date || '').includes('T') ? inv.date.split('T')[0] : (inv.date || '');
      if (filterMode === 'date') {
        return d >= startDate && d <= (endDate || startDate);
      }
      return true;
    });

    const fiscalOnly = filtered.filter((inv) => inv.isFiscalInvoice || inv.docType === 'fiscal' || inv.fiscalInvoiceNumber);
    const totalBs = fiscalOnly.reduce((sum, inv) => {
      const bs = inv.totalBs || ((inv.totalUSD || inv.total || 0) * (inv.exchangeRate || exchangeRate));
      return sum + Number(bs || 0);
    }, 0);

    return {
      count: fiscalOnly.length,
      totalBs
    };
  }, [posInvoices, startDate, endDate, filterMode, exchangeRate]);

  // Totales acumulados de la memoria fiscal leída
  const memoryTotals = useMemo(() => {
    if (!resultData?.records || resultData.records.length === 0) {
      return { totalSalesBs: 0, baseGeneralBs: 0, taxGeneralBs: 0, exemptBs: 0, devolutionsBs: 0 };
    }
    return resultData.records.reduce(
      (acc, z) => {
        acc.totalSalesBs += Number(z.totalSalesBs || 0);
        acc.baseGeneralBs += Number(z.baseGeneral16Bs || 0);
        acc.taxGeneralBs += Number(z.taxGeneral16Bs || 0);
        acc.exemptBs += Number(z.exemptSalesBs || 0);
        acc.devolutionsBs += Number(z.devolutionsBs || 0);
        return acc;
      },
      { totalSalesBs: 0, baseGeneralBs: 0, taxGeneralBs: 0, exemptBs: 0, devolutionsBs: 0 }
    );
  }, [resultData]);

  const formatBs = (val) =>
    `Bs. ${(Number(val) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden text-zinc-950">
        
        {/* Modal Header Notion */}
        <div className="px-6 py-4 bg-white border-b border-zinc-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center">
              <Cpu size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-zinc-950 tracking-tight">
                  Auditoría de Memoria Fiscal SENIAT (HKA80)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Puerto: {fiscalSettings?.port || 'COM2'}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Lectura de hardware y conciliación legal de Cierres Z grabados en la memoria física de la máquina
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Query Filter Bar */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Segmented Mode Control */}
              <div className="flex items-center gap-1 bg-zinc-200/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilterMode('date')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterMode === 'date'
                      ? 'bg-white text-zinc-950 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  📅 Por Rango de Fechas
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('zNumber')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterMode === 'zNumber'
                      ? 'bg-white text-zinc-950 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  🔢 Por Número de Cierre Z
                </button>
              </div>

              {/* Presets rápidos */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] text-zinc-500 font-semibold">Atajos:</span>
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('date');
                    const r = getMonthDateRange(initialDate || new Date().toISOString().split('T')[0]);
                    setStartDate(r.start);
                    setEndDate(r.end);
                  }}
                  className="px-2 py-0.5 rounded-md bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-[11px] font-semibold cursor-pointer"
                >
                  Mes Actual
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('date');
                    const end = new Date().toISOString().split('T')[0];
                    const startObj = new Date();
                    startObj.setDate(startObj.getDate() - 30);
                    const start = startObj.toISOString().split('T')[0];
                    setStartDate(start);
                    setEndDate(end);
                  }}
                  className="px-2 py-0.5 rounded-md bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-[11px] font-semibold cursor-pointer"
                >
                  Últimos 30 días
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('zNumber');
                    setStartZ('1');
                    setEndZ('9999');
                  }}
                  className="px-2 py-0.5 rounded-md bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-[11px] font-semibold cursor-pointer"
                >
                  Todo el Historial Z
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {filterMode === 'date' ? (
                <>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-zinc-600">Desde:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 font-mono text-xs focus:outline-none focus:border-zinc-900 shadow-2xs"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-zinc-600">Hasta:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 font-mono text-xs focus:outline-none focus:border-zinc-900 shadow-2xs"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-zinc-600">Desde Z #:</span>
                    <input
                      type="number"
                      placeholder="Ej: 1"
                      value={startZ}
                      onChange={(e) => setStartZ(e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 font-mono text-xs focus:outline-none focus:border-zinc-900 shadow-2xs"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-zinc-600">Hasta Z #:</span>
                    <input
                      type="number"
                      placeholder="Ej: 50"
                      value={endZ}
                      onChange={(e) => setEndZ(e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 font-mono text-xs focus:outline-none focus:border-zinc-900 shadow-2xs"
                    />
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handleQueryFiscalMemory}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs disabled:opacity-50"
              >
                {loading ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                <span>{loading ? 'Consultando Máquina...' : 'Consultar Memoria Fiscal'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPhysicalTicket}
                disabled={loading || printingTicket}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 bg-white text-zinc-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                title="Imprime la tira de papel oficial directamente en la impresora fiscal"
              >
                <Printer size={13} className="text-amber-600" />
                <span>{printingTicket ? 'Imprimiendo Tira...' : 'Imprimir Tira en Papel'}</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Results Summary & Side-by-Side Comparison */}
          {resultData && (
            <div className="space-y-4">
              {/* Machine Hardware Info Pills */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="bg-zinc-100 border border-zinc-200/80 px-2.5 py-1 rounded-lg text-zinc-600 font-medium">
                  📠 Serial Máquina: <strong className="text-zinc-950 font-mono">{resultData.registeredMachineNumber || 'HKA80'}</strong>
                </span>
                <span className="bg-zinc-100 border border-zinc-200/80 px-2.5 py-1 rounded-lg text-zinc-600 font-medium">
                  🏢 RIF Empresa: <strong className="text-zinc-950 font-mono">{resultData.rif || 'N/A'}</strong>
                </span>
                <span className="bg-zinc-100 border border-zinc-200/80 px-2.5 py-1 rounded-lg text-zinc-600 font-medium">
                  📊 Total Z en Memoria: <strong className="text-zinc-950 font-mono">{resultData.totalZInPrinter}</strong>
                </span>
                <span className="bg-zinc-900 text-white px-2.5 py-1 rounded-lg font-bold">
                  🔍 Reportes Z Recuperados: {resultData.records?.length || 0}
                </span>
              </div>

              {/* Auditoría Comparativa: Máquina Fiscal vs Sistema POS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Reconocido por la Máquina Fiscal */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
                    <Cpu size={15} className="text-emerald-700" />
                    <span>Reconocido por la Memoria Fiscal (HKA80):</span>
                  </div>
                  <div className="text-xl font-extrabold font-mono text-emerald-950">
                    {formatBs(memoryTotals.totalSalesBs)}
                  </div>
                  <div className="text-[11px] text-emerald-800 space-y-0.5 pt-1">
                    <div>• Base Imponible 16%: <strong className="font-mono">{formatBs(memoryTotals.baseGeneralBs)}</strong></div>
                    <div>• IVA Débito 16%: <strong className="font-mono">{formatBs(memoryTotals.taxGeneralBs)}</strong></div>
                    <div>• Ventas Exentas: <strong className="font-mono">{formatBs(memoryTotals.exemptBs)}</strong></div>
                    <div>• Devoluciones/Notas Crédito: <strong className="font-mono">{formatBs(memoryTotals.devolutionsBs)}</strong></div>
                  </div>
                </div>

                {/* Registrado en Software FacturaPOS */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-zinc-800 font-extrabold text-xs">
                    <FileText size={15} className="text-zinc-700" />
                    <span>Registrado en Software FacturaPOS:</span>
                  </div>
                  <div className="text-xl font-extrabold font-mono text-zinc-950">
                    {formatBs(posComparison.totalBs)}
                  </div>
                  <div className="text-[11px] text-zinc-600 space-y-0.5 pt-1">
                    <div>• Facturas fiscales en el rango: <strong className="font-mono">{posComparison.count} facturas</strong></div>
                    <div>
                      • Cuadre con la máquina:{' '}
                      {Math.abs(memoryTotals.totalSalesBs - posComparison.totalBs) < 0.05 ? (
                        <strong className="text-emerald-700 font-bold">✅ Cuadre Exacto (0.00 dif)</strong>
                      ) : (
                        <strong className="text-rose-700 font-bold">
                          Diferencia de {formatBs(Math.abs(memoryTotals.totalSalesBs - posComparison.totalBs))}
                        </strong>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 font-bold text-xs text-zinc-800 flex items-center justify-between">
                  <span>Detalle de Reportes Z Grabados en Memoria ({resultData.records?.length || 0})</span>
                  <span className="text-[11px] text-zinc-500 font-normal">Grabación inmutable oficial SENIAT</span>
                </div>

                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">N° Z</th>
                        <th className="py-2.5 px-3">Fecha Z</th>
                        <th className="py-2.5 px-3">Serie Facturas</th>
                        <th className="py-2.5 px-3 text-right">Exento</th>
                        <th className="py-2.5 px-3 text-right">Base 16%</th>
                        <th className="py-2.5 px-3 text-right">IVA 16%</th>
                        <th className="py-2.5 px-3 text-right">Total Ventas (Bs)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-mono">
                      {resultData.records && resultData.records.length > 0 ? (
                        resultData.records.map((z, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-zinc-950">
                              Z-{String(z.zNumber).padStart(4, '0')}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-700">
                              {z.zDate}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-600 text-[11px]">
                              {z.firstInvoiceNumber ? String(z.firstInvoiceNumber).padStart(8, '0') : 'N/D'} – {String(z.lastInvoiceNumber || 0).padStart(8, '0')}
                            </td>
                            <td className="py-2.5 px-3 text-right text-zinc-500">
                              {formatBs(z.exemptSalesBs)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-zinc-800">
                              {formatBs(z.baseGeneral16Bs)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-amber-700 font-bold">
                              {formatBs(z.taxGeneral16Bs)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-zinc-950 font-black">
                              {formatBs(z.totalSalesBs)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-zinc-400 font-sans">
                            No se encontraron cierres Z registrados en la memoria para este rango.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Notion */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {resultData?.records && resultData.records.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    exportZReportsToCSV({
                      selectedMonth: (startDate || '').split('-')[1] || '10',
                      selectedYear: (startDate || '').split('-')[0] || '2026',
                      zRecords: resultData.records,
                      machineNumber: resultData.registeredMachineNumber,
                      rif: resultData.rif
                    });
                    setSuccessMsg('¡Archivo oficial de Reportes Z exportado exitosamente!');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Descargar archivo estructurado en Excel / CSV para el libro fiscal"
                >
                  <Download size={14} />
                  <span>Exportar a Excel (.csv)</span>
                </button>

                {onSyncZReports && (
                  <button
                    type="button"
                    onClick={() => {
                      onSyncZReports(resultData.records, resultData.registeredMachineNumber);
                      setSuccessMsg(`¡${resultData.records.length} Reporte(s) Z asentados exitosamente en el Libro de Ventas!`);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Asentar estos Reportes Z directamente en el Libro de Ventas del sistema"
                  >
                    <CheckCircle size={14} className="text-emerald-400" />
                    <span>Asentar en Libro de Ventas</span>
                  </button>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-bold cursor-pointer transition-colors"
          >
            Cerrar Consulta
          </button>
        </div>

      </div>
    </div>
  );
}

class FiscalMemoryErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[FiscalMemoryModal] Error de render:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-zinc-200 shadow-2xl text-zinc-950 space-y-3">
            <h3 className="font-extrabold text-base text-rose-700">Error al mostrar la memoria fiscal</h3>
            <p className="text-xs text-zinc-600 word-break">{String(this.state.error?.message || this.state.error)}</p>
            <button
              type="button"
              onClick={() => { this.setState({ error: null }); this.props.onClose && this.props.onClose(); }}
              className="px-4 py-2 rounded-xl bg-zinc-950 text-white text-xs font-bold cursor-pointer hover:bg-zinc-800"
            >
              Cerrar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function FiscalMemoryModal(props) {
  return (
    <FiscalMemoryErrorBoundary onClose={props.onClose}>
      <FiscalMemoryModalInner {...props} />
    </FiscalMemoryErrorBoundary>
  );
}
