import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  DollarSign,
  CreditCard,
  Smartphone,
  Printer,
  CheckCircle2,
  X,
  RefreshCw,
  Tag,
  Receipt,
  AlertCircle,
  AlertTriangle,
  Share2,
  Sparkles,
  Store,
  Layers,
  ChefHat,
  ShieldCheck,
  ChevronRight,
  Filter,
  User,
  Utensils,
  Banknote,
  FileText,
  UserCheck,
  UtensilsCrossed,
  Clock,
  Bookmark,
  Check,
  ArrowLeftRight,
  Menu,
  Settings
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useData } from '../../pos-core/contexts/DataContext';
import KitchenTicketModal from './KitchenTicketModal';
import ClientSelectorModal from './ClientSelectorModal';
import BankSelector from './BankSelector';
import TopBarRate from '../app-shell/TopBarRate';
import { VZLA_BANKS, BankLogo, findBank } from '../../pos-core/utils/venezuelaBanks';
import { printIsolatedTicket } from '../../pos-core/utils/printIsolatedTicket';
import { getLocalTerminalConfig } from '../monitor/api';

// Formateador legible para métodos de pago venezolanos
export function formatPaymentMethodLabel(method) {
  switch (method) {
    case 'punto':
      return 'Punto de Venta';
    case 'pago_movil':
      return 'Pago Móvil';
    case 'efectivo_usd':
      return 'Efectivo $ (Divisas)';
    case 'efectivo_bs':
      return 'Efectivo Bs';
    case 'zelle':
      return 'Zelle';
    case 'mixto':
      return 'Pago Mixto';
    default:
      return method || 'No especificado';
  }
}

export default function WebPosView({
  tenant,
  snapshot,
  onSaleComplete,
  onOpenSettings,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenMobileSidebar
}) {
  const data = useData();
  const isElectron = typeof window !== 'undefined' && (Boolean(window?.electronAPI) || window.location.protocol === 'file:');

  // Sincronizar botones de ventana nativos de Windows a color blanco para fusionar con el sidebar
  useEffect(() => {
    if (window?.electronAPI?.setTitleBarOverlay) {
      window.electronAPI.setTitleBarOverlay({ color: '#ffffff', symbolColor: '#09090b', height: 48 });
    }
  }, []);

  // Tasa de cambio BCV oficial
  const currentRate = Number(data?.exchangeRate) || Number(snapshot?.exchange_rate || tenant?.exchange_rate) || 876.80;
  const [bcvRate, setBcvRate] = useState(currentRate);

  useEffect(() => {
    if (data?.exchangeRate) {
      setBcvRate(Number(data.exchangeRate));
    }
  }, [data?.exchangeRate]);

  // Catálogo de Productos del negocio autenticado
  const products = useMemo(() => {
    const cleanList = (arr) =>
      arr.filter(
        (p) =>
          p &&
          !String(p.id || "").startsWith("hd_") &&
          !String(p.id || "").startsWith("hd-") &&
          !String(p.image || "").includes("happydays")
      );
    if (data?.products && data.products.length > 0) {
      return cleanList(data.products);
    }
    if (Array.isArray(snapshot?.products) && snapshot.products.length > 0) {
      return cleanList(snapshot.products);
    }
    return [];
  }, [data?.products, snapshot?.products]);

  // Categorías
  const categories = useMemo(() => {
    const set = new Set(['Todos']);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Posición del sidebar de ticket: 'right' (por defecto) o 'left'
  const [sidebarPosition, setSidebarPosition] = useState(() => {
    return localStorage.getItem('pos_sidebar_position') || 'right';
  });

  // Carrito de compras
  const [cart, setCart] = useState([]);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Cliente Receptor Fiscal (Consumidor Final por defecto o cliente registrado con RIF)
  const [activeClient, setActiveClient] = useState({
    id: 'generic',
    name: 'Consumidor Final',
    rif: 'V-00000000-0',
    cedula: 'V-00000000-0',
    address: 'Mostrador / Local'
  });
  const [orderTable, setOrderTable] = useState('Barra / Mostrador');
  const [orderNotes, setOrderNotes] = useState('');
  const [loadedTableOrder, setLoadedTableOrder] = useState(null);

  // Auto-cargar orden entrante transferida desde Mesas / Salón
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('pos_incoming_table_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          const formattedItems = parsed.items.map((i) => ({
            id: i.id || i.productId || `item-${Date.now()}-${Math.random()}`,
            name: i.name,
            price: Number(i.priceUSD || i.price || i.priceUsd || 0),
            priceUsd: Number(i.priceUSD || i.price || i.priceUsd || 0),
            qty: Number(i.quantity || i.qty || 1),
            isExempt: Boolean(i.isExempt),
            image: i.image || null,
            note: i.note || ''
          }));
          setCart(formattedItems);
          setLoadedTableOrder(parsed);
          if (parsed.tableName) setOrderTable(parsed.tableName);
          if (parsed.waiterName) setOrderNotes(`Atendido por: ${parsed.waiterName}`);
          setIsPaymentModalOpen(true);
        }
        sessionStorage.removeItem('pos_incoming_table_order');
      }
    } catch (e) {
      console.warn('Error cargando orden transferida de mesa:', e);
    }
  }, []);

  // Modales
  const [isKitchenModalOpen, setIsKitchenModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Configuración de cobro
  const [docType, setDocType] = useState('nota_entrega'); // 'nota_entrega' | 'fiscal'
  const [paymentMethod, setPaymentMethod] = useState('efectivo_usd'); // 'efectivo_usd' | 'pago_movil' | 'punto' | 'efectivo_bs' | 'zelle' | 'mixto'
  const [cashUsdReceived, setCashUsdReceived] = useState('');
  const [cashBsReceived, setCashBsReceived] = useState('');
  const [selectedBank, setSelectedBank] = useState('0134 - Banesco');
  const [selectedPuntoBank, setSelectedPuntoBank] = useState('0134 - Banesco');
  const [pagoMovilPhone, setPagoMovilPhone] = useState('');
  const [pagoMovilRef, setPagoMovilRef] = useState('');
  const [puntoRef, setPuntoRef] = useState('');
  const [zelleHolder, setZelleHolder] = useState('');
  const [refError, setRefError] = useState('');
  const [mixedPayments, setMixedPayments] = useState({
    efectivo_usd: '',
    pago_movil: '',
    punto: '',
    efectivo_bs: '',
    zelle: ''
  });
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // Ticket completado
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'Todos' || p.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        p.name?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query);
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Totales del Carrito (Precios PVP con IVA incluido según normativa SENIAT venezolana)
  const cartTotals = useMemo(() => {
    let subtotalUsd = 0;
    let exentoUsd = 0;

    cart.forEach((item) => {
      const price = Number(item.priceUsd || item.price || 0);
      const qty = Number(item.qty || 1);
      const lineTotal = price * qty;
      subtotalUsd += lineTotal;
      if (item.isExempt) {
        exentoUsd += lineTotal;
      }
    });

    // Desglose fiscal SENIAT: Los precios de catálogo son PVP (IVA 16% ya incluido)
    const taxableSubtotalUsd = Math.max(0, subtotalUsd - exentoUsd);
    const baseImponibleUsd = Number((taxableSubtotalUsd / 1.16).toFixed(2));
    const iva16Usd = Number((taxableSubtotalUsd - baseImponibleUsd).toFixed(2));

    // Cálculo del IGTF (3% sobre divisas en efectivo para facturas fiscales SENIAT)
    let igtfUsd = 0;
    if (docType === 'fiscal') {
      if (paymentMethod === 'efectivo_usd' || paymentMethod === 'zelle') {
        igtfUsd = Number((subtotalUsd * 0.03).toFixed(2));
      } else if (paymentMethod === 'mixto') {
        const cashDivisas = (Number(mixedPayments.efectivo_usd) || 0) + (Number(mixedPayments.zelle) || 0);
        const cashPart = Math.min(cashDivisas, subtotalUsd);
        igtfUsd = Number((cashPart * 0.03).toFixed(2));
      }
    }

    const finalTotalUsd = Number((subtotalUsd + igtfUsd).toFixed(2));
    const finalTotalBs = Number((finalTotalUsd * bcvRate).toFixed(2));

    // Vueltos y saldos para Efectivo USD
    const cashUsdNum = Number(cashUsdReceived) || 0;
    const changeUsd = paymentMethod === 'efectivo_usd' ? Math.max(0, cashUsdNum - finalTotalUsd) : 0;
    const changeBsFromUsd = Number((changeUsd * bcvRate).toFixed(2));

    // Vueltos y saldos para Efectivo Bs
    const cashBsNum = Number(cashBsReceived) || 0;
    const changeBs = paymentMethod === 'efectivo_bs' ? Math.max(0, cashBsNum - finalTotalBs) : 0;

    // Saldo en Pago Mixto
    const totalPaidMixedUsd =
      (Number(mixedPayments.efectivo_usd) || 0) +
      (Number(mixedPayments.zelle) || 0) +
      ((Number(mixedPayments.pago_movil) || 0) / bcvRate) +
      ((Number(mixedPayments.punto) || 0) / bcvRate) +
      ((Number(mixedPayments.efectivo_bs) || 0) / bcvRate);
    const mixedDifferenceUsd = finalTotalUsd - totalPaidMixedUsd;

    return {
      subtotalUsd: Number(subtotalUsd.toFixed(2)),
      subtotalBs: Number((subtotalUsd * bcvRate).toFixed(2)),
      baseImponibleUsd,
      baseImponibleBs: Number((baseImponibleUsd * bcvRate).toFixed(2)),
      exentoUsd,
      exentoBs: Number((exentoUsd * bcvRate).toFixed(2)),
      iva16Usd,
      iva16Bs: Number((iva16Usd * bcvRate).toFixed(2)),
      igtfUsd,
      igtfBs: Number((igtfUsd * bcvRate).toFixed(2)),
      finalTotalUsd,
      finalTotalBs,
      changeUsd,
      changeBs: changeBsFromUsd || changeBs,
      totalPaidMixedUsd,
      mixedDifferenceUsd,
      totalQty: cart.reduce((acc, i) => acc + (Number(i.qty) || 1), 0)
    };
  }, [cart, docType, paymentMethod, mixedPayments, bcvRate, cashUsdReceived, cashBsReceived]);

  // Manejo del carrito
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const next = i.qty + delta;
            return next > 0 ? { ...i, qty: next } : null;
          }
          return i;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Abrir Modal de Cobro con valores predeterminados
  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setRefError('');
    if (!cashUsdReceived || Number(cashUsdReceived) < cartTotals.finalTotalUsd) {
      const roundedCash = Math.ceil(cartTotals.finalTotalUsd / 5) * 5 || 5;
      setCashUsdReceived(String(roundedCash));
    }
    if (!cashBsReceived) {
      setCashBsReceived(String(Math.ceil(cartTotals.finalTotalBs)));
    }
    setIsPaymentModalOpen(true);
  };

  // Escuchar tecla Enter para cobrar rápido cuando hay productos en carrito
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
        if (isReceiptModalOpen || isClientModalOpen || isKitchenModalOpen) return;
        if (cart.length > 0 && !isPaymentModalOpen) {
          e.preventDefault();
          handleOpenPayment();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, isPaymentModalOpen, isReceiptModalOpen, isClientModalOpen, isKitchenModalOpen]);

  // Procesar Facturación y Guardar Venta
  const handleProcessSale = async (e) => {
    if (e) e.preventDefault();

    // Validación estricta de Pago Móvil (4 dígitos exactos requeridos para auditoría y cierre de caja)
    if (paymentMethod === 'pago_movil' || (paymentMethod === 'mixto' && Number(mixedPayments.pago_movil) > 0)) {
      const cleanRef = (pagoMovilRef || '').trim();
      if (cleanRef.length !== 4) {
        if (cleanRef.length === 0) {
          setRefError('Debes ingresar los 4 dígitos de la referencia de Pago Móvil.');
        } else {
          setRefError(`La referencia debe tener exactamente 4 dígitos (ingresaste solo ${cleanRef.length}).`);
        }
        if (!isPaymentModalOpen) setIsPaymentModalOpen(true);
        return;
      }
    }

    // Validación de Pago Mixto
    if (paymentMethod === 'mixto' && cartTotals.mixedDifferenceUsd > 0.05) {
      alert(`Falta por cubrir $${cartTotals.mixedDifferenceUsd.toFixed(2)} USD para completar el pago.`);
      if (!isPaymentModalOpen) setIsPaymentModalOpen(true);
      return;
    }

    setIsSubmittingSale(true);

    try {
      const now = new Date();
      const localTerm = getLocalTerminalConfig();
      const invoiceNumber = (docType === 'fiscal' ? 'FACT-' : 'NOTA-') + String(Math.floor(100000 + Math.random() * 900000));
      const fiscalSerial = localTerm.fiscalSerial || tenant?.fiscal_serial || 'Z4A1234567';

      const invoiceData = {
        id: invoiceNumber,
        invoiceNumber,
        docType,
        isFiscalInvoice: docType === 'fiscal',
        terminalId: localTerm.terminalId || 'CAJA-01',
        terminalName: localTerm.terminalName || 'Caja Principal',
        date: now.toISOString(),
        client: {
          name: activeClient.name || 'Consumidor Final',
          rif: activeClient.rif || activeClient.cedula || 'V-00000000-0',
          address: activeClient.address || 'Mostrador / Local'
        },
        items: cart.map((i) => {
          const unitPriceUsd = Number(i.priceUsd || i.price || 0);
          const qty = Number(i.qty || 1);
          return {
            id: i.id,
            productId: i.id,
            name: i.name,
            productName: i.name,
            qty,
            quantity: qty,
            price: unitPriceUsd,
            priceUsd: unitPriceUsd,
            priceUSD: unitPriceUsd,
            priceBs: Number((unitPriceUsd * bcvRate).toFixed(2)),
            isExempt: Boolean(i.isExempt),
            totalUsd: Number((unitPriceUsd * qty).toFixed(2)),
            totalUSD: Number((unitPriceUsd * qty).toFixed(2)),
            totalBs: Number((unitPriceUsd * qty * bcvRate).toFixed(2)),
            subtotalUsd: Number((unitPriceUsd * qty).toFixed(2)),
            subtotalBs: Number((unitPriceUsd * qty * bcvRate).toFixed(2))
          };
        }),
        subtotalUsd: cartTotals.subtotalUsd,
        subtotalBs: cartTotals.subtotalBs,
        baseImponibleUsd: cartTotals.baseImponibleUsd,
        baseImponibleBs: cartTotals.baseImponibleBs,
        iva16Usd: cartTotals.iva16Usd,
        iva16Bs: cartTotals.iva16Bs,
        igtfUsd: cartTotals.igtfUsd,
        igtfBs: cartTotals.igtfBs,
        total: cartTotals.finalTotalUsd,
        totalUSD: cartTotals.finalTotalUsd,
        totalUsd: cartTotals.finalTotalUsd,
        totalBs: cartTotals.finalTotalBs,
        exchangeRate: bcvRate,
        paymentMethod,
        paymentDetails: {
          cashUsd: paymentMethod === 'efectivo_usd' ? cartTotals.finalTotalUsd : Number(mixedPayments.efectivo_usd || 0),
          cashUsdReceived: Number(cashUsdReceived) || (paymentMethod === 'efectivo_usd' ? cartTotals.finalTotalUsd : 0),
          cashBs: paymentMethod === 'efectivo_bs' ? cartTotals.finalTotalBs : Number(mixedPayments.efectivo_bs || 0),
          cashBsReceived: Number(cashBsReceived) || (paymentMethod === 'efectivo_bs' ? cartTotals.finalTotalBs : 0),
          pagoMovilBs: paymentMethod === 'pago_movil' ? cartTotals.finalTotalBs : Number(mixedPayments.pago_movil || 0),
          pagoMovilBank: (paymentMethod === 'pago_movil' || paymentMethod === 'mixto') ? selectedBank : null,
          pagoMovilRef: (paymentMethod === 'pago_movil' || paymentMethod === 'mixto') ? (pagoMovilRef || '').trim() : null,
          pagoMovilPhone: (paymentMethod === 'pago_movil' || paymentMethod === 'mixto') ? pagoMovilPhone : null,
          puntoBs: paymentMethod === 'punto' ? cartTotals.finalTotalBs : Number(mixedPayments.punto || 0),
          puntoBank: (paymentMethod === 'punto' || paymentMethod === 'mixto') ? selectedPuntoBank : null,
          puntoRef: (paymentMethod === 'punto' || paymentMethod === 'mixto') ? puntoRef : null,
          zelleUsd: paymentMethod === 'zelle' ? cartTotals.finalTotalUsd : Number(mixedPayments.zelle || 0),
          zelleHolder: (paymentMethod === 'zelle' || paymentMethod === 'mixto') ? zelleHolder : null,
          changeUsd: cartTotals.changeUsd,
          changeBs: cartTotals.changeBs
        },
        fiscalSerial,
        status: 'paid'
      };

      // 1. SI ESTAMOS EN ELECTRON DESKTOP Y ES FACTURA FISCAL SENIAT
      if (isElectron && docType === 'fiscal') {
        try {
          const port = data?.fiscalSettings?.port || 'COM2';
          const fiscalRes = data?.fiscalPrintInvoice
            ? await data.fiscalPrintInvoice(invoiceData, port)
            : await window.electronAPI.fiscal.printInvoice(port, invoiceData);

          if (fiscalRes && fiscalRes.success === false) {
            console.warn('Aviso máquina fiscal:', fiscalRes.error || fiscalRes.failureReason);
          } else if (fiscalRes && fiscalRes.invoiceNumber) {
            invoiceData.fiscalInvoiceNumber = fiscalRes.invoiceNumber;
            invoiceData.fiscalSerial = fiscalRes.serial || invoiceData.fiscalSerial;
          }
        } catch (fErr) {
          console.error('Error enviando a máquina fiscal HKA80:', fErr);
        }
      }

      // 2. Registrar en DataContext local
      let savedInvoice = invoiceData;
      if (data?.createInvoice) {
        savedInvoice = data.createInvoice(invoiceData) || invoiceData;
      } else if (data?.addInvoice) {
        savedInvoice = data.addInvoice(invoiceData) || invoiceData;
      }

      // 3. Sincronizar snapshot con Supabase
      if (tenant?.id) {
        const existingInvoices = Array.isArray(snapshot?.invoices) ? snapshot.invoices : [];
        const updatedInvoices = [savedInvoice, ...existingInvoices];

        await supabase
          .from('tenant_snapshots')
          .upsert({
            tenant_id: tenant.id,
            invoices: updatedInvoices,
            exchange_rate: bcvRate,
            updated_at: new Date().toISOString()
          });

        if (onSaleComplete) {
          onSaleComplete(savedInvoice);
        }
      }

      if (loadedTableOrder?.tableId) {
        fetch('http://localhost:3001/api/restaurant/table/' + loadedTableOrder.tableId + '/free', {
          method: 'POST'
        }).catch(() => {});
        setLoadedTableOrder(null);
      }
      if (loadedTableOrder?.tabId && data?.deleteOpenTab) {
        data.deleteOpenTab(loadedTableOrder.tabId);
      }
      setCompletedInvoice(savedInvoice);
      setIsPaymentModalOpen(false);
      setIsMobileDrawerOpen(false);
      setIsReceiptModalOpen(true);
      clearCart();
      setPagoMovilRef('');
      setPagoMovilPhone('');
      setPuntoRef('');
      setCashUsdReceived('');
      setCashBsReceived('');
      setMixedPayments({
        efectivo_usd: '',
        pago_movil: '',
        punto: '',
        efectivo_bs: '',
        zelle: ''
      });
    } catch (err) {
      console.error('Error registrando venta:', err);
      alert('Error registrando factura: ' + err.message);
    } finally {
      setIsSubmittingSale(false);
    }
  };

  // CONTENIDO CENTRALIZADO DEL SIDEBAR DE FACTURACIÓN:
  // OCUPA EL 100% DE LA ALTURA DISPONIBLE, SIN BARRAS DE SCROLL VISIBLES, CON FOTO EN CADA ÍTEM
  const renderInvoiceSidebarContent = (isMobile = false) => (
    <div className="flex-1 flex flex-col h-full bg-white select-none overflow-hidden">
      
      {/* 1. TABLE ORIGIN BANNER (SI FUE TRANSFERIDA DE SALÓN / MESAS) */}
      {loadedTableOrder && (
        <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <UtensilsCrossed size={14} className="text-amber-700 shrink-0" />
            <div className="truncate">
              <span className="font-bold text-amber-950 text-xs block leading-tight truncate">
                {loadedTableOrder.tableName || 'Mesa del Salón'}
              </span>
              <span className="text-[10px] text-amber-700 font-medium">
                Atendido por: {loadedTableOrder.waiterName || 'Mesero'}
              </span>
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
            className="px-2 py-0.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-[10px] font-bold text-amber-900 cursor-pointer shrink-0 transition-colors"
          >
            Desvincular
          </button>
        </div>
      )}

      {/* 2. CABECERA ALINEADA AL TOPE SUPERIOR DE LA VENTANA (FULL HEIGHT) */}
      <div
        className="px-3.5 py-3 border-b border-zinc-200/80 flex items-center justify-between shrink-0 bg-white app-drag-region"
        style={!isMobile && isElectron && sidebarPosition === 'right' ? { paddingRight: '144px' } : undefined}
      >
        <div className="flex items-center gap-2 min-w-0 app-no-drag">
          <div className="p-1.5 rounded-lg bg-zinc-950 text-white shrink-0 shadow-2xs">
            <Receipt size={15} />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-extrabold text-xs text-zinc-950 uppercase tracking-wider truncate">
              Comprobante
            </h2>
            <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-extrabold bg-zinc-100 text-zinc-700 border border-zinc-200">
              {cartTotals.totalQty} {cartTotals.totalQty === 1 ? 'ítem' : 'ítems'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 app-no-drag">
          {/* Alternador de posición Izquierda / Derecha */}
          {!isMobile && (
            <button
              type="button"
              onClick={() => {
                const nextPos = sidebarPosition === 'right' ? 'left' : 'right';
                setSidebarPosition(nextPos);
                localStorage.setItem('pos_sidebar_position', nextPos);
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 text-xs cursor-pointer transition-colors"
              title={sidebarPosition === 'right' ? 'Mover ticket al lateral izquierdo' : 'Mover ticket al lateral derecho'}
            >
              <ArrowLeftRight size={13} />
            </button>
          )}

          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 text-xs font-semibold cursor-pointer transition-colors"
              title="Vaciar orden"
            >
              <Trash2 size={14} />
            </button>
          )}

          {isMobile && (
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 text-xs cursor-pointer"
              title="Cerrar comanda"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 3. RECEPTOR FISCAL & SELECTOR DE DOCUMENTO (FILA COMPACTA) */}
      <div className="px-3.5 py-1.5 bg-zinc-50 border-b border-zinc-200/80 shrink-0 flex items-center justify-between gap-2 text-xs">
        <button
          type="button"
          onClick={() => setIsClientModalOpen(true)}
          className="flex items-center gap-1.5 min-w-0 flex-1 text-left px-2 py-1 rounded-lg hover:bg-white hover:border-zinc-300 border border-transparent transition-all cursor-pointer truncate"
          title={`Cliente: ${activeClient.name} (${activeClient.rif})`}
        >
          <User size={13} className="text-zinc-500 shrink-0" />
          <span className="font-bold text-zinc-900 truncate text-[11px] block leading-tight">
            {activeClient.name}
          </span>
          <span className="text-[10px] text-zinc-400 font-mono shrink-0 hidden sm:inline">
            ({activeClient.rif})
          </span>
        </button>

        <div className="flex items-center gap-0.5 bg-zinc-200/80 p-0.5 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setDocType('nota_entrega')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
              docType === 'nota_entrega'
                ? 'bg-white text-zinc-950 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            Nota
          </button>
          <button
            type="button"
            onClick={() => setDocType('fiscal')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
              docType === 'fiscal'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            SENIAT
          </button>
        </div>
      </div>

      {/* 4. LISTADO DE PRODUCTOS EN COMANDA:
             - CADA PRODUCTO TIENE SU FOTOGRAFÍA 1:1
             - OCUPA TODO EL ALTO CON SCROLL FLUIDO INVISIBLE (.no-scrollbar) */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2.5 sm:p-3 space-y-2">
        {cart.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-zinc-400">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-2.5 text-zinc-400">
              <ShoppingCart size={24} strokeWidth={1.8} />
            </div>
            <p className="text-xs font-bold text-zinc-700">Comprobante Vacío</p>
            <p className="text-[11px] text-zinc-400 mt-1 max-w-[200px] leading-relaxed">
              Haz clic en los platos o productos del catálogo para agregarlos a la comanda.
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const itemPrice = Number(item.priceUsd || item.price || 0);
            const lineTotalUsd = itemPrice * item.qty;
            const lineTotalBs = lineTotalUsd * bcvRate;

            return (
              <div
                key={item.id}
                className="py-2 px-2.5 rounded-xl border border-zinc-100/90 hover:border-zinc-200/90 hover:bg-zinc-50/70 transition-all flex items-center justify-between gap-2.5 group bg-white shadow-2xs"
              >
                {/* FOTOGRAFIA DEL PRODUCTO */}
                <div className="w-11 h-11 rounded-xl bg-zinc-50 border border-zinc-200/80 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-contain rounded-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="w-full h-full flex items-center justify-center text-zinc-400"
                    style={{ display: item.image ? 'none' : 'flex' }}
                  >
                    <Utensils size={17} strokeWidth={1.8} />
                  </div>
                </div>

                {/* DETALLE Y CANTIDAD */}
                <div className="min-w-0 flex-1">
                  <h4
                    className="font-bold text-xs text-zinc-950 truncate leading-tight group-hover:text-emerald-700 transition-colors"
                    title={item.name}
                  >
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono mt-0.5">
                    <span className="font-semibold text-zinc-600">${itemPrice.toFixed(2)} c/u</span>
                    <span>·</span>
                    <span>Bs. {lineTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  {/* CONTROLES STEPPER [-] 1 [+] Y BOTON QUITAR */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center border border-zinc-200 rounded-lg bg-zinc-50 shadow-2xs overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, -1)}
                        className="w-5 h-5 flex items-center justify-center hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                        title="Restar uno"
                      >
                        <Minus size={10} strokeWidth={2.5} />
                      </button>
                      <span className="w-6 text-center text-xs font-black font-mono text-zinc-950">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, 1)}
                        className="w-5 h-5 flex items-center justify-center hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                        title="Sumar uno"
                      >
                        <Plus size={10} strokeWidth={2.5} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="text-zinc-400 hover:text-rose-600 text-[10px] font-semibold transition-colors cursor-pointer"
                      title="Quitar"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* SUBTOTAL DE LÍNEA */}
                <div className="text-right shrink-0">
                  <span className="font-black text-xs sm:text-sm font-mono text-zinc-950 block">
                    ${lineTotalUsd.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. RESUMEN DE TOTALES COMPACTO DOCK AL FONDO */}
      <div className="px-3.5 py-2.5 bg-zinc-50 border-t border-zinc-200 shrink-0 space-y-1.5 text-xs">
        <div className="flex justify-between items-baseline text-zinc-500 text-[11px]">
          <span>Subtotal ({cartTotals.totalQty} {cartTotals.totalQty === 1 ? 'ítem' : 'ítems'}):</span>
          <span className="font-mono font-bold text-zinc-800">${cartTotals.subtotalUsd.toFixed(2)}</span>
        </div>

        {docType === 'fiscal' && (
          <div className="flex justify-between items-baseline text-[10px] text-zinc-500 pt-0.5">
            <span>Base: ${cartTotals.baseImponibleUsd.toFixed(2)} · IVA (16% incl.): ${cartTotals.iva16Usd.toFixed(2)}</span>
            {cartTotals.igtfUsd > 0 && (
              <span className="text-amber-700 font-bold">+ IGTF (3%): ${cartTotals.igtfUsd.toFixed(2)}</span>
            )}
          </div>
        )}

        {/* TOTAL GRANDE DESTACADO */}
        <div className="pt-1.5 border-t border-zinc-200 flex items-baseline justify-between">
          <div>
            <span className="font-extrabold text-xs text-zinc-950 block">Total a Pagar:</span>
            <span className="text-[10px] text-zinc-500 font-mono">
              Tasa BCV: Bs. {Number(bcvRate).toFixed(2)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-zinc-950 font-mono block leading-tight">
              ${cartTotals.finalTotalUsd.toFixed(2)}
            </span>
            <span className="text-[11px] font-bold text-amber-800 font-mono bg-amber-100/70 px-2 py-0.5 rounded-md inline-block mt-0.5">
              Bs. {cartTotals.finalTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 6. SELECTOR RÁPIDO DE MÉTODO DE PAGO (UNA SOLA LÍNEA COMPACTA) */}
      <div className="px-3 py-1.5 bg-white border-t border-zinc-200/80 shrink-0 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider shrink-0 mr-1">
          Método:
        </span>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'efectivo_usd', label: 'Efectivo $' },
            { id: 'pago_movil', label: 'Pago Móvil' },
            { id: 'punto', label: 'Punto Venta' },
            { id: 'efectivo_bs', label: 'Bs' },
            { id: 'zelle', label: 'Zelle' },
            { id: 'mixto', label: 'Mixto' }
          ].map((m) => {
            const isSelected = paymentMethod === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setPaymentMethod(m.id);
                  setRefError('');
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-zinc-950 text-white shadow-2xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. BOTONES DE ACCIÓN FOOTER */}
      <div className="p-3 bg-white border-t border-zinc-200/80 shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsKitchenModalOpen(true)}
          className="p-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 transition-all cursor-pointer shadow-2xs shrink-0"
          title="Mandar ticket a cocina"
        >
          <ChefHat size={17} className="text-amber-600" />
        </button>

        <button
          type="button"
          disabled={cart.length === 0 || isSubmittingSale}
          onClick={handleOpenPayment}
          className={`flex-1 py-3 px-3.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all flex items-center justify-between gap-2 shadow-md active:scale-98 cursor-pointer ${
            cart.length === 0 || isSubmittingSale
              ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed border-zinc-200'
              : 'bg-zinc-950 hover:bg-zinc-800 text-white shadow-zinc-900/10'
          }`}
          title="Cobrar orden y emitir comprobante (Enter)"
        >
          <div className="flex items-center gap-2 truncate">
            <CreditCard size={16} className={cart.length > 0 ? 'text-emerald-400' : 'text-zinc-400'} />
            <span className="truncate">COBRAR / PROCESAR VENTA</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-mono text-emerald-300 font-black">
              ${cartTotals.finalTotalUsd.toFixed(2)}
            </span>
            <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-mono hidden sm:inline">
              ↵ Enter
            </span>
          </div>
        </button>
      </div>

    </div>
  );

  return (
    <div className={`flex-1 flex flex-col ${sidebarPosition === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} h-full w-full bg-zinc-50 overflow-hidden relative select-none`}>
      
      {/* =========================================================================
          ÁREA DE CATÁLOGO, BUSCADOR Y CATEGORÍAS
          ========================================================================= */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        
        {/* TOOLBAR SUPERIOR DEL PUNTO DE VENTA (CON TASA BCV, BUSCADOR Y AJUSTES) */}
        <div
          className="bg-white border-b border-zinc-200/80 px-4 py-2.5 shrink-0 flex items-center justify-between gap-3 app-drag-region"
          style={sidebarPosition === 'left' && isElectron ? { paddingRight: '144px' } : undefined}
        >
          <div className="flex items-center gap-2 flex-1 max-w-lg app-no-drag">
            {/* BOTÓN EXPANDIR MENÚ EN TOPBAR CUANDO EL SIDEBAR ESTÁ COLAPSADO (DESKTOP) */}
            {isSidebarCollapsed && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="hidden lg:flex p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                title="Expandir menú lateral"
              >
                <ChevronRight size={16} />
              </button>
            )}

            {/* BOTÓN MENÚ MÓVIL */}
            <button
              type="button"
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
            >
              <Menu size={18} />
            </button>

            {/* BUSCADOR DE PRODUCTOS */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar plato, combo o bebida en el catálogo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400 bg-zinc-50/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 app-no-drag shrink-0">
            <div className="text-zinc-400 text-xs font-semibold hidden md:block">
              {filteredProducts.length} productos
            </div>

            {/* TASA BCV OFICIAL */}
            <TopBarRate />

            {/* AJUSTES */}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1.5 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
                title="Abrir Ajustes del Negocio (⚙️)"
              >
                <Settings size={15} />
              </button>
            )}

            {/* ACCESO MÓVIL AL TICKET EN PANTALLAS PEQUEÑAS (< lg) */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className={`lg:hidden px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                cart.length > 0
                  ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
              }`}
              title="Ver comanda completa"
            >
              <ShoppingCart size={15} className={cart.length > 0 ? 'text-emerald-400' : 'text-zinc-500'} />
              <span>Ticket</span>
              <span className={`px-1.5 py-0.2 rounded-full font-mono text-[11px] ${
                cart.length > 0 ? 'bg-zinc-800 text-emerald-300 font-bold' : 'bg-zinc-200 text-zinc-600'
              }`}>
                {cartTotals.totalQty}
              </span>
              {cart.length > 0 && (
                <span className="font-mono text-zinc-300 text-[11px] border-l border-zinc-700 pl-2">
                  ${cartTotals.finalTotalUsd.toFixed(2)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* FILTRO DE CATEGORÍAS TIPO CHIPS (CON SCROLL FLUIDO INVISIBLE .no-scrollbar) */}
        <div className="bg-white px-4 py-2 border-b border-zinc-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {categories.map((cat) => {
            const count = cat === 'Todos' ? products.length : products.filter((p) => p.category === cat).length;
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* CATÁLOGO VISUAL DE PRODUCTOS (SCROLL FLUIDO INVISIBLE .no-scrollbar) */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-5">
          {products.length === 0 && (
            <div className="max-w-md mx-auto my-16 bg-white rounded-2xl border border-zinc-200/80 p-8 text-center shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mx-auto text-zinc-500">
                <Store size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-950">Tu catálogo de productos está limpio</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Registra los productos, platos o servicios de tu negocio en el módulo de Menú & Productos para comenzar a facturar.
                </p>
              </div>
              <a
                href="?tab=products"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <Plus size={14} />
                <span>Ir a Menú & Productos</span>
              </a>
            </div>
          )}

          <div 
            className="grid gap-4 sm:gap-4.5"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))'
            }}
          >
            {filteredProducts.map((p) => {
              const price = Number(p.priceUsd || p.price || 0);
              const priceBs = price * bcvRate;
              const inCart = cart.find((i) => i.id === p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`group relative rounded-2xl border bg-white overflow-hidden transition-all duration-150 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-between p-1.5 ${
                    inCart ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50/20 shadow-sm' : 'border-zinc-200/90 hover:border-zinc-300 shadow-2xs'
                  }`}
                >
                  {/* FOTOGRAFIA DEL PRODUCTO CON PROPORCION 1:1 AMPLIA */}
                  <div className="aspect-square w-full bg-zinc-50 rounded-xl overflow-hidden relative flex items-center justify-center p-2.5">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200 rounded-lg"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full flex flex-col items-center justify-center text-zinc-300 gap-1"
                      style={{ display: p.image ? 'none' : 'flex' }}
                    >
                      <Utensils size={34} strokeWidth={1.5} className="text-zinc-300" />
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        {p.category || 'Producto'}
                      </span>
                    </div>

                    {/* BADGE DE IVA EXENTO / GRAVADO */}
                    <div className="absolute top-2 left-2">
                      {p.isExempt ? (
                        <span className="px-1.5 py-0.5 rounded-md font-bold text-[9px] bg-amber-500/90 text-white shadow-xs backdrop-blur-xs">
                          Exento
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md font-bold text-[9px] bg-emerald-600/90 text-white shadow-xs backdrop-blur-xs">
                          IVA 16%
                        </span>
                      )}
                    </div>

                    {/* INDICADOR DE CANTIDAD EN CARRITO (DESTACADO EN ESMERALDA) */}
                    {inCart && (
                      <div className="absolute top-2.5 right-2.5 min-w-[26px] h-6 px-1.5 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-md animate-in zoom-in-75 duration-100">
                        {inCart.qty}
                      </div>
                    )}
                  </div>

                  {/* DETALLE DEL PRODUCTO (ROBUSTO Y CLARO) */}
                  <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5 truncate">
                        {p.category || 'General'}
                      </span>
                      <h3 className="font-extrabold text-[13px] text-zinc-950 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
                        {p.name}
                      </h3>
                      {p.description && (
                        <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5 font-normal">{p.description}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-baseline justify-between">
                      <div>
                        <span className="text-base font-black text-emerald-600 font-mono block leading-tight">
                          ${price.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-500 font-mono block">
                          Bs. {priceBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {inCart ? (
                        <div
                          className="flex items-center border border-emerald-500/40 rounded-xl bg-emerald-50/90 shadow-2xs overflow-hidden shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => updateQty(p.id, -1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-emerald-200 text-emerald-800 transition-colors cursor-pointer"
                            title="Restar uno"
                          >
                            <Minus size={12} strokeWidth={2.5} />
                          </button>
                          <span className="px-2 font-black font-mono text-xs text-emerald-950 select-none">
                            {inCart.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(p.id, 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-emerald-200 text-emerald-800 transition-colors cursor-pointer"
                            title="Sumar uno"
                          >
                            <Plus size={12} strokeWidth={2.5} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-xl bg-zinc-100 group-hover:bg-zinc-950 group-hover:text-white text-zinc-700 flex items-center justify-center transition-colors shadow-2xs shrink-0">
                          <Plus size={15} strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FLOATING ACTION BAR SOLO EN MÓVIL (< lg) */}
        {cart.length > 0 && (
          <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-zinc-950/95 backdrop-blur-md text-white p-2 rounded-2xl shadow-2xl border border-zinc-800 animate-in slide-in-from-bottom duration-200 w-[92%] max-w-sm justify-between">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 text-xs font-semibold cursor-pointer"
            >
              <ShoppingCart size={15} className="text-emerald-400" />
              <span className="font-bold">{cartTotals.totalQty} ítems</span>
              <span className="font-mono text-emerald-300 font-bold border-l border-zinc-700 pl-2">
                ${cartTotals.finalTotalUsd.toFixed(2)}
              </span>
            </button>

            <button
              type="button"
              onClick={handleOpenPayment}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-black cursor-pointer shadow-md"
            >
              <CreditCard size={15} />
              <span>Cobrar</span>
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          SIDEBAR FIJO DE COMPROBANTE / FACTURA A TODO EL ALTO DE LA PANTALLA
          Visible en Desktop (lg: y superior) con ancho amplio y scroll invisible (.no-scrollbar)
          ========================================================================= */}
      <aside className={`hidden lg:flex w-[410px] xl:w-[440px] 2xl:w-[460px] h-full ${
        sidebarPosition === 'left' ? 'border-r' : 'border-l'
      } border-zinc-200 bg-white flex-col shrink-0 overflow-hidden shadow-xs`}>
        {renderInvoiceSidebarContent(false)}
      </aside>

      {/* DRAWER MÓVIL (PANTALLAS PEQUEÑAS < lg) */}
      {isMobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-200"
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 z-50 text-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            {renderInvoiceSidebarContent(true)}
          </div>
        </div>
      )}

      {/* MODAL DE SELECCIÓN Y REGISTRO DE CLIENTES FISCALES SENIAT */}
      <ClientSelectorModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        selectedClient={activeClient}
        onSelectClient={(client) => setActiveClient(client)}
        tenant={tenant}
      />

      {/* MODAL DE COMANDA DE COCINA (TICKET TÉRMICO SIN PRECIOS) */}
      <KitchenTicketModal
        isOpen={isKitchenModalOpen}
        onClose={() => setIsKitchenModalOpen(false)}
        cart={cart}
        tableName={orderTable}
        orderNotes={orderNotes}
      />

      {/* MODAL DE COBRO COMPLETO DE HAPPY DAYS (PUNTO POS, PAGO MÓVIL, EFECTIVO, NOTA DE ENTREGA O SENIAT) */}
      {isPaymentModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsPaymentModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto no-scrollbar p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 text-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABECERA CON DOCUMENTO Y CIERRE */}
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-black text-base sm:text-lg tracking-tight text-zinc-950">
                  {docType === 'fiscal' ? 'Emitir Factura Fiscal SENIAT' : 'Emitir Nota de Entrega'}
                </h3>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  Resumen de Cobro · {cartTotals.totalQty} productos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* SELECTOR DE TIPO DE COMPROBANTE: NOTA DE ENTREGA vs FACTURA SENIAT */}
            <div>
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                Tipo de Comprobante:
              </span>
              <div className="grid grid-cols-2 gap-2 bg-zinc-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDocType('nota_entrega')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    docType === 'nota_entrega'
                      ? 'bg-white text-zinc-950 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  <FileText size={14} className={docType === 'nota_entrega' ? 'text-blue-600' : 'text-zinc-400'} />
                  <span>Nota de Entrega</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDocType('fiscal')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    docType === 'fiscal'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  <Printer size={14} className={docType === 'fiscal' ? 'text-white' : 'text-zinc-400'} />
                  <span>Factura Fiscal SENIAT</span>
                </button>
              </div>
            </div>

            {/* SECCIÓN CLIENTE / RECEPTOR FISCAL */}
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
              docType === 'fiscal' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <div className="min-w-0 flex-1 pr-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Cliente / Receptor:
                </span>
                <span className="font-extrabold text-zinc-950 truncate block text-xs mt-0.5">
                  {activeClient.name}
                </span>
                <span className="font-mono text-zinc-600 text-[11px]">
                  RIF: {activeClient.rif} {activeClient.address ? `· ${activeClient.address}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsClientModalOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-bold cursor-pointer shrink-0 transition-colors shadow-xs"
              >
                Cambiar / RIF
              </button>
            </div>

            {/* TARJETA DE MONTOS PROMINENTES (USD & BS A TASA BCV) */}
            <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/90 space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-zinc-500">Total a Liquidar:</span>
                <span className="text-xl sm:text-2xl font-black text-zinc-950 font-mono">
                  ${cartTotals.finalTotalUsd.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-1.5 border-t border-zinc-200">
                <span className="text-[11px] font-bold text-amber-700">Equivalente en Bolívares:</span>
                <span className="text-base sm:text-lg font-black text-amber-800 font-mono">
                  Bs. {cartTotals.finalTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {docType === 'fiscal' && cartTotals.igtfUsd > 0 && (
                <div className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200 flex items-center gap-1">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>Incluye IGTF del 3% (${cartTotals.igtfUsd.toFixed(2)}) por pago en divisas en efectivo.</span>
                </div>
              )}
            </div>

            {/* SELECTOR DE MÉTODO DE PAGO */}
            <div>
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                Seleccionar Método de Pago:
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-xs">
                {[
                  { id: 'efectivo_usd', label: 'Efectivo $', icon: DollarSign, color: 'text-emerald-600' },
                  { id: 'pago_movil', label: 'Pago Móvil', icon: Smartphone, color: 'text-blue-600' },
                  { id: 'punto', label: 'Punto de Venta', icon: CreditCard, color: 'text-sky-600' },
                  { id: 'efectivo_bs', label: 'Efectivo Bs', icon: Banknote, color: 'text-amber-600' },
                  { id: 'zelle', label: 'Zelle', icon: CreditCard, color: 'text-purple-600' },
                  { id: 'mixto', label: 'Mixto', icon: Sparkles, color: 'text-indigo-600' }
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(m.id);
                        setRefError('');
                      }}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'border-zinc-950 bg-zinc-950 text-white font-bold shadow-xs'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <Icon size={16} className={isSelected ? 'text-emerald-400' : m.color} />
                      <span className="text-[10px] sm:text-[11px] font-bold leading-tight">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECCIÓN DETALLADA: EFECTIVO USD ($) */}
            {paymentMethod === 'efectivo_usd' && (
              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2.5">
                <span className="text-xs font-bold text-emerald-900 block">
                  Billetes Recibidos en Divisas ($ USD):
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {[5, 10, 20, 50, 100].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCashUsdReceived(String(val))}
                      className={`px-3 py-1.5 rounded-lg border font-mono font-bold text-xs cursor-pointer transition-colors ${
                        Number(cashUsdReceived) === val
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashUsdReceived(String(cartTotals.finalTotalUsd.toFixed(2)))}
                    className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-800 text-[11px] font-bold cursor-pointer"
                  >
                    Exacto
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-zinc-600 font-medium">Monto entregado ($):</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cashUsdReceived}
                    onChange={(e) => setCashUsdReceived(e.target.value)}
                    className="w-28 px-2.5 py-1 rounded-lg border border-zinc-300 font-mono font-bold text-right text-xs bg-white"
                  />
                </div>

                {cartTotals.changeUsd > 0 && (
                  <div className="p-2.5 rounded-lg bg-emerald-100 border border-emerald-300 text-xs text-emerald-950 flex justify-between items-center">
                    <span className="font-bold">Vuelto al Cliente:</span>
                    <div className="text-right">
                      <span className="font-black font-mono text-sm block leading-tight">
                        ${cartTotals.changeUsd.toFixed(2)} USD
                      </span>
                      <span className="font-mono text-[11px] text-emerald-800">
                        (o Bs. {cartTotals.changeBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN DETALLADA: PAGO MÓVIL (BS) */}
            {paymentMethod === 'pago_movil' && (
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Smartphone size={16} className="text-blue-600" />
                    <span className="text-xs font-bold text-blue-900">
                      Monto a Transferir por Pago Móvil:
                    </span>
                  </div>
                  <span className="text-xs font-black font-mono text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                    Bs. {cartTotals.finalTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-700 block mb-1">
                    Banco Receptor (Destino):
                  </label>
                  <BankSelector
                    selectedBank={selectedBank}
                    onSelectBank={setSelectedBank}
                    placeholder="Seleccionar banco receptor..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-700 block mb-1">
                      Teléfono Emisor (Opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="0412-1234567"
                      value={pagoMovilPhone}
                      onChange={(e) => setPagoMovilPhone(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-700 block mb-1 flex items-center justify-between">
                      <span>Últimos 4 Dígitos Ref:</span>
                      <span className={`text-[10px] ${pagoMovilRef.length === 4 ? 'text-emerald-600 font-bold' : 'text-zinc-400'}`}>
                        {pagoMovilRef.length}/4
                      </span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      placeholder="Ej: 5821"
                      value={pagoMovilRef}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setPagoMovilRef(cleaned);
                        if (refError) setRefError('');
                      }}
                      className={`w-full px-3 py-1.5 rounded-xl border font-mono font-black text-center tracking-widest text-sm bg-white ${
                        refError ? 'border-rose-500 bg-rose-50' : (pagoMovilRef.length === 4 ? 'border-emerald-500 bg-emerald-50' : 'border-zinc-300')
                      }`}
                    />
                  </div>
                </div>

                {refError ? (
                  <div className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                    <AlertTriangle size={13} />
                    <span>{refError}</span>
                  </div>
                ) : pagoMovilRef.length === 4 ? (
                  <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>✓ Referencia de 4 dígitos verificada para Cierre de Caja</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-500">
                    Ingresa los últimos 4 dígitos del comprobante para cuadre de caja automático.
                  </p>
                )}
              </div>
            )}

            {/* SECCIÓN DETALLADA: PUNTO DE VENTA */}
            {paymentMethod === 'punto' && (
              <div className="p-4 bg-sky-50/70 rounded-2xl border border-sky-200 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 shadow-xs">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-sky-950 block leading-tight">
                        Monto a Cobrar en el Punto:
                      </span>
                      <span className="text-[11px] text-sky-700 font-medium">
                        Tarjeta de Débito / Crédito
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-black font-mono text-sky-950 bg-sky-100/90 px-3 py-1 rounded-lg block">
                      Bs. {cartTotals.finalTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-sky-700">
                      (${cartTotals.finalTotalUsd.toFixed(2)} USD · Tasa BCV: {Number(bcvRate).toFixed(2)})
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-sky-100 text-xs text-sky-900 flex items-center gap-2.5 shadow-2xs">
                  <CheckCircle2 size={16} className="text-sky-600 shrink-0" />
                  <span>
                    Pasa o inserta la tarjeta en el datáfono físico por el monto en Bolívares. Luego haz clic en el botón inferior para emitir el comprobante.
                  </span>
                </div>
              </div>
            )}

            {/* SECCIÓN DETALLADA: EFECTIVO BS */}
            {paymentMethod === 'efectivo_bs' && (
              <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-900">Total en Bolívares:</span>
                  <span className="text-xs font-black font-mono text-amber-900">
                    Bs. {cartTotals.finalTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-600 font-medium">Efectivo entregado (Bs):</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cashBsReceived}
                    onChange={(e) => setCashBsReceived(e.target.value)}
                    className="w-32 px-2.5 py-1 rounded-lg border border-zinc-300 font-mono font-bold text-right text-xs bg-white"
                  />
                </div>
                {cartTotals.changeBs > 0 && (
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-950 font-bold text-xs flex justify-between">
                    <span>Vuelto:</span>
                    <span className="font-mono">
                      Bs. {cartTotals.changeBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN DETALLADA: ZELLE ($) */}
            {paymentMethod === 'zelle' && (
              <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-900">Monto a Enviar por Zelle:</span>
                  <span className="text-xs font-black font-mono text-purple-900">
                    ${cartTotals.finalTotalUsd.toFixed(2)} USD
                  </span>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-700 block mb-1">
                    Titular o Correo de la Cuenta Zelle:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: maria.gonzalez@gmail.com"
                    value={zelleHolder}
                    onChange={(e) => setZelleHolder(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs bg-white"
                  />
                </div>
              </div>
            )}

            {/* SECCIÓN DETALLADA: PAGO MIXTO */}
            {paymentMethod === 'mixto' && (
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-300 space-y-2 text-xs">
                <span className="font-bold text-zinc-900 block">
                  Dividir Monto entre Varios Métodos:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 block mb-0.5">Efectivo ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={mixedPayments.efectivo_usd}
                      onChange={(e) => setMixedPayments({ ...mixedPayments, efectivo_usd: e.target.value })}
                      className="w-full px-2.5 py-1 rounded-lg border border-zinc-300 font-mono font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-blue-600 block mb-0.5">Pago Móvil (Bs)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={mixedPayments.pago_movil}
                      onChange={(e) => setMixedPayments({ ...mixedPayments, pago_movil: e.target.value })}
                      className="w-full px-2.5 py-1 rounded-lg border border-zinc-300 font-mono font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-sky-600 block mb-0.5">Punto de Venta (Bs)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={mixedPayments.punto}
                      onChange={(e) => setMixedPayments({ ...mixedPayments, punto: e.target.value })}
                      className="w-full px-2.5 py-1 rounded-lg border border-zinc-300 font-mono font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-amber-600 block mb-0.5">Efectivo (Bs)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={mixedPayments.efectivo_bs}
                      onChange={(e) => setMixedPayments({ ...mixedPayments, efectivo_bs: e.target.value })}
                      className="w-full px-2.5 py-1 rounded-lg border border-zinc-300 font-mono font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-purple-600 block mb-0.5">Zelle ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={mixedPayments.zelle}
                      onChange={(e) => setMixedPayments({ ...mixedPayments, zelle: e.target.value })}
                      className="w-full px-2.5 py-1 rounded-lg border border-zinc-300 font-mono font-bold bg-white"
                    />
                  </div>
                </div>

                {/* Si usa Pago Móvil en el mixto */}
                {Number(mixedPayments.pago_movil) > 0 && (
                  <div className="pt-2 border-t border-zinc-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-blue-700 block">Datos Pago Móvil:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <BankSelector
                        selectedBank={selectedBank}
                        onSelectBank={setSelectedBank}
                        placeholder="Banco Pago Móvil..."
                        compact
                        showQuickChips={false}
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="Últimos 4 dígitos ref."
                        value={pagoMovilRef}
                        onChange={(e) => setPagoMovilRef(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="px-2.5 py-1 rounded-lg border border-zinc-300 text-xs font-mono font-bold text-center bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Si usa Punto de Venta en el mixto */}
                {Number(mixedPayments.punto) > 0 && (
                  <div className="pt-2 border-t border-zinc-200 flex items-center justify-between text-xs text-sky-900 bg-sky-50/60 p-2.5 rounded-xl border border-sky-100">
                    <span className="font-bold flex items-center gap-1.5">
                      <CreditCard size={14} className="text-sky-600" />
                      Monto en Punto de Venta:
                    </span>
                    <span className="font-black font-mono text-sky-950">
                      Bs. {Number(mixedPayments.punto).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Balance mixto */}
                <div className={`p-2 rounded-lg font-bold text-center text-xs ${
                  cartTotals.mixedDifferenceUsd > 0.05
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {cartTotals.mixedDifferenceUsd > 0.05
                    ? `Falta: $${cartTotals.mixedDifferenceUsd.toFixed(2)} USD (Bs. ${(cartTotals.mixedDifferenceUsd * bcvRate).toFixed(2)})`
                    : `¡Pago cubierto con éxito! (Vuelto: $${Math.abs(cartTotals.mixedDifferenceUsd).toFixed(2)})`}
                </div>
              </div>
            )}

            {/* BOTÓN PROCESAR FACTURACIÓN FINAL */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                disabled={isSubmittingSale}
                onClick={handleProcessSale}
                className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 ${
                  docType === 'fiscal'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-zinc-950 hover:bg-zinc-800 text-white'
                }`}
              >
                {docType === 'fiscal' ? <Printer size={17} /> : <FileText size={17} />}
                <span>
                  {isSubmittingSale
                    ? 'Procesando Venta...'
                    : docType === 'fiscal'
                      ? (isElectron ? 'Emitir Factura Fiscal (HKA80 / COM2)' : 'Confirmar y Emitir Factura Fiscal SENIAT')
                      : 'Confirmar y Emitir Nota de Entrega'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-full py-2 rounded-xl text-zinc-500 hover:text-zinc-950 text-xs font-semibold cursor-pointer"
              >
                Volver al catálogo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TICKET FINAL IMPRIMIBLE */}
      {isReceiptModalOpen && completedInvoice && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsReceiptModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 text-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center border-b border-zinc-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="font-extrabold text-base">¡Venta Registrada con Éxito!</h3>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">#{completedInvoice.invoiceNumber}</p>
            </div>

            <div className="bg-zinc-50 p-4 rounded-xl border border-dashed border-zinc-300 font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Documento:</span>
                <span className="font-bold">{completedInvoice.docType === 'fiscal' ? 'Factura SENIAT' : 'Nota de Entrega'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Cliente:</span>
                <span className="font-bold truncate max-w-[170px]">{completedInvoice.client?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">RIF / C.I.:</span>
                <span className="font-mono">{completedInvoice.client?.rif}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Total USD:</span>
                <span className="font-bold">${completedInvoice.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Total Bs:</span>
                <span className="font-bold">Bs. {completedInvoice.totalBs.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Método:</span>
                <span className="font-bold text-zinc-950">{formatPaymentMethodLabel(completedInvoice.paymentMethod)}</span>
              </div>
              {completedInvoice.paymentDetails?.pagoMovilBank && (
                <div className="flex justify-between items-center text-[11px] text-zinc-600">
                  <span className="text-zinc-500">Banco PM:</span>
                  <span className="font-semibold truncate max-w-[170px]">{completedInvoice.paymentDetails.pagoMovilBank}</span>
                </div>
              )}
              {completedInvoice.paymentDetails?.pagoMovilRef && (
                <div className="flex justify-between items-center text-[11px] text-zinc-600">
                  <span className="text-zinc-500">Ref PM:</span>
                  <span className="font-mono font-bold text-emerald-700">{completedInvoice.paymentDetails.pagoMovilRef}</span>
                </div>
              )}
              {completedInvoice.paymentDetails?.puntoBank && (
                <div className="flex justify-between items-center text-[11px] text-zinc-600">
                  <span className="text-zinc-500">Terminal Punto:</span>
                  <span className="font-semibold truncate max-w-[170px]">{completedInvoice.paymentDetails.puntoBank}</span>
                </div>
              )}
              {completedInvoice.paymentDetails?.puntoRef && (
                <div className="flex justify-between items-center text-[11px] text-zinc-600">
                  <span className="text-zinc-500">Voucher / Lote:</span>
                  <span className="font-mono">{completedInvoice.paymentDetails.puntoRef}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 text-white font-bold text-xs hover:bg-zinc-800 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer size={15} />
                <span>Imprimir Comprobante</span>
              </button>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="w-full py-2 rounded-xl text-zinc-500 hover:text-zinc-950 text-xs font-semibold cursor-pointer"
              >
                Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
