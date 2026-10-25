import React, { useState, useMemo, useEffect } from 'react';
import { DollarSign, Banknote, TrendingUp, AlertTriangle, FileText, ChevronDown, ChevronUp, CreditCard, Trash2, QrCode, Smartphone, ExternalLink, Copy, Check } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import FilterBar, { getLocalDateStr } from '../components/FilterBar';
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
  const {
    invoices = [],
    clients = [],
    products = [],
    payments = [],
    voidInvoice,
    deleteInvoice,
    addPayment,
    clearAllSalesData,
    refreshData,
    exchangeRate = 876.80,
    currentLocalDate
  } = useData() || {};
  
  const todayStr = currentLocalDate || getLocalDateStr(new Date());
  const [activeTab, setActiveTab] = useState('Facturas');
  const [currencyView, setCurrencyView] = useState(() => {
    return localStorage.getItem('pos_dashboard_currency') || 'BS';
  });

  const handleCurrencyChange = (newCurr) => {
    setCurrencyView(newCurr);
    localStorage.setItem('pos_dashboard_currency', newCurr);
  };

  const [filters, setFilters] = useState({
    desde: todayStr,
    hasta: todayStr,
    cliente: '',
    productoId: '',
    estado: 'Todas',
    tipoCliente: 'Todos',
    preset: 'hoy'
  });

  // Rollover a las 12:00 AM medianoche para reiniciar automáticamente el Dashboard a 0
  useEffect(() => {
    if (currentLocalDate && filters.preset === 'hoy') {
      setFilters(prev => {
        if (prev.desde !== currentLocalDate || prev.hasta !== currentLocalDate) {
          return { ...prev, desde: currentLocalDate, hasta: currentLocalDate };
        }
        return prev;
      });
    }
  }, [currentLocalDate, filters.preset]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [expandedClient, setExpandedClient] = useState(null);
  
  const [voidingInvoice, setVoidingInvoice] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [invoiceToDeleteDash, setInvoiceToDeleteDash] = useState(null);

  const [payingInvoice, setPayingInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethodAb, setPaymentMethodAb] = useState('efectivo_usd');

  // Monitor móvil del dueño (QR y enlace)
  const [monitorInfo, setMonitorInfo] = useState({
    publicUrl: '',
    publicQr: '',
    localUrl: '',
    localQr: '',
    tunnelStatus: 'idle'
  });
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchMonitor = () => {
      fetch('http://localhost:3001/api/monitor/info')
        .then(r => r.json())
        .then(data => {
          if (isMounted && data) {
            setMonitorInfo(prev => ({ ...prev, ...data }));
          }
        })
        .catch(() => {});
    };

    fetchMonitor();
    const timer = setInterval(fetchMonitor, 6000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const handleCopyLink = () => {
    const url = monitorInfo.publicUrl || monitorInfo.localUrl;
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

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
    const finalReason = voidReason.trim() || 'Anulada en Dashboard / Sistema';
    voidInvoice(voidingInvoice.id, finalReason);
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

    const isBs = paymentMethodAb === 'pago_movil' || paymentMethodAb === 'efectivo_bs' || paymentMethodAb === 'punto';
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

  // Filter invoices (using local time so UTC-4 never shifts dates to yesterday)
  const filteredInvoices = useMemo(() => {
    let result = invoices || [];
    
    if (filters.desde) {
      const from = new Date(`${filters.desde}T00:00:00`);
      result = result.filter(i => new Date(i.date) >= from);
    }
    
    if (filters.hasta) {
      const to = new Date(`${filters.hasta}T23:59:59.999`);
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
    const base = filteredInvoices.reduce((acc, inv) => {
      const totalUSD = Number(inv.totalUSD) || 0;
      const totalBs = Number(inv.totalBs) || 0;
      const stat = (inv.status || '').toLowerCase();

      if (stat === 'voided' || stat === 'anulada') {
        acc.totalAnuladas += 1;
        return acc;
      }

      acc.totalVendidoUSD += totalUSD;
      acc.totalVendidoBs += totalBs;
      acc.totalFacturas += 1;

      if (stat === 'pagada' || stat === 'paid') {
        acc.totalCobrado += totalUSD;
        if (inv.paymentMethod === 'mixto' && inv.mixedPayments) {
          acc.byMethod.efectivo_usd += Number(inv.mixedPayments.efectivo_usd) || 0;
          acc.byMethod.zelle += Number(inv.mixedPayments.zelle) || 0;
          acc.byMethod.pago_movil += Number(inv.mixedPayments.pago_movil_usd) || 0;
          acc.byMethod.efectivo_bs += Number(inv.mixedPayments.efectivo_bs_usd) || 0;
          acc.byMethod.punto += Number(inv.mixedPayments.punto_usd) || 0;
        } else {
          const m = inv.paymentMethod || 'efectivo_usd';
          acc.byMethod[m] = (acc.byMethod[m] || 0) + totalUSD;
        }
      } else if (stat === 'parcial' || stat === 'partial') {
        const paid = Number(inv.paidAmountUSD || inv.receivedAmount) || 0;
        acc.totalCobrado += paid;
        acc.totalPendiente += Math.max(0, totalUSD - paid);
        const m = inv.paymentMethod || 'efectivo_usd';
        acc.byMethod[m] = (acc.byMethod[m] || 0) + paid;
      } else if (stat === 'pendiente' || stat === 'pending') {
        acc.totalPendiente += totalUSD;
      }

      return acc;
    }, {
      totalVendidoUSD: 0,
      totalVendidoBs: 0,
      totalCobrado: 0,
      totalPendiente: 0,
      totalFacturas: 0,
      totalAnuladas: 0,
      byMethod: { efectivo_usd: 0, pago_movil: 0, efectivo_bs: 0, zelle: 0, punto: 0 }
    });

    return base;
  }, [filteredInvoices]);

  const formatUSD = (val) => {
    const num = Number(val) || 0;
    return `${num < 0 ? '-$' : '$'}${Math.abs(num).toFixed(2)}`;
  };
  const formatBs = (val) => {
    const num = Number(val) || 0;
    return `Bs. ${num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

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

  // Chart 1: Sales by day (dynamically in Bs or USD)
  const salesByDay = useMemo(() => {
    const days = {};
    filteredInvoices.forEach(inv => {
      const d = inv.date ? new Date(inv.date).toLocaleDateString('es-VE', { month: 'short', day: 'numeric' }) : 'Hoy';
      const usd = Number(inv.totalUSD) || 0;
      const val = currencyView === 'BS' ? (Number(inv.totalBs) || (usd * exchangeRate)) : usd;
      days[d] = (days[d] || 0) + val;
    });
    return Object.keys(days).map(date => ({ date, total: Number(days[date].toFixed(2)) })).slice(-15);
  }, [filteredInvoices, currencyView, exchangeRate]);

  // Chart 2: Sales by payment method (dynamically in Bs or USD)
  const salesByMethod = useMemo(() => {
    const methods = {};
    const labelMap = {
      'efectivo_usd': 'Efectivo $',
      'efectivo_bs': 'Efectivo Bs',
      'pago_movil': 'Pago Móvil',
      'punto': 'Punto Venta (Bs)',
      'tarjeta': 'Punto Venta (Bs)',
      'debito': 'Punto Venta (Bs)',
      'zelle': 'Zelle',
      'mixto': 'Pago Mixto'
    };
    filteredInvoices.forEach(inv => {
      const raw = inv.paymentMethod || 'efectivo_usd';
      const label = labelMap[raw] || raw;
      const usd = Number(inv.totalUSD) || 0;
      const val = currencyView === 'BS' ? (Number(inv.totalBs) || (usd * exchangeRate)) : usd;
      methods[label] = (methods[label] || 0) + val;
    });
    return Object.keys(methods).map(name => ({ name, value: Number(methods[name].toFixed(2)) }));
  }, [filteredInvoices, currencyView, exchangeRate]);

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
      'punto': { label: 'Punto de Venta', bg: 'rgba(2, 132, 199, 0.15)', color: '#0284c7' },
      'tarjeta': { label: 'Punto de Venta', bg: 'rgba(2, 132, 199, 0.15)', color: '#0284c7' },
      'debito': { label: 'Punto de Venta', bg: 'rgba(2, 132, 199, 0.15)', color: '#0284c7' },
      'zelle': { label: 'Zelle', bg: 'rgba(167, 139, 250, 0.15)', color: '#c084fc' },
      'mixto': { label: 'Pago Mixto', bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }
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
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, color: '#111827', fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
              Dashboard Administrativo
            </h1>

            {/* Selector de Moneda: Bolívares / Dólares */}
            <div style={{
              display: 'inline-flex',
              background: '#e2e8f0',
              padding: '3px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1'
            }}>
              <button
                type="button"
                onClick={() => handleCurrencyChange('BS')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '9px',
                  border: 'none',
                  background: currencyView === 'BS' ? '#0f172a' : 'transparent',
                  color: currencyView === 'BS' ? '#ffffff' : '#475569',
                  fontWeight: currencyView === 'BS' ? '800' : '600',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: currencyView === 'BS' ? '0 2px 5px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>🇻🇪</span>
                <span>Ver en Bolívares (Bs)</span>
              </button>

              <button
                type="button"
                onClick={() => handleCurrencyChange('USD')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '9px',
                  border: 'none',
                  background: currencyView === 'USD' ? '#0f172a' : 'transparent',
                  color: currencyView === 'USD' ? '#ffffff' : '#475569',
                  fontWeight: currencyView === 'USD' ? '800' : '600',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: currencyView === 'USD' ? '0 2px 5px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>💵</span>
                <span>Ver en Dólares ($)</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.88rem' }}>
              Resumen de ventas, cuentas por cobrar y reportes en tiempo real
            </p>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: '700',
              color: '#065f46'
            }}>
              <span>Tasa Oficial BCV:</span>
              <strong style={{ color: '#047857' }}>Bs. {Number(exchangeRate).toFixed(2)} / $</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            title="Ver código QR para conectar el teléfono del dueño"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              padding: '9px 14px',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <QrCode size={16} />
            <span>QR Teléfono Dueño</span>
          </button>

          <button
            type="button"
            onClick={handleClearRecords}
            title="Vaciar facturas, pagos y órdenes de prueba para comenzar en limpio"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#f8fafc',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '9px 14px',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={15} />
            <span>Vaciar</span>
          </button>
        </div>
      </div>

      {/* Tarjeta QR del Monitor Móvil del Dueño */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.12)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ flex: 1, minWidth: '260px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Smartphone size={20} color="#60a5fa" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#ffffff' }}>
              Monitor Móvil del Dueño
            </h3>
            <span style={{
              background: monitorInfo.publicUrl ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              color: monitorInfo.publicUrl ? '#34d399' : '#fbbf24',
              border: monitorInfo.publicUrl ? '1px solid #059669' : '1px solid #d97706',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: '800'
            }}>
              {monitorInfo.publicUrl ? '● EN LÍNEA (INTERNET)' : (monitorInfo.localUrl ? '● EN LÍNEA (WIFI LOCAL)' : 'Conectando túnel...')}
            </span>
          </div>

          <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.4' }}>
            Apunta la cámara de tu teléfono a este código QR para ver en vivo las ventas, ingresos, pedidos y dinero en caja desde cualquier lugar.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🔒 <strong>Acceso protegido:</strong> Requiere la contraseña privada del dueño
            </span>

            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}
            >
              {copiedLink ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
              <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar enlace'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#93c5fd',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '700',
                textDecoration: 'underline'
              }}
            >
              Ver QR grande
            </button>
          </div>
        </div>

        {/* Preview del Código QR */}
        <div 
          onClick={() => setShowQrModal(true)}
          title="Haz clic para agrandar el código QR"
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '4px',
            cursor: 'pointer'
          }}
        >
          <div style={{
            background: '#ffffff',
            padding: '6px',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '108px',
            minHeight: '108px'
          }}>
            {monitorInfo.publicQr || monitorInfo.localQr ? (
              <img
                src={monitorInfo.publicQr || monitorInfo.localQr}
                alt="QR Monitor Dueño"
                style={{ width: '96px', height: '96px', display: 'block' }}
              />
            ) : (
              <div style={{ color: '#64748b', fontSize: '0.7rem', textAlign: 'center', padding: '6px' }}>
                Generando QR...
              </div>
            )}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: '700' }}>
            Toca para agrandar 🔍
          </span>
        </div>
      </div>
      
      {/* KPI Cards: Cobrado, Facturado, Por Cobrar (Adaptables a Bolívares o Dólares) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        
        {/* Card 1: Dinero Cobrado (Ingresos Reales) */}
        <div style={{ background: '#ffffff', border: '1px solid #eaedf2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ color: '#6b7280', fontSize: '0.84rem', fontWeight: '600' }}>
              {currencyView === 'BS' ? 'Ingresos Cobrados (Bs)' : 'Ingresos Cobrados ($)'}
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp color="#10b981" size={18} />
            </div>
          </div>
          <div style={{ color: '#059669', fontSize: '1.65rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
            {currencyView === 'BS' ? formatBs(stats.totalCobrado * exchangeRate) : formatUSD(stats.totalCobrado)}
          </div>
          <div style={{ color: '#047857', fontSize: '0.9rem', fontWeight: '700', marginTop: '2px' }}>
            {currencyView === 'BS' ? `${formatUSD(stats.totalCobrado)} USD` : formatBs(stats.totalCobrado * exchangeRate)}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>
            Ingresos reales en caja / cuentas bancarias
          </div>
        </div>

        {/* Card 2: Facturado Bruto */}
        <div style={{ background: '#ffffff', border: '1px solid #eaedf2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ color: '#6b7280', fontSize: '0.84rem', fontWeight: '600' }}>
              {currencyView === 'BS' ? 'Total Facturado (Bs)' : 'Total Facturado ($)'}
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign color="#b45309" size={18} />
            </div>
          </div>
          <div style={{ color: '#111827', fontSize: '1.65rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
            {currencyView === 'BS' ? formatBs(stats.totalVendidoBs || (stats.totalVendidoUSD * exchangeRate)) : formatUSD(stats.totalVendidoUSD)}
          </div>
          <div style={{ color: '#b45309', fontSize: '0.9rem', fontWeight: '700', marginTop: '2px' }}>
            {currencyView === 'BS' ? `${formatUSD(stats.totalVendidoUSD)} USD` : formatBs(stats.totalVendidoBs || (stats.totalVendidoUSD * exchangeRate))}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>
            {stats.totalFacturas} ventas válidas registradas
          </div>
        </div>

        {/* Card 3: Cuentas por Cobrar */}
        <div style={{ 
          background: stats.totalPendiente > 0 ? '#fffafa' : '#ffffff',
          border: stats.totalPendiente > 0 ? '1.5px solid #fecaca' : '1px solid #eaedf2',
          borderRadius: '14px', 
          padding: '18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ color: '#6b7280', fontSize: '0.84rem', fontWeight: '600' }}>
              {currencyView === 'BS' ? 'Cuentas por Cobrar (Bs)' : 'Cuentas por Cobrar ($)'}
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: stats.totalPendiente > 0 ? 'rgba(248, 113, 113, 0.12)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle color={stats.totalPendiente > 0 ? "#f87171" : "#94a3b8"} size={18} />
            </div>
          </div>
          <div style={{ color: stats.totalPendiente > 0 ? '#dc2626' : '#64748b', fontSize: '1.65rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
            {currencyView === 'BS' ? formatBs(stats.totalPendiente * exchangeRate) : formatUSD(stats.totalPendiente)}
          </div>
          <div style={{ color: stats.totalPendiente > 0 ? '#b91c1c' : '#9ca3af', fontSize: '0.9rem', fontWeight: '700', marginTop: '2px' }}>
            {currencyView === 'BS' ? `${formatUSD(stats.totalPendiente)} USD` : formatBs(stats.totalPendiente * exchangeRate)}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>
            Créditos pendientes de cobro
          </div>
        </div>

      </div>

      {/* Clean Filter Section */}
      <FilterBar onFilterChange={setFilters} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', background: '#e2e8f0', padding: '5px', borderRadius: '12px', width: 'fit-content', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { key: 'Facturas', label: `🧾 Facturas (${filteredInvoices.length})` },
          { key: 'Por Cliente', label: `👥 Cuentas por Cliente (${clientStats.length})` },
          { key: 'Gráficos', label: '📊 Gráficos' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: activeTab === tab.key ? '#0f172a' : 'transparent',
              color: activeTab === tab.key ? '#ffffff' : '#475569',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? '700' : '600',
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
                  {currencyView === 'BS' ? (
                    <>
                      <th style={{ padding: '14px 16px', fontWeight: '700', color: '#0f172a' }}>Total (Bs) 🇻🇪</th>
                      <th style={{ padding: '14px 16px', fontWeight: '500', color: '#64748b' }}>Total ($)</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '14px 16px', fontWeight: '700', color: '#0f172a' }}>Total ($) 💵</th>
                      <th style={{ padding: '14px 16px', fontWeight: '500', color: '#64748b' }}>Total (Bs)</th>
                    </>
                  )}
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
                      {currencyView === 'BS' ? (
                        <>
                          <td style={{ padding: '14px 16px', fontWeight: '800', color: '#0f172a', fontSize: '0.92rem', textDecoration: isVoided ? 'line-through' : 'none' }}>
                            {formatBs(inv.totalBs || (Number(inv.totalUSD || 0) * exchangeRate))}
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: '600', color: '#64748b', textDecoration: isVoided ? 'line-through' : 'none' }}>
                            {formatUSD(inv.totalUSD)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '14px 16px', fontWeight: '800', color: '#0f172a', fontSize: '0.92rem', textDecoration: isVoided ? 'line-through' : 'none' }}>
                            {formatUSD(inv.totalUSD)}
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: '600', color: '#64748b', textDecoration: isVoided ? 'line-through' : 'none' }}>
                            {formatBs(inv.totalBs || (Number(inv.totalUSD || 0) * exchangeRate))}
                          </td>
                        </>
                      )}
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
                          <button
                            type="button"
                            onClick={() => setInvoiceToDeleteDash(inv)}
                            style={{
                              background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5',
                              padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500'
                            }}
                            title="Eliminar permanentemente de Dashboard, Caja y SENIAT"
                          >
                            🗑️
                          </button>
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
                <th style={{ padding: '14px 16px', fontWeight: '600', color: currencyView === 'BS' ? '#0f172a' : '#6b7280' }}>
                  {currencyView === 'BS' ? 'Total Comprado (Bs) 🇻🇪' : 'Total Comprado ($) 💵'}
                </th>
                <th style={{ padding: '14px 16px', fontWeight: '600', color: currencyView === 'BS' ? '#0f172a' : '#6b7280' }}>
                  {currencyView === 'BS' ? 'Total Pagado (Bs) 🇻🇪' : 'Total Pagado ($) 💵'}
                </th>
                <th style={{ padding: '14px 16px', fontWeight: '600', color: currencyView === 'BS' ? '#0f172a' : '#6b7280' }}>
                  {currencyView === 'BS' ? 'Deuda Pendiente (Bs) 🇻🇪' : 'Deuda Pendiente ($) 💵'}
                </th>
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
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '800', color: '#111827' }}>
                        {currencyView === 'BS' ? formatBs(client.totalBought * exchangeRate) : formatUSD(client.totalBought)}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>
                        {currencyView === 'BS' ? `${formatUSD(client.totalBought)} USD` : formatBs(client.totalBought * exchangeRate)}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '800', color: '#059669' }}>
                        {currencyView === 'BS' ? formatBs(client.totalPaid * exchangeRate) : formatUSD(client.totalPaid)}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#047857', marginTop: '1px' }}>
                        {currencyView === 'BS' ? `${formatUSD(client.totalPaid)} USD` : formatBs(client.totalPaid * exchangeRate)}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '800', color: client.debt > 0 ? '#dc2626' : '#64748b' }}>
                        {currencyView === 'BS' ? formatBs(client.debt * exchangeRate) : formatUSD(client.debt)}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: client.debt > 0 ? '#b91c1c' : '#9ca3af', marginTop: '1px' }}>
                        {currencyView === 'BS' ? `${formatUSD(client.debt)} USD` : formatBs(client.debt * exchangeRate)}
                      </div>
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
                              <th style={{ padding: '6px 8px', color: currencyView === 'BS' ? '#38bdf8' : '#94a3b8', fontWeight: currencyView === 'BS' ? '700' : '400' }}>Total (Bs) 🇻🇪</th>
                              <th style={{ padding: '6px 8px', color: currencyView === 'USD' ? '#38bdf8' : '#94a3b8', fontWeight: currencyView === 'USD' ? '700' : '400' }}>Total ($) 💵</th>
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
                                <td style={{ padding: '8px', fontWeight: currencyView === 'BS' ? '700' : '500', color: currencyView === 'BS' ? '#ffffff' : '#94a3b8' }}>
                                  {formatBs(inv.totalBs || (Number(inv.totalUSD || 0) * exchangeRate))}
                                </td>
                                <td style={{ padding: '8px', fontWeight: currencyView === 'USD' ? '700' : '500', color: currencyView === 'USD' ? '#ffffff' : '#94a3b8' }}>
                                  {formatUSD(inv.totalUSD)}
                                </td>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#111827', margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>
                {currencyView === 'BS' ? 'Ventas por Día (Bolívares Bs)' : 'Ventas por Día (Dólares $ USD)'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                {currencyView === 'BS' ? 'Expresado en Bs.' : 'Expresado en $'}
              </span>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByDay.length > 0 ? salesByDay : [{ date: 'Hoy', total: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => currencyView === 'BS' ? `${(val/1000).toFixed(0)}k` : `$${val}`} />
                  <Tooltip 
                    formatter={(val) => [currencyView === 'BS' ? formatBs(val) : formatUSD(val), 'Ventas']}
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }} 
                  />
                  <Bar dataKey="total" fill="#0284c7" radius={[4, 4, 0, 0]} name={currencyView === 'BS' ? 'Venta (Bs)' : 'Venta ($)'} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #eaedf2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#111827', margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>
                {currencyView === 'BS' ? 'Ventas por Método de Pago (Bolívares Bs)' : 'Ventas por Método de Pago (Dólares $ USD)'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                {currencyView === 'BS' ? 'Expresado en Bs.' : 'Expresado en $'}
              </span>
            </div>
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
                  <Tooltip 
                    formatter={(val) => [currencyView === 'BS' ? formatBs(val) : formatUSD(val), 'Total']}
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }} 
                  />
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

      {/* Delete Invoice Modal */}
      {invoiceToDeleteDash && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '2px solid #ef4444' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#991b1b', fontSize: '1.2rem', fontWeight: '800' }}>
              ¿Eliminar Factura {invoiceToDeleteDash.invoiceNumber}?
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#4b5563', fontSize: '0.88rem', lineHeight: '1.45' }}>
              Esta acción borrará la factura <strong>permanentemente de todo el sistema</strong> (Dashboard, Cierre de Caja y Libro SENIAT).
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                onClick={() => setInvoiceToDeleteDash(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#f3f4f6', color: '#4b5563', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (deleteInvoice) {
                    deleteInvoice(invoiceToDeleteDash.id);
                    setInvoiceToDeleteDash(null);
                  }
                }}
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: '700', cursor: 'pointer' }}
              >
                🗑️ Confirmar Eliminación
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
        
        const isBs = paymentMethodAb === 'pago_movil' || paymentMethodAb === 'efectivo_bs' || paymentMethodAb === 'punto';
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
                  <option value="punto">Punto de Venta (Bs)</option>
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

      {/* Modal Zoom QR Monitor Dueño */}
      {showQrModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '28px',
            width: '100%',
            maxWidth: '380px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Smartphone size={22} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#111827' }}>
                  Monitor del Dueño
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#9ca3af', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0 0 16px 0', lineHeight: '1.4' }}>
              Apunta la cámara de tu teléfono a este código QR para abrir el panel en vivo.
            </p>

            <div style={{
              background: '#f8fafc',
              border: '2px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '16px',
              display: 'inline-block',
              margin: '0 auto 16px'
            }}>
              {monitorInfo.publicQr || monitorInfo.localQr ? (
                <img
                  src={monitorInfo.publicQr || monitorInfo.localQr}
                  alt="QR Monitor Dueño"
                  style={{ width: '220px', height: '220px', display: 'block' }}
                />
              ) : (
                <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                  Generando código QR...
                </div>
              )}
            </div>

            <div style={{
              background: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '0.8rem',
              color: '#92400e',
              fontWeight: '600',
              marginBottom: '16px',
              textAlign: 'left',
              lineHeight: '1.35'
            }}>
              🔒 <strong>Seguridad:</strong> Solicitará la contraseña privada del dueño al entrar en el teléfono. Los empleados no pueden ver tus datos sin tu clave.
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '11px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedLink ? '¡Copiado!' : 'Copiar enlace'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                style={{
                  padding: '11px 18px',
                  background: '#f3f4f6',
                  color: '#4b5563',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

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
