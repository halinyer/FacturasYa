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
import { VZLA_BANKS } from './POSInvoiceSidebar';

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

  useEffect(() => {
    if (isOpen) {
      const isMix = initialPaymentMethod === 'mixto';
      setIsMixedPayment(isMix);
      setPaymentMethod(isMix ? 'efectivo_usd' : initialPaymentMethod);
      setPagoMovilBank(initialPagoMovilBank || '');
      setPagoMovilRef(initialPagoMovilRef || '');
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

  const handleConfirm = () => {
    onConfirmPayment({
      paymentMethod: isMixedPayment ? 'mixto' : paymentMethod,
      isMixedPayment,
      mixedPayments: isMixedPayment ? mixedPayments : null,
      isPending,
      pagoMovilBank: (paymentMethod === 'pago_movil' || isMixedPayment) ? pagoMovilBank : '',
      pagoMovilRef: (paymentMethod === 'pago_movil' || isMixedPayment) ? pagoMovilRef : ''
    });
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
        maxWidth: '480px',
        padding: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #eaedf2',
        color: '#0f172a'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.3px' }}>
              Confirmar Nota de Entrega
            </h2>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
              {client ? `Cliente: ${client.name || 'Consumidor Final'}` : 'Consumidor Final'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
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

        {/* Amount Card (Anti-Overflow) */}
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

        {/* Payment Methods Grid */}
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

        {/* Optional Pago Móvil Bank & Reference Section */}
        {(!isMixedPayment ? paymentMethod === 'pago_movil' : (parseFloat(mixedPayments.pago_movil) || 0) > 0) && (
          <div style={{
            background: '#f8fafc',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', fontWeight: '700', color: '#1e40af' }}>
              <span>🏦 Banco Receptor Pago Móvil</span>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>(Opcional)</span>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {VZLA_BANKS.map((b) => {
                const isActive = pagoMovilBank === b.id || pagoMovilBank === b.name;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setPagoMovilBank(isActive ? '' : b.name)}
                    style={{
                      padding: '4px 9px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: '800',
                      border: isActive ? `1.5px solid ${b.color}` : '1px solid #cbd5e1',
                      background: isActive ? b.bg : '#ffffff',
                      color: isActive ? b.color : '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    <span>{b.badge}</span>
                    <span>{b.name}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', fontWeight: '700', color: '#1e40af', marginTop: '2px' }}>
              <span>🔢 Referencia Pago Móvil</span>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>(Opcional - últimos 4 dígitos)</span>
            </div>
            <input
              type="text"
              maxLength={8}
              placeholder="Ej: 4589"
              value={pagoMovilRef}
              onChange={(e) => setPagoMovilRef(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
                fontWeight: '600',
                fontSize: '0.85rem'
              }}
            />
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

        {/* Single Confirm Button */}
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
      </div>
    </div>
  );
};

export default POSPaymentModal;
