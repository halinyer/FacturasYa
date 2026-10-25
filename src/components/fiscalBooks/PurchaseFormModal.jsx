import React from 'react';
import { Building2, X } from 'lucide-react';

export default function PurchaseFormModal({
  editingPurchase,
  purchaseForm,
  setPurchaseForm,
  onTotalAmountChange,
  onSavePurchase,
  onClose
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, backdropFilter: 'blur(3px)', padding: '16px'
    }}>
      <div style={{
        background: '#ffffff', borderRadius: '16px', padding: '24px',
        maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
        border: '1px solid #eaedf2', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: '800' }}>
            <Building2 size={22} color="#2563eb" />
            {editingPurchase ? 'Editar Factura de Compra' : 'Registrar Factura de Compra (Proveedor)'}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSavePurchase}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Fecha Factura *</label>
              <input
                type="date"
                required
                value={purchaseForm.date}
                onChange={e => setPurchaseForm(prev => ({ ...prev, date: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Tipo de Transacción</label>
              <select
                value={purchaseForm.transactionType}
                onChange={e => setPurchaseForm(prev => ({ ...prev, transactionType: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              >
                <option value="01-REG">01-REG (Factura Regular)</option>
                <option value="02-COMP">02-COMP (Complemento)</option>
                <option value="03-ANUL">03-ANUL (Anulación)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>RIF Proveedor * (Ej. J-12345678-0)</label>
              <input
                type="text"
                required
                placeholder="J-00000000-0"
                value={purchaseForm.supplierRif}
                onChange={e => setPurchaseForm(prev => ({ ...prev, supplierRif: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textTransform: 'uppercase' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Razón Social Proveedor *</label>
              <input
                type="text"
                required
                placeholder="Distribuidora Polar C.A."
                value={purchaseForm.supplierName}
                onChange={e => setPurchaseForm(prev => ({ ...prev, supplierName: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Nº Factura del Proveedor *</label>
              <input
                type="text"
                required
                placeholder="0012489"
                value={purchaseForm.invoiceNumber}
                onChange={e => setPurchaseForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Nº Control Fiscal (Factura)</label>
              <input
                type="text"
                placeholder="00-004589"
                value={purchaseForm.controlNumber}
                onChange={e => setPurchaseForm(prev => ({ ...prev, controlNumber: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b', display: 'block', marginBottom: '10px' }}>
              💵 Desglose Tributario de la Factura (Bolívares)
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '3px' }}>Total Factura con IVA (Bs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ej. 1160.00"
                  value={purchaseForm.totalAmountBs}
                  onChange={e => onTotalAmountChange(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: '700' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '3px' }}>Compras Exentas (Bs.)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={purchaseForm.exemptAmountBs}
                  onChange={e => {
                    const ex = e.target.value;
                    setPurchaseForm(prev => ({ ...prev, exemptAmountBs: ex }));
                  }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '3px' }}>Base Imponible (Bs.)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="1000.00"
                  value={purchaseForm.taxableBaseBs}
                  onChange={e => setPurchaseForm(prev => ({ ...prev, taxableBaseBs: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#2563eb', fontWeight: '700' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '3px' }}>IVA 16% Crédito Fiscal (Bs.)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="160.00"
                  value={purchaseForm.ivaBs}
                  onChange={e => setPurchaseForm(prev => ({ ...prev, ivaBs: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#059669', fontWeight: '700' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '3px' }}>IVA Retenido (Bs.) (Si aplica)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={purchaseForm.ivaRetainedBs}
                  onChange={e => setPurchaseForm(prev => ({ ...prev, ivaRetainedBs: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '3px' }}>Categoría de Compra</label>
                <select
                  value={purchaseForm.category}
                  onChange={e => setPurchaseForm(prev => ({ ...prev, category: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="Materia Prima / Alimentos">Materia Prima / Alimentos</option>
                  <option value="Bebidas y Refrescos">Bebidas y Refrescos</option>
                  <option value="Empaques y Desechables">Empaques y Desechables</option>
                  <option value="Servicios y Mantenimiento">Servicios y Mantenimiento</option>
                  <option value="Limpieza y Aseo">Limpieza y Aseo</option>
                  <option value="Alquiler">Alquiler</option>
                  <option value="Otros Gastos">Otros Gastos</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '9px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontWeight: '700', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{ padding: '9px 22px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
            >
              {editingPurchase ? 'Guardar Cambios' : 'Registrar en Libro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
