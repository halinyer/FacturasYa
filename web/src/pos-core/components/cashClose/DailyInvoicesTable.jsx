import React from 'react';
import { BankLogo, findBank } from '../../utils/venezuelaBanks';

export default function DailyInvoicesTable({
  todaysInvoices = [],
  validCount = 0,
  voidedCount = 0,
  getClientName,
  methodName,
  formatUSD,
  onSelectInvoice,
  onVoidInvoice,
  onRestoreInvoice,
  onDeleteInvoice
}) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #eaedf2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', borderRadius: '12px', padding: '20px', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
          Facturas del Día ({validCount} válidas{voidedCount > 0 ? ` · ${voidedCount} anuladas` : ''})
        </h3>
        <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
          Si la máquina fiscal anuló una factura, presiona <b>🚫 Anular</b> para excluirla de Caja y del Libro SENIAT.
        </span>
      </div>

      {todaysInvoices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
          No hay facturas registradas en la fecha seleccionada.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{ color: '#6b7280', borderBottom: '1px solid #eaedf2', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>Nº / Tipo</th>
              <th style={{ padding: '8px' }}>Cliente</th>
              <th style={{ padding: '8px' }}>Método</th>
              <th style={{ padding: '8px' }}>Total ($)</th>
              <th style={{ padding: '8px' }}>Estado</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {todaysInvoices.map(inv => {
              const stat = (inv.status || '').toLowerCase();
              const isVoided = stat === 'voided' || stat === 'anulada';
              const isPaid = stat === 'paid' || stat === 'pagada';
              const isFiscal = Boolean(inv.isFiscalInvoice || inv.docType === 'fiscal');

              return (
                <tr
                  key={inv.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: isVoided ? '#fef2f2' : 'transparent',
                    opacity: isVoided ? 0.78 : 1
                  }}
                >
                  <td style={{ padding: '8px' }}>
                    <div style={{ fontWeight: '700', color: isVoided ? '#dc2626' : '#0284c7', textDecoration: isVoided ? 'line-through' : 'none' }}>
                      #{inv.invoiceNumber}
                    </div>
                    <span style={{
                      display: 'inline-block',
                      marginTop: '2px',
                      fontSize: '0.68rem',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: '700',
                      background: isFiscal ? '#e0f2fe' : '#f1f5f9',
                      color: isFiscal ? '#0369a1' : '#475569',
                      border: `1px solid ${isFiscal ? '#bae6fd' : '#e2e8f0'}`
                    }}>
                      {isFiscal
                        ? (inv.fiscalInvoiceNumber ? `🏛️ Fiscal Nº ${inv.fiscalInvoiceNumber}` : '🏛️ Fiscal (Sin N° S1)')
                        : '📄 Nota Entrega'}
                    </span>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{getClientName(inv)}</div>
                    {inv.voidReason && isVoided && (
                      <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: '600', marginTop: '2px' }}>
                        Motivo: {inv.voidReason}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontWeight: '600' }}>{methodName(inv.paymentMethod)}</span>
                      {(inv.pagoMovilBank || inv.pagoMovilRef) && (() => {
                        const bInfo = findBank(inv.pagoMovilBank);
                        return (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.72rem',
                            background: bInfo ? bInfo.bg : '#eff6ff',
                            color: bInfo ? bInfo.color : '#1d4ed8',
                            border: `1px solid ${bInfo ? bInfo.borderColor : '#bfdbfe'}`,
                            padding: '2px 7px',
                            borderRadius: '6px',
                            fontWeight: '700',
                            width: 'fit-content'
                          }}>
                            {bInfo && <BankLogo code={bInfo.code} size={18} />}
                            {inv.pagoMovilBank && <span>{inv.pagoMovilBank}</span>}
                            {inv.pagoMovilRef && <span>#{inv.pagoMovilRef}</span>}
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  <td style={{ padding: '8px', fontWeight: '700', color: isVoided ? '#dc2626' : '#0f172a', textDecoration: isVoided ? 'line-through' : 'none' }}>
                    {formatUSD(inv.totalUSD)}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: '700',
                      background: isVoided ? '#fee2e2' : isPaid ? '#d1fae5' : '#fef3c7',
                      color: isVoided ? '#991b1b' : isPaid ? '#065f46' : '#92400e'
                    }}>
                      {isVoided ? '🚫 Anulada' : isPaid ? 'Pagada' : 'Pendiente'}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => onSelectInvoice(inv)}
                        style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0284c7', padding: '4px 9px', borderRadius: '6px', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Ver
                      </button>
                      {!isVoided ? (
                        <button
                          type="button"
                          onClick={() => onVoidInvoice(inv)}
                          style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', padding: '4px 9px', borderRadius: '6px', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer' }}
                          title="Marcar esta factura como ANULADA para que no sume en Cierre de Caja ni como venta válida en el Libro SENIAT"
                        >
                          🚫 Anular
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRestoreInvoice(inv)}
                          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', padding: '4px 9px', borderRadius: '6px', fontWeight: '600', fontSize: '0.73rem', cursor: 'pointer' }}
                          title="Restaurar factura"
                        >
                          ↩️ Restaurar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteInvoice && onDeleteInvoice(inv)}
                        style={{
                          background: '#fef2f2', border: '1px solid #fca5a5',
                          color: '#b91c1c', padding: '4px 8px', borderRadius: '6px',
                          fontWeight: '700', fontSize: '0.73rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '2px'
                        }}
                        title="Eliminar registro completamente de Caja, Dashboard y SENIAT"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
