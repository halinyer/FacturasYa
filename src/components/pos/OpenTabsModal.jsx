import React, { useState, useMemo } from 'react';
import { 
  X, 
  Clock, 
  Bike, 
  UtensilsCrossed, 
  ShoppingBag, 
  CreditCard, 
  PlusCircle, 
  Printer, 
  Trash2, 
  CheckCircle2, 
  MapPin,
  Phone,
  User,
  Receipt
} from 'lucide-react';
import { formatUSD, formatBs } from '../../utils/currency';

const STATUS_CONFIG = {
  abierta: { label: 'Abierta / En Espera', bg: '#f1f5f9', color: '#475569', icon: Clock },
  cocina: { label: '👨‍🍳 En Cocina', bg: '#fef3c7', color: '#b45309', icon: Clock },
  en_camino: { label: '🛵 En Camino', bg: '#e0f2fe', color: '#0369a1', icon: Bike },
  por_cobrar: { label: '💵 Por Cobrar', bg: '#dcfce7', color: '#15803d', icon: CheckCircle2 }
};

export default function OpenTabsModal({
  isOpen,
  onClose,
  openTabs = [],
  currentRate = 876.80,
  onChargeTab,
  onEditTab,
  onPrintPreBill,
  onDeleteTab,
  onUpdateTabStatus
}) {
  const [filterType, setFilterType] = useState('todos'); // 'todos' | 'delivery' | 'salon' | 'para_llevar'

  const filteredTabs = useMemo(() => {
    if (filterType === 'todos') return openTabs;
    return openTabs.filter(t => (t.orderType || 'salon') === filterType);
  }, [openTabs, filterType]);

  const deliveryCount = openTabs.filter(t => t.orderType === 'delivery').length;
  const salonCount = openTabs.filter(t => (t.orderType || 'salon') === 'salon').length;
  const llevarCount = openTabs.filter(t => t.orderType === 'para_llevar').length;

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2100,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }} onClick={onClose}>
      
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Receipt size={22} color="#2563eb" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                Cuentas Abiertas y Deliveries
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Lleva la cuenta de tus clientes en salón y pedidos a domicilio pendientes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
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

        {/* Filter Pills Bar */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 24px',
          background: '#ffffff',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <button
            type="button"
            onClick={() => setFilterType('todos')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: filterType === 'todos' ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
              background: filterType === 'todos' ? '#eff6ff' : '#ffffff',
              color: filterType === 'todos' ? '#1d4ed8' : '#64748b',
              fontWeight: '700',
              fontSize: '0.84rem',
              cursor: 'pointer'
            }}
          >
            Todos ({openTabs.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('delivery')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              border: filterType === 'delivery' ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
              background: filterType === 'delivery' ? '#f0f9ff' : '#ffffff',
              color: filterType === 'delivery' ? '#0369a1' : '#64748b',
              fontWeight: '700',
              fontSize: '0.84rem',
              cursor: 'pointer'
            }}
          >
            <Bike size={15} /> Delivery ({deliveryCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('salon')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              border: filterType === 'salon' ? '1.5px solid #d97706' : '1px solid #e2e8f0',
              background: filterType === 'salon' ? '#fffbeb' : '#ffffff',
              color: filterType === 'salon' ? '#b45309' : '#64748b',
              fontWeight: '700',
              fontSize: '0.84rem',
              cursor: 'pointer'
            }}
          >
            <UtensilsCrossed size={15} /> Salón ({salonCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('para_llevar')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              border: filterType === 'para_llevar' ? '1.5px solid #9333ea' : '1px solid #e2e8f0',
              background: filterType === 'para_llevar' ? '#faf5ff' : '#ffffff',
              color: filterType === 'para_llevar' ? '#7e22ce' : '#64748b',
              fontWeight: '700',
              fontSize: '0.84rem',
              cursor: 'pointer'
            }}
          >
            <ShoppingBag size={15} /> Para Llevar ({llevarCount})
          </button>
        </div>

        {/* Content Body */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          flex: 1,
          background: '#f8fafc'
        }}>
          {filteredTabs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px dashed #cbd5e1'
            }}>
              <Receipt size={48} color="#94a3b8" style={{ marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#1e293b', fontWeight: '800' }}>
                No hay cuentas abiertas en esta categoría
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', maxWidth: '420px', display: 'inline-block' }}>
                Cuando estés armando un pedido en el POS, usa el botón <strong>"Poner en Espera / Guardar Cuenta"</strong> para dejar la cuenta abierta y atender a otros clientes.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
              gap: '16px'
            }}>
              {filteredTabs.map((tab) => {
                const isDelivery = tab.orderType === 'delivery';
                const isLlevar = tab.orderType === 'para_llevar';
                
                const itemsSubtotal = (tab.items || []).reduce((sum, item) => {
                  return sum + ((Number(item.priceUSD || item.price || 0)) * (item.quantity || 1));
                }, 0);

                const deliveryFee = isDelivery ? (Number(tab.deliveryInfo?.deliveryFee || 0)) : 0;
                const totalUSD = itemsSubtotal + deliveryFee;
                const totalBs = totalUSD * currentRate;

                const elapsedMin = Math.round((Date.now() - new Date(tab.createdAt || Date.now()).getTime()) / 60000);
                const currentStatus = STATUS_CONFIG[tab.status] || STATUS_CONFIG.abierta;

                return (
                  <div
                    key={tab.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '18px',
                      border: isDelivery ? '1.5px solid #bae6fd' : '1px solid #e2e8f0',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      {/* Header Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: '800',
                              textTransform: 'uppercase',
                              background: isDelivery ? '#e0f2fe' : isLlevar ? '#f3e8ff' : '#fef3c7',
                              color: isDelivery ? '#0369a1' : isLlevar ? '#7e22ce' : '#b45309'
                            }}>
                              {isDelivery ? <><Bike size={12} /> Delivery</> : isLlevar ? <><ShoppingBag size={12} /> Para Llevar</> : <><UtensilsCrossed size={12} /> Salón</>}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> {elapsedMin <= 1 ? 'Justo ahora' : `Hace ${elapsedMin} min`}
                            </span>
                          </div>

                          <h3 style={{ margin: '6px 0 2px 0', fontSize: '1.12rem', fontWeight: '800', color: '#0f172a' }}>
                            {tab.name}
                          </h3>

                          {tab.client && tab.client.name && tab.client.name !== 'Consumidor Final' && (
                            <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <User size={13} color="#64748b" /> {tab.client.name}
                            </div>
                          )}
                        </div>

                        {/* Status Switcher (for Delivery or Kitchen) */}
                        <div>
                          <select
                            value={tab.status || (isDelivery ? 'cocina' : 'abierta')}
                            onChange={(e) => onUpdateTabStatus && onUpdateTabStatus(tab.id, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              background: currentStatus.bg,
                              color: currentStatus.color,
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value="cocina">👨‍🍳 En Cocina</option>
                            <option value="en_camino">🛵 En Camino</option>
                            <option value="por_cobrar">💵 Por Cobrar</option>
                            <option value="abierta">📋 Cuenta Abierta</option>
                          </select>
                        </div>
                      </div>

                      {/* Delivery Specific Info Box */}
                      {isDelivery && tab.deliveryInfo && (tab.deliveryInfo.address || tab.deliveryInfo.phone || tab.deliveryInfo.courier) && (
                        <div style={{
                          background: '#f0f9ff',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          border: '1px solid #e0f2fe',
                          marginBottom: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          fontSize: '0.8rem'
                        }}>
                          {tab.deliveryInfo.address && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#0369a1' }}>
                              <MapPin size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                              <span style={{ fontWeight: '600' }}>{tab.deliveryInfo.address}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', color: '#0284c7', fontSize: '0.76rem' }}>
                            {tab.deliveryInfo.phone && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={12} /> {tab.deliveryInfo.phone}
                              </span>
                            )}
                            {tab.deliveryInfo.phone && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rawPhone = (tab.deliveryInfo.phone || '').replace(/\D/g, '');
                                  let intlPhone = rawPhone;
                                  if (intlPhone.startsWith('0')) intlPhone = '58' + intlPhone.slice(1);
                                  else if (!intlPhone.startsWith('58') && intlPhone.length === 10) intlPhone = '58' + intlPhone;
                                  const itemsList = (tab.items || []).map(i => `• ${i.quantity}x ${i.name}`).join('\n');
                                  const msg = `🛵 *PEDIDO DELIVERY - FACTURAPOS*\n` +
                                    `Hola *${tab.client?.name || tab.name}*, tu pedido está en preparación/despacho:\n\n` +
                                    `📋 *Detalle:*\n${itemsList}\n` +
                                    `💰 *Total:* $${totalUSD.toFixed(2)} (Bs. ${totalBs.toFixed(2)})\n` +
                                    `📍 *Dirección:* ${tab.deliveryInfo.address || 'Por confirmar'}\n` +
                                    (tab.deliveryInfo.courier ? `🛵 *Repartidor:* ${tab.deliveryInfo.courier}\n` : '');
                                  window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                                title="Enviar pedido y estado por WhatsApp"
                                style={{
                                  background: '#22c55e', color: '#ffffff', border: 'none', borderRadius: '6px',
                                  padding: '2px 8px', fontSize: '0.68rem', fontWeight: '800', cursor: 'pointer',
                                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                                }}
                              >
                                <span>📲 WhatsApp</span>
                              </button>
                            )}
                            {tab.deliveryInfo.courier && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Bike size={12} /> Repartidor: <strong>{tab.deliveryInfo.courier}</strong>
                              </span>
                            )}
                            {deliveryFee > 0 && (
                              <span>Flete: <strong>{formatUSD(deliveryFee)}</strong></span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Items List Preview */}
                      <div style={{
                        background: '#f8fafc',
                        borderRadius: '10px',
                        padding: '10px',
                        marginBottom: '14px',
                        maxHeight: '110px',
                        overflowY: 'auto'
                      }}>
                        {(tab.items || []).map((item, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.82rem',
                            padding: '3px 0',
                            borderBottom: idx < tab.items.length - 1 ? '1px dashed #e2e8f0' : 'none'
                          }}>
                            <span style={{ color: '#1e293b' }}>
                              <strong style={{ color: '#2563eb' }}>{item.quantity}x</strong> {item.name}
                            </span>
                            <span style={{ fontWeight: '700', color: '#475569' }}>
                              {formatUSD((Number(item.priceUSD || item.price || 0)) * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Totals and Actions */}
                    <div>
                      {/* Total Amount Row */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        padding: '10px 0 14px 0',
                        borderTop: '1px solid #f1f5f9'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600' }}>Total a Cobrar:</div>
                          <div style={{ fontSize: '0.8rem', color: '#059669', fontFamily: 'monospace', fontWeight: '700' }}>
                            Bs. {formatBs(totalBs)}
                          </div>
                        </div>
                        <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a' }}>
                          {formatUSD(totalUSD)}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {/* 1. Cobrar en Caja */}
                        <button
                          type="button"
                          onClick={() => onChargeTab && onChargeTab(tab)}
                          style={{
                            flex: 1.3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '10px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                          }}
                        >
                          <CreditCard size={15} /> Cobrar
                        </button>

                        {/* 2. Cargar / Seguir sumando a la cuenta */}
                        <button
                          type="button"
                          onClick={() => onEditTab && onEditTab(tab)}
                          title="Cargar pedido al POS para agregar más productos"
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '10px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '0.82rem',
                            cursor: 'pointer'
                          }}
                        >
                          <PlusCircle size={14} /> + Productos
                        </button>

                        {/* 3. Pre-orden Ticket */}
                        <button
                          type="button"
                          onClick={() => onPrintPreBill && onPrintPreBill(tab)}
                          title="Ver / Imprimir ticket de pre-orden para el cliente o bolsa"
                          style={{
                            padding: '10px',
                            background: '#f8fafc',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Printer size={15} />
                        </button>

                        {/* 4. Eliminar / Cancelar */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Seguro que deseas eliminar la cuenta "${tab.name}"?`)) {
                              onDeleteTab && onDeleteTab(tab.id);
                            }
                          }}
                          title="Cancelar cuenta"
                          style={{
                            padding: '10px',
                            background: '#fff1f2',
                            color: '#e11d48',
                            border: '1px solid #fecdd3',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff'
        }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Tasa BCV activa: <strong>Bs. {Number(currentRate).toFixed(4)}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              background: '#f1f5f9',
              color: '#334155',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>

      </div>

    </div>
  );
}
