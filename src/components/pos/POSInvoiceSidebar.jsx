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
  Bookmark
} from 'lucide-react';
import ClientSearch from '../ClientSearch';
import { formatUSD, formatBs, getBsFontSize } from '../../utils/currency';
import { getAssetUrl } from '../../utils/assetHelper';
import { VZLA_BANKS } from '../../utils/venezuelaBanks';
import './POSInvoiceSidebar.css';

export { VZLA_BANKS };

const SIDEBAR_METHODS = [
  { id: 'efectivo_usd', label: 'Efectivo $', icon: DollarSign, color: '#059669' },
  { id: 'pago_movil', label: 'Pago Móvil', icon: Smartphone, color: '#2563eb' },
  { id: 'efectivo_bs', label: 'Efectivo Bs', icon: Banknote, color: '#d97706' },
  { id: 'zelle', label: 'Zelle / Tarjeta', icon: CreditCard, color: '#7c3aed' },
  { id: 'mixto', label: '🔀 Pago Dividido / Mixto', icon: null, color: '#0f766e' }
];

const POSInvoiceSidebar = ({
  cart = [],
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
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
  onSaveClientAddress
}) => {
  // Calculations with Delivery Fee
  const totalItemsCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const itemsSubtotalUSD = cart.reduce((sum, item) => {
    const price = Number(item.priceUSD || item.price || 0);
    return sum + (price * (item.quantity || 1));
  }, 0);
  const deliveryFeeUSD = orderType === 'delivery' ? (parseFloat(deliveryInfo?.deliveryFee) || 0) : 0;
  const cartTotalUSD = itemsSubtotalUSD + deliveryFeeUSD;
  const cartTotalBs = cartTotalUSD * currentRate;

  const bsFormatted = formatBs(cartTotalBs);
  const bsFontSize = getBsFontSize(bsFormatted);

  return (
    <aside className="pos-invoice-sidebar">
      {/* 1. Restaurant Table Origin Banner */}
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

      {/* 2. Top Header */}
      <div className="pos-sidebar-header">
        <div className="pos-header-title-box">
          <FileText size={20} color="var(--brand-primary, #2563eb)" />
          <h3 className="pos-header-title">Nota de Entrega</h3>
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

      {/* 2. Delivery Info Sub-Panel (Only if orderType === 'delivery') */}
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

      {/* 3. Customer Selection */}
      <div className="pos-client-section">
        <div className="pos-client-label">
          <User size={13} /> Cliente / Receptor:
        </div>
        <ClientSearch onSelect={onSelectClient} selected={client} />
      </div>

      {/* 4. Live Exchange Rate Bar */}
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

      {/* 5. Itemized Products Cart List */}
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
                    <span>•</span>
                    <span className="pos-item-subtotal">{formatUSD(itemSubtotal)}</span>
                  </div>
                </div>

                {/* Apple-style Stepper Stepper Controls */}
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

      {/* 6. Payment Summary Card (Apple Style) */}
      <div className="pos-summary-card">
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

        <div className="pos-summary-divider" />

        {/* Total Dólares ($) */}
        <div className="pos-total-usd-row">
          <span className="pos-total-usd-label">Total a Pagar ($)</span>
          <span className="pos-total-usd-amount">{formatUSD(cartTotalUSD)}</span>
        </div>

        {/* Total Bolívares (Bs) - Con protección anti-desbordamiento */}
        <div className="pos-total-bs-row">
          <div className="pos-total-bs-header">
            <span>Equivalente Oficial (Bs)</span>
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

      {/* 7. In-Cart Payment Method Selector */}
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
                  if (m.id === 'pago_movil' || m.id === 'mixto') {
                    if (onGenerateNotaEntrega) onGenerateNotaEntrega();
                  }
                }}
              >
                {Icon && <Icon size={15} color={isSelected ? m.color : '#64748b'} />}
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 8. Bottom Single Action: Generar Nota de Entrega */}
      <div className="pos-sidebar-footer">
        <button
          type="button"
          className="pos-submit-btn"
          onClick={onGenerateNotaEntrega}
          disabled={cart.length === 0}
          title="Generar Nota de Entrega oficial para el cliente (Enter)"
        >
          <Receipt size={20} />
          <span>Generar Nota de Entrega</span>
          <span className="pos-key-badge">↵ Enter</span>
        </button>
      </div>
    </aside>
  );
};

export default POSInvoiceSidebar;
