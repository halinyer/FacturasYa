import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Utensils,
  LayoutDashboard,
  BookOpen,
  Calculator,
  Boxes,
  Package,
  Users,
  TrendingUp,
  Settings,
  Search,
  Plus,
  Printer,
  CheckCircle2,
  QrCode,
  FileSpreadsheet,
  Download,
  ChefHat,
  Bell,
  Clock
} from 'lucide-react';

// Ilustraciones vectoriales instantáneas (0ms de carga, sin peticiones externas que retrasen la animación)
function ProductGraphic({ type }) {
  if (type === 'burger') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-amber-50/70">
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
      <svg viewBox="0 0 120 90" className="w-full h-full bg-orange-50/70">
        <circle cx="60" cy="45" r="34" fill="#ffedd5" />
        <rect x="24" y="34" width="72" height="22" rx="11" fill="#d97706" />
        <rect x="28" y="39" width="64" height="7" rx="3.5" fill="#78350f" />
        <path d="M30 41 Q40 36, 50 41 T70 41 T90 41" stroke="#facc15" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'fries') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-yellow-50/70">
        <circle cx="60" cy="45" r="34" fill="#fef9c3" />
        <rect x="42" y="20" width="6" height="28" rx="2" fill="#eab308" />
        <rect x="50" y="17" width="6" height="30" rx="2" fill="#facc15" />
        <rect x="58" y="19" width="6" height="28" rx="2" fill="#eab308" />
        <rect x="66" y="18" width="6" height="29" rx="2" fill="#facc15" />
        <rect x="74" y="22" width="6" height="25" rx="2" fill="#ca8a04" />
        <path d="M38 42 L82 42 L76 68 L44 68 Z" fill="#dc2626" />
        <circle cx="60" cy="55" r="6" fill="#fef2f2" />
      </svg>
    );
  }
  if (type === 'wings') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-red-50/60">
        <circle cx="60" cy="45" r="34" fill="#fee2e2" />
        <ellipse cx="52" cy="46" rx="18" ry="11" transform="rotate(-18 52 46)" fill="#b45309" />
        <ellipse cx="68" cy="50" rx="16" ry="10" transform="rotate(15 68 50)" fill="#92400e" />
        <circle cx="82" cy="43" r="4" fill="#fef3c7" />
      </svg>
    );
  }
  if (type === 'drink') {
    return (
      <svg viewBox="0 0 120 90" className="w-full h-full bg-sky-50/60">
        <circle cx="60" cy="45" r="34" fill="#e0f2fe" />
        <path d="M64 16 L70 16 L63 30" stroke="#0284c7" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M44 28 L76 28 L72 68 L48 68 Z" fill="#f59e0b" opacity="0.85" />
        <rect x="42" y="25" width="36" height="4" rx="2" fill="#ffffff" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 90" className="w-full h-full bg-zinc-100">
      <circle cx="60" cy="45" r="34" fill="#e4e4e7" />
      <path d="M46 34 L74 34 L70 68 L50 68 Z" fill="#52525b" />
      <path d="M44 34 Q60 18, 76 34 Z" fill="#fafafa" />
      <circle cx="60" cy="22" r="3.5" fill="#e11d48" />
    </svg>
  );
}

const SHOWCASE_PRODUCTS = [
  {
    id: 'p1',
    name: 'Smash Burger Doble',
    description: 'Doble carne, cheddar y tocineta',
    category: 'Hamburguesas',
    priceUsd: 7.5,
    art: 'burger'
  },
  {
    id: 'p2',
    name: 'Pepito Lomito 35cm',
    description: 'Lomito, maíz, papas y queso',
    category: 'Pepitos',
    priceUsd: 9.0,
    art: 'pepito'
  },
  {
    id: 'p3',
    name: 'Papas Rústicas',
    description: 'Con queso fundido y tocineta',
    category: 'Entradas',
    priceUsd: 4.5,
    art: 'fries'
  },
  {
    id: 'p4',
    name: 'Alitas BBQ (8 und)',
    description: 'Salsa BBQ artesanal y ajonjolí',
    category: 'Entradas',
    priceUsd: 6.5,
    art: 'wings'
  },
  {
    id: 'p5',
    name: 'Té Frío Durazno',
    description: 'Vaso grande con limón',
    category: 'Bebidas',
    priceUsd: 2.5,
    art: 'drink'
  },
  {
    id: 'p6',
    name: 'Merengada Brownie',
    description: 'Helado cremoso con brownie',
    category: 'Bebidas',
    priceUsd: 5.0,
    art: 'shake'
  }
];

const SHOWCASE_TABLES = [
  { id: 't1', name: 'Mesa 1', zone: 'Salón', status: 'ocupada', waiter: 'Carlos M.', totalUsd: 24.0, mins: '18 min' },
  { id: 't2', name: 'Mesa 2', zone: 'Salón', status: 'libre', waiter: null, totalUsd: 0, mins: null },
  { id: 't3', name: 'Mesa 3', zone: 'Salón', status: 'cuenta', waiter: 'Valeria R.', totalUsd: 38.5, mins: '42 min' },
  { id: 't4', name: 'Mesa 4', zone: 'Terraza', status: 'ocupada', waiter: 'Valeria R.', totalUsd: 19.5, mins: 'Hace 1m' },
  { id: 't5', name: 'Mesa 5', zone: 'Terraza', status: 'libre', waiter: null, totalUsd: 0, mins: null },
  { id: 't6', name: 'Barra 1', zone: 'Barra', status: 'ocupada', waiter: 'Andrés S.', totalUsd: 11.5, mins: '12 min' }
];

const NAV_SECTIONS = [
  {
    title: 'Operaciones',
    items: [
      { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart, badge: 'Caja' },
      { id: 'tables', label: 'Mesas & Salón', icon: Utensils, badge: 'Salas' }
    ]
  },
  {
    title: 'Catálogo & Insumos',
    items: [
      { id: 'products', label: 'Menú & Productos', icon: Package },
      { id: 'inventory', label: 'Inventario & Stock', icon: Boxes },
      { id: 'clients', label: 'Clientes & Crédito', icon: Users }
    ]
  },
  {
    title: 'Administración & SENIAT',
    items: [
      { id: 'dashboard', label: 'Dashboard de Ventas', icon: LayoutDashboard },
      { id: 'fiscal', label: 'Libros SENIAT', icon: BookOpen, badge: 'Legal' },
      { id: 'cash-close', label: 'Cierre de Caja', icon: Calculator, badge: 'Arqueo' }
    ]
  },
  {
    title: 'En la Nube',
    items: [
      { id: 'monitor', label: 'Monitor del Dueño', icon: TrendingUp, badge: 'En vivo' }
    ]
  }
];

function formatBs(val) {
  return 'Bs. ' + Number(val || 0).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export default function NotionAppShowcase({ rate = 896.12 }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const durations = [1400, 1200, 1200, 1300, 2400, 1400, 2300, 1400, 2400];
    const timer = setTimeout(() => {
      setStep((prev) => (prev + 1) % durations.length);
    }, durations[step]);
    return () => clearTimeout(timer);
  }, [step]);

  const activeTab = step <= 4 ? 'pos' : step <= 6 ? 'tables' : 'fiscal';

  const cartCounts = {
    p1: step >= 1 ? 2 : 1,
    p2: step >= 2 ? 1 : 0,
    p3: step >= 3 ? 1 : 0
  };

  const totalQty = (cartCounts.p1 || 0) + (cartCounts.p2 || 0) + (cartCounts.p3 || 0);
  const totalUsd = cartCounts.p1 * 7.5 + cartCounts.p2 * 9.0 + cartCounts.p3 * 4.5;
  const totalBs = totalUsd * rate;

  const cursorPositions = [
    { x: '38%', y: '38%', clicking: false },
    { x: '36%', y: '41%', clicking: true },
    { x: '58%', y: '41%', clicking: true },
    { x: '79%', y: '41%', clicking: true },
    { x: '68%', y: '90%', clicking: true },
    { x: '11%', y: '27%', clicking: true },
    { x: '74%', y: '46%', clicking: false },
    { x: '11%', y: '61%', clicking: true },
    { x: '84%', y: '22%', clicking: true }
  ];
  const currentCursor = cursorPositions[step] || cursorPositions[0];

  const currentNavMeta =
    activeTab === 'pos'
      ? { label: 'Punto de Venta', badge: 'Caja' }
      : activeTab === 'tables'
      ? { label: 'Mesas & Salón', badge: 'Salas' }
      : { label: 'Libros SENIAT', badge: 'Legal' };

  return (
    <div className="mt-12 max-w-6xl mx-auto select-none pointer-events-none" aria-hidden="true">
      <div className="relative rounded-2xl p-1.5 sm:p-2 bg-zinc-200/70 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.14)] border border-zinc-200">
        {/* VENTANA DE LA APLICACIÓN REAL */}
        <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 flex h-[480px] sm:h-[540px] text-left">
          
          {/* SIDEBAR */}
          <aside className="hidden md:flex w-56 flex-col bg-zinc-900 text-zinc-300 border-r border-zinc-800 shrink-0">
            <div className="p-3 border-b border-zinc-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                  FY
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-white tracking-tight truncate">
                    El Portón Grill C.A.
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="text-[9px] text-zinc-400 font-semibold truncate">
                      Caja principal activa
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-1 rounded-lg text-zinc-400">
                <Settings size={13} />
              </div>
            </div>

            <div className="flex-1 overflow-hidden p-2 space-y-2.5">
              {NAV_SECTIONS.map((section) => (
                <div key={section.title} className="space-y-0.5">
                  <div className="px-2 pt-0.5 pb-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                    {section.title}
                  </div>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                          isActive ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400'
                        }`}
                      >
                        <Icon
                          size={14}
                          className={isActive ? 'text-emerald-400' : 'text-zinc-400'}
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`text-[8px] px-1.5 py-0.2 rounded-full font-bold ${
                              item.badge === 'Caja'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : item.badge === 'Legal'
                                ? 'bg-sky-500/20 text-sky-300'
                                : item.badge === 'Salas'
                                ? 'bg-amber-500/20 text-amber-300'
                                : item.badge === 'Arqueo'
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="p-2 border-t border-zinc-800">
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-800/80 border border-zinc-700/60">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-zinc-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                    P
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold text-zinc-200 truncate">
                      caja@elporton.com
                    </span>
                    <span className="text-[8px] text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                      HKA80 · COM4 Activa
                    </span>
                  </div>
                </div>
                <Settings size={12} className="text-zinc-400 shrink-0" />
              </div>
            </div>
          </aside>

          {/* CONTENIDO PRINCIPAL */}
          <div className="flex-1 flex flex-col min-w-0 bg-zinc-50 overflow-hidden relative">
            
            {/* TOPBAR */}
            <div className="h-11 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0 text-white">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs tracking-tight text-white">
                  {currentNavMeta.label}
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {currentNavMeta.badge}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-xl px-2.5 py-1 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-zinc-400 font-semibold">BCV:</span>
                  <span className="text-white font-extrabold font-mono">{rate.toFixed(2)} Bs/$</span>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 pl-2 ml-1 border-l border-zinc-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700"></span>
                </div>
              </div>
            </div>

            {/* ESCENAS */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
              <AnimatePresence mode="wait">
                
                {/* ESCENA 1: PUNTO DE VENTA */}
                {activeTab === 'pos' && (
                  <motion.div
                    key="scene-pos"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex-1 flex flex-col h-full bg-zinc-50 overflow-hidden relative"
                  >
                    <div className="bg-white border-b border-zinc-200/80 px-4 py-2 shrink-0 flex items-center justify-between gap-3">
                      <div className="relative flex-1 max-w-xs">
                        <Search size={13} className="absolute left-2.5 top-2 text-zinc-400" />
                        <div className="w-full pl-8 pr-3 py-1 rounded-xl border border-zinc-200 text-[11px] text-zinc-400 bg-zinc-50/50">
                          Buscar plato, combo o bebida...
                        </div>
                      </div>

                      <div className="px-2.5 py-1 rounded-xl border bg-zinc-950 text-white border-zinc-950 text-[11px] font-bold flex items-center gap-1.5">
                        <ShoppingCart size={13} className="text-emerald-400" />
                        <span>Comanda</span>
                        <span className="px-1.5 py-0.2 rounded-full font-mono text-[10px] bg-zinc-800 text-emerald-300 font-bold">
                          {totalQty}
                        </span>
                        <span className="font-mono text-zinc-300 text-[10px] border-l border-zinc-700 pl-1.5">
                          ${totalUsd.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white px-4 py-1.5 border-b border-zinc-200/80 flex items-center gap-1.5 shrink-0">
                      {[
                        { name: 'Todos', count: 6, active: true },
                        { name: 'Hamburguesas', count: 2, active: false },
                        { name: 'Pepitos', count: 1, active: false },
                        { name: 'Entradas', count: 2, active: false },
                        { name: 'Bebidas', count: 2, active: false }
                      ].map((cat) => (
                        <div
                          key={cat.name}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold flex items-center gap-1 ${
                            cat.active ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          <span>{cat.name}</span>
                          <span
                            className={`text-[9px] px-1 rounded-full font-bold ${
                              cat.active ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-600'
                            }`}
                          >
                            {cat.count}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex-1 p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 overflow-hidden">
                      {SHOWCASE_PRODUCTS.map((p) => {
                        const qty = cartCounts[p.id] || 0;
                        const priceBs = p.priceUsd * rate;

                        return (
                          <div
                            key={p.id}
                            className={`rounded-2xl border bg-white overflow-hidden flex flex-col justify-between transition-colors ${
                              qty > 0
                                ? 'border-zinc-950 ring-1 ring-zinc-950/20'
                                : 'border-zinc-200/80'
                            }`}
                          >
                            <div className="h-22 sm:h-26 w-full overflow-hidden relative">
                              <ProductGraphic type={p.art} />
                              <div className="absolute top-1.5 left-1.5">
                                <span className="px-1.5 py-0.5 rounded-md font-bold text-[8px] bg-emerald-600 text-white">
                                  IVA 16%
                                </span>
                              </div>
                              {qty > 0 && (
                                <div className="absolute top-1.5 right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-zinc-950 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
                                  {qty}
                                </div>
                              )}
                            </div>

                            <div className="p-2.5 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="font-bold text-[11px] text-zinc-950 truncate">
                                  {p.name}
                                </div>
                                <div className="text-[9px] text-zinc-400 truncate">
                                  {p.description}
                                </div>
                              </div>

                              <div className="pt-1.5 mt-1 border-t border-zinc-100 flex items-baseline justify-between">
                                <div>
                                  <span className="text-xs font-extrabold text-zinc-950 font-mono">
                                    ${p.priceUsd.toFixed(2)}
                                  </span>
                                  <span className="text-[9px] text-zinc-400 font-mono block leading-tight">
                                    {formatBs(priceBs)}
                                  </span>
                                </div>
                                <div
                                  className={`w-5 h-5 rounded-lg flex items-center justify-center ${
                                    qty > 0 ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'
                                  }`}
                                >
                                  <Plus size={11} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Barra Inferior Unificada */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-zinc-950 text-white p-1.5 rounded-2xl shadow-xl border border-zinc-800">
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-900 text-[11px] font-semibold">
                        <ShoppingCart size={13} className="text-emerald-400" />
                        <span className="font-bold">{totalQty} ítems</span>
                        <span className="font-mono text-emerald-300 font-bold border-l border-zinc-700 pl-2">
                          ${totalUsd.toFixed(2)}
                        </span>
                      </div>

                      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 text-zinc-200 text-[11px] font-semibold border border-zinc-800">
                        <ChefHat size={13} className="text-amber-400" />
                        <span>Comanda</span>
                      </div>

                      <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 text-zinc-950 font-extrabold text-[11px]">
                        <Printer size={13} />
                        <span>Cobrar / Facturar</span>
                      </div>
                    </div>

                    {/* Confirmación de Factura Fiscal en Paso 4 */}
                    <AnimatePresence>
                      {step === 4 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.18 }}
                          className="absolute inset-0 z-30 bg-zinc-950/30 flex items-center justify-center p-4"
                        >
                          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-xs w-full p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                                  <CheckCircle2 size={16} />
                                </div>
                                <div>
                                  <div className="text-xs font-extrabold text-zinc-950">
                                    Factura Fiscal Emitida
                                  </div>
                                  <div className="text-[10px] text-emerald-700 font-semibold">
                                    The Factory HKA80 · COM4
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono text-[10px] font-bold bg-zinc-100 px-2 py-0.5 rounded text-zinc-800">
                                #00048291
                              </span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 font-mono text-[10px] space-y-1 text-zinc-700">
                              <div className="flex justify-between">
                                <span>2x SMASH BURGER DOBLE</span>
                                <span className="font-bold text-zinc-950">{formatBs(15 * rate)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>1x PEPITO LOMITO 35CM</span>
                                <span className="font-bold text-zinc-950">{formatBs(9 * rate)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>1x PAPAS RÚSTICAS</span>
                                <span className="font-bold text-zinc-950">{formatBs(4.5 * rate)}</span>
                              </div>
                              <div className="border-t border-dashed border-zinc-300 pt-1 mt-1 flex justify-between font-bold text-zinc-950 text-[11px]">
                                <span>TOTAL ($28.50):</span>
                                <span>{formatBs(totalBs)}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-zinc-500">
                              <span>Pago Mixto: $10 Efectivo + Pago Móvil</span>
                              <span className="text-emerald-700 font-bold">Impresa</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* ESCENA 2: MESAS & SALÓN */}
                {activeTab === 'tables' && (
                  <motion.div
                    key="scene-tables"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex-1 flex flex-col h-full bg-zinc-50 overflow-hidden relative"
                  >
                    <div className="bg-white border-b border-zinc-200/80 px-5 py-3 shrink-0 flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-zinc-100 text-zinc-700">
                            <Utensils size={14} />
                          </span>
                          <span className="text-sm font-bold text-zinc-950">
                            Control de Salón y Comandas
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            2 Libres · 4 Ocupadas
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          Pedidos de mesoneros por QR y cuentas abiertas en vivo
                        </p>
                      </div>

                      <div className="hidden sm:flex items-center gap-1.5">
                        <div className="px-2.5 py-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200/80 text-[10px] font-bold flex items-center gap-1.5">
                          <QrCode size={12} className="text-sky-600" />
                          <span>Vincular Tablets (QR)</span>
                        </div>
                        <div className="px-2.5 py-1.5 rounded-xl bg-zinc-950 text-white text-[10px] font-bold flex items-center gap-1.5">
                          <ShoppingCart size={12} className="text-emerald-400" />
                          <span>Punto de Venta</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 overflow-hidden">
                      {SHOWCASE_TABLES.map((t) => {
                        const isOccupied = t.status === 'ocupada';
                        const isBill = t.status === 'cuenta';
                        const isNewQr = step === 6 && t.id === 't4';

                        return (
                          <div
                            key={t.id}
                            className={`bg-white rounded-2xl border p-3.5 flex flex-col justify-between transition-colors ${
                              isNewQr
                                ? 'border-emerald-500 ring-2 ring-emerald-200'
                                : isBill
                                ? 'border-sky-300'
                                : isOccupied
                                ? 'border-amber-300'
                                : 'border-zinc-200/80'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-extrabold text-xs text-zinc-950">{t.name}</div>
                                <div className="text-[10px] text-zinc-500">Zona: {t.zone}</div>
                              </div>
                              <span
                                className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                                  isBill
                                    ? 'bg-sky-100 text-sky-800'
                                    : isOccupied
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {isBill ? 'Pre-Cuenta' : isOccupied ? 'Ocupada' : 'Libre'}
                              </span>
                            </div>

                            {t.status !== 'libre' ? (
                              <div className="pt-2 border-t border-zinc-100 space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                                  <span>Mesero: {t.waiter}</span>
                                  <span className="inline-flex items-center gap-0.5">
                                    <Clock size={10} /> {t.mins}
                                  </span>
                                </div>
                                <div className="flex items-baseline justify-between">
                                  <span className="text-xs font-extrabold text-zinc-950 font-mono">
                                    ${t.totalUsd.toFixed(2)}
                                  </span>
                                  <span className="text-[10px] text-zinc-500 font-mono">
                                    {formatBs(t.totalUsd * rate)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="pt-2 border-t border-zinc-100 text-[10px] text-zinc-400">
                                Mesa libre
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <AnimatePresence>
                      {step === 6 && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.18 }}
                          className="absolute top-14 right-4 z-30 bg-zinc-950 text-white rounded-2xl border border-zinc-800 shadow-xl p-3.5 max-w-xs flex items-start gap-3"
                        >
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                            <Bell size={15} />
                          </div>
                          <div className="text-[11px] space-y-0.5">
                            <div className="font-extrabold text-white flex items-center gap-1.5">
                              <span>Comanda recibida</span>
                              <span className="text-[9px] bg-emerald-500 text-zinc-950 font-black px-1.5 py-0.2 rounded">
                                MESA 4
                              </span>
                            </div>
                            <p className="text-zinc-300 text-[10px]">
                              Mesonero: <strong>Valeria R.</strong> · 2x Smash Burger + 1x Té Frío enviados a cocina.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* ESCENA 3: LIBROS FISCALES SENIAT */}
                {activeTab === 'fiscal' && (
                  <motion.div
                    key="scene-fiscal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex-1 flex flex-col h-full bg-zinc-50 overflow-hidden relative"
                  >
                    <div className="bg-white border-b border-zinc-200/80 px-5 py-3 shrink-0 flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-zinc-100 text-zinc-700">
                            <BookOpen size={14} />
                          </span>
                          <span className="text-sm font-bold text-zinc-950">
                            Libros Fiscales SENIAT
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          Libro de Ventas, Compras y Cierres Z listos para tu contador
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div className="hidden sm:flex px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-[10px] font-bold items-center gap-1">
                          <FileSpreadsheet size={12} className="text-amber-700" />
                          <span>Memoria Fiscal Z</span>
                        </div>
                        <div className="px-2.5 py-1.5 rounded-xl bg-zinc-950 text-white text-[10px] font-bold flex items-center gap-1">
                          <Download size={12} />
                          <span>Exportar Excel SENIAT</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-3 flex-1 overflow-hidden">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-white p-3 rounded-xl border border-zinc-200/80">
                          <span className="text-[9px] font-bold uppercase text-zinc-400 block">
                            Total Facturado
                          </span>
                          <span className="text-xs font-extrabold text-zinc-950 font-mono mt-0.5 block">
                            {formatBs(1485.5 * rate)}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-zinc-200/80">
                          <span className="text-[9px] font-bold uppercase text-zinc-400 block">
                            Base Imponible 16%
                          </span>
                          <span className="text-xs font-extrabold text-zinc-950 font-mono mt-0.5 block">
                            {formatBs(1280.6 * rate)}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-zinc-200/80">
                          <span className="text-[9px] font-bold uppercase text-zinc-400 block">
                            IVA 16%
                          </span>
                          <span className="text-xs font-extrabold text-emerald-700 font-mono mt-0.5 block">
                            {formatBs(204.9 * rate)}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-zinc-200/80">
                          <span className="text-[9px] font-bold uppercase text-zinc-400 block">
                            IGTF 3%
                          </span>
                          <span className="text-xs font-extrabold text-amber-700 font-mono mt-0.5 block">
                            {formatBs(18.4 * rate)}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-zinc-200/80 overflow-hidden">
                        <div className="px-3.5 py-2 bg-zinc-50 border-b border-zinc-200/80 flex items-center justify-between text-[10px] font-bold text-zinc-600">
                          <span>LIBRO DE VENTAS · IMPRESORA HKA80 (Z1B8049210)</span>
                          <span className="text-emerald-700">Reporte Z #0142 al día</span>
                        </div>
                        <table className="w-full text-left border-collapse text-[10px]">
                          <thead>
                            <tr className="border-b border-zinc-100 text-zinc-400 uppercase text-[9px]">
                              <th className="py-2 px-3">Factura</th>
                              <th className="py-2 px-3">RIF / Cliente</th>
                              <th className="py-2 px-3">Serial</th>
                              <th className="py-2 px-3 text-right">Base 16%</th>
                              <th className="py-2 px-3 text-right">IVA 16%</th>
                              <th className="py-2 px-3 text-right">Total Bs</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 font-mono text-zinc-700">
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
                                <tr key={row.num} className="bg-white">
                                  <td className="py-2 px-3 font-bold text-zinc-950">#{row.num}</td>
                                  <td className="py-2 px-3 font-sans truncate max-w-[160px]">{row.rif}</td>
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
            </div>
          </div>

          {/* CURSOR ANIMADO LIGERO */}
          <motion.div
            animate={{
              left: currentCursor.x,
              top: currentCursor.y,
              scale: currentCursor.clicking ? 0.88 : 1
            }}
            transition={{
              left: { type: 'tween', duration: 0.38, ease: 'easeOut' },
              top: { type: 'tween', duration: 0.38, ease: 'easeOut' },
              scale: { duration: 0.15 }
            }}
            className="hidden sm:block absolute z-40 pointer-events-none"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="drop-shadow-md">
              <path
                d="M4 3L11.5 20L14.2 13.2L21 10.5L4 3Z"
                fill="#09090b"
                stroke="#ffffff"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        </div>
      </div>

      {/* INDICADORES DE VISTA */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {[
          { id: 'pos', label: 'Punto de Venta' },
          { id: 'tables', label: 'Mesas y Comandas' },
          { id: 'fiscal', label: 'Libros SENIAT' }
        ].map((scene) => {
          const isCurrent = activeTab === scene.id;
          return (
            <div
              key={scene.id}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors flex items-center gap-1.5 border ${
                isCurrent
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-400 border-zinc-200/70'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-emerald-400' : 'bg-zinc-300'}`} />
              <span>{scene.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
