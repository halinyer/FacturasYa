import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Utensils,
  Plus,
  Users,
  Clock,
  CheckCircle2,
  DollarSign,
  Coffee,
  X,
  CreditCard,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  QrCode,
  Edit2,
  Trash2,
  Printer,
  Smartphone,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useData } from '../../pos-core/contexts/DataContext';
import QRConnectModal from '../../pos-core/components/QRConnectModal';
import { printIsolatedTicket } from '../../pos-core/utils/printIsolatedTicket';

const INITIAL_LOCAL_TABLES = [
  { id: "t-1", name: "Mesa 1", zone: "Salón", capacity: 4, status: "free", openedAt: null, waiter: null, items: [] },
  { id: "t-2", name: "Mesa 2", zone: "Salón", capacity: 4, status: "free", openedAt: null, waiter: null, items: [] },
  { id: "t-3", name: "Mesa 3", zone: "Salón", capacity: 4, status: "free", openedAt: null, waiter: null, items: [] },
  { id: "t-4", name: "Mesa 4", zone: "Salón", capacity: 6, status: "free", openedAt: null, waiter: null, items: [] },
  { id: "t-5", name: "Terraza 1", zone: "Terraza", capacity: 4, status: "free", openedAt: null, waiter: null, items: [] },
  { id: "t-6", name: "Terraza 2", zone: "Terraza", capacity: 4, status: "free", openedAt: null, waiter: null, items: [] },
  { id: "t-7", name: "Barra 1", zone: "Barra", capacity: 2, status: "free", openedAt: null, waiter: null, items: [] },
  { id: "t-8", name: "Barra 2", zone: "Barra", capacity: 2, status: "free", openedAt: null, waiter: null, items: [] }
];

export default function TablesView({ onGoToPos }) {
  const data = useData();
  const exchangeRate = Number(data?.exchangeRate) || 876.80;

  // Estado de mesas (Persistido localmente con sincronización al servidor local de tablets port 3001)
  const [tables, setTables] = useState(() => {
    try {
      const saved = localStorage.getItem('facturasya_restaurant_tables');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_LOCAL_TABLES;
  });

  const [selectedZone, setSelectedZone] = useState('Todas');
  const [activeTableModal, setActiveTableModal] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTableData, setNewTableData] = useState({ name: '', zone: 'Salón', capacity: 4 });

  // Guardar en localStorage ante cambios
  useEffect(() => {
    try {
      localStorage.setItem('facturasya_restaurant_tables', JSON.stringify(tables));
    } catch (e) {}
  }, [tables]);

  // Conexión y sincronización en tiempo real con servidor de tablets (Port 3001)
  const syncWithServer = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/restaurant/state');
      if (res.ok) {
        const serverData = await res.json();
        if (serverData?.tables && Array.isArray(serverData.tables) && serverData.tables.length > 0) {
          setTables((prev) => {
            // Combinar estado del servidor local con las mesas
            return serverData.tables.map((st) => {
              const existing = prev.find((t) => t.id === st.id || t.name === st.name);
              const activeOrder = serverData.activeOrders?.find((o) => o.tableId === st.id);
              let serverItems = [];
              if (activeOrder && activeOrder.rounds) {
                activeOrder.rounds.forEach((r) => {
                  if (r.items) serverItems.push(...r.items);
                });
              }
              return {
                id: st.id || existing?.id || `tbl-${Date.now()}`,
                name: st.name || existing?.name,
                zone: st.zone || existing?.zone || 'Salón',
                capacity: st.capacity || existing?.capacity || 4,
                status: st.status || (serverItems.length > 0 ? 'occupied' : 'free'),
                openedAt: existing?.openedAt || (serverItems.length > 0 ? 'En curso' : null),
                waiter: activeOrder?.waiterName || existing?.waiter || null,
                items: serverItems.length > 0 ? serverItems : (existing?.items || [])
              };
            });
          });
        }
      }
    } catch (e) {
      // Servidor local no levantado (modo standalone)
    }
  }, []);

  useEffect(() => {
    syncWithServer();
    let socket;
    try {
      socket = io('http://localhost:3001', { reconnectionDelay: 1000, timeout: 2000 });
      socket.on('restaurante:sync', () => syncWithServer());
      socket.on('comanda:nueva', () => syncWithServer());
      socket.on('mesas:actualizadas', () => syncWithServer());
    } catch (e) {}
    const interval = setInterval(syncWithServer, 6000);
    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, [syncWithServer]);

  // Zonas disponibles
  const zones = useMemo(() => {
    const set = new Set(['Todas']);
    tables.forEach((t) => {
      if (t.zone) set.add(t.zone);
    });
    return Array.from(set);
  }, [tables]);

  const filteredTables = useMemo(() => {
    if (selectedZone === 'Todas') return tables;
    return tables.filter((t) => t.zone === selectedZone);
  }, [tables, selectedZone]);

  // Estadísticas del salón
  const stats = useMemo(() => {
    const total = tables.length;
    const occupied = tables.filter((t) => t.status === 'occupied').length;
    const bill = tables.filter((t) => t.status === 'bill_requested').length;
    const free = tables.filter((t) => t.status === 'free').length;
    const totalUsd = tables.reduce((acc, t) => {
      const items = t.items || [];
      const sub = items.reduce((s, i) => s + (Number(i.priceUSD || i.price || 0) * (i.quantity || i.qty || 1)), 0);
      return acc + sub;
    }, 0);
    return { total, occupied, bill, free, totalUsd };
  }, [tables]);

  // ACCIÓN PRINCIPAL: Enviar orden de la mesa directamente al Punto de Venta (POS)
  const handleSendToPos = (table) => {
    const rawItems = table.items || [];
    if (rawItems.length === 0) {
      alert(`La ${table.name} no tiene consumos registrados.`);
      return;
    }

    const consolidatedItems = rawItems.map((item) => ({
      id: item.id || item.productId || `pos-${Date.now()}-${Math.random()}`,
      name: item.name,
      price: Number(item.priceUSD || item.price || 0),
      priceUSD: Number(item.priceUSD || item.price || 0),
      priceUsd: Number(item.priceUSD || item.price || 0),
      qty: Number(item.quantity || item.qty || 1),
      quantity: Number(item.quantity || item.qty || 1),
      note: item.note || ''
    }));

    // Transferir datos por sessionStorage para ser leídos de inmediato por WebPosView
    sessionStorage.setItem(
      'pos_incoming_table_order',
      JSON.stringify({
        tableId: table.id,
        tableName: table.name,
        waiterName: table.waiter || 'Mesero',
        items: consolidatedItems,
        orderType: 'salon'
      })
    );

    // Cambiar a la vista de POS
    if (onGoToPos) {
      onGoToPos();
    }
  };

  // Impresión de Pre-Cuenta / Nota de Consumo para la mesa
  const handlePrintPreCuenta = (table) => {
    const rawItems = table.items || [];
    if (rawItems.length === 0) {
      alert('Esta mesa no tiene consumos registrados para imprimir.');
      return;
    }

    const subtotalUsd = rawItems.reduce((acc, i) => acc + (Number(i.priceUSD || i.price || 0) * (i.quantity || i.qty || 1)), 0);
    const subtotalBs = subtotalUsd * exchangeRate;

    const ticketData = {
      orderId: `PRE-${table.name.replace(/\s+/g, '')}`,
      orderType: 'salon',
      tableName: table.name,
      waiter: table.waiter || 'Mesero',
      items: rawItems.map((i) => ({
        name: i.name,
        priceUSD: Number(i.priceUSD || i.price || 0),
        quantity: Number(i.quantity || i.qty || 1),
        note: i.note || ''
      })),
      totalUSD: subtotalUsd,
      totalBs: subtotalBs,
      exchangeRate: exchangeRate,
      dateFormatted: new Date().toLocaleDateString('es-VE'),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    printIsolatedTicket(ticketData, { is58mm: false });
  };

  // Agregar nueva mesa
  const handleAddTable = (e) => {
    e.preventDefault();
    if (!newTableData.name.trim()) return;

    const newT = {
      id: `tbl-${Date.now()}`,
      name: newTableData.name.trim(),
      zone: newTableData.zone || 'Salón',
      capacity: parseInt(newTableData.capacity, 10) || 4,
      status: 'free',
      openedAt: null,
      waiter: null,
      items: []
    };

    setTables((prev) => [...prev, newT]);
    setIsAddModalOpen(false);
    setNewTableData({ name: '', zone: 'Salón', capacity: 4 });
  };

  // Editar mesa
  const handleSaveEditTable = (e) => {
    e.preventDefault();
    if (!editingTable || !editingTable.name.trim()) return;

    setTables((prev) =>
      prev.map((t) => (t.id === editingTable.id ? { ...t, name: editingTable.name, zone: editingTable.zone, capacity: parseInt(editingTable.capacity, 10) || 4 } : t))
    );
    setIsEditModalOpen(false);
    setEditingTable(null);
  };

  // Eliminar mesa
  const handleDeleteTable = (tableId) => {
    const target = tables.find((t) => t.id === tableId);
    if (target && target.status !== 'free') {
      alert('No puedes eliminar una mesa que se encuentra ocupada o con consumos.');
      return;
    }
    if (!window.confirm('¿Seguro que deseas eliminar esta mesa del plano del restaurante?')) {
      return;
    }
    setTables((prev) => prev.filter((t) => t.id !== tableId));
    setActiveTableModal(null);
  };

  // Liberar mesa manualmente
  const handleFreeTable = (tableId) => {
    if (!window.confirm('¿Deseas marcar esta mesa como Libre?')) return;
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status: 'free', openedAt: null, waiter: null, items: [] } : t))
    );
    setActiveTableModal(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-y-auto">
      {/* HEADER PRINCIPAL ESTILO NOTION */}
      <div className="bg-white border-b border-zinc-200/80 px-6 py-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
                <Utensils size={18} />
              </span>
              <h1 className="text-xl font-bold text-zinc-950 tracking-tight">Mesas & Salón</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {stats.occupied} Ocupadas · {stats.free} Libres
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Control de salas, pedidos de mozos en tablets y facturación directa en caja
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* BOTÓN CONECTAR TABLETS / MOZOS (QR CODE) */}
            <button
              type="button"
              onClick={() => setShowQRModal(true)}
              className="px-3.5 py-2 rounded-xl bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200/80 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
              title="Vincular celulares o tablets de los meseros vía WiFi"
            >
              <QrCode size={15} className="text-sky-600" />
              <span>Conectar Tablets / Mozos</span>
            </button>

            {/* BOTÓN NUEVA MESA */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus size={15} />
              <span>Nueva Mesa</span>
            </button>
          </div>
        </div>

        {/* BARRA DE ZONAS Y FILTROS */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-100 overflow-x-auto">
          {zones.map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={() => setSelectedZone(zone)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedZone === zone
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      </div>

      {/* CUADRÍCULA DE MESAS */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            const isFree = table.status === 'free';
            const isBill = table.status === 'bill_requested';
            const isOccupied = table.status === 'occupied';

            const items = table.items || [];
            const tableTotalUsd = items.reduce(
              (acc, i) => acc + (Number(i.priceUSD || i.price || 0) * (i.quantity || i.qty || 1)),
              0
            );
            const tableTotalBs = tableTotalUsd * exchangeRate;

            return (
              <div
                key={table.id}
                className={`bg-white rounded-2xl border transition-all duration-150 flex flex-col justify-between p-4 shadow-xs hover:shadow-md ${
                  isBill
                    ? 'border-sky-300 ring-2 ring-sky-100'
                    : isOccupied
                    ? 'border-amber-300 ring-2 ring-amber-50'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div>
                  {/* CABECERA DE LA TARJETA */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-sm text-zinc-950 flex items-center gap-1.5">
                        <span>{table.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTable({ ...table });
                            setIsEditModalOpen(true);
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                          title="Editar mesa"
                        >
                          <Edit2 size={12} />
                        </button>
                      </h3>
                      <span className="text-[11px] text-zinc-500 font-medium">
                        {table.zone} · {table.capacity} personas
                      </span>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isFree
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isBill
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isFree ? 'Libre' : isBill ? 'Pide Cuenta' : 'Ocupada'}
                    </span>
                  </div>

                  {/* INFORMACIÓN DE CONSUMO O ESTADO */}
                  <div className="my-3 py-2 px-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-xs space-y-1">
                    {isFree ? (
                      <span className="text-zinc-400 italic block text-center py-2 text-[11px]">
                        Mesa disponible para comensales
                      </span>
                    ) : (
                      <>
                        <div className="flex justify-between text-[11px] text-zinc-500">
                          <span>Mozo: <strong>{table.waiter || 'General'}</strong></span>
                          <span>{table.openedAt || '12:00 PM'}</span>
                        </div>
                        <div className="flex justify-between items-baseline pt-1">
                          <span className="text-zinc-600 font-semibold">{items.length} productos</span>
                          <span className="font-extrabold text-sm text-zinc-950 font-mono">
                            ${tableTotalUsd.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-right text-[10px] text-zinc-400 font-mono">
                          Bs. {tableTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN RÁPIDA */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                  {!isFree ? (
                    <>
                      {/* BOTÓN COBRAR EN POS (TRANSFIERE DIRECTO AL CARRITO) */}
                      <button
                        type="button"
                        onClick={() => handleSendToPos(table)}
                        className="w-full py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        title="Enviar consumos directamente al Punto de Venta para cobrar"
                      >
                        <CreditCard size={14} className="text-emerald-400" />
                        <span>Cobrar en POS (${tableTotalUsd.toFixed(2)})</span>
                      </button>

                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePrintPreCuenta(table)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          title="Imprimir nota de entrega / pre-cuenta"
                        >
                          <Printer size={12} />
                          <span>Pre-Cuenta</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFreeTable(table.id)}
                          className="py-1.5 px-2.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 text-[11px] font-semibold cursor-pointer transition-colors"
                          title="Liberar mesa"
                        >
                          Liberar
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTables((prev) =>
                            prev.map((t) => (t.id === table.id ? { ...t, status: 'occupied', openedAt: 'Ahora', waiter: 'Mesero' } : t))
                          );
                        }}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[11px] cursor-pointer text-center"
                      >
                        Abrir Mesa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTable(table.id)}
                        className="p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Eliminar mesa"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL EDITAR MESA */}
      {isEditModalOpen && editingTable && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="font-bold text-sm text-zinc-900">Editar Mesa</h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingTable(null);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditTable} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">Nombre o Número</label>
                <input
                  type="text"
                  required
                  value={editingTable.name}
                  onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">Zona / Salón</label>
                <select
                  value={editingTable.zone}
                  onChange={(e) => setEditingTable({ ...editingTable, zone: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-zinc-900"
                >
                  <option value="Salón">Salón</option>
                  <option value="Terraza">Terraza</option>
                  <option value="Barra">Barra</option>
                  <option value="VIP">VIP</option>
                  <option value="Delivery">Delivery / Para Llevar</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">Capacidad (Comensales)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={editingTable.capacity}
                  onChange={(e) => setEditingTable({ ...editingTable, capacity: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTable(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR MESA */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="font-bold text-sm text-zinc-900">Crear Nueva Mesa</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">Nombre o Número</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Mesa 10 o Terraza 5"
                  value={newTableData.name}
                  onChange={(e) => setNewTableData({ ...newTableData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">Zona / Salón</label>
                <select
                  value={newTableData.zone}
                  onChange={(e) => setNewTableData({ ...newTableData, zone: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-zinc-900"
                >
                  <option value="Salón">Salón</option>
                  <option value="Terraza">Terraza</option>
                  <option value="Barra">Barra</option>
                  <option value="VIP">VIP</option>
                  <option value="Delivery">Delivery / Para Llevar</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">Capacidad (Comensales)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newTableData.capacity}
                  onChange={(e) => setNewTableData({ ...newTableData, capacity: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs"
                >
                  Crear Mesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL QR CODE PARA MOZOS / TABLETS */}
      {showQRModal && (
        <QRConnectModal onClose={() => setShowQRModal(false)} />
      )}
    </div>
  );
}
