import React, { useState, useMemo, useRef } from 'react';
import { Search, Plus, Edit2, ToggleLeft, ToggleRight, CheckCircle, AlertCircle, Package, ImagePlus, Trash2, RefreshCw } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { compressImage } from '../utils/imageUtils';

const Products = () => {
  const { products = [], addProduct, updateProduct } = useData() || {};
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    id: null, name: '', category: '', priceUSD: '', sku: '', active: true, image: ''
  });

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageLoading(true);
    try {
      const dataUrl = await compressImage(file);
      setFormData(prev => ({ ...prev, image: dataUrl }));
    } catch (err) {
      showToast(err.message || 'No se pudo cargar la imagen', 'error');
    } finally {
      setImageLoading(false);
    }
  };

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category || 'General'))), [products]);

  const filteredProducts = useMemo(() => {
    return (products || []).filter(p => {
      const q = search.toLowerCase();
      const matchesSearch = (p.name || p.nombre || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
      const matchesFilter = filter === 'Todos' ? true : filter === 'Activos' ? (p.active !== false) : (p.active === false);
      return matchesSearch && matchesFilter;
    });
  }, [products, search, filter]);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleStatus = (id, currentStatus) => {
    updateProduct(id, { active: !currentStatus });
    showToast(currentStatus ? 'Producto desactivado' : 'Producto activado', 'success');
  };

  const handleOpenModal = (prod = null) => {
    if (prod) {
      setFormData({
        id: prod.id,
        name: prod.name || prod.nombre || '',
        category: prod.category || 'General',
        priceUSD: (prod.priceUSD || prod.price || 0).toString(),
        sku: prod.sku || '',
        active: prod.active !== false,
        image: prod.image || ''
      });
    } else {
      setFormData({ id: null, name: '', category: '', priceUSD: '', sku: '', active: true, image: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name.trim(),
        category: formData.category ? formData.category.trim() : 'General',
        priceUSD: parseFloat(formData.priceUSD) || 0,
        sku: formData.sku ? formData.sku.trim() : '',
        active: formData.active !== false,
        image: formData.image || ''
      };
      if (formData.id) {
        updateProduct(formData.id, data);
        showToast('Producto actualizado correctamente', 'success');
      } else {
        addProduct(data);
        showToast('Producto creado exitosamente', 'success');
        setSearch('');
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast('Error al guardar el producto', 'error');
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', color: '#111827', background: '#f4f5f7', minHeight: '100%' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.5px', color: '#111827' }}>
            Gestión de Productos
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.88rem' }}>
            Catálogo de helados, precios en USD y fotos para la caja
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 18px',
            background: '#f59e0b', color: '#ffffff', border: 'none', borderRadius: '10px',
            fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem',
            boxShadow: '0 2px 6px rgba(245, 158, 11, 0.25)'
          }}
        >
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      {/* Controls Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o código SKU..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '11px 14px 11px 42px', background: '#ffffff',
              border: '1px solid #d1d5db', borderRadius: '10px', color: '#111827',
              outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {['Todos', 'Activos', 'Inactivos'].map(f => (
            <button 
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                padding: '9px 16px', borderRadius: '10px', cursor: 'pointer',
                background: filter === f ? '#fef3c7' : '#ffffff',
                border: filter === f ? '1.5px solid #f59e0b' : '1px solid #e5e7eb',
                color: filter === f ? '#b45309' : '#4b5563', fontWeight: filter === f ? '700' : '500',
                fontSize: '0.85rem'
              }}
            >
              {f} ({
                f === 'Todos' ? products.length :
                f === 'Activos' ? products.filter(p => p.active !== false).length :
                products.filter(p => p.active === false).length
              })
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#ffffff', border: '1px solid #eaedf2', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#111827', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #eaedf2', color: '#6b7280', textAlign: 'left' }}>
              <th style={{ padding: '14px 16px', fontWeight: '700', width: '70px' }}>Foto</th>
              <th style={{ padding: '14px 16px', fontWeight: '700' }}>SKU</th>
              <th style={{ padding: '14px 16px', fontWeight: '700' }}>Nombre del Producto</th>
              <th style={{ padding: '14px 16px', fontWeight: '700' }}>Categoría</th>
              <th style={{ padding: '14px 16px', fontWeight: '700' }}>Precio ($ USD)</th>
              <th style={{ padding: '14px 16px', fontWeight: '700' }}>Estado</th>
              <th style={{ padding: '14px 16px', fontWeight: '700', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(p => (
              <tr 
                key={p.id}
                style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.15s' }}
                onMouseOver={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '10px 16px' }}>
                  {p.image ? (
                    <div style={{ width: '44px', height: '44px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '2px', boxSizing: 'border-box' }}>
                      <img 
                        src={p.image} 
                        alt={p.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', display: 'block' }} 
                      />
                    </div>
                  ) : (
                    <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={18} color="#9ca3af" />
                    </div>
                  )}
                </td>
                <td style={{ padding: '14px 16px', color: '#6b7280', fontFamily: 'monospace' }}>{p.sku || '-'}</td>
                <td style={{ padding: '14px 16px', fontWeight: '700', color: '#111827' }}>{p.name || p.nombre}</td>
                <td style={{ padding: '14px 16px', color: '#4b5563' }}>{p.category || 'General'}</td>
                <td style={{ padding: '14px 16px', fontWeight: '800', color: '#059669' }}>
                  ${(Number(p.priceUSD || p.price || 0)).toFixed(2)}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700',
                    background: p.active !== false ? '#d1fae5' : '#fee2e2',
                    color: p.active !== false ? '#065f46' : '#991b1b'
                  }}>
                    {p.active !== false ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                    <button 
                      type="button"
                      onClick={() => handleOpenModal(p)}
                      title="Editar Producto"
                      style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: '600' }}
                    >
                      <Edit2 size={13} /> Editar
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleToggleStatus(p.id, p.active !== false)}
                      title={p.active !== false ? 'Desactivar' : 'Activar'}
                      style={{ background: 'none', border: 'none', color: p.active !== false ? '#10b981' : '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {p.active !== false ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '460px', maxHeight: '92vh', overflowY: 'auto', border: '1px solid #e5e7eb', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', color: '#111827', fontWeight: '800' }}>
              {formData.id ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Selector de Foto */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#4b5563', marginBottom: '6px', fontWeight: '600' }}>
                  Foto del Producto
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div
                    onClick={() => !imageLoading && fileInputRef.current?.click()}
                    title="Clic para seleccionar una foto"
                    style={{
                      width: '100px', height: '100px', flexShrink: 0, borderRadius: '12px',
                      cursor: 'pointer', overflow: 'hidden', background: '#f9fafb',
                      border: formData.image ? '1.5px solid #f59e0b' : '1.5px dashed #d1d5db',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexDirection: 'column', gap: '4px', color: '#6b7280', transition: 'border-color 0.2s',
                      padding: '4px', boxSizing: 'border-box'
                    }}
                  >
                    {imageLoading ? (
                      <span style={{ fontSize: '0.75rem', color: '#d97706' }}>Cargando...</span>
                    ) : formData.image ? (
                      <img src={formData.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', display: 'block' }} />
                    ) : (
                      <>
                        <ImagePlus size={24} color="#9ca3af" />
                        <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '600' }}>Subir foto</span>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={imageLoading}
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px',
                        background: '#f3f4f6', border: '1px solid #d1d5db',
                        color: '#374151', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600'
                      }}
                    >
                      {formData.image ? <><RefreshCw size={13} /> Cambiar foto</> : <><ImagePlus size={13} /> Elegir foto</>}
                    </button>
                    {formData.image && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px',
                          background: '#fee2e2', border: '1px solid #fecaca',
                          color: '#dc2626', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600'
                        }}
                      >
                        <Trash2 size={13} /> Quitar foto
                      </button>
                    )}
                    <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                      Se guarda en tu computadora (100% offline).
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#4b5563', marginBottom: '4px', fontWeight: '600' }}>Nombre del Producto *</label>
                <input 
                  required 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: '#f9fafb', border: '1px solid #d1d5db', color: '#111827', borderRadius: '8px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#4b5563', marginBottom: '4px', fontWeight: '600' }}>Categoría</label>
                <input 
                  type="text" 
                  list="category-suggestions"
                  placeholder="Combos, Hamburguesas, Bebidas..."
                  value={formData.category} 
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: '#f9fafb', border: '1px solid #d1d5db', color: '#111827', borderRadius: '8px', boxSizing: 'border-box' }}
                />
                <datalist id="category-suggestions">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#4b5563', marginBottom: '4px', fontWeight: '600' }}>Precio ($ USD) *</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={formData.priceUSD} 
                    onChange={e => setFormData({ ...formData, priceUSD: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#f9fafb', border: '1px solid #d1d5db', color: '#111827', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#4b5563', marginBottom: '4px', fontWeight: '600' }}>SKU / Código</label>
                  <input 
                    type="text" 
                    placeholder="HEL-001"
                    value={formData.sku} 
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#f9fafb', border: '1px solid #d1d5db', color: '#111827', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '9px 18px', background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#4b5563', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  style={{ padding: '9px 20px', background: '#f59e0b', border: 'none', color: '#ffffff', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 6px rgba(245, 158, 11, 0.25)' }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#fff', padding: '10px 20px', borderRadius: '24px',
          fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1000,
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

    </div>
  );
};

export default Products;
