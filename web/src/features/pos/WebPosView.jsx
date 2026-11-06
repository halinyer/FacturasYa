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
  Share2,
  Sparkles,
  Store,
  Layers,
  ChefHat,
  ShieldCheck,
  ChevronRight,
  Filter,
  User,
  Utensils
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useData } from '../../pos-core/contexts/DataContext';
import KitchenTicketModal from './KitchenTicketModal';
import FiscalInvoiceModal from './FiscalInvoiceModal';

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
    image: '/happydays/drinks/cocacola_lata_355ml.jpg'
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
    image: '/happydays/drinks/malta_botella_355ml.jpg'
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
    image: '/happydays/drinks/agua_mineral_355ml.jpg'
  }
];

const VENEZUELA_BANKS = [
  { code: '0102', name: '0102 - Banco de Venezuela', logo: '/banks/0102.png' },
  { code: '0108', name: '0108 - Banco Provincial (BBVA)', logo: '/banks/0108.png' },
  { code: '0134', name: '0134 - Banesco', logo: '/banks/0134.png' },
  { code: '0105', name: '0105 - Banco Mercantil', logo: '/banks/0105.png' },
  { code: '0172', name: '0172 - Bancamiga', logo: '/banks/0172.png' },
  { code: '0114', name: '0114 - Bancaribe', logo: '/banks/0114.png' },
  { code: '0174', name: '0174 - Banplus', logo: '/banks/0174.png' }
];

export default function WebPosView({ tenant, snapshot, onSaleComplete }) {
  const data = useData();

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

  // Cliente y mesa
  const [clientType, setClientType] = useState('final'); // 'final' | 'custom'
  const [clientName, setClientName] = useState('Consumidor Final');
  const [clientRif, setClientRif] = useState('V-00000000-0');
  const [orderTable, setOrderTable] = useState('Barra / Mostrador');
  const [orderNotes, setOrderNotes] = useState('');

  // Modales
  const [isKitchenModalOpen, setIsKitchenModalOpen] = useState(false);
  const [isFiscalModalOpen, setIsFiscalModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Estados de cobro
  const [paymentMethod, setPaymentMethod] = useState('mixto'); // 'mixto' | 'usd_cash' | 'pago_movil' | 'punto'
  const [cashUsdReceived, setCashUsdReceived] = useState('');
  const [selectedBank, setSelectedBank] = useState(VENEZUELA_BANKS[0].name);
  const [pagoMovilPhone, setPagoMovilPhone] = useState('');
  const [pagoMovilRef, setPagoMovilRef] = useState('');
  const [applyIgtf, setApplyIgtf] = useState(true);
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

    // Cálculo del IGTF (3% sobre divisas en efectivo)
    let igtfUsd = 0;
    if (paymentMethod === 'usd_cash') {
      igtfUsd = applyIgtf ? baseTotalUsd * 0.03 : 0;
    } else if (paymentMethod === 'mixto') {
      const cashPart = Math.min(Number(cashUsdReceived) || 0, baseTotalUsd);
      igtfUsd = applyIgtf ? cashPart * 0.03 : 0;
    }

    const finalTotalUsd = baseTotalUsd + igtfUsd;
    const finalTotalBs = finalTotalUsd * bcvRate;

    // Cobro mixto
    const appliedCashUsd = Math.min(Number(cashUsdReceived) || 0, finalTotalUsd);
    const remainingUsd = Math.max(0, finalTotalUsd - appliedCashUsd);
    const remainingBs = remainingUsd * bcvRate;
    const changeUsd = Math.max(0, (Number(cashUsdReceived) || 0) - finalTotalUsd);
    const changeBs = changeUsd * bcvRate;

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
      appliedCashUsd,
      remainingUsd,
      remainingBs,
      changeUsd,
      changeBs,
      totalQty: cart.reduce((acc, i) => acc + i.qty, 0)
    };
  }, [cart, bcvRate, paymentMethod, cashUsdReceived, applyIgtf]);

  // Manejo del carrito
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...product, qty: 1 }];
    });
    // Abrir automáticamente el drawer si estaba cerrado
    setIsDrawerOpen(true);
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

  // Pre-cargar cobro
  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    const defaultCash = Math.floor(cartTotals.finalTotalUsd / 5) * 5 || 5;
    setCashUsdReceived(String(Math.min(defaultCash, Math.floor(cartTotals.finalTotalUsd))));
    setIsPaymentModalOpen(true);
  };

  // Procesar Facturación y Guardar Venta
  const handleProcessSale = async (e) => {
    if (e) e.preventDefault();
    setIsSubmittingSale(true);

    try {
      const now = new Date();
      const invoiceNumber = 'FACT-' + String(Math.floor(100000 + Math.random() * 900000));
      const fiscalSerial = tenant?.fiscal_serial || 'Z4A1234567';

      const invoiceData = {
        id: invoiceNumber,
        invoiceNumber,
        date: now.toISOString(),
        client: {
          name: clientType === 'final' ? 'Consumidor Final' : clientName,
          rif: clientType === 'final' ? 'V-00000000-0' : clientRif
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
          cashUsd: cartTotals.appliedCashUsd,
          pagoMovilBs: paymentMethod === 'pago_movil' ? cartTotals.finalTotalBs : cartTotals.remainingBs,
          pagoMovilBank: selectedBank,
          pagoMovilRef: pagoMovilRef,
          changeUsd: cartTotals.changeUsd,
          changeBs: cartTotals.changeBs
        },
        fiscalSerial,
        status: 'completed'
      };

      // Registrar en el DataContext local (actualiza Dashboard, Libros SENIAT y Cierre de Caja al instante)
      if (data?.addInvoice) {
        data.addInvoice(invoiceData);
      }

      // Sincronizar snapshot con Supabase si hay tenant activo
      if (tenant?.id) {
        const existingInvoices = Array.isArray(snapshot?.invoices) ? snapshot.invoices : [];
        const updatedInvoices = [invoiceData, ...existingInvoices];

        await supabase
          .from('tenant_snapshots')
          .upsert({
            tenant_id: tenant.id,
            invoices: updatedInvoices,
            exchange_rate: bcvRate,
            updated_at: new Date().toISOString()
          });

        if (onSaleComplete) {
          onSaleComplete(invoiceData);
        }
      }

      setCompletedInvoice(invoiceData);
      setIsPaymentModalOpen(false);
      setIsFiscalModalOpen(false);
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
      
      {/* TOOLBAR SUPERIOR DEL PUNTO DE VENTA */}
      <div className="bg-white border-b border-zinc-200/80 px-4 py-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* BUSCADOR Y ATRIBUTOS */}
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar plato, combo o bebida..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400 bg-zinc-50/50"
            />
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-600 bg-zinc-100 px-3 py-1.5 rounded-xl border border-zinc-200">
            <span className="text-zinc-400 font-medium">Tasa BCV:</span>
            <span className="font-bold text-zinc-950 font-mono">Bs. {bcvRate.toFixed(2)}</span>
          </div>
        </div>

        {/* BOTÓN FLOTANTE / ACCESO DIRECTO AL DRAWER DE COMANDA */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs transition-all flex items-center justify-between sm:justify-start gap-2.5 cursor-pointer shadow-xs active:scale-98"
        >
          <div className="flex items-center gap-1.5">
            <ShoppingCart size={15} className="text-emerald-400" />
            <span>Ver Comanda</span>
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-emerald-300 font-mono text-[11px] font-bold">
              {cartTotals.totalQty}
            </span>
          </div>
          <span className="font-mono text-zinc-300 text-[11px] border-l border-zinc-700 pl-2">
            ${cartTotals.finalTotalUsd.toFixed(2)}
          </span>
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
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
                  inCart ? 'border-zinc-950 ring-1 ring-zinc-950' : 'border-zinc-200/80 hover:border-zinc-300'
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

                  {/* INDICADOR DE CANTIDAD EN CARRITO */}
                  {inCart && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-zinc-950 text-white font-bold text-xs flex items-center justify-center shadow-md">
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

      {/* DRAWER DESLIZABLE (SLIDE-OVER CART PANEL) */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-200"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 z-50 text-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABECERA DEL DRAWER */}
            <div className="p-4 border-b border-zinc-200/80 flex items-center justify-between shrink-0 bg-zinc-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-zinc-900 text-white">
                  <ShoppingCart size={16} />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-zinc-950">Comanda & Carrito</h2>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    {orderTable} · {cartTotals.totalQty} ítems
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                    title="Vaciar comanda"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 text-xs cursor-pointer"
                  title="Cerrar comanda"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* DATOS DEL CLIENTE / CONSUMIDOR FINAL */}
            <div className="p-3 bg-zinc-50 border-b border-zinc-200/80 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2">
                <User size={14} className="text-zinc-500" />
                <span className="font-semibold text-zinc-800">{clientName}</span>
                <span className="font-mono text-zinc-400 text-[11px]">({clientRif})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const custom = prompt('Ingrese Nombre y RIF del cliente (ej. Juan Perez, V-12345678):');
                  if (custom) {
                    const parts = custom.split(',');
                    setClientName(parts[0]?.trim() || 'Cliente Especial');
                    setClientRif(parts[1]?.trim() || 'V-00000000');
                    setClientType('custom');
                  }
                }}
                className="text-[11px] text-indigo-600 hover:underline font-semibold cursor-pointer"
              >
                Cambiar
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

            {/* DESGLOSE FISCAL Y BOTONES DE ACCIÓN (COCINA / SENIAT / COBRAR) */}
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

                {/* LOS 3 BOTONES ENTERPRISE REQUERIDOS: COMANDAS, FISCAL SENIAT Y COBRAR */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    {/* BOTÓN 1: COMANDA DE COCINA */}
                    <button
                      type="button"
                      onClick={() => setIsKitchenModalOpen(true)}
                      className="py-2.5 px-3 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                    >
                      <ChefHat size={15} className="text-amber-600" />
                      <span>Comanda Cocina</span>
                    </button>

                    {/* BOTÓN 2: IMPRESORA FISCAL SENIAT */}
                    <button
                      type="button"
                      onClick={() => setIsFiscalModalOpen(true)}
                      className="py-2.5 px-3 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                    >
                      <Printer size={15} className="text-emerald-600" />
                      <span>Factura SENIAT</span>
                    </button>
                  </div>

                  {/* BOTÓN 3: COBRAR Y EMITIR FACTURA (PAGO MULTIMONEDA) */}
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

      {/* MODAL DE COMANDA DE COCINA */}
      <KitchenTicketModal
        isOpen={isKitchenModalOpen}
        onClose={() => setIsKitchenModalOpen(false)}
        cart={cart}
        tableName={orderTable}
        orderNotes={orderNotes}
      />

      {/* MODAL DE FACTURA FISCAL SENIAT */}
      <FiscalInvoiceModal
        isOpen={isFiscalModalOpen}
        onClose={() => setIsFiscalModalOpen(false)}
        cartTotals={cartTotals}
        bcvRate={bcvRate}
        client={{ name: clientName, rif: clientRif }}
        fiscalSerial={tenant?.fiscal_serial || 'Z4A1234567'}
        onConfirmFiscalPrint={async () => {
          await handleProcessSale();
        }}
      />

      {/* MODAL DE COBRO MULTIMONEDA VENEZOLANO */}
      {isPaymentModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsPaymentModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 text-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-extrabold text-lg tracking-tight">Cobro & Facturación</h3>
                <p className="text-xs text-zinc-500 font-mono">
                  Total a pagar: ${cartTotals.finalTotalUsd.toFixed(2)} (Bs. {cartTotals.finalTotalBs.toFixed(2)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* SELECTOR DE MÉTODO DE PAGO */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              {[
                { id: 'mixto', label: 'Mixto', icon: Sparkles },
                { id: 'usd_cash', label: 'Efectivo $', icon: DollarSign },
                { id: 'pago_movil', label: 'Pago Móvil', icon: Smartphone },
                { id: 'punto', label: 'Punto POS', icon: CreditCard }
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === m.id
                        ? 'border-zinc-950 bg-zinc-950 text-white font-bold shadow-xs'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-[11px]">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* DENOMINACIONES RÁPIDAS EN DÓLARES */}
            {(paymentMethod === 'usd_cash' || paymentMethod === 'mixto') && (
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                <span className="text-[11px] font-bold text-zinc-700 block">
                  Billetes en Divisas Recibidos ($):
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {[5, 10, 20, 50, 100].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCashUsdReceived(String(val))}
                      className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-900 font-bold font-mono text-xs cursor-pointer"
                    >
                      ${val}
                    </button>
                  ))}
                </div>
                <div className="pt-2 flex justify-between text-xs">
                  <span className="text-zinc-500">Monto ingresado:</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cashUsdReceived}
                    onChange={(e) => setCashUsdReceived(e.target.value)}
                    className="w-24 px-2 py-1 rounded-lg border border-zinc-300 font-mono font-bold text-right text-xs"
                  />
                </div>
              </div>
            )}

            {/* SELECTOR DE BANCO PARA PAGO MÓVIL */}
            {(paymentMethod === 'pago_movil' || paymentMethod === 'mixto') && (
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2 text-xs">
                <span className="text-[11px] font-bold text-zinc-700 block">
                  Datos de Pago Móvil (Bs. {cartTotals.remainingBs.toFixed(2)}):
                </span>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-semibold bg-white"
                >
                  {VENEZUELA_BANKS.map((b) => (
                    <option key={b.code} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Teléfono emisor"
                    value={pagoMovilPhone}
                    onChange={(e) => setPagoMovilPhone(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-300 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Últimos 6 dígitos ref."
                    value={pagoMovilRef}
                    onChange={(e) => setPagoMovilRef(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            )}

            {/* BOTÓN PROCESAR FACTURACIÓN FINAL */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                disabled={isSubmittingSale}
                onClick={handleProcessSale}
                className="w-full py-3 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
              >
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>{isSubmittingSale ? 'Registrando Factura...' : 'Completar Cobro y Emitir Factura'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-full py-2 rounded-xl text-zinc-500 hover:text-zinc-950 text-xs font-semibold cursor-pointer"
              >
                Volver a la orden
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
              <h3 className="font-extrabold text-base">¡Factura Exitosa!</h3>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">#{completedInvoice.invoiceNumber}</p>
            </div>

            <div className="bg-zinc-50 p-4 rounded-xl border border-dashed border-zinc-300 font-mono text-xs space-y-2">
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
