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
      if (formData.id) {
        updateClient(formData.id, formData);
        showToast('Cliente actualizado correctamente', 'success');
        if (selectedClient && selectedClient.id === formData.id) {
          setSelectedClient({ ...selectedClient, ...formData });
        }
      } else {
        addClient(formData);
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
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: '#111827' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>Gestión de Clientes</h1>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
            Administración de cuentas corrientes, clientes congelador y deudas
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
            background: '#f59e0b', color: '#ffffff', border: 'none', borderRadius: '8px',
            fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem'
          }}
        >
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input
            type="text"
            placeholder="Buscar por nombre o cédula..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 42px', background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#111827',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['Todos', 'Normal', 'Congelador'].map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              style={{
                padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                background: filter === tab ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: filter === tab ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                color: filter === tab ? '#38bdf8' : '#94a3b8', fontWeight: filter === tab ? '600' : '400'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Client Cards & Detail Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedClient ? '1fr 1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        
        {/* Client Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredClients.map(c => {
            const hist = getClientHistory(c.id);
            const isSelected = selectedClient?.id === c.id;

            return (
              <div
                key={c.id}
                onClick={() => setSelectedClient(c)}
                style={{
                  background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.7)',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: '1.05rem', color: '#111827' }}>{c.name}</h3>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>CI/RIF: {c.cedula}</span>
                  </div>
                  <span style={{
                    fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', fontWeight: '600',
                    background: c.type === 'congelador' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(56, 189, 248, 0.1)',
                    color: c.type === 'congelador' ? '#c084fc' : '#38bdf8'
                  }}>
                    {c.type === 'congelador' ? 'Congelador (Crédito)' : 'Normal'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                  <div style={{ color: '#6b7280' }}>
                    Total facturas: <strong>{hist.invoices.length}</strong>
                  </div>
                  <div>
                    {c.type === 'congelador' ? (
                      <span style={{ color: hist.debt > 0 ? '#f87171' : '#34d399', fontWeight: '700' }}>
                        {hist.debt > 0 ? `Debe: $${hist.debt.toFixed(2)}` : 'Al día ($0.00)'}
                      </span>
                    ) : (
                      <span style={{ color: '#34d399' }}>Total: ${hist.totalBought.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Client Detail Panel */}
        {selectedClient && (
          <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.3rem' }}>{selectedClient.name}</h2>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  {selectedClient.cedula} • {selectedClient.phone || 'Sin teléfono'} • {selectedClient.address || 'Sin dirección'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenModal(selectedClient)}
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#111827', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Financial Summary */}
            {(() => {
              const hist = getClientHistory(selectedClient.id);
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Comprado</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>${hist.totalBought.toFixed(2)}</div>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#34d399' }}>Total Pagado</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#34d399' }}>${hist.totalPaid.toFixed(2)}</div>
                    </div>
                    <div style={{ background: hist.debt > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: hist.debt > 0 ? '#f87171' : '#94a3b8' }}>Deuda Pendiente</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700', color: hist.debt > 0 ? '#f87171' : '#f8fafc' }}>
                        ${hist.debt.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Register Payment Button for Congelador */}
                  {selectedClient.type === 'congelador' && hist.debt > 0 && !showPaymentForm && (
                    <button
                      type="button"
                      onClick={() => setShowPaymentForm(true)}
                      style={{ width: '100%', padding: '10px', background: '#f59e0b', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', marginBottom: '16px' }}
                    >
                      + Registrar Pago / Abono
                    </button>
                  )}

                  {/* Payment form */}
                  {showPaymentForm && (
                    <form onSubmit={handleRegisterPayment} style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#38bdf8' }}>Registrar Pago / Abono</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Monto ($ USD) *</label>
                          <input
                            required
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={paymentData.amount}
                            onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
                            style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #d1d5db', color: '#111827', borderRadius: '4px', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Referencia (Pago Móvil / Zelle)</label>
                          <input
                            type="text"
                            placeholder="Ref #1234..."
                            value={paymentData.reference}
                            onChange={e => setPaymentData({ ...paymentData, reference: e.target.value })}
                            style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #d1d5db', color: '#111827', borderRadius: '4px', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button type="button" onClick={() => setShowPaymentForm(false)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #d1d5db', color: '#111827', borderRadius: '4px', cursor: 'pointer' }}>
                          Cancelar
                        </button>
                        <button type="submit" style={{ padding: '6px 16px', background: '#10b981', color: '#0f172a', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}>
                          Confirmar Abono
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Invoices list */}
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#6b7280' }}>Facturas del Cliente</h4>
                  <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {hist.invoices.length === 0 ? (
                      <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No hay facturas registradas.</div>
                    ) : (
                      hist.invoices.map(inv => (
                        <div
                          key={inv.id}
                          style={{
                            padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '600' }}>{inv.invoiceNumber}</div>
                            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                              {inv.date ? new Date(inv.date).toLocaleDateString('es-VE') : '-'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: '700' }}>${Number(inv.totalUSD).toFixed(2)}</div>
                              <div style={{ fontSize: '0.75rem', color: (inv.status === 'paid' || inv.status === 'Pagada') ? '#34d399' : '#f87171' }}>
                                {(inv.status === 'paid' || inv.status === 'Pagada') ? 'Pagada' : 'Pendiente'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedInvoice(inv)}
                              style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              Ver
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              );
            })()}

          </div>
        )}

      </div>

      {/* Add / Edit Client Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '480px', border: '1px solid #d1d5db' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>
              {formData.id ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h3>
            
            <form onSubmit={handleSaveClient} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>Nombre Completo *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #d1d5db', color: '#111827', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>Cédula / RIF *</label>
                <input
                  required
                  type="text"
                  value={formData.cedula}
                  onChange={e => setFormData({ ...formData, cedula: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #d1d5db', color: '#111827', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>Teléfono</label>
                <input
                  type="text"
                  placeholder="0412-1234567"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #d1d5db', color: '#111827', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>Dirección</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #d1d5db', color: '#111827', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>Tipo de Cliente</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #d1d5db', color: '#111827', borderRadius: '6px', boxSizing: 'border-box' }}
                >
                  <option value="normal">Normal (Pago de contado)</option>
                  <option value="congelador">Congelador (Cliente con crédito)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #d1d5db', color: '#111827', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', background: '#f59e0b', border: 'none', color: '#ffffff', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Guardar
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

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#111827', padding: '10px 20px', borderRadius: '24px',
          fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1000
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

    </div>
  );
};

export default Clients;
