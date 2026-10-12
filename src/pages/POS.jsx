import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  X, 
  ShoppingCart, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  DollarSign, 
  Banknote, 
  Smartphone, 
  CreditCard,
  Receipt,
  User,
  Sparkles,
  IceCreamCone,
  Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import ClientSearch from '../components/ClientSearch';
import InvoicePreview from '../components/InvoicePreview';

const POS = () => {
  const { user } = useAuth();
  const { products = [], createInvoice, exchangeRate = 36.5, loadExchangeRate } = useData() || {};

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [cart, setCart] = useState([]);
  const [client, setClient] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('efectivo_usd');
  const [isPending, setIsPending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [toast, setToast] = useState(null);
  const [customRate, setCustomRate] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  
  const [isMixedPayment, setIsMixedPayment] = useState(false);
  const [mixedPayments, setMixedPayments] = useState({
    efectivo_usd: '',
    pago_movil: '',
    efectivo_bs: '',
    zelle: ''
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loadedTableOrder, setLoadedTableOrder] = useState(null);

  // Auto-load incoming order transferred from Tables/Salón
  React.useEffect(() => {
    const saved = sessionStorage.getItem('pos_incoming_table_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.items && parsed.items.length > 0) {
          setCart(parsed.items);
          setLoadedTableOrder(parsed);
          setShowPaymentModal(true); // Open payment modal directly
        }
      } catch (e) {
        console.error('Error cargando orden de mesa:', e);
      }
      sessionStorage.removeItem('pos_incoming_table_order');
    }
  }, []);

  const currentRate = customRate ? parseFloat(customRate) : exchangeRate;

  // Listen for Enter to open payment modal
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && cart.length > 0 && !showPaymentModal && !showPreview) {
        // Only trigger if focus is not on search or other text inputs
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        setShowPaymentModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showPaymentModal, showPreview]);

  // Categories
  const categories = useMemo(() => {
    const activeProds = (products || []).filter(p => p.active !== false);
    const cats = new Set(activeProds.map(p => p.category || 'General'));
    return ['Todos', ...Array.from(cats)];
  }, [products]);

  // Products
  const filteredProducts = useMemo(() => {
    return (products || [])
      .filter(p => p.active !== false)
      .filter(p => activeCategory === 'Todos' || (p.category || 'General') === activeCategory)
      .filter(p => {
        const name = (p.name || p.nombre || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || sku.includes(q);
      });
  }, [products, search, activeCategory]);

  const cartTotalUSD = cart.reduce((sum, item) => sum + ((item.priceUSD || item.price || 0) * item.quantity), 0);
  const cartTotalBs = cartTotalUSD * currentRate;

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { 
        id: product.id,
        name: product.name || product.nombre || 'Producto',
        priceUSD: Number(product.priceUSD || product.price || 0),
        category: product.category,
        quantity: 1 
      }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const paymentOptions = [
    { id: 'efectivo_usd', label: 'Efectivo $', sub: 'Dólares', icon: DollarSign, color: '#059669', bg: '#ecfdf5', border: '#10b981' },
    { id: 'pago_movil', label: 'Pago Móvil', sub: 'Transferencia Bs', icon: Smartphone, color: '#2563eb', bg: '#eff6ff', border: '#3b82f6' },
    { id: 'efectivo_bs', label: 'Efectivo Bs', sub: 'Bolívares en caja', icon: Banknote, color: '#d97706', bg: '#fffbeb', border: '#f59e0b' },
    { id: 'zelle', label: 'Zelle', sub: 'Transferencia USA', icon: CreditCard, color: '#7c3aed', bg: '#f5f3ff', border: '#8b5cf6' },
  ];

  const handleFacturar = () => {
    if (cart.length === 0) {
      showToast('El carrito está vacío. Agrega al menos un producto.', 'error');
      return;
    }

    try {
      const selectedClient = client || { id: 'generic', name: 'Cliente Genérico', cedula: 'V-00000000', type: 'normal' };
      const isClientCongelador = selectedClient.type === 'congelador';
      const status = (isPending && isClientCongelador) ? 'pending' : 'paid';

      let finalPaymentMethod = paymentMethod;
      let finalMixedPayments = null;
      let totalReceivedUSD = 0;

      if (isMixedPayment) {
        finalPaymentMethod = 'mixto';
        const usdCash = parseFloat(mixedPayments.efectivo_usd) || 0;
        const zelle = parseFloat(mixedPayments.zelle) || 0;
        const pmBs = parseFloat(mixedPayments.pago_movil) || 0;
        const bsCash = parseFloat(mixedPayments.efectivo_bs) || 0;
        
        const pmUSD = pmBs / currentRate;
        const bsCashUSD = bsCash / currentRate;
        
        totalReceivedUSD = usdCash + zelle + pmUSD + bsCashUSD;
        
        if (totalReceivedUSD < cartTotalUSD - 0.05 && !isClientCongelador) { // small tolerance for floating point
           showToast('El pago mixto no cubre el total de la factura', 'error');
           return;
        }

        finalMixedPayments = {
          efectivo_usd: usdCash,
          zelle: zelle,
          pago_movil: pmBs,
          efectivo_bs: bsCash,
          pago_movil_usd: pmUSD,
          efectivo_bs_usd: bsCashUSD
        };
      } else {
        totalReceivedUSD = parseFloat(receivedAmount) || 0;
        if (totalReceivedUSD === 0) totalReceivedUSD = cartTotalUSD;
      }

      const changeUSD = totalReceivedUSD > cartTotalUSD ? Number((totalReceivedUSD - cartTotalUSD).toFixed(2)) : 0;
      const changeBs = Number((changeUSD * currentRate).toFixed(2));

      const invoicePayload = {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientCedula: selectedClient.cedula,
        clientType: selectedClient.type || 'normal',
        items: cart.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.priceUSD || 0,
          subtotal: Number(((item.priceUSD || 0) * item.quantity).toFixed(2))
        })),
        totalUSD: Number(cartTotalUSD.toFixed(2)),
        totalBs: Number(cartTotalBs.toFixed(2)),
        exchangeRate: currentRate,
        paymentMethod: finalPaymentMethod,
        mixedPayments: finalMixedPayments,
        receivedAmount: status === 'pending' ? 0 : (totalReceivedUSD > 0 ? totalReceivedUSD : Number(cartTotalUSD.toFixed(2))),
        changeUSD,
        changeBs,
        status,
        tableName: loadedTableOrder?.tableName || null,
        waiterName: loadedTableOrder?.waiterName || null
      };

      const created = createInvoice(invoicePayload);
      
      // If order was from a restaurant table, free the table in local server
      if (loadedTableOrder && loadedTableOrder.tableId) {
        fetch(`http://localhost:3001/api/restaurant/table/${loadedTableOrder.tableId}/free`, {
          method: 'POST'
        }).catch(err => console.warn('Could not free table:', err));
        setLoadedTableOrder(null);
      }

      setLastInvoice(created || invoicePayload);
      setCart([]);
      setClient(null);
      setReceivedAmount('');
      setMixedPayments({ efectivo_usd: '', pago_movil: '', efectivo_bs: '', zelle: '' });
      setIsMixedPayment(false);
      setIsPending(false);
      setShowPaymentModal(false);
      showToast('¡Factura emitida exitosamente!', 'success');
      setShowPreview(true);
    } catch (error) {
      console.error(error);
      showToast('Error al procesar la factura', 'error');
    }
  };

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f4f5f7', color: '#111827', overflow: 'hidden' }}>
      
      {/* Catalog Grid View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
        
        {/* Search Header */}
        <div style={{ flexShrink: 0, marginBottom: '20px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '480px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Buscar helado o producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 44px',
                background: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                color: '#111827',
                outline: 'none',
                boxSizing: 'border-box',
                fontSize: '0.95rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            />
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: '500' }}>
            {filteredProducts.length} productos disponibles
          </div>
        </div>

        <style>
          {`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>
        {/* Horizontal Category Navigation (Kiosk Style) */}
        <div 
          className="hide-scrollbar"
          style={{ 
          flexShrink: 0,
          display: 'flex', 
          gap: '12px', 
          overflowX: 'auto', 
          paddingBottom: '8px', 
          marginBottom: '20px', 
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none' /* IE/Edge */
        }}>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              style={{
                flexShrink: 0,
                background: activeCategory === cat ? '#fef3c7' : '#ffffff',
                color: activeCategory === cat ? '#b45309' : '#4b5563',
                border: activeCategory === cat ? '2px solid #fde68a' : '1px solid #d1d5db',
                borderRadius: '30px',
                padding: '12px 28px',
                cursor: 'pointer',
                fontWeight: activeCategory === cat ? '800' : '600',
                fontSize: '0.95rem',
                boxShadow: activeCategory === cat ? '0 4px 12px rgba(245, 158, 11, 0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: activeCategory === cat ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Cards (Kiosk McDonald's / BK style) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: '16px'
        }}>
          {filteredProducts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
              No hay productos en esta categoría.
            </div>
          ) : (
            filteredProducts.map(product => {
              const inCart = cart.find(i => i.id === product.id);
              const price = Number(product.priceUSD || product.price || 0);

              return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  style={{
                    background: inCart ? '#fffdfa' : '#ffffff',
                    border: inCart ? '2px solid #f59e0b' : '1px solid #eaedf2',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.18s ease',
                    boxShadow: inCart ? '0 6px 18px rgba(245, 158, 11, 0.18)' : '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {/* Badge contador si está en el carrito */}
                  {inCart && (
                    <span style={{
                      position: 'absolute', top: '8px', right: '8px', zIndex: 10,
                      background: '#f59e0b', color: '#ffffff', fontWeight: '800',
                      width: '26px', height: '26px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                    }}>
                      {inCart.quantity}
                    </span>
                  )}

                  {/* Imagen del producto */}
                  <div style={{
                    width: '100%',
                    height: '120px',
                    background: '#fef3c7',
                    borderBottom: '1px solid #f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#d97706' }}>
                        <IceCreamCone size={32} />
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Helado</span>
                      </div>
                    )}
                  </div>

                  {/* Info del producto */}
                  <div style={{ padding: '12px 14px 14px 14px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>
                        {product.category || 'Helado'}
                      </div>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '0.96rem', color: '#111827', fontWeight: '700', lineHeight: '1.25' }}>
                        {product.name || product.nombre}
                      </h4>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #f3f4f6', paddingTop: '8px' }}>
                      <span style={{ fontSize: '1.18rem', fontWeight: '800', color: '#059669' }}>
                        ${price.toFixed(2)}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '600' }}>
                        Bs. {(price * currentRate).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* POS Checkout Panel (Right Column) */}
      <div style={{
        width: '390px',
        background: '#ffffff',
        borderLeft: '1px solid #eaedf2',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.03)'
      }}>
        
        {/* Restaurant Table Origin Banner */}
        {loadedTableOrder && (
          <div style={{
            padding: '12px 20px',
            background: '#eff6ff',
            borderBottom: '1px solid #bfdbfe',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: '800', color: '#1e40af', fontSize: '0.95rem' }}>
                🍽️ {loadedTableOrder.tableName}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>
                Atendido por: {loadedTableOrder.waiterName || 'Mesero'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('¿Desvincular esta mesa del cobro actual?')) {
                  setLoadedTableOrder(null);
                  setCart([]);
                }
              }}
              style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700' }}
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Customer Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '8px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Cliente / Destinatario:
          </div>
          <ClientSearch onSelect={setClient} selected={client} />
        </div>

        {/* Live Exchange Rate */}
        <div style={{
          padding: '10px 20px',
          background: '#f9fafb',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.82rem'
        }}>
          <span style={{ color: '#4b5563', fontWeight: '500' }}>
            Tasa BCV del Día: <strong style={{ color: '#d97706' }}>{currentRate.toFixed(2)} Bs/$</strong>
          </span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="number"
              step="0.1"
              placeholder="Manual"
              value={customRate}
              onChange={e => setCustomRate(e.target.value)}
              style={{
                width: '68px', padding: '4px 6px', fontSize: '0.75rem',
                background: '#ffffff', border: '1px solid #d1d5db',
                borderRadius: '6px', color: '#111827'
              }}
            />
            {typeof loadExchangeRate === 'function' && (
              <button 
                type="button" 
                onClick={loadExchangeRate} 
                title="Actualizar tasa"
                style={{ background: 'none', border: 'none', color: '#d97706', cursor: 'pointer', display: 'flex' }}
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Cart Itemized List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {cart.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ÍTEMS ({cart.reduce((s, i) => s + i.quantity, 0)})
              </span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Deseas vaciar todos los productos del carrito?')) {
                    setCart([]);
                    setReceivedAmount('');
                  }
                }}
                style={{
                  background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626',
                  fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer',
                  padding: '3px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <Trash2 size={12} /> Vaciar
              </button>
            </div>
          )}

          {cart.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: '#9ca3af' }}>
              <ShoppingCart size={40} style={{ marginBottom: '8px', opacity: 0.4 }} />
              <div style={{ fontSize: '0.92rem', fontWeight: '600', color: '#4b5563' }}>Carrito de compras vacío</div>
              <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>Toca los helados a la izquierda para añadir</div>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.id}
                style={{
                  background: '#f9fafb',
                  border: '1px solid #eaedf2',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1, paddingRight: '8px' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#111827' }}>{item.name}</div>
                  <div style={{ color: '#6b7280', fontSize: '0.78rem' }}>
                    ${item.priceUSD.toFixed(2)} c/u • <span style={{ color: '#059669', fontWeight: '600' }}>Total: ${(item.priceUSD * item.quantity).toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, -1)}
                    style={{ background: '#ffffff', border: '1px solid #d1d5db', color: '#374151', width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ fontWeight: '700', minWidth: '22px', textAlign: 'center', fontSize: '0.9rem', color: '#111827' }}>
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, 1)}
                    style={{ background: '#ffffff', border: '1px solid #d1d5db', color: '#374151', width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '4px' }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment & Checkout Section */}
        <div style={{ padding: '20px', background: '#fafafa', borderTop: '1px solid #eaedf2' }}>
          
          {/* Subtotal and Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem' }}>
            <span style={{ color: '#6b7280', fontWeight: '500' }}>Total en Dólares ($):</span>
            <span style={{ fontWeight: '800', fontSize: '1.2rem', color: '#111827' }}>${cartTotalUSD.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '1.25rem', fontWeight: '800', color: '#d97706' }}>
            <span>Total en Bolívares (Bs):</span>
            <span>Bs. {cartTotalBs.toFixed(2)}</span>
          </div>

          {/* Big Prominent Cobrar Action Button (Warm Kiosk Style) */}
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0}
            style={{
              width: '100%',
              padding: '16px',
              background: cart.length === 0 ? '#e5e7eb' : '#dc2626',
              color: cart.length === 0 ? '#9ca3af' : '#ffffff',
              border: 'none',
              borderRadius: '14px',
              fontWeight: '800',
              fontSize: '1.2rem',
              letterSpacing: '0.5px',
              cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: cart.length === 0 ? 'none' : '0 4px 14px rgba(220, 38, 38, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <Receipt size={22} />
            <span>COBRAR (Enter)</span>
          </button>

        </div>

      </div>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#10b981' : '#dc2626',
          color: '#fff', padding: '10px 22px', borderRadius: '24px',
          fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.2)', zIndex: 1000, fontSize: '0.88rem'
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#111827', fontWeight: '800' }}>Confirmar Pago</h2>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: '#64748b', marginBottom: '8px' }}>
                <span>Total a Pagar:</span>
                <span style={{ fontWeight: '800', color: '#111827' }}>${cartTotalUSD.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: '700', color: '#d97706' }}>
                <span>En Bolívares:</span>
                <span>Bs. {cartTotalBs.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
              Método de Pago
            </div>

            {!isMixedPayment ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                {paymentOptions.map(opt => {
                  const isSelected = paymentMethod === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPaymentMethod(opt.id)}
                      style={{
                        background: isSelected ? opt.bg : '#ffffff',
                        border: isSelected ? `2px solid ${opt.border}` : '1px solid #e5e7eb',
                        color: isSelected ? opt.color : '#4b5563',
                        padding: '12px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon size={20} color={isSelected ? opt.color : '#9ca3af'} />
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>{opt.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Efectivo ($)</label>
                    <input type="number" step="0.01" value={mixedPayments.efectivo_usd} onChange={(e) => setMixedPayments({...mixedPayments, efectivo_usd: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Pago Móvil (Bs)</label>
                    <input type="number" step="0.01" value={mixedPayments.pago_movil} onChange={(e) => setMixedPayments({...mixedPayments, pago_movil: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Efectivo (Bs)</label>
                    <input type="number" step="0.01" value={mixedPayments.efectivo_bs} onChange={(e) => setMixedPayments({...mixedPayments, efectivo_bs: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Zelle ($)</label>
                    <input type="number" step="0.01" value={mixedPayments.zelle} onChange={(e) => setMixedPayments({...mixedPayments, zelle: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>
                </div>
                
                {(() => {
                  const totalPaidUSD = (parseFloat(mixedPayments.efectivo_usd)||0) + (parseFloat(mixedPayments.zelle)||0) + ((parseFloat(mixedPayments.pago_movil)||0) / currentRate) + ((parseFloat(mixedPayments.efectivo_bs)||0) / currentRate);
                  const missingUSD = cartTotalUSD - totalPaidUSD;
                  return (
                    <div style={{ marginTop: '16px', padding: '12px', background: missingUSD > 0.05 ? '#fee2e2' : '#ecfdf5', borderRadius: '8px', color: missingUSD > 0.05 ? '#991b1b' : '#065f46', fontSize: '0.9rem', fontWeight: '800', textAlign: 'center' }}>
                      {missingUSD > 0.05 ? `Falta: $ ${missingUSD.toFixed(2)} (Bs. ${(missingUSD * currentRate).toFixed(2)})` : `¡Pago completo! (Vuelto: $ ${Math.abs(missingUSD).toFixed(2)})`}
                    </div>
                  );
                })()}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsMixedPayment(!isMixedPayment);
                setMixedPayments({ efectivo_usd: '', pago_movil: '', efectivo_bs: '', zelle: '' });
              }}
              style={{ width: '100%', padding: '12px', marginBottom: '20px', background: isMixedPayment ? '#f0fdfa' : '#f9fafb', border: isMixedPayment ? '1px solid #14b8a6' : '1px solid #e5e7eb', borderRadius: '10px', color: isMixedPayment ? '#0f766e' : '#6b7280', fontWeight: '700', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px' }}
            >
               {isMixedPayment ? 'Cancelar Pago Dividido' : '🔀 Dividir Pago en varios métodos'}
            </button>

            {client?.type === 'congelador' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', background: isPending ? '#fef3c7' : '#ffffff', border: isPending ? '1.5px solid #f59e0b' : '1px solid #e5e7eb', padding: '12px', borderRadius: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={isPending} onChange={e => setIsPending(e.target.checked)} style={{ accentColor: '#f59e0b', width: '18px', height: '18px' }} />
                <span style={{ fontSize: '0.9rem', color: isPending ? '#92400e' : '#374151', fontWeight: '700' }}>❄️ Dejar como deuda pendiente</span>
              </label>
            )}

            <button
              type="button"
              onClick={handleFacturar}
              style={{
                width: '100%', padding: '16px', background: isPending ? '#f59e0b' : '#dc2626', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: isPending ? '0 4px 14px rgba(245, 158, 11, 0.3)' : '0 4px 14px rgba(220, 38, 38, 0.3)'
              }}
            >
              <Receipt size={20} />
              <span>{isPending ? 'REGISTRAR CUENTA POR COBRAR' : 'EMITIR FACTURA'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Real Thermal / Standard Ticket Receipt Preview */}
      {showPreview && lastInvoice && (
        <InvoicePreview
          invoice={lastInvoice}
          onClose={() => setShowPreview(false)}
        />
      )}

    </div>
  );
};

export default POS;
