import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useData } from '../../pos-core/contexts/DataContext';
import {
  Utensils,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShoppingCart,
  Users,
  Plus,
  Check,
  QrCode,
  X,
  Printer,
  Edit2,
  Trash2,
  Bike,
  MapPin,
  Phone,
  Receipt,
  ChevronRight,
  KeyRound,
  RotateCcw
} from 'lucide-react';
import QRConnectModal from '../../pos-core/components/QRConnectModal';
import InvoicePreview from '../../pos-core/components/InvoicePreview';
import KitchenTicketModal, { buildKitchenTicketHtml } from '../../pos-core/components/KitchenTicketModal';
import { printIsolatedTicket } from '../../pos-core/utils/printIsolatedTicket';

const DEFAULT_FALLBACK_STATE = {
  waiters: [
    { id: 'w_1', name: 'Carlos Mendoza', pin: '1111', active: true },
    { id: 'w_2', name: 'Valeria Rivas', pin: '2222', active: true },
    { id: 'w_3', name: 'Andrés Suárez', pin: '3333', active: true }
  ],
  tables: [
    { id: 't_1', name: 'Mesa 1', zone: 'Salón', status: 'libre' },
    { id: 't_2', name: 'Mesa 2', zone: 'Salón', status: 'libre' },
    { id: 't_3', name: 'Mesa 3', zone: 'Salón', status: 'libre' },
    { id: 't_4', name: 'Mesa 4', zone: 'Salón', status: 'libre' },
    { id: 't_5', name: 'Mesa 5', zone: 'Salón', status: 'libre' },
    { id: 't_6', name: 'Mesa 6', zone: 'Salón', status: 'libre' },
    { id: 't_7', name: 'Terraza 1', zone: 'Terraza', status: 'libre' },
    { id: 't_8', name: 'Terraza 2', zone: 'Terraza', status: 'libre' },
    { id: 't_9', name: 'Barra', zone: 'Barra', status: 'libre' },
    { id: 't_10', name: 'Para Llevar', zone: 'Delivery', status: 'libre' }
  ],
  activeOrders: []
};

function sanitizeRestaurantState(state) {
  if (!state || typeof state !== 'object') return DEFAULT_FALLBACK_STATE;
  const activeOrders = Array.isArray(state.activeOrders) ? state.activeOrders : [];
  const waiters = Array.isArray(state.waiters) ? state.waiters : DEFAULT_FALLBACK_STATE.waiters;
  const rawTables =
    Array.isArray(state.tables) && state.tables.length > 0
      ? state.tables
      : DEFAULT_FALLBACK_STATE.tables;

  const tables = rawTables.map((t) => {
    const hasActiveOrder = activeOrders.some(
      (o) => o.tableId === t.id && Array.isArray(o.rounds) && o.rounds.length > 0
    );
    let normalizedStatus = t.status;
    if (normalizedStatus === 'free' || !normalizedStatus) normalizedStatus = 'libre';
    if (normalizedStatus === 'occupied') normalizedStatus = 'ocupada';
    if (normalizedStatus === 'bill_requested') normalizedStatus = 'cuenta';

    if (!hasActiveOrder && (normalizedStatus === 'ocupada' || normalizedStatus === 'cuenta')) {
      normalizedStatus = 'libre';
    }
    return {
      ...t,
      status: normalizedStatus
    };
  });

  return {
    ...state,
    tables,
    waiters,
    activeOrders
  };
}

export default function TablesView({ onGoToPos }) {
  const navigate = useNavigate();
  const {
    exchangeRate = 876.80,
    openTabs = [],
    deleteOpenTab,
    updateOpenTabStatus
  } = useData() || {};

  const goToPos = () => {
    if (typeof onGoToPos === 'function') {
      onGoToPos();
    } else {
      navigate('/app');
    }
  };

  const [activeTab, setActiveTab] = useState('mesas'); // 'mesas' | 'comandas' | 'delivery' | 'config'
  const [selectedZone, setSelectedZone] = useState('Todos');
  const [selectedTable, setSelectedTable] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [preBillInvoice, setPreBillInvoice] = useState(null);
  const [selectedComandaPrint, setSelectedComandaPrint] = useState(null);
  const [restaurantState, setRestaurantState] = useState(() => {
    try {
      localStorage.removeItem('facturasya_restaurant_tables');
      const saved = localStorage.getItem('facturasya_restaurant_state_v2');
      if (saved) {
        return sanitizeRestaurantState(JSON.parse(saved));
      }
    } catch (e) {}
    return DEFAULT_FALLBACK_STATE;
  });
  const [toast, setToast] = useState(null);

  // Detección y selección en vivo de Impresoras Térmicas de Comandas
  const [printersList, setPrintersList] = useState([]);
  const [activeComandaPrinter, setActiveComandaPrinter] = useState(() => localStorage.getItem('pos_comanda_printer') || '');

  useEffect(() => {
    if (window.electronAPI && typeof window.electronAPI.getPrinters === 'function') {
      window.electronAPI.getPrinters().then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setPrintersList(list);
          const saved = localStorage.getItem('pos_comanda_printer');
          const exists = saved && list.some((p) => p.name === saved);
          if (saved && exists) {
            setActiveComandaPrinter(saved);
          } else {
            const autoMatch =
              list.find((p) => p.isDefault && /pos|thermal|ticket|58|80|kitchen|comanda|receipt|xp-|tm-|epson|bixolon|star/i.test(p.name)) ||
              list.find((p) => /pos|thermal|ticket|58|80|kitchen|comanda|receipt|xp-|tm-|epson|bixolon|star/i.test(p.name)) ||
              list.find((p) => p.isDefault) ||
              list[0];
            if (autoMatch) {
              setActiveComandaPrinter(autoMatch.name);
              localStorage.setItem('pos_comanda_printer', autoMatch.name);
            }
          }
        }
      }).catch(() => {});
    }
  }, []);

  // Estados de formulario para configuración de salón y meseros
  const [newTable, setNewTable] = useState({ name: '', zone: 'Salón' });
  const [newWaiter, setNewWaiter] = useState({ name: '', pin: '' });
  const [editingWaiter, setEditingWaiter] = useState(null);
  const [editingTable, setEditingTable] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handlePrintComandaDirect = async ({ round, tableName, waiterName, orderId }) => {
    const isDirect = localStorage.getItem('pos_comanda_direct_print') !== 'false';
    if (!isDirect) {
      setSelectedComandaPrint({ round, tableName, waiterName, orderId, autoPrint: true });
      return;
    }

    try {
      const paperSize = localStorage.getItem('pos_comanda_paper_size') || '58mm';
      const printer = localStorage.getItem('pos_comanda_printer') || '';
      const html = buildKitchenTicketHtml({ round, tableName, waiterName, orderId, paperSize });

      showToast(`Enviando comanda de ${tableName || 'Mesa'} a cocina...`, 'info');

      const res = await printIsolatedTicket({
        html,
        paperSize,
        deviceName: printer,
        silent: true
      });

      if (res && res.success === false) {
        showToast(`Aviso impresora: ${res.failureReason || res.error || 'Verifica la comandera'}`, 'error');
        // Fallback: abrir modal interactivo para permitir previsualizar y elegir la impresora
        setSelectedComandaPrint({ round, tableName, waiterName, orderId, autoPrint: false });
      } else {
        const printerLabel = printer ? ` (${printer})` : '';
        showToast(`✅ Comanda de ${tableName || 'Mesa'} impresa en cocina${printerLabel}`, 'success');
      }
    } catch (err) {
      console.warn('Error en impresión directa:', err);
      setSelectedComandaPrint({ round, tableName, waiterName, orderId, autoPrint: false });
    }
  };


  const saveLocalFallback = (nextState) => {
    const clean = sanitizeRestaurantState(nextState);
    setRestaurantState(clean);
    try {
      localStorage.setItem('facturasya_restaurant_state_v2', JSON.stringify(clean));
    } catch (e) {}
  };

  const fetchState = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/restaurant/state');
      if (res.ok) {
        const data = await res.json();
        saveLocalFallback(data);
      }
    } catch (e) {
      // Modo standalone web: mantiene estado local
    }
  };

  useEffect(() => {
    fetchState();
    let socket;
    try {
      socket = io('http://localhost:3001', { reconnectionDelay: 1000 });
      socket.on('restaurante:sync', (data) => {
        if (data) saveLocalFallback(data);
      });
      socket.on('comanda:nueva', () => fetchState());
      socket.on('comanda:lista', () => fetchState());
      socket.on('comanda:servida', () => fetchState());
      socket.on('mesas:actualizadas', (tables) => {
        setRestaurantState((prev) => sanitizeRestaurantState({ ...prev, tables }));
      });
    } catch (e) {}
    const interval = setInterval(fetchState, 5000);
    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, []);

  // Lista de zonas
  const zones = useMemo(() => {
    const list = new Set((restaurantState.tables || []).map((t) => t.zone || 'Salón'));
    return ['Todos', ...Array.from(list)];
  }, [restaurantState.tables]);

  // Mesas filtradas
  const filteredTables = useMemo(() => {
    if (selectedZone === 'Todos') return restaurantState.tables || [];
    return (restaurantState.tables || []).filter((t) => t.zone === selectedZone);
  }, [restaurantState.tables, selectedZone]);

  // Estadísticas rápidas del salón
  const salonStats = useMemo(() => {
    const all = restaurantState.tables || [];
    const free = all.filter((t) => t.status === 'libre' || !t.status).length;
    const occupied = all.filter((t) => t.status === 'ocupada' || t.status === 'cuenta').length;
    return { total: all.length, free, occupied };
  }, [restaurantState.tables]);

  // Comandas activas para cocina
  const activeRounds = useMemo(() => {
    const rounds = [];
    (restaurantState.activeOrders || []).forEach((order) => {
      (order.rounds || []).forEach((rnd) => {
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
    return rounds.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
  }, [restaurantState.activeOrders]);

  const pendingKitchenCount = useMemo(
    () => activeRounds.filter((r) => r.status === 'pendiente').length,
    [activeRounds]
  );

  const deliveryTabs = useMemo(() => {
    return (openTabs || []).filter((t) => t.orderType === 'delivery');
  }, [openTabs]);

  // Marcar ronda como lista (Notifica y hace vibrar la tablet del mesero)
  const handleMarkRoundReady = async (roundId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/restaurant/round/${roundId}/ready`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('Comanda marcada como Lista. Se notificó a la tablet del mesero.');
        fetchState();
      }
    } catch (e) {
      showToast('Error al actualizar comanda', 'error');
    }
  };

  // Marcar ronda como servida en mesa
  const handleMarkRoundServed = async (roundId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/restaurant/round/${roundId}/served`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('Comanda marcada como servida en mesa.');
        fetchState();
      }
    } catch (e) {
      showToast('Error al actualizar comanda', 'error');
    }
  };

  // Liberar / Cerrar mesa
  const handleFreeTable = async (tableId) => {
    if (!window.confirm('¿Seguro que deseas liberar esta mesa?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/restaurant/table/${tableId}/free`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('Mesa liberada correctamente.');
        setSelectedTable(null);
        fetchState();
        return;
      }
    } catch (e) {}
    const nextTables = (restaurantState.tables || []).map((t) =>
      t.id === tableId ? { ...t, status: 'libre' } : t
    );
    const nextOrders = (restaurantState.activeOrders || []).filter((o) => o.tableId !== tableId);
    saveLocalFallback({ ...restaurantState, tables: nextTables, activeOrders: nextOrders });
    setSelectedTable(null);
    showToast('Mesa liberada correctamente.');
  };

  // Solicitar cuenta desde PC
  const handleRequestBill = async (table) => {
    try {
      const res = await fetch(`http://localhost:3001/api/restaurant/table/${table.id}/bill`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast(`Cuenta solicitada para ${table.name}. Lista para cobrar.`);
        fetchState();
        return;
      }
    } catch (e) {}
    const nextTables = (restaurantState.tables || []).map((t) =>
      t.id === table.id ? { ...t, status: 'cuenta' } : t
    );
    saveLocalFallback({ ...restaurantState, tables: nextTables });
    showToast(`Cuenta solicitada para ${table.name}. Lista para cobrar.`);
  };

  // Reabrir mesa (volver de 'cuenta' a 'ocupada')
  const handleReopenTable = async (tableId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/restaurant/table/${tableId}/reopen`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('Mesa devuelta a estado de consumo.');
        fetchState();
        return;
      }
    } catch (e) {}
    const nextTables = (restaurantState.tables || []).map((t) =>
      t.id === tableId ? { ...t, status: 'ocupada' } : t
    );
    saveLocalFallback({ ...restaurantState, tables: nextTables });
    showToast('Mesa devuelta a estado de consumo.');
  };

  // Enviar consumo al POS para cobrar
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

    const consolidatedItems = [];
    order.rounds.forEach((rnd) => {
      rnd.items.forEach((item) => {
        const found = consolidatedItems.find(
          (i) => (i.id === item.productId || i.id === item.id) && (i.note || '') === (item.note || '')
        );
        const unitPrice = Number(item.priceUSD ?? item.priceUsd ?? item.unitPrice ?? item.price ?? 0);
        const qty = Number(item.quantity ?? item.qty ?? 1);
        if (found) {
          found.quantity += qty;
          found.qty = found.quantity;
        } else {
          consolidatedItems.push({
            id: item.productId || item.id,
            productId: item.productId || item.id,
            name: item.name,
            price: unitPrice,
            priceUsd: unitPrice,
            priceUSD: unitPrice,
            quantity: qty,
            qty: qty,
            note: item.note || ''
          });
        }
      });
    });

    const isTakeaway =
      table.isTakeaway ||
      table.zone === 'Para Llevar' ||
      (table.name && table.name.toLowerCase().includes('llevar'));
    sessionStorage.setItem(
      'pos_incoming_table_order',
      JSON.stringify({
        tableId: table.id,
        tableName: table.name,
        waiterName: order.waiterName,
        items: consolidatedItems,
        orderType: isTakeaway ? 'para_llevar' : 'salon'
      })
    );

    goToPos();
  };

  // Imprimir Pre-Cuenta / Nota de Entrega antes de cobrar
  const handlePrintPreBill = (table, order) => {
    if (!order || !order.rounds || order.rounds.length === 0) {
      showToast('Esta mesa no tiene consumos registrados.', 'error');
      return;
    }

    const consolidatedItems = [];
    order.rounds.forEach((rnd) => {
      rnd.items.forEach((item) => {
        const found = consolidatedItems.find(
          (i) => (i.productName === item.name || i.name === item.name) && (i.note || '') === (item.note || '')
        );
        const unitPrice = Number(item.priceUSD ?? item.priceUsd ?? item.unitPrice ?? item.price ?? 0);
        const qty = Number(item.quantity ?? item.qty ?? 1);
        if (found) {
          found.quantity += qty;
          found.qty = found.quantity;
          found.subtotal = Number((found.quantity * unitPrice).toFixed(2));
          found.subtotalUsd = found.subtotal;
          found.subtotalBs = Number((found.subtotal * exchangeRate).toFixed(2));
        } else {
          consolidatedItems.push({
            id: item.productId || item.id,
            name: item.name,
            productName: item.name,
            quantity: qty,
            qty: qty,
            unitPrice: unitPrice,
            price: unitPrice,
            priceUsd: unitPrice,
            priceUSD: unitPrice,
            priceBs: Number((unitPrice * exchangeRate).toFixed(2)),
            subtotal: Number((unitPrice * qty).toFixed(2)),
            subtotalUsd: Number((unitPrice * qty).toFixed(2)),
            subtotalBs: Number((unitPrice * qty * exchangeRate).toFixed(2)),
            note: item.note || ''
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
    sessionStorage.setItem(
      'pos_incoming_table_order',
      JSON.stringify({
        tabId: tab.id,
        tableName: tab.name,
        orderType: 'delivery',
        deliveryInfo: tab.deliveryInfo,
        client: tab.client,
        items: tab.items
      })
    );
    goToPos();
  };

  const handlePrintDeliveryPreBill = (tab) => {
    const itemsSub = (tab.items || []).reduce(
      (s, i) => s + Number(i.priceUSD || i.price || 0) * (i.quantity || 1),
      0
    );
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
      items: (tab.items || []).map((i) => ({
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

  // Crear Mesa
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
        return;
      }
    } catch (err) {}
    const created = {
      id: 't_' + Date.now(),
      name: newTable.name.trim(),
      zone: newTable.zone || 'Salón',
      status: 'libre'
    };
    saveLocalFallback({
      ...restaurantState,
      tables: [...(restaurantState.tables || []), created]
    });
    setNewTable({ name: '', zone: 'Salón' });
    showToast('Mesa creada exitosamente');
  };

  // Crear Mesero
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
        return;
      }
    } catch (err) {}
    const created = {
      id: 'w_' + Date.now(),
      name: newWaiter.name.trim(),
      pin: newWaiter.pin.trim(),
      active: true
    };
    saveLocalFallback({
      ...restaurantState,
      waiters: [...(restaurantState.waiters || []), created]
    });
    setNewWaiter({ name: '', pin: '' });
    showToast('Mesero registrado exitosamente');
  };

  // Actualizar Mesero
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
        return;
      }
    } catch (err) {}
    const nextWaiters = (restaurantState.waiters || []).map((w) =>
      w.id === editingWaiter.id
        ? { ...w, name: editingWaiter.name.trim(), pin: editingWaiter.pin.trim(), active: !!editingWaiter.active }
        : w
    );
    saveLocalFallback({ ...restaurantState, waiters: nextWaiters });
    setEditingWaiter(null);
    showToast('Mesero actualizado correctamente');
  };

  // Eliminar Mesero
  const handleDeleteWaiter = async (waiter) => {
    if (!window.confirm(`¿Seguro que deseas eliminar al mesero "${waiter.name}"?`)) return;
    try {
      const res = await fetch(`http://localhost:3001/api/restaurant/waiters/${waiter.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast(`Mesero "${waiter.name}" eliminado`);
        fetchState();
        return;
      }
    } catch (err) {}
    const nextWaiters = (restaurantState.waiters || []).filter((w) => w.id !== waiter.id);
    saveLocalFallback({ ...restaurantState, waiters: nextWaiters });
    showToast(`Mesero "${waiter.name}" eliminado`);
  };

  // Actualizar Mesa
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
        return;
      }
    } catch (err) {}
    const nextTables = (restaurantState.tables || []).map((t) =>
      t.id === editingTable.id ? { ...t, name: editingTable.name.trim(), zone: editingTable.zone } : t
    );
    saveLocalFallback({ ...restaurantState, tables: nextTables });
    setEditingTable(null);
    showToast('Mesa actualizada correctamente');
  };

  // Eliminar Mesa
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
        return;
      }
    } catch (err) {}
    const nextTables = (restaurantState.tables || []).filter((t) => t.id !== table.id);
    saveLocalFallback({ ...restaurantState, tables: nextTables });
    showToast(`Mesa "${table.name}" eliminada`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-y-auto">
      {/* HEADER PRINCIPAL ESTILO NOTION */}
      <div className="bg-white border-b border-zinc-200/80 px-6 py-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
                <Utensils size={18} />
              </span>
              <h1 className="text-xl font-bold text-zinc-950 tracking-tight">
                Control de Salón y Comandas
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {salonStats.free} Libres · {salonStats.occupied} Ocupadas
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Monitoreo en tiempo real de mesas, pedidos de meseros en tablets, despacho de cocina y delivery
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowQRModal(true)}
              className="px-3.5 py-2 rounded-xl bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200/80 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <QrCode size={15} className="text-sky-600" />
              <span>Vincular Tablets (QR)</span>
            </button>

            <button
              type="button"
              onClick={goToPos}
              className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ShoppingCart size={15} className="text-emerald-400" />
              <span>Punto de Venta (POS)</span>
            </button>
          </div>
        </div>

        {/* BARRA DE PESTAÑAS ESTILO NOTION */}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-zinc-100 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('mesas')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'mesas'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
            }`}
          >
            <Utensils size={13} />
            <span>Mapa de Mesas</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'mesas' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200/80 text-zinc-700'
              }`}
            >
              {filteredTables.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comandas')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'comandas'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
            }`}
          >
            <Receipt size={13} />
            <span>Comandas en Curso</span>
            {pendingKitchenCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-extrabold bg-rose-500 text-white">
                {pendingKitchenCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('delivery')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'delivery'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
            }`}
          >
            <Bike size={13} />
            <span>Deliveries Activos</span>
            {deliveryTabs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-extrabold bg-sky-500 text-white">
                {deliveryTabs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'config'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
            }`}
          >
            <Users size={13} />
            <span>Meseros y Salón</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'config' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200/80 text-zinc-700'
              }`}
            >
              {(restaurantState.waiters || []).length}
            </span>
          </button>

          {/* SELECTOR RÁPIDO DE COMANDERA */}
          {printersList.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200/80 px-2.5 py-1 rounded-lg border border-zinc-200 text-xs">
              <Printer size={13} className="text-zinc-700 shrink-0" />
              <span className="font-semibold text-zinc-600 hidden sm:inline">Comandera:</span>
              <select
                value={activeComandaPrinter}
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveComandaPrinter(val);
                  localStorage.setItem('pos_comanda_printer', val);
                  showToast(`Comandera configurada: ${val}`, 'info');
                }}
                className="bg-transparent font-bold text-zinc-900 border-none outline-none cursor-pointer max-w-[150px] sm:max-w-[200px] truncate text-xs"
                title="Selecciona la impresora térmica para comandas de cocina"
              >
                {printersList.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} {p.isDefault ? '(Predeterminada)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="p-6 max-w-7xl w-full mx-auto">
        {/* TAB 1: MAPA DE MESAS */}
        {activeTab === 'mesas' && (
          <div className="space-y-4">
            {/* Filtro de Zonas */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {zones.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setSelectedZone(z)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                    selectedZone === z
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                      : 'bg-white text-zinc-600 border-zinc-200/80 hover:bg-zinc-100'
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>

            {/* Cuadrícula de Mesas estilo Notion */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredTables.map((table) => {
                const order = (restaurantState.activeOrders || []).find((o) => o.tableId === table.id);
                const totalUSD = order
                  ? order.rounds.reduce(
                      (acc, r) => acc + r.items.reduce((sum, i) => sum + i.priceUSD * i.quantity, 0),
                      0
                    )
                  : 0;

                const isOccupied = table.status === 'ocupada';
                const isBillRequested = table.status === 'cuenta';

                return (
                  <div
                    key={table.id}
                    onClick={() => setSelectedTable({ table, order })}
                    className={`bg-white rounded-2xl border p-4 shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col justify-between min-h-[155px] group ${
                      isBillRequested
                        ? 'border-sky-300 ring-2 ring-sky-100/80'
                        : isOccupied
                        ? 'border-amber-300 ring-2 ring-amber-50'
                        : 'border-zinc-200/80 hover:border-zinc-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-extrabold text-sm text-zinc-950 tracking-tight">
                            {table.name}
                          </h3>
                          <span className="text-[11px] text-zinc-500 font-medium">
                            Zona: {table.zone || 'Salón'}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 border ${
                            isBillRequested
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : isOccupied
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isBillRequested ? 'Pide Cuenta' : isOccupied ? 'Ocupada' : 'Libre'}
                        </span>
                      </div>

                      <div className="my-3 py-2.5 px-3 rounded-xl bg-zinc-50 border border-zinc-100 text-xs">
                        {order ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-zinc-500">
                              <span>
                                Mozo: <strong className="text-zinc-800">{order.waiterName}</strong>
                              </span>
                              <span className="font-mono text-[10px] text-zinc-400">
                                {order.rounds?.length || 1} ronda(s)
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between pt-1">
                              <span className="text-[11px] text-zinc-500 font-medium">Total mesa</span>
                              <span className="font-extrabold text-sm text-zinc-950 font-mono">
                                ${totalUSD.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-right text-[10px] text-zinc-400 font-mono">
                              Bs. {(totalUSD * exchangeRate).toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <div className="py-2 text-center text-[11px] text-zinc-400 font-medium">
                            Disponible para comensales
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] font-semibold text-zinc-500 group-hover:text-zinc-900 transition-colors">
                      <span>{order ? 'Ver rondas y cobrar' : 'Opciones de mesa'}</span>
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: COMANDAS EN CURSO (COCINA / DESPACHO) */}
        {activeTab === 'comandas' && (
          <div>
            {activeRounds.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200/80 p-12 text-center shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-sm font-bold text-zinc-950">¡Cocina al día!</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  No hay comandas pendientes por despachar en este momento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeRounds.map((rnd) => {
                  const isReady = rnd.status === 'lista';
                  const elapsedMin = Math.round((Date.now() - new Date(rnd.sentAt).getTime()) / 60000);

                  return (
                    <div
                      key={rnd.id}
                      className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                        isReady
                          ? 'border-emerald-300 ring-2 ring-emerald-50'
                          : elapsedMin > 15
                          ? 'border-rose-300 ring-2 ring-rose-50'
                          : 'border-zinc-200/80'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-extrabold text-base text-zinc-950 tracking-tight">
                            {rnd.tableName}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                              isReady
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : elapsedMin > 15
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                            }`}
                          >
                            {isReady ? 'Lista para servir' : `Hace ${elapsedMin} min`}
                          </span>
                        </div>

                        <div className="text-xs text-zinc-500 mb-3">
                          Mesero: <strong className="text-zinc-800">{rnd.waiterName}</strong> ·{' '}
                          <span className="font-mono">
                            {new Date(rnd.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Lista de Platos de la Ronda */}
                        <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-3 space-y-2">
                          {rnd.items.map((item, idx) => (
                            <div key={idx} className="text-xs text-zinc-800">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-extrabold text-zinc-950 bg-white px-1.5 py-0.5 rounded border border-zinc-200 text-[11px]">
                                  {item.quantity}x
                                </span>
                                <span className="font-semibold">{item.name}</span>
                              </div>
                              {item.note && (
                                <div className="text-[11px] text-amber-700 bg-amber-50/80 border border-amber-200/60 rounded-lg px-2 py-1 mt-1 font-medium">
                                  Nota: {item.note}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-100 space-y-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handlePrintComandaDirect({
                                round: rnd,
                                tableName: rnd.tableName || 'Mesa',
                                waiterName: rnd.waiterName || 'Mesero',
                                orderId: rnd.orderId || rnd.id || ''
                              })
                            }
                            className="flex-1 py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                            title="Enviar directo a la impresora térmica y abrir vista previa"
                          >
                            <Printer size={14} />
                            <span>Imprimir (58mm)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedComandaPrint({
                                round: rnd,
                                tableName: rnd.tableName || 'Mesa',
                                waiterName: rnd.waiterName || 'Mesero',
                                orderId: rnd.orderId || rnd.id || '',
                                autoPrint: false
                              })
                            }
                            className="py-2 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                            title="Ver vista previa de la comanda"
                          >
                            <Receipt size={14} />
                            <span>Ver Ticket</span>
                          </button>
                        </div>

                        {!isReady ? (
                          <button
                            type="button"
                            onClick={() => handleMarkRoundReady(rnd.id)}
                            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Check size={15} />
                            <span>Marcar Listo (Avisar a Mesero)</span>
                          </button>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="text-center text-[11px] text-emerald-700 font-bold bg-emerald-50 py-1 rounded-lg border border-emerald-200">
                              🔔 Plato notificado a tablet del mesero
                            </div>
                            <button
                              type="button"
                              onClick={() => handleMarkRoundServed(rnd.id)}
                              className="w-full py-2 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Check size={14} />
                              <span>Marcar como Servido en Mesa</span>
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

        {/* TAB 3: DELIVERIES ACTIVOS */}
        {activeTab === 'delivery' && (
          <div>
            {deliveryTabs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200/80 p-12 text-center shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mx-auto mb-3">
                  <Bike size={24} />
                </div>
                <h3 className="text-sm font-bold text-zinc-950">
                  No hay pedidos de Delivery activos en este momento
                </h3>
                <p className="text-xs text-zinc-500 mt-1 mb-4">
                  Los pedidos a domicilio registrados desde el POS aparecerán aquí para control de cocina, despacho y cobro.
                </p>
                <button
                  type="button"
                  onClick={goToPos}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  <Plus size={15} />
                  <span>Crear Pedido de Delivery en POS</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deliveryTabs.map((tab) => {
                  const elapsedMin = Math.round(
                    (Date.now() - new Date(tab.createdAt || Date.now()).getTime()) / 60000
                  );
                  const itemsSub = (tab.items || []).reduce(
                    (s, i) => s + Number(i.priceUSD || i.price || 0) * (i.quantity || 1),
                    0
                  );
                  const delFee = parseFloat(tab.deliveryInfo?.deliveryFee) || 0;
                  const totalUSD = itemsSub + delFee;
                  const totalBs = totalUSD * exchangeRate;
                  const isCocina = tab.status === 'cocina';
                  const isCamino = tab.status === 'en_camino';

                  return (
                    <div
                      key={tab.id}
                      className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                  isCocina
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : isCamino
                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {isCocina
                                  ? 'En Preparación'
                                  : isCamino
                                  ? 'En Camino'
                                  : 'Por Cobrar'}
                              </span>
                              <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                                <Clock size={11} />
                                {elapsedMin <= 1 ? 'Hace un momento' : `Hace ${elapsedMin} min`}
                              </span>
                            </div>
                            <h3 className="text-sm font-extrabold text-zinc-950 mt-2">
                              {tab.name}
                            </h3>
                          </div>

                          <select
                            value={tab.status || 'cocina'}
                            onChange={(e) =>
                              updateOpenTabStatus && updateOpenTabStatus(tab.id, e.target.value)
                            }
                            className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-[11px] font-bold text-zinc-700 focus:outline-none focus:border-zinc-900 cursor-pointer"
                          >
                            <option value="cocina">En Preparación</option>
                            <option value="en_camino">En Camino</option>
                            <option value="por_cobrar">Por Cobrar</option>
                          </select>
                        </div>

                        {tab.deliveryInfo && (
                          <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 mb-3 text-xs space-y-1.5">
                            {tab.deliveryInfo.address && (
                              <div className="flex items-start gap-1.5 text-zinc-800 font-semibold">
                                <MapPin size={14} className="text-sky-600 shrink-0 mt-0.5" />
                                <span>{tab.deliveryInfo.address}</span>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-3 text-[11px] text-zinc-500">
                              {tab.deliveryInfo.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={11} /> {tab.deliveryInfo.phone}
                                </span>
                              )}
                              {tab.deliveryInfo.courier && (
                                <span className="flex items-center gap-1">
                                  <Bike size={11} /> Repartidor:{' '}
                                  <strong className="text-zinc-800">{tab.deliveryInfo.courier}</strong>
                                </span>
                              )}
                              {delFee > 0 && (
                                <span>
                                  Flete: <strong className="font-mono text-zinc-800">${delFee.toFixed(2)}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="bg-zinc-50/70 border border-zinc-100 rounded-xl p-3 mb-3 space-y-1.5">
                          {(tab.items || []).map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-zinc-800">
                                <strong className="font-mono text-zinc-950">{item.quantity}x</strong>{' '}
                                {item.name}
                              </span>
                              <span className="font-mono font-bold text-zinc-700">
                                ${(Number(item.priceUSD || item.price || 0) * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-100">
                        <div className="flex items-baseline justify-between mb-3">
                          <div>
                            <div className="text-[11px] text-zinc-500">Total a Cobrar</div>
                            <div className="text-xs font-mono font-bold text-emerald-700">
                              Bs. {totalBs.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-lg font-extrabold font-mono text-zinc-950">
                            ${totalUSD.toFixed(2)}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleChargeDeliveryInPOS(tab)}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                          >
                            <ShoppingCart size={14} className="text-emerald-400" />
                            <span>Cobrar en Caja</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintDeliveryPreBill(tab)}
                            title="Imprimir ticket de delivery"
                            className="p-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 cursor-pointer transition-colors"
                          >
                            <Printer size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `¿Seguro que deseas descartar el delivery "${tab.name}"?`
                                )
                              ) {
                                deleteOpenTab && deleteOpenTab(tab.id);
                              }
                            }}
                            title="Cancelar pedido"
                            className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer transition-colors"
                          >
                            <Trash2 size={15} />
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

        {/* TAB 4: MESEROS Y SALÓN (CONFIGURACIÓN ESTILO NOTION) */}
        {activeTab === 'config' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tarjeta 1: Meseros Activos y PINs para Tablets */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-2xs flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-zinc-100 text-zinc-800">
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">
                      Meseros Activos (Acceso Tablets QR)
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Crea cuentas y códigos PIN de 4 dígitos para el ingreso de meseros en tablets
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {(restaurantState.waiters || []).length} registrados
                </span>
              </div>

              <form onSubmit={handleAddWaiter} className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  required
                  type="text"
                  placeholder="Nombre del mesero (ej. Carlos Mendoza)..."
                  value={newWaiter.name}
                  onChange={(e) => setNewWaiter({ ...newWaiter, name: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
                <div className="flex gap-2">
                  <input
                    required
                    type="text"
                    maxLength="4"
                    placeholder="PIN (4 dígitos)"
                    value={newWaiter.pin}
                    onChange={(e) =>
                      setNewWaiter({ ...newWaiter, pin: e.target.value.replace(/\D/g, '') })
                    }
                    className="w-32 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-2xs"
                  >
                    <Plus size={14} />
                    <span>Añadir</span>
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {(restaurantState.waiters || []).length === 0 ? (
                  <div className="text-center text-zinc-400 py-8 text-xs border border-dashed border-zinc-200 rounded-xl">
                    No hay meseros registrados todavía.
                  </div>
                ) : (
                  (restaurantState.waiters || []).map((w) => (
                    <div
                      key={w.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        w.active === false
                          ? 'bg-zinc-50 border-zinc-200/60 opacity-70'
                          : 'bg-zinc-50/70 hover:bg-zinc-50 border-zinc-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-xs ${
                            w.active === false
                              ? 'bg-zinc-200 text-zinc-500'
                              : 'bg-zinc-900 text-white'
                          }`}
                        >
                          {w.name ? w.name.charAt(0).toUpperCase() : 'M'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-950">{w.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-600 bg-white px-2 py-0.2 rounded-md border border-zinc-200">
                              <KeyRound size={10} className="text-zinc-400" />
                              PIN: <strong>{w.pin || '****'}</strong>
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                                w.active === false
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {w.active === false ? 'Inactivo' : 'Activo'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title="Editar mesero"
                          onClick={() => setEditingWaiter({ ...w, pin: w.pin || '' })}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit2 size={12} />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          title="Eliminar mesero"
                          onClick={() => handleDeleteWaiter(w)}
                          className="p-1.5 rounded-lg bg-white hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 text-zinc-400 hover:text-rose-600 cursor-pointer transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tarjeta 2: Mesas y Áreas del Salón */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-2xs flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-zinc-100 text-zinc-800">
                    <Utensils size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">Mesas y Áreas del Salón</h3>
                    <p className="text-[11px] text-zinc-500">
                      Configura las mesas y zonas disponibles en el plano del restaurante
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {(restaurantState.tables || []).length} mesas
                </span>
              </div>

              <form onSubmit={handleAddTable} className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  required
                  type="text"
                  placeholder="Ej: Mesa 7, Barra 2, Terraza 3..."
                  value={newTable.name}
                  onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
                <div className="flex gap-2">
                  <select
                    value={newTable.zone}
                    onChange={(e) => setNewTable({ ...newTable, zone: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white text-xs font-semibold text-zinc-800 focus:outline-none focus:border-zinc-900 cursor-pointer"
                  >
                    <option value="Salón">Salón</option>
                    <option value="Terraza">Terraza</option>
                    <option value="Barra">Barra</option>
                    <option value="VIP">VIP</option>
                    <option value="Delivery">Delivery / Llevar</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-2xs"
                  >
                    <Plus size={14} />
                    <span>Añadir</span>
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(restaurantState.tables || []).map((t) => {
                  const isOccupied = t.status === 'ocupada' || t.status === 'cuenta';
                  return (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-zinc-50/70 border border-zinc-200/80 flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-extrabold text-zinc-950">{t.name}</div>
                          <div className="text-[11px] text-zinc-500">{t.zone}</div>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded-full border ${
                            isOccupied
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {t.status || 'libre'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-200/60">
                        <button
                          type="button"
                          onClick={() => setEditingTable({ ...t })}
                          className="flex-1 py-1 px-2 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit2 size={11} />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          disabled={isOccupied}
                          title={
                            isOccupied
                              ? 'No se puede eliminar una mesa ocupada'
                              : 'Eliminar mesa'
                          }
                          onClick={() => handleDeleteTable(t)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isOccupied
                              ? 'bg-zinc-100 border-zinc-200 text-zinc-300 cursor-not-allowed'
                              : 'bg-white hover:bg-rose-50 border-zinc-200 hover:border-rose-200 text-zinc-400 hover:text-rose-600 cursor-pointer'
                          }`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PANEL LATERAL (DRAWER ESTILO NOTION) DE DETALLE DE MESA */}
      {selectedTable &&
        (() => {
          const currentTable =
            (restaurantState.tables || []).find((t) => t.id === selectedTable.table.id) ||
            selectedTable.table;
          const currentOrder =
            (restaurantState.activeOrders || []).find((o) => o.tableId === currentTable.id) ||
            selectedTable.order;
          const isBillRequested = currentTable.status === 'cuenta';
          const isOccupied = currentTable.status === 'ocupada';

          return (
            <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-xs flex justify-end">
              <div className="bg-white w-full max-w-md h-full border-l border-zinc-200 shadow-2xl flex flex-col justify-between p-6">
                {/* Cabecera del Drawer */}
                <div className="flex items-start justify-between pb-4 border-b border-zinc-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-extrabold text-zinc-950 tracking-tight">
                        {currentTable.name}
                      </h2>
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                          isBillRequested
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : isOccupied
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isBillRequested ? 'Pide Cuenta' : isOccupied ? 'En Consumo' : 'Libre'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">Zona: {currentTable.zone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTable(null)}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 cursor-pointer transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Lista de Rondas y Consumos */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3">
                  {!currentOrder || !currentOrder.rounds || currentOrder.rounds.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mb-3">
                        <ShoppingCart size={22} />
                      </div>
                      <p className="text-xs font-bold text-zinc-800">
                        Mesa libre sin pedidos activos
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-1 mb-4">
                        Los pedidos enviados por los meseros desde sus tablets aparecerán aquí por rondas.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTable(null);
                            goToPos();
                          }}
                          className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        >
                          <ShoppingCart size={14} className="text-emerald-400" />
                          <span>Ir al Punto de Venta (POS)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTable({ ...currentTable });
                            setSelectedTable(null);
                          }}
                          className="px-3 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit2 size={13} />
                          <span>Editar Mesa</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200/60 text-xs">
                        <span className="text-zinc-500">
                          Atendido por:{' '}
                          <strong className="text-zinc-900">
                            {currentOrder.waiterName || 'Mesero'}
                          </strong>
                        </span>
                        <span className="font-mono text-[11px] text-zinc-500">
                          {currentOrder.rounds.length} ronda(s)
                        </span>
                      </div>

                      {currentOrder.rounds.map((rnd, rIdx) => (
                        <div
                          key={rnd.id}
                          className="bg-zinc-50/80 rounded-xl p-3.5 border border-zinc-200/80 space-y-2"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 pb-2 border-b border-zinc-200/60">
                            <span>
                              Ronda #{rIdx + 1} ·{' '}
                              {new Date(rnd.sentAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handlePrintComandaDirect({
                                  round: { ...rnd, roundNumber: rnd.roundNumber || rIdx + 1 },
                                  tableName: currentTable.name || 'Mesa',
                                  waiterName: currentOrder.waiterName || 'Mesero',
                                  orderId: currentOrder.id || rnd.id || ''
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="Ver e imprimir comanda de esta ronda en 58mm"
                            >
                              <Printer size={11} />
                              <span>Comanda</span>
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            {rnd.items.map((i, iIdx) => (
                              <div
                                key={iIdx}
                                className="flex items-baseline justify-between text-xs"
                              >
                                <span className="text-zinc-800">
                                  <strong className="font-mono text-zinc-950">{i.quantity}x</strong>{' '}
                                  {i.name}
                                </span>
                                <span className="font-mono font-bold text-zinc-900">
                                  ${(i.priceUSD * i.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Acciones Inferiores del Drawer */}
                {currentOrder && currentOrder.rounds && currentOrder.rounds.length > 0 && (
                  <div className="pt-4 border-t border-zinc-200 space-y-3">
                    {(() => {
                      const total = currentOrder.rounds.reduce(
                        (acc, r) => acc + r.items.reduce((s, i) => s + i.priceUSD * i.quantity, 0),
                        0
                      );
                      return (
                        <div className="flex items-baseline justify-between bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                          <div>
                            <div className="text-xs font-bold text-zinc-700">Total de la Mesa</div>
                            <div className="text-[11px] font-mono text-zinc-500">
                              Bs. {(total * exchangeRate).toFixed(2)}
                            </div>
                          </div>
                          <div className="text-xl font-extrabold font-mono text-zinc-950">
                            ${total.toFixed(2)}
                          </div>
                        </div>
                      );
                    })()}

                    {!isBillRequested ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => handleChargeInPOS(currentTable, currentOrder)}
                          className="w-full py-3 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                        >
                          <ShoppingCart size={15} className="text-emerald-400" />
                          <span>COBRAR EN CAJA (POS) &rarr;</span>
                        </button>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleRequestBill(currentTable)}
                            className="flex-1 py-2 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Clock size={13} />
                            <span>Marcar &ldquo;Pide Cuenta&rdquo;</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintPreBill(currentTable, currentOrder)}
                            className="py-2 px-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Printer size={13} />
                            <span>Pre-Cuenta</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 text-xs">
                          <span className="font-bold text-sky-900 flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-sky-600" />
                            Cuenta solicitada (Lista para cobro)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleReopenTable(currentTable.id)}
                            className="px-2 py-1 rounded-lg bg-white hover:bg-zinc-50 border border-sky-200 text-zinc-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw size={11} />
                            <span>Reabrir</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleChargeInPOS(currentTable, currentOrder)}
                          className="w-full py-3 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                        >
                          <ShoppingCart size={15} className="text-emerald-400" />
                          <span>COBRAR EN CAJA (POS) &rarr;</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintPreBill(currentTable, currentOrder)}
                          className="w-full py-2 px-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Printer size={13} />
                          <span>Ver Ticket Pre-Cuenta</span>
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleFreeTable(currentTable.id)}
                      className="w-full py-1.5 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      Liberar / Cancelar Mesa
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {/* MODAL EDITAR MESERO ESTILO NOTION */}
      {editingWaiter && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-800">
                  <Users size={16} />
                </span>
                <h3 className="font-bold text-sm text-zinc-950">Editar Mesero</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingWaiter(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateWaiter} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Nombre del Mesero
                </label>
                <input
                  required
                  type="text"
                  value={editingWaiter.name}
                  onChange={(e) => setEditingWaiter({ ...editingWaiter, name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  PIN de Acceso (4 dígitos)
                </label>
                <input
                  required
                  type="text"
                  maxLength="4"
                  pattern="[0-9]{4}"
                  value={editingWaiter.pin}
                  onChange={(e) =>
                    setEditingWaiter({
                      ...editingWaiter,
                      pin: e.target.value.replace(/\D/g, '')
                    })
                  }
                  placeholder="Ej: 1234"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-mono font-bold tracking-widest focus:outline-none focus:border-zinc-900"
                />
              </div>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingWaiter.active !== false}
                  onChange={(e) =>
                    setEditingWaiter({ ...editingWaiter, active: e.target.checked })
                  }
                  className="w-4 h-4 rounded accent-zinc-950 cursor-pointer"
                />
                <span className="text-xs font-semibold text-zinc-800">
                  Mesero activo (permite iniciar sesión en tablet)
                </span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingWaiter(null)}
                  className="flex-1 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR MESA ESTILO NOTION */}
      {editingTable && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-800">
                  <Utensils size={16} />
                </span>
                <h3 className="font-bold text-sm text-zinc-950">Editar Mesa / Área</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTable(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateTable} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Nombre de la Mesa
                </label>
                <input
                  required
                  type="text"
                  value={editingTable.name}
                  onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Zona o Área
                </label>
                <select
                  value={editingTable.zone}
                  onChange={(e) => setEditingTable({ ...editingTable, zone: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-zinc-900"
                >
                  <option value="Salón">Salón</option>
                  <option value="Terraza">Terraza</option>
                  <option value="Barra">Barra</option>
                  <option value="VIP">VIP</option>
                  <option value="Delivery">Delivery / Llevar</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="flex-1 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs cursor-pointer"
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
        <InvoicePreview invoice={preBillInvoice} onClose={() => setPreBillInvoice(null)} />
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
      {showQRModal && <QRConnectModal onClose={() => setShowQRModal(false)} />}

      {/* Toast Notification estilo Notion */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl border shadow-lg flex items-center gap-2 text-xs font-bold ${
            toast.type === 'success'
              ? 'bg-zinc-950 text-white border-zinc-800'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={15} className="text-emerald-400" />
          ) : (
            <AlertCircle size={15} />
          )}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
