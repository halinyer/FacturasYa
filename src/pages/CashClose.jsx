import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  Lock, 
  Calendar, 
  DollarSign, 
  CheckCircle,
  FileText,
  AlertCircle,
  Banknote,
  TrendingUp
} from 'lucide-react';
import InvoicePreview from '../components/InvoicePreview';

export default function CashClose() {
  const { invoices = [], cashCloses = [], createCashClose, clients = [], exchangeRate = 876.80 } = useData() || {};
  const [activeTab, setActiveTab] = useState('cierre'); // 'cierre' or 'historial'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [toast, setToast] = useState(null);
  const [physicalCountUSD, setPhysicalCountUSD] = useState('');
  const [physicalCountBs, setPhysicalCountBs] = useState('');

  const getClientName = (inv) => {
    if (inv.clientName) return inv.clientName;
    const c = (clients || []).find(client => client.id === inv.clientId);
    return c ? c.name : 'Cliente Genérico';
  };

  // Filter today's invoices
  const todaysInvoices = useMemo(() => {
    return (invoices || []).filter(inv => {
      if (!inv.date) return false;
      const invDate = new Date(inv.date).toISOString().split('T')[0];
      return invDate === selectedDate;
    });
  }, [invoices, selectedDate]);

  // Calculate stats for selected date
  const stats = useMemo(() => {
    return todaysInvoices.reduce((acc, inv) => {
      const totalUSD = Number(inv.totalUSD) || 0;
      const totalBs = Number(inv.totalBs) || 0;
      const stat = (inv.status || '').toLowerCase();
      const currentInvRate = Number(inv.exchangeRate) || exchangeRate || 876.80;

      acc.totalFacturado += totalUSD;
      acc.totalBs += totalBs;
      acc.count += 1;

      if (stat === 'paid' || stat === 'pagada') {
        acc.ingresoReal += totalUSD;
        const method = inv.paymentMethod || 'efectivo_usd';

        if (method === 'mixto' && inv.mixedPayments) {
          if (!acc.breakdown['mixto']) {
            acc.breakdown['mixto'] = { count: 0, total: 0 };
          }
          acc.breakdown['mixto'].count += 1;
          acc.breakdown['mixto'].total += totalUSD;

          const mixedUsd = parseFloat(inv.mixedPayments.efectivo_usd) || 0;
          const mixedBs = parseFloat(inv.mixedPayments.efectivo_bs) || 0;
          acc.expectedCashUSD += mixedUsd;
          acc.expectedCashBs += mixedBs;
        } else {
          if (!acc.breakdown[method]) {
            acc.breakdown[method] = { count: 0, total: 0 };
          }
          acc.breakdown[method].count += 1;
          acc.breakdown[method].total += totalUSD;

          if (method === 'efectivo_usd') {
            acc.expectedCashUSD += totalUSD;
          } else if (method === 'efectivo_bs') {
            const bsAmount = totalBs > 0 ? totalBs : (totalUSD * currentInvRate);
            acc.expectedCashBs += bsAmount;
          }
        }
      } else if (stat === 'pending' || stat === 'pendiente') {
        acc.deudaNueva += totalUSD;
      } else if (stat === 'partial' || stat === 'parcial') {
        const paid = Number(inv.paidAmountUSD) || 0;
        acc.ingresoReal += paid;
        acc.deudaNueva += (totalUSD - paid);
      }

      return acc;
    }, {
      totalFacturado: 0,
      totalBs: 0,
      ingresoReal: 0,
      deudaNueva: 0,
      count: 0,
      expectedCashUSD: 0,
      expectedCashBs: 0,
      breakdown: {
        'efectivo_usd': { count: 0, total: 0 },
        'pago_movil': { count: 0, total: 0 },
        'efectivo_bs': { count: 0, total: 0 },
        'zelle': { count: 0, total: 0 },
        'mixto': { count: 0, total: 0 }
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
    const newClose = {
      id: Date.now().toString(),
      date: selectedDate,
      totalVentas: stats.totalFacturado,
      totalCobrado: stats.ingresoReal,
      totalPendiente: stats.deudaNueva,
      exchangeRate,
      expectedCashUSD,
      countedCashUSD: countedUSD,
      differenceUSD: diffUSD,
      expectedCashBs,
      countedCashBs: countedBs,
      differenceBs: diffBs,
      totalExpectedUSD,
      totalCountedUSD,
      unifiedDiffUSD,
      breakdown: stats.breakdown,
      invoicesCount: stats.count,
      createdAt: new Date().toISOString()
    };
    createCashClose(newClose);
    setShowConfirm(false);
    setToast('¡Caja cerrada y arqueada exitosamente!');
    setTimeout(() => setToast(null), 3000);
  };

  const formatUSD = (val) => `$${(Number(val) || 0).toFixed(2)}`;
  const formatBsNumber = (val) => `Bs. ${(Number(val) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const methodName = (k) => {
    if (k === 'efectivo_usd') return '💵 Efectivo $';
    if (k === 'pago_movil') return '📱 Pago Móvil';
    if (k === 'efectivo_bs') return '🇻🇪 Efectivo Bs';
    if (k === 'zelle') return '💳 Zelle / Tarjeta';
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

        {/* Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        <div style={{ background: '#ffffff', border: '1.5px solid #fde68a', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '4px' }}>Total Facturado del Día</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#111827' }}>{formatUSD(stats.totalFacturado)}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>{stats.count} facturas emitidas</div>
        </div>

        <div style={{ background: '#ffffff', border: '1.5px solid #a7f3d0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '4px' }}>Dinero Real Ingresado (Caja)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#34d399' }}>{formatUSD(stats.ingresoReal)}</div>
          <div style={{ fontSize: '0.8rem', color: '#34d399', marginTop: '4px' }}>Disponible en caja/bancos</div>
        </div>

        <div style={{ background: '#ffffff', border: '1.5px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '4px' }}>Crédito / Deuda Nueva</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: stats.deudaNueva > 0 ? '#f87171' : '#94a3b8' }}>
            {formatUSD(stats.deudaNueva)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Clientes congelador</div>
        </div>

      </div>

      {/* Breakdown by Payment Method & Invoices */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '24px' }}>
        
        {/* Payment Methods */}
        <div style={{ background: '#ffffff', border: '1px solid #eaedf2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Desglose por Método</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.keys(stats.breakdown).map(k => {
              const item = stats.breakdown[k] || { count: 0, total: 0 };
              return (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#f9fafb', borderRadius: '8px', fontSize: '0.9rem' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{methodName(k)}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.count} transacciones</div>
                  </div>
                  <div style={{ fontWeight: '700', color: '#38bdf8' }}>
                    {formatUSD(item.total)}
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
                <span style={{ fontWeight: '700', color: '#d97706' }}>🇻🇪 Efectivo Bolívares (Bs)</span>
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
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            style={{
              marginTop: '20px', width: '100%', padding: '12px',
              background: '#dc2626', color: '#ffffff', border: 'none',
              borderRadius: '8px', fontWeight: '800', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.95rem'
            }}
          >
            <Lock size={18} /> CERRAR CAJA DE HOY
          </button>
        </div>

        {/* Today's Invoices Table */}
        <div style={{ background: '#ffffff', border: '1px solid #eaedf2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '12px', padding: '20px', overflowX: 'auto' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Facturas del Día ({todaysInvoices.length})</h3>
          
          {todaysInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
              No hay facturas registradas en la fecha seleccionada.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ color: '#6b7280', borderBottom: '1px solid #eaedf2', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Nº</th>
                  <th style={{ padding: '8px' }}>Cliente</th>
                  <th style={{ padding: '8px' }}>Método</th>
                  <th style={{ padding: '8px' }}>Total ($)</th>
                  <th style={{ padding: '8px' }}>Estado</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Ver</th>
                </tr>
              </thead>
              <tbody>
                {todaysInvoices.map(inv => {
                  const stat = (inv.status || '').toLowerCase();
                  const isPaid = stat === 'paid' || stat === 'pagada';

                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px', color: '#38bdf8', fontWeight: '600' }}>{inv.invoiceNumber}</td>
                      <td style={{ padding: '8px' }}>{getClientName(inv)}</td>
                      <td style={{ padding: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontWeight: '600' }}>{methodName(inv.paymentMethod)}</span>
                          {(inv.pagoMovilBank || inv.pagoMovilRef) && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.72rem',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: '700',
                              width: 'fit-content'
                            }}>
                              {inv.pagoMovilBank && <span>🏦 {inv.pagoMovilBank}</span>}
                              {inv.pagoMovilRef && <span>#{inv.pagoMovilRef}</span>}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '8px', fontWeight: '700' }}>{formatUSD(inv.totalUSD)}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ 
                          padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem',
                          background: isPaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                          color: isPaid ? '#34d399' : '#f87171'
                        }}>
                          {isPaid ? 'Pagada' : 'Pendiente'}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          style={{ background: 'transparent', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '420px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', color: '#f59e0b' }}>Confirmar Cierre de Caja</h3>
            <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '0.9rem', lineHeight: '1.5' }}>
              ¿Estás seguro de que deseas cerrar la caja para la fecha <strong>{selectedDate}</strong> con un total de <strong>{formatUSD(stats.ingresoReal)}</strong> cobrados?
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
                Confirmar Cierre
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {activeTab === 'historial' && (
        <div style={{ background: '#ffffff', border: '1px solid #eaedf2', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #eaedf2', background: '#f8fafc' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#111827', fontWeight: '700' }}>Registro de Cierres Anteriores</h2>
          </div>
          {cashCloses.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No hay cierres de caja registrados todavía.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '12px 20px', fontWeight: '600' }}>Fecha</th>
                    <th style={{ padding: '12px 20px', fontWeight: '600' }}>Facturado</th>
                    <th style={{ padding: '12px 20px', fontWeight: '600' }}>Cobrado Real</th>
                    <th style={{ padding: '12px 20px', fontWeight: '600' }}>Pendiente</th>
                    <th style={{ padding: '12px 20px', fontWeight: '600' }}>Efectivo Esperado</th>
                    <th style={{ padding: '12px 20px', fontWeight: '600' }}>Efectivo Físico</th>
                    <th style={{ padding: '12px 20px', fontWeight: '600' }}>Diferencia</th>
                    <th style={{ padding: '12px 20px', fontWeight: '600' }}>Nº Facturas</th>
                  </tr>
                </thead>
                <tbody>
                  {cashCloses.sort((a,b) => new Date(b.date) - new Date(a.date)).map(close => {
                    const diff = Number(close.differenceUSD || 0);
                    const diffColor = diff < 0 ? '#ef4444' : diff > 0 ? '#10b981' : '#64748b';
                    
                    return (
                      <tr key={close.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 20px', fontWeight: '600', color: '#0f172a' }}>
                          {new Date(close.date).toLocaleDateString('es-VE')}
                        </td>
                        <td style={{ padding: '12px 20px', color: '#64748b' }}>{formatUSD(close.totalVentas)}</td>
                        <td style={{ padding: '12px 20px', fontWeight: '700', color: '#10b981' }}>{formatUSD(close.totalCobrado)}</td>
                        <td style={{ padding: '12px 20px', color: '#f59e0b' }}>{formatUSD(close.totalPendiente)}</td>
                        <td style={{ padding: '12px 20px', color: '#64748b' }}>{formatUSD(close.expectedCashUSD)}</td>
                        <td style={{ padding: '12px 20px', fontWeight: '600', color: '#0f172a' }}>{formatUSD(close.countedCashUSD)}</td>
                        <td style={{ padding: '12px 20px', fontWeight: '700', color: diffColor }}>
                          {diff > 0 ? '+' : ''}{formatUSD(diff)}
                        </td>
                        <td style={{ padding: '12px 20px', color: '#64748b' }}>{close.invoicesCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
