import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { Search, Plus, User, X, Edit3, Check } from 'lucide-react';
import { normalizeCedulaRif } from '../services/dataService';

const ClientSearch = ({ onSelect, selected }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [isEditingGeneric, setIsEditingGeneric] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCedula, setCustomCedula] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customAddress, setCustomAddress] = useState('');

  const [docPrefix, setDocPrefix] = useState('V');
  const [newClient, setNewClient] = useState({ name: '', cedula: '', phone: '', address: '', type: 'normal' });

  const { clients = [], addClient, updateClient } = useData() || {};
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowNewForm(false);
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
    const address = (c.address || '').toLowerCase();
    return name.includes(q) || cedula.includes(q) || phone.includes(q) || address.includes(q);
  });

  const handleSelect = (client) => {
    if (onSelect) onSelect(client);
    setIsOpen(false);
    setShowNewForm(false);
    setQuery('');
    setIsEditingGeneric(false);
  };

  const handleOpenNewForm = () => {
    const trimmed = query.trim();
    let initialName = '';
    let initialCedula = '';
    let prefix = 'V';

    if (trimmed) {
      const m = trimmed.toUpperCase().match(/^([VEJG])[-.\s]?(\d+.*)$/);
      if (m) {
        prefix = m[1];
        initialCedula = m[2].replace(/[^\d-]/g, '');
      } else if (/^[\d.\-\s]+$/.test(trimmed)) {
        initialCedula = trimmed.replace(/[^\d]/g, '');
      } else {
        initialName = trimmed;
      }
    }

    setDocPrefix(prefix);
    setNewClient({
      name: initialName,
      cedula: initialCedula,
      phone: '',
      address: '',
      type: 'normal'
    });
    setIsOpen(true);
    setShowNewForm(true);
  };

  const handleSaveCustomGeneric = (e) => {
    e.preventDefault();
    const cleanName = customName.trim() || 'Consumidor Final';
    const cleanCedula = normalizeCedulaRif(customCedula.trim() || 'V-00000000');
    const cleanPhone = customPhone.trim();
    const cleanAddress = customAddress.trim();

    const updatedClientObj = {
      ...selected,
      id: selected?.id || 'generic',
      name: cleanName,
      cedula: cleanCedula,
      phone: cleanPhone,
      address: cleanAddress,
      type: selected?.type || 'normal'
    };

    if (selected?.id && selected.id !== 'generic' && selected.id !== 'cli_default' && typeof updateClient === 'function') {
      updateClient(selected.id, updatedClientObj);
    }

    if (onSelect) onSelect(updatedClientObj);
    setIsEditingGeneric(false);
  };

  const handleCreateClient = (e) => {
    e.preventDefault();
    const rawCed = (newClient.cedula || '').trim();
    const fullCedula = /^[VEJGP][-]/i.test(rawCed)
      ? normalizeCedulaRif(rawCed)
      : normalizeCedulaRif(`${docPrefix}-${rawCed}`);

    const clientToCreate = {
      name: (newClient.name || '').trim() || 'Cliente',
      cedula: fullCedula,
      phone: (newClient.phone || '').trim(),
      address: (newClient.address || '').trim(),
      type: newClient.type || 'normal'
    };

    const created = addClient ? addClient(clientToCreate) : { ...clientToCreate, id: `cli_${Date.now()}` };
    if (onSelect) onSelect(created || { ...clientToCreate, id: `cli_${Date.now()}` });
    setShowNewForm(false);
    setIsOpen(false);
    setQuery('');
    setNewClient({ name: '', cedula: '', phone: '', address: '', type: 'normal' });
  };

  // If client is selected
  if (selected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          padding: '10px 12px', background: '#fffdfa', border: '1.5px solid #fde68a', 
          borderRadius: '12px', color: '#111827', boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{ 
              width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
              background: selected.type === 'congelador' ? '#ede9fe' : '#fef3c7', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: selected.type === 'congelador' ? '1px solid #ddd6fe' : '1px solid #fde68a'
            }}>
              <User size={16} color={selected.type === 'congelador' ? '#7c3aed' : '#d97706'} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selected.name}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: '700', color: '#374151' }}>{selected.cedula || 'V-00000000'}</span>
                {selected.phone && <span>• 📞 {selected.phone}</span>}
                {selected.address && <span title={selected.address}>• 📍 {selected.address.length > 22 ? selected.address.slice(0, 22) + '...' : selected.address}</span>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            <button 
              type="button"
              onClick={() => {
                setCustomName((selected.name === 'Cliente Genérico' || selected.name === 'Consumidor Final') ? '' : (selected.name || ''));
                setCustomCedula(selected.cedula === 'V-00000000' ? '' : (selected.cedula || ''));
                setCustomPhone(selected.phone || '');
                setCustomAddress(selected.address === 'Mostrador' ? '' : (selected.address || ''));
                setIsEditingGeneric(!isEditingGeneric);
              }}
              title="Personalizar Nombre, RIF, Dirección y Teléfono para la factura"
              style={{
                background: isEditingGeneric ? '#f59e0b' : '#fef3c7',
                color: isEditingGeneric ? '#ffffff' : '#b45309',
                border: '1px solid #fde68a', padding: '5px 8px', borderRadius: '8px',
                cursor: 'pointer', fontSize: '0.73rem', fontWeight: '700',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <Edit3 size={12} /> {isEditingGeneric ? 'Cerrar' : 'Editar'}
            </button>

            <button 
              type="button"
              onClick={() => onSelect(null)}
              title="Cambiar cliente"
              style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', padding: '5px', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Quick Edit Popup / Inline Form */}
        {isEditingGeneric && (
          <form onSubmit={handleSaveCustomGeneric} style={{
            background: '#ffffff', border: '1.5px solid #fde68a',
            borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#b45309' }}>
              Datos Fiscales del Cliente para la Factura SENIAT:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', color: '#4b5563', display: 'block', marginBottom: '2px', fontWeight: '700' }}>Nombre / Razón Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Silva"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '6px', color: '#111827', fontSize: '0.8rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.68rem', color: '#4b5563', display: 'block', marginBottom: '2px', fontWeight: '700' }}>Cédula / RIF *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: V-18234567"
                  value={customCedula}
                  onChange={e => setCustomCedula(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '6px', color: '#111827', fontSize: '0.8rem', boxSizing: 'border-box', fontWeight: '700' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', color: '#4b5563', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Dirección Fiscal</label>
                <input
                  type="text"
                  placeholder="Ej: Av. Principal, Local 2"
                  value={customAddress}
                  onChange={e => setCustomAddress(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '6px', color: '#111827', fontSize: '0.8rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.68rem', color: '#4b5563', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Teléfono</label>
                <input
                  type="text"
                  placeholder="Ej: 0414-1234567"
                  value={customPhone}
                  onChange={e => setCustomPhone(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '6px', color: '#111827', fontSize: '0.8rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '2px' }}>
              <button
                type="submit"
                style={{ padding: '6px 14px', background: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
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
      
      {/* Search Input + Quick New Client Button */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input 
            type="text" 
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); setShowNewForm(false); }}
            onFocus={() => setIsOpen(true)}
            placeholder="Buscar Cédula/RIF o Nombre..."
            style={{ 
              width: '100%', padding: '10px 12px 10px 34px', 
              background: '#ffffff', border: isOpen ? '1.5px solid #f59e0b' : '1px solid #d1d5db', 
              borderRadius: '10px', color: '#111827', outline: 'none',
              boxSizing: 'border-box', fontSize: '0.84rem', fontWeight: '600',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)', transition: 'border-color 0.2s'
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleOpenNewForm}
          title="Registrar un nuevo cliente con RIF / Cédula"
          style={{
            padding: '10px 12px',
            background: '#059669',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: '800',
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(5, 150, 105, 0.2)'
          }}
        >
          <Plus size={15} /> Nuevo
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{ 
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#ffffff', border: '1.5px solid #cbd5e1', 
          borderRadius: '12px', zIndex: 500, boxShadow: '0 16px 36px rgba(0, 0, 0, 0.16)',
          overflow: 'hidden', maxHeight: showNewForm ? '480px' : '340px', display: 'flex', flexDirection: 'column'
        }}>
          {!showNewForm ? (
            <>
              {/* Option 1: Quick Generic Sale */}
              <div 
                onClick={() => handleSelect({ id: 'generic', name: 'Consumidor Final', cedula: 'V-00000000', type: 'normal' })}
                style={{ 
                  padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffdfa'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#fef3c7'}
                onMouseOut={(e) => e.currentTarget.style.background = '#fffdfa'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1rem' }}>⚡</span>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '0.85rem', color: '#b45309' }}>Consumidor Final (Venta Rápida)</div>
                    <div style={{ color: '#6b7280', fontSize: '0.72rem' }}>Sin personalizar • RIF/CI: V-00000000</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', fontWeight: '700' }}>
                  Elegir
                </span>
              </div>

              {/* Registered Clients List */}
              <div style={{ overflowY: 'auto', flex: 1, maxHeight: '220px' }}>
                <div style={{ padding: '7px 14px 4px 14px', fontSize: '0.7rem', color: '#6b7280', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {query ? `Resultados (${filteredClients.length})` : `Clientes Registrados (${filteredClients.length})`}
                </div>

                {filteredClients.length === 0 ? (
                  <div style={{ padding: '14px', textAlign: 'center', color: '#6b7280', fontSize: '0.82rem' }}>
                    No se encontró "{query}". Haz clic abajo para registrarlo al instante.
                  </div>
                ) : (
                  filteredClients.map((client, idx) => (
                    <div 
                      key={client.id || `cli_item_${idx}`}
                      onClick={() => handleSelect(client)}
                      style={{ 
                        padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.15s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f0fdf4'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                        <div style={{ 
                          width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0,
                          background: client.type === 'congelador' ? '#ede9fe' : '#ecfdf5',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <User size={13} color={client.type === 'congelador' ? '#7c3aed' : '#059669'} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#111827', fontWeight: '700', fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {client.name}
                          </div>
                          <div style={{ color: '#6b7280', fontSize: '0.73rem' }}>
                            <strong>{client.cedula}</strong> {client.phone ? `• ${client.phone}` : ''}
                          </div>
                        </div>
                      </div>
                      <span style={{ 
                        fontSize: '0.7rem', padding: '2px 7px', borderRadius: '6px', fontWeight: '700', flexShrink: 0,
                        background: client.type === 'congelador' ? '#ede9fe' : '#f3f4f6',
                        color: client.type === 'congelador' ? '#7c3aed' : '#4b5563'
                      }}>
                        {client.type === 'congelador' ? 'Congelador' : 'Elegir'}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Create New Client Action */}
              <div 
                onClick={handleOpenNewForm}
                style={{ 
                  padding: '11px 14px', cursor: 'pointer', color: '#047857', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '800', fontSize: '0.84rem',
                  borderTop: '1px solid #d1fae5', background: '#ecfdf5'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#d1fae5'}
                onMouseOut={(e) => e.currentTarget.style.background = '#ecfdf5'}
              >
                <Plus size={16} /> Registrar Nuevo Cliente {query ? `("${query}")` : ''}
              </div>
            </>
          ) : (
            <form onSubmit={handleCreateClient} style={{ padding: '14px', color: '#111827', overflowY: 'auto', maxHeight: '460px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={15} /> Registrar Cliente Fiscal
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '2px' }}
                >
                  <X size={15} />
                </button>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', marginBottom: '3px', color: '#374151', fontWeight: '700' }}>
                  Cédula o RIF Fiscal *
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    value={docPrefix}
                    onChange={e => setDocPrefix(e.target.value)}
                    style={{
                      width: '62px', padding: '7px 6px', background: '#f9fafb', border: '1.5px solid #cbd5e1',
                      borderRadius: '6px', color: '#111827', fontWeight: '800', fontSize: '0.82rem', outline: 'none'
                    }}
                  >
                    <option value="V">V-</option>
                    <option value="J">J-</option>
                    <option value="E">E-</option>
                    <option value="G">G-</option>
                    <option value="P">P-</option>
                  </select>
                  <input
                    required
                    type="text"
                    placeholder="Ej: 12345678 o 40123456-7"
                    value={newClient.cedula}
                    onChange={e => setNewClient({ ...newClient, cedula: e.target.value })}
                    autoFocus
                    style={{
                      flex: 1, padding: '7px 10px', background: '#ffffff', border: '1.5px solid #cbd5e1',
                      borderRadius: '6px', color: '#111827', boxSizing: 'border-box', fontSize: '0.84rem', fontWeight: '700'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', marginBottom: '3px', color: '#374151', fontWeight: '700' }}>
                  Nombre Completo o Razón Social *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Pedro Pérez / Inversiones ABC C.A."
                  value={newClient.name}
                  onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '6px', color: '#111827', boxSizing: 'border-box', fontSize: '0.84rem', fontWeight: '600' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', marginBottom: '3px', color: '#4b5563', fontWeight: '600' }}>Teléfono</label>
                  <input
                    type="text"
                    placeholder="Ej: 0414-1234567"
                    value={newClient.phone}
                    onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                    style={{ width: '100%', padding: '7px 8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#111827', boxSizing: 'border-box', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', marginBottom: '3px', color: '#4b5563', fontWeight: '600' }}>Tipo</label>
                  <select 
                    value={newClient.type} 
                    onChange={e => setNewClient({ ...newClient, type: e.target.value })}
                    style={{ width: '100%', padding: '7px 8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#111827', boxSizing: 'border-box', outline: 'none', fontSize: '0.8rem', fontWeight: '600' }}
                  >
                    <option value="normal">Contado</option>
                    <option value="congelador">❄️ Crédito</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', marginBottom: '3px', color: '#4b5563', fontWeight: '600' }}>
                  Dirección Fiscal / Domicilio (Impresa en Factura)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Av. Francisco de Miranda, El Marqués..."
                  value={newClient.address || ''}
                  onChange={e => setNewClient({ ...newClient, address: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#111827', boxSizing: 'border-box', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowNewForm(false)}
                  style={{ padding: '7px 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#4b5563', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700' }}
                >
                  Volver
                </button>
                <button 
                  type="submit"
                  style={{ padding: '7px 16px', background: '#059669', border: 'none', color: '#ffffff', borderRadius: '6px', cursor: 'pointer', fontWeight: '800', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Check size={14} /> Guardar y Seleccionar
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
