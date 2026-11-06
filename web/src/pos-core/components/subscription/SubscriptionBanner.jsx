import React from 'react';
import {
  Clock,
  AlertTriangle,
  Smartphone,
  Building2,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

export default function SubscriptionBanner({
  tenant,
  subStatus,
  onOpenPagoMovil
}) {
  if (!tenant) return null;

  const isWarning = subStatus?.isWarningSoon;
  const days = subStatus?.daysRemaining ?? 14;

  return (
    <div style={{
      background: isWarning
        ? 'linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%)'
        : '#ffffff',
      borderBottom: isWarning ? '2px solid #f59e0b' : '1px solid #e2e8f0',
      padding: isWarning ? '10px 20px' : '7px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '10px',
      fontSize: '0.82rem',
      position: 'relative',
      zIndex: 50
    }}>
      {/* Estado del Restaurante y Licencia */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {isWarning ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            color: '#b45309',
            fontWeight: '800'
          }}>
            <AlertTriangle size={17} color="#d97706" />
            <span>
              ⚠️ ¡Atención! Tu suscripción de <strong>{tenant.name}</strong> vence en{' '}
              <strong style={{ textDecoration: 'underline' }}>{days} {days === 1 ? 'día' : 'días'}</strong>.
              Renueva para evitar el bloqueo de caja.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', fontWeight: '700' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '999px',
              background: '#f1f5f9',
              color: '#0f172a',
              fontWeight: '800',
              fontSize: '0.76rem'
            }}>
              <Building2 size={13} color="#2563eb" />
              {tenant.name}
            </span>

            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '999px',
              background: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              fontWeight: '800',
              fontSize: '0.74rem'
            }}>
              <CheckCircle2 size={12} />
              {subStatus?.statusLabel || `${days} días activos`}
            </span>
          </div>
        )}
      </div>

      {/* Botones de Acción Derecha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Botón de Pagar / Renovar con Pago Móvil */}
        <button
          type="button"
          onClick={onOpenPagoMovil}
          style={{
            padding: isWarning ? '7px 14px' : '5px 12px',
            borderRadius: '8px',
            border: 'none',
            background: isWarning
              ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
              : '#0f172a',
            color: '#ffffff',
            fontSize: '0.78rem',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: isWarning ? '0 2px 8px rgba(217, 119, 6, 0.3)' : 'none'
          }}
        >
          <Smartphone size={14} />
          <span>{isWarning ? 'Pagar Mensualidad Ahora' : 'Renovar Plan (Pago Móvil)'}</span>
        </button>
      </div>

    </div>
  );
}
