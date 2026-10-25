import React, { useState, useMemo } from 'react';
import { Search, Plus, User, FileText, DollarSign, X, CheckCircle, AlertCircle, Phone, MapPin, CreditCard } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import InvoicePreview from '../components/InvoicePreview';

const Clients = () => {
  const { clients = [], addClient, updateClient, invoices = [], payments = [], addPayment } = useData() || {};
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [toast, setToast] = useState(null);
  
  const [formData, setFormData] = useState({
    id: null, name: '', cedula: '', phone: '', address: '', type: 'normal'
  });

  const [paymentData, setPaymentData] = useState({ amount: '', reference: '', currency: 'USD' });
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Filter clients
  const filteredClients = useMemo(() => {
    return (clients || []).filter(c => {
      const q = search.toLowerCase();
      const matchesSearch = (c.name || '').toLowerCase().includes(q) || (c.cedula || '').toLowerCase().includes(q);
      const matchesFilter = filter === 'Todos' ? true : (c.type || 'normal').toLowerCase() === filter.toLowerCase();
      return matchesSearch && matchesFilter;
    });
  }, [clients, search, filter]);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenModal = (client = null) => {
    if (client) {
      setFormData({
        id: client.id,
        name: client.name || '',
        cedula: client.cedula || '',
        phone: client.phone || '',
        address: client.address || '',
        type: client.type || 'normal'
      });
    } else {
      setFormData({ id: null, name: '', cedula: '', phone: '', address: '', type: 'normal' });
    }
    setIsModalOpen(true);
  };

  const handleSaveClient = (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: (formData.name || '').trim(),
        cedula: (formData.cedula || '').trim(),
        phone: (formData.phone || '').trim(),
        address: (formData.address || '').trim(),
        type: formData.type || 'normal'
      };
      if (formData.id) {
        const updated = updateClient(formData.id, payload);
        showToast('Cliente actualizado correctamente', 'success');
        if (selectedClient && selectedClient.id === formData.id) {
          setSelectedClient(updated || { ...selectedClient, ...payload, id: formData.id });
        }
      } else {
        const created = addClient(payload);
        if (created) {
          setSelectedClient(created);
        }
        showToast('Cliente creado exitosamente', 'success');
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast('Error al guardar cliente', 'error');
    }
  };

  // Calculate client history & balances
  const getClientHistory = (clientId) => {
    const clientInvoices = (invoices || []).filter(inv => inv.clientId === clientId);
    const clientPayments = (payments || []).filter(p => p.clientId === clientId);
    
    let totalBought = 0;
    let totalPaid = 0;
    let debt = 0;

    clientInvoices.forEach(inv => {
      const totalUSD = Number(inv.totalUSD) || 0;
      const stat = (inv.status || '').toLowerCase();
      totalBought += totalUSD;
      if (stat === 'paid' || stat === 'pagada') {
        totalPaid += totalUSD;
      } else if (stat === 'partial' || stat === 'parcial') {
        const paid = Number(inv.paidAmountUSD) || 0;
        totalPaid += paid;
        debt += (totalUSD - paid);
      } else {
        debt += totalUSD;
      }
    });

    return {
      invoices: clientInvoices.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
      payments: clientPayments.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
      totalBought,
      totalPaid,
      debt
    };
  };

  const handleRegisterPayment = (e) => {
    e.preventDefault();
    if (!selectedClient) return;
    
    const amt = parseFloat(paymentData.amount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Ingresa un monto válido', 'error');
      return;
    }

    try {
      addPayment({
        clientId: selectedClient.id,
        amount: amt,
        currency: paymentData.currency || 'USD',
        reference: paymentData.reference || 'Abono / Pago Móvil',
        date: new Date().toISOString()
      });

      showToast('Abono registrado con éxito', 'success');
      setShowPaymentForm(false);
      setPaymentData({ amount: '', reference: '', currency: 'USD' });
    } catch (error) {
      showToast('Error al registrar abono', 'error');
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', color: '#0f172a', minHeight: '100%', fontFamily: 'inherit' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '800', letterSpacing: '-0.5px', color: '#0f172a' }}>
            Gestión de Clientes
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Administración de cuentas corrientes, clientes congelador (a crédito) y estados de cuenta
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 18px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff',
            border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)', transition: 'all 0.15s ease'
          }}
        >
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '22px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar por nombre o cédula / RIF..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '11px 14px 11px 42px', background: '#ffffff',
              border: '1.5px solid #cbd5e1', borderRadius: '12px', color: '#0f172a',
              outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem', fontWeight: '600',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)', transition: 'border-color 0.15s ease'
            }}
            onFocus={e => e.target.style.borderColor = '#2563eb'}
            onBlur={e => e.target.style.borderColor = '#cbd5e1'}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['Todos', 'Normal', 'Mayorista', 'Congelador', 'Microdistribuidor'].map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              style={{
                padding: '9px 18px', borderRadius: '12px', cursor: 'pointer',
                background: filter === tab ? '#eff6ff' : '#ffffff',
                border: filter === tab ? '1.5px solid #2563eb' : '1.5px solid #e2e8f0',
                color: filter === tab ? '#1d4ed8' : '#64748b', fontWeight: filter === tab ? '800' : '600',
                fontSize: '0.86rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', transition: 'all 0.15s ease'
              }}
            >
              {tab === 'Congelador' ? '❄️ Congelador' : tab === 'Microdistribuidor' ? '🛵 Microdistribuidor' : tab === 'Mayorista' ? '📦 Mayorista' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Client Cards & Detail Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedClient ? '1fr 1.1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px', alignItems: 'start' }}>
        
        {/* Client Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredClients.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '36px', textAlign: 'center', color: '#64748b' }}>
              <User size={36} color="#cbd5e1" style={{ margin: '0 auto 10px auto' }} />
              <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a' }}>No se encontraron clientes</div>
              <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Prueba con otro término de búsqueda o crea uno nuevo con el botón superior.</div>
            </div>
          ) : (
            filteredClients.map(c => {
              const hist = getClientHistory(c.id);
              const isSelected = selectedClient?.id === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedClient(c)}
                  style={{
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    border: isSelected ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                    borderRadius: '14px', padding: '16px', cursor: 'pointer',
                    boxShadow: isSelected ? '0 4px 14px rgba(37, 99, 235, 0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: c.type === 'congelador' ? '#fef3c7' : '#eff6ff',
                        color: c.type === 'congelador' ? '#b45309' : '#2563eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '800', fontSize: '0.95rem', flexShrink: 0
                      }}>
                        {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 2px 0', fontSize: '0.98rem', fontWeight: '800', color: '#0f172a' }}>{c.name}</h3>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace', fontWeight: '600' }}>CI/RIF: {c.cedula}</span>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', fontWeight: '700',
                      background: c.type === 'congelador' ? '#fef3c7' : '#f1f5f9',
                      color: c.type === 'congelador' ? '#92400e' : '#475569',
                      border: c.type === 'congelador' ? '1px solid #fde68a' : '1px solid #e2e8f0'
                    }}>
                      {c.type === 'congelador' ? '❄️ Congelador' : c.type === 'microdistribuidor' ? '🛵 Microdist.' : c.type === 'mayorista' ? '📦 Mayorista' : '🛍️ Detal'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.82rem' }}>
                    <div style={{ color: '#64748b' }}>
                      Facturas: <strong style={{ color: '#0f172a' }}>{hist.invoices.length}</strong>
                    </div>
                    <div>
                      {c.type === 'congelador' ? (
                        hist.debt > 0 ? (
                          <span style={{ color: '#b91c1c', background: '#fee2e2', border: '1px solid #fca5a5', padding: '2px 7px', borderRadius: '6px', fontWeight: '800' }}>
                            Debe: ${hist.debt.toFixed(2)}
                          </span>
                        ) : (
                          <span style={{ color: '#15803d', background: '#dcfce7', border: '1px solid #86efac', padding: '2px 7px', borderRadius: '6px', fontWeight: '700' }}>
                            Al día ($0.00)
                          </span>
                        )
                      ) : (
                        <span style={{ color: '#059669', fontWeight: '700' }}>Total: ${hist.totalBought.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Client Detail Panel */}
        {selectedClient && (
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '18px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            position: 'sticky',
            top: '20px'
          }}>
            {/* Header Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>{selectedClient.name}</h2>
                  <span style={{
                    fontSize: '0.72rem', padding: '2px 7px', borderRadius: '6px', fontWeight: '700',
                    background: selectedClient.type === 'congelador' ? '#fef3c7' : '#f1f5f9',
                    color: selectedClient.type === 'congelador' ? '#92400e' : '#475569',
                    border: selectedClient.type === 'congelador' ? '1px solid #fde68a' : '1px solid #e2e8f0'
                  }}>
                    {selectedClient.type === 'congelador' ? '❄️ Cliente Congelador' : selectedClient.type === 'microdistribuidor' ? '🛵 Microdistribuidor' : selectedClient.type === 'mayorista' ? '📦 Mayorista' : '🛍️ Consumidor Detal'}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CreditCard size={14} color="#94a3b8" /> <strong>Cédula / RIF:</strong> {selectedClient.cedula}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Phone size={14} color="#94a3b8" /> {selectedClient.phone || 'Sin teléfono registrado'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={14} color="#94a3b8" /> {selectedClient.address || 'Sin dirección registrada'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenModal(selectedClient)}
                  style={{
                    background: '#f8fafc', color: '#334155', border: '1.5px solid #cbd5e1',
                    padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem',
                    fontWeight: '700', transition: 'all 0.12s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  title="Cerrar panel"
                  style={{
                    background: '#f1f5f9', border: 'none', color: '#64748b',
                    width: '32px', height: '32px', borderRadius: '50%',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Financial Summary */}
            {(() => {
              const hist = getClientHistory(selectedClient.id);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Comprado</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>${hist.totalBought.toFixed(2)}</div>
                    </div>
                    <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                      <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '700', textTransform: 'uppercase' }}>Total Pagado</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#059669', marginTop: '2px' }}>${hist.totalPaid.toFixed(2)}</div>
                    </div>
                    <div style={{
                      background: hist.debt > 0 ? '#fef2f2' : '#f0fdf4',
                      padding: '12px',
                      borderRadius: '12px',
                      border: hist.debt > 0 ? '1.5px solid #fca5a5' : '1px solid #bbf7d0'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: hist.debt > 0 ? '#b91c1c' : '#166534', fontWeight: '700', textTransform: 'uppercase' }}>
                        Deuda Pendiente
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: '900', color: hist.debt > 0 ? '#dc2626' : '#15803d', marginTop: '2px' }}>
                        ${hist.debt.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Register Payment Button for Congelador */}
                  {selectedClient.type === 'congelador' && hist.debt > 0 && !showPaymentForm && (
                    <button
                      type="button"
                      onClick={() => setShowPaymentForm(true)}
                      style={{
                        width: '100%', padding: '11px',
                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        color: '#ffffff', border: 'none', borderRadius: '10px',
                        fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)'
                      }}
                    >
                      + Registrar Pago / Abono de Deuda
                    </button>
                  )}

                  {/* Payment form */}
                  {showPaymentForm && (
                    <form onSubmit={handleRegisterPayment} style={{ background: '#f8fafc', border: '1.5px solid #93c5fd', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', color: '#1e40af', fontWeight: '800' }}>
                        Registrar Abono a la Cuenta
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Monto ($ USD) *</label>
                          <input
                            required
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={paymentData.amount}
                            onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
                            style={{ width: '100%', padding: '9px 10px', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', boxSizing: 'border-box', fontWeight: '700' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Referencia / Banco</label>
                          <input
                            type="text"
                            placeholder="Ref #1234 (Pago Móvil / Zelle)"
                            value={paymentData.reference}
                            onChange={e => setPaymentData({ ...paymentData, reference: e.target.value })}
                            style={{ width: '100%', padding: '9px 10px', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', boxSizing: 'border-box', fontWeight: '600' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button type="button" onClick={() => setShowPaymentForm(false)} style={{ padding: '7px 14px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
                          Cancelar
                        </button>
                        <button type="submit" style={{ padding: '7px 16px', background: '#059669', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '0.82rem' }}>
                          Confirmar Abono
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Invoices List */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Facturas del Cliente
                    </h4>
                    <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {hist.invoices.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: '0.84rem', padding: '16px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px' }}>
                          No hay facturas registradas para este cliente.
                        </div>
                      ) : (
                        hist.invoices.map(inv => (
                          <div
                            key={inv.id}
                            style={{
                              padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: '800', color: '#0f172a' }}>{inv.invoiceNumber}</div>
                              <div style={{ color: '#64748b', fontSize: '0.74rem' }}>
                                {inv.date ? new Date(inv.date).toLocaleDateString('es-VE') : '-'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: '800', color: '#0f172a' }}>${Number(inv.totalUSD).toFixed(2)}</div>
                                <div style={{ fontSize: '0.74rem', fontWeight: '700', color: (inv.status === 'paid' || inv.status === 'Pagada') ? '#059669' : '#dc2626' }}>
                                  {(inv.status === 'paid' || inv.status === 'Pagada') ? 'Pagada' : 'Pendiente'}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedInvoice(inv)}
                                style={{
                                  background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                                  padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.76rem', fontWeight: '700'
                                }}
                              >
                                Ver
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              );
            })()}

          </div>
        )}

      </div>

      {/* Add / Edit Client Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200, padding: '16px'
        }}>
          <div style={{
            background: '#ffffff', padding: '24px', borderRadius: '20px',
            width: '100%', maxWidth: '480px', border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', color: '#0f172a'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '12px',
                  background: '#eff6ff', color: '#2563eb', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', border: '1px solid #bfdbfe'
                }}>
                  <User size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
                    {formData.id ? 'Editar Cliente' : 'Nuevo Cliente'}
                  </h3>
                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Completa los datos del cliente para facturación</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSaveClient} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155', marginBottom: '4px', fontWeight: '700' }}>Nombre Completo *</label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Inversiones Los Roques, Juan Pérez..."
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', borderRadius: '10px', boxSizing: 'border-box', fontWeight: '600', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155', marginBottom: '4px', fontWeight: '700' }}>Cédula / RIF *</label>
                <input
                  required
                  type="text"
                  placeholder="Ej: V-12345678 o J-12345678-0"
                  value={formData.cedula}
                  onChange={e => setFormData({ ...formData, cedula: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', borderRadius: '10px', boxSizing: 'border-box', fontWeight: '700', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155', marginBottom: '4px', fontWeight: '700' }}>Teléfono</label>
                <input
                  type="text"
                  placeholder="Ej: 0412-1234567"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', borderRadius: '10px', boxSizing: 'border-box', fontWeight: '600', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155', marginBottom: '4px', fontWeight: '700' }}>Dirección Fiscal / Entrega</label>
                <input
                  type="text"
                  placeholder="Ej: Av. Principal, Local 4..."
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', borderRadius: '10px', boxSizing: 'border-box', fontWeight: '600', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155', marginBottom: '4px', fontWeight: '700' }}>Tipo de Cliente</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', borderRadius: '10px', boxSizing: 'border-box', fontWeight: '700', fontSize: '0.88rem' }}
                >
                  <option value="normal">🛍️ Consumidor Detal (Tarifa Detal regular)</option>
                  <option value="mayorista">📦 Mayorista (Tarifa Al Mayor fija)</option>
                  <option value="congelador">❄️ Cliente Congelador (Punto con cava / Crédito)</option>
                  <option value="microdistribuidor">🛵 Microdistribuidor (Tarifa revendedor / carritos)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '10px 18px', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#475569', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', border: 'none', color: '#ffffff', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {selectedInvoice && (
        <InvoicePreview
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#ffffff', padding: '11px 22px', borderRadius: '24px',
          fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 3000,
          boxShadow: '0 8px 20px rgba(0,0,0,0.2)', fontSize: '0.88rem'
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

    </div>
  );
};

export default Clients;
