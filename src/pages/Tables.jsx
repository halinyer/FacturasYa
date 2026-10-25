import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useData } from '../contexts/DataContext';
import { Utensils, Clock, CheckCircle, AlertCircle, ShoppingCart, Users, Plus, Check, RefreshCw, QrCode, ArrowRight, X, Printer, Edit2, Trash2, Bike, MapPin, Phone, Receipt } from 'lucide-react';
import QRConnectModal from '../components/QRConnectModal';
import InvoicePreview from '../components/InvoicePreview';
import KitchenTicketModal from '../components/KitchenTicketModal';

export default function Tables() {
  const navigate = useNavigate();
  const { 
    exchangeRate = 876.80,
    openTabs = [],
    deleteOpenTab,
    updateOpenTabStatus
  } = useData() || {};

  const [activeTab, setActiveTab] = useState('mesas'); // 'mesas' | 'comandas' | 'delivery' | 'config'
  const [selectedZone, setSelectedZone] = useState('Todos');
  const [selectedTable, setSelectedTable] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [preBillInvoice, setPreBillInvoice] = useState(null);
  const [selectedComandaPrint, setSelectedComandaPrint] = useState(null);
  const [restaurantState, setRestaurantState] = useState({
    tables: [],
    waiters: [],
    activeOrders: []
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Form states for salon configuration
  const [newTable, setNewTable] = useState({ name: '', zone: 'Salón' });
  const [newWaiter, setNewWaiter] = useState({ name: '', pin: '' });
  const [editingWaiter, setEditingWaiter] = useState(null);
  const [editingTable, setEditingTable] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchState = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/restaurant/state');
      if (res.ok) {
        const data = await res.json();
        setRestaurantState(data);
      }
    } catch (e) {
      console.warn('Error fetching restaurant state:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    let socket;
    try {
      socket = io('http://localhost:3001', { reconnectionDelay: 1000 });
      socket.on('restaurante:sync', (data) => {
        if (data) setRestaurantState(data);
      });
      socket.on('comanda:nueva', () => fetchState());
      socket.on('comanda:lista', () => fetchState());
      socket.on('comanda:servida', () => fetchState());
      socket.on('mesas:actualizadas', (tables) => {
        setRestaurantState(prev => ({ ...prev, tables }));
      });
    } catch (e) {
      console.warn('Socket connection error in Tables.jsx:', e);
    }
    const interval = setInterval(fetchState, 5000); // Polling heartbeat fallback
    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, []);

  // Zones list
  const zones = useMemo(() => {
    const list = new Set((restaurantState.tables || []).map(t => t.zone || 'Salón'));
    return ['Todos', ...Array.from(list)];
  }, [restaurantState.tables]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    if (selectedZone === 'Todos') return restaurantState.tables || [];
    return (restaurantState.tables || []).filter(t => t.zone === selectedZone);
  }, [restaurantState.tables, selectedZone]);

  // Active rounds for kitchen
  const activeRounds = useMemo(() => {
    const rounds = [];
    (restaurantState.activeOrders || []).forEach(order => {
      (order.rounds || []).forEach(rnd => {
        if (rnd.status !== 'servida') {
          rounds.push({
            ...rnd,
            orderId: order.id,
            tableName: order.tableName,
            tableId: order.tableId
          });
        }
      });
    });
    // Sort oldest first
    return rounds.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
  }, [restaurantState.activeOrders]);

  const deliveryTabs = useMemo(() => {
    return (openTabs || []).filter(t => t.orderType === 'delivery');
  }, [openTabs]);

  // Action: Mark round as ready (Vibrates Waiter Tablet)
  const handleMarkRoundReady = async (roundId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/restaurant/round/${roundId}/ready`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('🔔 Comanda marcada como Lista. Se notificó a la tablet del mesero.');
        fetchState();
      }
    } catch (e) {
      showToast('Error al actualizar comanda', 'error');
    }
  };

  // Action: Mark round as served/delivered
  const handleMarkRoundServed = async (roundId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/restaurant/round/${roundId}/served`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('✓ Comanda marcada como servida.');
        fetchState();
      }
    } catch (e) {
      showToast('Error al actualizar comanda', 'error');
    }
  };

  // Action: Free / Close Table
  const handleFreeTable = async (tableId) => {
    if (!window.confirm('¿Seguro que deseas liberar esta mesa?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/restaurant/table/${tableId}/free`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('Mesa liberada.');
        setSelectedTable(null);
        fetchState();
      }
    } catch (e) {
      showToast('Error al liberar mesa', 'error');
    }
  };

  // Action: Request bill from PC
  const handleRequestBill = async (table) => {
    try {
      const res = await fetch(`http://localhost:3001/api/restaurant/table/${table.id}/bill`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast(`🔔 Cuenta solicitada para ${table.name}. Lista para cobrar.`);
        fetchState();
      } else {
        showToast('Error al solicitar cuenta', 'error');
      }
    } catch (e) {
      showToast('Error al conectar con servidor', 'error');
    }
  };

  // Action: Reopen Table (Return from 'cuenta' to 'ocupada')
  const handleReopenTable = async (tableId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/restaurant/table/${tableId}/reopen`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('Mesa devuelta a estado de consumo.');
        fetchState();
      } else {
        showToast('Error al reabrir mesa', 'error');
      }
    } catch (e) {
      showToast('Error al conectar con servidor', 'error');
    }
  };

  // Action: Send to POS to charge
  const handleChargeInPOS = async (table, order) => {
    if (!order || !order.rounds || order.rounds.length === 0) {
      showToast('Esta mesa no tiene consumos registrados.', 'error');
      return;
    }

    if (table.status !== 'cuenta') {
      try {
        await fetch(`http://localhost:3001/api/restaurant/table/${table.id}/bill`, { method: 'POST' });
      } catch (err) {}
    }

    // Consolidate all items from all rounds
    const consolidatedItems = [];
    order.rounds.forEach(rnd => {
      rnd.items.forEach(item => {
        const found = consolidatedItems.find(i => i.id === item.productId && (i.note || '') === (item.note || ''));
        if (found) {
          found.quantity += item.quantity;
        } else {
          consolidatedItems.push({
            id: item.productId,
            name: item.name,
            priceUSD: item.priceUSD,
            quantity: item.quantity,
            note: item.note
          });
        }
      });
    });

    // Save temporary table transfer in sessionStorage so POS picks it up
    const isTakeaway = table.isTakeaway || table.zone === 'Para Llevar' || (table.name && table.name.toLowerCase().includes('llevar'));
    sessionStorage.setItem('pos_incoming_table_order', JSON.stringify({
      tableId: table.id,
      tableName: table.name,
      waiterName: order.waiterName,
      items: consolidatedItems,
      orderType: isTakeaway ? 'para_llevar' : 'salon'
    }));

    // Navigate directly to POS
    navigate('/pos');
  };

  // Action: Print Pre-Bill / Nota de Entrega before charging
  const handlePrintPreBill = (table, order) => {
    if (!order || !order.rounds || order.rounds.length === 0) {
      showToast('Esta mesa no tiene consumos registrados.', 'error');
      return;
    }

    const consolidatedItems = [];
    order.rounds.forEach(rnd => {
      rnd.items.forEach(item => {
        const found = consolidatedItems.find(i => i.productName === item.name && i.note === item.note);
        if (found) {
          found.quantity += item.quantity;
          found.subtotal += item.priceUSD * item.quantity;
        } else {
          consolidatedItems.push({
            productName: item.name,
            quantity: item.quantity,
            unitPrice: item.priceUSD,
            subtotal: Number((item.priceUSD * item.quantity).toFixed(2)),
            note: item.note
          });
        }
      });
    });

    const totalUSD = consolidatedItems.reduce((acc, i) => acc + i.subtotal, 0);

    const ticket = {
      id: order.id || Date.now(),
      invoiceNumber: `NE-PRE-${table.name.replace(/\s+/g, '')}`,
      date: new Date().toISOString(),
      items: consolidatedItems,
      totalUSD: Number(totalUSD.toFixed(2)),
      totalBs: Number((totalUSD * exchangeRate).toFixed(2)),
      exchangeRate,
      paymentMethod: 'Por Cobrar',
      status: 'pending',
      isPreBill: true,
      tableName: table.name,
      waiterName: order.waiterName || 'Mesero',
      client: { name: 'Mesa: ' + table.name, cedula: 'Consumidor Final' }
    };

    setPreBillInvoice(ticket);
  };

  const handleChargeDeliveryInPOS = (tab) => {
    sessionStorage.setItem('pos_incoming_table_order', JSON.stringify({
      tabId: tab.id,
      tableName: tab.name,
      orderType: 'delivery',
      deliveryInfo: tab.deliveryInfo,
      client: tab.client,
      items: tab.items
    }));
    navigate('/pos');
  };

  const handlePrintDeliveryPreBill = (tab) => {
    const itemsSub = (tab.items || []).reduce((s, i) => s + (Number(i.priceUSD || i.price || 0) * (i.quantity || 1)), 0);
    const delFee = parseFloat(tab.deliveryInfo?.deliveryFee) || 0;
    const totUSD = itemsSub + delFee;

    const preBill = {
      id: tab.id,
      invoiceNumber: 'PRE-CUENTA',
      isPreBill: true,
      date: tab.createdAt || new Date().toISOString(),
      client: tab.client,
      clientName: tab.client?.name || 'Consumidor Final',
      clientCedula: tab.client?.cedula || 'V-00000000',
      clientType: tab.client?.type || 'normal',
      orderType: 'delivery',
      deliveryInfo: tab.deliveryInfo,
      deliveryFee: delFee,
      items: (tab.items || []).map(i => ({
        productId: i.id || i.productId,
        productName: i.name,
        quantity: i.quantity,
        unitPrice: Number(i.priceUSD || i.price || 0),
        subtotal: Number(i.priceUSD || i.price || 0) * i.quantity
      })),
      totalUSD: totUSD,
      totalBs: totUSD * exchangeRate,
      exchangeRate: exchangeRate,
      paymentMethod: 'Por Cobrar',
      status: 'pending',
      tableName: tab.name
    };

    setPreBillInvoice(preBill);
  };

  // Add Table
  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!newTable.name.trim()) return;
    try {
      const res = await fetch('http://localhost:3001/api/restaurant/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTable)
      });
      if (res.ok) {
        showToast('Mesa creada exitosamente');
        setNewTable({ name: '', zone: 'Salón' });
        fetchState();
      }
    } catch (err) {
      showToast('Error al crear mesa', 'error');
    }
  };

  // Add Waiter
  const handleAddWaiter = async (e) => {
    e.preventDefault();
    if (!newWaiter.name.trim() || !newWaiter.pin.trim()) return;
    try {
      const res = await fetch('http://localhost:3001/api/restaurant/waiters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWaiter)
      });
      if (res.ok) {
        showToast('Mesero registrado exitosamente');
        setNewWaiter({ name: '', pin: '' });
        fetchState();
      }
    } catch (err) {
      showToast('Error al registrar mesero', 'error');
    }
  };

  // Update Waiter
  const handleUpdateWaiter = async (e) => {
    e.preventDefault();
    if (!editingWaiter || !editingWaiter.name.trim()) return;
    try {
      const res = await fetch(`http://localhost:3001/api/restaurant/waiters/${editingWaiter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingWaiter.name,
          pin: editingWaiter.pin,
          active: editingWaiter.active
        })
      });
      if (res.ok) {
        showToast('Mesero actualizado correctamente');
        setEditingWaiter(null);
        fetchState();
      } else {
        showToast('Error al actualizar mesero', 'error');
      }
    } catch (err) {
      showToast('Error al actualizar mesero', 'error');
    }
  };

  // Delete Waiter
  const handleDeleteWaiter = async (waiter) => {
    if (!window.confirm(`¿Seguro que deseas eliminar al mesero "${waiter.name}"?`)) return;
    try {
      const res = await fetch(`http://localhost:3001/api/restaurant/waiters/${waiter.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast(`Mesero "${waiter.name}" eliminado`);
        fetchState();
      } else {
        showToast('Error al eliminar mesero', 'error');
      }
    } catch (err) {
      showToast('Error al eliminar mesero', 'error');
    }
  };

  // Update Table
  const handleUpdateTable = async (e) => {
    e.preventDefault();
    if (!editingTable || !editingTable.name.trim()) return;
    try {
      const res = await fetch(`http://localhost:3001/api/restaurant/tables/${editingTable.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingTable.name,
          zone: editingTable.zone
        })
      });
      if (res.ok) {
        showToast('Mesa actualizada correctamente');
        setEditingTable(null);
        fetchState();
      } else {
        showToast('Error al actualizar mesa', 'error');
      }
    } catch (err) {
      showToast('Error al actualizar mesa', 'error');
    }
  };

  // Delete Table
  const handleDeleteTable = async (table) => {
    if (table.status === 'ocupada' || table.status === 'cuenta') {
      showToast('No puedes eliminar una mesa con pedidos activos o en cuenta', 'error');
      return;
    }
    if (!window.confirm(`¿Seguro que deseas eliminar la mesa "${table.name}"?`)) return;
    try {
      const res = await fetch(`http://localhost:3001/api/restaurant/tables/${table.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast(`Mesa "${table.name}" eliminada`);
        fetchState();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Error al eliminar mesa', 'error');
      }
    } catch (err) {
      showToast('Error al eliminar mesa', 'error');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', color: '#111827' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Utensils size={24} color="#2563eb" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '800' }}>Control de Salón y Comandas</h1>
              <p style={{ margin: '2px 0 0 0', color: '#6b7280', fontSize: '0.88rem' }}>
                Monitoreo en tiempo real de mesas, pedidos de meseros y cocina
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => navigate('/pos')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
              background: '#f8fafc', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: '10px',
              fontWeight: '700', cursor: 'pointer', fontSize: '0.88rem'
            }}
          >
            <ShoppingCart size={18} color="#2563eb" /> Punto de Venta (POS)
          </button>

          <button
            type="button"
            onClick={() => setShowQRModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
              background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '10px',
              fontWeight: '700', cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
            }}
          >
            <QrCode size={18} /> Vincular Tablets (QR)
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('mesas')}
          style={{
            padding: '12px 20px', background: 'none', border: 'none',
            borderBottom: activeTab === 'mesas' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'mesas' ? '#2563eb' : '#6b7280',
            fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem'
          }}
        >
          Mapa de Mesas ({filteredTables.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('comandas')}
          style={{
            padding: '12px 20px', background: 'none', border: 'none',
            borderBottom: activeTab === 'comandas' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'comandas' ? '#2563eb' : '#6b7280',
            fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <span>Comandas en Curso</span>
          {activeRounds.filter(r => r.status === 'pendiente').length > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', padding: '2px 7px', borderRadius: '999px', fontWeight: '800' }}>
              {activeRounds.filter(r => r.status === 'pendiente').length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('delivery')}
          style={{
            padding: '12px 20px', background: 'none', border: 'none',
            borderBottom: activeTab === 'delivery' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'delivery' ? '#0284c7' : '#6b7280',
            fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Bike size={18} />
          <span>Deliveries Activos</span>
          {deliveryTabs.length > 0 && (
            <span style={{ background: '#0284c7', color: '#fff', fontSize: '0.75rem', padding: '2px 7px', borderRadius: '999px', fontWeight: '800' }}>
              {deliveryTabs.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('config')}
          style={{
            padding: '12px 20px', background: 'none', border: 'none',
            borderBottom: activeTab === 'config' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'config' ? '#2563eb' : '#6b7280',
            fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem'
          }}
        >
          Meseros y Salón
        </button>
      </div>

      {/* TAB 1: MAPA DE MESAS */}
      {activeTab === 'mesas' && (
        <div>
          {/* Zones Pills */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
            {zones.map(z => (
              <button
                key={z}
                type="button"
                onClick={() => setSelectedZone(z)}
                style={{
                  padding: '7px 16px', borderRadius: '999px',
                  background: selectedZone === z ? '#0f172a' : '#ffffff',
                  color: selectedZone === z ? '#ffffff' : '#4b5563',
                  border: selectedZone === z ? 'none' : '1px solid #d1d5db',
                  fontWeight: '700', fontSize: '0.84rem', cursor: 'pointer'
                }}
              >
                {z}
              </button>
            ))}
          </div>

          {/* Grid of Tables */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {filteredTables.map(table => {
              const order = (restaurantState.activeOrders || []).find(o => o.tableId === table.id);
              const totalUSD = order 
                ? order.rounds.reduce((acc, r) => acc + r.items.reduce((sum, i) => sum + (i.priceUSD * i.quantity), 0), 0)
                : 0;

              const isOccupied = table.status === 'ocupada';
              const isBillRequested = table.status === 'cuenta';

              return (
                <div
                  key={table.id}
                  onClick={() => setSelectedTable({ table, order })}
                  style={{
                    background: '#ffffff',
                    border: isBillRequested ? '2px solid #3b82f6' : isOccupied ? '2px solid #f97316' : '1.5px solid #86efac',
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '140px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '800', fontSize: '1.2rem', color: '#111827' }}>{table.name}</span>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase',
                        padding: '3px 8px', borderRadius: '6px',
                        background: isBillRequested ? '#dbeafe' : isOccupied ? '#ffedd5' : '#dcfce7',
                        color: isBillRequested ? '#1e40af' : isOccupied ? '#9a3412' : '#166534'
                      }}>
                        {isBillRequested ? 'Pide Cuenta' : isOccupied ? 'Ocupada' : 'Libre'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                      Zona: <strong>{table.zone || 'Salón'}</strong>
                    </div>

                    {order && (
                      <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: '700', marginTop: '6px' }}>
                        👤 Mesero: {order.waiterName}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '12px' }}>
                    <div>
                      {totalUSD > 0 && (
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#d97706' }}>${totalUSD.toFixed(2)}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Bs. {(totalUSD * exchangeRate).toFixed(2)}</div>
                        </div>
                      )}
                    </div>

                    {isOccupied && (
                      <span style={{ fontSize: '0.75rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> Ver &rarr;
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: COMANDAS EN CURSO (KITCHEN / DISPATCH) */}
      {activeTab === 'comandas' && (
        <div>
          {activeRounds.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#9ca3af' }}>
              <CheckCircle size={48} color="#10b981" style={{ marginBottom: '12px' }} />
              <h3 style={{ margin: 0, color: '#111827', fontSize: '1.2rem' }}>¡Cocina al día!</h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem' }}>No hay comandas pendientes por despachar en este momento.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {activeRounds.map(rnd => {
                const isReady = rnd.status === 'lista';
                const elapsedMin = Math.round((Date.now() - new Date(rnd.sentAt).getTime()) / 60000);

                return (
                  <div
                    key={rnd.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: isReady ? '1.5px solid #a7f3d0' : elapsedMin > 15 ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
                      padding: '18px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '800', fontSize: '1.25rem', color: '#111827' }}>{rnd.tableName}</span>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: '800', padding: '3px 8px', borderRadius: '6px',
                          background: isReady ? '#d1fae5' : elapsedMin > 15 ? '#fee2e2' : '#f3f4f6',
                          color: isReady ? '#065f46' : elapsedMin > 15 ? '#b91c1c' : '#4b5563'
                        }}>
                          {isReady ? 'LISTA PARA SERVIR' : `HACE ${elapsedMin} MIN`}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '12px' }}>
                        Mesero: <strong>{rnd.waiterName}</strong> • {new Date(rnd.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>

                      {/* Items List */}
                      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {rnd.items.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <div>
                              <strong style={{ color: '#0f172a' }}>{item.quantity}x</strong> {item.name}
                              {item.note && (
                                <div style={{ fontSize: '0.78rem', color: '#d97706', fontStyle: 'italic', marginTop: '2px' }}>
                                  ⚠️ Nota: {item.note}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedComandaPrint({
                            round: rnd,
                            tableName: rnd.tableName || 'Mesa',
                            waiterName: rnd.waiterName || 'Mesero',
                            orderId: rnd.orderId || rnd.id || '',
                            autoPrint: true
                          })}
                          style={{
                            flex: 1.3, padding: '10px 12px', background: '#2563eb', color: '#ffffff',
                            border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.84rem',
                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                          }}
                          title="Enviar directo a la impresora térmica y abrir vista previa"
                        >
                          <Printer size={15} /> Imprimir Comanda (58mm)
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedComandaPrint({
                            round: rnd,
                            tableName: rnd.tableName || 'Mesa',
                            waiterName: rnd.waiterName || 'Mesero',
                            orderId: rnd.orderId || rnd.id || '',
                            autoPrint: false
                          })}
                          style={{
                            flex: 0.9, padding: '10px 10px', background: '#eff6ff', color: '#1d4ed8',
                            border: '1px solid #bfdbfe', borderRadius: '10px', fontWeight: '800', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '0.82rem'
                          }}
                          title="Ver vista previa de la comanda antes de imprimir"
                        >
                          <Receipt size={15} /> Ver Ticket
                        </button>
                      </div>

                      {!isReady ? (
                        <button
                          type="button"
                          onClick={() => handleMarkRoundReady(rnd.id)}
                          style={{
                            width: '100%', padding: '11px', background: '#10b981', color: '#ffffff',
                            border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.92rem'
                          }}
                        >
                          <Check size={18} /> Marcar Listo (Avisar a Mesero)
                        </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ textAlign: 'center', fontSize: '0.84rem', color: '#059669', fontWeight: '800' }}>
                            🔔 Plato notificado a tablet
                          </div>
                          <button
                            type="button"
                            onClick={() => handleMarkRoundServed(rnd.id)}
                            style={{
                              width: '100%', padding: '9px', background: '#e2e8f0', color: '#334155',
                              border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer',
                              fontSize: '0.84rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}
                          >
                            <Check size={16} /> Marcar como Servido en Mesa
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: DELIVERIES ACTIVOS */}
      {activeTab === 'delivery' && (
        <div>
          {deliveryTabs.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '56px 20px', textAlign: 'center', color: '#9ca3af' }}>
              <Bike size={52} color="#0284c7" style={{ marginBottom: '12px', opacity: 0.8 }} />
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: '800' }}>
                No hay pedidos de Delivery activos en este momento
              </h3>
              <p style={{ margin: '8px 0 16px 0', fontSize: '0.88rem', color: '#64748b' }}>
                Los pedidos a domicilio registrados desde el POS aparecerán aquí para control de cocina, despacho y cobro.
              </p>
              <button
                type="button"
                onClick={() => navigate('/pos')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                  background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '10px',
                  fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer'
                }}
              >
                <Plus size={16} /> Crear Pedido de Delivery en POS
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
              {deliveryTabs.map(tab => {
                const elapsedMin = Math.round((Date.now() - new Date(tab.createdAt || Date.now()).getTime()) / 60000);
                const itemsSub = (tab.items || []).reduce((s, i) => s + ((Number(i.priceUSD || i.price || 0)) * (i.quantity || 1)), 0);
                const delFee = parseFloat(tab.deliveryInfo?.deliveryFee) || 0;
                const totalUSD = itemsSub + delFee;
                const totalBs = totalUSD * exchangeRate;
                const isCocina = tab.status === 'cocina';
                const isCamino = tab.status === 'en_camino';

                return (
                  <div
                    key={tab.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: isCocina ? '2px solid #fde047' : isCamino ? '2px solid #38bdf8' : '2px solid #86efac',
                      padding: '20px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      {/* Delivery Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase',
                              padding: '3px 8px', borderRadius: '6px',
                              background: isCocina ? '#fef9c3' : isCamino ? '#e0f2fe' : '#dcfce7',
                              color: isCocina ? '#854d0e' : isCamino ? '#0369a1' : '#15803d'
                            }}>
                              {isCocina ? '👨‍🍳 En Preparación' : isCamino ? '🛵 En Camino' : '💵 Por Cobrar'}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                              <Clock size={11} style={{ verticalAlign: 'middle', marginRight: '2px' }} />
                              {elapsedMin <= 1 ? 'Hace un momento' : `Hace ${elapsedMin} min`}
                            </span>
                          </div>

                          <h3 style={{ margin: '8px 0 2px 0', fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
                            {tab.name}
                          </h3>
                        </div>

                        {/* Status Switch Dropdown */}
                        <select
                          value={tab.status || 'cocina'}
                          onChange={(e) => updateOpenTabStatus(tab.id, e.target.value)}
                          style={{
                            padding: '4px 8px', borderRadius: '8px', border: '1px solid #cbd5e1',
                            fontSize: '0.75rem', fontWeight: '700', background: '#f8fafc', color: '#334155', cursor: 'pointer'
                          }}
                        >
                          <option value="cocina">👨‍🍳 En Preparación</option>
                          <option value="en_camino">🛵 En Camino</option>
                          <option value="por_cobrar">💵 Por Cobrar</option>
                        </select>
                      </div>

                      {/* Delivery Customer & Location Box */}
                      {tab.deliveryInfo && (
                        <div style={{
                          background: '#f0f9ff', borderRadius: '12px', padding: '10px 12px',
                          border: '1px solid #e0f2fe', marginBottom: '14px', fontSize: '0.82rem',
                          display: 'flex', flexDirection: 'column', gap: '5px'
                        }}>
                          {tab.deliveryInfo.address && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#0369a1' }}>
                              <MapPin size={15} style={{ marginTop: '2px', flexShrink: 0 }} />
                              <span style={{ fontWeight: '700' }}>{tab.deliveryInfo.address}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', color: '#0284c7', fontSize: '0.76rem' }}>
                            {tab.deliveryInfo.phone && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={12} /> {tab.deliveryInfo.phone}
                              </span>
                            )}
                            {tab.deliveryInfo.courier && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Bike size={12} /> Repartidor: <strong>{tab.deliveryInfo.courier}</strong>
                              </span>
                            )}
                            {delFee > 0 && (
                              <span>Flete: <strong>${delFee.toFixed(2)}</strong></span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Items List */}
                      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(tab.items || []).map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ color: '#0f172a' }}>
                              <strong style={{ color: '#0284c7' }}>{item.quantity}x</strong> {item.name}
                            </span>
                            <span style={{ fontWeight: '700', color: '#475569' }}>
                              ${((Number(item.priceUSD || item.price || 0)) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total & Action Buttons */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Total a Cobrar:</div>
                          <div style={{ fontSize: '0.8rem', color: '#059669', fontFamily: 'monospace', fontWeight: '700' }}>
                            Bs. {totalBs.toFixed(2)}
                          </div>
                        </div>
                        <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a' }}>
                          ${totalUSD.toFixed(2)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleChargeDeliveryInPOS(tab)}
                          style={{
                            flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            padding: '11px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800',
                            fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                          }}
                        >
                          <ShoppingCart size={16} /> Cobrar en Caja
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintDeliveryPreBill(tab)}
                          title="Imprimir ticket de delivery"
                          style={{
                            padding: '11px 14px', background: '#f8fafc', color: '#475569',
                            border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <Printer size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Seguro que deseas descartar el delivery "${tab.name}"?`)) {
                              deleteOpenTab(tab.id);
                            }
                          }}
                          title="Cancelar pedido"
                          style={{
                            padding: '11px 14px', background: '#fff1f2', color: '#e11d48',
                            border: '1px solid #fecdd3', borderRadius: '10px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CONFIGURAR MESAS Y MESEROS */}
      {activeTab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          
          {/* Waiters Card */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #eaedf2' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="#2563eb" /> Meseros Activos
            </h3>

            <form onSubmit={handleAddWaiter} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                required
                type="text"
                placeholder="Nombre del mesero..."
                value={newWaiter.name}
                onChange={e => setNewWaiter({ ...newWaiter, name: e.target.value })}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
              />
              <input
                required
                type="password"
                maxLength="4"
                placeholder="PIN 4 dígitos"
                value={newWaiter.pin}
                onChange={e => setNewWaiter({ ...newWaiter, pin: e.target.value })}
                style={{ width: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
              />
              <button
                type="submit"
                style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: '700', cursor: 'pointer' }}
              >
                + Añadir
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(restaurantState.waiters || []).length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: '0.88rem' }}>
                  No hay meseros registrados todavía.
                </div>
              ) : (
                (restaurantState.waiters || []).map(w => (
                  <div
                    key={w.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: w.active === false ? '#f1f5f9' : '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      opacity: w.active === false ? 0.75 : 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: w.active === false ? '#cbd5e1' : '#dbeafe',
                          color: w.active === false ? '#64748b' : '#1e40af',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '0.85rem'
                        }}
                      >
                        {w.name ? w.name.charAt(0).toUpperCase() : 'M'}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0f172a' }}>
                          {w.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                            PIN: {w.pin || '****'}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: w.active === false ? '#fee2e2' : '#dcfce7',
                              color: w.active === false ? '#991b1b' : '#166534'
                            }}
                          >
                            {w.active === false ? 'Inactivo' : 'Activo'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        title="Editar mesero"
                        onClick={() => setEditingWaiter({ ...w, pin: w.pin || '' })}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#2563eb',
                          fontSize: '0.78rem',
                          fontWeight: '700'
                        }}
                      >
                        <Edit2 size={14} /> Editar
                      </button>
                      <button
                        type="button"
                        title="Eliminar mesero"
                        onClick={() => handleDeleteWaiter(w)}
                        style={{
                          background: '#fff1f2',
                          border: '1px solid #fecdd3',
                          borderRadius: '8px',
                          padding: '6px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          color: '#e11d48'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tables Card */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #eaedf2' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Utensils size={20} color="#d97706" /> Mesas y Áreas
            </h3>

            <form onSubmit={handleAddTable} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                required
                type="text"
                placeholder="Ej: Mesa 7, Barra 2..."
                value={newTable.name}
                onChange={e => setNewTable({ ...newTable, name: e.target.value })}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
              />
              <select
                value={newTable.zone}
                onChange={e => setNewTable({ ...newTable, zone: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', background: '#fff' }}
              >
                <option value="Salón">Salón</option>
                <option value="Terraza">Terraza</option>
                <option value="Barra">Barra</option>
                <option value="Delivery">Delivery / Llevar</option>
              </select>
              <button
                type="submit"
                style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: '700', cursor: 'pointer' }}
              >
                + Añadir
              </button>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
              {(restaurantState.tables || []).map(t => {
                const isOccupied = t.status === 'ocupada' || t.status === 'cuenta';
                return (
                  <div
                    key={t.id}
                    style={{
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0f172a' }}>{t.name}</div>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isOccupied ? '#ffedd5' : '#dcfce7',
                            color: isOccupied ? '#9a3412' : '#166534'
                          }}
                        >
                          {t.status || 'libre'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{t.zone}</div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setEditingTable({ ...t })}
                        style={{
                          flex: 1,
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '5px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          color: '#2563eb',
                          fontSize: '0.75rem',
                          fontWeight: '700'
                        }}
                      >
                        <Edit2 size={13} /> Editar
                      </button>
                      <button
                        type="button"
                        disabled={isOccupied}
                        title={isOccupied ? 'No se puede eliminar una mesa ocupada' : 'Eliminar mesa'}
                        onClick={() => handleDeleteTable(t)}
                        style={{
                          background: isOccupied ? '#f1f5f9' : '#fff1f2',
                          border: `1px solid ${isOccupied ? '#e2e8f0' : '#fecdd3'}`,
                          borderRadius: '6px',
                          padding: '5px 8px',
                          cursor: isOccupied ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isOccupied ? '#94a3b8' : '#e11d48'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Detail Drawer Modal for Table Action */}
      {selectedTable && (() => {
        const currentTable = (restaurantState.tables || []).find(t => t.id === selectedTable.table.id) || selectedTable.table;
        const currentOrder = (restaurantState.activeOrders || []).find(o => o.tableId === currentTable.id) || selectedTable.order;
        const isBillRequested = currentTable.status === 'cuenta';
        const isOccupied = currentTable.status === 'ocupada';

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 1200 }}>
            <div style={{ background: '#ffffff', width: '100%', maxWidth: '420px', height: '100%', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 25px rgba(0,0,0,0.15)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800' }}>{currentTable.name}</h2>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: '6px',
                      background: isBillRequested ? '#dbeafe' : isOccupied ? '#ffedd5' : '#dcfce7',
                      color: isBillRequested ? '#1e40af' : isOccupied ? '#9a3412' : '#166534'
                    }}>
                      {isBillRequested ? 'Pide Cuenta' : isOccupied ? 'En Consumo' : 'Libre'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '3px' }}>Zona: {currentTable.zone}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTable(null)}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                >
                  <X size={22} />
                </button>
              </div>

              {/* Consumptions List */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {!currentOrder || !currentOrder.rounds || currentOrder.rounds.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '60px' }}>
                    <ShoppingCart size={40} style={{ opacity: 0.4, marginBottom: '8px' }} />
                    <div>Mesa libre sin pedidos activos</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ fontSize: '0.82rem', color: '#4b5563' }}>
                      Mesero: <strong>{currentOrder.waiterName || 'Mesero'}</strong>
                    </div>

                    {currentOrder.rounds.map((rnd, rIdx) => (
                      <div key={rnd.id} style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748b', fontWeight: '700', marginBottom: '8px' }}>
                          <span>Ronda #{rIdx + 1} • {new Date(rnd.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedComandaPrint({
                              round: { ...rnd, roundNumber: rnd.roundNumber || (rIdx + 1) },
                              tableName: currentTable.name || 'Mesa',
                              waiterName: currentOrder.waiterName || 'Mesero',
                              orderId: currentOrder.id || rnd.id || '',
                              autoPrint: false
                            })}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '4px 8px', background: '#eff6ff', color: '#2563eb',
                              border: '1px solid #bfdbfe', borderRadius: '6px',
                              fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer'
                            }}
                            title="Ver e imprimir comanda de esta ronda en 58mm"
                          >
                            <Printer size={12} /> Comanda
                          </button>
                        </div>
                        {rnd.items.map((i, iIdx) => (
                          <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '4px' }}>
                            <span><strong>{i.quantity}x</strong> {i.name}</span>
                            <span style={{ fontWeight: '700' }}>${(i.priceUSD * i.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              {currentOrder && currentOrder.rounds && currentOrder.rounds.length > 0 && (
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '16px' }}>
                  {(() => {
                    const total = currentOrder.rounds.reduce((acc, r) => acc + r.items.reduce((s, i) => s + (i.priceUSD * i.quantity), 0), 0);
                    return (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '800' }}>
                          <span>Total de la Mesa:</span>
                          <span style={{ color: '#d97706' }}>${total.toFixed(2)}</span>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#6b7280' }}>
                          Bs. {(total * exchangeRate).toFixed(2)}
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* CASO 1: LA MESA ESTÁ EN CONSUMO (Aún NO ha pedido la cuenta) */}
                    {!isBillRequested && (
                      <>
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Clock size={20} color="#d97706" style={{ flexShrink: 0 }} />
                          <div style={{ fontSize: '0.82rem', color: '#92400e', lineHeight: 1.35 }}>
                            <strong>Mesa en consumo.</strong> Pasa directamente a cobrar en caja para emitir el ticket de venta.
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleChargeInPOS(currentTable, currentOrder)}
                          style={{
                            width: '100%', padding: '14px', background: '#2563eb', color: '#ffffff',
                            border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '1rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            boxShadow: '0 4px 14px rgba(37,99,235,0.25)'
                          }}
                        >
                          <ShoppingCart size={18} /> COBRAR EN CAJA (POS) &rarr;
                        </button>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleRequestBill(currentTable)}
                            style={{
                              flex: 1, padding: '10px', background: '#f8fafc', color: '#475569',
                              border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: '700', fontSize: '0.82rem',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}
                          >
                            <Clock size={14} /> Marcar "Pide Cuenta"
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintPreBill(currentTable, currentOrder)}
                            style={{
                              padding: '10px 14px', background: '#f8fafc', color: '#475569',
                              border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: '700', fontSize: '0.82rem',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}
                            title="Ver Pre-orden antes del cobro"
                          >
                            <Printer size={15} /> Ver Pre-orden
                          </button>
                        </div>
                      </>
                    )}

                    {/* CASO 2: LA MESA YA PIDIÓ LA CUENTA (Lista para cobrar) */}
                    {isBillRequested && (
                      <>
                        <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle size={18} color="#2563eb" />
                            <div style={{ fontSize: '0.84rem', color: '#1e40af', fontWeight: '800' }}>
                              Cuenta Solicitada (Lista para cobro)
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleReopenTable(currentTable.id)}
                            style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}
                            title="Volver a consumo si piden más productos"
                          >
                            ↩️ Reabrir
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleChargeInPOS(currentTable, currentOrder)}
                          style={{
                            width: '100%', padding: '14px', background: '#dc2626', color: '#ffffff',
                            border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '1rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)'
                          }}
                        >
                          <ShoppingCart size={18} /> COBRAR EN CAJA (POS) &rarr;
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintPreBill(currentTable, currentOrder)}
                          style={{
                            width: '100%', padding: '9px', background: '#eff6ff', color: '#1e40af',
                            border: '1px solid #bfdbfe', borderRadius: '10px', fontWeight: '700', fontSize: '0.82rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                          }}
                        >
                          <Printer size={15} /> Ver Ticket Pre-orden
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleFreeTable(currentTable.id)}
                      style={{
                        width: '100%', padding: '8px', background: 'transparent', color: '#94a3b8',
                        border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer',
                        marginTop: '4px'
                      }}
                    >
                      Liberar / Cancelar Mesa
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* Edit Waiter Modal */}
      {editingWaiter && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '400px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} color="#2563eb" /> Editar Mesero
              </h3>
              <button
                type="button"
                onClick={() => setEditingWaiter(null)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateWaiter} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  Nombre del Mesero
                </label>
                <input
                  required
                  type="text"
                  value={editingWaiter.name}
                  onChange={e => setEditingWaiter({ ...editingWaiter, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  PIN de Acceso (4 dígitos)
                </label>
                <input
                  required
                  type="text"
                  maxLength="4"
                  pattern="[0-9]{4}"
                  value={editingWaiter.pin}
                  onChange={e => setEditingWaiter({ ...editingWaiter, pin: e.target.value.replace(/\D/g, '') })}
                  placeholder="Ej: 1234"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', fontFamily: 'monospace', letterSpacing: '2px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="waiterActiveCheck"
                  checked={editingWaiter.active !== false}
                  onChange={e => setEditingWaiter({ ...editingWaiter, active: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="waiterActiveCheck" style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1e293b', cursor: 'pointer' }}>
                  Mesero activo (permite iniciar sesión en tablet)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingWaiter(null)}
                  style={{ flex: 1, padding: '11px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '11px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      {editingTable && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '400px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Utensils size={20} color="#d97706" /> Editar Mesa / Área
              </h3>
              <button
                type="button"
                onClick={() => setEditingTable(null)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateTable} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  Nombre de la Mesa
                </label>
                <input
                  required
                  type="text"
                  value={editingTable.name}
                  onChange={e => setEditingTable({ ...editingTable, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  Zona o Área
                </label>
                <select
                  value={editingTable.zone}
                  onChange={e => setEditingTable({ ...editingTable, zone: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="Salón">Salón</option>
                  <option value="Terraza">Terraza</option>
                  <option value="Barra">Barra</option>
                  <option value="Delivery">Delivery / Llevar</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  style={{ flex: 1, padding: '11px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '11px', background: '#d97706', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pre-bill Invoice Preview Modal */}
      {preBillInvoice && (
        <InvoicePreview
          invoice={preBillInvoice}
          onClose={() => setPreBillInvoice(null)}
        />
      )}

      {/* Comanda Kitchen Ticket Print Modal */}
      {selectedComandaPrint && (
        <KitchenTicketModal
          round={selectedComandaPrint.round}
          tableName={selectedComandaPrint.tableName}
          waiterName={selectedComandaPrint.waiterName}
          orderId={selectedComandaPrint.orderId}
          autoPrint={selectedComandaPrint.autoPrint}
          onClose={() => setSelectedComandaPrint(null)}
        />
      )}

      {/* QR Connect Modal */}
      {showQRModal && (
        <QRConnectModal onClose={() => setShowQRModal(false)} />
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#10b981' : '#dc2626',
          color: '#fff', padding: '10px 22px', borderRadius: '24px',
          fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)', zIndex: 3000, fontSize: '0.88rem'
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

    </div>
  );
}
