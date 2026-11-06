import React, { useState, useMemo } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { useData } from '../../pos-core/contexts/DataContext';

const DEFAULT_TABLES = [
  { id: 't-1', name: 'Mesa 1', zone: 'Salón Principal', capacity: 4, status: 'occupied', openedAt: '12:15 PM', waiter: 'Carlos M.', itemsCount: 3, totalUsd: 21.50 },
  { id: 't-2', name: 'Mesa 2', zone: 'Salón Principal', capacity: 2, status: 'free', openedAt: null, waiter: null, itemsCount: 0, totalUsd: 0 },
  { id: 't-3', name: 'Mesa 3', zone: 'Salón Principal', capacity: 4, status: 'bill_requested', openedAt: '11:45 AM', waiter: 'Ana R.', itemsCount: 4, totalUsd: 34.00 },
  { id: 't-4', name: 'Mesa 4', zone: 'Salón Principal', capacity: 6, status: 'free', openedAt: null, waiter: null, itemsCount: 0, totalUsd: 0 },
  { id: 't-5', name: 'Terraza 1', zone: 'Terraza', capacity: 4, status: 'occupied', openedAt: '12:30 PM', waiter: 'Carlos M.', itemsCount: 2, totalUsd: 15.00 },
  { id: 't-6', name: 'Terraza 2', zone: 'Terraza', capacity: 4, status: 'free', openedAt: null, waiter: null, itemsCount: 0, totalUsd: 0 },
  { id: 't-7', name: 'Terraza 3', zone: 'Terraza', capacity: 2, status: 'free', openedAt: null, waiter: null, itemsCount: 0, totalUsd: 0 },
  { id: 't-8', name: 'Barra 1', zone: 'Barra', capacity: 2, status: 'occupied', openedAt: '12:40 PM', waiter: 'Barman', itemsCount: 2, totalUsd: 7.00 },
  { id: 't-9', name: 'Barra 2', zone: 'Barra', capacity: 2, status: 'free', openedAt: null, waiter: null, itemsCount: 0, totalUsd: 0 },
];

export default function TablesView({ onGoToPos }) {
  const data = useData();
  const exchangeRate = Number(data?.exchangeRate) || 876.80;

  const [tables, setTables] = useState(() => {
    // Si data?.openTabs existe y tiene mesas, podríamos mapearlas
    return DEFAULT_TABLES;
  });

  const [selectedZone, setSelectedZone] = useState('Todas');
  const [activeTableModal, setActiveTableModal] = useState(null);
  const [openGuests, setOpenGuests] = useState(2);
  const [openWaiter, setOpenWaiter] = useState('Mesero 1');

  const zones = ['Todas', 'Salón Principal', 'Terraza', 'Barra'];

  const filteredTables = useMemo(() => {
    if (selectedZone === 'Todas') return tables;
    return tables.filter((t) => t.zone === selectedZone);
  }, [tables, selectedZone]);

  const stats = useMemo(() => {
    const total = tables.length;
    const occupied = tables.filter((t) => t.status === 'occupied').length;
    const bill = tables.filter((t) => t.status === 'bill_requested').length;
    const free = tables.filter((t) => t.status === 'free').length;
    const totalSalesUsd = tables.reduce((acc, t) => acc + (t.totalUsd || 0), 0);
    return { total, occupied, bill, free, totalSalesUsd };
  }, [tables]);

  const handleOpenTable = (tableId) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: 'occupied',
              openedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              waiter: openWaiter,
              itemsCount: 0,
              totalUsd: 0
            }
          : t
      )
    );
    setActiveTableModal(null);
  };

  const handleFreeTable = (tableId) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: 'free',
              openedAt: null,
              waiter: null,
              itemsCount: 0,
              totalUsd: 0
            }
          : t
      )
    );
    setActiveTableModal(null);
  };

  const handleRequestBill = (tableId) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: 'bill_requested'
            }
          : t
      )
    );
    setActiveTableModal(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-y-auto">
      {/* HEADER DE MÓDULO ESTILO NOTION */}
      <div className="bg-white border-b border-zinc-200/80 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
                <Utensils size={18} />
              </span>
              <h1 className="text-xl font-bold text-zinc-950 tracking-tight">Mesas & Salón</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                {stats.total} mesas registradas
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Control en vivo del salón, comandas activas y mesas en servicio
            </p>
          </div>

          {/* INDICADORES RÁPIDOS */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {stats.free} Libres
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {stats.occupied} Ocupadas
            </span>
            {stats.bill > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                {stats.bill} Cuenta Pedida
              </span>
            )}
          </div>
        </div>

        {/* FILTRO DE ZONAS (PILLS) */}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-zinc-100 overflow-x-auto">
          {zones.map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={() => setSelectedZone(zone)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedZone === zone
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      </div>

      {/* CUADRÍCULA DE MESAS */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            const isFree = table.status === 'free';
            const isOccupied = table.status === 'occupied';
            const isBillRequested = table.status === 'bill_requested';

            return (
              <div
                key={table.id}
                onClick={() => setActiveTableModal(table)}
                className={`relative rounded-2xl border p-4 transition-all cursor-pointer hover:shadow-md bg-white ${
                  isFree
                    ? 'border-zinc-200 hover:border-zinc-300'
                    : isOccupied
                    ? 'border-amber-200 bg-amber-50/20 hover:border-amber-300'
                    : 'border-indigo-200 bg-indigo-50/20 hover:border-indigo-300'
                }`}
              >
                {/* CABECERA DE LA TARJETA */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-zinc-950 text-base">{table.name}</h3>
                    <span className="text-[11px] text-zinc-500">{table.zone}</span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isFree
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isOccupied
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}
                  >
                    {isFree ? 'Libre' : isOccupied ? 'En Servicio' : 'Cuenta Pedida'}
                  </span>
                </div>

                {/* DETALLE DEL ESTADO */}
                {isFree ? (
                  <div className="py-6 flex flex-col items-center justify-center text-center text-zinc-400">
                    <Users size={24} className="mb-1 text-zinc-300" />
                    <p className="text-xs">Capacidad {table.capacity} personas</p>
                    <span className="text-[11px] text-emerald-600 font-semibold mt-2">
                      + Clic para Abrir Mesa
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-zinc-500 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> Abierta: {table.openedAt}
                      </span>
                      <span>Mesero: {table.waiter}</span>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-baseline justify-between">
                      <span className="text-zinc-500 font-medium">Consumo:</span>
                      <div className="text-right">
                        <div className="font-bold text-zinc-950 text-base mono-num">
                          ${Number(table.totalUsd).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-zinc-400 mono-num">
                          Bs. {(Number(table.totalUsd) * exchangeRate).toLocaleString('es-VE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE GESTIÓN DE MESA */}
      {activeTableModal && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveTableModal(null)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-950 text-lg">{activeTableModal.name}</h3>
                <p className="text-xs text-zinc-500">{activeTableModal.zone}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTableModal(null)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {activeTableModal.status === 'free' ? (
              <div className="space-y-4">
                <p className="text-xs text-zinc-600">
                  Esta mesa está libre. Asigna los datos iniciales para abrir la comanda:
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      Número de Comensales
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={openGuests}
                      onChange={(e) => setOpenGuests(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      Mesero Asignado
                    </label>
                    <input
                      type="text"
                      value={openWaiter}
                      onChange={(e) => setOpenWaiter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenTable(activeTableModal.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 text-white font-bold text-xs hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  Abrir Mesa e Iniciar Servicio
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Hora de inicio:</span>
                    <span className="font-semibold">{activeTableModal.openedAt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Mesero:</span>
                    <span className="font-semibold">{activeTableModal.waiter}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-zinc-200">
                    <span className="text-zinc-500">Total Acumulado:</span>
                    <span className="font-bold text-zinc-950 mono-num">
                      ${Number(activeTableModal.totalUsd).toFixed(2)} (Bs.{' '}
                      {(Number(activeTableModal.totalUsd) * exchangeRate).toLocaleString('es-VE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                      )
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onGoToPos) {
                        onGoToPos(activeTableModal);
                      }
                      setActiveTableModal(null);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <CreditCard size={15} />
                    <span>Cobrar en Caja (Punto de Venta)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRequestBill(activeTableModal.id)}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 text-zinc-800 font-semibold text-xs hover:bg-zinc-200 transition-all cursor-pointer"
                  >
                    Marcar Cuenta Pedida
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFreeTable(activeTableModal.id)}
                    className="w-full py-2 px-4 rounded-xl text-rose-600 font-semibold text-xs hover:bg-rose-50 transition-all cursor-pointer"
                  >
                    Liberar Mesa sin Cobro
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
