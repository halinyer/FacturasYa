import React, { useState } from 'react';
import {
  Smartphone,
  Copy,
  CheckCircle2,
  X,
  ShieldCheck,
  Sparkles,
  Building2,
  Hash,
  Phone,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { getSaasConfig, submitPagoMovilReport } from '../../lib/syncEngine';

const VENEZUELA_BANKS = [
  '0134 - Banesco',
  '0102 - Banco de Venezuela',
  '0105 - Banco Mercantil',
  '0108 - BBVA Provincial',
  '0172 - Bancamiga',
  '0191 - BNC (Banco Nacional de Crédito)',
  '0114 - Bancaribe',
  '0174 - Banplus',
  '0175 - Banco Bicentenario',
  '0163 - Banco del Tesoro',
  '0151 - BFC Banco Fondo Común',
  '0138 - Banco Plaza',
  '0104 - Banco Venezolano de Crédito',
  '0168 - Bancrecer',
  '0177 - BANFANB',
  '0169 - Mi Banco'
];

export default function PagoMovilModal({
  isOpen,
  onClose,
  tenant,
  exchangeRate = 876.80,
  onPaymentSuccess
}) {
  if (!isOpen) return null;

  const saasConfig = getSaasConfig();
  const [selectedPlan, setSelectedPlan] = useState('monthly'); // 'monthly' | 'annual'
  const [bankOrigin, setBankOrigin] = useState(VENEZUELA_BANKS[0]);
  const [phoneOrigin, setPhoneOrigin] = useState('');
  const [referenceLast6, setReferenceLast6] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resultMsg, setResultMsg] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  const monthlyUsd = Number(saasConfig.monthly_price_usd) || 30;
  const annualUsd = Number(saasConfig.annual_price_usd) || 300;
  const rate = Number(exchangeRate) || 876.80;

  const currentUsd = selectedPlan === 'annual' ? annualUsd : monthlyUsd;
  const currentBs = currentUsd * rate;

  const handleCopy = (text, label) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(''), 2000);
    } catch (e) {}
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setResultMsg(null);

    const cleanPhone = phoneOrigin.replace(/\D/g, '');
    const cleanRef = referenceLast6.replace(/\D/g, '');

    if (cleanPhone.length < 10) {
      setError('Ingresa un número de teléfono emisor válido (ej. 04121234567).');
      return;
    }
    if (cleanRef.length < 6) {
      setError('Ingresa los últimos 6 dígitos exactos del número de referencia.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitPagoMovilReport({
        tenantId: tenant?.id || 'tenant_happydays_01',
        tenantName: tenant?.name || 'Mi Restaurante',
        plan: selectedPlan,
        amountUsd: currentUsd,
        amountBs: Number(currentBs.toFixed(2)),
        rateBcv: rate,
        bankOrigin,
        phoneOrigin: cleanPhone,
        referenceLast6: cleanRef
      });

      setResultMsg({
        approved: res.status === 'APPROVED',
        text: res.message || '¡Pago procesado exitosamente!'
      });

      if (onPaymentSuccess) {
        onPaymentSuccess(res);
      }

      if (res.status === 'APPROVED') {
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    } catch (err) {
      setError(err?.message || 'Error al verificar el Pago Móvil');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'rgba(15, 23, 42, 0.72)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        maxWidth: '540px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1px solid #e2e8f0',
        color: '#0f172a'
      }}>
        {/* Cabecera */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399'
            }}>
              <Smartphone size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800' }}>
                Renovar Suscripción · Pago Móvil
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                {tenant?.name || 'Restaurante'} • Activación en Tiempo Real
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '22px 24px' }}>
          {/* Selector de Plan (Mensual vs Anual) */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
              1. Selecciona tu Plan de Renovación
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSelectedPlan('monthly')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: selectedPlan === 'monthly' ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                  background: selectedPlan === 'monthly' ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b' }}>
                  Plan Mensual (+30 días)
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#2563eb', marginTop: '2px' }}>
                  ${monthlyUsd.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>/ mes</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan('annual')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: selectedPlan === 'annual' ? '2px solid #16a34a' : '1.5px solid #cbd5e1',
                  background: selectedPlan === 'annual' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  transition: 'all 0.15s'
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: '-9px',
                  right: '10px',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '999px'
                }}>
                  2 MESES GRATIS
                </span>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b' }}>
                  Plan Anual (+365 días)
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#16a34a', marginTop: '2px' }}>
                  ${annualUsd.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>/ año</span>
                </div>
              </button>
            </div>
          </div>

          {/* Datos Bancarios Receptores */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px 16px',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#334155', textTransform: 'uppercase' }}>
                2. Realiza el Pago Móvil a estos datos
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>
                Tasa BCV: Bs. {rate.toFixed(2)}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.84rem' }}>
              <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Banco Destino</span>
                <strong style={{ color: '#0f172a' }}>{saasConfig.pago_movil_bank}</strong>
              </div>

              <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Teléfono</span>
                  <strong style={{ color: '#0f172a' }}>{saasConfig.pago_movil_phone}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(saasConfig.pago_movil_phone, 'phone')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '0.72rem', fontWeight: '700' }}
                >
                  {copiedField === 'phone' ? '¡Copiado!' : <Copy size={14} />}
                </button>
              </div>

              <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Cédula / RIF</span>
                  <strong style={{ color: '#0f172a' }}>{saasConfig.pago_movil_rif_ci}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(saasConfig.pago_movil_rif_ci, 'rif')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '0.72rem', fontWeight: '700' }}
                >
                  {copiedField === 'rif' ? '¡Copiado!' : <Copy size={14} />}
                </button>
              </div>

              <div style={{ background: '#ecfdf5', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #6ee7b7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#047857', fontWeight: '700', display: 'block' }}>Monto Exacto a Pagar</span>
                  <strong style={{ color: '#065f46', fontSize: '0.96rem' }}>
                    Bs. {currentBs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(currentBs.toFixed(2), 'amount')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', fontSize: '0.72rem', fontWeight: '700' }}
                >
                  {copiedField === 'amount' ? '¡Copiado!' : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Formulario de Verificación */}
          <form onSubmit={handleSubmit} noValidate>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>
              3. Reporta los datos de tu comprobante
            </label>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>
                <Building2 size={14} /> Banco desde donde enviaste el pago:
              </label>
              <select
                value={bankOrigin}
                onChange={(e) => setBankOrigin(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  background: '#ffffff'
                }}
              >
                {VENEZUELA_BANKS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>
                  <Phone size={14} /> Teléfono Emisor:
                </label>
                <input
                  type="tel"
                  placeholder="Ej: 04121234567"
                  value={phoneOrigin}
                  onChange={(e) => setPhoneOrigin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontWeight: '700'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>
                  <Hash size={14} /> Últimos 6 dígitos Ref:
                </label>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="Ej: 987654"
                  value={referenceLast6}
                  onChange={(e) => setReferenceLast6(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #2563eb',
                    fontSize: '0.95rem',
                    fontWeight: '800',
                    letterSpacing: '1px',
                    background: '#eff6ff'
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: '0.83rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '14px'
              }}>
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}

            {resultMsg && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: resultMsg.approved ? '#f0fdf4' : '#eff6ff',
                border: `1.5px solid ${resultMsg.approved ? '#86efac' : '#93c5fd'}`,
                color: resultMsg.approved ? '#15803d' : '#1d4ed8',
                fontSize: '0.85rem',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '14px'
              }}>
                <CheckCircle2 size={18} />
                <span>{resultMsg.text}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '11px 18px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={submitting}
                onClick={handleSubmit}
                style={{
                  padding: '11px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.92rem',
                  cursor: submitting ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                {submitting ? <Loader2 size={18} /> : <ShieldCheck size={18} />}
                <span>{submitting ? 'Verificando con el Banco...' : 'Confirmar Pago Móvil'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
