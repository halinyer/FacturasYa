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
import { db } from '../../pos-core/services/dataService';
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
  const [bcvRate, setBcvRate] = useState(896.12);

  useEffect(() => {
    db.getExchangeRate(false)
      .then((liveRate) => {
        if (liveRate && Number(liveRate) > 10) {
          setBcvRate(Number(liveRate));
        }
      })
      .catch(() => {});
  }, []);

  // Planes de precio: 'monthly' | 'annual'
  const [billingCycle, setBillingCycle] = useState('monthly');

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
            <a href="#comparativa" className="hover:text-zinc-950 transition-colors">Ventajas</a>
            <a href="#caracteristicas" className="hover:text-zinc-950 transition-colors">Funciones</a>
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

      {/* HERO SECTION */}
      <section className="relative pt-14 pb-20 overflow-hidden bg-gradient-to-b from-zinc-50/50 via-white to-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto space-y-5">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-950 leading-[1.1]">
              El punto de venta fiscal que sigue facturando aunque se vaya el internet.
            </h1>

            <p className="text-lg text-zinc-600 leading-relaxed max-w-2xl mx-auto font-normal">
              Fija tus precios en dólares, cobra en Bolívares a tasa BCV del día, imprime directo en tu máquina fiscal <strong className="text-zinc-900 font-semibold">The Factory HKA80</strong> y revisa las ventas de tu negocio desde el teléfono.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={INSTALLER_URL}
                download="FacturaPOS-1.0.0.exe"
                className="bg-zinc-950 hover:bg-zinc-800 text-white font-medium text-sm px-6 py-3.5 rounded-xl shadow-sm hover:shadow transition-all inline-flex items-center gap-2 active:scale-98 cursor-pointer"
              >
                <Download size={16} />
                <span>Descargar para Windows</span>
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
                  <span>Crear cuenta gratis</span>
                  <ArrowRight size={15} className="text-zinc-500" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 pt-3 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> 14 días de prueba gratis
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> Pagas en Bs por Pago Móvil
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> Funciona con o sin internet
              </span>
            </div>
          </div>

          {/* VISTA ANIMADA DE LA APLICACIÓN REAL */}
          <NotionAppShowcase rate={rate} />
        </div>
      </section>

      {/* POR QUÉ ELEGIR FACTURASYA (DIRECTO AL GRANO, SIN CARACTERES RAROS) */}
      <section id="comparativa" className="py-20 border-t border-zinc-100 bg-zinc-50/50">
        <div className="max-w-5xl mx-auto px-4 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-3xl font-extrabold text-zinc-950 tracking-tight">
              ¿Por qué te conviene usar FacturasYa?
            </h2>
            <p className="text-sm text-zinc-600">
              Resuelve los problemas reales de cobrar y llevar una caja fiscal en Venezuela.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 uppercase text-[11px] font-semibold">
                  <th className="py-4 px-5">Qué pasa en el local</th>
                  <th className="py-4 px-5">Sistemas viejos</th>
                  <th className="py-4 px-5">Apps de otros países</th>
                  <th className="py-4 px-5 bg-zinc-900 text-white font-bold">FacturasYa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Costo para empezar</td>
                  <td className="py-4 px-5 text-zinc-500">Entre $400 y $1,000 de entrada</td>
                  <td className="py-4 px-5 text-zinc-500">Piden tarjeta en dólares cada mes</td>
                  <td className="py-4 px-5 bg-zinc-50 font-bold text-emerald-700">
                    14 días gratis, luego $30/mes por Pago Móvil
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Se cae el internet</td>
                  <td className="py-4 px-5 text-zinc-500">El dueño no puede ver las ventas</td>
                  <td className="py-4 px-5 text-red-600 font-medium">Se bloquea la caja y no puedes cobrar</td>
                  <td className="py-4 px-5 bg-zinc-50 font-semibold text-zinc-900">
                    La caja sigue facturando sin internet
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Impresora fiscal SENIAT</td>
                  <td className="py-4 px-5 text-zinc-500">Cobran aparte por conectarla</td>
                  <td className="py-4 px-5 text-red-600 font-medium">No sirven con impresoras fiscales de aquí</td>
                  <td className="py-4 px-5 bg-zinc-50 font-semibold text-zinc-900">
                    Conexión directa incluida (Facturas, X y Z)
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Ver ventas desde el teléfono</td>
                  <td className="py-4 px-5 text-zinc-500">Hay que estar metido en el negocio</td>
                  <td className="py-4 px-5 text-zinc-500">Incluido</td>
                  <td className="py-4 px-5 bg-zinc-50 font-semibold text-zinc-900">
                    Entras desde tu celular y ves todo en vivo
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Se daña la computadora</td>
                  <td className="py-4 px-5 text-red-600 font-medium">Pierdes la información y pagas técnico</td>
                  <td className="py-4 px-5 text-zinc-500">Guardado en internet</td>
                  <td className="py-4 px-5 bg-zinc-50 font-semibold text-zinc-900">
                    Abres tu cuenta en otra PC y recuperas todo
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FUNCIONES PRINCIPALES */}
      <section id="caracteristicas" className="py-20 border-t border-zinc-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-3xl font-extrabold text-zinc-950 tracking-tight">
              Todo incluido en un solo sistema
            </h2>
            <p className="text-sm text-zinc-600">
              Sin cobros extras por módulo ni complicaciones para tus cajeros.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <Printer size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Facturación Fiscal HKA80</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Imprime facturas con RIF del cliente, Notas de Crédito, Reporte X y Cierre Z diario conectando tu máquina fiscal por cable USB o Serial.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <QrCode size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Pedidos de Mesoneros por QR</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Tus mesoneros escanean un código QR con su celular en el WiFi del local, cargan el pedido en la mesa y sale directo en cocina y en caja.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <FileSpreadsheet size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Libros de Compra y Venta</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Descarga a fin de mes el Libro de Ventas, Libro de Compras y resumen de Cierres Z en Excel listos para tu contador.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <Layers size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Control de Inventario Rápido</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Descuenta automáticamente tus productos e insumos al vender y te avisa cuando queda poca mercancía en el depósito.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <Smartphone size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Monitor en tu Teléfono</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Revisa desde donde estés cuánto lleva vendido el local hoy, qué mesas están ocupadas y cada factura emitida en tiempo real.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Cierre de Caja Exacto</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Separa cuánto entró en Efectivo en dólares, Pago Móvil, Punto de Venta y Zelle para cuadrar la caja al cierre del turno sin errores.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PLANES DE PRECIO */}
      <section id="precios" className="py-20 border-t border-zinc-100 bg-zinc-50/50">
        <div className="max-w-6xl mx-auto px-4 space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold text-zinc-950 tracking-tight">
              Precios claros y sin contratos
            </h2>
            <p className="text-sm text-zinc-600">
              Pagas en Bolívares por Pago Móvil a tasa BCV o por Binance Pay.
            </p>

            <div className="pt-2 inline-flex items-center gap-2 p-1 rounded-full bg-zinc-200/60 border border-zinc-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
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
                className={`px-4 py-1.5 rounded-full transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === 'annual'
                    ? 'bg-white text-zinc-950 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <span>Pago Anual</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                  Ahorras 2 meses
                </span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            
            {/* Card 1 */}
            <div className="p-7 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700">
                  Para empezar hoy
                </span>
                <div>
                  <h3 className="text-lg font-bold text-zinc-950">Prueba de 14 Días</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-zinc-950 mono-num">$0</span>
                    <span className="text-xs text-zinc-500 font-medium">/ 14 días</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Descarga el programa, instala tu menú y pruébalo en tu caja con todas las funciones activas.
                </p>
                <ul className="space-y-2 text-xs text-zinc-600 pt-2 border-t border-zinc-100">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Programa para Windows (.EXE)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Conexión con impresora fiscal HKA80</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Mesas y comandas por QR</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Monitor de ventas en el celular</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={openTrialModal}
                className="w-full py-2.5 px-4 rounded-xl border border-zinc-300 hover:bg-zinc-50 font-semibold text-xs text-zinc-900 transition-colors cursor-pointer"
              >
                Comenzar prueba gratis
              </button>
            </div>

            {/* Card 2 */}
            <div className="p-7 rounded-2xl bg-white border-2 border-zinc-950 shadow-md flex flex-col justify-between space-y-6 relative">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-950 text-white">
                    Plan Completo
                  </span>
                  <span className="text-xs font-bold text-emerald-700 mono-num">
                    {formatBs((billingCycle === 'annual' ? 25 : 30) * rate)} / mes
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-zinc-950">Licencia por Local</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-zinc-950 mono-num">
                      {billingCycle === 'annual' ? '$25' : '$30'}
                    </span>
                    <span className="text-xs text-zinc-500 font-medium">/ mes (a tasa BCV)</span>
                  </div>
                  {billingCycle === 'annual' && (
                    <span className="text-[11px] text-zinc-500 block mt-0.5">
                      Pago único anual de $300 (Ahorras $60)
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-600 leading-relaxed">
                  Reportas tu Pago Móvil desde la misma aplicación y tu licencia se renueva al instante.
                </p>

                <ul className="space-y-2 text-xs text-zinc-700 pt-2 border-t border-zinc-100 font-medium">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Facturación fiscal ilimitada</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Copia de seguridad en la nube</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Libros de Compra y Venta (Excel)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Soporte directo por WhatsApp</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={openTrialModal}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 font-semibold text-xs text-white shadow-xs transition-all cursor-pointer"
              >
                Crear cuenta y descargar
              </button>
            </div>

            {/* Card 3 */}
            <div className="p-7 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700">
                  Varios Locales
                </span>
                <div>
                  <h3 className="text-lg font-bold text-zinc-950">Varias Sucursales</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-zinc-950">Atención directa</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Para negocios con varias sedes bajo el mismo RIF o locales con más de una caja de facturación.
                </p>
                <ul className="space-y-2 text-xs text-zinc-600 pt-2 border-t border-zinc-100">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Cuentas separadas por sucursal</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Varias cajas e impresoras fiscales</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Acompañamiento en la puesta en marcha</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Atención prioritaria por WhatsApp</li>
                </ul>
              </div>

              <a
                href="https://wa.me/584120000000?text=Hola,%20me%20interesa%20FacturasYa%20para%20mi%20negocio"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl border border-zinc-300 hover:bg-zinc-50 font-semibold text-xs text-zinc-900 transition-colors text-center block"
              >
                Escribir por WhatsApp
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
            <span>© {new Date().getFullYear()} FacturasYa · Punto de venta fiscal para Venezuela.</span>
          </div>

          <div className="flex items-center gap-5 font-medium text-zinc-600">
            <a href="#comparativa" className="hover:text-zinc-950">Ventajas</a>
            <a href="#caracteristicas" className="hover:text-zinc-950">Funciones</a>
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
                  <h3 className="text-sm font-bold text-zinc-950">
                    FacturasYa
                  </h3>
                  <span className="text-[11px] text-zinc-500">
                    {authTab === 'signup' ? 'Crea tu cuenta gratis en segundos' : 'Ingresa a tu cuenta'}
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
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 font-semibold text-xs text-white shadow-xs transition-all"
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
                        <span className="text-zinc-400">Seguridad:</span>
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
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 font-semibold text-xs text-white shadow-xs transition-all flex items-center justify-center gap-2 mt-2 active:scale-98 cursor-pointer"
                >
                  {submitting
                    ? (authTab === 'signup' ? 'Creando cuenta...' : 'Iniciando sesión...')
                    : (authTab === 'signup' ? 'Crear cuenta y empezar 14 días gratis' : 'Entrar a mi cuenta')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
