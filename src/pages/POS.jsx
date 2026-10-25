import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  UtensilsCrossed, 
  Utensils, 
  CheckCircle, 
  AlertCircle,
  IceCream
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import POSInvoiceSidebar from '../components/pos/POSInvoiceSidebar';
import POSPaymentModal from '../components/pos/POSPaymentModal';
import InvoicePreview from '../components/InvoicePreview';
import OpenTabsModal from '../components/pos/OpenTabsModal';
import { getAssetUrl } from '../utils/assetHelper';
import { buildInvoicePayload } from '../utils/invoiceCalculator';

const POS = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { 
    products = [], 
    createInvoice, 
    exchangeRate = 876.80, 
    loadExchangeRate, 
    setManualRate, 
    restaurantMode,
    openTabs = [],
    saveOpenTab,
    deleteOpenTab,
    updateOpenTabStatus,
    updateClient,
    fiscalSettings,
    fiscalPrintInvoice
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

  // Delivery & Open Tabs States
  const [orderType, setOrderType] = useState('salon'); // 'salon' | 'para_llevar' | 'delivery'
  const [deliveryInfo, setDeliveryInfo] = useState({ address: '', phone: '', courier: '', deliveryFee: 0 });
  const [activeTab, setActiveTab] = useState(null);
  const [showOpenTabsModal, setShowOpenTabsModal] = useState(false);
  const [preBillInvoice, setPreBillInvoice] = useState(null);

  // Document mode: 'nota_entrega' | 'fiscal'
  const [docType, setDocType] = useState(() => {
    return localStorage.getItem('pos_doc_type') || (fiscalSettings?.enabled ? 'fiscal' : 'nota_entrega');
  });
  const [cashReceivedUSD, setCashReceivedUSD] = useState('');
  const [cashReceivedBs, setCashReceivedBs] = useState('');

  // Monitor nocturno de cierre obligatorio pre-medianoche (SENIAT)
  const [currentClock, setCurrentClock] = useState(() => new Date());
  const [adminBypass, setAdminBypass] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [supervisorPinInput, setSupervisorPinInput] = useState('');
  const [supervisorPinError, setSupervisorPinError] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentClock(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const curHour = currentClock.getHours();
  const curMin = currentClock.getMinutes();
  // Aviso preventivo de 11:00 PM a 11:44 PM (23:00 - 23:44)
  const isClosingWarning = curHour === 23 && curMin < 45;
  // Bloqueo estricto de facturación de 11:45 PM a medianoche (23:45 - 23:59) y madrugada (00:00 - 05:00 AM)
  const isNightLocked = ((curHour === 23 && curMin >= 45) || (curHour >= 0 && curHour < 5)) && !adminBypass;
  const formattedTime = currentClock.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });

  const handleDocTypeChange = (newDoc) => {
    setDocType(newDoc);
    try {
      localStorage.setItem('pos_doc_type', newDoc);
    } catch (e) {
      // ignore
    }
  };

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
          if (parsed.orderType) setOrderType(parsed.orderType);
          if (parsed.deliveryInfo) setDeliveryInfo(parsed.deliveryInfo);
          if (parsed.client) setClient(parsed.client);
          if (parsed.tabId) setActiveTab({ id: parsed.tabId, name: parsed.tableName });
          setLoadedTableOrder(parsed);
          setShowPaymentModal(true); // Open payment modal directly
        }
      } catch (e) {
        console.error('Error cargando orden de mesa o delivery:', e);
      }
      sessionStorage.removeItem('pos_incoming_table_order');
    }
  }, []);

  const currentRate = customRate 
    ? parseFloat(customRate) 
    : (exchangeRate && Number(exchangeRate) > 100 ? Number(exchangeRate) : 876.80);

  const handleDirectCheckout = () => {
    if (cart.length === 0) {
      showToast('El pedido está vacío. Agrega al menos un producto.', 'error');
      return;
    }
    if (isNightLocked) {
      setShowLockModal(true);
      return;
    }
    setShowPaymentModal(true);
  };

  // Listen for Enter to open payment modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && cart.length > 0 && !showPaymentModal && !showPreview) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        if (isNightLocked) {
          setShowLockModal(true);
          return;
        }
        setShowPaymentModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showPaymentModal, showPreview, isNightLocked]);

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

  const itemsSubtotalUSD = useMemo(() => {
    return cart.reduce((sum, item) => sum + ((Number(item.priceUSD || item.price || 0)) * (item.quantity || 1)), 0);
  }, [cart]);

  const deliveryFee = orderType === 'delivery' ? (parseFloat(deliveryInfo.deliveryFee) || 0) : 0;
  const cartTotalUSD = itemsSubtotalUSD + deliveryFee;
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
      setActiveTab(null);
    }
  };

  // Open Tabs / Delivery Management Handlers (Llevar la cuenta)
  const handleSaveOpenTab = () => {
    if (cart.length === 0) {
      showToast('Agrega productos al pedido antes de ponerlo en espera', 'error');
      return;
    }

    const clientName = client?.name && client.name !== 'Consumidor Final' ? client.name : '';
    const suggestedName = activeTab?.name || (
      orderType === 'delivery'
        ? (clientName ? `Delivery - ${clientName}` : (deliveryInfo.phone ? `Delivery - ${deliveryInfo.phone}` : `Delivery #${(openTabs?.length || 0) + 1}`))
        : orderType === 'para_llevar'
          ? (clientName ? `Llevar - ${clientName}` : `Para Llevar #${(openTabs?.length || 0) + 1}`)
          : (clientName ? `Cuenta - ${clientName}` : `Cuenta #${(openTabs?.length || 0) + 1}`)
    );

    const enteredName = window.prompt('Identificador o nombre de la cuenta en espera:', suggestedName);
    if (enteredName === null) return; // user cancelled prompt

    const finalName = enteredName.trim() || suggestedName;

    saveOpenTab({
      id: activeTab?.id,
      name: finalName,
      orderType,
      deliveryInfo,
      client,
      items: cart,
      tableName: loadedTableOrder?.tableName || null,
      status: orderType === 'delivery' ? (activeTab?.status || 'cocina') : (activeTab?.status || 'abierta')
    });

    showToast(`Cuenta "${finalName}" guardada en espera`, 'success');
    setCart([]);
    setClient(null);
    setActiveTab(null);
    setOrderType('salon');
    setDeliveryInfo({ address: '', phone: '', courier: '', deliveryFee: 0 });
    setLoadedTableOrder(null);
  };

  const handleSelectClient = (selectedClient) => {
    setClient(selectedClient);
    if (selectedClient && selectedClient.id !== 'generic') {
      setDeliveryInfo(prev => ({
        ...prev,
        address: selectedClient.address || prev.address,
        phone: selectedClient.phone || prev.phone
      }));
    }
  };

  const handleChangeOrderType = (newOrderType) => {
    setOrderType(newOrderType);
    if (newOrderType === 'delivery' && client && client.id !== 'generic') {
      setDeliveryInfo(prev => ({
        ...prev,
        address: client.address || prev.address,
        phone: client.phone || prev.phone
      }));
    }
  };

  const handleSaveClientAddress = (newAddress) => {
    if (!client || !client.id || client.id === 'generic') return;
    try {
      if (typeof updateClient === 'function') {
        updateClient(client.id, { ...client, address: newAddress });
      }
      setClient(prev => ({ ...prev, address: newAddress }));
      showToast(`Dirección habitual de ${client.name} actualizada con éxito`, 'success');
    } catch (e) {
      showToast('Error al guardar la dirección del cliente', 'error');
    }
  };

  const handleChargeOpenTab = (tab) => {
    setCart(tab.items || []);
    setClient(tab.client || null);
    setOrderType(tab.orderType || 'salon');
    setDeliveryInfo(tab.deliveryInfo || { address: '', phone: '', courier: '', deliveryFee: 0 });
    setActiveTab(tab);
    setShowOpenTabsModal(false);
    setShowPaymentModal(true);
  };

  const handleEditOpenTab = (tab) => {
    setCart(tab.items || []);
    setClient(tab.client || null);
    setOrderType(tab.orderType || 'salon');
    setDeliveryInfo(tab.deliveryInfo || { address: '', phone: '', courier: '', deliveryFee: 0 });
    setActiveTab(tab);
    setShowOpenTabsModal(false);
    showToast(`Cuenta "${tab.name}" cargada para editar o sumar productos`);
  };

  const handlePrintPreBill = (tab) => {
    const itemsSub = (tab.items || []).reduce((s, i) => s + (Number(i.priceUSD || i.price || 0) * (i.quantity || 1)), 0);
    const delFee = tab.orderType === 'delivery' ? (parseFloat(tab.deliveryInfo?.deliveryFee) || 0) : 0;
    const totUSD = itemsSub + delFee;

    const preBill = {
      id: tab.id,
      invoiceNumber: 'PRE-CUENTA',
      isPreBill: true,
      date: tab.createdAt || new Date().toISOString(),
      client: tab.client,
      clientName: tab.client?.name || 'Consumidor Final',
      clientCedula: tab.client?.cedula || 'V-00000000',
      clientType: tab.client?.type || 'normal',
      orderType: tab.orderType,
      deliveryInfo: tab.deliveryInfo,
      deliveryFee: delFee,
      items: (tab.items || []).map(i => ({
        productId: i.id || i.productId,
        productName: i.name,
        quantity: i.quantity,
        unitPrice: Number(i.priceUSD || i.price || 0),
        subtotal: Number(i.priceUSD || i.price || 0) * i.quantity
      })),
      totalUSD: totUSD,
      totalBs: totUSD * currentRate,
      exchangeRate: currentRate,
      paymentMethod: 'efectivo_usd',
      status: 'pending',
      tableName: tab.tableName || null
    };

    setPreBillInvoice(preBill);
  };

  // Payment Confirmation -> Emits Nota de Entrega or Factura Fiscal
  const handleConfirmPayment = async ({ 
    paymentMethod: methodFromModal, 
    isMixedPayment, 
    mixedPayments, 
    isPending,
    pagoMovilBank: bankFromModal,
    pagoMovilRef: refFromModal,
    isFiscalInvoice = false,
    isDirectCheckout = false
  }) => {
    if (cart.length === 0) {
      showToast('El pedido está vacío. Agrega al menos un producto.', 'error');
      return;
    }

    if (isNightLocked) {
      setShowPaymentModal(false);
      setShowLockModal(true);
      return;
    }

    try {
      const invoicePayload = buildInvoicePayload({
        cart,
        client,
        user,
        orderType,
        deliveryInfo,
        deliveryFee,
        itemsSubtotalUSD,
        cartTotalUSD,
        cartTotalBs,
        currentRate,
        paymentMethod: methodFromModal || paymentMethod,
        isMixedPayment,
        mixedPayments,
        isPending,
        pagoMovilBank: bankFromModal !== undefined ? bankFromModal : pagoMovilBank,
        pagoMovilRef: refFromModal !== undefined ? refFromModal : pagoMovilRef,
        isFiscalInvoice,
        loadedTableOrder
      });
      const fiscalControlNumber = invoicePayload.fiscalControlNumber;

      // FLUJO DE FACTURA FISCAL SENIAT:
      // Primero se envía a la máquina fiscal y se espera su confirmación real (S1 + ACK).
      // Si la máquina fiscal la rechaza o la anula, NUNCA se suma como venta pagada en Cierre de Caja ni Libro de Ventas.
      if (isFiscalInvoice) {
        if (!fiscalPrintInvoice) {
          showToast('El servicio de impresora fiscal no está disponible.', 'error');
          return;
        }

        showToast('Imprimiendo en máquina fiscal HKA... Por favor espere.', 'info');
        const res = await fiscalPrintInvoice(invoicePayload);

        if (!res || !res.success) {
          const errReason = res?.annulReason || res?.error || 'Error o anulación en impresora fiscal';
          // Si la impresora llegó a abrir el documento y lo anuló físicamente con '7',
          // guardamos el registro con estado 'voided' (Anulada, monto 0 para caja y libro SENIAT) para auditoría total.
          if (res?.wasAnnulled) {
            createInvoice({
              ...invoicePayload,
              status: 'voided',
              wasFiscalAnnulled: true,
              voidReason: `ANULADA POR IMPRESORA FISCAL: ${errReason}`,
              voidDate: new Date().toISOString(),
              receivedAmount: 0,
              fiscalS1Snapshot: res?.s1 || null
            });
          }
          showToast(`ALERTA FISCAL: ${res?.error || 'La factura fue rechazada/anulada por la impresora fiscal. No se sumó a caja.'}`, 'error');
          return;
        }

        // ¡Éxito certificado por la impresora fiscal! Guardamos el número oficial SENIAT y el serial de máquina
        const officialFiscalNum = res.fiscalInvoiceNumber
          ? String(res.fiscalInvoiceNumber).padStart(8, '0')
          : null;
        const machineSerial = res.s1?.registered_machine_number || res.s1?.machine_register || null;
        const nextZ = res.s1?.z_counter !== undefined ? String(Number(res.s1.z_counter) + 1).padStart(4, '0') : null;

        const verifiedFiscalPayload = {
          ...invoicePayload,
          fiscalInvoiceNumber: officialFiscalNum,
          fiscalControlNumber: officialFiscalNum || fiscalControlNumber,
          fiscalSerial: machineSerial,
          fiscalZNumber: nextZ,
          fiscalVerified: true,
          fiscalPrintedAt: new Date().toISOString(),
          fiscalS1Snapshot: res.s1 || null
        };

        const createdFiscal = createInvoice(verifiedFiscalPayload);

        if (activeTab?.id) {
          deleteOpenTab(activeTab.id);
          setActiveTab(null);
        }
        if (loadedTableOrder && loadedTableOrder.tableId) {
          fetch(`http://localhost:3001/api/restaurant/table/${loadedTableOrder.tableId}/free`, {
            method: 'POST'
          }).catch(err => console.warn('Could not free table:', err));
          setLoadedTableOrder(null);
        }

        setLastInvoice(createdFiscal || verifiedFiscalPayload);
        setCart([]);
        setClient(null);
        setOrderType('salon');
        setDeliveryInfo({ address: '', phone: '', courier: '', deliveryFee: 0 });
        setPagoMovilBank('');
        setPagoMovilRef('');
        setCashReceivedUSD('');
        setCashReceivedBs('');
        setPaymentMethod('efectivo_usd');
        setShowPaymentModal(false);

        const numStr = officialFiscalNum ? ` N° ${officialFiscalNum}` : '';
        showToast(`¡Factura Fiscal${numStr} emitida y respaldada en Caja y Libro SENIAT!`, 'success');
        return;
      }

      // FLUJO DE NOTA DE ENTREGA / CONTROL INTERNO:
      const created = createInvoice(invoicePayload);
      
      if (activeTab?.id) {
        deleteOpenTab(activeTab.id);
        setActiveTab(null);
      }

      if (loadedTableOrder && loadedTableOrder.tableId) {
        fetch(`http://localhost:3001/api/restaurant/table/${loadedTableOrder.tableId}/free`, {
          method: 'POST'
        }).catch(err => console.warn('Could not free table:', err));
        setLoadedTableOrder(null);
      }

      setLastInvoice(created || invoicePayload);
      setCart([]);
      setClient(null);
      setOrderType('salon');
      setDeliveryInfo({ address: '', phone: '', courier: '', deliveryFee: 0 });
      setPagoMovilBank('');
      setPagoMovilRef('');
      setCashReceivedUSD('');
      setCashReceivedBs('');
      setPaymentMethod('efectivo_usd');
      setShowPaymentModal(false);
      
      showToast('¡Nota de Entrega registrada con éxito!', 'success');
      setShowPreview(true);
    } catch (error) {
      console.error(error);
      showToast(isFiscalInvoice ? 'Error al procesar la Factura Fiscal' : 'Error al procesar la Nota de Entrega', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', color: '#0f172a', overflow: 'hidden' }}>
      
      {/* Aviso Preventivo Pre-Medianoche (11:00 PM a 11:44 PM) */}
      {isClosingWarning && (
        <div style={{
          background: '#fef3c7',
          borderBottom: '1px solid #fcd34d',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          color: '#92400e',
          fontSize: '0.88rem',
          fontWeight: '600'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <span>
              <strong>AVISO DE CIERRE DE CAJA ({formattedTime}):</strong> Faltan {45 - curMin} min para el bloqueo obligatorio de facturación (11:45 PM). Realice el Arqueo y Cierre de Caja (Reporte Z) antes de las 12:00 AM para cuadrar la jornada ante el SENIAT.
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/cash-close')}
            style={{
              padding: '6px 14px',
              background: '#d97706',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            👉 Ir a Cierre de Caja
          </button>
        </div>
      )}

      {/* Bloqueo Estricto de Facturación Pre-Medianoche (11:45 PM a 5:00 AM) */}
      {isNightLocked && (
        <div style={{
          background: '#fee2e2',
          borderBottom: '2px solid #ef4444',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          color: '#991b1b',
          fontSize: '0.88rem',
          fontWeight: '700'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.35rem' }}>⛔</span>
            <div>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                FACTURACIÓN BLOQUEADA POR CIERRE OBLIGATORIO ({formattedTime}):
              </span>
              <span style={{ fontWeight: '500', marginLeft: '6px', color: '#7f1d1d' }}>
                Debe realizar el Cierre de Caja (Reporte Z) antes de las 12:00 AM para no mezclar operaciones con el día siguiente.
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => navigate('/cash-close')}
              style={{
                padding: '7px 16px',
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '800',
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(220,38,38,0.3)'
              }}
            >
              👉 IR A CERRAR CAJA AHORA
            </button>
            <button
              type="button"
              onClick={() => setShowPinModal(true)}
              style={{
                padding: '7px 12px',
                background: '#ffffff',
                color: '#991b1b',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              🔓 Desbloqueo Supervisor
            </button>
          </div>
        </div>
      )}

      {/* Main POS Content Row (Catalog + Sidebar) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Catalog Grid View (Left Column) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
        
        {/* Search Header */}
        <div style={{ flexShrink: 0, marginBottom: '20px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '480px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar helado, paleta, pote o código..."
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
                      <>
                        <img
                          src={getAssetUrl(product.image)}
                          alt={product.name}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fb = e.currentTarget.parentElement && e.currentTarget.parentElement.querySelector('.pos-prod-fallback');
                            if (fb) fb.style.display = 'flex';
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            objectPosition: 'center',
                            display: 'block',
                            borderRadius: '8px'
                          }}
                        />
                        <div className="pos-prod-fallback" style={{ display: 'none', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--brand-primary, #D91C24)' }}>
                          <IceCream size={32} strokeWidth={1.8} />
                          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: '800', color: '#64748b' }}>
                            {product.category || 'Helados Cali'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--brand-primary, #D91C24)' }}>
                        <IceCream size={32} strokeWidth={1.8} />
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: '800', color: '#64748b' }}>
                          {product.category || 'Helados Cali'}
                        </span>
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
        onSelectClient={handleSelectClient}
        onSaveClientAddress={handleSaveClientAddress}
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
        onGenerateNotaEntrega={handleDirectCheckout}
        products={products}
        paymentMethod={paymentMethod}
        onSelectPaymentMethod={(methodId) => {
          setPaymentMethod(methodId);
        }}
        pagoMovilBank={pagoMovilBank}
        onSelectPagoMovilBank={setPagoMovilBank}
        pagoMovilRef={pagoMovilRef}
        onChangePagoMovilRef={setPagoMovilRef}
        orderType={orderType}
        onChangeOrderType={handleChangeOrderType}
        deliveryInfo={deliveryInfo}
        onChangeDeliveryInfo={setDeliveryInfo}
        onSaveOpenTab={handleSaveOpenTab}
        openTabsCount={openTabs.length}
        onOpenTabsModal={() => setShowOpenTabsModal(true)}
        activeTabName={activeTab?.name || null}
        onCancelActiveTab={() => {
          setActiveTab(null);
          setCart([]);
          setClient(null);
          setOrderType('salon');
          setDeliveryInfo({ address: '', phone: '', courier: '', deliveryFee: 0 });
        }}
        docType={docType}
        onChangeDocType={handleDocTypeChange}
        fiscalSettings={fiscalSettings}
        cashReceivedUSD={cashReceivedUSD}
        onChangeCashReceivedUSD={setCashReceivedUSD}
        cashReceivedBs={cashReceivedBs}
        onChangeCashReceivedBs={setCashReceivedBs}
        onDirectCheckout={handleDirectCheckout}
        onOpenPaymentModal={() => {
          if (isNightLocked) {
            setShowLockModal(true);
            return;
          }
          setShowPaymentModal(true);
        }}
        isNightLocked={isNightLocked}
        onOpenLockModal={() => setShowLockModal(true)}
      />

      </div>

      {/* Modal de Bloqueo por Cierre de Caja Pre-Medianoche */}
      {showLockModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3500, backdropFilter: 'blur(6px)', padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '20px', padding: '28px',
            maxWidth: '520px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            border: '2px solid #ef4444', color: '#0f172a', textAlign: 'center'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2',
              color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <AlertCircle size={36} />
            </div>

            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: '800', color: '#991b1b' }}>
              ⛔ FACTURACIÓN BLOQUEADA
            </h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#475569', fontWeight: '600' }}>
              Horario de Cierre Obligatorio ({formattedTime})
            </p>

            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px',
              padding: '14px 18px', marginBottom: '20px', textAlign: 'left',
              fontSize: '0.85rem', color: '#7f1d1d', lineHeight: '1.5'
            }}>
              <strong>¿Por qué está bloqueada la facturación?</strong>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
                <li>Son más de las 11:45 PM y la jornada fiscal de hoy debe cerrarse.</li>
                <li>Por normativa del SENIAT y cuadre de caja, <strong>debe emitir el Reporte Z y realizar el Cierre de Caja antes de las 12:00 AM</strong>.</li>
                <li>No se permite facturar para evitar descuadres entre la fecha fiscal de la impresora y los libros contables.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowLockModal(false);
                  navigate('/cash-close');
                }}
                style={{
                  padding: '13px 20px',
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                }}
              >
                <span>👉 IR A CERRAR CAJA AHORA (REPORTE Z)</span>
              </button>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setShowLockModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Volver al POS
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowLockModal(false);
                    setShowPinModal(true);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    color: '#92400e',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  🔓 Desbloqueo Supervisor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de PIN de Supervisor para Desbloqueo de Emergencia */}
      {showPinModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3600, backdropFilter: 'blur(6px)', padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '18px', padding: '24px',
            maxWidth: '380px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            border: '1px solid #cbd5e1', color: '#0f172a', textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
              Autorización de Supervisor
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#64748b' }}>
              Ingrese el PIN de Administrador/Supervisor para autorizar facturación extraordinaria fuera de hora.
            </p>

            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              autoFocus
              value={supervisorPinInput}
              onChange={(e) => {
                setSupervisorPinInput(e.target.value.replace(/\D/g, ''));
                setSupervisorPinError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (supervisorPinInput === '7391' || (isAdmin && isAdmin())) {
                    setAdminBypass(true);
                    setShowPinModal(false);
                    setSupervisorPinInput('');
                    setSupervisorPinError(false);
                    showToast('Desbloqueo de supervisor concedido para esta sesión.', 'success');
                  } else {
                    setSupervisorPinError(true);
                  }
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1.5rem',
                textAlign: 'center',
                letterSpacing: '8px',
                border: supervisorPinError ? '2px solid #ef4444' : '2px solid #cbd5e1',
                borderRadius: '10px',
                outline: 'none',
                marginBottom: '12px',
                boxSizing: 'border-box'
              }}
            />

            {supervisorPinError && (
              <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#dc2626', fontWeight: '700' }}>
                PIN incorrecto. Intente nuevamente.
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setSupervisorPinInput('');
                  setSupervisorPinError(false);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (supervisorPinInput === '7391' || (isAdmin && isAdmin())) {
                    setAdminBypass(true);
                    setShowPinModal(false);
                    setSupervisorPinInput('');
                    setSupervisorPinError(false);
                    showToast('Desbloqueo de supervisor concedido para esta sesión.', 'success');
                  } else {
                    setSupervisorPinError(true);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Autorizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      <POSPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalUSD={cartTotalUSD}
        currentRate={currentRate}
        client={client}
        onSelectClient={handleSelectClient}
        onConfirmPayment={handleConfirmPayment}
        initialPaymentMethod={paymentMethod}
        initialPagoMovilBank={pagoMovilBank}
        initialPagoMovilRef={pagoMovilRef}
        fiscalEnabled={fiscalSettings?.enabled}
        initialDocType={docType}
      />

      {/* Open Tabs & Delivery Drawer Modal (Llevar la cuenta) */}
      <OpenTabsModal
        isOpen={showOpenTabsModal}
        onClose={() => setShowOpenTabsModal(false)}
        openTabs={openTabs}
        currentRate={currentRate}
        onChargeTab={handleChargeOpenTab}
        onEditTab={handleEditOpenTab}
        onPrintPreBill={handlePrintPreBill}
        onDeleteTab={deleteOpenTab}
        onUpdateTabStatus={updateOpenTabStatus}
      />

      {/* Printable Thermal Receipt Modal */}
      {showPreview && lastInvoice && (
        <InvoicePreview
          invoice={lastInvoice}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Pre-Bill / Cuenta Previa Modal */}
      {preBillInvoice && (
        <InvoicePreview
          invoice={preBillInvoice}
          onClose={() => setPreBillInvoice(null)}
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
