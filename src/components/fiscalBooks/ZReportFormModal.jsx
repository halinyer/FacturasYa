import React, { useState } from 'react';
import { Cpu, X, FileText, CheckCircle } from 'lucide-react';

export default function ZReportFormModal({
  isOpen,
  onClose,
  onSave,
  editingZ = null,
  defaultMachineSerial = 'Z1B1234567'
}) {
  const [form, setForm] = useState(() => {
    if (editingZ) {
      return {
        zNumber: editingZ.zNumber || '',
        zDate: editingZ.zDate || new Date().toISOString().split('T')[0],
        registeredMachineNumber: editingZ.registeredMachineNumber || defaultMachineSerial,
        firstInvoiceNumber: editingZ.firstInvoiceNumber || '',
        lastInvoiceNumber: editingZ.lastInvoiceNumber || '',
        totalSalesBs: editingZ.totalSalesBs || '',
        exemptSalesBs: editingZ.exemptSalesBs || '0',
        baseGeneral16Bs: editingZ.baseGeneral16Bs || '',
        taxGeneral16Bs: editingZ.taxGeneral16Bs || '',
        igtfBs: editingZ.igtfBs || '0',
        devolutionsBs: editingZ.devolutionsBs || '0'
      };
    }
    return {
      zNumber: '',
      zDate: new Date().toISOString().split('T')[0],
      registeredMachineNumber: defaultMachineSerial,
      firstInvoiceNumber: '',
      lastInvoiceNumber: '',
      totalSalesBs: '',
      exemptSalesBs: '0',
      baseGeneral16Bs: '',
      taxGeneral16Bs: '',
      igtfBs: '0',
      devolutionsBs: '0'
    };
  });

  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleTotalChange = (val) => {
    const total = parseFloat(val) || 0;
    const exempt = parseFloat(form.exemptSalesBs) || 0;
    const taxable = Math.max(0, total - exempt);
    const base = Number((taxable / 1.16).toFixed(2));
    const tax = Number((taxable - base).toFixed(2));

    setForm(prev => ({
      ...prev,
      totalSalesBs: val,
      baseGeneral16Bs: base > 0 ? String(base) : '',
      taxGeneral16Bs: tax > 0 ? String(tax) : ''
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.zNumber) {
      setErrorMsg('Debes ingresar el Número del Reporte Z (ej: 45)');
      return;
    }
    const tot = parseFloat(form.totalSalesBs);
    if (isNaN(tot) || tot <= 0) {
      setErrorMsg('Debes ingresar el Total de Ventas en Bs.');
      return;
    }

    const exempt = parseFloat(form.exemptSalesBs) || 0;
    const base = parseFloat(form.baseGeneral16Bs) || Math.max(0, tot - exempt) / 1.16;
    const tax = parseFloat(form.taxGeneral16Bs) || (base * 0.16);
    const igtf = parseFloat(form.igtfBs) || 0;
    const dev = parseFloat(form.devolutionsBs) || 0;

    const payload = {
      zNumber: parseInt(form.zNumber, 10),
      zDate: form.zDate,
      registeredMachineNumber: (form.registeredMachineNumber || defaultMachineSerial).trim().toUpperCase(),
      firstInvoiceNumber: parseInt(form.firstInvoiceNumber, 10) || 1,
      lastInvoiceNumber: parseInt(form.lastInvoiceNumber, 10) || parseInt(form.firstInvoiceNumber, 10) || 1,
      totalSalesBs: Number(tot.toFixed(2)),
      exemptSalesBs: Number(exempt.toFixed(2)),
      baseGeneral16Bs: Number(base.toFixed(2)),
      taxGeneral16Bs: Number(tax.toFixed(2)),
      igtfBs: Number(igtf.toFixed(2)),
      devolutionsBs: Number(dev.toFixed(2)),
      source: 'manual'
    };

    onSave(payload);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2500, backdropFilter: 'blur(4px)', padding: '16px'
    }}>
      <div style={{
        background: '#ffffff', borderRadius: '16px', maxWidth: '620px', width: '100%',
        maxHeight: '90vh', overflowY: 'auto', border: '1px solid #cbd5e1',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', color: '#0f172a', padding: '24px'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: '#e0f2fe', borderRadius: '10px', color: '#0284c7' }}>
              <Cpu size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>
                {editingZ ? 'Editar Reporte Z' : 'Registrar Reporte Z'}
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Asiento fiscal diario para el Libro de Ventas (Máquinas Fiscales)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px', fontWeight: '600' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Identificación del Cierre */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>
                Nº de Reporte Z *
              </label>
              <input
                type="number"
                placeholder="Ej: 12"
                value={form.zNumber}
                onChange={e => { setForm({ ...form, zNumber: e.target.value }); setErrorMsg(''); }}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontWeight: '800', color: '#0284c7' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>
                Fecha del Cierre Z *
              </label>
              <input
                type="date"
                value={form.zDate}
                onChange={e => setForm({ ...form, zDate: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>
                Serial de Máquina Fiscal
              </label>
              <input
                type="text"
                placeholder="Ej: Z1B1234567"
                value={form.registeredMachineNumber}
                onChange={e => setForm({ ...form, registeredMachineNumber: e.target.value.toUpperCase() })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', textTransform: 'uppercase' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>
                  Factura Desde:
                </label>
                <input
                  type="number"
                  placeholder="0001"
                  value={form.firstInvoiceNumber}
                  onChange={e => setForm({ ...form, firstInvoiceNumber: e.target.value })}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>
                  Hasta:
                </label>
                <input
                  type="number"
                  placeholder="0045"
                  value={form.lastInvoiceNumber}
                  onChange={e => setForm({ ...form, lastInvoiceNumber: e.target.value })}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                />
              </div>
            </div>
          </div>

          {/* Desglose Fiscal en Bolívares */}
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b', display: 'block', marginBottom: '10px' }}>
              💵 Montos Oficiales del Reporte Z (Bolívares)
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '3px' }}>
                  Total Ventas Incl. IVA (Bs.) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.totalSalesBs}
                  onChange={e => handleTotalChange(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #2563eb', fontSize: '0.92rem', fontWeight: '800', color: '#1e40af' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '3px' }}>
                  Ventas Exentas (Bs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.exemptSalesBs}
                  onChange={e => {
                    const ex = e.target.value;
                    setForm(prev => ({ ...prev, exemptSalesBs: ex }));
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '3px' }}>
                  Base Imponible 16% (Bs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.baseGeneral16Bs}
                  onChange={e => setForm({ ...form, baseGeneral16Bs: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: '700', color: '#2563eb' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '3px' }}>
                  Débito Fiscal IVA 16% (Bs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.taxGeneral16Bs}
                  onChange={e => setForm({ ...form, taxGeneral16Bs: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: '700', color: '#059669' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '3px' }}>
                  IGTF 3% Percibido (Bs.) (Si aplica)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.igtfBs}
                  onChange={e => setForm({ ...form, igtfBs: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '3px' }}>
                  Devoluciones / Notas Crédito (Bs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.devolutionsBs}
                  onChange={e => setForm({ ...form, devolutionsBs: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                />
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '9px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: '9px 24px', background: '#0284c7', color: '#ffffff',
                border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem',
                boxShadow: '0 2px 4px rgba(2,132,199,0.3)'
              }}
            >
              {editingZ ? 'Guardar Cambios' : 'Registrar Reporte Z'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
