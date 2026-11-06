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
  QrCode,
  Tag,
  Receipt,
  AlertCircle,
  Share2,
  Sparkles,
  Store,
  Layers
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Catálogo por defecto optimizado para restaurantes, cafeterías y comida rápida en Venezuela
const DEFAULT_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Hamburguesa Smash Doble Bacon',
    category: 'Hamburguesas',
    priceUsd: 7.50,
    description: 'Doble carne smash, queso cheddar americano fundido, tocineta crujiente y salsa especial',
    sku: 'HBG-001',
    isExempt: false
  },
  {
    id: 'prod-2',
    name: 'Cheeseburger Clásica',
    category: 'Hamburguesas',
    priceUsd: 5.50,
    description: 'Carne 150g, queso cheddar, cebolla grillé, lechuga, tomate y salsas de la casa',
    sku: 'HBG-002',
    isExempt: false
  },
  {
    id: 'prod-3',
    name: 'Pepito Mixto Especial 35cm',
    category: 'Pizzas & Pepitos',
    priceUsd: 8.50,
    description: 'Carne y pollo a la plancha, tocineta, queso blanco rallado, maíz y papitas ralladas',
    sku: 'PEP-001',
    isExempt: false
  },
  {
    id: 'prod-4',
    name: 'Pizza Pepperoni Mediana',
    category: 'Pizzas & Pepitos',
    priceUsd: 9.00,
    description: 'Masa artesanal, salsa napolitana, abundante queso mozzarella y pepperoni premium',
    sku: 'PIZ-001',
    isExempt: false
  },
  {
    id: 'prod-5',
    name: 'Ración de Tequeños (6 uds)',
    category: 'Entradas & Snacks',
    priceUsd: 4.00,
    description: 'Tequeños tradicionales de queso blanco semi-duro acompañados de salsa tártara',
    sku: 'TEQ-001',
    isExempt: false
  },
  {
    id: 'prod-6',
    name: 'Papas Rústicas con Queso Cheddar',
    category: 'Entradas & Snacks',
    priceUsd: 3.50,
    description: 'Papas fritas con piel, salsa cheddar tibia fundida y lluvia de tocineta',
    sku: 'PAP-001',
    isExempt: false
  },
  {
    id: 'prod-7',
    name: 'Refresco Lata 355ml',
    category: 'Bebidas',
    priceUsd: 1.50,
    description: 'Coca-Cola, Pepsi, 7Up o Chinotto bien frío',
    sku: 'BEB-001',
    isExempt: false
  },
  {
    id: 'prod-8',
    name: 'Malta Polar 355ml',
    category: 'Bebidas',
    priceUsd: 1.50,
    description: 'Malta tradicional bien helada',
    sku: 'BEB-002',
    isExempt: false
  },
  {
    id: 'prod-9',
    name: 'Agua Mineral 600ml',
    category: 'Bebidas',
    priceUsd: 1.00,
    description: 'Agua pura sin gas',
    sku: 'BEB-003',
    isExempt: true
  },
  {
    id: 'prod-10',
    name: 'Brownie con Helado de Vainilla',
    category: 'Postres',
    priceUsd: 4.50,
    description: 'Brownie tibio de chocolate fudge con sirope de chocolate y nueces',
    sku: 'POS-001',
    isExempt: false
  }
];

const CATEGORIES = ['Todos', 'Hamburguesas', 'Pizzas & Pepitos', 'Entradas & Snacks', 'Bebidas', 'Postres'];

const VENEZUELA_BANKS = [
  '0102 - Banco de Venezuela',
  '0108 - Banco Provincial (BBVA)',
  '0134 - Banesco',
  '0105 - Banco Mercantil',
  '0172 - Bancamiga',
  '0114 - Bancaribe',
  '0116 - Banco Occidental de Descuento (BNC)',
  '0174 - Banplus'
];

function formatBs(val) {
  return 'Bs. ' + Number(val || 0).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatUsd(val) {
  return '$' + Number(val || 0).toFixed(2);
}

export default function WebPosView({ tenant, snapshot, onSaleComplete }) {
  // Tasa de cambio BCV
  const [bcvRate, setBcvRate] = useState(() => Number(snapshot?.exchange_rate || tenant?.exchange_rate) || 876.80);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [customRateInput, setCustomRateInput] = useState(String(bcvRate));

  // Productos y Búsqueda
  const [products] = useState(() => {
    const custom = snapshot?.products;
    return Array.isArray(custom) && custom.length > 0 ? custom : DEFAULT_PRODUCTS;
  });
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Carrito de Compras
  const [cart, setCart] = useState([]);
  const [clientType, setClientType] = useState('final'); // 'final' | 'custom'
  const [clientName, setClientName] = useState('Consumidor Final');
  const [clientRif, setClientRif] = useState('V-00000000-0');

  // Modal de Cobro
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('mixto'); // 'mixto' | 'usd_cash' | 'pago_movil' | 'punto'
  const [cashUsdReceived, setCashUsdReceived] = useState('');
  const [pagoMovilBank, setPagoMovilBank] = useState(VENEZUELA_BANKS[0]);
  const [pagoMovilPhone, setPagoMovilPhone] = useState('');
  const [pagoMovilRef, setPagoMovilRef] = useState('');
  const [applyIgtf, setApplyIgtf] = useState(true);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // Ticket Fiscal Final
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'Todos' || p.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (p.description && p.description.toLowerCase().includes(query));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cálculos del Carrito
  const cartTotals = useMemo(() => {
    let subtotalUsd = 0;
    let baseImponibleUsd = 0;
    let exentoUsd = 0;

    cart.forEach((item) => {
      const lineTotal = item.priceUsd * item.qty;
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

    // Cálculos para cobro mixto
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
      itemsCount: cart.reduce((acc, i) => acc + i.qty, 0)
    };
  }, [cart, bcvRate, paymentMethod, cashUsdReceived, applyIgtf]);

  // Manejo del Carrito
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

  // Abrir Modal de Cobro
  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    // Pre-cargar 10 o el total en efectivo si es mixto
    const defaultCash = Math.floor(cartTotals.finalTotalUsd / 5) * 5 || 5;
    setCashUsdReceived(String(Math.min(defaultCash, Math.floor(cartTotals.finalTotalUsd))));
    setIsPaymentModalOpen(true);
  };

  // Procesar Facturación y Guardar Venta
  const handleProcessSale = async (e) => {
    e.preventDefault();
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
          priceUsd: i.priceUsd,
          priceBs: i.priceUsd * bcvRate,
          isExempt: i.isExempt,
          totalUsd: i.priceUsd * i.qty,
          totalBs: i.priceUsd * i.qty * bcvRate
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
        totalBs: cartTotals.finalTotalBs,
        exchangeRate: bcvRate,
        paymentMethod,
        paymentDetails: {
          cashUsd: cartTotals.appliedCashUsd,
          pagoMovilBs: paymentMethod === 'pago_movil' ? cartTotals.finalTotalBs : cartTotals.remainingBs,
          pagoMovilBank: pagoMovilBank,
          pagoMovilRef: pagoMovilRef,
          changeUsd: cartTotals.changeUsd,
          changeBs: cartTotals.changeBs
        },
        fiscalSerial,
        status: 'completed'
      };

      // Si hay un tenant autenticado, actualizar snapshot en Supabase
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
      setIsReceiptModalOpen(true);
      clearCart();
    } catch (err) {
      console.error('Error registrando factura:', err);
      alert('Error registrando factura: ' + err.message);
    } finally {
      setIsSubmittingSale(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-hidden">
      
      {/* TOOLBAR SUPERIOR DEL PUNTO DE VENTA */}
      <div className="bg-white border-b border-zinc-200 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Caja Web Lista</span>
          </div>

          {/* TASA OFICIAL BCV */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-zinc-100 px-3 py-1 rounded-lg border border-zinc-200">
            <span className="text-zinc-400 font-medium">Tasa BCV:</span>
            {isEditingRate ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  value={customRateInput}
                  onChange={(e) => setCustomRateInput(e.target.value)}
                  className="w-20 px-1 py-0.5 rounded border border-zinc-300 text-xs bg-white text-zinc-950 font-bold"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = Number(customRateInput) || bcvRate;
                    setBcvRate(next);
                    setIsEditingRate(false);
                  }}
                  className="px-1.5 py-0.5 rounded bg-zinc-950 text-white text-[10px] font-bold"
                >
                  OK
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCustomRateInput(String(bcvRate));
                  setIsEditingRate(true);
                }}
                className="font-extrabold text-zinc-950 hover:underline flex items-center gap-1"
                title="Haz clic para modificar la tasa"
              >
                <span>{bcvRate.toFixed(2)} Bs/$</span>
                <span className="text-[10px] text-zinc-400 font-normal">✏️</span>
              </button>
            )}
          </div>
        </div>

        {/* BUSCADOR DE PRODUCTOS */}
        <div className="relative max-w-xs w-full hidden sm:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o ingrediente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-zinc-200 text-xs focus:border-zinc-950 focus:outline-none bg-zinc-50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ÁREA DE TRABAJO DIVIDIDA: CATÁLOGO (IZQ) + CARRITO (DER) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* COLUMNA IZQUIERDA: CATEGORÍAS Y PRODUCTOS */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-200">
          
          {/* BARRA DE CATEGORÍAS */}
          <div className="p-3 bg-white border-b border-zinc-100 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-zinc-950 text-white shadow-2xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* CUADRÍCULA DE PRODUCTOS */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const inCart = cart.find((i) => i.id === p.id);
                const priceBs = p.priceUsd * bcvRate;

                return (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className={`relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group active:scale-98 select-none ${
                      inCart
                        ? 'bg-zinc-950/2 border-zinc-950 shadow-xs'
                        : 'bg-white border-zinc-200 hover:border-zinc-400 hover:shadow-xs'
                    }`}
                  >
                    {inCart && (
                      <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-zinc-950 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                        {inCart.qty}
                      </span>
                    )}

                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 block mb-1">
                        {p.category}
                      </span>
                      <h4 className="text-xs font-bold text-zinc-900 group-hover:text-zinc-950 leading-snug line-clamp-2">
                        {p.name}
                      </h4>
                      {p.description && (
                        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-tight">
                          {p.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-baseline justify-between">
                      <div>
                        <span className="text-sm font-extrabold text-zinc-950 block">
                          {formatUsd(p.priceUsd)}
                        </span>
                        <span className="text-[10px] font-semibold text-zinc-500 block">
                          {formatBs(priceBs)}
                        </span>
                      </div>

                      <div className="w-6 h-6 rounded-lg bg-zinc-100 group-hover:bg-zinc-950 group-hover:text-white text-zinc-600 flex items-center justify-center transition-colors">
                        <Plus size={14} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: ORDEN DE CAJA & CARRITO */}
        <div className="w-full lg:w-96 bg-white flex flex-col shrink-0 shadow-lg lg:shadow-none h-full overflow-hidden">
          
          {/* HEADER DEL CARRITO */}
          <div className="p-3.5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-zinc-700" />
              <h3 className="text-xs font-extrabold text-zinc-950 tracking-tight">
                Orden de Caja #{cartTotals.itemsCount > 0 ? `(${cartTotals.itemsCount})` : ''}
              </h3>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-[11px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1 hover:underline"
              >
                <Trash2 size={12} />
                <span>Vaciar</span>
              </button>
            )}
          </div>

          {/* SELECTOR DE CLIENTE FISCAL */}
          <div className="p-2.5 bg-zinc-100/70 border-b border-zinc-200 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-zinc-500 text-[11px]">Cliente:</span>
              <span className="font-bold text-zinc-900 truncate">
                {clientType === 'final' ? 'Consumidor Final' : clientName}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (clientType === 'final') {
                  const name = prompt('Nombre o Razón Social del cliente:', '');
                  const rif = prompt('RIF o Cédula (ej: V-12345678):', 'V-');
                  if (name) {
                    setClientName(name);
                    setClientRif(rif || 'V-00000000-0');
                    setClientType('custom');
                  }
                } else {
                  setClientType('final');
                }
              }}
              className="text-[10px] text-zinc-700 font-bold hover:underline shrink-0 bg-white px-2 py-0.5 rounded border border-zinc-200"
            >
              {clientType === 'final' ? '+ Con RIF' : 'Quitar RIF'}
            </button>
          </div>

          {/* LISTA DE PRODUCTOS EN EL CARRITO */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-300">
                  <ShoppingCart size={24} />
                </div>
                <p className="text-xs font-semibold text-zinc-600">La caja está vacía</p>
                <p className="text-[11px] text-zinc-400">
                  Haz clic en cualquier producto del catálogo para comenzar a facturar.
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const itemTotalUsd = item.priceUsd * item.qty;
                const itemTotalBs = itemTotalUsd * bcvRate;

                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50/50 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-zinc-900 truncate">{item.name}</div>
                      <div className="text-[10px] text-zinc-400 font-medium">
                        {formatUsd(item.priceUsd)} c/u · {formatBs(item.priceUsd * bcvRate)}
                      </div>
                    </div>

                    {/* CONTROLES DE CANTIDAD */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-white border border-zinc-200 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, -1)}
                        className="w-5 h-5 rounded flex items-center justify-center text-zinc-600 hover:bg-zinc-100 transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center font-extrabold text-xs text-zinc-950">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, 1)}
                        className="w-5 h-5 rounded flex items-center justify-center text-zinc-600 hover:bg-zinc-100 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div className="text-right shrink-0 min-w-[65px]">
                      <div className="font-extrabold text-zinc-950">{formatUsd(itemTotalUsd)}</div>
                      <div className="text-[10px] text-zinc-400">{formatBs(itemTotalBs)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* DESGLOSE FISCAL SENIAT Y BOTÓN DE COBRO */}
          {cart.length > 0 && (
            <div className="p-3.5 border-t border-zinc-200 bg-zinc-50 shrink-0 space-y-2.5">
              <div className="space-y-1 text-xs text-zinc-600">
                <div className="flex justify-between">
                  <span>Subtotal Base:</span>
                  <span className="font-semibold text-zinc-900">{formatUsd(cartTotals.subtotalUsd)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA SENIAT (16%):</span>
                  <span className="font-semibold text-zinc-900">{formatUsd(cartTotals.iva16Usd)}</span>
                </div>
                <div className="border-t border-zinc-200/80 pt-1 flex justify-between items-baseline">
                  <div>
                    <span className="text-xs font-bold text-zinc-950 block">TOTAL A COBRAR:</span>
                    <span className="text-[10px] font-semibold text-zinc-500 block">
                      ≈ {formatBs(cartTotals.finalTotalBs)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-zinc-950 mono-num block">
                      {formatUsd(cartTotals.finalTotalUsd)}
                    </span>
                  </div>
                </div>
              </div>

              {/* BOTÓN GIGANTE DE COBRO */}
              <button
                type="button"
                onClick={handleOpenPayment}
                className="w-full py-3 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-extrabold text-xs shadow-sm transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <DollarSign size={16} className="text-emerald-400" />
                <span>Cobrar {formatUsd(cartTotals.finalTotalUsd)} ({formatBs(cartTotals.finalTotalBs)}) →</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE COBRO BIMONETARIO (EFECTIVO $ + PAGO MÓVIL BS) */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Cobro y Facturación Fiscal</h3>
                <span className="text-[11px] text-zinc-500">
                  Total: <strong className="text-zinc-900">{formatUsd(cartTotals.finalTotalUsd)}</strong> ≈ {formatBs(cartTotals.finalTotalBs)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* SELECTOR DE MÉTODO DE PAGO */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaymentMethod('mixto')}
                className={`py-1.5 rounded-lg transition-all ${
                  paymentMethod === 'mixto' ? 'bg-white text-zinc-950 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Mixto ($+Bs)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('usd_cash')}
                className={`py-1.5 rounded-lg transition-all ${
                  paymentMethod === 'usd_cash' ? 'bg-white text-zinc-950 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Efectivo $
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('pago_movil')}
                className={`py-1.5 rounded-lg transition-all ${
                  paymentMethod === 'pago_movil' ? 'bg-white text-zinc-950 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Pago Móvil
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('punto')}
                className={`py-1.5 rounded-lg transition-all ${
                  paymentMethod === 'punto' ? 'bg-white text-zinc-950 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Punto (Bs)
              </button>
            </div>

            <form onSubmit={handleProcessSale} className="space-y-3.5 text-xs">
              
              {/* OPCIÓN IGTF (3%) */}
              {(paymentMethod === 'usd_cash' || paymentMethod === 'mixto') && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="igtf-toggle"
                      checked={applyIgtf}
                      onChange={(e) => setApplyIgtf(e.target.checked)}
                      className="rounded border-amber-300 text-zinc-950 focus:ring-0"
                    />
                    <label htmlFor="igtf-toggle" className="cursor-pointer font-bold">
                      Aplicar IGTF Divisas (3%)
                    </label>
                  </div>
                  <span className="font-extrabold text-amber-950">
                    +{formatUsd(cartTotals.igtfUsd)} ({formatBs(cartTotals.igtfBs)})
                  </span>
                </div>
              )}

              {/* CAMPOS SEGÚN EL MÉTODO SELECCIONADO */}
              {(paymentMethod === 'mixto' || paymentMethod === 'usd_cash') && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-zinc-700 font-semibold">Monto Recibido en Dólares ($ Efectivo):</label>
                    <span className="text-[10px] text-zinc-400">Total a pagar: {formatUsd(cartTotals.finalTotalUsd)}</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej: 10"
                    value={cashUsdReceived}
                    onChange={(e) => setCashUsdReceived(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-zinc-950 text-sm font-bold text-zinc-900 bg-zinc-50"
                    autoFocus
                  />
                  {paymentMethod === 'usd_cash' && cartTotals.changeUsd > 0 && (
                    <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold flex justify-between">
                      <span>Vuelto al cliente:</span>
                      <span>{formatUsd(cartTotals.changeUsd)} ({formatBs(cartTotals.changeBs)})</span>
                    </div>
                  )}
                </div>
              )}

              {(paymentMethod === 'mixto' || paymentMethod === 'pago_movil') && (
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-zinc-900">
                      {paymentMethod === 'mixto' ? 'Restante por Pago Móvil:' : 'Monto total en Pago Móvil:'}
                    </span>
                    <span className="font-extrabold text-zinc-950 text-sm">
                      {formatBs(paymentMethod === 'mixto' ? cartTotals.remainingBs : cartTotals.finalTotalBs)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Banco Origen</label>
                      <select
                        value={pagoMovilBank}
                        onChange={(e) => setPagoMovilBank(e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-zinc-200 text-xs bg-white text-zinc-900"
                      >
                        {VENEZUELA_BANKS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Últimos 4-6 dígitos Ref.</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Ej: 4892"
                        value={pagoMovilRef}
                        onChange={(e) => setPagoMovilRef(e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-zinc-200 text-xs bg-white text-zinc-900 font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingSale}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 mt-3 active:scale-98"
              >
                {isSubmittingSale ? (
                  <span>Emitiendo factura...</span>
                ) : (
                  <>
                    <Printer size={15} />
                    <span>Confirmar Pago y Emitir Ticket SENIAT</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE TICKET FISCAL SENIAT (VISTA PREVIA E IMPRESIÓN) */}
      {isReceiptModalOpen && completedInvoice && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 shrink-0">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                <CheckCircle2 size={16} />
                <span>¡Factura Emitida con Éxito!</span>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* FORMATO TICKET TÉRMICO FISCAL (58mm / 80mm) */}
            <div className="flex-1 overflow-y-auto p-4 bg-zinc-50 border border-dashed border-zinc-300 rounded-xl font-mono text-[11px] text-zinc-900 space-y-2 select-text">
              <div className="text-center space-y-0.5">
                <div className="font-extrabold text-xs uppercase tracking-tight">
                  {tenant?.legal_name || tenant?.name || 'FACTURASYA CLOUD DEMO, C.A.'}
                </div>
                <div className="text-[10px] text-zinc-600">
                  RIF: {tenant?.rif || 'J-50123456-7'}
                </div>
                <div className="text-[9px] text-zinc-500 leading-tight">
                  {tenant?.fiscal_address || 'Av. Francisco de Miranda, Caracas, Venezuela'}
                </div>
                <div className="text-[9px] text-zinc-500">
                  SERIAL FISCAL: {completedInvoice.fiscalSerial}
                </div>
              </div>

              <div className="border-t border-dashed border-zinc-300 pt-1.5 space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>FACTURA:</span>
                  <span className="font-bold">{completedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>FECHA:</span>
                  <span>{new Date(completedInvoice.date).toLocaleString('es-VE')}</span>
                </div>
                <div className="flex justify-between">
                  <span>CLIENTE:</span>
                  <span className="font-bold">{completedInvoice.client?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>RIF/CI:</span>
                  <span>{completedInvoice.client?.rif}</span>
                </div>
              </div>

              {/* LISTA DE ÍTEMS */}
              <div className="border-t border-dashed border-zinc-300 pt-1.5 space-y-1">
                {completedInvoice.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[10px]">
                    <span className="flex-1">
                      {item.qty}x {item.name} (G)
                    </span>
                    <span className="font-bold">{formatUsd(item.totalUsd)}</span>
                  </div>
                ))}
              </div>

              {/* TOTALES FISCALES SENIAT */}
              <div className="border-t border-dashed border-zinc-300 pt-1.5 space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>{formatUsd(completedInvoice.subtotalUsd)}</span>
                </div>
                <div className="flex justify-between">
                  <span>BASE IMPONIBLE (G 16%):</span>
                  <span>{formatUsd(completedInvoice.baseImponibleUsd)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (16%):</span>
                  <span>{formatUsd(completedInvoice.iva16Usd)}</span>
                </div>
                {completedInvoice.igtfUsd > 0 && (
                  <div className="flex justify-between text-amber-900 font-bold">
                    <span>IGTF DIVISAS (3%):</span>
                    <span>+{formatUsd(completedInvoice.igtfUsd)}</span>
                  </div>
                )}
                <div className="border-t border-zinc-900 pt-1 flex justify-between font-extrabold text-xs">
                  <span>TOTAL USD:</span>
                  <span>{formatUsd(completedInvoice.total)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-xs text-zinc-700">
                  <span>TOTAL BS:</span>
                  <span>{formatBs(completedInvoice.totalBs)}</span>
                </div>
                <div className="text-[9px] text-zinc-500 text-center pt-1">
                  TASA OFICIAL BCV: {completedInvoice.exchangeRate.toFixed(2)} Bs/$
                </div>
              </div>

              <div className="border-t border-dashed border-zinc-300 pt-2 text-center space-y-1">
                <div className="w-16 h-16 mx-auto bg-zinc-200/80 rounded flex items-center justify-center text-zinc-600">
                  <QrCode size={48} />
                </div>
                <div className="text-[9px] text-zinc-400">
                  COMPROBANTE FISCAL DIGITAL SENIAT
                </div>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="space-y-2 shrink-0 pt-1">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <Printer size={15} />
                <span>Imprimir Ticket Térmico</span>
              </button>

              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="w-full py-2 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs transition-all"
              >
                Nueva Venta (Cerrar)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
