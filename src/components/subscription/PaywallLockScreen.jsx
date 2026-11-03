import React from 'react';
import {
  Lock,
  Smartphone,
  ShieldAlert,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { extendTenantSubscription, getSaasConfig } from '../../lib/syncEngine';

export default function PaywallLockScreen({
  tenant,
  subStatus,
  onOpenPagoMovil,
  onAllowFiscalBooksOnly
}) {
  const saasConfig = getSaasConfig();

  const handleQuickRestoreTrial = async () => {
    if (tenant?.id) {
      await extendTenantSubscription(tenant.id, 14, 'trial');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 90000,
      background: 'radial-gradient(circle at top, #1e293b 0%, #0f172a 100%)',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '580px',
        width: '100%',
        background: '#ffffff',
        color: '#0f172a',
        borderRadius: '24px',
        padding: '32px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.45)',
        border: '2px solid #fecaca',
        textAlign: 'center'
      }}>
        {/* Icono de Bloqueo */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: '#fef2f2',
          border: '2px solid #fecaca',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px auto',
          boxShadow: '0 8px 20px rgba(220, 38, 38, 0.15)'
        }}>
          <Lock size={36} />
        </div>

        <span style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: '999px',
          background: '#fef2f2',
          color: '#dc2626',
          fontSize: '0.76rem',
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '10px'
        }}>
          {subStatus?.isSuspended ? 'Servicio Suspendido' : 'Período de Suscripción Finalizado'}
        </span>

        <h1 style={{ margin: '0 0 10px 0', fontSize: '1.65rem', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.4px' }}>
          Renueva tu Suscripción para Seguir Facturando
        </h1>

        <p style={{ margin: '0 0 20px 0', fontSize: '0.92rem', color: '#475569', lineHeight: '1.5' }}>
          La licencia de <strong>{tenant?.name || 'tu restaurante'}</strong> venció el{' '}
          <strong>
            {subStatus?.validUntilDate
              ? subStatus.validUntilDate.toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })
              : 'día de corte'}
          </strong>.
          La emisión de nuevas facturas y comandas se encuentra temporalmente pausada.
        </p>

        {/* Garantía de Seguridad de Datos */}
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '14px',
          padding: '12px 16px',
          marginBottom: '22px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'left'
        }}>
          <CheckCircle2 size={22} color="#16a34a" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.82rem', color: '#166534' }}>
            <strong>Tus datos están 100% seguros e intactos:</strong> Tu catálogo de productos, inventario, clientes y reportes Z siguen resguardados. Al realizar tu Pago Móvil, esta pantalla se desbloqueará automáticamente en menos de 2 segundos.
          </div>
        </div>

        {/* Botón Principal: Pagar Mensualidad con Pago Móvil */}
        <button
          type="button"
          onClick={onOpenPagoMovil}
          style={{
            width: '100%',
            padding: '15px 24px',
            borderRadius: '14px',
            border: 'none',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            fontSize: '1.05rem',
            fontWeight: '900',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
            marginBottom: '12px'
          }}
        >
          <Smartphone size={22} />
          <span>Pagar Mensualidad con Pago Móvil (${Number(saasConfig.monthly_price_usd || 30).toFixed(0)}/mes)</span>
        </button>

        {/* Botón Legal Secundario: Solo Libros SENIAT */}
        {onAllowFiscalBooksOnly && (
          <button
            type="button"
            onClick={onAllowFiscalBooksOnly}
            style={{
              width: '100%',
              padding: '11px 18px',
              borderRadius: '12px',
              border: '1.5px solid #cbd5e1',
              background: '#f8fafc',
              color: '#334155',
              fontSize: '0.86rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <FileSpreadsheet size={17} />
            <span>Consultar / Exportar Libros Fiscales SENIAT (Modo Lectura)</span>
          </button>
        )}

        {/* Indicador Realtime */}
        <div style={{
          marginTop: '20px',
          paddingTop: '14px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '0.78rem',
          color: '#64748b',
          fontWeight: '600'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10b981',
            display: 'inline-block'
          }} />
          <span>Conectado a Supabase Realtime · Esperando validación de pago en vivo</span>
        </div>
      </div>

      {/* Barra de Simulador para Pruebas de Desarrollo */}
      <div style={{
        marginTop: '18px',
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: '12px',
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.8rem',
        color: '#cbd5e1'
      }}>
        <Sparkles size={16} color="#38bdf8" />
        <span><strong>Modo Prueba Desarrollador:</strong> ¿Quieres salir de la pantalla de bloqueo sin llenar el formulario?</span>
        <button
          type="button"
          onClick={handleQuickRestoreTrial}
          style={{
            padding: '5px 12px',
            borderRadius: '8px',
            border: '1px solid #38bdf8',
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            fontWeight: '800',
            cursor: 'pointer',
            fontSize: '0.78rem'
          }}
        >
          ⚡ Restaurar +14 Días Ahora
        </button>
      </div>
    </div>
  );
}
