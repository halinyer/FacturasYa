import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Printer,
  QrCode,
  FileSpreadsheet,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Download,
  Layers,
  Store,
  X,
  DollarSign,
  Zap,
  TrendingUp,
  Sparkles,
  Barcode,
  Boxes,
  Package,
  HelpCircle,
  ExternalLink,
  Utensils,
  ChevronRight,
  Check
} from 'lucide-react';
import { supabase, isConfigured } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../../pos-core/services/dataService';
import NotionAppShowcase from './NotionAppShowcase';

const INSTALLER_URL =
  import.meta.env.VITE_INSTALLER_URL || 'https://github.com/halinyer/FacturasYa/releases/latest/download/FacturaPOS-1.0.0.exe';

export default function LandingPage() {
  const navigate = useNavigate();
  const { session, isAdmin } = useAuth() || {};
  const [bcvRate, setBcvRate] = useState(896.12);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'

  useEffect(() => {
    db.getExchangeRate(false)
      .then((liveRate) => {
        if (liveRate && Number(liveRate) > 10) {
          setBcvRate(Number(liveRate));
        }
      })
      .catch(() => {});
  }, []);

  // Modal de Autenticación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState('signup'); // 'signup' | 'login'
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [emailCheckNotice, setEmailCheckNotice] = useState(false);

  const openAuthModal = (tab = 'signup') => {
    setAuthTab(tab);
    setFormError('');
    setEmailCheckNotice(false);
    setIsModalOpen(true);
  };
  const openTrialModal = () => openAuthModal('signup');

  const passwordStrength = useMemo(() => {
    const pass = form.password || '';
    if (!pass) return { score: 0, label: '', color: 'bg-zinc-200', textClass: 'text-zinc-400' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Débil', color: 'bg-red-500', textClass: 'text-red-600' };
    if (score <= 2) return { score: 2, label: 'Regular', color: 'bg-amber-500', textClass: 'text-amber-600' };
    if (score <= 3) return { score: 3, label: 'Buena', color: 'bg-sky-500', textClass: 'text-sky-600' };
    return { score: 4, label: 'Excelente', color: 'bg-emerald-500', textClass: 'text-emerald-600' };
  }, [form.password]);

  const rate = Math.max(1, Number(bcvRate) || 896.12);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setEmailCheckNotice(false);

    try {
      const cleanEmail = form.email.trim().toLowerCase();
      if (!cleanEmail || !form.password) {
        throw new Error('Por favor ingresa tu correo y contraseña.');
      }

      if (authTab === 'signup') {
        if (form.password.length < 6) {
          throw new Error('La contraseña debe tener un mínimo de 6 caracteres.');
        }
        if (form.password !== form.confirmPassword) {
          throw new Error('Las contraseñas no coinciden. Por favor escríbelas iguales.');
        }
      }

      if (isConfigured && supabase) {
        if (authTab === 'signup') {
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password: form.password
          });

          if (error) {
            if (error.message.includes('already registered') || error.status === 422) {
              throw new Error('Este correo ya está registrado en FacturasYa. Haz clic en "Iniciar sesión" arriba.');
            }
            throw new Error(error.message);
          }

          if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
            throw new Error('Este correo ya se encuentra registrado. Por favor selecciona "Iniciar sesión" o recupera tu contraseña.');
          }

          if (data?.user && !data?.session) {
            setEmailCheckNotice(true);
            return;
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: form.password
          });

          if (error) {
            if (error.message.includes('Invalid login credentials')) {
              throw new Error('Correo o contraseña incorrectos. Verifica e intenta nuevamente.');
            }
            if (error.message.includes('Email not confirmed')) {
              throw new Error('Debes confirmar tu correo electrónico antes de ingresar. Revisa tu bandeja de entrada.');
            }
            throw new Error(error.message);
          }
        }
      }

      if (cleanEmail === 'signalnotestudio@gmail.com') {
        navigate('/super-admin');
      } else {
        navigate('/app');
      }
    } catch (err) {
      setFormError(err.message || 'Error al procesar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans antialiased selection:bg-zinc-900 selection:text-white">

      {/* BARRA DE NAVEGACIÓN PRINCIPAL */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-zinc-200/70 transition-all">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
              FY
            </div>
            <span className="font-bold text-base tracking-tight text-zinc-950">FacturasYa</span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600">
            <a href="#experiencia" className="hover:text-zinc-950 transition-colors">¿Cómo funciona?</a>
            <a href="#cualidades" className="hover:text-zinc-950 transition-colors">Cualidades</a>
            <a href="#fiscal" className="hover:text-zinc-950 transition-colors">Tranquilidad Fiscal</a>
            <a href="#comparativa" className="hover:text-zinc-950 transition-colors">Ventajas</a>
            <a href="#precios" className="hover:text-zinc-950 transition-colors">Precios</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {session ? (
              <>
                <Link
                  to="/app"
                  className="bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs hover:shadow transition-all inline-flex items-center gap-1.5 active:scale-98"
                >
                  <Store size={14} />
                  <span>Ir a mi POS</span>
                </Link>
                {isAdmin && (
                  <Link
                    to="/super-admin"
                    className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                  >
                    Super Admin
                  </Link>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('signup')}
                  className="bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs hover:shadow transition-all inline-flex items-center gap-1.5 active:scale-98 cursor-pointer"
                >
                  <span>Probar 14 días gratis</span>
                  <ArrowRight size={13} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION MODERNO (SIN FRICCIÓN NI MENCIÓN AL SENIAT AL ENTRAR) */}
      <section className="relative pt-14 pb-16 overflow-hidden bg-gradient-to-b from-zinc-50/70 via-white to-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto space-y-6">

            {/* Pill Hook Moderno y Positivo */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100/90 border border-zinc-200/90 text-xs font-semibold text-zinc-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Punto de venta moderno, ultra-rápido y modular · Diseñado para Venezuela
            </div>

            {/* Titular Aspiracional y Conciso */}
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-950 leading-[1.12]">
              El punto de venta moderno que se adapta a tu negocio.
            </h1>

            {/* Subtítulo enfocado en agilidad, control y simplicidad Notion */}
            <p className="text-base sm:text-lg text-zinc-600 leading-relaxed max-w-2xl mx-auto font-normal">
              Cobra en segundos fijando precios en dólares a tasa oficial BCV, gestiona mesas o mostrador, controla tu inventario y audita cada bolívar y dólar en vivo desde tu celular. Diseñado con la simplicidad de Notion y la velocidad que tu caja necesita.
            </p>

            {/* Botones de Acción Inmediatos */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={INSTALLER_URL}
                download="FacturaPOS-1.0.0.exe"
                className="bg-zinc-950 hover:bg-zinc-800 text-white font-medium text-sm px-6 py-3.5 rounded-xl shadow-xs hover:shadow transition-all inline-flex items-center gap-2 active:scale-98 cursor-pointer"
              >
                <Download size={16} />
                <span>Descargar para Windows (.exe)</span>
              </a>

              {session ? (
                <Link
                  to="/app"
                  className="bg-white hover:bg-zinc-50 text-zinc-900 font-medium text-sm px-5 py-3.5 rounded-xl border border-zinc-200 shadow-2xs transition-all inline-flex items-center gap-2"
                >
                  <span>Ir a mi POS</span>
                  <ArrowRight size={15} className="text-zinc-500" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('signup')}
                  className="bg-white hover:bg-zinc-50 text-zinc-900 font-medium text-sm px-5 py-3.5 rounded-xl border border-zinc-200 shadow-2xs transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Probar en el navegador gratis</span>
                  <ArrowRight size={15} className="text-zinc-500" />
                </button>
              )}
            </div>

            {/* Micro-beneficios Clave */}
            <div className="flex flex-wrap items-center justify-center gap-5 pt-2 text-xs text-zinc-600 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> 14 días gratis sin tarjeta
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> Sigue cobrando si cae internet o la luz
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> Multi-moneda automática ($ y Bs)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> Cajeros aprenden en 5 minutos
              </span>
            </div>
          </div>

          {/* SHOWCASE INTERACTIVO MULTI-NEGOCIO EN VIVO */}
          <section id="experiencia" className="pt-8">
            <NotionAppShowcase rate={rate} />
          </section>
        </div>
      </section>

      {/* BENTO GRID: 5 CUALIDADES CLAVE QUE HACEN ÚNICO A FACTURASYA */}
      <section id="cualidades" className="py-20 border-t border-zinc-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Diseñado para el ritmo comercial de Venezuela
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
              Potencia y control total sin saturar a tu equipo
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
              Cada componente fue diseñado para que tu caja vuele en horas pico, tus cuentas cuadren al centavo y no dependas de técnicos costosos.
            </p>
          </div>

          {/* GRID BENTO MODERNO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            
            {/* Card 1: Arquitectura Adaptable (Ocupa 2 columnas en pantallas medianas) */}
            <div className="md:col-span-2 p-8 rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-zinc-50/80 to-white hover:border-zinc-300 transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-xs">
                  <Layers size={20} />
                </div>
                <div className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-200/70 text-zinc-700">
                  Arquitectura Modular Estilo Notion
                </div>
                <h3 className="text-xl font-bold text-zinc-950">
                  Un solo software, tres experiencias optimizadas a tu medida
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-xl">
                  No todos los comercios operan igual. Si tienes un restaurante o bar, activa mesas y comandas. Si tienes una heladería o cafetería, activa venta por sabores y peso. Si es un minimarket, despacha con lector de código de barras. La interfaz solo muestra lo que tu negocio realmente usa, sin saturar la pantalla.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-zinc-200/60 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-zinc-200/80">
                  <span className="font-bold text-zinc-900 block text-[11px]">🍔 Restaurante & Bar</span>
                  <span className="text-[10px] text-zinc-500">Salón, mesas y comandas</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-zinc-200/80">
                  <span className="font-bold text-zinc-900 block text-[11px]">🍦 Heladería & Café</span>
                  <span className="text-[10px] text-zinc-500">Sabores, conos y peso</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-zinc-200/80">
                  <span className="font-bold text-zinc-900 block text-[11px]">🛍️ Retail & Minimarket</span>
                  <span className="text-[10px] text-zinc-500">Código de barras y SKU</span>
                </div>
              </div>
            </div>

            {/* Card 2: Multi-moneda Inteligente */}
            <div className="p-7 rounded-2xl border border-zinc-200/90 bg-white hover:border-zinc-300 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
                <h3 className="text-lg font-bold text-zinc-950">Multi-moneda y Tasa BCV Oficial</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Fija tus precios en dólares y cobra al milímetro en Bolívares. El sistema calcula automáticamente pagos mixtos (Efectivo $, Pago Móvil, Punto de Venta) y muestra el vuelto exacto para evitar descuadres.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs font-mono font-bold text-emerald-900 flex justify-between">
                <span>BCV Actualizado:</span>
                <span>{rate.toFixed(2)} Bs/$</span>
              </div>
            </div>

            {/* Card 3: 100% Offline-First */}
            <div className="p-7 rounded-2xl border border-zinc-200/90 bg-white hover:border-zinc-300 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
                  <Zap size={20} />
                </div>
                <h3 className="text-lg font-bold text-zinc-950">100% Offline-First (Anti-Cortes)</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Diseñado para la realidad de Venezuela. Si CANTV se cae o la luz parpadea, tu caja sigue facturando localmente sin congelarse. Al volver la señal, la nube se sincroniza sola en segundo plano.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Cero ventas perdidas por falta de internet</span>
              </div>
            </div>

            {/* Card 4: Monitor Móvil en Vivo */}
            <div className="p-7 rounded-2xl border border-zinc-200/90 bg-white hover:border-zinc-300 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center">
                  <Smartphone size={20} />
                </div>
                <h3 className="text-lg font-bold text-zinc-950">Monitor del Dueño en tu Celular</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Revisa desde cualquier lugar cuánto lleva vendido tu negocio hoy, qué métodos de pago se recibieron y el arqueo de cada caja sin necesidad de estar físicamente encerrado en el local.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Acceso seguro desde iPhone o Android</span>
              </div>
            </div>

            {/* Card 5: Hardware Plug & Play */}
            <div className="p-7 rounded-2xl border border-zinc-200/90 bg-white hover:border-zinc-300 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-800 border border-zinc-200 flex items-center justify-center">
                  <Printer size={20} />
                </div>
                <h3 className="text-lg font-bold text-zinc-950">Hardware Plug & Play</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Compatible de fábrica con tu equipo actual: impresoras térmicas USB o de red, lectores de código de barras, gavetas de dinero electrónicas y balanzas de mostrador.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Configuración instantánea en 2 minutos</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECCIÓN DE TRANQUILIDAD Y RESPALDO CONTABLE / FISCAL */}
      <section id="fiscal" className="py-20 border-t border-zinc-100 bg-zinc-50/60">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Respaldo contable y tranquilidad legal
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
              Cumplimiento normativo sin dolores de cabeza técnicos
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
              Mantén tu contabilidad al día, emite comprobantes oficiales y descarga reportes listos para tu contador sin pagar módulos adicionales.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            
            <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200 flex items-center justify-center">
                <Printer size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Impresoras Fiscales HKA80 Nativas</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Conexión directa con máquinas fiscales The Factory HKA80. Imprime facturas con RIF y razón social, Notas de Crédito, Reportes X y Cierre Z diario cumpliendo la normativa legal.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200 flex items-center justify-center">
                <FileSpreadsheet size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Libros de Compra y Venta (Forma 30)</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Genera en 1 clic tu archivo Microsoft Excel oficial con 3 hojas de cálculo interconectadas (Compras, Ventas y Resumen Forma 30) clasificadas por alícuotas de IVA del 16% y 8%.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Arqueo y Cierre Cero Fugas</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Desglose exacto de caja entre Efectivo en $, Bolívares en efectivo, Pago Móvil, Punto de Venta y Zelle para evitar diferencias y pérdidas entre turnos de cajeros.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* COMPARATIVA CON EL MERCADO */}
      <section id="comparativa" className="py-20 border-t border-zinc-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-3xl font-extrabold text-zinc-950 tracking-tight">
              ¿Por qué los dueños prefieren FacturasYa?
            </h2>
            <p className="text-sm text-zinc-600">
              Compara con los sistemas tradicionales de los 90s y con las apps extranjeras que no entienden Venezuela.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 uppercase text-[11px] font-semibold">
                  <th className="py-4 px-5">Situación en tu negocio</th>
                  <th className="py-4 px-5">Sistemas tradicionales (A2, Saint, Valery)</th>
                  <th className="py-4 px-5">Apps extranjeras (Square, Loyverse)</th>
                  <th className="py-4 px-5 bg-zinc-950 text-white font-bold">FacturasYa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Costo inicial</td>
                  <td className="py-4 px-5 text-zinc-500">$500 a $1,200 + costo de técnico instalador</td>
                  <td className="py-4 px-5 text-zinc-500">Exigen tarjeta de crédito internacional en dólares</td>
                  <td className="py-4 px-5 bg-zinc-50 font-bold text-emerald-700">
                    14 días gratis · Luego desde $15/mes en Bs por Pago Móvil
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Cobro bimoneda con tasa BCV</td>
                  <td className="py-4 px-5 text-zinc-500">Cálculos manuales torpes y propensos a errores</td>
                  <td className="py-4 px-5 text-red-600 font-medium">Incompatibles con pagos mixtos y tasa BCV</td>
                  <td className="py-4 px-5 bg-zinc-50 font-semibold text-zinc-900">
                    Conversión instantánea a tasa BCV y vuelto exacto
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Adaptabilidad a tu rubro</td>
                  <td className="py-4 px-5 text-zinc-500">Sistemas rígidos o cobran módulos por separado</td>
                  <td className="py-4 px-5 text-zinc-500">Genéricas sin adaptación local</td>
                  <td className="py-4 px-5 bg-zinc-50 font-semibold text-zinc-900">
                    3 Perfiles: Restaurante, Heladería/Café o Retail
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Monitoreo en el celular</td>
                  <td className="py-4 px-5 text-zinc-500">Imposible sin servidores dedicados y VPNs complejas</td>
                  <td className="py-4 px-5 text-zinc-500">Tienen app móvil, pero sin datos fiscales venezolanos</td>
                  <td className="py-4 px-5 bg-zinc-50 font-semibold text-zinc-900">
                    Ventas y arqueo de caja en vivo desde tu teléfono
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Si falla el internet o la luz</td>
                  <td className="py-4 px-5 text-zinc-500">Suelen funcionar local pero sin respaldo en la nube</td>
                  <td className="py-4 px-5 text-red-600 font-medium">Se bloquean por completo y no puedes cobrar en caja</td>
                  <td className="py-4 px-5 bg-zinc-50 font-semibold text-zinc-900">
                    Sigues facturando localmente y sincroniza todo al volver
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Tiempo de aprendizaje del cajero</td>
                  <td className="py-4 px-5 text-zinc-500">Semanas de capacitación y menús con 100 botones</td>
                  <td className="py-4 px-5 text-zinc-500">Días de adaptación con terminología extranjera</td>
                  <td className="py-4 px-5 bg-zinc-50 font-semibold text-emerald-700">
                    5 minutos gracias a su diseño limpio estilo Notion
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PLANES DE PRECIO TRANSPARENTES */}
      <section id="precios" className="py-20 border-t border-zinc-100 bg-zinc-50/50">
        <div className="max-w-6xl mx-auto px-4 space-y-10">
          
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold text-zinc-950 tracking-tight">
              Precios transparentes y sin contratos forzosos
            </h2>
            <p className="text-sm text-zinc-600">
              Pagas mes a mes en Bolívares por Pago Móvil a tasa oficial BCV o en USDT por Binance Pay.
            </p>

            {/* Selector Mensual vs Anual */}
            <div className="pt-2 flex items-center justify-center gap-3">
              <span className={`text-xs font-semibold ${billingCycle === 'monthly' ? 'text-zinc-950' : 'text-zinc-400'}`}>
                Mensual
              </span>
              <button
                type="button"
                onClick={() => setBillingCycle((prev) => (prev === 'monthly' ? 'annual' : 'monthly'))}
                className="w-12 h-6 rounded-full bg-zinc-950 p-0.5 transition-colors cursor-pointer relative"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                    billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-semibold ${billingCycle === 'annual' ? 'text-zinc-950' : 'text-zinc-400'}`}>
                  Anual
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  2 meses gratis 🎁
                </span>
              </div>
            </div>
          </div>

          {/* Grid de 4 Planes */}
          <div className="grid md:grid-cols-4 gap-4 max-w-5xl mx-auto items-stretch">
            
            {/* Plan 1: Starter */}
            <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                  Starter
                </span>
                <div>
                  <h3 className="font-bold text-base text-zinc-950">Comercio Básico</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-zinc-950">
                      ${billingCycle === 'annual' ? '12.50' : '15'}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium">/ mes</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Para quioscos, cafeterías pequeñas o puntos de venta únicos.
                </p>
                <ul className="space-y-2 text-xs text-zinc-600 pt-3 border-t border-zinc-100">
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600 shrink-0" /> 1 Caja Mostrador</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600 shrink-0" /> Ventas ilimitadas</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600 shrink-0" /> Multi-moneda BCV</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600 shrink-0" /> Monitor en el celular</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={openTrialModal}
                className="w-full py-2.5 rounded-xl border border-zinc-300 hover:bg-zinc-50 font-bold text-xs text-zinc-900 transition-colors cursor-pointer"
              >
                Probar 14 días gratis
              </button>
            </div>

            {/* Plan 2: Pro Restaurante */}
            <div className="p-6 rounded-2xl bg-white border-2 border-zinc-950 shadow-md flex flex-col justify-between space-y-4 relative">
              <span className="absolute -top-2.5 right-4 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-950 text-white">
                Más Popular
              </span>
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800">
                  Restaurante
                </span>
                <div>
                  <h3 className="font-bold text-base text-zinc-950">Pro Salón & Mesas</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-zinc-950">
                      ${billingCycle === 'annual' ? '20' : '25'}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium">/ mes</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Para restaurantes, pizzerías, hamburgueserías y bares.
                </p>
                <ul className="space-y-2 text-xs text-zinc-700 pt-3 border-t border-zinc-100 font-medium">
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600 shrink-0" /> Mesas y salón ilimitados</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600 shrink-0" /> Comandas a cocina</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600 shrink-0" /> Meseros por QR</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600 shrink-0" /> Facturación fiscal HKA</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={openTrialModal}
                className="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 font-bold text-xs text-white shadow-xs transition-all cursor-pointer"
              >
                Comenzar con Restaurante
              </button>
            </div>

            {/* Plan 3: Heladería & Retail */}
            <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                  Especializado
                </span>
                <div>
                  <h3 className="font-bold text-base text-zinc-950">Heladería & Retail</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-zinc-950">
                      ${billingCycle === 'annual' ? '25' : '30'}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium">/ mes</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Para heladerías artesanales, bodegones, minimarkets y tiendas.
                </p>
                <ul className="space-y-2 text-xs text-zinc-600 pt-3 border-t border-zinc-100">
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600 shrink-0" /> Venta por peso (KG / g)</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600 shrink-0" /> Lector de código de barras</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600 shrink-0" /> Sabores y tinas térmicas</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600 shrink-0" /> Control de stock en vivo</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={openTrialModal}
                className="w-full py-2.5 rounded-xl border border-zinc-300 hover:bg-zinc-50 font-bold text-xs text-zinc-900 transition-colors cursor-pointer"
              >
                Comenzar con Heladería
              </button>
            </div>

            {/* Plan 4: Multi-Caja / Cadena */}
            <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                  Empresarial
                </span>
                <div>
                  <h3 className="font-bold text-base text-zinc-950">Multi-Caja & Red</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-zinc-950">
                      ${billingCycle === 'annual' ? '37.50' : '45'}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium">/ mes</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Para negocios grandes con varias cajas de cobro sincronizadas.
                </p>
                <ul className="space-y-2 text-xs text-zinc-600 pt-3 border-t border-zinc-100">
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600 shrink-0" /> Múltiples cajas en red local</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600 shrink-0" /> Sincronización multi-terminal</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600 shrink-0" /> Libros Forma 30 en Excel</li>
                  <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600 shrink-0" /> Soporte VIP por WhatsApp</li>
                </ul>
              </div>

              <a
                href="https://wa.me/584120000000?text=Hola,%20me%20interesa%20el%20plan%20Multi-Caja%20de%20FacturasYa"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl border border-zinc-300 hover:bg-zinc-50 font-bold text-xs text-zinc-900 transition-colors text-center block cursor-pointer"
              >
                Consultar por WhatsApp
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* BANNER FINAL DE ACCIÓN */}
      <section className="py-16 bg-zinc-950 text-white border-t border-zinc-900">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300">
            <Sparkles size={14} className="text-amber-400" />
            Empieza a proteger tus ingresos hoy mismo
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Vende más rápido y ten control absoluto de tu dinero.
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Instala FacturaPOS en tu computadora en menos de 2 minutos. Prueba todas las funciones durante 14 días sin pagar nada ni ingresar tarjetas.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={INSTALLER_URL}
              download="FacturaPOS-1.0.0.exe"
              className="bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-sm px-6 py-3.5 rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <Download size={16} />
              <span>Descargar FacturaPOS para Windows</span>
            </a>

            {session ? (
              <Link
                to="/app"
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-sm px-5 py-3.5 rounded-xl border border-zinc-700 transition-all inline-flex items-center gap-2"
              >
                <span>Ir a mi POS</span>
                <ArrowRight size={15} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('signup')}
                className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm px-5 py-3.5 rounded-xl border border-zinc-700 transition-all inline-flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Crear cuenta gratis</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-3 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> Instalación en 2 minutos</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> Pagas en Bs por Pago Móvil</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> Soporte directo por WhatsApp</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-zinc-200 bg-white text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-zinc-950 text-white font-black text-xs flex items-center justify-center">
              FY
            </div>
            <span>© {new Date().getFullYear()} FacturasYa · Punto de venta moderno para Venezuela.</span>
          </div>

          <div className="flex items-center gap-5 font-medium text-zinc-600">
            <a href="#experiencia" className="hover:text-zinc-950">¿Cómo funciona?</a>
            <a href="#cualidades" className="hover:text-zinc-950">Cualidades</a>
            <a href="#fiscal" className="hover:text-zinc-950">Fiscal</a>
            <a href="#precios" className="hover:text-zinc-950">Precios</a>
            {isAdmin && <Link to="/super-admin" className="hover:text-zinc-950">Super Admin</Link>}
          </div>
        </div>
      </footer>

      {/* MODAL DE AUTENTICACIÓN */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                  FY
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">FacturasYa</h3>
                  <span className="text-[11px] text-zinc-500">
                    {authTab === 'signup' ? 'Crea tu cuenta gratis en segundos' : 'Ingresa a tu cuenta'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 p-1 bg-zinc-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setAuthTab('signup'); setFormError(''); setEmailCheckNotice(false); }}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  authTab === 'signup'
                    ? 'bg-white text-zinc-950 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Crear cuenta
              </button>
              <button
                type="button"
                onClick={() => { setAuthTab('login'); setFormError(''); setEmailCheckNotice(false); }}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  authTab === 'login'
                    ? 'bg-white text-zinc-950 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Iniciar sesión
              </button>
            </div>

            {emailCheckNotice ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-sm text-emerald-950">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    ¡Confirma tu correo!
                  </div>
                  <p className="leading-relaxed">
                    Hemos enviado un enlace de confirmación a <strong>{form.email}</strong>. 
                    Revisa tu bandeja de entrada o spam para activar tu cuenta.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => { setAuthTab('login'); setEmailCheckNotice(false); }}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 font-semibold text-xs text-white shadow-xs transition-all cursor-pointer"
                >
                  Ya confirmé, ir a Iniciar sesión
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    required
                    placeholder="correo@minegocio.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-zinc-950 focus:outline-none text-zinc-900 bg-zinc-50/50"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Contraseña</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-zinc-950 focus:outline-none text-zinc-900 bg-zinc-50/50"
                  />
                  {authTab === 'signup' && form.password && (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex gap-1 h-1">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`flex-1 rounded-full transition-colors ${
                              step <= passwordStrength.score ? passwordStrength.color : 'bg-zinc-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-[10px] font-bold ${passwordStrength.textClass}`}>
                        Seguridad: {passwordStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                {authTab === 'signup' && (
                  <div>
                    <label className="block text-zinc-700 font-semibold mb-1">Confirmar contraseña</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-zinc-950 focus:outline-none text-zinc-900 bg-zinc-50/50"
                    />
                  </div>
                )}

                {formError && (
                  <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 font-bold text-xs text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting
                    ? 'Procesando...'
                    : authTab === 'signup'
                    ? 'Crear cuenta y comenzar gratis →'
                    : 'Ingresar a mi cuenta →'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
