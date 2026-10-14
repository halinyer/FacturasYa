import React, { useState, useEffect } from 'react';
import { 
  X, 
  DollarSign, 
  Smartphone, 
  Banknote, 
  CreditCard, 
  Receipt,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { formatUSD, formatBs, getBsFontSize } from '../../utils/currency';
import BankSelector from './BankSelector';

const PAYMENT_OPTIONS = [
  { id: 'efectivo_usd', label: 'Efectivo ($)', icon: DollarSign, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { id: 'pago_movil', label: 'Pago Móvil (Bs)', icon: Smartphone, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'efectivo_bs', label: 'Efectivo (Bs)', icon: Banknote, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { id: 'zelle', label: 'Zelle / Tarjeta', icon: CreditCard, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' }
];

const POSPaymentModal = ({
  isOpen,
  onClose,
  totalUSD = 0,
  currentRate = 876.80,
  client = null,
  onConfirmPayment,
  initialPaymentMethod = 'efectivo_usd',
  initialPagoMovilBank = '',
  initialPagoMovilRef = ''
}) => {
  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod);
  const [isMixedPayment, setIsMixedPayment] = useState(initialPaymentMethod === 'mixto');
  const [pagoMovilBank, setPagoMovilBank] = useState(initialPagoMovilBank);
  const [pagoMovilRef, setPagoMovilRef] = useState(initialPagoMovilRef);
  const [mixedPayments, setMixedPayments] = useState({
    efectivo_usd: '',
    pago_movil: '',
    efectivo_bs: '',
    zelle: ''
  });
  const [isPending, setIsPending] = useState(false);
  const [refError, setRefError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const isMix = initialPaymentMethod === 'mixto';
      setIsMixedPayment(isMix);
      setPaymentMethod(isMix ? 'efectivo_usd' : initialPaymentMethod);
      setPagoMovilBank(initialPagoMovilBank || '');
      setPagoMovilRef(initialPagoMovilRef || '');
      setRefError('');
    }
  }, [isOpen, initialPaymentMethod, initialPagoMovilBank, initialPagoMovilRef]);

  if (!isOpen) return null;

  const totalBs = totalUSD * currentRate;
  const bsFormatted = formatBs(totalBs);
  const bsFontSize = getBsFontSize(bsFormatted);

  // Mixed payment balance calculations
  const totalPaidUSD = (parseFloat(mixedPayments.efectivo_usd) || 0) +
                       (parseFloat(mixedPayments.zelle) || 0) +
                       ((parseFloat(mixedPayments.pago_movil) || 0) / currentRate) +
                       ((parseFloat(mixedPayments.efectivo_bs) || 0) / currentRate);
  const differenceUSD = totalUSD - totalPaidUSD;

  const isPagoMovilOnly = paymentMethod === 'pago_movil' && !isMixedPayment;

  const handleConfirm = () => {
    const isPayingWithPagoMovil = (paymentMethod === 'pago_movil' || (isMixedPayment && (parseFloat(mixedPayments.pago_movil) || 0) > 0)) && !isPending;

    if (isPayingWithPagoMovil) {
      const cleanRef = (pagoMovilRef || '').trim();
      if (cleanRef.length < 4) {
        if (cleanRef.length === 0) {
          setRefError('Debes ingresar los 4 dígitos de la referencia.');
        } else {
          setRefError(`La referencia debe tener exactamente 4 dígitos (ingresaste solo ${cleanRef.length}).`);
        }
        return;
      }
    }

    onConfirmPayment({
      paymentMethod: isMixedPayment ? 'mixto' : paymentMethod,
      isMixedPayment,
      mixedPayments: isMixedPayment ? mixedPayments : null,
      isPending,
      pagoMovilBank: (paymentMethod === 'pago_movil' || isMixedPayment) ? pagoMovilBank : '',
      pagoMovilRef: (paymentMethod === 'pago_movil' || isMixedPayment) ? (pagoMovilRef || '').trim() : ''
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2200,
      padding: '16px',
      fontFamily: 'inherit'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: isPagoMovilOnly ? '460px' : '500px',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #eaedf2',
        color: '#0f172a'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isPagoMovilOnly && (
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #bfdbfe',
                flexShrink: 0
              }}>
                <Smartphone size={22} />
              </div>
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: '1.22rem', fontWeight: '800', letterSpacing: '-0.3px', color: '#0f172a' }}>
                {isPagoMovilOnly 
                  ? 'Cobro con Pago Móvil' 
                  : (isMixedPayment ? 'Pago Dividido / Mixto' : 'Confirmar Nota de Entrega')}
              </h2>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                {client ? `Cliente: ${client.name || 'Consumidor Final'}` : 'Consumidor Final'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Cerrar ventana"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Amount Card */}
        {isPagoMovilOnly ? (
          /* Specialized Pago Móvil Amount Card: Highlight Bolívares prominently */
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '18px',
            border: '1.5px solid #bfdbfe',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.76rem', color: '#1e40af', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Monto Oficial a Transferir
              </span>
              <span style={{ fontSize: '0.74rem', color: '#1e40af', background: '#dbeafe', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                Tasa BCV: {Number(currentRate).toFixed(4)}
              </span>
            </div>
            <div style={{
              fontSize: bsFontSize,
              fontWeight: '900',
              color: '#1d4ed8',
              wordBreak: 'break-all',
              overflowWrap: 'anywhere',
              lineHeight: 1.15
            }}>
              {bsFormatted}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '600' }}>
              Equivalente en dólares: <strong style={{ color: '#0f172a' }}>{formatUSD(totalUSD)}</strong>
            </div>
          </div>
        ) : (
          /* Standard Amount Card for other methods */
          <div style={{
            background: '#f8fafc',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '18px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.86rem', color: '#64748b', fontWeight: '600' }}>Total a Liquidar:</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a' }}>{formatUSD(totalUSD)}</span>
            </div>

            <div style={{
              background: '#ffffff',
              borderRadius: '10px',
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                Equivalente en Bolívares (Tasa: {Number(currentRate).toFixed(4)})
              </div>
              <div style={{
                fontWeight: '900',
                color: '#b45309',
                fontSize: bsFontSize,
                wordBreak: 'break-all',
                overflowWrap: 'anywhere'
              }}>
                {bsFormatted}
              </div>
            </div>
          </div>
        )}

        {/* PAGO MÓVIL DEDICATED VIEW */}
        {isPagoMovilOnly ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
            {/* Bank Selector */}
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🏦 Banco Receptor</span>
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '500' }}>(Opcional)</span>
              </label>
              <BankSelector
                selectedBank={pagoMovilBank}
                onSelectBank={setPagoMovilBank}
                placeholder="Seleccionar banco donde cayó el pago..."
              />
            </div>

            {/* Reference Number */}
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🔢 Número de Referencia</span>
                </span>
                <span style={{ 
                  fontSize: '0.72rem', 
                  color: refError ? '#dc2626' : (pagoMovilRef.length === 4 ? '#059669' : '#2563eb'), 
                  fontWeight: '700' 
                }}>
                  {pagoMovilRef.length === 4 ? '✓ 4 dígitos' : 'Exactamente 4 dígitos'}
                </span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="Ej: 4589"
                value={pagoMovilRef}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPagoMovilRef(cleaned);
                  if (refError) setRefError('');
                }}
                onKeyDown={handleKeyDown}
                autoFocus
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: refError 
                    ? '2px solid #ef4444' 
                    : (pagoMovilRef.length === 4 
                        ? '2px solid #10b981' 
                        : (pagoMovilRef.length > 0 ? '2px solid #f59e0b' : '1.5px solid #cbd5e1')),
                  background: refError ? '#fef2f2' : (pagoMovilRef.length === 4 ? '#f0fdf4' : '#ffffff'),
                  boxSizing: 'border-box',
                  fontWeight: '800',
                  fontSize: '1.2rem',
                  letterSpacing: '4px',
                  textAlign: 'center',
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
              />
              {refError ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#dc2626', fontWeight: '700', marginTop: '6px' }}>
                  <AlertTriangle size={14} />
                  <span>{refError}</span>
                </div>
              ) : pagoMovilRef.length > 0 && pagoMovilRef.length < 4 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#d97706', fontWeight: '700', marginTop: '6px' }}>
                  <AlertTriangle size={14} />
                  <span>Faltan {4 - pagoMovilRef.length} dígitos ({pagoMovilRef.length} de 4 ingresados)</span>
                </div>
              ) : pagoMovilRef.length === 4 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#059669', fontWeight: '700', marginTop: '6px' }}>
                  <CheckCircle2 size={14} />
                  <span>Referencia completa (4 dígitos)</span>
                </div>
              ) : (
                <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '4px', textAlign: 'center' }}>
                  Coloca los últimos 4 dígitos del comprobante para verificarlo en Cierre de Caja.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* STANDARD / MIXED PAYMENT METHODS VIEW */
          <>
            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              Selecciona el Método de Pago
            </div>

            {!isMixedPayment ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                {PAYMENT_OPTIONS.map((opt) => {
                  const isSelected = paymentMethod === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPaymentMethod(opt.id)}
                      style={{
                        background: isSelected ? opt.bg : '#ffffff',
                        border: isSelected ? `2px solid ${opt.color}` : '1.5px solid #e2e8f0',
                        color: isSelected ? opt.color : '#334155',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? `0 2px 8px ${opt.border}` : '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                    >
                      <Icon size={20} color={isSelected ? opt.color : '#64748b'} />
                      <span style={{ fontWeight: '800', fontSize: '0.88rem' }}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Efectivo ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={mixedPayments.efectivo_usd}
                      onChange={(e) => setMixedPayments({ ...mixedPayments, efectivo_usd: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontWeight: '600' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Pago Móvil (Bs)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={mixedPayments.pago_movil}
                      onChange={(e) => setMixedPayments({ ...mixedPayments, pago_movil: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontWeight: '600' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Efectivo (Bs)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={mixedPayments.efectivo_bs}
                      onChange={(e) => setMixedPayments({ ...mixedPayments, efectivo_bs: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontWeight: '600' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Zelle / Punto ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={mixedPayments.zelle}
                      onChange={(e) => setMixedPayments({ ...mixedPayments, zelle: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontWeight: '600' }}
                    />
                  </div>
                </div>

                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  borderRadius: '8px',
                  background: differenceUSD > 0.05 ? '#fee2e2' : '#ecfdf5',
                  color: differenceUSD > 0.05 ? '#991b1b' : '#065f46',
                  fontSize: '0.84rem',
                  fontWeight: '800',
                  textAlign: 'center'
                }}>
                  {differenceUSD > 0.05
                    ? `Falta: ${formatUSD(differenceUSD)} (${formatBs(differenceUSD * currentRate)})`
                    : `¡Pago cubierto! (Vuelto: ${formatUSD(Math.abs(differenceUSD))})`}
                </div>
              </div>
            )}

            {/* Optional Pago Móvil Bank & Reference Section (for mixed or other) */}
            {((parseFloat(mixedPayments.pago_movil) || 0) > 0) && (
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #bfdbfe',
                borderRadius: '16px',
                padding: '14px',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🏦 Banco Receptor Pago Móvil</span>
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>(Opcional)</span>
                </div>
                
                <BankSelector
                  selectedBank={pagoMovilBank}
                  onSelectBank={setPagoMovilBank}
                  placeholder="Seleccionar banco receptor..."
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔢 Referencia Pago Móvil</span>
                  </label>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    color: refError ? '#dc2626' : (pagoMovilRef.length === 4 ? '#059669' : '#1e40af'), 
                    fontWeight: '700' 
                  }}>
                    {pagoMovilRef.length === 4 ? '✓ 4 dígitos' : 'Exactamente 4 dígitos'}
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="Ej: 4589"
                  value={pagoMovilRef}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setPagoMovilRef(cleaned);
                    if (refError) setRefError('');
                  }}
                  onKeyDown={handleKeyDown}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: refError 
                      ? '2px solid #ef4444' 
                      : (pagoMovilRef.length === 4 
                          ? '2px solid #10b981' 
                          : (pagoMovilRef.length > 0 ? '2px solid #f59e0b' : '1.5px solid #cbd5e1')),
                    background: refError ? '#fef2f2' : (pagoMovilRef.length === 4 ? '#f0fdf4' : '#ffffff'),
                    boxSizing: 'border-box',
                    fontWeight: '800',
                    fontSize: '1.05rem',
                    letterSpacing: '3px',
                    textAlign: 'center',
                    outline: 'none',
                    transition: 'all 0.15s ease'
                  }}
                />
                {refError ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#dc2626', fontWeight: '700', marginTop: '4px' }}>
                    <AlertTriangle size={13} />
                    <span>{refError}</span>
                  </div>
                ) : pagoMovilRef.length > 0 && pagoMovilRef.length < 4 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#d97706', fontWeight: '700', marginTop: '4px' }}>
                    <AlertTriangle size={13} />
                    <span>Faltan {4 - pagoMovilRef.length} dígitos ({pagoMovilRef.length} de 4 ingresados)</span>
                  </div>
                ) : pagoMovilRef.length === 4 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#059669', fontWeight: '700', marginTop: '4px' }}>
                    <CheckCircle2 size={13} />
                    <span>Referencia completa (4 dígitos)</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Toggle Mixed Payment */}
            <button
              type="button"
              onClick={() => {
                setIsMixedPayment(!isMixedPayment);
                setMixedPayments({ efectivo_usd: '', pago_movil: '', efectivo_bs: '', zelle: '' });
              }}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '16px',
                background: isMixedPayment ? '#f0fdfa' : '#f8fafc',
                border: isMixedPayment ? '1px solid #14b8a6' : '1px solid #e2e8f0',
                borderRadius: '10px',
                color: isMixedPayment ? '#0f766e' : '#475569',
                fontWeight: '700',
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {isMixedPayment ? '✕ Cancelar Pago Dividido' : '🔀 Dividir Pago en varios métodos'}
            </button>
          </>
        )}

        {/* Deuda / Crédito (para clientes autorizados) */}
        {client?.type === 'congelador' && (
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
            background: isPending ? '#fef3c7' : '#ffffff',
            border: isPending ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
            padding: '10px 14px',
            borderRadius: '10px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={isPending}
              onChange={(e) => setIsPending(e.target.checked)}
              style={{ accentColor: '#f59e0b', width: '17px', height: '17px' }}
            />
            <span style={{ fontSize: '0.85rem', color: isPending ? '#92400e' : '#334155', fontWeight: '700' }}>
              ❄️ Registrar como cuenta por cobrar pendiente
            </span>
          </label>
        )}

        {/* Action Buttons */}
        {isPagoMovilOnly ? (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '13px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              style={{
                flex: 2,
                padding: '13px',
                borderRadius: '12px',
                border: 'none',
                background: isPending ? '#f59e0b' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '0.96rem',
                cursor: 'pointer',
                boxShadow: isPending ? '0 4px 14px rgba(245, 158, 11, 0.3)' : '0 4px 14px rgba(37, 99, 235, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <CheckCircle2 size={18} />
              <span>{isPending ? 'REGISTRAR PENDIENTE' : 'CONFIRMAR PAGO MÓVIL'}</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isMixedPayment && differenceUSD > 0.05}
            style={{
              width: '100%',
              padding: '15px',
              background: isPending ? '#f59e0b' : 'var(--brand-primary, #2563eb)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              fontWeight: '800',
              fontSize: '1rem',
              cursor: isMixedPayment && differenceUSD > 0.05 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              opacity: isMixedPayment && differenceUSD > 0.05 ? 0.6 : 1,
              transition: 'all 0.15s ease'
            }}
          >
            <Receipt size={18} />
            <span>{isPending ? 'REGISTRAR CUENTA POR COBRAR' : 'CONFIRMAR NOTA DE ENTREGA'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default POSPaymentModal;
