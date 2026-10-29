import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  ClipboardList,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  DollarSign,
  Package,
  Edit2,
  Trash2,
  RotateCcw,
  Sparkles,
  Calendar,
  User,
  ShieldCheck
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { CLIENT_CONFIG } from '../config/clientConfig';

export default function Inventory() {
  const {
    inventory = [],
    inventoryLogs = [],
    adjustInventoryStock,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    registerDailyCount,
    exchangeRate = 876.80
  } = useData() || {};

  const { user } = useAuth() || {};
  const currentUserName = user?.name || user?.username || 'Administrador';

  // Navegación de pestañas internas
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'daily_count' | 'kardex'

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterAlertsOnly, setFilterAlertsOnly] = useState(false);

  // Modales
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Panadería',
    unit: 'und',
    currentStock: '0',
    minStock: '15',
    costUSD: '0'
  });

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryForm, setEntryForm] = useState({
    inventoryId: '',
    quantity: '',
    reason: 'Compra / Reposición de Proveedor',
    costUSD: ''
  });

  const [showWasteModal, setShowWasteModal] = useState(false);
  const [wasteForm, setWasteForm] = useState({
    inventoryId: '',
    quantity: '',
    reason: 'Pan quemado / roto en plancha'
  });

  // Estado para el Conteo Diario (Decisión 2)
  const [dailyCounts, setDailyCounts] = useState({});
  const [dailyNotes, setDailyNotes] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Categorías únicas
  const categories = useMemo(() => {
    const set = new Set(inventory.map(i => i.category || 'General'));
    return Array.from(set);
  }, [inventory]);

  // Insumos filtrados
  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || (item.name || '').toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const isLowOrNegative = item.currentStock <= item.minStock;
      const matchesAlert = !filterAlertsOnly || isLowOrNegative;
      return matchesSearch && matchesCat && matchesAlert;
    });
  }, [inventory, search, selectedCategory, filterAlertsOnly]);

  // Métricas KPI
  const stats = useMemo(() => {
    let totalItems = inventory.length;
    let healthyCount = 0;
    let lowCount = 0;
    let outCount = 0;
    let totalValueUSD = 0;

    inventory.forEach(item => {
      const stock = Number(item.currentStock) || 0;
      const min = Number(item.minStock) || 10;
      const cost = Number(item.costUSD) || 0;
      if (stock > 0) totalValueUSD += stock * cost;

      if (stock <= 0) {
        outCount++;
      } else if (stock <= min) {
        lowCount++;
      } else {
        healthyCount++;
      }
    });

    return {
      totalItems,
      healthyCount,
      lowCount,
      outCount,
      totalValueUSD,
      totalValueBs: totalValueUSD * (Number(exchangeRate) || 876.80)
    };
  }, [inventory, exchangeRate]);

  // Manejadores de Formularios
  const handleOpenItemModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name || '',
        category: item.category || 'Panadería',
        unit: item.unit || 'und',
        currentStock: String(item.currentStock || 0),
        minStock: String(item.minStock || 15),
        costUSD: String(item.costUSD || 0)
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: '',
        category: 'Panadería',
        unit: 'und',
        currentStock: '0',
        minStock: '15',
        costUSD: '0'
      });
    }
    setShowItemModal(true);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      showToast('El nombre del insumo es obligatorio', 'error');
      return;
    }

    if (editingItem) {
      updateInventoryItem(editingItem.id, {
        name: itemForm.name.trim(),
        category: itemForm.category,
        unit: itemForm.unit,
        minStock: Number(itemForm.minStock) || 10,
        costUSD: Number(itemForm.costUSD) || 0
      });
      showToast('Insumo actualizado exitosamente');
    } else {
      addInventoryItem({
        name: itemForm.name.trim(),
        category: itemForm.category,
        unit: itemForm.unit,
        currentStock: Number(itemForm.currentStock) || 0,
        minStock: Number(itemForm.minStock) || 10,
        costUSD: Number(itemForm.costUSD) || 0,
        user: currentUserName
      });
      showToast('Nuevo insumo registrado en el inventario');
    }
    setShowItemModal(false);
  };

  const handleDeleteItem = (id, name) => {
    if (window.confirm(`¿Seguro que deseas eliminar el insumo "${name}" del inventario?`)) {
      deleteInventoryItem(id);
      showToast(`Insumo "${name}" eliminado`);
    }
  };

  // Entrada de Mercancía (Compras a Proveedor)
  const handleOpenEntryModal = (item = null) => {
    setEntryForm({
      inventoryId: item ? item.id : (inventory[0]?.id || ''),
      quantity: '',
      reason: 'Compra / Reposición de Proveedor',
      costUSD: item ? String(item.costUSD || '') : ''
    });
    setShowEntryModal(true);
  };

  const handleSaveEntry = (e) => {
    e.preventDefault();
    const qty = Number(entryForm.quantity);
    if (!entryForm.inventoryId || isNaN(qty) || qty <= 0) {
      showToast('Ingresa una cantidad válida mayor a 0', 'error');
      return;
    }

    adjustInventoryStock({
      id: entryForm.inventoryId,
      delta: qty,
      type: 'entry',
      reason: entryForm.reason.trim() || 'Entrada de mercancía',
      user: currentUserName
    });

    if (entryForm.costUSD && !isNaN(Number(entryForm.costUSD))) {
      updateInventoryItem(entryForm.inventoryId, {
        costUSD: Number(entryForm.costUSD)
      });
    }

    showToast(`+${qty} unidades sumadas al inventario`);
    setShowEntryModal(false);
  };

  // Registro de Merma / Desecho
  const handleOpenWasteModal = (item = null) => {
    setWasteForm({
      inventoryId: item ? item.id : (inventory[0]?.id || ''),
      quantity: '',
      reason: 'Pan quemado / roto en plancha'
    });
    setShowWasteModal(true);
  };

  const handleSaveWaste = (e) => {
    e.preventDefault();
    const qty = Number(wasteForm.quantity);
    if (!wasteForm.inventoryId || isNaN(qty) || qty <= 0) {
      showToast('Ingresa una cantidad válida mayor a 0', 'error');
      return;
    }

    adjustInventoryStock({
      id: wasteForm.inventoryId,
      delta: -qty,
      type: 'waste',
      reason: wasteForm.reason.trim() || 'Merma / Desecho de cocina',
      user: currentUserName
    });

    showToast(`Merma registrada: -${qty} unidades`);
    setShowWasteModal(false);
  };

  // Conteo Diario al Cierre de Turno (Decisión 2)
  const handleInitDailyCount = () => {
    const initial = {};
    inventory.forEach(it => {
      initial[it.id] = String(it.currentStock);
    });
    setDailyCounts(initial);
    setDailyNotes('');
    setActiveTab('daily_count');
  };

  const handleSaveDailyCount = () => {
    const countList = [];
    let modifiedCount = 0;

    inventory.forEach(it => {
      const val = dailyCounts[it.id];
      if (val !== undefined && val !== '') {
        const physical = Number(val);
        if (!isNaN(physical)) {
          countList.push({ id: it.id, countedStock: physical });
          if (physical !== it.currentStock) modifiedCount++;
        }
      }
    });

    if (countList.length === 0) {
      showToast('No se ingresaron conteos para procesar', 'error');
      return;
    }

    registerDailyCount({
      counts: countList,
      user: currentUserName,
      notes: dailyNotes.trim()
    });

    showToast(`¡Conteo diario guardado con éxito! Se ajustaron ${modifiedCount} insumos con diferencias.`);
    setActiveTab('stock');
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', color: '#0f172a' }}>
      
      {/* Toast Notifier */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: toast.type === 'error' ? '#dc2626' : '#059669',
          color: '#ffffff', padding: '12px 20px', borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)', fontWeight: '700',
          display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem'
        }}>
          {toast.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              padding: '10px',
              background: 'linear-gradient(135deg, #D52829 0%, #b81f20 100%)',
              color: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(213,40,41,0.25)'
            }}>
              <Boxes size={26} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.55rem', fontWeight: '800', letterSpacing: '-0.3px' }}>
                Inventario & Control de Stock
              </h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                {CLIENT_CONFIG.branding.logoText || 'Happy Days'} • Control Pragmático de Panes, Carnes, Bebidas y Empaques
              </p>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas Superiores */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleInitDailyCount}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '10px 16px', background: '#0284c7', color: '#ffffff',
              border: 'none', borderRadius: '10px', fontWeight: '800',
              fontSize: '0.86rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(2,132,199,0.25)'
            }}
            title="Conteo físico de panes y carnes al cerrar el turno"
          >
            <ClipboardList size={16} /> 📋 Conteo Diario (Cierre)
          </button>

          <button
            type="button"
            onClick={() => handleOpenEntryModal()}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '10px 16px', background: '#10b981', color: '#ffffff',
              border: 'none', borderRadius: '10px', fontWeight: '800',
              fontSize: '0.86rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(16,185,129,0.25)'
            }}
            title="Sumar mercancía entregada por proveedores"
          >
            <ArrowUpRight size={16} /> + Entrada de Mercancía
          </button>

          <button
            type="button"
            onClick={() => handleOpenWasteModal()}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '10px 16px', background: '#f59e0b', color: '#ffffff',
              border: 'none', borderRadius: '10px', fontWeight: '800',
              fontSize: '0.86rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(245,158,11,0.2)'
            }}
            title="Registrar panes quemados o mermas"
          >
            <ArrowDownRight size={16} /> 📉 Merma / Desecho
          </button>

          <button
            type="button"
            onClick={() => handleOpenItemModal()}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '10px 16px', background: 'var(--brand-primary, #D52829)', color: '#ffffff',
              border: 'none', borderRadius: '10px', fontWeight: '800',
              fontSize: '0.86rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(213,40,41,0.25)'
            }}
          >
            <Plus size={16} /> + Nuevo Insumo
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Estado de Inventario */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Insumos Catálogo</span>
          <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            {stats.totalItems} ítems
          </div>
          <span style={{ fontSize: '0.73rem', color: '#64748b' }}>
            Panes, carnes, bebidas y empaques
          </span>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: '700', textTransform: 'uppercase' }}>🟢 Stock Saludable</span>
          <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>
            {stats.healthyCount}
          </div>
          <span style={{ fontSize: '0.73rem', color: '#15803d' }}>
            Por encima del mínimo
          </span>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #fef08a', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.76rem', color: '#ca8a04', fontWeight: '700', textTransform: 'uppercase' }}>🟡 Stock Bajo</span>
          <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#ca8a04', marginTop: '4px' }}>
            {stats.lowCount}
          </div>
          <span style={{ fontSize: '0.73rem', color: '#a16207' }}>
            Cerca de agotarse (reponer)
          </span>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.76rem', color: '#dc2626', fontWeight: '700', textTransform: 'uppercase' }}>🔴 Agotado / Negativo</span>
          <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#dc2626', marginTop: '4px' }}>
            {stats.outCount}
          </div>
          <span style={{ fontSize: '0.73rem', color: '#b91c1c' }}>
            Opción A: Se sigue vendiendo
          </span>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.76rem', color: '#4f46e5', fontWeight: '700', textTransform: 'uppercase' }}>Valor Estimado</span>
          <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#4f46e5', marginTop: '4px' }}>
            ${stats.totalValueUSD.toFixed(2)}
          </div>
          <span style={{ fontSize: '0.73rem', color: '#6366f1' }}>
            Bs. {stats.totalValueBs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Selector de Pestañas Superiores */}
      <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '12px', marginBottom: '18px', width: 'fit-content' }}>
        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 18px', borderRadius: '8px', border: 'none',
            fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
            background: activeTab === 'stock' ? '#ffffff' : 'transparent',
            color: activeTab === 'stock' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'stock' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
          }}
        >
          <Boxes size={16} /> Semáforo de Stock ({inventory.length})
        </button>

        <button
          type="button"
          onClick={handleInitDailyCount}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 18px', borderRadius: '8px', border: 'none',
            fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
            background: activeTab === 'daily_count' ? '#ffffff' : 'transparent',
            color: activeTab === 'daily_count' ? '#0284c7' : '#64748b',
            boxShadow: activeTab === 'daily_count' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
          }}
        >
          <ClipboardList size={16} /> 📋 Conteo Diario (Cierre)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kardex')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 18px', borderRadius: '8px', border: 'none',
            fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
            background: activeTab === 'kardex' ? '#ffffff' : 'transparent',
            color: activeTab === 'kardex' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'kardex' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
          }}
        >
          <History size={16} /> Movimientos / Kardex ({inventoryLogs.length})
        </button>
      </div>

      {/* PESTAÑA 1: TABLA DE STOCK CON SEMÁFORO */}
      {activeTab === 'stock' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          {/* Filtros de Tabla */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px', maxWidth: '420px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Buscar insumo (Pan, Carne, Coca-Cola)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 36px',
                    borderRadius: '8px', border: '1px solid #cbd5e1',
                    fontSize: '0.85rem', background: '#ffffff'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                  fontSize: '0.84rem', fontWeight: '700', background: '#ffffff'
                }}
              >
                <option value="all">Todas las Categorías</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setFilterAlertsOnly(!filterAlertsOnly)}
                style={{
                  padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                  fontSize: '0.84rem', fontWeight: '700', cursor: 'pointer',
                  background: filterAlertsOnly ? '#fef2f2' : '#ffffff',
                  color: filterAlertsOnly ? '#dc2626' : '#64748b',
                  borderColor: filterAlertsOnly ? '#fca5a5' : '#cbd5e1'
                }}
              >
                {filterAlertsOnly ? '⚠️ Mostrando solo Alertas' : 'Filtrar Alertas'}
              </button>
            </div>
          </div>

          {/* Tabla de Insumos */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#475569', borderBottom: '1.5px solid #cbd5e1' }}>
                  <th style={{ padding: '12px 16px' }}>Insumo</th>
                  <th style={{ padding: '12px 16px' }}>Categoría</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Stock Actual</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Mínimo</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Costo USD</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Valor Total</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Acciones Rápidas</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      No se encontraron insumos con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => {
                    const stock = Number(item.currentStock) || 0;
                    const min = Number(item.minStock) || 10;
                    const cost = Number(item.costUSD) || 0;
                    const valUSD = stock > 0 ? stock * cost : 0;

                    const isOut = stock <= 0;
                    const isLow = stock > 0 && stock <= min;

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '800', color: '#0f172a' }}>
                          {item.name}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: '700',
                            background: '#e0f2fe', color: '#0369a1'
                          }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '1rem', fontWeight: '800',
                            color: isOut ? '#dc2626' : (isLow ? '#b45309' : '#15803d')
                          }}>
                            {stock} {item.unit}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
                          {min} {item.unit}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {isOut ? (
                            <span style={{
                              padding: '4px 10px', borderRadius: '999px', fontSize: '0.73rem', fontWeight: '800',
                              background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca'
                            }}>
                              🔴 {stock < 0 ? `En Negativo (${stock})` : 'Agotado'}
                            </span>
                          ) : isLow ? (
                            <span style={{
                              padding: '4px 10px', borderRadius: '999px', fontSize: '0.73rem', fontWeight: '800',
                              background: '#fefce8', color: '#a16207', border: '1px solid #fef08a'
                            }}>
                              🟡 Reponer ({stock})
                            </span>
                          ) : (
                            <span style={{
                              padding: '4px 10px', borderRadius: '999px', fontSize: '0.73rem', fontWeight: '800',
                              background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0'
                            }}>
                              🟢 Óptimo
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600' }}>
                          ${cost.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#334155' }}>
                          ${valUSD.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEntryModal(item)}
                              title="Sumar stock recibido"
                              style={{
                                padding: '5px 8px', borderRadius: '6px', border: '1px solid #bbf7d0',
                                background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem'
                              }}
                            >
                              + Entrada
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenWasteModal(item)}
                              title="Registrar merma o desecho"
                              style={{
                                padding: '5px 8px', borderRadius: '6px', border: '1px solid #fef08a',
                                background: '#fefce8', color: '#ca8a04', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem'
                              }}
                            >
                              - Merma
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenItemModal(item)}
                              title="Editar insumo"
                              style={{
                                padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1',
                                background: '#ffffff', color: '#475569', cursor: 'pointer'
                              }}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              title="Eliminar insumo"
                              style={{
                                padding: '5px 8px', borderRadius: '6px', border: '1px solid #fecaca',
                                background: '#fff5f5', color: '#dc2626', cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: CONTEO DIARIO AL CIERRE DE TURNO (DECISIÓN 2) */}
      {activeTab === 'daily_count' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1.5px solid #bfdbfe', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={22} color="#0284c7" />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0369a1' }}>
                  Conteo Físico Diario (Cierre de Turno)
                </h2>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Ingresa lo que tienes físicamente en la cocina y neveras. El sistema calculará la diferencia (merma o sobrante) y ajustará el stock automáticamente.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('stock')}
                style={{
                  padding: '9px 16px', borderRadius: '10px', border: '1px solid #cbd5e1',
                  background: '#ffffff', color: '#475569', fontWeight: '700', cursor: 'pointer', fontSize: '0.86rem'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveDailyCount}
                style={{
                  padding: '9px 18px', borderRadius: '10px', border: 'none',
                  background: '#0284c7', color: '#ffffff', fontWeight: '800', cursor: 'pointer', fontSize: '0.86rem',
                  boxShadow: '0 2px 6px rgba(2,132,199,0.3)'
                }}
              >
                ✅ Asentar Conteo Diario
              </button>
            </div>
          </div>

          {/* Tabla de Conteo */}
          <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1.5px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px' }}>Insumo</th>
                  <th style={{ padding: '10px 14px' }}>Categoría</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Stock Sistema</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', width: '170px' }}>Conteo Físico Real</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Diferencia / Merma</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(it => {
                  const currentVal = dailyCounts[it.id] !== undefined ? dailyCounts[it.id] : String(it.currentStock);
                  const phys = Number(currentVal);
                  const diff = isNaN(phys) ? 0 : (phys - it.currentStock);

                  return (
                    <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: '700' }}>{it.name}</td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>{it.category}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700', color: '#475569' }}>
                        {it.currentStock} {it.unit}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <input
                            type="number"
                            min="0"
                            value={currentVal}
                            onChange={(e) => setDailyCounts({ ...dailyCounts, [it.id]: e.target.value })}
                            style={{
                              width: '90px', padding: '6px 10px', textAlign: 'center',
                              borderRadius: '8px', border: '1.5px solid #0284c7', fontWeight: '800',
                              fontSize: '0.95rem', background: '#f0f9ff'
                            }}
                          />
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{it.unit}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {diff === 0 ? (
                          <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '0.82rem' }}>
                            ✓ Cuadra exacto (0)
                          </span>
                        ) : diff > 0 ? (
                          <span style={{ color: '#0284c7', fontWeight: '800', fontSize: '0.85rem' }}>
                            +{diff} (Sobrante)
                          </span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: '800', fontSize: '0.85rem' }}>
                            {diff} (Merma/Faltante)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              Observaciones del Conteo Diario (Opcional):
            </label>
            <input
              type="text"
              placeholder="Ej: Cierre turno noche, se botaron 2 panes de burger por aplastamiento..."
              value={dailyNotes}
              onChange={(e) => setDailyNotes(e.target.value)}
              style={{
                width: '100%', padding: '9px 14px', borderRadius: '8px',
                border: '1px solid #cbd5e1', fontSize: '0.85rem'
              }}
            />
          </div>
        </div>
      )}

      {/* PESTAÑA 3: KARDEX / HISTORIAL DE MOVIMIENTOS */}
      {activeTab === 'kardex' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>
                Kardex de Movimientos de Insumos
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Auditoría cronológica de ventas, entradas de mercancía, mermas y ajustes diarios.
              </p>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>
              Últimos {inventoryLogs.length} movimientos
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#475569', borderBottom: '1.5px solid #cbd5e1' }}>
                  <th style={{ padding: '10px 14px' }}>Fecha y Hora</th>
                  <th style={{ padding: '10px 14px' }}>Insumo</th>
                  <th style={{ padding: '10px 14px' }}>Tipo</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Variación (Δ)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Stock (Antes → Después)</th>
                  <th style={{ padding: '10px 14px' }}>Motivo / Referencia</th>
                  <th style={{ padding: '10px 14px' }}>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {inventoryLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      No hay movimientos registrados todavía. Las ventas en el POS descontarán automáticamente.
                    </td>
                  </tr>
                ) : (
                  inventoryLogs.map(log => {
                    const isPositive = (Number(log.delta) || 0) > 0;
                    const dateFormatted = new Date(log.date || Date.now()).toLocaleString('es-VE', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    });

                    let typeBadge = { label: 'Ajuste', bg: '#f1f5f9', color: '#475569' };
                    if (log.type === 'sale') typeBadge = { label: 'Venta', bg: '#fef2f2', color: '#dc2626' };
                    if (log.type === 'entry') typeBadge = { label: 'Entrada Proveedor', bg: '#f0fdf4', color: '#16a34a' };
                    if (log.type === 'waste') typeBadge = { label: 'Merma Cocina', bg: '#fefce8', color: '#ca8a04' };
                    if (log.type === 'daily_count') typeBadge = { label: 'Conteo Diario', bg: '#eff6ff', color: '#2563eb' };
                    if (log.type === 'void_reversal') typeBadge = { label: 'Reintegro Anulación', bg: '#faf5ff', color: '#7c3aed' };

                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#64748b' }}>
                          {dateFormatted}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: '800', color: '#0f172a' }}>
                          {log.itemName}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
                            background: typeBadge.bg, color: typeBadge.color
                          }}>
                            {typeBadge.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '800', color: isPositive ? '#16a34a' : '#dc2626' }}>
                          {isPositive ? `+${log.delta}` : log.delta}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
                          {log.prevStock} → <strong>{log.newStock}</strong>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#334155' }}>
                          {log.reason || 'Sin motivo'}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '0.78rem' }}>
                          {log.user || 'Sistema'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO / EDITAR INSUMO */}
      {showItemModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', maxWidth: '480px', width: '100%',
            padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: '800' }}>
              {editingItem ? 'Editar Insumo' : 'Registrar Nuevo Insumo'}
            </h3>

            <form onSubmit={handleSaveItem} noValidate>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
                  Nombre del Insumo:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pan de Hamburguesa, Carne 120g..."
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
                    Categoría:
                  </label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="Panadería">Panadería</option>
                    <option value="Proteínas">Proteínas</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Empaques">Empaques</option>
                    <option value="Insumos">Insumos Generales</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
                    Unidad de Medida:
                  </label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="und">Unidad (und)</option>
                    <option value="latas">Latas</option>
                    <option value="botellas">Botellas</option>
                    <option value="rebanadas">Rebanadas</option>
                    <option value="piezas">Piezas</option>
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="paq">Paquetes</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                {!editingItem && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
                      Stock Inicial:
                    </label>
                    <input
                      type="number"
                      value={itemForm.currentStock}
                      onChange={(e) => setItemForm({ ...itemForm, currentStock: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
                    Stock Mínimo (Alerta):
                  </label>
                  <input
                    type="number"
                    value={itemForm.minStock}
                    onChange={(e) => setItemForm({ ...itemForm, minStock: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
                    Costo Estimado ($ USD):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={itemForm.costUSD}
                    onChange={(e) => setItemForm({ ...itemForm, costUSD: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  style={{
                    padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: '#ffffff', cursor: 'pointer', fontWeight: '700'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 20px', borderRadius: '8px', border: 'none',
                    background: 'var(--brand-primary, #D52829)', color: '#ffffff', fontWeight: '800', cursor: 'pointer'
                  }}
                >
                  {editingItem ? 'Guardar Cambios' : 'Registrar Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENTRADA DE MERCANCÍA (COMPRA A PROVEEDOR) */}
      {showEntryModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', maxWidth: '440px', width: '100%',
            padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <ArrowUpRight size={22} color="#16a34a" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#15803d' }}>
                Entrada de Mercancía
              </h3>
            </div>

            <form onSubmit={handleSaveEntry} noValidate>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
                  Insumo Recibido:
                </label>
                <select
                  value={entryForm.inventoryId}
                  onChange={(e) => {
                    const sel = inventory.find(i => i.id === e.target.value);
                    setEntryForm({
                      ...entryForm,
                      inventoryId: e.target.value,
                      costUSD: sel ? String(sel.costUSD || '') : entryForm.costUSD
                    });
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '700' }}
                >
                  {inventory.map(it => (
                    <option key={it.id} value={it.id}>{it.name} (Stock actual: {it.currentStock} {it.unit})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
                    Cantidad a Sumar (+):
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Ej: 50"
                    value={entryForm.quantity}
                    onChange={(e) => setEntryForm({ ...entryForm, quantity: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #16a34a', fontWeight: '800' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
                    Costo Unitario ($ USD):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={entryForm.costUSD}
                    onChange={(e) => setEntryForm({ ...entryForm, costUSD: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
                  Motivo / Proveedor:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Entrega de Panadería El Trigo / Factura #1234"
                  value={entryForm.reason}
                  onChange={(e) => setEntryForm({ ...entryForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  style={{
                    padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: '#ffffff', cursor: 'pointer', fontWeight: '700'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 20px', borderRadius: '8px', border: 'none',
                    background: '#16a34a', color: '#ffffff', fontWeight: '800', cursor: 'pointer'
                  }}
                >
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR MERMA / DESECHO */}
      {showWasteModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', maxWidth: '440px', width: '100%',
            padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <ArrowDownRight size={22} color="#ca8a04" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#a16207' }}>
                Registrar Merma / Desecho
              </h3>
            </div>

            <form onSubmit={handleSaveWaste} noValidate>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
                  Insumo Dañado / Merma:
                </label>
                <select
                  value={wasteForm.inventoryId}
                  onChange={(e) => setWasteForm({ ...wasteForm, inventoryId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '700' }}
                >
                  {inventory.map(it => (
                    <option key={it.id} value={it.id}>{it.name} (Stock: {it.currentStock} {it.unit})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
                  Cantidad a Descontar (-):
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Ej: 3"
                  value={wasteForm.quantity}
                  onChange={(e) => setWasteForm({ ...wasteForm, quantity: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #ca8a04', fontWeight: '800' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>
                  Motivo de la Merma:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Pan quemado en plancha, carne rota, refresco vencido..."
                  value={wasteForm.reason}
                  onChange={(e) => setWasteForm({ ...wasteForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowWasteModal(false)}
                  style={{
                    padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: '#ffffff', cursor: 'pointer', fontWeight: '700'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 20px', borderRadius: '8px', border: 'none',
                    background: '#ca8a04', color: '#ffffff', fontWeight: '800', cursor: 'pointer'
                  }}
                >
                  Confirmar Merma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
