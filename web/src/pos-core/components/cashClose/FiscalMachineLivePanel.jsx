import React from 'react';
import { Printer, FileText, Lock, Cpu, BookOpen } from 'lucide-react';

export default function FiscalMachineLivePanel({
  fiscalSettings,
  printingFiscalX,
  printingFiscalZ,
  isZDoneForSelectedDate,
  fiscalZDoneTime,
  fetchingS1,
  s1Data,
  u0xData,
  fiscalValidCount,
  onPrintFiscalX,
  onOpenFiscalZConfirm,
  onFetchS1Status,
  onOpenFiscalMemoryModal
}) {
  if (!fiscalSettings?.enabled) return null;

  const machineSalesBs = Number(s1Data?.total_daily_sales_bs ?? s1Data?.total_daily_sales ?? s1Data?.totalDailySales ?? 0);
  const machineInvToday = Number(s1Data?.quantity_of_invoices_today ?? s1Data?.invoices_today ?? s1Data?.quantityOfInvoicesToday ?? 0);
  const machineLastInv = s1Data?.last_invoice_number ?? s1Data?.lastInvoiceNumber ?? 0;
  const machineDnfToday = Number(s1Data?.quantity_non_fiscal_today ?? 0);
  const machineZCounter = Number(s1Data?.z_counter ?? s1Data?.daily_closure_counter ?? s1Data?.dailyClosureCounter ?? 0);
  const machineSerial = s1Data?.registered_machine_number || s1Data?.machine_register || s1Data?.registeredMachineNumber || 'Z7C7011149';
  const hasPOSMoreInvoices = Boolean(s1Data && fiscalValidCount > machineInvToday);
  const hasMachineMoreInvoices = Boolean(s1Data && machineInvToday > fiscalValidCount);
  const hasMismatch = hasPOSMoreInvoices || hasMachineMoreInvoices;

  return (
    <div style={{
      marginTop: '16px',
      padding: '14px',
      background: '#f8fafc',
      border: '1.5px solid #cbd5e1',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Printer size={16} color="#0284c7" /> Impresora Fiscal SENIAT
        </span>
        <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
          {fiscalSettings?.port || 'COM2'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button
          type="button"
          onClick={onPrintFiscalX}
          disabled={printingFiscalX || printingFiscalZ}
          style={{
            padding: '9px 8px',
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: '700',
            color: '#334155',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Lectura parcial de ventas del día sin cerrar la memoria fiscal"
        >
          <FileText size={16} color="#475569" />
          <span>{printingFiscalX ? 'Imprimiendo...' : 'Reporte X (Parcial)'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenFiscalZConfirm}
          disabled={printingFiscalX || printingFiscalZ}
          style={{
            padding: '9px 8px',
            background: isZDoneForSelectedDate ? '#fff1f2' : '#fee2e2',
            border: `1.5px solid ${isZDoneForSelectedDate ? '#f87171' : '#fca5a5'}`,
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: '800',
            color: '#991b1b',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Emitir Reporte Z en la impresora fiscal"
        >
          <Lock size={16} color="#dc2626" />
          <span>{printingFiscalZ ? 'Procesando Z...' : (isZDoneForSelectedDate ? 'Emitir Otro Reporte Z' : 'Cierre Z (SENIAT)')}</span>
          {isZDoneForSelectedDate && (
            <span style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: '700' }}>
              (Previo: {fiscalZDoneTime})
            </span>
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={onFetchS1Status}
        disabled={fetchingS1}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          fontSize: '0.78rem',
          fontWeight: '700',
          color: '#0369a1',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}
        title="Consultar los acumuladores en tiempo real directamente desde el chip de la impresora fiscal"
      >
        <Cpu size={14} color="#0284c7" />
        <span>{fetchingS1 ? 'Consultando memoria fiscal...' : 'Consultar Acumuladores en Vivo (S1)'}</span>
      </button>

      <button
        type="button"
        onClick={onOpenFiscalMemoryModal}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          fontSize: '0.78rem',
          fontWeight: '700',
          color: '#92400e',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}
        title="Consultar el Reporte de Memoria Fiscal por rango de fechas para verificar exactamente qué montos reconoció la máquina ese día"
      >
        <BookOpen size={14} color="#d97706" />
        <span>📜 Reporte de Memoria Fiscal por Fechas</span>
      </button>

      {s1Data && (
        <div style={{
          background: '#ffffff',
          border: `1.5px solid ${hasMismatch ? '#f87171' : '#cbd5e1'}`,
          borderRadius: '8px',
          padding: '10px 12px',
          fontSize: '0.76rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
            <span style={{ color: '#64748b' }}>Subtotal Ventas en Máquina (S1):</span>
            <span style={{ fontWeight: '800', color: '#059669' }}>
              Bs. {machineSalesBs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          {u0xData && u0xData.total_accumulated_bs !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
              <span style={{ color: '#64748b' }}>Total c/IVA en Memoria X (U0X):</span>
              <span style={{ fontWeight: '800', color: '#0284c7' }}>
                Bs. {Number(u0xData.total_accumulated_bs || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Facturas fiscales válidas hoy:</span>
            <span style={{ fontWeight: '800', color: '#0f172a' }}>
              {machineInvToday} en máquina vs {fiscalValidCount} en POS
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Doc. No Fiscales / Anuladas en máquina:</span>
            <span style={{ fontWeight: '800', color: machineDnfToday > 0 ? '#dc2626' : '#64748b' }}>
              {machineDnfToday} hoy
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Última factura fiscal SENIAT:</span>
            <span style={{ fontWeight: '700', color: '#0f172a' }}>Nº {String(machineLastInv).padStart(8, '0')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Próximo Cierre Z:</span>
            <span style={{ fontWeight: '700', color: '#dc2626' }}>Z Nº {machineZCounter + 1}</span>
          </div>
          {hasPOSMoreInvoices && (
            <div style={{
              marginTop: '4px',
              padding: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#991b1b',
              fontSize: '0.73rem',
              lineHeight: '1.35'
            }}>
              ⚠️ <b>Facturas pendientes de anular:</b> El POS tiene <b>{fiscalValidCount}</b> facturas fiscales activas hoy, pero la impresora fiscal solo registró <b>{machineInvToday}</b> válidas ({machineDnfToday} no fiscales/anuladas). Haz clic en <b>🚫 Anular</b> en la tabla de facturas para aquellas que la máquina canceló; esto cuadrará la Caja y el Libro SENIAT.
            </div>
          )}
          {hasMachineMoreInvoices && (
            <div style={{
              marginTop: '4px',
              padding: '8px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              color: '#1e40af',
              fontSize: '0.73rem',
              lineHeight: '1.35'
            }}>
              ⚡ <b>Acumulación Fiscal Multi-Día ({machineInvToday} en máquina vs {fiscalValidCount} en POS):</b> La impresora fiscal tiene acumuladas ventas de jornadas previas donde no se emitió Reporte Z (ayer o hace 2 días). Al presionar <b>Cierre Z</b>, la máquina cerrará el acumulado legal ante el SENIAT.
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: '#94a3b8', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
            <span>Serial: {machineSerial}</span>
            <span>RIF: {s1Data.rif || ''}</span>
          </div>
        </div>
      )}

      <div style={{ fontSize: '0.71rem', color: '#64748b', lineHeight: '1.35', background: '#f1f5f9', padding: '6px 8px', borderRadius: '6px' }}>
        💡 <b>¿Cómo anota el Cierre Z?</b> La máquina fiscal guarda cada factura fiscal en su chip en el momento que se emite. Al presionar <b>Cierre Z</b>, la máquina calcula su propio acumulador, imprime el reporte final y lo envía al SENIAT.
      </div>
    </div>
  );
}
