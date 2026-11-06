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
  UserCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useData } from '../../pos-core/contexts/DataContext';
import KitchenTicketModal from './KitchenTicketModal';
import ClientSelectorModal from './ClientSelectorModal';
import { printIsolatedTicket } from '../../pos-core/utils/printIsolatedTicket';

// Catálogo por defecto oficial de Happy Days con fotos reales de la carpeta /happydays/
const DEFAULT_HAPPY_PRODUCTS = [
  {
    id: 'hd-1',
    name: 'Burger Doble Bacon Deluxe',
    category: 'Hamburguesas',
    priceUsd: 7.50,
    price: 7.50,
    description: 'Doble carne smash, tocineta crujiente, queso fundido y salsa especial',
    sku: 'HBG-010',
    isExempt: false,
    image: '/happydays/platos/plato_wa0020.jpg'
  },
  {
    id: 'hd-2',
    name: 'Cheeseburger Clásica con Tocineta',
    category: 'Hamburguesas',
    priceUsd: 6.00,
    price: 6.00,
    description: 'Carne 150g a la parrilla, tocineta ahumada, queso cheddar y cebolla grillé',
    sku: 'HBG-011',
    isExempt: false,
    image: '/happydays/platos/plato_wa0024.jpg'
  },
  {
    id: 'hd-3',
    name: 'Hamburguesa Monster Happy',
    category: 'Hamburguesas',
    priceUsd: 9.50,
    price: 9.50,
    description: 'Doble carne, huevo frito, tocineta, queso blanco a la plancha y salsa tártara',
    sku: 'HBG-012',
    isExempt: false,
    image: '/happydays/platos/plato_wa0027.jpg'
  },
  {
    id: 'hd-4',
    name: 'Doble Smash Burger Cheddar',
    category: 'Hamburguesas',
    priceUsd: 7.50,
    price: 7.50,
    description: 'Doble carne smash con bordes crujientes y abundante queso cheddar fundido',
    sku: 'HBG-013',
    isExempt: false,
    image: '/happydays/platos/plato_wa0048.jpg'
  },
  {
    id: 'hd-5',
    name: 'Combo Full Burger Happy + Papas + Refresco',
    category: 'Combos',
    priceUsd: 8.50,
    price: 8.50,
    description: 'Hamburguesa clásica, ración de papas fritas rústicas y refresco de lata frío',
    sku: 'CMB-001',
    isExempt: false,
    image: '/happydays/combo_full_burger_happy.jpg'
  },
  {
    id: 'hd-6',
    name: 'Combo Club House Happy 4 Pisos',
    category: 'Combos',
    priceUsd: 9.00,
    price: 9.00,
    description: 'Club house tradicional de 4 cuartos, jamón, queso, pollo, tocineta y papas',
    sku: 'CMB-002',
    isExempt: false,
    image: '/happydays/combo_club_house_happy.jpg'
  },
  {
    id: 'hd-7',
    name: 'Combo 2 Burger Mini Pana',
    category: 'Combos',
    priceUsd: 6.50,
    price: 6.50,
    description: '2 mini burgers con queso cheddar y tocineta acompañadas de papas fritas',
    sku: 'CMB-003',
    isExempt: false,
    image: '/happydays/combo_2_burger_mini.jpg'
  },
  {
    id: 'hd-8',
    name: 'Pepito Mixto Especial 35cm',
    category: 'Pizzas & Pepitos',
    priceUsd: 8.50,
    price: 8.50,
    description: 'Carne y pollo a la plancha, queso blanco rallado, tocineta, maíz y papitas',
    sku: 'PEP-001',
    isExempt: false,
    image: '/happydays/platos/plato_wa0032.jpg'
  },
  {
    id: 'hd-9',
    name: 'Ración de Tequeños Tradicionales (6 uds)',
    category: 'Entradas & Snacks',
    priceUsd: 4.00,
    price: 4.00,
    description: 'Tequeños crocantes de queso semi-duro acompañados de salsa tártara de la casa',
    sku: 'TEQ-001',
    isExempt: false,
    image: '/happydays/platos/plato_wa0038.jpg'
  },
  {
    id: 'hd-10',
    name: 'Papas Rústicas con Queso Cheddar & Bacon',
    category: 'Entradas & Snacks',
    priceUsd: 3.50,
    price: 3.50,
    description: 'Papas fritas con piel, salsa de queso cheddar tibia fundida y lluvia de tocineta',
    sku: 'PAP-001',
    isExempt: false,
    image: '/happydays/platos/plato_wa0042.jpg'
  },
  {
    id: 'hd-11',
    name: 'Coca-Cola Sabor Original Lata 355ml',
    category: 'Bebidas',
    priceUsd: 1.50,
    price: 1.50,
    description: 'Refresco frío de lata',
    sku: 'BEB-001',
    isExempt: false,
    image: '/happydays/drinks/coca_cola_lata_355ml.jpg'
  },
  {
    id: 'hd-12',
    name: 'Malta Polar 355ml Helada',
    category: 'Bebidas',
    priceUsd: 1.50,
    price: 1.50,
    description: 'Malta tradicional bien helada',
    sku: 'BEB-002',
    isExempt: false,
    image: '/happydays/drinks/maltin_polar_botella.jpg'
  },
  {
    id: 'hd-13',
    name: 'Agua Mineral Minalba 600ml',
    category: 'Bebidas',
    priceUsd: 1.00,
    price: 1.00,
    description: 'Agua pura sin gas',
    sku: 'BEB-003',
    isExempt: true,
    image: '/happydays/drinks/agua_mineral_botella.jpg'
  }
];

// Bancos Oficiales de Venezuela (SUDEBAN)
const VENEZUELA_BANKS = [
  { code: '0102', name: '0102 - Banco de Venezuela', logo: '/banks/0102.png' },
  { code: '0134', name: '0134 - Banesco', logo: '/banks/0134.png' },
  { code: '0105', name: '0105 - Banco Mercantil', logo: '/banks/0105.png' },
  { code: '0108', name: '0108 - Banco Provincial (BBVA)', logo: '/banks/0108.png' },
  { code: '0172', name: '0172 - Bancamiga', logo: '/banks/0172.png' },
  { code: '0114', name: '0114 - Bancaribe', logo: '/banks/0114.png' },
  { code: '0174', name: '0174 - Banplus', logo: '/banks/0174.png' },
  { code: '0163', name: '0163 - Banco del Tesoro', logo: '/banks/0163.png' },
  { code: '0138', name: '0138 - Banco Plaza', logo: '/banks/0138.png' }
];

export default function WebPosView({ tenant, snapshot, onSaleComplete }) {
  const data = useData();
  const isElectron = Boolean(window?.electronAPI?.fiscal);

  // Tasa de cambio BCV oficial
  const currentRate = Number(data?.exchangeRate) || Number(snapshot?.exchange_rate || tenant?.exchange_rate) || 876.80;
  const [bcvRate, setBcvRate] = useState(currentRate);

  useEffect(() => {
    if (data?.exchangeRate) {
      setBcvRate(Number(data.exchangeRate));
    }
  }, [data?.exchangeRate]);

  // Catálogo de Productos
  const products = useMemo(() => {
    if (data?.products && data.products.length > 0) {
      return data.products.map((p, idx) => ({
        ...p,
        image: p.image || DEFAULT_HAPPY_PRODUCTS[idx % DEFAULT_HAPPY_PRODUCTS.length]?.image
      }));
    }
    const custom = snapshot?.products;
    if (Array.isArray(custom) && custom.length > 0) return custom;
    return DEFAULT_HAPPY_PRODUCTS;
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

  // Carrito de compras
  const [cart, setCart] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
  const [selectedBank, setSelectedBank] = useState(VENEZUELA_BANKS[0].name);
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

  // Totales del Carrito
  const cartTotals = useMemo(() => {
    let subtotalUsd = 0;
    let baseImponibleUsd = 0;
    let exentoUsd = 0;

    cart.forEach((item) => {
      const price = Number(item.priceUsd || item.price || 0);
      const lineTotal = price * item.qty;
      subtotalUsd += lineTotal;
      if (item.isExempt) {
        exentoUsd += lineTotal;
      } else {
        baseImponibleUsd += lineTotal;
      }
    });

    const iva16Usd = baseImponibleUsd * 0.16;
    const baseTotalUsd = subtotalUsd + iva16Usd;

    // Cálculo del IGTF (3% sobre divisas en efectivo para facturas fiscales SENIAT)
    let igtfUsd = 0;
    if (docType === 'fiscal') {
      if (paymentMethod === 'efectivo_usd' || paymentMethod === 'zelle') {
        igtfUsd = baseTotalUsd * 0.03;
      } else if (paymentMethod === 'mixto') {
        const cashDivisas = (Number(mixedPayments.efectivo_usd) || 0) + (Number(mixedPayments.zelle) || 0);
        const cashPart = Math.min(cashDivisas, baseTotalUsd);
        igtfUsd = cashPart * 0.03;
      }
    }

    const finalTotalUsd = baseTotalUsd + igtfUsd;
    const finalTotalBs = finalTotalUsd * bcvRate;

    // Vueltos y saldos para Efectivo USD
    const cashUsdNum = Number(cashUsdReceived) || 0;
    const changeUsd = paymentMethod === 'efectivo_usd' ? Math.max(0, cashUsdNum - finalTotalUsd) : 0;
    const changeBsFromUsd = changeUsd * bcvRate;

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
      subtotalUsd,
      subtotalBs: subtotalUsd * bcvRate,
      baseImponibleUsd,
      baseImponibleBs: baseImponibleUsd * bcvRate,
      exentoUsd,
      exentoBs: exentoUsd * bcvRate,
      iva16Usd,
      iva16Bs: iva16Usd * bcvRate,
      igtfUsd,
      igtfBs: igtfUsd * bcvRate,
      finalTotalUsd,
      finalTotalBs,
      changeUsd,
      changeBs: changeBsFromUsd || changeBs,
      totalPaidMixedUsd,
      mixedDifferenceUsd,
      totalQty: cart.reduce((acc, i) => acc + i.qty, 0)
    };
  }, [cart, bcvRate, docType, paymentMethod, cashUsdReceived, cashBsReceived, mixedPayments]);

  // Manejo del carrito: SELECCIÓN FLUÍDA SIN ABRIR DRAWER NI MODALES INVASIVOS
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
    const roundedCash = Math.ceil(cartTotals.finalTotalUsd / 5) * 5 || 5;
    setCashUsdReceived(String(roundedCash));
    setCashBsReceived(String(Math.ceil(cartTotals.finalTotalBs)));
    setIsPaymentModalOpen(true);
  };

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
        return;
      }
    }

    // Validación de Pago Mixto
    if (paymentMethod === 'mixto' && cartTotals.mixedDifferenceUsd > 0.05) {
      alert(`Falta por cubrir $${cartTotals.mixedDifferenceUsd.toFixed(2)} USD para completar el pago.`);
      return;
    }

    setIsSubmittingSale(true);

    try {
      const now = new Date();
      const invoiceNumber = (docType === 'fiscal' ? 'FACT-' : 'NOTA-') + String(Math.floor(100000 + Math.random() * 900000));
      const fiscalSerial = tenant?.fiscal_serial || 'Z4A1234567';

      const invoiceData = {
        id: invoiceNumber,
        invoiceNumber,
        docType,
        isFiscalInvoice: docType === 'fiscal',
        date: now.toISOString(),
        client: {
          name: activeClient.name || 'Consumidor Final',
          rif: activeClient.rif || activeClient.cedula || 'V-00000000-0',
          address: activeClient.address || 'Mostrador / Local'
        },
        items: cart.map((i) => ({
          id: i.id,
          name: i.name,
          qty: i.qty,
          priceUsd: Number(i.priceUsd || i.price || 0),
          priceBs: Number(i.priceUsd || i.price || 0) * bcvRate,
          isExempt: Boolean(i.isExempt),
          totalUsd: Number(i.priceUsd || i.price || 0) * i.qty,
          totalBs: Number(i.priceUsd || i.price || 0) * i.qty * bcvRate
        })),
        subtotalUsd: cartTotals.subtotalUsd,
        subtotalBs: cartTotals.subtotalBs,
        baseImponibleUsd: cartTotals.baseImponibleUsd,
        baseImponibleBs: cartTotals.baseImponibleBs,
        iva16Usd: cartTotals.iva16Usd,
        iva16Bs: cartTotals.iva16Bs,
        igtfUsd: cartTotals.igtfUsd,
        igtfBs: cartTotals.igtfBs,
        total: cartTotals.finalTotalUsd,
        totalUsd: cartTotals.finalTotalUsd,
        totalBs: cartTotals.finalTotalBs,
        exchangeRate: bcvRate,
        paymentMethod,
        paymentDetails: {
          cashUsd: paymentMethod === 'efectivo_usd' ? Number(cashUsdReceived) : Number(mixedPayments.efectivo_usd || 0),
          pagoMovilBs: paymentMethod === 'pago_movil' ? cartTotals.finalTotalBs : Number(mixedPayments.pago_movil || 0),
          pagoMovilBank: (paymentMethod === 'pago_movil' || paymentMethod === 'mixto') ? selectedBank : null,
          pagoMovilRef: (paymentMethod === 'pago_movil' || paymentMethod === 'mixto') ? (pagoMovilRef || '').trim() : null,
          pagoMovilPhone: (paymentMethod === 'pago_movil' || paymentMethod === 'mixto') ? pagoMovilPhone : null,
          puntoRef: (paymentMethod === 'punto' || paymentMethod === 'mixto') ? puntoRef : null,
          zelleHolder: (paymentMethod === 'zelle' || paymentMethod === 'mixto') ? zelleHolder : null,
          changeUsd: cartTotals.changeUsd,
          changeBs: cartTotals.changeBs
        },
        fiscalSerial,
        status: 'paid'
      };

      // 1. SI ESTAMOS EN ELECTRON DESKTOP Y ES FACTURA FISCAL SENIAT: Mandar comando a la máquina fiscal física HKA80
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

      // 2. Registrar en el DataContext local (actualiza Dashboard, Libros SENIAT y Cierre de Caja al instante)
      let savedInvoice = invoiceData;
      if (data?.createInvoice) {
        savedInvoice = data.createInvoice(invoiceData) || invoiceData;
      } else if (data?.addInvoice) {
        savedInvoice = data.addInvoice(invoiceData) || invoiceData;
      }

      // 3. Sincronizar snapshot con Supabase si hay tenant activo
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

      setCompletedInvoice(savedInvoice);
      setIsPaymentModalOpen(false);
            setIsReceiptModalOpen(true);
      clearCart();
    } catch (err) {
      console.error('Error registrando venta:', err);
      alert('Error registrando factura: ' + err.message);
    } finally {
      setIsSubmittingSale(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-hidden relative">
      
      {/* TOOLBAR SUPERIOR DEL PUNTO DE VENTA (LIMPIO: SOLO BUSCADOR Y ACCESO A COMANDA) */}
      <div className="bg-white border-b border-zinc-200/80 px-4 py-2.5 shrink-0 flex items-center justify-between gap-3">
        {/* BUSCADOR DE PRODUCTOS */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar plato, combo o bebida en el catálogo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400 bg-zinc-50/50"
          />
        </div>

        {/* ACCESO DISCRETO AL DRAWER DE COMANDA EN EL TOPBAR */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            cart.length > 0
              ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
          }`}
          title="Ver comanda completa"
        >
          <ShoppingCart size={15} className={cart.length > 0 ? 'text-emerald-400' : 'text-zinc-500'} />
          <span className="hidden sm:inline">Comanda</span>
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

      {/* FILTRO DE CATEGORÍAS TIPO CHIPS */}
      <div className="bg-white px-4 py-2 border-b border-zinc-200/80 flex items-center gap-1.5 overflow-x-auto shrink-0">
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

      {/* CATÁLOGO VISUAL DE PRODUCTOS (FOTOS REALES) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {filteredProducts.map((p) => {
            const price = Number(p.priceUsd || p.price || 0);
            const priceBs = price * bcvRate;
            const inCart = cart.find((i) => i.id === p.id);

            return (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                className={`group relative rounded-2xl border bg-white overflow-hidden transition-all duration-150 cursor-pointer hover:shadow-md flex flex-col justify-between ${
                  inCart ? 'border-zinc-950 ring-2 ring-zinc-950/20 shadow-xs' : 'border-zinc-200/80 hover:border-zinc-300'
                }`}
              >
                {/* FOTOGRAFÍA DEL PRODUCTO CON PROPORCIÓN 1:1 */}
                <div className="aspect-square w-full bg-zinc-100 overflow-hidden relative">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-300">
                      <Utensils size={32} />
                    </div>
                  )}

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

                  {/* INDICADOR DE CANTIDAD EN CARRITO (SE SUMA EN SILENCIO SIN MOLESTAR) */}
                  {inCart && (
                    <div className="absolute top-2 right-2 min-w-[24px] h-6 px-1.5 rounded-full bg-zinc-950 text-white font-bold text-xs flex items-center justify-center shadow-md animate-in zoom-in-75 duration-100">
                      {inCart.qty}
                    </div>
                  )}
                </div>

                {/* DETALLE DEL PRODUCTO */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h3 className="font-bold text-xs text-zinc-950 line-clamp-2 leading-snug group-hover:text-zinc-800">
                      {p.name}
                    </h3>
                    {p.description && (
                      <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{p.description}</p>
                    )}
                  </div>

                  <div className="pt-1 border-t border-zinc-100 flex items-baseline justify-between">
                    <div>
                      <span className="text-sm font-extrabold text-zinc-950 font-mono">
                        ${price.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono block leading-tight">
                        Bs. {priceBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="w-6 h-6 rounded-lg bg-zinc-100 group-hover:bg-zinc-950 group-hover:text-white text-zinc-600 flex items-center justify-center transition-colors">
                      <Plus size={14} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COMPONENTE PRINCIPAL UNIFICADO INFERIOR (EL QUE GUSTÓ AL USUARIO: SIN DUPLICADOS) */}
      {cart.length > 0 && !isDrawerOpen && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-zinc-950/95 backdrop-blur-md text-white p-2 rounded-2xl shadow-2xl border border-zinc-800 animate-in slide-in-from-bottom duration-200 max-w-xl w-[92%] sm:w-auto justify-between sm:justify-start">
          {/* ZONA 1: RESUMEN DE ORDEN (CLIC ABRE EL DRAWER PARA VER LÍNEAS) */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold cursor-pointer transition-colors"
            title="Ver comanda y modificar cantidades"
          >
            <ShoppingCart size={15} className="text-emerald-400" />
            <span className="font-bold">{cartTotals.totalQty} ítems</span>
            <span className="font-mono text-emerald-300 font-bold border-l border-zinc-700 pl-2">
              ${cartTotals.finalTotalUsd.toFixed(2)}
            </span>
          </button>

          {/* ZONA 2: COMANDA DE COCINA */}
          <button
            type="button"
            onClick={() => setIsKitchenModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 cursor-pointer transition-colors"
            title="Mandar ticket a cocina"
          >
            <ChefHat size={15} />
            <span>Comanda</span>
          </button>

          {/* ZONA 3: COBRAR Y FACTURAR */}
          <button
            type="button"
            onClick={handleOpenPayment}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black cursor-pointer shadow-md transition-all active:scale-95"
            title="Cobrar orden y emitir factura"
          >
            <CreditCard size={15} />
            <span>Cobrar</span>
          </button>
        </div>
      )}

      {/* DRAWER DESLIZABLE (SLIDE-OVER CART PANEL - SE ABRE SOLO CUANDO EL USUARIO LO PIDE) */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-200"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 z-50 text-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABECERA DEL DRAWER (FUSIONADA CON LA BARRA SUPERIOR OSCURA NOTION) */}
            <div
              className="p-3.5 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900 text-white app-drag-region"
              style={Boolean(window?.electronAPI) ? { paddingRight: '144px' } : undefined}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white">
                  <ShoppingCart size={16} />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-white">Comanda & Carrito</h2>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    {orderTable} · {cartTotals.totalQty} ítems
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 app-no-drag">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 text-xs font-semibold cursor-pointer"
                    title="Vaciar comanda"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs cursor-pointer"
                  title="Cerrar comanda"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* DATOS DEL CLIENTE FISCAL (ACCESO CON 1 CLIC AL BUSCADOR / REGISTRO) */}
            <div className="p-3 bg-zinc-50 border-b border-zinc-200/80 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <User size={14} className="text-zinc-500 shrink-0" />
                <div className="truncate">
                  <span className="font-bold text-zinc-900 block truncate leading-tight">{activeClient.name}</span>
                  <span className="font-mono text-zinc-500 text-[10px]">{activeClient.rif}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClientModalOpen(true)}
                className="px-2.5 py-1 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 text-[11px] font-bold text-zinc-800 cursor-pointer shrink-0 transition-colors"
              >
                Cambiar / RIF
              </button>
            </div>

            {/* LISTADO DE PRODUCTOS EN COMANDA */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-zinc-100">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                  <ShoppingCart size={40} className="mb-2 text-zinc-300 stroke-1" />
                  <p className="text-sm font-semibold text-zinc-600">Comanda Vacía</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Haz clic sobre cualquier plato o bebida para agregarlo a la orden.
                  </p>
                </div>
              ) : (
                cart.map((item) => {
                  const itemPrice = Number(item.priceUsd || item.price || 0);
                  const lineTotalUsd = itemPrice * item.qty;
                  const lineTotalBs = lineTotalUsd * bcvRate;

                  return (
                    <div key={item.id} className="pt-2.5 first:pt-0 flex items-start gap-3">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-11 h-11 rounded-xl object-cover shrink-0 border border-zinc-200"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-xs text-zinc-950 truncate leading-snug">
                            {item.name}
                          </h4>
                          <span className="font-bold text-xs font-mono text-zinc-950 shrink-0 ml-2">
                            ${lineTotalUsd.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono mt-1">
                          <span>${itemPrice.toFixed(2)} c/u</span>
                          <span>Bs. {lineTotalBs.toFixed(2)}</span>
                        </div>

                        {/* SELECTOR DE CANTIDAD */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center border border-zinc-200 rounded-lg bg-zinc-50">
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, -1)}
                              className="p-1 hover:bg-zinc-200 text-zinc-600 rounded-l-lg transition-colors cursor-pointer"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="px-2.5 text-xs font-bold font-mono text-zinc-950">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, 1)}
                              className="p-1 hover:bg-zinc-200 text-zinc-600 rounded-r-lg transition-colors cursor-pointer"
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="text-zinc-400 hover:text-rose-600 text-[11px] transition-colors cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* DESGLOSE FISCAL Y LOS 2 BOTONES PRINCIPALES DENTRO DEL DRAWER */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-zinc-200/80 bg-zinc-50/70 shrink-0 space-y-3">
                {/* DESGLOSE TRIBUTARIO */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-zinc-500">
                    <span>Base Gravada (16%):</span>
                    <span className="font-mono">${cartTotals.baseImponibleUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>IVA Fiscal (16%):</span>
                    <span className="font-mono">+${cartTotals.iva16Usd.toFixed(2)}</span>
                  </div>
                  {cartTotals.exentoUsd > 0 && (
                    <div className="flex justify-between text-zinc-500">
                      <span>Ventas Exentas:</span>
                      <span className="font-mono">${cartTotals.exentoUsd.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-zinc-200 flex justify-between items-baseline">
                    <span className="font-extrabold text-sm text-zinc-950">Total Orden:</span>
                    <div className="text-right">
                      <span className="text-lg font-black text-zinc-950 font-mono block">
                        ${cartTotals.finalTotalUsd.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        Bs. {cartTotals.finalTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ACCIONES: COCINA O COBRO */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsKitchenModalOpen(true)}
                    className="w-full py-2 px-3 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                  >
                    <ChefHat size={15} className="text-amber-600" />
                    <span>Mandar Comanda a Cocina</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenPayment}
                    className="w-full py-3 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
                  >
                    <CreditCard size={16} className="text-emerald-400" />
                    <span>Cobrar Comanda (${cartTotals.finalTotalUsd.toFixed(2)})</span>
                  </button>
                </div>
              </div>
            )}
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
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 text-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABECERA CON DOCUMENTO Y CIERRE */}
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-black text-base sm:text-lg tracking-tight text-zinc-950">
                  {docType === 'fiscal' ? 'Emitir Factura Fiscal SENIAT' : 'Emitir Nota de Entrega'}
                </h3>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  Liquidación de Comanda · {cartTotals.totalQty} platos
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

            {/* SECCIÓN CLIENTE / RECEPTOR FISCAL (CON BOTÓN PARA BUSCAR O REGISTRAR RIF) */}
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

            {/* SELECTOR DE MÉTODO DE PAGO VENEZOLANO */}
            <div>
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                Seleccionar Método de Pago:
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-xs">
                {[
                  { id: 'efectivo_usd', label: 'Efectivo $', icon: DollarSign, color: 'text-emerald-600' },
                  { id: 'pago_movil', label: 'Pago Móvil', icon: Smartphone, color: 'text-blue-600' },
                  { id: 'punto', label: 'Punto POS', icon: CreditCard, color: 'text-sky-600' },
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
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
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
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-900">
                    Monto Oficial a Transferir en Bolívares:
                  </span>
                  <span className="text-xs font-black font-mono text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                    Bs. {cartTotals.finalTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-700 block mb-1">
                    Banco Receptor:
                  </label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-semibold bg-white cursor-pointer"
                  >
                    {VENEZUELA_BANKS.map((b) => (
                      <option key={b.code} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-700 block mb-1">
                      Teléfono Emisor:
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

            {/* SECCIÓN DETALLADA: PUNTO DE VENTA (BS) */}
            {paymentMethod === 'punto' && (
              <div className="p-3.5 bg-sky-50/50 rounded-xl border border-sky-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-sky-900">Monto a Pasar por Punto:</span>
                  <span className="text-xs font-black font-mono text-sky-900 bg-sky-100 px-2 py-0.5 rounded">
                    Bs. {cartTotals.finalTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-700 block mb-1">
                    Número de Lote / Aprobación (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Lote 045 - Ref 8912"
                    value={puntoRef}
                    onChange={(e) => setPuntoRef(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs bg-white"
                  />
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
                    <label className="text-[10px] font-bold text-sky-600 block mb-0.5">Punto POS (Bs)</label>
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

                {/* Si usa Pago Móvil en el mixto, pedir los 4 dígitos */}
                {Number(mixedPayments.pago_movil) > 0 && (
                  <div className="pt-2 border-t border-zinc-200 grid grid-cols-2 gap-2">
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="px-2 py-1 rounded-lg border border-zinc-300 text-[11px] bg-white font-semibold"
                    >
                      {VENEZUELA_BANKS.map((b) => (
                        <option key={b.code} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="4 dígitos ref."
                      value={pagoMovilRef}
                      onChange={(e) => setPagoMovilRef(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="px-2 py-1 rounded-lg border border-zinc-300 text-[11px] font-mono font-bold text-center bg-white"
                    />
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
              <div className="flex justify-between">
                <span className="text-zinc-500">Método:</span>
                <span className="capitalize">{completedInvoice.paymentMethod}</span>
              </div>
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
