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

  const handleOpenWhatsApp = () => {
    const rawPhone = (deliveryInfo?.phone || client?.phone || '').replace(/\D/g, '');
    if (!rawPhone) return;
    let intlPhone = rawPhone;
    if (intlPhone.startsWith('0')) {
      intlPhone = '58' + intlPhone.slice(1);
    } else if (!intlPhone.startsWith('58') && intlPhone.length === 10) {
      intlPhone = '58' + intlPhone;
    }
    
    const clientName = client?.name || 'Cliente';
    const itemsList = cart.map(i => `• ${i.quantity}x ${i.name} ($${(Number(i.priceUSD || i.price || 0) * i.quantity).toFixed(2)})`).join('\n');
    const delFee = parseFloat(deliveryInfo?.deliveryFee) || 0;
    const msg = `🛵 *PEDIDO DELIVERY - FACTURAPOS*\n` +
      `Hola *${clientName}*, confirmamos los datos de tu pedido:\n\n` +
      `📋 *Detalle:* \n${itemsList}\n` +
      (delFee > 0 ? `🛵 Envío Delivery: $${delFee.toFixed(2)}\n` : '') +
      `💰 *Total a Pagar:* $${cartTotalUSD.toFixed(2)} (Bs. ${cartTotalBs.toFixed(2)})\n` +
      `📍 *Dirección de Entrega:* ${deliveryInfo?.address || 'Por confirmar'}\n` +
      (deliveryInfo?.courier ? `🛵 *Repartidor:* ${deliveryInfo.courier}\n` : '') +
      `\n¡Gracias por preferirnos!`;

    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

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
          <h3 className="pos-header-title">Comanda</h3>
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
              title="Guardar comanda en cuentas abiertas para atender a otro cliente"
            >
              <Bookmark size={13} /> Espera
            </button>
          )}

          {cart.length > 0 && (
            <button
              type="button"
              className="pos-clear-cart-btn"
              onClick={onClearCart}
              title="Vaciar comanda"
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

      {/* Mode Specific: Delivery Form (Opción 1: Centrado en Contactos) vs Normal Client Section */}
      {orderType === 'delivery' ? (
        <div style={{
          padding: '12px 18px',
          background: '#f0f9ff',
          borderBottom: '1.5px solid #bae6fd',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          flexShrink: 0
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Bike size={14} /> Datos de Envío & Destinatario
            </span>
            <span style={{ fontSize: '0.7rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
              Delivery
            </span>
          </div>

          {/* 1. Client / Contact Selector (PROTAGONISTA) */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#0284c7', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <User size={12} /> Contacto / Cliente Receptor:
            </div>
            <ClientSearch onSelect={onSelectClient} selected={client} />
          </div>

          {/* 2. Dirección de Entrega con botón de guardar como habitual */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} /> Dirección de Entrega:
              </label>
              {client && client.id && client.id !== 'generic' && deliveryInfo?.address && deliveryInfo.address.trim() !== (client.address || '').trim() && (
                <button
                  type="button"
                  onClick={() => onSaveClientAddress && onSaveClientAddress(deliveryInfo.address)}
                  title="Guardar esta nueva dirección en la ficha del cliente"
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.68rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Bookmark size={11} /> Guardar en contacto
                </button>
              )}
            </div>
            <div className="pos-delivery-input-group" style={{ background: '#ffffff' }}>
              <MapPin size={14} color="#0284c7" style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Urb, Calle, Casa/Apto, Punto de referencia..."
                className="pos-delivery-input"
                value={deliveryInfo?.address || ''}
                onChange={(e) => onChangeDeliveryInfo && onChangeDeliveryInfo({ ...deliveryInfo, address: e.target.value })}
              />
            </div>
          </div>

          {/* 3. Teléfono de contacto con botón directo a WhatsApp */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={12} /> Teléfono Contacto:
              </label>
              {(deliveryInfo?.phone || client?.phone) && (
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  title="Abrir chat de WhatsApp con el cliente y enviar detalle del pedido"
                  style={{
                    background: '#22c55e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>📲 WhatsApp</span>
                </button>
              )}
            </div>
            <div className="pos-delivery-input-group" style={{ background: '#ffffff' }}>
              <Phone size={14} color="#0284c7" style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Ej: 0414-1234567..."
                className="pos-delivery-input"
                value={deliveryInfo?.phone || (client?.phone || '')}
                onChange={(e) => onChangeDeliveryInfo && onChangeDeliveryInfo({ ...deliveryInfo, phone: e.target.value })}
              />
            </div>
          </div>

          {/* 4. Repartidor con Chips Rápidos */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#0369a1', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Bike size={12} /> Repartidor:
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '5px', flexWrap: 'wrap' }}>
              {['Moto 1', 'Moto 2', 'Yummy', 'PedidosYa'].map(rep => {
                const isSelected = deliveryInfo?.courier === rep;
                return (
                  <button
                    key={rep}
                    type="button"
                    onClick={() => onChangeDeliveryInfo && onChangeDeliveryInfo({ ...deliveryInfo, courier: isSelected ? '' : rep })}
                    style={{
                      background: isSelected ? '#0284c7' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#0369a1',
                      border: isSelected ? '1px solid #0284c7' : '1px solid #bae6fd',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    {rep}
                  </button>
                );
              })}
            </div>
            <div className="pos-delivery-input-group" style={{ background: '#ffffff' }}>
              <Bike size={14} color="#0284c7" style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Nombre o empresa de repartidor..."
                className="pos-delivery-input"
                value={deliveryInfo?.courier || ''}
                onChange={(e) => onChangeDeliveryInfo && onChangeDeliveryInfo({ ...deliveryInfo, courier: e.target.value })}
              />
            </div>
          </div>

          {/* 5. Costo de Envío / Delivery con Chips Rápidos */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#0369a1', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <DollarSign size={12} /> Tarifa de Envío ($):
              </span>
              <span style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '800' }}>
                Bs. {((parseFloat(deliveryInfo?.deliveryFee) || 0) * currentRate).toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '5px', flexWrap: 'wrap' }}>
              {[0, 1, 2, 3, 4].map(fee => {
                const isSelected = Number(deliveryInfo?.deliveryFee) === fee;
                return (
                  <button
                    key={fee}
                    type="button"
                    onClick={() => onChangeDeliveryInfo && onChangeDeliveryInfo({ ...deliveryInfo, deliveryFee: fee })}
                    style={{
                      background: isSelected ? '#059669' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#065f46',
                      border: isSelected ? '1px solid #059669' : '1px solid #a7f3d0',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    {fee === 0 ? 'Gratis' : `$${fee}`}
                  </button>
                );
              })}
            </div>
            <div className="pos-delivery-input-group" style={{ background: '#ffffff' }}>
              <span className="pos-delivery-fee-badge">$ Envío:</span>
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
      ) : (
        /* 3. Standard Customer Selection for Salón & Llevar */
        <div className="pos-client-section">
          <div className="pos-client-label">
            <User size={13} /> Cliente / Receptor:
          </div>
          <ClientSearch onSelect={onSelectClient} selected={client} />
        </div>
      )}

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
            <div className="pos-cart-empty-title">Comanda Vacía</div>
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
                    <img src={itemImage} alt={item.name} loading="lazy" />
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
