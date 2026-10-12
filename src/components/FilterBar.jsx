import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';

const FilterBar = ({ onChange, onFilterChange }) => {
  const { products } = useData();
  const triggerChange = onChange || onFilterChange;
  
  const [filters, setFilters] = useState({
    desde: '',
    hasta: '',
    cliente: '',
    productoId: '',
    estado: 'Todas',
    tipoCliente: 'Todos'
  });

  useEffect(() => {
    if (typeof triggerChange === 'function') {
      triggerChange(filters);
    }
  }, [filters]);

  const handleChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDatePreset = (preset) => {
    const today = new Date();
    let desde = '';
    let hasta = today.toISOString().split('T')[0];

    if (preset === 'hoy') {
      desde = hasta;
    } else if (preset === 'semana') {
      const firstDay = new Date();
      firstDay.setDate(today.getDate() - today.getDay());
      desde = firstDay.toISOString().split('T')[0];
      hasta = new Date().toISOString().split('T')[0];
    } else if (preset === 'mes') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      desde = firstDay.toISOString().split('T')[0];
      hasta = new Date().toISOString().split('T')[0];
    } else if (preset === 'anio') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      desde = firstDay.toISOString().split('T')[0];
      hasta = new Date().toISOString().split('T')[0];
    }

    setFilters(prev => ({ ...prev, desde, hasta }));
  };

  const clearFilters = () => {
    setFilters({
      desde: '',
      hasta: '',
      cliente: '',
      productoId: '',
      estado: 'Todas',
      tipoCliente: 'Todos'
    });
  };

  const inputStyle = {
    background: '#ffffff',
    border: '1px solid #d1d5db',
    color: '#111827',
    padding: '9px 12px',
    borderRadius: '8px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '0.88rem'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.78rem',
    color: '#6b7280',
    marginBottom: '5px',
    fontWeight: '600'
  };

  const btnStyle = {
    background: '#fef3c7',
    color: '#b45309',
    border: '1px solid #fde68a',
    padding: '6px 14px',
    borderRadius: '16px',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: 'pointer'
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #eaedf2',
      borderRadius: '14px',
      padding: '20px',
      marginBottom: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: '#6b7280', marginRight: '4px', fontWeight: '600' }}>Rango rápido:</span>
        <button type="button" onClick={() => handleDatePreset('hoy')} style={btnStyle}>Hoy</button>
        <button type="button" onClick={() => handleDatePreset('semana')} style={btnStyle}>Esta Semana</button>
        <button type="button" onClick={() => handleDatePreset('mes')} style={btnStyle}>Este Mes</button>
        <button type="button" onClick={() => handleDatePreset('anio')} style={btnStyle}>Este Año</button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px'
      }}>
        <div>
          <label style={labelStyle}>Desde</label>
          <input 
            type="date" 
            style={inputStyle}
            value={filters.desde}
            onChange={(e) => handleChange('desde', e.target.value)}
          />
        </div>
        
        <div>
          <label style={labelStyle}>Hasta</label>
          <input 
            type="date" 
            style={inputStyle}
            value={filters.hasta}
            onChange={(e) => handleChange('hasta', e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle}>Cliente (Nombre o Cédula)</label>
          <input 
            type="text" 
            placeholder="Buscar..."
            style={inputStyle}
            value={filters.cliente}
            onChange={(e) => handleChange('cliente', e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle}>Producto</label>
          <select 
            style={inputStyle}
            value={filters.productoId}
            onChange={(e) => handleChange('productoId', e.target.value)}
          >
            <option value="">Todos los productos</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name || p.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Estado</label>
          <select 
            style={inputStyle}
            value={filters.estado}
            onChange={(e) => handleChange('estado', e.target.value)}
          >
            <option value="Todas">Todas</option>
            <option value="Pagada">Pagada</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Parcial">Parcial</option>
            <option value="Anulada">Anulada</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Tipo Cliente</label>
          <select 
            style={inputStyle}
            value={filters.tipoCliente}
            onChange={(e) => handleChange('tipoCliente', e.target.value)}
          >
            <option value="Todos">Todos</option>
            <option value="normal">Normal</option>
            <option value="congelador">Congelador</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          type="button"
          onClick={clearFilters}
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: '600'
          }}
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
};

export default FilterBar;
