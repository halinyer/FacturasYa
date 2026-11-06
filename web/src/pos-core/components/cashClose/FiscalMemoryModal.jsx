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
  const [startDate, setStartDate] = useState(() => initialDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => initialDate || new Date().toISOString().split('T')[0]);
  const [startZ, setStartZ] = useState('');
  const [endZ, setEndZ] = useState('');
  const [filterMode, setFilterMode] = useState('date'); // 'date' | 'zNumber'
  const [loading, setLoading] = useState(false);
  const [printingTicket, setPrintingTicket] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Update initial dates if prop changes and modal opens
  useEffect(() => {
    if (isOpen && initialDate) {
      setStartDate(initialDate);
      setEndDate(initialDate);
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
        // PowerShell 5.1 serializa listas vacías como {} y de 1 elemento como objeto.
        // Normalizamos SIEMPRE a arreglo para evitar que la pantalla se caiga.
        let records = res.records;
        if (!Array.isArray(records)) {
          records = (records && typeof records === 'object' && Object.keys(records).length > 0) ? [records] : [];
        }
        setResultData({ ...res, records });
        if (records.length === 0) {
          setSuccessMsg('Consulta exitosa: No se encontraron cierres Z registrados en ese rango específico en la máquina fiscal.');
        } else {
          setSuccessMsg(`¡Consulta exitosa! Se recuperaron ${records.length} reporte(s) Z directamente de la memoria fiscal.`);
        }
      } else {
        setErrorMsg(res?.error || 'No se pudo leer la memoria fiscal. Verifique que la impresora esté conectada o el emulador en verde.');
      }
    } catch (err) {
      setErrorMsg(`Error de comunicación: ${err.message}`);
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
      setErrorMsg(`Error al imprimir: ${err.message}`);
    } finally {
      setPrintingTicket(false);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  // Pos invoices filtered for the same range to show direct side-by-side comparison
  const posComparison = useMemo(() => {
    if (!startDate) return { count: 0, totalBs: 0, baseBs: 0, ivaBs: 0 };
    const filtered = posInvoices.filter(inv => {
      if (inv.status === 'voided') return false;
      const d = (inv.date || '').includes('T') ? inv.date.split('T')[0] : (inv.date || '');
      if (filterMode === 'date') {
        return d >= startDate && d <= (endDate || startDate);
      }
      return true;
    });

    const fiscalOnly = filtered.filter(inv => inv.isFiscalInvoice || inv.fiscalInvoiceNumber);
    const totalBs = fiscalOnly.reduce((sum, inv) => {
      const bs = inv.totalBs || (inv.totalUSD * (inv.exchangeRate || exchangeRate));
      return sum + Number(bs || 0);
    }, 0);

    return {
      count: fiscalOnly.length,
      totalBs
    };
  }, [posInvoices, startDate, endDate, filterMode, exchangeRate]);

  // Totals from queried fiscal memory
  const memoryTotals = useMemo(() => {
    if (!resultData?.records || resultData.records.length === 0) {
      return { totalSalesBs: 0, baseGeneralBs: 0, taxGeneralBs: 0, exemptBs: 0, devolutionsBs: 0 };
    }
    return resultData.records.reduce((acc, z) => {
      acc.totalSalesBs += Number(z.totalSalesBs || 0);
      acc.baseGeneralBs += Number(z.baseGeneral16Bs || 0);
      acc.taxGeneralBs += Number(z.taxGeneral16Bs || 0);
      acc.exemptBs += Number(z.exemptSalesBs || 0);
      acc.devolutionsBs += Number(z.devolutionsBs || 0);
      return acc;
    }, { totalSalesBs: 0, baseGeneralBs: 0, taxGeneralBs: 0, exemptBs: 0, devolutionsBs: 0 });
  }, [resultData]);

  const formatBs = (val) => `Bs. ${(Number(val) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // IMPORTANTE: este return va DESPUÉS de todos los hooks (useMemo) para evitar el error React #310
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2800, backdropFilter: 'blur(5px)', padding: '16px'
    }}>
      <div style={{
        background: '#ffffff', borderRadius: '18px', maxWidth: '1050px', width: '100%',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', border: '1px solid #cbd5e1',
        overflow: 'hidden', color: '#0f172a'
      }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: '#e0f2fe', borderRadius: '12px', color: '#0284c7' }}>
              <FileText size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                Consulta de Memoria Fiscal SENIAT
              </h2>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Auditoría legal de montos, cierres Z y facturas reconocidas por la impresora fiscal The Factory HKA
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px',
              cursor: 'pointer', color: '#64748b'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Query Filter Bar */}
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
            padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setFilterMode('date')}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer',
                    background: filterMode === 'date' ? '#0284c7' : '#ffffff',
                    color: filterMode === 'date' ? '#ffffff' : '#64748b',
                    border: '1px solid #cbd5e1'
                  }}
                >
                  📅 Por Rango de Fechas
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('zNumber')}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer',
                    background: filterMode === 'zNumber' ? '#0284c7' : '#ffffff',
                    color: filterMode === 'zNumber' ? '#ffffff' : '#64748b',
                    border: '1px solid #cbd5e1'
                  }}
                >
                  🔢 Por Número de Reporte Z
                </button>
              </div>

              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>
                Puerto Activo: <b>{fiscalSettings?.port || 'COM2'}</b>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {filterMode === 'date' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Desde:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Hasta:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Desde Z #:</span>
                    <input
                      type="number"
                      placeholder="Ej: 1"
                      value={startZ}
                      onChange={(e) => setStartZ(e.target.value)}
                      style={{ width: '100px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Hasta Z #:</span>
                    <input
                      type="number"
                      placeholder="Ej: 5"
                      value={endZ}
                      onChange={(e) => setEndZ(e.target.value)}
                      style={{ width: '100px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handleQueryFiscalMemory}
                disabled={loading}
                style={{
                  padding: '9px 18px', background: '#0284c7', color: '#ffffff',
                  border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.85rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Search size={16} />
                <span>{loading ? 'Consultando Máquina...' : 'Consultar Memoria Fiscal'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPhysicalTicket}
                disabled={loading || printingTicket}
                style={{
                  padding: '9px 16px', background: '#ffffff', color: '#0f172a',
                  border: '1.5px solid #cbd5e1', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
                title="Imprime la tira de papel oficial en la impresora fiscal"
              >
                <Printer size={16} color="#d97706" />
                <span>{printingTicket ? 'Imprimiendo Tira...' : 'Imprimir Ticket Fiscal'}</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
              padding: '12px 16px', color: '#991b1b', fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <AlertCircle size={20} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px',
              padding: '12px 16px', color: '#065f46', fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <CheckCircle size={20} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Results Summary & Side-by-Side Comparison */}
          {resultData && (
            <>
              {/* Machine Hardware Info Pills */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', color: '#475569', fontWeight: '700' }}>
                  📠 Serial Máquina: <strong style={{ color: '#0f172a' }}>{resultData.registeredMachineNumber || 'N/A'}</strong>
                </span>
                <span style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', color: '#475569', fontWeight: '700' }}>
                  🏢 RIF Empresa: <strong style={{ color: '#0f172a' }}>{resultData.rif || 'N/A'}</strong>
                </span>
                <span style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', color: '#475569', fontWeight: '700' }}>
                  📊 Total Z Históricos en Máquina: <strong style={{ color: '#0f172a' }}>{resultData.totalZInPrinter}</strong>
                </span>
                <span style={{ background: '#e0f2fe', padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', color: '#0369a1', fontWeight: '700' }}>
                  🔍 Z Encontrados en Rango: <strong>{resultData.records?.length || 0}</strong>
                </span>
              </div>

              {(!resultData.records || resultData.records.length === 0) && resultData.diagnostic && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px', color: '#92400e', fontSize: '0.8rem' }}>
                  <b>Diagnóstico de la consulta (envíame esto si no aparecen Z):</b>
                  <div>Contador Z (S1): {resultData.diagnostic.zCounter} · Contador Auditoría (S1): {resultData.diagnostic.auditCounter}</div>
                  <div>Z devueltos por fecha: {resultData.diagnostic.byDateCount} · por número: {resultData.diagnostic.byNumberCount} · total leídos: {resultData.diagnostic.rawCount ?? 0}</div>
                  {resultData.diagnostic.byDateError && <div>Error por fecha: {resultData.diagnostic.byDateError}</div>}
                  {resultData.diagnostic.byNumberError && <div>Error por número: {resultData.diagnostic.byNumberError}</div>}
                  {resultData.diagnostic.samples && resultData.diagnostic.samples.length > 0 && (
                    <div>Muestra leída de la máquina: {[].concat(resultData.diagnostic.samples).join(' | ')}</div>
                  )}
                </div>
              )}

              {/* Auditoria Comparativa: Máquina Fiscal vs Sistema POS */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px'
              }}>
                {/* Lo que reconoció la máquina */}
                <div style={{
                  background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Cpu size={18} color="#16a34a" />
                    <span style={{ fontWeight: '800', fontSize: '0.88rem', color: '#166534' }}>
                      Reconocido por la Máquina Fiscal:
                    </span>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#15803d', marginBottom: '8px' }}>
                    {formatBs(memoryTotals.totalSalesBs)}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#166534', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span>• Base Imponible 16%: <b>{formatBs(memoryTotals.baseGeneralBs)}</b></span>
                    <span>• IVA Débito 16%: <b>{formatBs(memoryTotals.taxGeneralBs)}</b></span>
                    <span>• Ventas Exentas: <b>{formatBs(memoryTotals.exemptBs)}</b></span>
                    <span>• Devoluciones/Notas Crédito: <b>{formatBs(memoryTotals.devolutionsBs)}</b></span>
                  </div>
                </div>

                {/* Lo que registró el software FacturaPOS */}
                <div style={{
                  background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: '12px', padding: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <FileText size={18} color="#2563eb" />
                    <span style={{ fontWeight: '800', fontSize: '0.88rem', color: '#1e40af' }}>
                      Registrado en Software FacturaPOS:
                    </span>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1d4ed8', marginBottom: '8px' }}>
                    {formatBs(posComparison.totalBs)}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#1e40af', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span>• Facturas fiscales activas en el rango: <b>{posComparison.count} facturas</b></span>
                    <span>• Cuadre con la máquina: {Math.abs(memoryTotals.totalSalesBs - posComparison.totalBs) < 0.05 ? (
                      <strong style={{ color: '#16a34a' }}>✅ Cuadre Exacto (0.00 dif)</strong>
                    ) : (
                      <strong style={{ color: '#dc2626' }}>
                        Diferencia de {formatBs(Math.abs(memoryTotals.totalSalesBs - posComparison.totalBs))}
                      </strong>
                    )}</span>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{
                  padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #cbd5e1',
                  fontWeight: '800', fontSize: '0.85rem', color: '#334155'
                }}>
                  Detalle de Reportes Z Grabados en Memoria ({resultData.records?.length || 0})
                </div>

                <div style={{ overflowX: 'auto', maxHeight: '320px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                    <thead style={{ background: '#f1f5f9', color: '#475569', position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr>
                        <th style={{ padding: '10px 12px' }}>N° Z</th>
                        <th style={{ padding: '10px 12px' }}>Fecha Z</th>
                        <th style={{ padding: '10px 12px' }}>Serie Facturas (Desde – Hasta)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Ventas Exentas</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Base 16%</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>IVA 16%</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Ventas (Bs)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Devoluciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultData.records && resultData.records.length > 0 ? (
                        resultData.records.map((z, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ padding: '10px 12px', fontWeight: '800', color: '#0284c7' }}>
                              #{String(z.zNumber).padStart(4, '0')}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: '600' }}>
                              {z.zDate}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {z.firstInvoiceNumber ? String(z.firstInvoiceNumber).padStart(8, '0') : 'N/D'} – {String(z.lastInvoiceNumber || 0).padStart(8, '0')}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                              {formatBs(z.exemptSalesBs)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              {formatBs(z.baseGeneral16Bs)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#d97706', fontWeight: '700' }}>
                              {formatBs(z.taxGeneral16Bs)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: '#059669' }}>
                              {formatBs(z.totalSalesBs)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: z.devolutionsBs > 0 ? '#dc2626' : '#94a3b8' }}>
                              {formatBs(z.devolutionsBs)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                            No se encontraron cierres Z registrados en la memoria para este rango.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 16px', background: '#10b981', color: '#ffffff',
                    border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.85rem',
                    cursor: 'pointer', boxShadow: '0 2px 6px rgba(16,185,129,0.3)'
                  }}
                  title="Descargar archivo estructurado en Excel / CSV para el libro fiscal"
                >
                  <Download size={16} /> Exportar a Excel (.csv)
                </button>

                {onSyncZReports && (
                  <button
                    type="button"
                    onClick={() => {
                      onSyncZReports(resultData.records, resultData.registeredMachineNumber);
                      setSuccessMsg(`¡${resultData.records.length} Reporte(s) Z asentados exitosamente en el Libro de Ventas!`);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '9px 16px', background: '#0284c7', color: '#ffffff',
                      border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.85rem',
                      cursor: 'pointer', boxShadow: '0 2px 6px rgba(2,132,199,0.3)'
                    }}
                    title="Asentar estos Reportes Z directamente en el Libro de Ventas del sistema"
                  >
                    <CheckCircle size={16} /> Asentar en Libro de Ventas
                  </button>
                )}
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 20px', background: '#0f172a', color: '#ffffff',
                border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Cerrar Consulta
            </button>
          </div>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', zIndex: 2800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', maxWidth: '520px', color: '#0f172a' }}>
            <h3 style={{ marginTop: 0, color: '#991b1b' }}>Error al mostrar la memoria fiscal</h3>
            <p style={{ fontSize: '0.85rem', wordBreak: 'break-word' }}>{String(this.state.error?.message || this.state.error)}</p>
            <button type="button" onClick={() => { this.setState({ error: null }); this.props.onClose && this.props.onClose(); }}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
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
