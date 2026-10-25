import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';

export const getLocalDateStr = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const FilterBar = ({ onChange, onFilterChange }) => {
  const { products } = useData();
  const triggerChange = onChange || onFilterChange;
  const todayStr = getLocalDateStr(new Date());
  
  const [activePreset, setActivePreset] = useState('hoy');
  const [filters, setFilters] = useState({
    desde: todayStr,
    hasta: todayStr,
    cliente: '',
    productoId: '',
    estado: 'Todas',
    tipoCliente: 'Todos',
    preset: 'hoy'
  });

  useEffect(() => {
    if (typeof triggerChange === 'function') {
      triggerChange(filters);
    }
  }, [filters]);

  const handleChange = (key, value) => {
    if (key === 'desde' || key === 'hasta') {
      setActivePreset('custom');
    }
    setFilters(prev => ({
      ...prev,
      [key]: value,
      preset: (key === 'desde' || key === 'hasta') ? 'custom' : prev.preset
    }));
  };

  const handleDatePreset = (preset) => {
    const today = new Date();
    let desde = '';
    let hasta = getLocalDateStr(today);

    if (preset === 'hoy') {
      desde = hasta;
    } else if (preset === 'ayer') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      desde = getLocalDateStr(yesterday);
      hasta = desde;
    } else if (preset === 'semana') {
      const firstDay = new Date(today);
      firstDay.setDate(today.getDate() - today.getDay());
      desde = getLocalDateStr(firstDay);
      hasta = getLocalDateStr(today);
    } else if (preset === 'mes') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      desde = getLocalDateStr(firstDay);
      hasta = getLocalDateStr(today);
    } else if (preset === 'anio') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      desde = getLocalDateStr(firstDay);
      hasta = getLocalDateStr(today);
    } else if (preset === 'todo') {
      desde = '';
      hasta = '';
    }

    setActivePreset(preset);
    setFilters(prev => ({ ...prev, desde, hasta, preset }));
  };

  const clearFilters = () => {
    const t = getLocalDateStr(new Date());
    setActivePreset('hoy');
    setFilters({
      desde: t,
      hasta: t,
      cliente: '',
      productoId: '',
      estado: 'Todas',
      tipoCliente: 'Todos',
      preset: 'hoy'
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

  const getBtnStyle = (presetKey) => {
    const isActive = activePreset === presetKey;
    return {
      background: isActive ? '#2563eb' : '#f1f5f9',
      color: isActive ? '#ffffff' : '#334155',
      border: `1px solid ${isActive ? '#1d4ed8' : '#cbd5e1'}`,
      padding: '7px 15px',
      borderRadius: '18px',
      fontSize: '0.8rem',
      fontWeight: '700',
      cursor: 'pointer',
      boxShadow: isActive ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
      transition: 'all 0.15s'
    };
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
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#475569', marginRight: '4px', fontWeight: '700' }}>📅 Periodo:</span>
          <button type="button" onClick={() => handleDatePreset('hoy')} style={getBtnStyle('hoy')}>Hoy</button>
          <button type="button" onClick={() => handleDatePreset('ayer')} style={getBtnStyle('ayer')}>Ayer</button>
          <button type="button" onClick={() => handleDatePreset('semana')} style={getBtnStyle('semana')}>Esta Semana</button>
          <button type="button" onClick={() => handleDatePreset('mes')} style={getBtnStyle('mes')}>Este Mes</button>
          <button type="button" onClick={() => handleDatePreset('anio')} style={getBtnStyle('anio')}>Este Año</button>
          <button type="button" onClick={() => handleDatePreset('todo')} style={getBtnStyle('todo')}>Todo el Historial</button>
        </div>

        <button 
          type="button"
          onClick={clearFilters}
          style={{
            background: '#f8fafc',
            color: '#475569',
            border: '1px solid #cbd5e1',
            padding: '6px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: '600'
          }}
        >
          Restablecer a Hoy
        </button>
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
            {(products || []).map(p => (
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
    </div>
  );
};

export default FilterBar;
