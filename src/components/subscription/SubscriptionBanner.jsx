import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  Smartphone,
  Building2,
  Sliders,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { updateTenantStatus } from '../../lib/syncEngine';

export default function SubscriptionBanner({
  tenant,
  subStatus,
  onOpenPagoMovil
}) {
  const [showSimControls, setShowSimControls] = useState(false);

  if (!tenant) return null;

  const isWarning = subStatus?.isWarningSoon;
  const days = subStatus?.daysRemaining ?? 14;

  const handleSimulateState = async (mode) => {
    if (!tenant?.id) return;
    const now = Date.now();
    if (mode === 'trial14') {
      await updateTenantStatus(tenant.id, 'active', new Date(now + 14 * 86400 * 1000).toISOString());
    } else if (mode === 'warn2') {
      await updateTenantStatus(tenant.id, 'active', new Date(now + 2 * 86400 * 1000).toISOString());
    } else if (mode === 'expired') {
      await updateTenantStatus(tenant.id, 'past_due', new Date(now - 86400 * 1000).toISOString());
    }
    setShowSimControls(false);
  };

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
        {/* Botón para probar estados del SaaS */}
        <button
          type="button"
          onClick={() => setShowSimControls(!showSimControls)}
          style={{
            padding: '5px 10px',
            borderRadius: '8px',
            border: '1px dashed #94a3b8',
            background: showSimControls ? '#e2e8f0' : '#f8fafc',
            color: '#475569',
            fontSize: '0.74rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
          title="Probar cómo se ve el aviso de 3 días y el bloqueo Kill Switch"
        >
          <Sliders size={13} />
          <span>Probar Estados SaaS</span>
        </button>

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

      {/* Panel Desplegable de Simulación para Pruebas */}
      {showSimControls && (
        <div style={{
          width: '100%',
          marginTop: '6px',
          padding: '8px 12px',
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '0.76rem'
        }}>
          <span style={{ fontWeight: '700', color: '#94a3b8' }}>
            🧪 Simulador de Suscripción (Haz clic para probar cada estado en vivo):
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleSimulateState('trial14')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #22c55e',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                fontWeight: '800',
                cursor: 'pointer',
                fontSize: '0.74rem'
              }}
            >
              🟢 Activo (14 días gratis)
            </button>
            <button
              type="button"
              onClick={() => handleSimulateState('warn2')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #f59e0b',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                fontWeight: '800',
                cursor: 'pointer',
                fontSize: '0.74rem'
              }}
            >
              🟡 Por vencer (Quedan 2 días)
            </button>
            <button
              type="button"
              onClick={() => handleSimulateState('expired')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #ef4444',
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                fontWeight: '800',
                cursor: 'pointer',
                fontSize: '0.74rem'
              }}
            >
              🔴 Vencido (Probar Kill Switch)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
