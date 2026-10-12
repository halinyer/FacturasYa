import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { Search, Plus, User, X, Edit3, Check, UserCheck, Sparkles } from 'lucide-react';

const ClientSearch = ({ onSelect, selected }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [isEditingGeneric, setIsEditingGeneric] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCedula, setCustomCedula] = useState('');
  
  const [newClient, setNewClient] = useState({ name: '', cedula: '', phone: '', type: 'normal' });
  
  const { clients = [], addClient } = useData() || {};
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter registered clients
  const filteredClients = (clients || []).filter(c => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    const name = (c.name || '').toLowerCase();
    const cedula = (c.cedula || '').toLowerCase();
    const phone = (c.phone || '').toLowerCase();
    return name.includes(q) || cedula.includes(q) || phone.includes(q);
  });

  const handleSelect = (client) => {
    if (onSelect) onSelect(client);
    setIsOpen(false);
    setQuery('');
    setIsEditingGeneric(false);
  };

  const handleSaveCustomGeneric = (e) => {
    e.preventDefault();
    const customClient = {
      id: selected?.id || 'generic',
      name: customName.trim() || 'Consumidor Final',
      cedula: customCedula.trim() || 'V-00000000',
      type: selected?.type || 'normal'
    };
    if (onSelect) onSelect(customClient);
    setIsEditingGeneric(false);
  };

  const handleCreateClient = (e) => {
    e.preventDefault();
    const clientToCreate = {
      ...newClient,
      name: newClient.name.trim(),
      cedula: newClient.cedula.trim()
    };
    const created = addClient ? addClient(clientToCreate) : clientToCreate;
    if (onSelect) onSelect(created || { ...clientToCreate, id: Date.now().toString() });
    setShowNewForm(false);
    setIsOpen(false);
    setNewClient({ name: '', cedula: '', phone: '', type: 'normal' });
  };

  // If client is selected
  if (selected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          padding: '12px 14px', background: '#fffdfa', border: '1.5px solid #fde68a', 
          borderRadius: '12px', color: '#111827', boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '34px', height: '34px', borderRadius: '10px', 
              background: selected.type === 'congelador' ? '#ede9fe' : '#fef3c7', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: selected.type === 'congelador' ? '1px solid #ddd6fe' : '1px solid #fde68a'
            }}>
              <User size={18} color={selected.type === 'congelador' ? '#7c3aed' : '#d97706'} />
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#111827' }}>
                {selected.name}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{selected.cedula || 'V-00000000'}</span>
                <span>•</span>
                <span style={{ 
                  color: selected.type === 'congelador' ? '#7c3aed' : '#059669', 
                  fontWeight: '700' 
                }}>
                  {selected.type === 'congelador' ? '❄️ Congelador (Crédito)' : '👤 Normal'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button 
              type="button"
              onClick={() => {
                setCustomName(selected.name === 'Cliente Genérico' ? '' : selected.name);
                setCustomCedula(selected.cedula === 'V-00000000' ? '' : selected.cedula);
                setIsEditingGeneric(!isEditingGeneric);
              }}
              title="Personalizar nombre/cédula en factura"
              style={{
                background: isEditingGeneric ? '#f59e0b' : '#fef3c7',
                color: isEditingGeneric ? '#ffffff' : '#b45309',
                border: '1px solid #fde68a', padding: '6px 10px', borderRadius: '8px',
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <Edit3 size={13} /> {isEditingGeneric ? 'Cerrar' : 'Editar'}
            </button>

            <button 
              type="button"
              onClick={() => onSelect(null)}
              title="Cambiar cliente"
              style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Quick Edit Popup / Inline Form */}
        {isEditingGeneric && (
          <form onSubmit={handleSaveCustomGeneric} style={{
            background: '#ffffff', border: '1px solid #fde68a',
            borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#b45309' }}>
              Modificar datos para esta factura:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#6b7280', display: 'block', marginBottom: '3px', fontWeight: '600' }}>Nombre / Razón Social</label>
                <input
                  type="text"
                  placeholder="Ej: Carlos Silva"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '6px', color: '#111827', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#6b7280', display: 'block', marginBottom: '3px', fontWeight: '600' }}>C.I / RIF</label>
                <input
                  type="text"
                  placeholder="Ej: V-18234567"
                  value={customCedula}
                  onChange={e => setCustomCedula(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '6px', color: '#111827', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
              <button
                type="submit"
                style={{ padding: '6px 14px', background: '#f59e0b', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Check size={14} /> Aplicar a Factura
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      
      {/* Search Input Button */}
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input 
          type="text" 
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar cliente registrado o genérico..."
          style={{ 
            width: '100%', padding: '12px 14px 12px 40px', 
            background: '#ffffff', border: isOpen ? '1.5px solid #f59e0b' : '1px solid #d1d5db', 
            borderRadius: '12px', color: '#111827', outline: 'none',
            boxSizing: 'border-box', fontSize: '0.88rem', fontWeight: '500',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)', transition: 'border-color 0.2s'
          }}
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{ 
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#ffffff', border: '1px solid #e5e7eb', 
          borderRadius: '12px', zIndex: 100, boxShadow: '0 12px 30px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden', maxHeight: '340px', display: 'flex', flexDirection: 'column'
        }}>
          {!showNewForm ? (
            <>
              {/* Option 1: Quick Generic Sale */}
              <div 
                onClick={() => handleSelect({ id: 'generic', name: 'Cliente Genérico', cedula: 'V-00000000', type: 'normal' })}
                style={{ 
                  padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffdfa'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#fef3c7'}
                onMouseOut={(e) => e.currentTarget.style.background = '#fffdfa'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.1rem' }}>⚡</span>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#b45309' }}>Cliente Genérico (Venta Rápida)</div>
                    <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Consumidor Final • Cédula V-00000000</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', fontWeight: '700' }}>
                  Elegir
                </span>
              </div>

              {/* Registered Clients List */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <div style={{ padding: '8px 16px 4px 16px', fontSize: '0.72rem', color: '#6b7280', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {query ? `Resultados (${filteredClients.length})` : `Clientes Registrados (${filteredClients.length})`}
                </div>

                {filteredClients.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
                    No se encontró "{query}". Puedes crearlo con el botón de abajo.
                  </div>
                ) : (
                  filteredClients.map(client => (
                    <div 
                      key={client.id}
                      onClick={() => handleSelect(client)}
                      style={{ 
                        padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.15s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                          width: '28px', height: '28px', borderRadius: '8px', 
                          background: client.type === 'congelador' ? '#ede9fe' : '#f3f4f6',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <User size={14} color={client.type === 'congelador' ? '#7c3aed' : '#6b7280'} />
                        </div>
                        <div>
                          <div style={{ color: '#111827', fontWeight: '700', fontSize: '0.88rem' }}>{client.name}</div>
                          <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>{client.cedula} {client.phone ? `• ${client.phone}` : ''}</div>
                        </div>
                      </div>
                      <span style={{ 
                        fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', fontWeight: '700',
                        background: client.type === 'congelador' ? '#ede9fe' : '#f3f4f6',
                        color: client.type === 'congelador' ? '#7c3aed' : '#4b5563'
                      }}>
                        {client.type === 'congelador' ? 'Congelador' : 'Normal'}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Create New Client Action */}
              <div 
                onClick={() => setShowNewForm(true)}
                style={{ 
                  padding: '12px 16px', cursor: 'pointer', color: '#b45309', 
                  display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '0.85rem',
                  borderTop: '1px solid #eaedf2', background: '#fffbeb'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#fef3c7'}
                onMouseOut={(e) => e.currentTarget.style.background = '#fffbeb'}
              >
                <Plus size={16} /> + Registrar Nuevo Cliente
              </div>
            </>
          ) : (
            <form onSubmit={handleCreateClient} style={{ padding: '18px', color: '#111827' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', marginBottom: '14px', color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={16} /> Nuevo Cliente
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: '#6b7280', fontWeight: '600' }}>Nombre Completo *</label>
                <input required type="text" placeholder="Ej: Pedro Pérez" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})}
                  style={{ width: '100%', padding: '8px 10px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '6px', color: '#111827', boxSizing: 'border-box', fontSize: '0.85rem' }} />
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: '#6b7280', fontWeight: '600' }}>Cédula / RIF *</label>
                <input required type="text" placeholder="Ej: V-12345678" value={newClient.cedula} onChange={e => setNewClient({...newClient, cedula: e.target.value})}
                  style={{ width: '100%', padding: '8px 10px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '6px', color: '#111827', boxSizing: 'border-box', fontSize: '0.85rem' }} />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: '#6b7280', fontWeight: '600' }}>Teléfono (Opcional)</label>
                <input type="text" placeholder="Ej: 0414-1234567" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})}
                  style={{ width: '100%', padding: '8px 10px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '6px', color: '#111827', boxSizing: 'border-box', fontSize: '0.85rem' }} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: '#6b7280', fontWeight: '600' }}>Tipo de Cliente</label>
                <select 
                  value={newClient.type} 
                  onChange={e => setNewClient({...newClient, type: e.target.value})}
                  style={{ width: '100%', padding: '8px 10px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '6px', color: '#111827', boxSizing: 'border-box', outline: 'none', fontSize: '0.85rem' }}
                >
                  <option value="normal">Normal (Pago de Contado)</option>
                  <option value="congelador">❄️ Congelador (Permite Deuda / Crédito)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowNewForm(false)}
                  style={{ padding: '7px 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#6b7280', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                >
                  Volver
                </button>
                <button 
                  type="submit"
                  style={{ padding: '7px 16px', background: '#f59e0b', border: 'none', color: '#ffffff', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem' }}
                >
                  Guardar y Seleccionar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientSearch;
