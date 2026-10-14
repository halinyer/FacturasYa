import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  IceCreamCone, 
  Utensils, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import POSInvoiceSidebar from '../components/pos/POSInvoiceSidebar';
import POSPaymentModal from '../components/pos/POSPaymentModal';
import InvoicePreview from '../components/InvoicePreview';

const POS = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    products = [], 
    createInvoice, 
    exchangeRate = 876.80, 
    loadExchangeRate, 
    setManualRate, 
    restaurantMode 
  } = useData() || {};

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [cart, setCart] = useState([]);
  const [client, setClient] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('efectivo_usd');
  const [pagoMovilBank, setPagoMovilBank] = useState('');
  const [pagoMovilRef, setPagoMovilRef] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [toast, setToast] = useState(null);
  const [customRate, setCustomRate] = useState('');
  const [isRefreshingRate, setIsRefreshingRate] = useState(false);
  const [loadedTableOrder, setLoadedTableOrder] = useState(null);

  // Auto-fetch fresh live BCV rate on mount
  useEffect(() => {
    if (typeof loadExchangeRate === 'function') {
      loadExchangeRate(true);
    }
  }, [loadExchangeRate]);

  // Auto-load incoming order transferred from Tables/Salón
  useEffect(() => {
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

  const currentRate = customRate 
    ? parseFloat(customRate) 
    : (exchangeRate && Number(exchangeRate) > 100 ? Number(exchangeRate) : 876.80);

  // Listen for Enter to open payment modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && cart.length > 0 && !showPaymentModal && !showPreview) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        setShowPaymentModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showPaymentModal, showPreview]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRefreshRate = async () => {
    setIsRefreshingRate(true);
    try {
      if (typeof loadExchangeRate === 'function') {
        const rate = await loadExchangeRate(true);
        if (rate && Number(rate) > 100) {
          setCustomRate('');
          showToast(`Tasa oficial BCV actualizada a Bs. ${Number(rate).toFixed(4)}`, 'success');
        } else {
          showToast('No se pudo conectar con el servidor, manteniendo tasa actual', 'error');
        }
      }
    } catch (err) {
      showToast('Error al actualizar la tasa', 'error');
    } finally {
      setIsRefreshingRate(false);
    }
  };

  const handleSetCustomRate = (val) => {
    setCustomRate(val);
    if (val && !isNaN(val) && parseFloat(val) > 0 && typeof setManualRate === 'function') {
      setManualRate(parseFloat(val));
    }
  };

  // Categories
  const categories = useMemo(() => {
    const activeProds = (products || []).filter(p => p.active !== false);
    const cats = new Set(activeProds.map(p => p.category || 'General'));
    return ['Todos', ...Array.from(cats)];
  }, [products]);

  // Filtered Products
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

  const cartTotalUSD = useMemo(() => {
    return cart.reduce((sum, item) => sum + ((Number(item.priceUSD || item.price || 0)) * (item.quantity || 1)), 0);
  }, [cart]);

  const cartTotalBs = cartTotalUSD * currentRate;

  // Cart operations
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
        image: product.image || '',
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

  const handleClearCart = () => {
    if (window.confirm('¿Deseas vaciar todos los productos del pedido?')) {
      setCart([]);
    }
  };

  // Payment Confirmation -> Emits Nota de Entrega
  const handleConfirmPayment = ({ 
    paymentMethod: methodFromModal, 
    isMixedPayment, 
    mixedPayments, 
    isPending,
    pagoMovilBank: bankFromModal,
    pagoMovilRef: refFromModal
  }) => {
    if (cart.length === 0) {
      showToast('El pedido está vacío. Agrega al menos un producto.', 'error');
      return;
    }

    try {
      const selectedClient = client || { id: 'generic', name: 'Consumidor Final', cedula: 'V-00000000', type: 'normal' };
      const isClientCongelador = selectedClient.type === 'congelador';
      const status = (isPending && isClientCongelador) ? 'pending' : 'paid';

      let finalPaymentMethod = methodFromModal || paymentMethod;
      let finalMixedPayments = null;
      let totalReceivedUSD = cartTotalUSD;

      const finalBank = bankFromModal !== undefined ? bankFromModal : pagoMovilBank;
      const finalRef = refFromModal !== undefined ? refFromModal : pagoMovilRef;

      if (isMixedPayment && mixedPayments) {
        finalPaymentMethod = 'mixto';
        const usdCash = parseFloat(mixedPayments.efectivo_usd) || 0;
        const zelle = parseFloat(mixedPayments.zelle) || 0;
        const pmBs = parseFloat(mixedPayments.pago_movil) || 0;
        const bsCash = parseFloat(mixedPayments.efectivo_bs) || 0;
        const pmUSD = pmBs / currentRate;
        const bsCashUSD = bsCash / currentRate;

        totalReceivedUSD = usdCash + zelle + pmUSD + bsCashUSD;

        finalMixedPayments = {
          efectivo_usd: usdCash,
          zelle,
          pago_movil: pmBs,
          efectivo_bs: bsCash,
          pago_movil_usd: pmUSD,
          efectivo_bs_usd: bsCashUSD
        };
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
          unitPrice: Number(item.priceUSD || item.price || 0),
          subtotal: Number(((Number(item.priceUSD || item.price || 0)) * item.quantity).toFixed(2))
        })),
        totalUSD: Number(cartTotalUSD.toFixed(2)),
        totalBs: Number(cartTotalBs.toFixed(2)),
        exchangeRate: currentRate,
        paymentMethod: finalPaymentMethod,
        mixedPayments: finalMixedPayments,
        pagoMovilBank: (finalPaymentMethod === 'pago_movil' || finalPaymentMethod === 'mixto') ? (finalBank || null) : null,
        pagoMovilRef: (finalPaymentMethod === 'pago_movil' || finalPaymentMethod === 'mixto') ? (finalRef || null) : null,
        receivedAmount: status === 'pending' ? 0 : totalReceivedUSD,
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
      setPagoMovilBank('');
      setPagoMovilRef('');
      setPaymentMethod('efectivo_usd');
      setShowPaymentModal(false);
      showToast('¡Nota de Entrega registrada con éxito!', 'success');
      setShowPreview(true);
    } catch (error) {
      console.error(error);
      showToast('Error al procesar la Nota de Entrega', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f8fafc', color: '#0f172a', overflow: 'hidden' }}>
      
      {/* Catalog Grid View (Left Column) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
        
        {/* Search Header */}
        <div style={{ flexShrink: 0, marginBottom: '20px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '480px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar producto, combo o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 44px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
                fontSize: '0.95rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
            />
          </div>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>
            {filteredProducts.length} productos
          </div>

          {restaurantMode && (
            <button
              type="button"
              onClick={() => navigate('/tables')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 18px',
                background: '#fef3c7',
                border: '1.5px solid #fde68a',
                color: '#b45309',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.12)'
              }}
            >
              <Utensils size={18} />
              <span>Ver Salón y Mesas</span>
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '14px',
          marginBottom: '18px',
          flexShrink: 0
        }}>
          {categories.map(cat => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '12px',
                  border: isActive ? '1.5px solid var(--brand-primary, #2563eb)' : '1px solid #e2e8f0',
                  background: isActive ? 'var(--brand-primary, #2563eb)' : '#ffffff',
                  color: isActive ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  fontWeight: isActive ? '800' : '600',
                  fontSize: '0.92rem',
                  boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.22)' : '0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Product Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))',
          gap: '16px'
        }}>
          {filteredProducts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
              No se encontraron productos en esta categoría.
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
                    background: inCart ? '#f0fdf4' : '#ffffff',
                    border: inCart ? '2px solid #10b981' : '1px solid #e2e8f0',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.16s ease',
                    boxShadow: inCart ? '0 6px 18px rgba(16, 185, 129, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {/* Cart Quantity Badge */}
                  {inCart && (
                    <span style={{
                      position: 'absolute', top: '8px', right: '8px', zIndex: 10,
                      background: '#10b981', color: '#ffffff', fontWeight: '900',
                      width: '26px', height: '26px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.82rem', boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                    }}>
                      {inCart.quantity}
                    </span>
                  )}

                  {/* Product Thumbnail */}
                  <div style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    maxHeight: '185px',
                    background: '#ffffff',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    padding: '8px',
                    boxSizing: 'border-box'
                  }}>
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          objectPosition: 'center',
                          display: 'block',
                          borderRadius: '8px'
                        }}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                        <IceCreamCone size={34} />
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: '700' }}>Sin Foto</span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '3px' }}>
                        {product.category || 'General'}
                      </div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.94rem', color: '#0f172a', fontWeight: '700', lineHeight: '1.25' }}>
                        {product.name || product.nombre}
                      </h4>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#059669' }}>
                        ${price.toFixed(2)}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600', fontFamily: 'monospace' }}>
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

      {/* POS Invoice / Billing Sidebar (Apple Style) */}
      <POSInvoiceSidebar
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveFromCart={removeFromCart}
        onClearCart={handleClearCart}
        client={client}
        onSelectClient={setClient}
        currentRate={currentRate}
        customRate={customRate}
        onSetCustomRate={handleSetCustomRate}
        onRefreshRate={handleRefreshRate}
        isRefreshingRate={isRefreshingRate}
        loadedTableOrder={loadedTableOrder}
        onUnlinkTableOrder={() => {
          if (window.confirm('¿Desvincular esta mesa del cobro actual?')) {
            setLoadedTableOrder(null);
            setCart([]);
          }
        }}
        onGenerateNotaEntrega={() => setShowPaymentModal(true)}
        products={products}
        paymentMethod={paymentMethod}
        onSelectPaymentMethod={(methodId) => {
          setPaymentMethod(methodId);
          if (methodId === 'pago_movil' || methodId === 'mixto') {
            setShowPaymentModal(true);
          }
        }}
        pagoMovilBank={pagoMovilBank}
        onSelectPagoMovilBank={setPagoMovilBank}
        pagoMovilRef={pagoMovilRef}
        onChangePagoMovilRef={setPagoMovilRef}
      />

      {/* Payment Confirmation Modal */}
      <POSPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalUSD={cartTotalUSD}
        currentRate={currentRate}
        client={client}
        onConfirmPayment={handleConfirmPayment}
        initialPaymentMethod={paymentMethod}
        initialPagoMovilBank={pagoMovilBank}
        initialPagoMovilRef={pagoMovilRef}
      />

      {/* Printable Thermal Receipt Modal */}
      {showPreview && lastInvoice && (
        <InvoicePreview
          invoice={lastInvoice}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#10b981' : '#dc2626',
          color: '#fff', padding: '10px 22px', borderRadius: '24px',
          fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.2)', zIndex: 3000, fontSize: '0.88rem'
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

    </div>
  );
};

export default POS;
