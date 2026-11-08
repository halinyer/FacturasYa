import React, { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { supabase, isConfigured } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import NotionAppShowcase from './NotionAppShowcase';

const INSTALLER_URL =
  import.meta.env.VITE_INSTALLER_URL || 'https://github.com/halinyer/FacturasYa/releases/latest/download/FacturaPOS-1.0.0.exe';

function formatBs(val) {
  return 'Bs. ' + Number(val || 0).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { session, isAdmin } = useAuth() || {};
  const [bcvRate, setBcvRate] = useState(876.80);

  useEffect(() => {
    if (!isConfigured || !supabase) return;
    supabase
      .from('saas_config')
      .select('bcv_rate')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.bcv_rate && Number(data.bcv_rate) > 0) {
          setBcvRate(Number(data.bcv_rate));
        }
      })
      .catch(() => {});
  }, []);

  // Planes de precio: 'monthly' | 'annual'
  const [billingCycle, setBillingCycle] = useState('monthly');

  // Modal de Autenticación Notion-style
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

  // Medidor de seguridad de contraseña
  const passwordStrength = React.useMemo(() => {
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

  const rate = Math.max(1, Number(bcvRate) || 876.80);

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

      {/* TOP STATUS BAR: Transparente y elegante con Tasa Oficial BCV */}
      <div className="border-b border-zinc-100 bg-zinc-50/60 backdrop-blur-xs text-xs text-zinc-600">
        <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium text-[11px] border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Operatividad en Venezuela
            </span>
            <span className="text-zinc-300 hidden sm:inline">|</span>
            <span className="text-zinc-600 hidden sm:inline">
              Homologado para impresoras fiscales <strong className="text-zinc-900 font-semibold">The Factory HKA80</strong>, Bixolon y Bematech
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 bg-white border border-zinc-200/80 rounded-md px-2.5 py-0.5 shadow-2xs">
              <span className="text-zinc-500 font-medium text-[11px]">Tasa BCV:</span>
              <span className="font-semibold text-zinc-900 mono-num text-[11px]">{rate.toFixed(2)} Bs/$</span>
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION BAR (Notion / Stripe style) */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-200/70 transition-all">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
              FY
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-zinc-950">FacturasYa</span>
              <span className="hidden sm:inline-block ml-2 text-xs text-zinc-500 font-normal">
                POS Fiscal & Cloud
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600">
            <a href="#comparativa" className="hover:text-zinc-950 transition-colors">¿Por qué FacturasYa?</a>
            <a href="#caracteristicas" className="hover:text-zinc-950 transition-colors">Características</a>
            <a href="#precios" className="hover:text-zinc-950 transition-colors">Planes</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {session ? (
              <>
                <Link
                  to="/app"
                  className="bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs hover:shadow transition-all inline-flex items-center gap-1.5 active:scale-98"
                >
                  <Store size={14} />
                  <span>Ir a mi POS →</span>
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
                  className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('signup')}
                  className="bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs hover:shadow transition-all inline-flex items-center gap-1.5 active:scale-98"
                >
                  <span>14 Días Gratis</span>
                  <ArrowRight size={13} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-20 overflow-hidden bg-gradient-to-b from-zinc-50/50 via-white to-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto space-y-5">
            {/* Announcement badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-zinc-200 bg-white/90 text-xs font-medium text-zinc-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Sin costos de instalación de $800 ni visitas técnicas forzadas</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-950 leading-[1.1]">
              El punto de venta fiscal que no se detiene si se cae el internet.
            </h1>

            <p className="text-lg text-zinc-600 leading-relaxed max-w-2xl mx-auto font-normal">
              Precios blindados en <strong className="text-zinc-900 font-semibold">dólares ($)</strong>, cobro mixto con{' '}
              <strong className="text-zinc-900 font-semibold">Pago Móvil a tasa BCV</strong>, conexión directa con{' '}
              <strong className="text-zinc-900 font-semibold">impresoras fiscales The Factory</strong> y acceso en tiempo real a tus ventas desde el celular.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <a
                href={INSTALLER_URL}
                download="FacturaPOS-1.0.0.exe"
                className="bg-zinc-950 hover:bg-zinc-800 text-white font-medium text-sm px-6 py-3.5 rounded-xl shadow-sm hover:shadow transition-all inline-flex items-center gap-2 active:scale-98 cursor-pointer"
              >
                <Download size={16} />
                <span>Descargar FacturaPOS para Windows</span>
                <span className="text-xs text-zinc-400 font-normal">(.EXE nativo)</span>
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
                  onClick={() => openAuthModal('login')}
                  className="bg-white hover:bg-zinc-50 text-zinc-900 font-medium text-sm px-5 py-3.5 rounded-xl border border-zinc-200 shadow-2xs transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Iniciar Sesión</span>
                  <ArrowRight size={15} className="text-zinc-500" />
                </button>
              )}
            </div>

            {/* Micro guarantees */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> 14 días de prueba completa
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> Sin tarjeta internacional
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> Arquitectura 100% Offline-First
              </span>
            </div>
          </div>

          {/* VENTANA EN MINIATURA ANIMADA ESTILO NOTION (COMPONENTES REALES DE LA APP, NO INTERACTIVA) */}
          <NotionAppShowcase rate={rate} />
        </div>
      </section>

      {/* COMPARATIVA TRANSPARENTE: VENEZUELA (Apple / Stripe style) */}
      <section id="comparativa" className="py-20 border-t border-zinc-100 bg-zinc-50/50">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Hecho para la realidad comercial
            </span>
            <h2 className="text-3xl font-extrabold text-zinc-950 tracking-tight">
              ¿Por qué los restaurantes en Venezuela eligen FacturasYa?
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Los sistemas antiguos te amarran a costos de entrada de $800 a $1,200. Las apps extranjeras en la nube no se comunican con máquinas fiscales del SENIAT. FacturasYa es el híbrido moderno.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-500 uppercase text-[11px] font-semibold">
                  <th className="py-4 px-5">Situación en el negocio</th>
                  <th className="py-4 px-5">Sistemas tradicionales (Saint, Xetux)</th>
                  <th className="py-4 px-5">Apps extranjeras (Square, Loyverse)</th>
                  <th className="py-4 px-5 bg-zinc-900 text-white font-bold">FacturasYa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Inversión inicial para empezar</td>
                  <td className="py-4 px-5 text-zinc-500">$400 – $1,200 + costo de visita técnica</td>
                  <td className="py-4 px-5 text-zinc-500">Tarjeta en divisas obligatoria mensual</td>
                  <td className="py-4 px-5 bg-zinc-50 font-bold text-emerald-700">
                    $0 por 14 días · Luego $30/mes por Pago Móvil
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Falla de internet en hora pico</td>
                  <td className="py-4 px-5 text-zinc-500">Funciona local, pero dueño queda a ciegas</td>
                  <td className="py-4 px-5 text-red-600 font-medium">Se detiene la caja; no puedes facturar</td>
                  <td className="py-4 px-5 bg-zinc-50 font-semibold text-zinc-900">
                    100% Offline-First (Sigue facturando sin internet)
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Máquina fiscal SENIAT (HKA80)</td>
                  <td className="py-4 px-5 text-zinc-500">Requiere drivers y licencias adicionales</td>
                  <td className="py-4 px-5 text-red-600 font-medium">Incompatible con máquinas fiscales venezolanas</td>
                  <td className="py-4 px-5 bg-zinc-50 font-semibold text-zinc-900">
                    Puente nativo directo incluido (Facturas, X, Z)
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Monitoreo del dueño en el celular</td>
                  <td className="py-4 px-5 text-zinc-500">Requiere IP pública o módulo web costoso</td>
                  <td className="py-4 px-5 text-zinc-500">Dashboard web disponible</td>
                  <td className="py-4 px-5 bg-zinc-50 font-semibold text-zinc-900">
                    Enlace permanente seguro con tu correo y clave
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Si se daña o formatean la PC</td>
                  <td className="py-4 px-5 text-red-600 font-medium">Riesgo de perder datos; costo de reinstalación</td>
                  <td className="py-4 px-5 text-zinc-500">Almacenado en la nube</td>
                  <td className="py-4 px-5 bg-zinc-50 font-semibold text-zinc-900">
                    Descargas el .EXE, inicias sesión y restauras todo
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* BENTO GRID DE CARACTERÍSTICAS (Notion style) */}
      <section id="caracteristicas" className="py-20 border-t border-zinc-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Arquitectura Robusta
            </span>
            <h2 className="text-3xl font-extrabold text-zinc-950 tracking-tight">
              Todo lo que necesita tu restaurante, sin módulos de pago ocultos
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {/* Box 1 */}
            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <Printer size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Impresión Fiscal SENIAT</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Emisión de comprobantes fiscales con RIF del cliente, Notas de Crédito referenciadas, Reporte X y Cierre Z diario por puerto USB/Serial con The Factory HKA80.
              </p>
            </div>

            {/* Box 2 */}
            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <QrCode size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Comandas Móviles por QR</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Tus mesoneros enlazan sus teléfonos escaneando un código QR en la red local. Toman el pedido en la mesa y la comanda sale en cocina al instante.
              </p>
            </div>

            {/* Box 3 */}
            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <FileSpreadsheet size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Libros de Compra y Venta</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Exporta al cierre de mes el archivo Excel con el formato exacto que exige el SENIAT y tu contador, incluyendo retenciones de IVA aplicadas a proveedores.
              </p>
            </div>

            {/* Box 4 */}
            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <Layers size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Inventario Práctico en 2 Minutos</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Sin recetas infinitas que nadie actualiza. Controla carnes, panes, vasos y bebidas con conteos físicos de cierre de turno y alertas de reposición.
              </p>
            </div>

            {/* Box 5 */}
            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <Smartphone size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Dashboard en la Nube</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Abre el monitor desde tu celular en cualquier parte. Visualiza las ventas en vivo, mesas abiertas, ventas anuladas y arqueo de caja sin estar en el local.
              </p>
            </div>

            {/* Box 6 */}
            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Cierre de Caja Cuadrado</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Arqueo automático separado por Efectivo USD, Efectivo Bs, Pago Móvil, Punto de Venta y Zelle para evitar diferencias y descuadres de dinero al final del día.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PLANES DE PRECIO (Stripe style) */}
      <section id="precios" className="py-20 border-t border-zinc-100 bg-zinc-50/50">
        <div className="max-w-6xl mx-auto px-4 space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Precios Transparentes
            </span>
            <h2 className="text-3xl font-extrabold text-zinc-950 tracking-tight">
              Un único plan con todas las funciones incluidas
            </h2>
            <p className="text-sm text-zinc-600">
              Pagas mes a mes en Bolívares por Pago Móvil a tasa oficial BCV. Sin contratos de permanencia ni cobros ocultos por mesa.
            </p>

            {/* Switch Mensual / Anual */}
            <div className="pt-2 inline-flex items-center gap-2 p-1 rounded-full bg-zinc-200/60 border border-zinc-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-zinc-950 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Pago Mensual
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-full transition-all inline-flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-white text-zinc-950 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <span>Pago Anual</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                  Ahorra 2 meses
                </span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            
            {/* Card 1: Prueba Gratuita */}
            <div className="p-7 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700">
                  Para probar en tu local
                </span>
                <div>
                  <h3 className="text-lg font-bold text-zinc-950">Prueba Gratuita 14 Días</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-zinc-950 mono-num">$0</span>
                    <span className="text-xs text-zinc-500 font-medium">/ 14 días completos</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Descarga el instalador, conéctalo a tu impresora fiscal y opera tus mesas sin ningún compromiso.
                </p>
                <ul className="space-y-2 text-xs text-zinc-600 pt-2 border-t border-zinc-100">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Instalador nativo para Windows (.EXE)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Conexión con The Factory HKA80</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Comandas QR ilimitadas</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Monitor del dueño en la nube</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={openTrialModal}
                className="w-full py-2.5 px-4 rounded-xl border border-zinc-300 hover:bg-zinc-50 font-semibold text-xs text-zinc-900 transition-colors"
              >
                Comenzar Prueba Gratis
              </button>
            </div>

            {/* Card 2: Plan Mensual (Destacado) */}
            <div className="p-7 rounded-2xl bg-white border-2 border-zinc-950 shadow-md flex flex-col justify-between space-y-6 relative">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-950 text-white">
                    Recomendado
                  </span>
                  <span className="text-xs font-bold text-emerald-700 mono-num">
                    ≈ {formatBs((billingCycle === 'annual' ? 25 : 30) * rate)} / mes
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-zinc-950">Suscripción SaaS</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-zinc-950 mono-num">
                      {billingCycle === 'annual' ? '$25' : '$30'}
                    </span>
                    <span className="text-xs text-zinc-500 font-medium">/ mes (a tasa BCV)</span>
                  </div>
                  {billingCycle === 'annual' && (
                    <span className="text-[11px] text-zinc-500 block mt-0.5">
                      Cobrado como $300 al año (Ahorras $60)
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-600 leading-relaxed">
                  Renueva directamente desde la app reportando la referencia de tu Pago Móvil. Desbloqueo inmediato.
                </p>

                <ul className="space-y-2 text-xs text-zinc-700 pt-2 border-t border-zinc-100 font-medium">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Facturación fiscal ilimitada</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Respaldo automático en PostgreSQL Cloud</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Libros de Compra y Venta SENIAT (Excel)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Soporte directo vía WhatsApp</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={openTrialModal}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 font-semibold text-xs text-white shadow-xs transition-all"
              >
                Activar 14 Días y Descargar →
              </button>
            </div>

            {/* Card 3: Soporte y Personalización */}
            <div className="p-7 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700">
                  Cadenas y Múltiples Cajas
                </span>
                <div>
                  <h3 className="text-lg font-bold text-zinc-950">Multi-Caja / Franquicia</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-zinc-950">A la medida</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Para locales con múltiples puntos de facturación fiscal, impresoras de comandas remotas o varias sucursales.
                </p>
                <ul className="space-y-2 text-xs text-zinc-600 pt-2 border-t border-zinc-100">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Múltiples cajas fiscales en red</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Consolidación contable de sucursales</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Asesoría presencial para instalación</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Soporte técnico con SLA garantizado</li>
                </ul>
              </div>

              <a
                href="https://wa.me/584120000000?text=Hola,%20me%20interesa%20FacturasYa%20para%20mi%20restaurante"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl border border-zinc-300 hover:bg-zinc-50 font-semibold text-xs text-zinc-900 transition-colors text-center block"
              >
                Contactar por WhatsApp
              </a>
            </div>

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
            <span>© {new Date().getFullYear()} FacturasYa · Hecho en Venezuela para el sector gastronómico.</span>
          </div>

          <div className="flex items-center gap-5 font-medium text-zinc-600">
            <a href="#comparativa" className="hover:text-zinc-950">Comparativa</a>
            <a href="#caracteristicas" className="hover:text-zinc-950">Características</a>
            <a href="#precios" className="hover:text-zinc-950">Precios</a>
            {isAdmin && <Link to="/super-admin" className="hover:text-zinc-950">Super Admin</Link>}
          </div>
        </div>
      </footer>

      {/* MODAL DE AUTENTICACIÓN (NOTION STYLE: ENTRADA ULTRA-RÁPIDA EN 5 SEGUNDOS) */}
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
                  <h3 className="text-sm font-bold text-zinc-950">
                    FacturasYa Cloud
                  </h3>
                  <span className="text-[11px] text-zinc-500">
                    {authTab === 'signup' ? 'Empieza en 5 segundos sin tarjeta' : 'Accede a tu Monitor Cloud'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* PESTAÑAS NOTION-STYLE */}
            <div className="grid grid-cols-2 p-1 bg-zinc-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setAuthTab('signup'); setFormError(''); setEmailCheckNotice(false); }}
                className={`py-1.5 rounded-lg transition-all ${
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
                className={`py-1.5 rounded-lg transition-all ${
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
                    Por favor revisa tu bandeja de entrada (o carpeta de spam) para activar tu cuenta.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => { setAuthTab('login'); setEmailCheckNotice(false); }}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 font-semibold text-xs text-white shadow-xs transition-all"
                >
                  Ya confirmé, ir a Iniciar sesión →
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@mirestaurante.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-zinc-950 focus:outline-none text-zinc-900 bg-zinc-50/50"
                    autoFocus
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-zinc-700 font-semibold">Contraseña</label>
                    <span className="text-[10px] text-zinc-400">Mínimo 6 caracteres</span>
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-zinc-950 focus:outline-none text-zinc-900 bg-zinc-50/50"
                  />

                  {authTab === 'signup' && form.password.length > 0 && (
                    <div className="space-y-1 mt-2">
                      <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden flex gap-1">
                        <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-zinc-200'} transition-all`} />
                        <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-zinc-200'} transition-all`} />
                        <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-zinc-200'} transition-all`} />
                        <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 4 ? passwordStrength.color : 'bg-zinc-200'} transition-all`} />
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-zinc-400">Nivel de seguridad:</span>
                        <span className={`font-bold ${passwordStrength.textClass}`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {authTab === 'signup' && (
                  <div>
                    <label className="block text-zinc-700 font-semibold mb-1">Confirmar contraseña</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Repite tu contraseña"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-zinc-950 focus:outline-none text-zinc-900 bg-zinc-50/50"
                    />
                    {form.confirmPassword.length > 0 && form.password !== form.confirmPassword && (
                      <span className="text-[10px] text-red-600 font-medium block mt-1">
                        Las contraseñas no coinciden aún.
                      </span>
                    )}
                  </div>
                )}

                {formError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium leading-relaxed">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 font-semibold text-xs text-white shadow-xs transition-all flex items-center justify-center gap-2 mt-2 active:scale-98"
                >
                  {submitting
                    ? (authTab === 'signup' ? 'Creando cuenta...' : 'Iniciando sesión...')
                    : (authTab === 'signup' ? 'Crear cuenta y comenzar 14 días →' : 'Entrar a mi monitor →')}
                </button>

                <p className="text-[10px] text-center text-zinc-400">
                  {authTab === 'signup'
                    ? 'Configurarás tu RIF y Razón Social al entrar a tu Monitor del Dueño.'
                    : '¿No tienes cuenta? Haz clic en "Crear cuenta" arriba.'}
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
