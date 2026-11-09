import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  RefreshCw,
  Play,
  Pause,
  BookOpen,
  Download,
  FileSpreadsheet
} from 'lucide-react';

// Ilustraciones vectoriales instantáneas y nítidas
function ProductGraphic({ type }) {
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
  if (type === 'icecream_cup') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-rose-50/80">
        <circle cx="60" cy="45" r="34" fill="#fff1f2" />
        <path d="M42 45 L78 45 L74 68 L46 68 Z" fill="#f43f5e" />
        <circle cx="60" cy="36" r="14" fill="#fbbf24" />
        <circle cx="60" cy="24" r="4" fill="#e11d48" />
      </svg>
    );
  }
  if (type === 'coffee') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-amber-50/80">
        <circle cx="60" cy="45" r="34" fill="#fef3c7" />
        <rect x="42" y="38" width="36" height="30" rx="6" fill="#78350f" />
        <path d="M78 44 C84 44 86 54 78 58" stroke="#78350f" strokeWidth="3" fill="none" />
        <ellipse cx="60" cy="38" rx="18" ry="4" fill="#d97706" />
        <path d="M54 26 Q56 20 54 14" stroke="#d97706" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M62 28 Q64 22 62 16" stroke="#d97706" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'grocery') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-emerald-50/80">
        <circle cx="60" cy="45" r="34" fill="#ecfdf5" />
        <rect x="40" y="24" width="40" height="46" rx="4" fill="#059669" />
        <rect x="46" y="30" width="28" height="12" rx="2" fill="#a7f3d0" />
        <rect x="46" y="48" width="28" height="4" rx="2" fill="#ffffff" />
        <rect x="46" y="55" width="20" height="4" rx="2" fill="#ffffff" />
      </svg>
    );
  }
  if (type === 'oil') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-yellow-50/80">
        <circle cx="60" cy="45" r="34" fill="#fef9c3" />
        <rect x="46" y="30" width="28" height="40" rx="5" fill="#eab308" />
        <rect x="52" y="22" width="16" height="8" rx="2" fill="#ca8a04" />
        <ellipse cx="60" cy="48" rx="8" ry="12" fill="#fef08a" />
      </svg>
    );
  }
  if (type === 'soda') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-red-50/80">
        <circle cx="60" cy="45" r="34" fill="#fee2e2" />
        <rect x="46" y="26" width="28" height="46" rx="6" fill="#dc2626" />
        <rect x="52" y="20" width="16" height="6" rx="2" fill="#991b1b" />
        <path d="M46 44 Q60 38 74 44" stroke="#ffffff" strokeWidth="3" fill="none" />
      </svg>
    );
  }
  return null;
}

// 3 Perfiles de Negocio
const BUSINESS_MODES = {
  restaurant: {
    id: 'restaurant',
    tag: 'Restaurante & Bar',
    businessName: 'Burger & Bar Gourmet',
    categoryLabel: 'Menú & Cocina',
    hasTables: true,
    hasBarcodes: false,
    navPill: 'Modo Restaurante',
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
      { id: 'm4', name: 'Mesa 4', zone: 'Terraza', status: 'ocupada', totalUsd: 16.5, mins: 'Hace 5m', waiter: 'Valeria R.' },
      { id: 'm5', name: 'Mesa 5', zone: 'Salón', status: 'libre', totalUsd: 0, mins: null, waiter: null },
      { id: 'm6', name: 'Barra 1', zone: 'Barra', status: 'ocupada', totalUsd: 11.0, mins: '8 min', waiter: 'Carlos M.' }
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

// Pasos del Tour Animado: Recorre los DISTINTOS DASHBOARDS del sistema
const DASHBOARD_TOUR_BEATS = [
  // 1. Dashboard de Punto de Venta
  {
    view: 'pos',
    mode: 'restaurant',
    cart: { r1: 1, r2: 1 },
    modal: false,
    cursor: { x: '45%', y: '42%', clicking: true, label: '🛒 Dashboard POS (Caja)' },
    caption: 'Dashboard 1: Punto de Venta con catálogo visual, cobro rápido y cálculo bimoneda $ / Bs.',
    duration: 3000
  },
  // 2. Dashboard de Mesas & Salón
  {
    view: 'tables',
    mode: 'restaurant',
    cart: { r1: 1, r2: 1 },
    modal: false,
    cursor: { x: '35%', y: '40%', clicking: false, label: '🍽️ Dashboard Mesas & Salón' },
    caption: 'Dashboard 2: Mapa interactivo de mesas, comandas automáticas a cocina y cuentas abiertas.',
    duration: 3200
  },
  // 3. Dashboard del Monitor Móvil del Dueño
  {
    view: 'monitor',
    mode: 'restaurant',
    cart: { r1: 1, r2: 1 },
    modal: false,
    cursor: { x: '50%', y: '45%', clicking: false, label: '📱 Monitor del Dueño en Vivo' },
    caption: 'Dashboard 3: Monitoreo en vivo desde el celular: ventas de hoy, pago móvil vs efectivo y arqueo.',
    duration: 3200
  },
  // 4. Dashboard de Libros Fiscales & Reporte Z
  {
    view: 'fiscal',
    mode: 'restaurant',
    cart: { r1: 1, r2: 1 },
    modal: false,
    cursor: { x: '55%', y: '35%', clicking: false, label: '📑 Dashboard Libros & Cierre Z' },
    caption: 'Dashboard 4: Libros de compra y venta, reporte Z diario oficial y exportación de Forma 30.',
    duration: 3200
  },
  // 5. Adaptabilidad a Heladería
  {
    view: 'pos',
    mode: 'ice_cream',
    cart: { h1: 2, h2: 1 },
    modal: false,
    cursor: { x: '48%', y: '42%', clicking: true, label: '🍦 Modo Heladería & Sabores' },
    caption: 'Adaptación como Notion: Cambia a Heladería con tinas por litro, barquillas y café.',
    duration: 3000
  },
  // 6. Adaptabilidad a Retail
  {
    view: 'pos',
    mode: 'retail',
    cart: { b1: 2, b2: 1 },
    modal: false,
    cursor: { x: '46%', y: '42%', clicking: true, label: '🛍️ Modo Retail & Código de Barras' },
    caption: 'Adaptación como Notion: Cambia a Retail con lector de barras, SKU y stock en tiempo real.',
    duration: 3000
  }
];

export default function NotionAppShowcase({ rate = 896.12 }) {
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const userInteractionTimeoutRef = useRef(null);

  // Estados interactivos directos
  const [activeView, setActiveView] = useState('pos'); // 'pos' | 'tables' | 'monitor' | 'fiscal'
  const [activeMode, setActiveMode] = useState('restaurant'); // 'restaurant' | 'ice_cream' | 'retail'
  const [cart, setCart] = useState({ r1: 1, r3: 1 });
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [simulatedPaymentSuccess, setSimulatedPaymentSuccess] = useState(false);

  const activeBeatData = DASHBOARD_TOUR_BEATS[currentBeat] || DASHBOARD_TOUR_BEATS[0];

  // Si está en auto-play, sincronizar vista y modo con el beat
  useEffect(() => {
    if (isAutoPlaying) {
      setActiveView(activeBeatData.view);
      setActiveMode(activeBeatData.mode);
      setCart(activeBeatData.cart);
      setCheckoutModalOpen(activeBeatData.modal);
    }
  }, [currentBeat, isAutoPlaying, activeBeatData]);

  // Temporizador de tour automático
  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = setTimeout(() => {
      setCurrentBeat((prev) => (prev + 1) % DASHBOARD_TOUR_BEATS.length);
    }, activeBeatData.duration || 3000);

    return () => clearTimeout(timer);
  }, [currentBeat, isAutoPlaying, activeBeatData.duration]);

  // Manejador de pausa por interacción humana
  const pauseAutoForUser = () => {
    setIsAutoPlaying(false);
    if (userInteractionTimeoutRef.current) {
      clearTimeout(userInteractionTimeoutRef.current);
    }
    userInteractionTimeoutRef.current = setTimeout(() => {
      setIsAutoPlaying(true);
    }, 10000);
  };

  const handleSelectDashboard = (viewKey) => {
    pauseAutoForUser();
    setActiveView(viewKey);
    setCheckoutModalOpen(false);
  };

  const handleSelectMode = (modeKey) => {
    pauseAutoForUser();
    setActiveMode(modeKey);
    setCheckoutModalOpen(false);
    if (modeKey === 'restaurant') {
      setCart({ r1: 1, r3: 1 });
    } else if (modeKey === 'ice_cream') {
      setCart({ h1: 2, h2: 1 });
    } else {
      setCart({ b1: 2, b2: 1 });
    }
  };

  const addToCart = (product) => {
    pauseAutoForUser();
    setCart((prev) => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1
    }));
  };

  const removeFromCart = (productId) => {
    pauseAutoForUser();
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

  const clearCart = () => {
    pauseAutoForUser();
    setCart({});
  };

  const handleSimulateCheckout = () => {
    pauseAutoForUser();
    setCheckoutModalOpen(true);
    setSimulatedPaymentSuccess(false);
  };

  const handleConfirmSimulatedPayment = () => {
    pauseAutoForUser();
    setSimulatedPaymentSuccess(true);
    setTimeout(() => {
      setCheckoutModalOpen(false);
      setSimulatedPaymentSuccess(false);
      clearCart();
    }, 2200);
  };

  const currentMode = BUSINESS_MODES[activeMode] || BUSINESS_MODES.restaurant;
  const currentCursor = activeBeatData.cursor;

  // Totales de la comanda
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

  return (
    <div className="mt-8 max-w-6xl mx-auto select-none">

      {/* SELECTOR MAESTRO DE LOS DISTINTOS DASHBOARDS (LO QUE EL USUARIO PIDIÓ) */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-4 px-2">
        
        {/* Selector de Dashboards */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-100 border border-zinc-200/90 shadow-2xs overflow-x-auto max-w-full">
          {[
            { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart },
            { id: 'tables', label: 'Mesas & Salón', icon: Utensils },
            { id: 'monitor', label: 'Monitor del Dueño', icon: Smartphone },
            { id: 'fiscal', label: 'Libros Fiscales (Z)', icon: BookOpen }
          ].map((dash) => {
            const Icon = dash.icon;
            const isSelected = activeView === dash.id;
            return (
              <button
                key={dash.id}
                type="button"
                onClick={() => handleSelectDashboard(dash.id)}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isSelected ? 'text-zinc-950 font-black' : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeDashPill"
                    className="absolute inset-0 bg-white rounded-xl shadow-xs border border-zinc-200/80"
                    transition={{ type: 'spring', bounce: 0.18, duration: 0.35 }}
                  />
                )}
                <Icon size={14} className={`relative z-10 ${isSelected ? 'text-emerald-600' : 'text-zinc-500'}`} />
                <span className="relative z-10">{dash.label}</span>
              </button>
            );
          })}
        </div>

        {/* Selector de Perfil de Negocio (Adaptabilidad) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 border border-zinc-200/80 text-xs">
            {Object.entries(BUSINESS_MODES).map(([key, mode]) => {
              const isSelected = activeMode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectMode(key)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
                    isSelected ? 'bg-zinc-900 text-white shadow-2xs' : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  <span>{key === 'restaurant' ? '🍔' : key === 'ice_cream' ? '🍦' : '🛍️'}</span>
                  <span className="hidden sm:inline">{mode.tag.split('&')[0]}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="p-1.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200/80 shadow-2xs text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
            title={isAutoPlaying ? 'Pausar tour automático' : 'Reanudar tour automático'}
          >
            {isAutoPlaying ? <Pause size={12} className="text-zinc-500" /> : <Play size={12} className="text-emerald-600" />}
            <span className="hidden sm:inline">{isAutoPlaying ? 'Pausar' : 'Auto'}</span>
          </button>
        </div>

      </div>

      {/* CÁPSULA EXPLICATIVA DE QUÉ DASHBOARD ESTÁS VIENDO */}
      <div className="mb-3 px-3 py-1.5 rounded-xl bg-zinc-100/90 border border-zinc-200/80 flex items-center justify-between text-xs text-zinc-600">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isAutoPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="font-semibold text-zinc-900">
            {isAutoPlaying ? activeBeatData.caption : `Explorando: ${activeView === 'pos' ? 'Dashboard Punto de Venta' : activeView === 'tables' ? 'Dashboard Mesas & Salón' : activeView === 'monitor' ? 'Dashboard Móvil del Dueño' : 'Dashboard Libros Fiscales SENIAT'}`}
          </span>
        </div>
        <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
          Tasa BCV: {rate.toFixed(2)} Bs/$
        </span>
      </div>

      {/* VENTANA DEL SOFTWARE CON LOS DISTINTOS DASHBOARDS */}
      <div className="relative rounded-2xl p-1.5 sm:p-2 bg-zinc-200/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border border-zinc-300/80">
        <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 flex flex-col md:flex-row h-[560px] text-left">
          
          {/* SIDEBAR DEL SISTEMA */}
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

            {/* Opciones de menú con acceso directo a cada dashboard */}
            <div className="flex-1 overflow-hidden p-2 space-y-3">
              <div>
                <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  Operaciones & Caja
                </div>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => handleSelectDashboard('pos')}
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

                  <button
                    type="button"
                    onClick={() => handleSelectDashboard('tables')}
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
                </div>
              </div>

              <div>
                <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  Finanzas & Legal
                </div>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => handleSelectDashboard('fiscal')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeView === 'fiscal' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <BookOpen size={13} className={activeView === 'fiscal' ? 'text-purple-400' : 'text-zinc-400'} />
                    <span className="flex-1 text-left">Libros Fiscales</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                      SENIAT
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  En la Nube
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectDashboard('monitor')}
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

            {/* Footer con Tasa Oficial */}
            <div className="p-2.5 border-t border-zinc-800 bg-zinc-950/60">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-400 font-medium">Tasa Oficial BCV:</span>
                <span className="text-emerald-400 font-mono font-bold">{rate.toFixed(2)} Bs/$</span>
              </div>
            </div>
          </aside>

          {/* ÁREA DE CONTENIDO: RENDERIZA EL DASHBOARD SELECCIONADO */}
          <main className="flex-1 flex flex-col min-w-0 bg-zinc-50 overflow-hidden relative">
            
            {/* TOPBAR DEL SOFTWARE */}
            <div className="h-11 bg-zinc-900 border-b border-zinc-800 px-3 sm:px-4 flex items-center justify-between shrink-0 text-white">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs text-white">
                  {activeView === 'pos'
                    ? 'Dashboard 1: Punto de Venta & Caja'
                    : activeView === 'tables'
                    ? 'Dashboard 2: Mesas & Salón / Comandas'
                    : activeView === 'monitor'
                    ? 'Dashboard 3: Monitor del Dueño en Celular'
                    : 'Dashboard 4: Libros Fiscales SENIAT & Reporte Z'}
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {currentMode.tag}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-mono text-[10px]">100% Offline-Ready</span>
              </div>
            </div>

            <AnimatePresence mode="wait">

              {/* DASHBOARD 1: PUNTO DE VENTA & CAJA */}
              {activeView === 'pos' && (
                <motion.div
                  key="dash-pos"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex-1 flex flex-col lg:flex-row overflow-hidden"
                >
                  {/* Catálogo de Productos */}
                  <div className="flex-1 flex flex-col overflow-hidden bg-zinc-100/60 p-3">
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

                  {/* Carrito de Comanda */}
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
                                  ${p.priceUsd.toFixed(2)} c/u
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
                </motion.div>
              )}

              {/* DASHBOARD 2: MESAS & SALÓN */}
              {activeView === 'tables' && (
                <motion.div
                  key="dash-tables"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex-1 p-4 overflow-y-auto bg-zinc-100/50"
                >
                  <div className="flex items-center justify-between mb-3 bg-white p-3 rounded-xl border border-zinc-200/80">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-950">Dashboard de Control de Salón y Mesas</h4>
                      <p className="text-[11px] text-zinc-500">Visualiza mesas ocupadas, cuentas abiertas, meseros y rotación.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        4 Cuentas Abiertas
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                        2 Mesas Libres
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {BUSINESS_MODES.restaurant.tables.map((t) => (
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
                </motion.div>
              )}

              {/* DASHBOARD 3: MONITOR DEL DUEÑO EN CELULAR */}
              {activeView === 'monitor' && (
                <motion.div
                  key="dash-monitor"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex-1 p-4 overflow-y-auto bg-zinc-950 text-white flex items-center justify-center"
                >
                  <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Smartphone size={14} className="text-emerald-400" />
                        <span className="text-xs font-bold text-white">Dashboard Móvil del Dueño</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                        En Vivo · Cloud
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
                </motion.div>
              )}

              {/* DASHBOARD 4: LIBROS FISCALES SENIAT & CIERRE Z */}
              {activeView === 'fiscal' && (
                <motion.div
                  key="dash-fiscal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex-1 p-4 overflow-y-auto bg-zinc-100/50"
                >
                  <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs overflow-hidden">
                    <div className="p-3 border-b border-zinc-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-purple-100 text-purple-800">
                          <BookOpen size={14} />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-zinc-950">Dashboard Fiscal & Libro de Ventas</h4>
                          <span className="text-[10px] text-zinc-500">Impresora HKA80 (Z1B8049210) · Reporte Z #0142 al día</span>
                        </div>
                      </div>

                      <div className="px-2.5 py-1 rounded-lg bg-zinc-950 text-white text-[11px] font-bold flex items-center gap-1">
                        <Download size={12} />
                        <span>Excel Forma 30</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] font-mono">
                        <thead className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200 text-[10px] uppercase">
                          <tr>
                            <th className="py-2 px-3">Factura</th>
                            <th className="py-2 px-3">RIF / Cliente</th>
                            <th className="py-2 px-3">Serial</th>
                            <th className="py-2 px-3 text-right">Base 16%</th>
                            <th className="py-2 px-3 text-right">IVA 16%</th>
                            <th className="py-2 px-3 text-right">Total Bs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {[
                            { num: '00048291', rif: 'J-40129381-2 · Inversiones Kroma', serial: 'Z1B8049210', usd: 28.5 },
                            { num: '00048290', rif: 'V-19842104-3 · Carlos Mendoza', serial: 'Z1B8049210', usd: 19.0 },
                            { num: '00048289', rif: 'V-00000000-0 · Consumidor Final', serial: 'Z1B8049210', usd: 42.0 },
                            { num: '00048288', rif: 'J-31094821-0 · Alimentos Los Andes', serial: 'Z1B8049210', usd: 64.5 }
                          ].map((row) => {
                            const totalRowBs = row.usd * rate;
                            const baseRowBs = totalRowBs / 1.16;
                            const ivaRowBs = totalRowBs - baseRowBs;
                            return (
                              <tr key={row.num} className="hover:bg-zinc-50">
                                <td className="py-2 px-3 font-bold text-zinc-950">#{row.num}</td>
                                <td className="py-2 px-3 font-sans truncate max-w-[150px]">{row.rif}</td>
                                <td className="py-2 px-3 text-zinc-500">{row.serial}</td>
                                <td className="py-2 px-3 text-right">{formatBs(baseRowBs)}</td>
                                <td className="py-2 px-3 text-right text-emerald-700">{formatBs(ivaRowBs)}</td>
                                <td className="py-2 px-3 text-right font-bold text-zinc-950">{formatBs(totalRowBs)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

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
                      <motion.div
                        initial={{ scale: 0.5, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', bounce: 0.4 }}
                        className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto"
                      >
                        <Check size={24} />
                      </motion.div>
                      <h4 className="font-bold text-sm text-zinc-950">¡Venta Registrada e Impresa!</h4>
                      <p className="text-xs text-zinc-500">
                        Ticket fiscal emitido con éxito. El inventario y la caja se actualizaron al instante.
                      </p>
                      <div className="mt-2 p-2 rounded-xl bg-zinc-50 border border-zinc-200/80 text-[10px] font-mono text-zinc-700">
                        <span>HKA80 · FACTURA FISCAL #0084 · TASA {rate.toFixed(2)}</span>
                      </div>
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

            {/* CURSOR VIRTUAL ANIMADO ESTILO NOTION */}
            {isAutoPlaying && (
              <motion.div
                animate={{
                  left: currentCursor.x,
                  top: currentCursor.y,
                  scale: currentCursor.clicking ? 0.84 : 1
                }}
                transition={{
                  left: { type: 'spring', damping: 28, stiffness: 220 },
                  top: { type: 'spring', damping: 28, stiffness: 220 },
                  scale: { duration: 0.12 }
                }}
                className="absolute z-50 pointer-events-none -ml-1 -mt-1 hidden sm:flex items-center gap-1.5"
              >
                {currentCursor.clicking && (
                  <motion.div
                    key={`click-ripple-${currentBeat}`}
                    initial={{ scale: 0.3, opacity: 0.9 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute -top-2.5 -left-2.5 w-8 h-8 rounded-full border-2 border-emerald-500 bg-emerald-400/20 pointer-events-none"
                  />
                )}

                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="drop-shadow-xl">
                  <path
                    d="M4 3L11.5 20L14.2 13.2L21 10.5L4 3Z"
                    fill="#09090b"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>

                <motion.span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-950 text-white shadow-lg border border-zinc-800 whitespace-nowrap flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{currentCursor.label}</span>
                </motion.span>
              </motion.div>
            )}

          </main>
        </div>
      </div>

      {/* INDICADORES DE VISTA INFERIORES CON ACCESO DIRECTO */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'pos', label: '1. Punto de Venta', icon: '🛒' },
            { id: 'tables', label: '2. Mesas & Salón', icon: '🍽️' },
            { id: 'monitor', label: '3. Monitor Móvil', icon: '📱' },
            { id: 'fiscal', label: '4. Libros Fiscales', icon: '📑' }
          ].map((item) => {
            const isCurrent = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectDashboard(item.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  isCurrent
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                    : 'bg-white text-zinc-500 border-zinc-200 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {isCurrent && isAutoPlaying && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-zinc-400 font-medium">
          💡 Haz clic en cualquier pestaña para ver ese dashboard al instante
        </div>
      </div>

    </div>
  );
}
