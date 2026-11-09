import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Utensils,
  LayoutDashboard,
  Boxes,
  Package,
  TrendingUp,
  Settings,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  QrCode,
  DollarSign,
  Smartphone,
  Store,
  Layers,
  Sparkles,
  ArrowRight,
  Barcode,
  Check,
  X,
  Clock,
  RefreshCw
} from 'lucide-react';

// Ilustraciones vectoriales instantáneas y nítidas sin peticiones de red externas
function ProductGraphic({ type }) {
  // Hamburguesa
  if (type === 'burger') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-amber-50/80">
        <circle cx="60" cy="45" r="34" fill="#fef3c7" />
        <path d="M32 40 C32 24, 88 24, 88 40 Z" fill="#d97706" />
        <circle cx="48" cy="31" r="1.5" fill="#fef3c7" />
        <circle cx="60" cy="29" r="1.5" fill="#fef3c7" />
        <circle cx="72" cy="32" r="1.5" fill="#fef3c7" />
        <rect x="30" y="42" width="60" height="4" rx="2" fill="#16a34a" />
        <polygon points="34,46 86,46 80,51 40,51" fill="#facc15" />
        <rect x="31" y="48" width="58" height="8" rx="4" fill="#78350f" />
        <rect x="33" y="58" width="54" height="8" rx="4" fill="#b45309" />
      </svg>
    );
  }
  // Pepito / Sandwich
  if (type === 'pepito') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-orange-50/80">
        <circle cx="60" cy="45" r="34" fill="#ffedd5" />
        <rect x="24" y="34" width="72" height="22" rx="11" fill="#d97706" />
        <rect x="28" y="39" width="64" height="7" rx="3.5" fill="#78350f" />
        <path d="M30 41 Q40 36, 50 41 T70 41 T90 41" stroke="#facc15" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  // Papas fritas
  if (type === 'fries') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-yellow-50/80">
        <circle cx="60" cy="45" r="34" fill="#fef9c3" />
        <rect x="42" y="20" width="6" height="28" rx="2" fill="#eab308" />
        <rect x="50" y="17" width="6" height="30" rx="2" fill="#facc15" />
        <rect x="58" y="19" width="6" height="28" rx="2" fill="#eab308" />
        <rect x="66" y="18" width="6" height="29" rx="2" fill="#facc15" />
        <path d="M38 42 L82 42 L76 68 L44 68 Z" fill="#dc2626" />
        <circle cx="60" cy="55" r="5" fill="#fef2f2" />
      </svg>
    );
  }
  // Alitas BBQ
  if (type === 'wings') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-red-50/70">
        <circle cx="60" cy="45" r="34" fill="#fee2e2" />
        <ellipse cx="52" cy="46" rx="18" ry="11" transform="rotate(-18 52 46)" fill="#b45309" />
        <ellipse cx="68" cy="50" rx="16" ry="10" transform="rotate(15 68 50)" fill="#92400e" />
        <circle cx="82" cy="43" r="4" fill="#fef3c7" />
      </svg>
    );
  }
  // Bebida / Cóctel
  if (type === 'drink') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-sky-50/70">
        <circle cx="60" cy="45" r="34" fill="#e0f2fe" />
        <path d="M64 16 L70 16 L63 30" stroke="#0284c7" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M44 28 L76 28 L72 68 L48 68 Z" fill="#f59e0b" opacity="0.85" />
        <rect x="42" y="25" width="36" height="4" rx="2" fill="#ffffff" />
      </svg>
    );
  }
  // Barquilla de helado (cono)
  if (type === 'icecream_cone') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-pink-50/80">
        <circle cx="60" cy="45" r="34" fill="#fdf2f8" />
        <polygon points="46,45 74,45 60,74" fill="#d97706" />
        <path d="M46 45 L74 45" stroke="#b45309" strokeWidth="1.5" />
        <circle cx="60" cy="38" r="14" fill="#f43f5e" />
        <circle cx="60" cy="24" r="12" fill="#fef08a" />
        <circle cx="60" cy="14" r="3.5" fill="#dc2626" />
      </svg>
    );
  }
  // Tina de helado
  if (type === 'icecream_tub') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-violet-50/80">
        <circle cx="60" cy="45" r="34" fill="#f5f3ff" />
        <path d="M38 42 L82 42 L76 68 L44 68 Z" fill="#8b5cf6" />
        <ellipse cx="60" cy="42" rx="22" ry="6" fill="#c4b5fd" />
        <circle cx="52" cy="34" r="10" fill="#fbcfe8" />
        <circle cx="68" cy="34" r="10" fill="#fed7aa" />
        <circle cx="60" cy="26" r="9" fill="#78350f" />
      </svg>
    );
  }
  // Vaso de helado
  if (type === 'icecream_cup') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-emerald-50/80">
        <circle cx="60" cy="45" r="34" fill="#ecfdf5" />
        <path d="M42 46 L78 46 L73 68 L47 68 Z" fill="#10b981" />
        <circle cx="60" cy="36" r="14" fill="#ec4899" />
        <circle cx="56" cy="32" r="3" fill="#fdf2f8" />
      </svg>
    );
  }
  // Café caliente
  if (type === 'coffee') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-amber-50/70">
        <circle cx="60" cy="45" r="34" fill="#fef3c7" />
        <rect x="42" y="36" width="34" height="28" rx="5" fill="#78350f" />
        <path d="M76 42 C84 42, 84 54, 76 54" stroke="#78350f" strokeWidth="3" fill="none" />
        <path d="M50 24 Q54 28, 50 32" stroke="#d97706" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M60 22 Q64 26, 60 30" stroke="#d97706" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  // Alimento / Harina
  if (type === 'grocery') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-yellow-50/80">
        <circle cx="60" cy="45" r="34" fill="#fef9c3" />
        <rect x="40" y="24" width="40" height="46" rx="4" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
        <circle cx="60" cy="44" r="10" fill="#1e3a8a" />
        <circle cx="60" cy="44" r="5" fill="#ffffff" />
        <rect x="44" y="58" width="32" height="4" rx="1" fill="#dc2626" />
      </svg>
    );
  }
  // Aceite
  if (type === 'oil') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-amber-50/70">
        <circle cx="60" cy="45" r="34" fill="#fef3c7" />
        <rect x="46" y="32" width="28" height="38" rx="4" fill="#fbbf24" opacity="0.9" />
        <rect x="52" y="22" width="16" height="10" rx="2" fill="#dc2626" />
        <rect x="49" y="44" width="22" height="12" rx="2" fill="#ffffff" />
      </svg>
    );
  }
  // Refresco
  if (type === 'soda') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-red-50/80">
        <circle cx="60" cy="45" r="34" fill="#fee2e2" />
        <rect x="46" y="28" width="28" height="44" rx="6" fill="#1e1b4b" />
        <rect x="53" y="20" width="14" height="8" rx="2" fill="#dc2626" />
        <rect x="46" y="42" width="28" height="14" fill="#dc2626" />
        <path d="M49 49 Q60 45, 71 49" stroke="#ffffff" strokeWidth="2" fill="none" />
      </svg>
    );
  }
  // Default
  return (
    <svg viewBox="0 0 120 90" className="w-full h-full bg-zinc-100">
      <circle cx="60" cy="45" r="34" fill="#e4e4e7" />
      <rect x="42" y="30" width="36" height="34" rx="4" fill="#71717a" />
    </svg>
  );
}

// 3 PERFILES DE NEGOCIO REALES CON COMPONENTES Y PRODUCTOS DISTINTOS
const BUSINESS_MODES = {
  restaurant: {
    id: 'restaurant',
    tag: 'Restaurante & Bar',
    businessName: 'El Portón Grill & Bar',
    categoryLabel: 'Menú & Cocina',
    hasTables: true,
    hasBarcodes: false,
    navPill: 'Modo Restaurante',
    description: 'Gestión de mesas, comandas automáticas a cocina y meseros por QR.',
    products: [
      { id: 'r1', name: 'Smash Burger Doble', detail: 'Doble carne, cheddar y tocineta', priceUsd: 7.5, art: 'burger' },
      { id: 'r2', name: 'Pepito Lomito 35cm', detail: 'Lomito, maíz, papas y queso', priceUsd: 9.0, art: 'pepito' },
      { id: 'r3', name: 'Papas Rústicas', detail: 'Con queso fundido y tocineta', priceUsd: 4.5, art: 'fries' },
      { id: 'r4', name: 'Alitas BBQ (8 und)', detail: 'Salsa artesanal y ajonjolí', priceUsd: 6.5, art: 'wings' },
      { id: 'r5', name: 'Té Frío Durazno', detail: 'Vaso grande con limón', priceUsd: 2.5, art: 'drink' },
      { id: 'r6', name: 'Mojito Clásico', detail: 'Hierbabuena fresca y ron', priceUsd: 5.0, art: 'drink' }
    ],
    tables: [
      { id: 'm1', name: 'Mesa 1', zone: 'Salón', status: 'ocupada', totalUsd: 21.0, mins: '14 min', waiter: 'Carlos M.' },
      { id: 'm2', name: 'Mesa 2', zone: 'Salón', status: 'libre', totalUsd: 0, mins: null, waiter: null },
      { id: 'm3', name: 'Mesa 3', zone: 'Terraza', status: 'cuenta', totalUsd: 38.5, mins: '42 min', waiter: 'Valeria R.' },
      { id: 'm4', name: 'Mesa 4', zone: 'Terraza', status: 'ocupada', totalUsd: 16.5, mins: 'Hace 5m', waiter: 'Valeria R.' }
    ]
  },
  ice_cream: {
    id: 'ice_cream',
    tag: 'Heladería & Café',
    businessName: 'Helados La Cascada C.A.',
    categoryLabel: 'Sabores & Mostrador',
    hasTables: false,
    hasBarcodes: false,
    navPill: 'Modo Heladería',
    description: 'Venta rápida de mostrador, combinaciones de sabores, conos, tinas y peso en KG.',
    products: [
      { id: 'h1', name: 'Barquilla 2 Sabores', detail: 'Mantecado + Chocolate Suizo', priceUsd: 3.5, art: 'icecream_cone' },
      { id: 'h2', name: 'Tina 1/2 Litro (3 Sabores)', detail: 'Empaque térmico para llevar', priceUsd: 6.0, art: 'icecream_tub' },
      { id: 'h3', name: 'Vaso 1 Sabor Especial', detail: 'Fresa Silvestre artesanal', priceUsd: 2.5, art: 'icecream_cup' },
      { id: 'h4', name: 'Cono Waffle Doble Topping', detail: 'Nutella, lluvia de maní y crema', priceUsd: 4.5, art: 'icecream_cone' },
      { id: 'h5', name: 'Café Latte Vainilla', detail: 'Espresso doble con leche vaporizada', priceUsd: 2.0, art: 'coffee' },
      { id: 'h6', name: 'Tina 1 Litro (Familiar)', detail: 'Hasta 4 sabores a elección', priceUsd: 11.0, art: 'icecream_tub' }
    ],
    tables: []
  },
  retail: {
    id: 'retail',
    tag: 'Retail & Minimarket',
    businessName: 'Bodegón & Minimarket Central',
    categoryLabel: 'Productos & Stock',
    hasTables: false,
    hasBarcodes: true,
    navPill: 'Modo Retail',
    description: 'Lector de códigos de barra, control de inventario en vivo, SKU y tickets al instante.',
    products: [
      { id: 'b1', name: 'Harina PAN Maíz Blanco 1kg', detail: 'SKU: 7591038 · Stock: 48 und', priceUsd: 1.4, art: 'grocery' },
      { id: 'b2', name: 'Aceite Vegetal 1 Litro', detail: 'SKU: 7592004 · Stock: 24 und', priceUsd: 3.2, art: 'oil' },
      { id: 'b3', name: 'Refresco 2 Litros Cola', detail: 'SKU: 7590012 · Stock: 35 und', priceUsd: 2.2, art: 'soda' },
      { id: 'b4', name: 'Café Molido Gourmet 500g', detail: 'SKU: 7593411 · Stock: 18 und', priceUsd: 4.8, art: 'coffee' },
      { id: 'b5', name: 'Queso Parmesano 250g', detail: 'SKU: 7596123 · Stock: 12 und', priceUsd: 3.9, art: 'grocery' },
      { id: 'b6', name: 'Galletas Chips Chocolate', detail: 'SKU: 7594520 · Stock: 60 und', priceUsd: 1.5, art: 'grocery' }
    ],
    tables: []
  }
};

function formatBs(val) {
  return 'Bs. ' + Number(val || 0).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export default function NotionAppShowcase({ rate = 896.12 }) {
  const [activeMode, setActiveMode] = useState('restaurant'); // 'restaurant' | 'ice_cream' | 'retail'
  const [activeView, setActiveView] = useState('pos'); // 'pos' | 'tables' | 'monitor'
  const [cart, setCart] = useState({
    r1: 2,
    r3: 1
  });
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [simulatedPaymentSuccess, setSimulatedPaymentSuccess] = useState(false);

  const currentMode = BUSINESS_MODES[activeMode];

  // Cambiar de perfil de negocio reinicia el carrito con un ejemplo relevante
  const handleSelectMode = (modeKey) => {
    setActiveMode(modeKey);
    setActiveView('pos');
    setCheckoutModalOpen(false);
    setSimulatedPaymentSuccess(false);

    if (modeKey === 'restaurant') {
      setCart({ r1: 2, r3: 1 });
    } else if (modeKey === 'ice_cream') {
      setCart({ h1: 2, h2: 1 });
    } else {
      setCart({ b1: 3, b2: 1 });
    }
  };

  const addToCart = (product) => {
    setCart((prev) => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1
    }));
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[productId] > 1) {
        next[productId] -= 1;
      } else {
        delete next[productId];
      }
      return next;
    });
  };

  const clearCart = () => setCart({});

  // Cálculo de totales en $ y Bs en tiempo real
  const cartSummary = useMemo(() => {
    let totalQty = 0;
    let totalUsd = 0;

    currentMode.products.forEach((p) => {
      const q = cart[p.id] || 0;
      if (q > 0) {
        totalQty += q;
        totalUsd += p.priceUsd * q;
      }
    });

    const totalBs = totalUsd * rate;
    return { totalQty, totalUsd, totalBs };
  }, [cart, currentMode, rate]);

  const handleSimulateCheckout = () => {
    if (cartSummary.totalQty === 0) return;
    setCheckoutModalOpen(true);
    setSimulatedPaymentSuccess(false);
  };

  const handleConfirmSimulatedPayment = () => {
    setSimulatedPaymentSuccess(true);
    setTimeout(() => {
      setCheckoutModalOpen(false);
      setSimulatedPaymentSuccess(false);
      clearCart();
    }, 2200);
  };

  return (
    <div className="mt-8 max-w-6xl mx-auto">

      {/* SELECTOR SEGMENTADO DE PERFIL DE NEGOCIO (ESTILO NOTION / LINEAR) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 px-2">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-100 border border-zinc-200/90 shadow-2xs">
          {Object.entries(BUSINESS_MODES).map(([key, mode]) => {
            const isSelected = activeMode === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectMode(key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200/80 scale-102'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
                }`}
              >
                <span>{key === 'restaurant' ? '🍔' : key === 'ice_cream' ? '🍦' : '🛍️'}</span>
                <span>{mode.tag}</span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Prueba la demo interactiva en vivo · Haz clic en los platos y productos</span>
        </div>
      </div>

      {/* VENTANA DEL SOFTWARE REAL */}
      <div className="relative rounded-2xl p-1.5 sm:p-2 bg-zinc-200/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border border-zinc-300/80">
        <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 flex flex-col md:flex-row h-[560px] text-left">
          
          {/* SIDEBAR ADAPTABLE SEGÚN EL PERFIL */}
          <aside className="hidden md:flex w-52 flex-col bg-zinc-900 text-zinc-300 border-r border-zinc-800 shrink-0 select-none">
            
            {/* Header del local en Sidebar */}
            <div className="p-3 border-b border-zinc-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                  {activeMode === 'restaurant' ? 'RG' : activeMode === 'ice_cream' ? 'HC' : 'BM'}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-white tracking-tight truncate">
                    {currentMode.businessName}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="text-[9px] text-zinc-400 font-semibold truncate">
                      {currentMode.navPill}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Opciones de menú según el perfil */}
            <div className="flex-1 overflow-hidden p-2 space-y-3">
              <div>
                <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  Caja & Ventas
                </div>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveView('pos')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeView === 'pos' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <ShoppingCart size={13} className={activeView === 'pos' ? 'text-emerald-400' : 'text-zinc-400'} />
                    <span className="flex-1 text-left">Punto de Venta</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-zinc-800 text-emerald-400 font-bold">
                      {cartSummary.totalQty}
                    </span>
                  </button>

                  {currentMode.hasTables && (
                    <button
                      type="button"
                      onClick={() => setActiveView('tables')}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeView === 'tables' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Utensils size={13} className={activeView === 'tables' ? 'text-amber-400' : 'text-zinc-400'} />
                      <span className="flex-1 text-left">Mesas & Salón</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-amber-500/20 text-amber-300">
                        4
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  Gestión Inteligente
                </div>
                <div className="space-y-0.5 text-zinc-400 text-xs font-medium">
                  <div className="px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/40 flex items-center gap-2">
                    <Package size={13} />
                    <span>{currentMode.categoryLabel}</span>
                  </div>
                  {currentMode.hasBarcodes ? (
                    <div className="px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/40 flex items-center gap-2">
                      <Barcode size={13} />
                      <span>Códigos de Barra</span>
                    </div>
                  ) : (
                    <div className="px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/40 flex items-center gap-2">
                      <Boxes size={13} />
                      <span>Inventario</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  En la Nube
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('monitor')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeView === 'monitor' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <TrendingUp size={13} className={activeView === 'monitor' ? 'text-sky-400' : 'text-zinc-400'} />
                  <span className="flex-1 text-left">Monitor Móvil</span>
                  <span className="text-[8px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold">
                    Ventas
                  </span>
                </button>
              </div>
            </div>

            {/* Indicador de Tasa BCV Oficial */}
            <div className="p-2.5 border-t border-zinc-800 bg-zinc-950/60">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-400 font-medium">Tasa Oficial BCV:</span>
                <span className="text-emerald-400 font-mono font-bold">{rate.toFixed(2)} Bs/$</span>
              </div>
            </div>
          </aside>

          {/* ÁREA DE TRABAJO PRINCIPAL */}
          <main className="flex-1 flex flex-col min-w-0 bg-zinc-50 overflow-hidden relative">
            
            {/* TOPBAR DE LA APLICACIÓN */}
            <div className="h-11 bg-zinc-900 border-b border-zinc-800 px-3 sm:px-4 flex items-center justify-between shrink-0 text-white">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs text-white">
                  {activeView === 'pos'
                    ? 'Punto de Venta'
                    : activeView === 'tables'
                    ? 'Mesas & Salón'
                    : 'Monitor del Dueño en Vivo'}
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {currentMode.tag}
                </span>
              </div>

              {/* Selector de Vistas en móviles o barras */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-800 border border-zinc-700 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setActiveView('pos')}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                      activeView === 'pos' ? 'bg-zinc-950 text-white shadow-2xs' : 'text-zinc-400'
                    }`}
                  >
                    Caja
                  </button>
                  {currentMode.hasTables && (
                    <button
                      type="button"
                      onClick={() => setActiveView('tables')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                        activeView === 'tables' ? 'bg-zinc-950 text-white shadow-2xs' : 'text-zinc-400'
                      }`}
                    >
                      Mesas
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveView('monitor')}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                      activeView === 'monitor' ? 'bg-zinc-950 text-white shadow-2xs' : 'text-zinc-400'
                    }`}
                  >
                    Celular
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-zinc-800 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-[10px] text-zinc-400 font-mono font-semibold">100% Offline-Ready</span>
                </div>
              </div>
            </div>

            {/* VISTA 1: PUNTO DE VENTA INTERACTIVO (CATÁLOGO + CARRITO) */}
            {activeView === 'pos' && (
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                
                {/* Cuadrícula de Productos */}
                <div className="flex-1 flex flex-col overflow-hidden bg-zinc-100/60 p-3">
                  
                  {/* Buscador / Escáner */}
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <div className="relative flex-1 max-w-sm">
                      <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-400" />
                      <input
                        type="text"
                        readOnly
                        value={currentMode.hasBarcodes ? 'Lector de código de barras activo...' : 'Buscar producto o categoría...'}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-600 shadow-2xs cursor-default"
                      />
                    </div>
                    <span className="text-[11px] text-zinc-500 font-semibold hidden sm:inline">
                      {currentMode.products.length} productos listos
                    </span>
                  </div>

                  {/* Grid de productos */}
                  <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2.5 pr-0.5">
                    {currentMode.products.map((p) => {
                      const inCartQty = cart[p.id] || 0;
                      return (
                        <div
                          key={p.id}
                          onClick={() => addToCart(p)}
                          className={`group relative rounded-xl border p-2 flex flex-col justify-between transition-all cursor-pointer bg-white hover:border-zinc-400 hover:shadow-xs active:scale-98 ${
                            inCartQty > 0 ? 'border-zinc-900 ring-1 ring-zinc-900/10' : 'border-zinc-200'
                          }`}
                        >
                          <div className="h-20 w-full rounded-lg overflow-hidden mb-2 relative">
                            <ProductGraphic type={p.art} />
                            {inCartQty > 0 && (
                              <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-zinc-950 text-white text-[10px] font-mono font-bold flex items-center justify-center shadow-xs">
                                {inCartQty}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-zinc-950 line-clamp-1 leading-tight group-hover:text-emerald-700 transition-colors">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                              {p.detail}
                            </div>
                            <div className="mt-2 flex items-baseline justify-between pt-1 border-t border-zinc-100">
                              <span className="font-mono font-extrabold text-xs text-zinc-950">
                                ${p.priceUsd.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-emerald-700 font-mono font-bold">
                                {formatBs(p.priceUsd * rate)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Carrito de Comanda / Ticket de Venta */}
                <div className="w-full lg:w-72 bg-white border-t lg:border-t-0 lg:border-l border-zinc-200/90 flex flex-col shrink-0">
                  <div className="p-3 border-b border-zinc-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-900">
                      <ShoppingCart size={14} className="text-emerald-600" />
                      <span>Cuenta Actual</span>
                      <span className="px-1.5 py-0.2 rounded-full font-mono text-[10px] bg-zinc-100 text-zinc-700 font-bold">
                        {cartSummary.totalQty}
                      </span>
                    </div>
                    {cartSummary.totalQty > 0 && (
                      <button
                        type="button"
                        onClick={clearCart}
                        className="text-[10px] text-zinc-400 hover:text-red-600 font-semibold cursor-pointer"
                      >
                        Vaciar
                      </button>
                    )}
                  </div>

                  {/* Lista de items en carrito */}
                  <div className="flex-1 overflow-y-auto p-2.5 divide-y divide-zinc-100 max-h-48 lg:max-h-none text-xs">
                    {cartSummary.totalQty === 0 ? (
                      <div className="py-12 text-center text-zinc-400 text-xs">
                        <ShoppingCart size={22} className="mx-auto mb-2 text-zinc-300" />
                        <span>Carrito vacío. Haz clic en cualquier plato o producto para agregarlo.</span>
                      </div>
                    ) : (
                      currentMode.products.map((p) => {
                        const q = cart[p.id] || 0;
                        if (q === 0) return null;
                        return (
                          <div key={p.id} className="py-2 flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-zinc-900 block truncate">{p.name}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                ${p.priceUsd.toFixed(2)} c/u · {formatBs(p.priceUsd * rate)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => removeFromCart(p.id)}
                                className="w-5 h-5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-5 text-center font-mono font-bold text-xs text-zinc-950">{q}</span>
                              <button
                                type="button"
                                onClick={() => addToCart(p)}
                                className="w-5 h-5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Totales y Botón de Cobro */}
                  <div className="p-3 bg-zinc-50 border-t border-zinc-200/90 space-y-2">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-zinc-500 font-semibold">Total Dólares:</span>
                      <strong className="font-mono font-extrabold text-base text-zinc-950">
                        ${cartSummary.totalUsd.toFixed(2)}
                      </strong>
                    </div>
                    <div className="flex items-baseline justify-between text-xs pt-1 border-t border-zinc-200/60">
                      <span className="text-zinc-500 font-semibold">Total Bolívares (BCV):</span>
                      <strong className="font-mono font-bold text-xs text-emerald-700">
                        {formatBs(cartSummary.totalBs)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      disabled={cartSummary.totalQty === 0}
                      onClick={handleSimulateCheckout}
                      className="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 active:scale-98"
                    >
                      <DollarSign size={13} className="text-emerald-400" />
                      <span>Cobrar (${cartSummary.totalUsd.toFixed(2)}) →</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VISTA 2: MAPA DE MESAS (EXCLUSIVO RESTAURANTE) */}
            {activeView === 'tables' && currentMode.hasTables && (
              <div className="flex-1 p-4 overflow-y-auto bg-zinc-100/50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-sm text-zinc-950">Mapa de Mesas y Salón</h4>
                    <p className="text-[11px] text-zinc-500">Visualiza mesas ocupadas, cuentas abiertas y rotación.</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                    2 Mesas Ocupadas
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {currentMode.tables.map((t) => (
                    <div
                      key={t.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        t.status === 'ocupada'
                          ? 'bg-amber-50/70 border-amber-200 shadow-2xs'
                          : t.status === 'cuenta'
                          ? 'bg-emerald-50/70 border-emerald-200 shadow-2xs'
                          : 'bg-white border-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-zinc-950">{t.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                            t.status === 'ocupada'
                              ? 'bg-amber-200 text-amber-900'
                              : t.status === 'cuenta'
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-zinc-100 text-zinc-500'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500">{t.zone}</div>
                      {t.status !== 'libre' ? (
                        <div className="mt-2 pt-2 border-t border-zinc-200/60">
                          <div className="font-mono font-bold text-sm text-zinc-950">${t.totalUsd.toFixed(2)}</div>
                          <div className="text-[10px] text-zinc-400 flex items-center justify-between mt-0.5">
                            <span>{t.waiter}</span>
                            <span>{t.mins}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 text-[10px] text-zinc-400 font-medium">Disponible para comensal</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VISTA 3: MONITOR MÓVIL DEL DUEÑO */}
            {activeView === 'monitor' && (
              <div className="flex-1 p-4 overflow-y-auto bg-zinc-950 text-white flex items-center justify-center">
                <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Smartphone size={14} className="text-emerald-400" />
                      <span className="text-xs font-bold text-white">Monitor en tu Celular</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                      En Vivo
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 block">Ventas de Hoy ({currentMode.businessName})</span>
                    <strong className="text-2xl font-mono font-extrabold text-white">$482.50</strong>
                    <span className="text-[11px] text-emerald-400 font-mono block mt-0.5">
                      ≈ {formatBs(482.5 * rate)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="p-2 rounded-xl bg-zinc-800/80 border border-zinc-700/60">
                      <span className="text-[10px] text-zinc-400 block">Pago Móvil (Bs)</span>
                      <strong className="font-mono text-white">$265.00</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-800/80 border border-zinc-700/60">
                      <span className="text-[10px] text-zinc-400 block">Efectivo ($ / Bs)</span>
                      <strong className="font-mono text-white">$217.50</strong>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-800/50 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
                    <div className="flex justify-between">
                      <span>Caja Principal:</span>
                      <span className="text-emerald-400 font-semibold">Abierta sin descuadres</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tickets emitidos:</span>
                      <span className="font-mono text-white font-bold">29 ventas</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL SIMULADO DE COBRO Y EMISIÓN DE TICKET */}
            {checkoutModalOpen && (
              <div
                className="absolute inset-0 z-30 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
                onClick={() => setCheckoutModalOpen(false)}
              >
                <div
                  className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-2xl space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  {simulatedPaymentSuccess ? (
                    <div className="py-6 text-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                        <Check size={24} />
                      </div>
                      <h4 className="font-bold text-sm text-zinc-950">¡Venta Registrada e Impresa!</h4>
                      <p className="text-xs text-zinc-500">
                        Ticket emitido con éxito. El inventario y la caja se actualizaron al instante.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-950">
                          <Printer size={14} className="text-emerald-600" />
                          <span>Finalizar Venta ({currentMode.tag})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCheckoutModalOpen(false)}
                          className="w-5 h-5 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Total a pagar</span>
                          <strong className="text-lg font-mono font-extrabold text-zinc-950">
                            ${cartSummary.totalUsd.toFixed(2)}
                          </strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-500 block">En Bolívares (BCV)</span>
                          <strong className="text-xs font-mono font-bold text-emerald-700">
                            {formatBs(cartSummary.totalBs)}
                          </strong>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Medio de Pago Seleccionado:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold">
                          <div className="p-2 rounded-lg border border-emerald-500 bg-emerald-50/50 text-emerald-950 flex items-center justify-between">
                            <span>Pago Móvil (Bs)</span>
                            <Check size={12} className="text-emerald-600" />
                          </div>
                          <div className="p-2 rounded-lg border border-zinc-200 bg-white text-zinc-700">
                            <span>Efectivo ($)</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmSimulatedPayment}
                        className="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                      >
                        <Printer size={13} />
                        <span>Imprimir Ticket & Finalizar →</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}
