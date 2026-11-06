import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Minus,
  Search,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Layers,
  X,
  History
} from 'lucide-react';
import { useData } from '../../pos-core/contexts/DataContext';

const DEFAULT_INVENTORY = [
  { id: 'inv-1', sku: 'INS-001', name: 'Carne para Smash Burger', unit: 'Kg', currentStock: 24.5, minStock: 10.0, costUsd: 6.50 },
  { id: 'inv-2', sku: 'INS-002', name: 'Pan Brioche Artesanal', unit: 'Unidades', currentStock: 48, minStock: 20, costUsd: 0.60 },
  { id: 'inv-3', sku: 'INS-003', name: 'Queso Cheddar Americano', unit: 'Kg', currentStock: 8.2, minStock: 5.0, costUsd: 7.20 },
  { id: 'inv-4', sku: 'INS-004', name: 'Tocineta Ahumada Crispy', unit: 'Kg', currentStock: 4.1, minStock: 5.0, costUsd: 8.50 },
  { id: 'inv-5', sku: 'INS-005', name: 'Queso Mozzarella en Barra', unit: 'Kg', currentStock: 15.0, minStock: 8.0, costUsd: 6.80 },
  { id: 'inv-6', sku: 'INS-006', name: 'Papas Rústicas Pre-fritas', unit: 'Kg', currentStock: 35.0, minStock: 15.0, costUsd: 2.10 },
  { id: 'inv-7', sku: 'INS-007', name: 'Tequeños Crudos Congelados', unit: 'Docenas', currentStock: 22, minStock: 10, costUsd: 3.50 },
  { id: 'inv-8', sku: 'INS-008', name: 'Refrescos Variados 355ml', unit: 'Latas', currentStock: 84, minStock: 30, costUsd: 0.75 },
];

export default function InventoryView() {
  const data = useData();
  const rawInventory = data?.inventory && data.inventory.length > 0 ? data.inventory : DEFAULT_INVENTORY;

  const [inventoryList, setInventoryList] = useState(rawInventory);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAdjustModal, setActiveAdjustModal] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('add'); // 'add' | 'subtract'
  const [adjustReason, setAdjustReason] = useState('Compra de reposición');

  const filteredInventory = useMemo(() => {
    return inventoryList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q))
      );
    });
  }, [inventoryList, searchQuery]);

  const stats = useMemo(() => {
    const totalItems = inventoryList.length;
    const lowStock = inventoryList.filter((i) => i.currentStock <= i.minStock).length;
    const totalValueUsd = inventoryList.reduce((acc, i) => acc + (i.currentStock * (i.costUsd || 0)), 0);
    return { totalItems, lowStock, totalValueUsd };
  }, [inventoryList]);

  const handleSaveAdjustment = (e) => {
    e.preventDefault();
    if (!adjustQty || isNaN(adjustQty) || Number(adjustQty) <= 0) return;

    const qty = Number(adjustQty);
    const updated = inventoryList.map((item) => {
      if (item.id === activeAdjustModal.id) {
        const nextStock = adjustType === 'add' ? item.currentStock + qty : Math.max(0, item.currentStock - qty);
        return { ...item, currentStock: nextStock };
      }
      return item;
    });

    setInventoryList(updated);
    if (data?.adjustInventoryStock) {
      data.adjustInventoryStock({
        itemId: activeAdjustModal.id,
        qty: adjustType === 'add' ? qty : -qty,
        reason: adjustReason
      });
    }

    setActiveAdjustModal(null);
    setAdjustQty('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-y-auto">
      {/* HEADER NOTION */}
      <div className="bg-white border-b border-zinc-200/80 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
                <Boxes size={18} />
              </span>
              <h1 className="text-xl font-bold text-zinc-950 tracking-tight">Inventario & Stock</h1>
              {stats.lowStock > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  {stats.lowStock} bajo stock
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Control de existencias de insumos, materias primas y alertas de compras
            </p>
          </div>

          <div className="relative min-w-[260px]">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar insumo o código SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400"
            />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* CARDS DE RESUMEN */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <span className="text-xs text-zinc-500 font-semibold block">Insumos Monitoreados</span>
            <div className="text-2xl font-extrabold text-zinc-950">{stats.totalItems} ítems</div>
            <span className="text-[11px] text-zinc-400">En catálogo de bodega</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <span className="text-xs text-zinc-500 font-semibold block">Alerta de Reposición</span>
            <div className={`text-2xl font-extrabold ${stats.lowStock > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {stats.lowStock} ítems
            </div>
            <span className="text-[11px] text-zinc-400">Por debajo del stock mínimo</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <span className="text-xs text-zinc-500 font-semibold block">Valorización de Bodega</span>
            <div className="text-2xl font-extrabold text-zinc-950 mono-num">
              ${stats.totalValueUsd.toFixed(2)}
            </div>
            <span className="text-[11px] text-zinc-400">Costo total en existencias</span>
          </div>
        </div>

        {/* TABLA NOTION DE EXISTENCIAS */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50/80 text-zinc-500 font-semibold border-b border-zinc-100">
                <tr>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Insumo / Materia Prima</th>
                  <th className="py-3 px-4">Unidad</th>
                  <th className="py-3 px-4 text-right">Stock Actual</th>
                  <th className="py-3 px-4 text-right">Stock Mínimo</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Ajustar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {filteredInventory.map((item) => {
                  const isLow = item.currentStock <= item.minStock;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-zinc-500">{item.sku}</td>
                      <td className="py-3 px-4 font-bold text-zinc-950">{item.name}</td>
                      <td className="py-3 px-4 text-zinc-500">{item.unit}</td>
                      <td className="py-3 px-4 text-right font-bold text-zinc-950 font-mono text-sm">
                        {item.currentStock.toLocaleString('es-VE')} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-400">
                        {item.minStock} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isLow ? (
                          <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                            Bajo Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Óptimo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setActiveAdjustModal(item)}
                          className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL AJUSTAR STOCK */}
      {activeAdjustModal && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveAdjustModal(null)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-950 text-sm">Ajustar Existencia</h3>
                <p className="text-xs text-zinc-500">{activeAdjustModal.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAdjustModal(null)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Tipo de Movimiento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('add')}
                    className={`py-2 rounded-xl font-bold transition-all cursor-pointer ${
                      adjustType === 'add'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    + Entrada / Compra
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('subtract')}
                    className={`py-2 rounded-xl font-bold transition-all cursor-pointer ${
                      adjustType === 'subtract'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    - Salida / Merma
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">
                  Cantidad ({activeAdjustModal.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold mono-num focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Motivo del Ajuste</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveAdjustModal(null)}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-zinc-950 text-white font-bold hover:bg-zinc-800 transition-all cursor-pointer shadow-xs"
                >
                  Aplicar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
