import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Banknote, 
  TrendingUp, 
  AlertTriangle, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  CreditCard,
  Trash2
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import FilterBar from '../components/FilterBar';
import InvoicePreview from '../components/InvoicePreview';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const CHART_COLORS = ['#f59e0b', '#dc2626', '#10b981', '#3b82f6', '#8b5cf6', '#f97316'];

export default function Dashboard() {
  const { invoices = [], clients = [], products = [], payments = [], voidInvoice, addPayment, clearAllSalesData, exchangeRate = 36.5 } = useData() || {};
  
  const [activeTab, setActiveTab] = useState('Facturas');
  const [filters, setFilters] = useState({
    desde: '',
    hasta: '',
    cliente: '',
    productoId: '',
    estado: 'Todas',
    tipoCliente: 'Todos'
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [expandedClient, setExpandedClient] = useState(null);
  
  const [voidingInvoice, setVoidingInvoice] = useState(null);
  const [voidReason, setVoidReason] = useState('');

  const [payingInvoice, setPayingInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethodAb, setPaymentMethodAb] = useState('efectivo_usd');

  // Helper to get client object/name
  const getClientInfo = (invoice) => {
    if (!invoice) return { name: 'Cliente Genérico', cedula: 'V-00000000', type: 'normal' };
    const found = (clients || []).find(c => c.id === invoice.clientId);
    return {
      name: invoice.clientName || (found ? found.name : 'Cliente Genérico'),
      cedula: found ? found.cedula : (invoice.clientCedula || 'V-00000000'),
      type: invoice.clientType || (found ? found.type : 'normal')
    };
  };

  const handleVoidConfirm = () => {
    if (!voidReason.trim()) {
      alert('Debes ingresar un motivo de anulación');
      return;
    }
    voidInvoice(voidingInvoice.id, voidReason);
    setVoidingInvoice(null);
    setVoidReason('');
  };

  const handlePaymentConfirm = (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Ingrese un monto válido');
      return;
    }

    const isBs = paymentMethodAb === 'pago_movil' || paymentMethodAb === 'efectivo_bs';
    const amountUSD = isBs ? amt / exchangeRate : amt;

    addPayment({
      invoiceId: payingInvoice.id,
      clientId: payingInvoice.clientId,
      amount: Number(amountUSD.toFixed(2)),
      currency: isBs ? 'BS' : 'USD',
      method: paymentMethodAb
    });
    setPayingInvoice(null);
    setPaymentAmount('');
    setPaymentMethodAb('efectivo_usd');
  };

  const handleClearRecords = () => {
    if (window.confirm('¿Deseas vaciar todos los registros del dashboard (facturas, pagos, cierres de caja y órdenes de prueba)? Esta acción dejará los reportes en $0.00.')) {
      if (clearAllSalesData) clearAllSalesData();
      alert('Registros eliminados con éxito. El dashboard ha quedado en $0.00.');
    }
  };

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    let result = invoices || [];
    
    if (filters.desde) {
      const from = new Date(filters.desde);
      from.setHours(0, 0, 0, 0);
      result = result.filter(i => new Date(i.date) >= from);
    }
    
    if (filters.hasta) {
      const to = new Date(filters.hasta);
      to.setHours(23, 59, 59, 999);
      result = result.filter(i => new Date(i.date) <= to);
    }

    if (filters.cliente && filters.cliente.trim()) {
      const q = filters.cliente.trim().toLowerCase();
      result = result.filter(i => {
        const info = getClientInfo(i);
        return (
          (i.invoiceNumber && i.invoiceNumber.toLowerCase().includes(q)) ||
          info.name.toLowerCase().includes(q) ||
          info.cedula.toLowerCase().includes(q)
        );
      });
    }

    if (filters.productoId) {
      result = result.filter(i => 
        (i.items || []).some(item => item.productId === filters.productoId)
      );
    }

    if (filters.estado && filters.estado !== 'Todas') {
      const target = filters.estado.toLowerCase();
      result = result.filter(i => {
        const s = (i.status || '').toLowerCase();
        if (target === 'pagada') return s === 'pagada' || s === 'paid';
        if (target === 'pendiente') return s === 'pendiente' || s === 'pending';
        if (target === 'parcial') return s === 'parcial' || s === 'partial';
        if (target === 'anulada') return s === 'anulada' || s === 'voided';
        return s === target;
      });
    }

    if (filters.tipoCliente && filters.tipoCliente !== 'Todos') {
      const targetType = filters.tipoCliente.toLowerCase();
      result = result.filter(i => {
        const info = getClientInfo(i);
        return info.type.toLowerCase() === targetType;
      });
    }

    return [...result].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [invoices, clients, filters]);

  // Calculate high-level stats
  const stats = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => {
      const totalUSD = Number(inv.totalUSD) || 0;
      const totalBs = Number(inv.totalBs) || 0;
      const stat = (inv.status || '').toLowerCase();

      if (stat === 'voided' || stat === 'anulada') {
        // Just count the invoice, do not add to financial totals
        acc.totalFacturas += 1;
        return acc;
      }

      acc.totalVendidoUSD += totalUSD;
      acc.totalVendidoBs += totalBs;
      acc.totalFacturas += 1;

      if (stat === 'pagada' || stat === 'paid') {
        acc.totalCobrado += totalUSD;
      } else if (stat === 'parcial' || stat === 'partial') {
        const paid = Number(inv.paidAmountUSD) || 0;
        acc.totalCobrado += paid;
        acc.totalPendiente += (totalUSD - paid);
      } else if (stat === 'pendiente' || stat === 'pending') {
        acc.totalPendiente += totalUSD;
      }

      return acc;
    }, {
      totalVendidoUSD: 0,
      totalVendidoBs: 0,
      totalCobrado: 0,
      totalPendiente: 0,
      totalFacturas: 0
    });
  }, [filteredInvoices]);

  const formatUSD = (val) => `$${(Number(val) || 0).toFixed(2)}`;
  const formatBs = (val) => `Bs. ${(Number(val) || 0).toFixed(2)}`;

  // Tab 2: Client accounts
  const clientStats = useMemo(() => {
    const map = {};
    filteredInvoices.forEach(inv => {
      const cId = inv.clientId || 'generic';
      const info = getClientInfo(inv);
      if (!map[cId]) {
        map[cId] = {
          id: cId,
          name: info.name,
          cedula: info.cedula,
          type: info.type,
          totalBought: 0,
          totalPaid: 0,
          debt: 0,
          lastPurchase: inv.date,
          invoices: []
        };
      }
      const c = map[cId];
      const totalUSD = Number(inv.totalUSD) || 0;
      const stat = (inv.status || '').toLowerCase();

      c.totalBought += totalUSD;
      if (stat === 'pagada' || stat === 'paid') {
        c.totalPaid += totalUSD;
      } else if (stat === 'parcial' || stat === 'partial') {
        const paid = Number(inv.paidAmountUSD) || 0;
        c.totalPaid += paid;
        c.debt += (totalUSD - paid);
      } else {
        c.debt += totalUSD;
      }

      c.invoices.push(inv);
      if (new Date(inv.date || 0) > new Date(c.lastPurchase || 0)) {
        c.lastPurchase = inv.date;
      }
    });

    return Object.values(map).sort((a, b) => b.debt - a.debt || b.totalBought - a.totalBought);
  }, [filteredInvoices, clients]);

  // Chart 1: Sales by day
  const salesByDay = useMemo(() => {
    const days = {};
    filteredInvoices.forEach(inv => {
      const d = inv.date ? new Date(inv.date).toLocaleDateString('es-VE', { month: 'short', day: 'numeric' }) : 'Hoy';
      days[d] = (days[d] || 0) + (Number(inv.totalUSD) || 0);
    });
    return Object.keys(days).map(date => ({ date, total: Number(days[date].toFixed(2)) })).slice(-15);
  }, [filteredInvoices]);

  // Chart 2: Sales by payment method
  const salesByMethod = useMemo(() => {
    const methods = {};
    const labelMap = {
      'efectivo_usd': 'Efectivo $',
      'efectivo_bs': 'Efectivo Bs',
      'pago_movil': 'Pago Móvil',
      'zelle': 'Zelle'
    };
    filteredInvoices.forEach(inv => {
      const raw = inv.paymentMethod || 'efectivo_usd';
      const label = labelMap[raw] || raw;
      methods[label] = (methods[label] || 0) + (Number(inv.totalUSD) || 0);
    });
    return Object.keys(methods).map(name => ({ name, value: Number(methods[name].toFixed(2)) }));
  }, [filteredInvoices]);

  // Chart 3: Top 5 products sold
  const topProducts = useMemo(() => {
    const prods = {};
    filteredInvoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        const name = item.productName || item.name || 'Producto';
        prods[name] = (prods[name] || 0) + (Number(item.quantity) || 1);
      });
    });
    return Object.keys(prods)
      .map(name => ({ name, cantidad: prods[name] }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [filteredInvoices]);

  const toggleClientRow = (id) => {
    setExpandedClient(expandedClient === id ? null : id);
  };

  // Payment badge helper
  const renderPaymentBadge = (m) => {
    const map = {
      'pago_movil': { label: 'Pago Móvil', bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' },
      'efectivo_usd': { label: 'Efectivo $', bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399' },
      'efectivo_bs': { label: 'Efectivo Bs', bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' },
      'zelle': { label: 'Zelle', bg: 'rgba(167, 139, 250, 0.15)', color: '#c084fc' }
    };
    const item = map[m] || { label: m || 'Efectivo $', bg: 'rgba(255,255,255,0.08)', color: '#cbd5e1' };
    return (
      <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', background: item.bg, color: item.color }}>
        {item.label}
      </span>
    );
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', background: '#f4f5f7', minHeight: '100%', color: '#111827' }}>
      
      {/* Top Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#111827', fontSize: '1.6rem', fontWeight: '700', letterSpacing: '-0.5px' }}>
            Dashboard Administrativo
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.88rem' }}>
            Resumen de ventas, cuentas por cobrar y reportes en tiempo real
          </p>
        </div>
        <button
          onClick={handleClearRecords}
          title="Vaciar facturas, pagos y órdenes de prueba para comenzar en limpio"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '0.84rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Trash2 size={16} />
          <span>Vaciar Registros</span>
        </button>
      </div>
      
      {/* Apple Minimal KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Card 1: Facturado $ */}
        <div style={{ background: '#ffffff', border: '1px solid #eaedf2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: '500' }}>Total Facturado ($)</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign color="#b45309" size={18} />
            </div>
          </div>
          <div style={{ color: '#111827', fontSize: '1.65rem', fontWeight: '700', letterSpacing: '-0.5px' }}>
            {formatUSD(stats.totalVendidoUSD)}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>
            {stats.totalFacturas} facturas emitidas
          </div>
        </div>
        
        {/* Card 2: Facturado Bs */}
        <div style={{ background: '#ffffff', border: '1px solid #eaedf2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: '500' }}>Total en Bolívares</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Banknote color="#b45309" size={18} />
            </div>
          </div>
          <div style={{ color: '#111827', fontSize: '1.45rem', fontWeight: '700', letterSpacing: '-0.5px' }}>
            {formatBs(stats.totalVendidoBs)}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>
            Calculado a la tasa de cada día
          </div>
        </div>

        {/* Card 3: Cobrado */}
        <div style={{ background: '#ffffff', border: '1px solid #eaedf2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: '500' }}>Dinero Cobrado</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(52, 211, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp color="#34d399" size={18} />
            </div>
          </div>
          <div style={{ color: '#34d399', fontSize: '1.65rem', fontWeight: '700', letterSpacing: '-0.5px' }}>
            {formatUSD(stats.totalCobrado)}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>
            Ingresos reales en caja/cuentas
          </div>
        </div>

        {/* Card 4: Deuda pendiente */}
        <div style={{ 
          background: stats.totalPendiente > 0 ? '#fffafa' : '#ffffff',
          border: stats.totalPendiente > 0 ? '1.5px solid #fecaca' : '1px solid #eaedf2',
          borderRadius: '14px', 
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: '500' }}>Cuentas por Cobrar</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: stats.totalPendiente > 0 ? 'rgba(248, 113, 113, 0.12)' : 'rgba(255, 255, 255, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle color={stats.totalPendiente > 0 ? "#f87171" : "#94a3b8"} size={18} />
            </div>
          </div>
          <div style={{ color: stats.totalPendiente > 0 ? '#f87171' : '#f8fafc', fontSize: '1.65rem', fontWeight: '700', letterSpacing: '-0.5px' }}>
            {formatUSD(stats.totalPendiente)}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>
            Pendientes de clientes congelador
          </div>
        </div>

      </div>

      {/* Clean Filter Section */}
      <FilterBar onFilterChange={setFilters} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.03)', padding: '4px', borderRadius: '10px', width: 'fit-content', marginBottom: '20px' }}>
        {[
          { key: 'Facturas', label: `Facturas (${filteredInvoices.length})` },
          { key: 'Por Cliente', label: `Cuentas por Cliente (${clientStats.length})` },
          { key: 'Gráficos', label: 'Gráficos' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: activeTab === tab.key ? '#1e222e' : 'transparent',
              color: activeTab === tab.key ? '#f8fafc' : '#94a3b8',
              border: activeTab === tab.key ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent',
              padding: '8px 16px',
              borderRadius: '7px',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? '600' : '400',
              fontSize: '0.85rem',
              transition: 'all 0.15s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Invoices Table */}
      {activeTab === 'Facturas' && (
        <div style={{ background: '#ffffff', border: '1px solid #eaedf2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '14px', overflow: 'hidden' }}>
          {filteredInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#64748b', fontSize: '0.9rem' }}>
              No se encontraron facturas con los filtros seleccionados.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#111827', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #eaedf2', color: '#6b7280', textAlign: 'left' }}>
                  <th style={{ padding: '14px 16px', fontWeight: '500' }}>Nº Factura</th>
                  <th style={{ padding: '14px 16px', fontWeight: '500' }}>Fecha</th>
                  <th style={{ padding: '14px 16px', fontWeight: '500' }}>Cliente</th>
                  <th style={{ padding: '14px 16px', fontWeight: '500' }}>Tipo</th>
                  <th style={{ padding: '14px 16px', fontWeight: '500' }}>Productos</th>
                  <th style={{ padding: '14px 16px', fontWeight: '500' }}>Total ($)</th>
                  <th style={{ padding: '14px 16px', fontWeight: '500' }}>Total (Bs)</th>
                  <th style={{ padding: '14px 16px', fontWeight: '500' }}>Método</th>
                  <th style={{ padding: '14px 16px', fontWeight: '500' }}>Estado</th>
                  <th style={{ padding: '14px 16px', fontWeight: '500', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => {
                  const client = getClientInfo(inv);
                  const stat = (inv.status || '').toLowerCase();
                  const isPaid = stat === 'paid' || stat === 'pagada';
                  const isPending = stat === 'pending' || stat === 'pendiente';

                  const isVoided = stat === 'voided' || stat === 'anulada';

                  return (
                    <tr 
                      key={inv.id || inv.invoiceNumber}
                      style={{ 
                        borderBottom: '1px solid #f3f4f6', 
                        transition: 'background 0.15s',
                        background: isVoided ? '#fef2f2' : 'transparent',
                        opacity: isVoided ? 0.75 : 1
                      }}
                      onMouseOver={e => e.currentTarget.style.background = isVoided ? '#fee2e2' : '#f9fafb'}
                      onMouseOut={e => e.currentTarget.style.background = isVoided ? '#fef2f2' : 'transparent'}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: '600', color: isVoided ? '#ef4444' : '#38bdf8', textDecoration: isVoided ? 'line-through' : 'none' }}>{inv.invoiceNumber}</td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                        {inv.date ? new Date(inv.date).toLocaleDateString('es-VE') : 'Hoy'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '500' }}>{client.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{client.cedula}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ 
                          fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', fontWeight: '600',
                          background: client.type === 'congelador' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(56, 189, 248, 0.1)',
                          color: client.type === 'congelador' ? '#c084fc' : '#38bdf8'
                        }}>
                          {client.type === 'congelador' ? 'Congelador' : 'Normal'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', maxWidth: '220px', color: '#cbd5e1' }}>
                        {(inv.items || []).slice(0, 2).map(i => `${i.quantity}x ${i.productName || i.name}`).join(', ')}
                        {(inv.items || []).length > 2 ? '...' : ''}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: '#111827', textDecoration: isVoided ? 'line-through' : 'none' }}>{formatUSD(inv.totalUSD)}</td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8', textDecoration: isVoided ? 'line-through' : 'none' }}>{formatBs(inv.totalBs)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        {renderPaymentBadge(inv.paymentMethod)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ 
                          padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600',
                          background: isVoided ? 'rgba(239, 68, 68, 0.15)' : isPaid ? 'rgba(52, 211, 153, 0.15)' : isPending ? 'rgba(248, 113, 113, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                          color: isVoided ? '#ef4444' : isPaid ? '#34d399' : isPending ? '#f87171' : '#fbbf24'
                        }}>
                          {isVoided ? 'Anulada' : isPaid ? 'Pagada' : isPending ? 'Pendiente' : 'Parcial'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(inv)}
                            style={{
                              background: '#f3f4f6', color: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)',
                              padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500'
                            }}
                          >
                            Ver
                          </button>
                          {!isVoided && !isPaid && (
                            <button
                              type="button"
                              onClick={() => setPayingInvoice(inv)}
                              style={{
                                background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0',
                                padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500'
                              }}
                            >
                              Abonar
                            </button>
                          )}
                          {!isVoided && (
                            <button
                              type="button"
                              onClick={() => setVoidingInvoice(inv)}
                              style={{
                                background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
                                padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500'
                              }}
                            >
                              Anular
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: Accounts per Client */}
      {activeTab === 'Por Cliente' && (
        <div style={{ background: '#ffffff', border: '1px solid #eaedf2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '14px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#111827', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #eaedf2', color: '#6b7280', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px', fontWeight: '500' }}>Cliente</th>
                <th style={{ padding: '14px 16px', fontWeight: '500' }}>Tipo</th>
                <th style={{ padding: '14px 16px', fontWeight: '500' }}>Total Comprado ($)</th>
                <th style={{ padding: '14px 16px', fontWeight: '500' }}>Total Pagado ($)</th>
                <th style={{ padding: '14px 16px', fontWeight: '500' }}>Deuda Pendiente ($)</th>
                <th style={{ padding: '14px 16px', fontWeight: '500' }}>Última Compra</th>
                <th style={{ padding: '14px 16px', fontWeight: '500', textAlign: 'center' }}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {clientStats.map(client => (
                <React.Fragment key={client.id}>
                  <tr 
                    onClick={() => toggleClientRow(client.id)}
                    style={{ 
                      borderBottom: '1px solid #f3f4f6', 
                      cursor: 'pointer',
                      background: client.debt > 0 ? 'rgba(248, 113, 113, 0.04)' : 'transparent'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = client.debt > 0 ? 'rgba(248, 113, 113, 0.08)' : 'rgba(255,255,255,0.02)'}
                    onMouseOut={e => e.currentTarget.style.background = client.debt > 0 ? 'rgba(248, 113, 113, 0.04)' : 'transparent'}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '600' }}>{client.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{client.cedula}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ 
                        fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', fontWeight: '600',
                        background: client.type === 'congelador' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(56, 189, 248, 0.1)',
                        color: client.type === 'congelador' ? '#c084fc' : '#38bdf8'
                      }}>
                        {client.type === 'congelador' ? 'Congelador' : 'Normal'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '700' }}>{formatUSD(client.totalBought)}</td>
                    <td style={{ padding: '14px 16px', color: '#34d399' }}>{formatUSD(client.totalPaid)}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: client.debt > 0 ? '#f87171' : '#94a3b8' }}>
                      {formatUSD(client.debt)}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                      {client.lastPurchase ? new Date(client.lastPurchase).toLocaleDateString('es-VE') : '-'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {expandedClient === client.id ? <ChevronUp size={18} color="#38bdf8"/> : <ChevronDown size={18} color="#64748b"/>}
                    </td>
                  </tr>
                  
                  {expandedClient === client.id && (
                    <tr style={{ background: '#12141c' }}>
                      <td colSpan="7" style={{ padding: '16px 20px' }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '10px', fontWeight: '500' }}>
                          Facturas de {client.name}:
                        </div>
                        <table style={{ width: '100%', fontSize: '0.825rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left' }}>
                              <th style={{ padding: '6px 8px' }}>Factura Nº</th>
                              <th style={{ padding: '6px 8px' }}>Fecha</th>
                              <th style={{ padding: '6px 8px' }}>Total ($)</th>
                              <th style={{ padding: '6px 8px' }}>Total (Bs)</th>
                              <th style={{ padding: '6px 8px' }}>Estado</th>
                              <th style={{ padding: '6px 8px', textAlign: 'center' }}>Ver</th>
                            </tr>
                          </thead>
                          <tbody>
                            {client.invoices.map(inv => (
                              <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '8px', color: '#38bdf8' }}>{inv.invoiceNumber}</td>
                                <td style={{ padding: '8px', color: '#94a3b8' }}>
                                  {inv.date ? new Date(inv.date).toLocaleDateString('es-VE') : '-'}
                                </td>
                                <td style={{ padding: '8px', fontWeight: '600' }}>{formatUSD(inv.totalUSD)}</td>
                                <td style={{ padding: '8px', color: '#94a3b8' }}>{formatBs(inv.totalBs)}</td>
                                <td style={{ padding: '8px' }}>
                                  <span style={{ 
                                    padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem',
                                    background: (inv.status === 'paid' || inv.status === 'Pagada') ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                                    color: (inv.status === 'paid' || inv.status === 'Pagada') ? '#34d399' : '#f87171'
                                  }}>
                                    {(inv.status === 'paid' || inv.status === 'Pagada') ? 'Pagada' : 'Pendiente'}
                                  </span>
                                </td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); }}
                                    style={{
                                      background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.1)',
                                      color: '#94a3b8', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem'
                                    }}
                                  >
                                    Ver
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: Clean Charts */}
      {activeTab === 'Gráficos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          
          <div style={{ background: '#ffffff', border: '1px solid #eaedf2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ color: '#111827', margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: '600' }}>Ventas por Día ($ USD)</h3>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByDay.length > 0 ? salesByDay : [{ date: 'Hoy', total: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#1e222e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="total" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Venta ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #eaedf2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ color: '#111827', margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: '600' }}>Ventas por Método de Pago</h3>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByMethod.length > 0 ? salesByMethod : [{ name: 'Sin datos', value: 1 }]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    fontSize={11}
                  >
                    {salesByMethod.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e222e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #eaedf2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '14px', padding: '20px', gridColumn: '1 / -1' }}>
            <h3 style={{ color: '#111827', margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: '600' }}>Top 5 Productos Más Vendidos</h3>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts.length > 0 ? topProducts : [{ name: 'Sin productos', cantidad: 0 }]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" width={140} fontSize={11} />
                  <Tooltip contentStyle={{ background: '#1e222e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="cantidad" fill="#818cf8" radius={[0, 4, 4, 0]} name="Cantidad" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* Void Invoice Modal */}
      {voidingInvoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '400px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#111827', fontSize: '1.1rem' }}>Anular Factura {voidingInvoice.invoiceNumber}</h3>
            <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '0.85rem' }}>Esta factura no sumará a los cierres de caja ni a las estadísticas. ¿Cuál es el motivo de la anulación?</p>
            <textarea
              autoFocus
              placeholder="Ej: Monto incorrecto, cliente canceló la compra..."
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', minHeight: '80px', marginBottom: '16px', fontSize: '0.85rem' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => { setVoidingInvoice(null); setVoidReason(''); }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#f3f4f6', color: '#4b5563', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleVoidConfirm}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Invoice Modal */}
      {payingInvoice && (() => {
        const initialPaid = payingInvoice.status === 'pending' ? 0 : (payingInvoice.receivedAmount || 0);
        const subsequentPayments = payments
          .filter(p => p.invoiceId === payingInvoice.id)
          .reduce((sum, p) => sum + p.amount, 0);
        const totalAlreadyPaid = initialPaid + subsequentPayments;
        const remaining = Math.max(0, payingInvoice.totalUSD - totalAlreadyPaid);
        
        const isBs = paymentMethodAb === 'pago_movil' || paymentMethodAb === 'efectivo_bs';
        const currentAmount = parseFloat(paymentAmount) || 0;
        const currentAmountUSD = isBs ? currentAmount / exchangeRate : currentAmount;
        const vueltoUSD = currentAmountUSD - remaining;

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '400px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#111827', fontSize: '1.1rem' }}>Abonar a Factura {payingInvoice.invoiceNumber}</h3>
              <div style={{ marginBottom: '16px', fontSize: '0.9rem', color: '#4b5563', background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Total Factura:</span>
                  <strong>{formatUSD(payingInvoice.totalUSD)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#059669' }}>
                  <span>Abonado hasta ahora:</span>
                  <strong>{formatUSD(totalAlreadyPaid)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #d1d5db', fontWeight: '800', color: '#dc2626' }}>
                  <span>Deuda Actual:</span>
                  <span>{formatUSD(remaining)} <span style={{fontSize: '0.75rem', fontWeight: 'normal'}}>(Bs {(remaining * exchangeRate).toFixed(2)})</span></span>
                </div>
              </div>
              <form onSubmit={handlePaymentConfirm}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>Método de Pago</label>
                <select 
                  value={paymentMethodAb}
                  onChange={e => setPaymentMethodAb(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '12px', fontSize: '0.9rem', background: '#fff', color: '#111827' }}
                >
                  <option value="efectivo_usd">Efectivo ($ USD)</option>
                  <option value="zelle">Zelle ($ USD)</option>
                  <option value="pago_movil">Pago Móvil (Bs)</option>
                  <option value="efectivo_bs">Efectivo (Bs)</option>
                </select>

                <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>Monto a abonar ({isBs ? 'Bs' : '$ USD'}) *</label>
                <input
                  autoFocus
                  required
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '12px', fontSize: '1rem' }}
                />
                
                {vueltoUSD > 0.001 ? (
                  <div style={{ padding: '10px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.85rem', fontWeight: '800', marginBottom: '16px', textAlign: 'center' }}>
                    ¡Monto excede la deuda!<br/>
                    Dar vuelto: {isBs ? `Bs ${(vueltoUSD * exchangeRate).toFixed(2)}` : formatUSD(vueltoUSD)}
                  </div>
                ) : (
                  <div style={{ height: '16px', marginBottom: '16px' }}></div>
                )}

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button 
                    type="button"
                    onClick={() => { setPayingInvoice(null); setPaymentAmount(''); }}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#f3f4f6', color: '#4b5563', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Confirmar Abono
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Invoice Preview Modal */}
      {selectedInvoice && (
        <InvoicePreview 
          invoice={selectedInvoice} 
          onClose={() => setSelectedInvoice(null)} 
        />
      )}
    </div>
  );
}
