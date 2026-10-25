import React from 'react';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  X, 
  RefreshCw, 
  Receipt, 
  User, 
  FileText,
  UtensilsCrossed,
  DollarSign,
  Smartphone,
  Banknote,
  CreditCard,
  Bike,
  ShoppingBag,
  MapPin,
  Phone,
  Clock,
  Bookmark,
  Printer,
  Check,
  AlertCircle
} from 'lucide-react';
import ClientSearch from '../ClientSearch';
import { formatUSD, formatBs, getBsFontSize } from '../../utils/currency';
import { getAssetUrl } from '../../utils/assetHelper';
import { VZLA_BANKS } from '../../utils/venezuelaBanks';
import BankSelector from './BankSelector';
import { MODALIDADES, MODALIDADES_LIST } from '../../utils/pricingEngine';
import './POSInvoiceSidebar.css';

export { VZLA_BANKS };

const SIDEBAR_METHODS = [
  { id: 'efectivo_usd', label: 'Efectivo $', icon: DollarSign, color: '#059669' },
  { id: 'pago_movil', label: 'Pago Móvil', icon: Smartphone, color: '#2563eb' },
  { id: 'punto', label: 'Punto Venta', icon: CreditCard, color: '#0284c7' },
  { id: 'efectivo_bs', label: 'Efectivo Bs', icon: Banknote, color: '#d97706' },
  { id: 'zelle', label: 'Zelle ($)', icon: CreditCard, color: '#7c3aed' },
  { id: 'mixto', label: '🔀 Pago Dividido / Mixto', icon: null, color: '#0f766e' }
];

const POSInvoiceSidebar = ({
  cart = [],
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  modalidad = 'detal',
  onModalidadChange,
  client,
  onSelectClient,
  currentRate = 876.80,
  customRate = '',
  onSetCustomRate,
  onRefreshRate,
  isRefreshingRate = false,
  loadedTableOrder = null,
  onUnlinkTableOrder,
  onGenerateNotaEntrega,
  products = [],
  paymentMethod = 'efectivo_usd',
  onSelectPaymentMethod,
  pagoMovilBank = '',
  onSelectPagoMovilBank,
  pagoMovilRef = '',
  onChangePagoMovilRef,
  orderType = 'salon',
  onChangeOrderType,
  deliveryInfo = { address: '', phone: '', courier: '', deliveryFee: 0 },
  onChangeDeliveryInfo,
  onSaveOpenTab,
  openTabsCount = 0,
  onOpenTabsModal,
  activeTabName = null,
  onCancelActiveTab,
  onSaveClientAddress,
  // New SENIAT & Fast Checkout Props
  docType = 'nota_entrega',
  onChangeDocType,
  fiscalSettings = null,
  cashReceivedUSD = '',
  onChangeCashReceivedUSD,
  cashReceivedBs = '',
  onChangeCashReceivedBs,
  onDirectCheckout,
  onOpenPaymentModal,
  isNightLocked = false,
  onOpenLockModal
}) => {
  const isFiscal = docType === 'fiscal';

  // Calculations
  const totalItemsCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const itemsSubtotalUSD = cart.reduce((sum, item) => {
    const price = Number(item.priceUSD || item.price || 0);
    return sum + (price * (item.quantity || 1));
  }, 0);
  const deliveryFeeUSD = orderType === 'delivery' ? (parseFloat(deliveryInfo?.deliveryFee) || 0) : 0;
  const rawSubtotalUSD = itemsSubtotalUSD + deliveryFeeUSD;
  const rawSubtotalBs = rawSubtotalUSD * currentRate;

  // SENIAT Fiscal calculations (16% IVA + 3% IGTF on foreign currency)
  const baseImponibleUSD = Number((rawSubtotalUSD / 1.16).toFixed(2));
  const ivaUSD = Number((rawSubtotalUSD - baseImponibleUSD).toFixed(2));
  const baseImponibleBs = Number((baseImponibleUSD * currentRate).toFixed(2));
  const ivaBs = Number((ivaUSD * currentRate).toFixed(2));

  // IGTF 3% applies if foreign currency payment in fiscal mode
  const isForeignPayment = paymentMethod === 'efectivo_usd' || paymentMethod === 'zelle';
  const igtfUSD = (isFiscal && isForeignPayment) ? Number((rawSubtotalUSD * 0.03).toFixed(2)) : 0;
  const igtfBs = Number((igtfUSD * currentRate).toFixed(2));

  const cartTotalUSD = rawSubtotalUSD + igtfUSD;
  const cartTotalBs = rawSubtotalBs + igtfBs;

  const bsFormatted = formatBs(cartTotalBs);
  const bsFontSize = getBsFontSize(bsFormatted);

  // Cash change calculations
  const cashNumUSD = parseFloat(cashReceivedUSD) || 0;
  const changeUSD = cashNumUSD > cartTotalUSD ? Number((cashNumUSD - cartTotalUSD).toFixed(2)) : 0;
  const changeBs = Number((changeUSD * currentRate).toFixed(2));

  // Quick cash dollar chips
  const cashChips = [
    { label: 'Exacto', value: cartTotalUSD > 0 ? cartTotalUSD.toFixed(2) : '0' },
    { label: '$5', value: '5' },
    { label: '$10', value: '10' },
    { label: '$20', value: '20' },
    { label: '$50', value: '50' },
    { label: '$100', value: '100' }
  ].filter(chip => chip.label === 'Exacto' || Number(chip.value) >= cartTotalUSD || cartTotalUSD <= 5);

  const handlePrimaryClick = () => {
    if (cart.length === 0 && !isNightLocked) return;
    if (isNightLocked) {
      if (onOpenLockModal) {
        onOpenLockModal();
      }
      return;
    }
    if (onOpenPaymentModal) {
      onOpenPaymentModal();
    }
  };

  return (
    <aside className="pos-invoice-sidebar">
      {/* 2. Restaurant Table Origin Banner */}
      {loadedTableOrder && (
        <div className="pos-table-banner">
          <div className="pos-table-info">
            <span className="pos-table-title">
              <UtensilsCrossed size={16} /> {loadedTableOrder.tableName}
            </span>
            <span className="pos-table-sub">
              Atendido por: {loadedTableOrder.waiterName || 'Mesero'}
            </span>
          </div>
          <button
            type="button"
            className="pos-table-unlink-btn"
            onClick={onUnlinkTableOrder}
            title="Desvincular orden de mesa"
          >
            Desvincular
          </button>
        </div>
      )}

      {/* 3. Top Header */}
      <div className="pos-sidebar-header">
        <div className="pos-header-title-box">
          <Receipt size={20} color="var(--brand-primary, #2563eb)" />
          <h3 className="pos-header-title">
            Comprobante de Venta
          </h3>
          <span className="pos-items-pill">{totalItemsCount} {totalItemsCount === 1 ? 'ítem' : 'ítems'}</span>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Cuentas Abiertas / Deliveries Pill Button */}
          <button
            type="button"
            className="pos-tabs-btn"
            onClick={onOpenTabsModal}
            title="Ver Cuentas Abiertas y Deliveries en curso"
          >
            <Clock size={13} />
            <span>Cuentas ({openTabsCount})</span>
          </button>

          {/* Poner en Espera / Guardar Cuenta Button */}
          {cart.length > 0 && (
            <button
              type="button"
              className="pos-hold-btn"
              onClick={onSaveOpenTab}
              title="Guardar orden en cuentas abiertas para atender a otro cliente"
            >
              <Bookmark size={13} /> Espera
            </button>
          )}

          {cart.length > 0 && (
            <button
              type="button"
              className="pos-clear-cart-btn"
              onClick={onClearCart}
              title="Vaciar orden"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Active Tab Banner (if modifying a held tab) */}
      {activeTabName && (
        <div className="pos-editing-tab-banner">
          <span>Editando cuenta: <strong>{activeTabName}</strong></span>
          <button
            type="button"
            onClick={onCancelActiveTab}
            style={{ background: 'none', border: 'none', color: '#a16207', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline', fontWeight: '700' }}
          >
            Descartar
          </button>
        </div>
      )}

      {/* Order Mode Selector (Salón / Llevar / Delivery) */}
      <div className="pos-order-type-bar">
        <button
          type="button"
          className={`pos-order-type-btn ${orderType === 'salon' ? 'active salon' : ''}`}
          onClick={() => onChangeOrderType && onChangeOrderType('salon')}
        >
          <UtensilsCrossed size={14} /> Salón
        </button>

        <button
          type="button"
          className={`pos-order-type-btn ${orderType === 'para_llevar' ? 'active llevar' : ''}`}
          onClick={() => onChangeOrderType && onChangeOrderType('para_llevar')}
        >
          <ShoppingBag size={14} /> Llevar
        </button>

        <button
          type="button"
          className={`pos-order-type-btn ${orderType === 'delivery' ? 'active delivery' : ''}`}
          onClick={() => onChangeOrderType && onChangeOrderType('delivery')}
        >
          <Bike size={14} /> Delivery
        </button>
      </div>

      {/* Delivery Info Sub-Panel (Only if orderType === 'delivery') */}
      {orderType === 'delivery' && (
        <div className="pos-delivery-box">
          <div className="pos-delivery-input-group">
            <MapPin size={15} color="#0284c7" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Dirección de entrega (Urb, Calle, Casa/Apto)..."
              className="pos-delivery-input"
              value={deliveryInfo?.address || ''}
              onChange={(e) => onChangeDeliveryInfo && onChangeDeliveryInfo({ ...deliveryInfo, address: e.target.value })}
            />
          </div>

          <div className="pos-delivery-row">
            <div className="pos-delivery-input-group" style={{ flex: 1.2 }}>
              <Phone size={14} color="#0284c7" style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Teléfono contacto..."
                className="pos-delivery-input"
                value={deliveryInfo?.phone || (client?.phone || '')}
                onChange={(e) => onChangeDeliveryInfo && onChangeDeliveryInfo({ ...deliveryInfo, phone: e.target.value })}
              />
            </div>

            <div className="pos-delivery-input-group" style={{ flex: 1 }}>
              <Bike size={14} color="#0284c7" style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Repartidor..."
                className="pos-delivery-input"
                value={deliveryInfo?.courier || ''}
                onChange={(e) => onChangeDeliveryInfo && onChangeDeliveryInfo({ ...deliveryInfo, courier: e.target.value })}
              />
            </div>

            <div className="pos-delivery-input-group" style={{ width: '85px', flex: 'none' }} title="Costo de Envío / Delivery en $">
              <span className="pos-delivery-fee-badge">$ Envío</span>
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="0.00"
                className="pos-delivery-input"
                value={deliveryInfo?.deliveryFee === 0 ? '' : (deliveryInfo?.deliveryFee || '')}
                onChange={(e) => onChangeDeliveryInfo && onChangeDeliveryInfo({ ...deliveryInfo, deliveryFee: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Document Type Selector (Nota de Entrega vs Factura Fiscal SENIAT) */}
      {fiscalSettings?.enabled && (
        <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', marginBottom: '12px' }}>
          <button
            type="button"
            onClick={() => onChangeDocType && onChangeDocType('nota_entrega')}
            style={{
              flex: 1, padding: '7px 8px', borderRadius: '8px', border: 'none',
              background: !isFiscal ? '#2563eb' : 'transparent',
              color: !isFiscal ? '#ffffff' : '#64748b',
              fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={14} /> Nota Entrega
          </button>
          <button
            type="button"
            onClick={() => onChangeDocType && onChangeDocType('fiscal')}
            style={{
              flex: 1, padding: '7px 8px', borderRadius: '8px', border: 'none',
              background: isFiscal ? '#059669' : 'transparent',
              color: isFiscal ? '#ffffff' : '#64748b',
              fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              transition: 'all 0.15s ease'
            }}
          >
            <Printer size={14} /> Factura Fiscal
          </button>
        </div>
      )}

      {/* 4. Customer Selection */}
      <div className="pos-client-section">
        <div className="pos-client-label">
          <User size={13} /> Cliente / Receptor:
          {isFiscal && (
            <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: '800', marginLeft: 'auto' }}>
              RIF / Cédula fiscal
            </span>
          )}
        </div>
        <ClientSearch onSelect={onSelectClient} selected={client} />
        {isFiscal && (!client || client.id === 'generic' || client.name === 'Consumidor Final') && (
          <div style={{ fontSize: '0.69rem', color: '#64748b', marginTop: '4px' }}>
            ℹ️ Se emitirá a <strong>Consumidor Final (V-00000000)</strong> salvo que elijas cliente con RIF.
          </div>
        )}
      </div>

      {/* 5. Live Exchange Rate Bar */}
      <div className="pos-rate-bar">
        <div className="pos-rate-info">
          <span className="pos-rate-dot" />
          <span>Tasa BCV:</span>
          <span className="pos-rate-badge">Bs. {Number(currentRate).toFixed(4)}</span>
        </div>

        <div className="pos-rate-controls">
          <input
            type="number"
            step="0.0001"
            placeholder="Manual"
            title="Modificar tasa para esta operación"
            value={customRate}
            onChange={(e) => onSetCustomRate(e.target.value)}
            className="pos-rate-input"
          />
          {typeof onRefreshRate === 'function' && (
            <button
              type="button"
              className="pos-rate-refresh-btn"
              onClick={onRefreshRate}
              disabled={isRefreshingRate}
              title="Sincronizar tasa oficial BCV por Internet"
            >
              <RefreshCw size={12} style={{ animation: isRefreshingRate ? 'spin 0.8s linear infinite' : 'none' }} />
            </button>
          )}
        </div>
      </div>

      {/* Modalidad de Tarifa Activa */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 12px',
        margin: '0 16px 10px 16px',
        background: MODALIDADES[modalidad]?.bgLight || '#eff6ff',
        border: `1.5px solid ${MODALIDADES[modalidad]?.border || '#bfdbfe'}`,
        borderRadius: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '1rem' }}>{MODALIDADES[modalidad]?.icon}</span>
          <div>
            <div style={{ fontSize: '0.76rem', fontWeight: '800', color: MODALIDADES[modalidad]?.textColor }}>
              {MODALIDADES[modalidad]?.name}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
              {MODALIDADES[modalidad]?.description}
            </div>
          </div>
        </div>
        {typeof onModalidadChange === 'function' && (
          <select
            value={modalidad}
            onChange={(e) => onModalidadChange(e.target.value)}
            style={{
              padding: '4px 8px',
              fontSize: '0.75rem',
              fontWeight: '700',
              borderRadius: '8px',
              border: `1.5px solid ${MODALIDADES[modalidad]?.color}`,
              background: '#ffffff',
              color: MODALIDADES[modalidad]?.textColor,
              cursor: 'pointer'
            }}
          >
            {MODALIDADES_LIST.map(m => (
              <option key={m.id} value={m.id}>{m.shortLabel}</option>
            ))}
          </select>
        )}
      </div>

      {/* 6. Itemized Products Cart List */}
      <div className="pos-cart-list">
        {cart.length === 0 ? (
          <div className="pos-cart-empty">
            <ShoppingCart size={42} strokeWidth={1.5} />
            <div className="pos-cart-empty-title">Orden Vacía</div>
            <div className="pos-cart-empty-sub">Selecciona productos del catálogo a la izquierda</div>
          </div>
        ) : (
          cart.map((item) => {
            const itemImage = item.image || products.find(p => p.id === item.id)?.image;
            const unitPrice = Number(item.priceUSD || item.price || 0);
            const itemSubtotal = unitPrice * item.quantity;

            return (
              <div key={item.id} className="pos-cart-item">
                {/* Thumbnail */}
                <div className="pos-item-thumb">
                  {itemImage ? (
                    <img src={getAssetUrl(itemImage)} alt={item.name} loading="lazy" />
                  ) : (
                    <Receipt size={22} color="#94a3b8" />
                  )}
                </div>

                {/* Name & Prices */}
                <div className="pos-item-info">
                  <div className="pos-item-name" title={item.name}>
                    {item.name}
                  </div>
                  <div className="pos-item-price-row">
                    <span className="pos-item-unit-price">{formatUSD(unitPrice)} c/u</span>
                    {modalidad !== 'detal' && (
                      <span style={{ fontSize: '0.62rem', fontWeight: '800', padding: '1px 4px', borderRadius: '4px', background: MODALIDADES[modalidad]?.bgLight, color: MODALIDADES[modalidad]?.textColor, border: `1px solid ${MODALIDADES[modalidad]?.border}` }}>
                        {MODALIDADES[modalidad]?.badge}
                      </span>
                    )}
                    <span>•</span>
                    <span className="pos-item-subtotal">{formatUSD(itemSubtotal)}</span>
                  </div>
                </div>

                {/* Apple-style Stepper Controls */}
                <div className="pos-item-stepper">
                  <button
                    type="button"
                    className="pos-stepper-btn"
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    title="Restar uno"
                  >
                    <Minus size={11} strokeWidth={3} />
                  </button>
                  <span className="pos-stepper-qty">{item.quantity}</span>
                  <button
                    type="button"
                    className="pos-stepper-btn"
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    title="Sumar uno"
                  >
                    <Plus size={11} strokeWidth={3} />
                  </button>
                  <button
                    type="button"
                    className="pos-stepper-btn trash"
                    onClick={() => onRemoveFromCart(item.id)}
                    title="Quitar ítem"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 7. Payment Summary Card (Enhanced with SENIAT Fiscal breakdown) */}
      <div className={`pos-summary-card ${isFiscal ? 'fiscal-card' : ''}`}>
        <div className="pos-summary-row">
          <span>Subtotal productos</span>
          <span style={{ fontWeight: '700', color: '#0f172a' }}>{formatUSD(itemsSubtotalUSD)}</span>
        </div>

        {deliveryFeeUSD > 0 && (
          <div className="pos-summary-row" style={{ color: '#0284c7', paddingTop: '2px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Bike size={14} /> Costo de Envío Delivery
            </span>
            <span style={{ fontWeight: '800' }}>+{formatUSD(deliveryFeeUSD)}</span>
          </div>
        )}

        {isFiscal && (
          <>
            <div className="pos-summary-divider" />
            <div className="pos-summary-row" style={{ fontSize: '0.78rem' }}>
              <span>Base Imponible (16% G):</span>
              <span>{formatUSD(baseImponibleUSD)} <span style={{ color: '#94a3b8' }}>({formatBs(baseImponibleBs)})</span></span>
            </div>
            <div className="pos-summary-row" style={{ fontSize: '0.78rem' }}>
              <span>IVA (16% G):</span>
              <span style={{ color: '#059669', fontWeight: '800' }}>+{formatUSD(ivaUSD)} <span style={{ color: '#94a3b8' }}>({formatBs(ivaBs)})</span></span>
            </div>

            {isForeignPayment ? (
              <div className="pos-summary-row" style={{ fontSize: '0.78rem', color: '#7c3aed' }}>
                <span title="Impuesto a Grandes Transacciones Financieras (3% en divisas)">+ IGTF (3% Divisas):</span>
                <span style={{ fontWeight: '800' }}>+{formatUSD(igtfUSD)} <span style={{ opacity: 0.85 }}>({formatBs(igtfBs)})</span></span>
              </div>
            ) : (
              <div className="pos-summary-row" style={{ fontSize: '0.74rem', color: '#64748b' }}>
                <span>IGTF (Bolívares):</span>
                <span style={{ fontWeight: '800', color: '#059669' }}>Exento (0%)</span>
              </div>
            )}
          </>
        )}

        <div className="pos-summary-divider" />

        {/* Total Dólares ($) */}
        <div className="pos-total-usd-row">
          <span className="pos-total-usd-label">
            {isFiscal ? 'Total Fiscal ($)' : 'Total a Pagar ($)'}
          </span>
          <span className="pos-total-usd-amount">{formatUSD(cartTotalUSD)}</span>
        </div>

        {/* Total Bolívares (Bs) */}
        <div className="pos-total-bs-row">
          <div className="pos-total-bs-header">
            <span>{isFiscal ? 'Total Fiscal Oficial (Bs)' : 'Equivalente Oficial (Bs)'}</span>
            <span>Tasa {Number(currentRate).toFixed(4)}</span>
          </div>
          <span 
            className="pos-total-bs-amount"
            style={{ fontSize: bsFontSize }}
          >
            {bsFormatted}
          </span>
        </div>
      </div>

      {/* 8. Fast In-Cart Payment Method Selector & Helpers */}
      <div className="pos-cart-payment-section">
        <div className="pos-cart-payment-header">
          <span>Forma de Pago</span>
        </div>

        <div className="pos-cart-payment-grid">
          {SIDEBAR_METHODS.map((m) => {
            const isSelected = paymentMethod === m.id;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                className={`pos-cart-method-btn ${isSelected ? 'active' : ''} ${m.id === 'mixto' ? 'btn-mixto' : ''}`}
                onClick={() => {
                  if (onSelectPaymentMethod) onSelectPaymentMethod(m.id);
                  if (m.id === 'mixto') {
                    if (onOpenPaymentModal) onOpenPaymentModal();
                  }
                }}
              >
                {Icon && <Icon size={15} color={isSelected ? m.color : '#64748b'} />}
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Inline Fast Payment Details (No popup needed for standard sales) */}
        {paymentMethod === 'efectivo_usd' && (
          <div className="pos-inline-payment-details">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#065f46' }}>
                💵 Dólares Recibidos en Caja:
              </span>
              <div className="pos-quick-cash-chips">
                {cashChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="pos-cash-chip"
                    onClick={() => onChangeCashReceivedUSD && onChangeCashReceivedUSD(chip.value)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pos-cash-input-row">
              <div className="pos-cash-input-box">
                <span style={{ fontWeight: '900', color: '#059669', fontSize: '1rem' }}>$</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder={cartTotalUSD > 0 ? cartTotalUSD.toFixed(2) : '0.00'}
                  value={cashReceivedUSD}
                  onChange={(e) => onChangeCashReceivedUSD && onChangeCashReceivedUSD(e.target.value)}
                />
              </div>
            </div>

            {cashNumUSD > 0 && cashNumUSD >= cartTotalUSD && (
              <div className="pos-live-change-box">
                <strong>Cambio a devolver:</strong>
                <span>
                  <strong>${changeUSD.toFixed(2)}</strong> ({formatBs(changeBs)})
                </span>
              </div>
            )}

            {cashNumUSD > 0 && cashNumUSD < cartTotalUSD && (
              <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: '700' }}>
                ⚠️ Monto insuficiente. Faltan ${(cartTotalUSD - cashNumUSD).toFixed(2)}
              </div>
            )}
          </div>
        )}

        {paymentMethod === 'pago_movil' && (
          <div className="pos-inline-payment-details">
            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#1d4ed8' }}>
              📲 Banco Receptor y Referencia:
            </span>
            <BankSelector
              selectedBank={pagoMovilBank}
              onSelectBank={onSelectPagoMovilBank}
              placeholder="Banco receptor del Pago Móvil..."
            />
            <div className="pos-pm-ref-box">
              <input
                type="text"
                maxLength={4}
                className="pos-pm-ref-input"
                placeholder="Últimos 4 dígitos de Referencia (Ej: 3481)"
                value={pagoMovilRef}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  if (onChangePagoMovilRef) onChangePagoMovilRef(val);
                }}
              />
              {pagoMovilRef && pagoMovilRef.length === 4 ? (
                <span style={{ color: '#059669', fontWeight: '800', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Check size={14} /> Listo
                </span>
              ) : (
                <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                  {pagoMovilRef.length}/4
                </span>
              )}
            </div>
          </div>
        )}

        {paymentMethod === 'efectivo_bs' && (
          <div className="pos-inline-payment-details">
            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#d97706' }}>
              🇻🇪 Bolívares en Efectivo:
            </span>
            <div className="pos-cash-input-row">
              <div className="pos-cash-input-box">
                <span style={{ fontWeight: '900', color: '#d97706', fontSize: '0.85rem' }}>Bs.</span>
                <input
                  type="number"
                  step="any"
                  placeholder={cartTotalBs > 0 ? cartTotalBs.toFixed(2) : '0.00'}
                  value={cashReceivedBs}
                  onChange={(e) => onChangeCashReceivedBs && onChangeCashReceivedBs(e.target.value)}
                />
              </div>
            </div>
            {parseFloat(cashReceivedBs) > cartTotalBs && (
              <div className="pos-live-change-box">
                <strong>Vuelto en Bs:</strong>
                <span>{formatBs(parseFloat(cashReceivedBs) - cartTotalBs)}</span>
              </div>
            )}
          </div>
        )}

        {paymentMethod === 'mixto' && (
          <div className="pos-inline-payment-details">
            <button
              type="button"
              onClick={() => {
                if (isNightLocked) {
                  if (onOpenLockModal) onOpenLockModal();
                  return;
                }
                if (onOpenPaymentModal) onOpenPaymentModal();
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: '#0f766e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '800',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>🔀 Desglosar Pago Mixto ($ + Bs + PM)</span>
            </button>
          </div>
        )}
      </div>

      {/* 9. Bottom Action Section */}
      <div className="pos-sidebar-footer">
        <button
          type="button"
          className={`pos-submit-btn ${isNightLocked ? 'pos-submit-btn-locked' : ''}`}
          onClick={handlePrimaryClick}
          disabled={cart.length === 0 && !isNightLocked}
          style={isNightLocked ? {
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            borderColor: '#b91c1c',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)'
          } : undefined}
          title={isNightLocked ? "Facturación bloqueada: Debe realizar el Cierre de Caja" : "Cobrar y procesar venta (Enter)"}
        >
          {isNightLocked ? <AlertCircle size={22} /> : <Receipt size={22} />}
          <div className="pos-submit-text-col">
            <span className="pos-submit-main-title">
              {isNightLocked ? '🔒 CAJA BLOQUEADA (DEBE CERRAR)' : 'COBRAR / PROCESAR VENTA'}
            </span>
            <span className="pos-submit-sub-title">
              {isNightLocked ? 'Hacer Cierre de Caja y Reporte Z antes de las 12 AM' : 'Nota de Entrega o Factura Fiscal SENIAT'}
            </span>
          </div>
          <span className="pos-key-badge">{isNightLocked ? 'Bloqueado' : '↵ Enter'}</span>
        </button>
      </div>
    </aside>
  );
};

export default POSInvoiceSidebar;
