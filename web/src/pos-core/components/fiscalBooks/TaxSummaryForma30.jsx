import React from 'react';
import { CLIENT_CONFIG } from '../../config/clientConfig';
import { formatVE } from '../../utils/seniatCsvExporter';

export default function TaxSummaryForma30({ taxSummary }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
      {/* Tarjeta de Autoliquidación del Mes */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
          Autoliquidación del IVA (Forma 30 SENIAT)
        </h3>
        <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 20px 0', lineHeight: '1.4' }}>
          Cálculo mensual oficial que contrasta el Débito Fiscal contra el Crédito Fiscal para determinar la cuota tributaria a enterar.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
            <span style={{ fontWeight: '600' }}>(+) Débito Fiscal Generado (Ventas):</span>
            <span style={{ fontWeight: '800', color: '#d97706' }}>Bs. {formatVE(taxSummary.debitoFiscal)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
            <span style={{ fontWeight: '600' }}>(-) Crédito Fiscal Deducible (Compras):</span>
            <span style={{ fontWeight: '800', color: '#059669' }}>Bs. {formatVE(taxSummary.creditoFiscal)}</span>
          </div>

          <div style={{ borderTop: '2px dashed #cbd5e1', margin: '4px 0' }} />

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px', borderRadius: '10px',
            background: taxSummary.isCuotaPagar ? '#fef2f2' : '#f0fdf4',
            border: `1.5px solid ${taxSummary.isCuotaPagar ? '#fecaca' : '#bbf7d0'}`
          }}>
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.95rem', color: taxSummary.isCuotaPagar ? '#991b1b' : '#166534' }}>
                {taxSummary.isCuotaPagar ? 'CUOTA TRIBUTARIA A PAGAR (IVA):' : 'SALDO A FAVOR DEL CONTRIBUYENTE:'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                {taxSummary.isCuotaPagar ? 'Monto a enterar en portal fiscal SENIAT' : 'Deducible en el próximo período fiscal'}
              </div>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: taxSummary.isCuotaPagar ? '#dc2626' : '#16a34a' }}>
              Bs. {formatVE(taxSummary.isCuotaPagar ? taxSummary.montoPagar : taxSummary.saldoAFavor)}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#faf5ff', borderRadius: '8px', border: '1px solid #f3e8ff' }}>
            <div>
              <span style={{ fontWeight: '700', color: '#6b21a8' }}>(+) IGTF 3% Percibido en Divisas:</span>
              <div style={{ fontSize: '0.75rem', color: '#7e22ce' }}>Obligación independiente al débito fiscal</div>
            </div>
            <span style={{ fontWeight: '800', color: '#7c3aed', fontSize: '1.05rem' }}>Bs. {formatVE(taxSummary.igtfTotal)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#0f172a', color: '#ffffff', borderRadius: '10px' }}>
            <span style={{ fontWeight: '800' }}>TOTAL A ENTERAR AL SENIAT (IVA + IGTF):</span>
            <span style={{ fontWeight: '900', fontSize: '1.15rem', color: '#38bdf8' }}>
              Bs. {formatVE(taxSummary.totalPagarSeniat)}
            </span>
          </div>
        </div>
      </div>

      {/* Tarjeta de Datos de la Razón Social y Parámetros */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
          Identificación Fiscal del Contribuyente
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
          <div>
            <strong style={{ color: '#64748b' }}>Razón Social:</strong>
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{CLIENT_CONFIG.legalName || 'INVERSIONES HAPPY DAYS 1 C.A'}</div>
          </div>

          <div>
            <strong style={{ color: '#64748b' }}>RIF:</strong>
            <div style={{ fontWeight: '700' }}>{CLIENT_CONFIG.rif || 'J-500195923'}</div>
          </div>

          <div>
            <strong style={{ color: '#64748b' }}>Dirección Fiscal:</strong>
            <div style={{ color: '#475569' }}>
              {(CLIENT_CONFIG.addressLines || []).join(', ') || 'C.C Unicentro El Marqués, Caracas'}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
            <strong style={{ color: '#64748b' }}>Alícuota Impositiva Vigente:</strong>
            <div style={{ fontWeight: '700', color: '#2563eb' }}>General 16% (Art. 27 Ley del IVA)</div>
          </div>

          <div>
            <strong style={{ color: '#64748b' }}>Alícuota IGTF Divisas:</strong>
            <div style={{ fontWeight: '700', color: '#7c3aed' }}>3.00% (Providencia Administrativa SNAT/2022/000013)</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: '1.4', display: 'block' }}>
              ℹ️ Recuerda que los libros de compra y venta deben mantenerse actualizados al día en el establecimiento y estar disponibles ante cualquier fiscalización del SENIAT.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
