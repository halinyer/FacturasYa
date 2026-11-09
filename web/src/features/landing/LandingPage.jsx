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
  X,
  DollarSign,
  Zap,
  TrendingUp,
  Sparkles,
  AlertCircle
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
            <a href="#soluciones" className="hover:text-zinc-950 transition-colors">¿Por qué FacturasYa?</a>
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
      <section className="relative pt-12 pb-20 overflow-hidden bg-gradient-to-b from-zinc-50/60 via-white to-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto space-y-6">

            {/* Pill Hook */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100/90 border border-zinc-200/80 text-xs font-semibold text-zinc-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Punto de venta fiscal y control de caja para comercios y restaurantes en Venezuela
            </div>

            {/* Titular Emocional y de Alto Impacto */}
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-950 leading-[1.12]">
              Control total de tu negocio, cero pérdidas en caja y adiós al miedo al SENIAT.
            </h1>

            {/* Subtítulo enfocado en la transformación diaria del dueño */}
            <p className="text-base sm:text-lg text-zinc-600 leading-relaxed max-w-2xl mx-auto font-normal">
              Cobra en 3 clics fijando precios en dólares a tasa oficial BCV, imprime en tu máquina fiscal <strong className="text-zinc-950 font-semibold">The Factory HKA80</strong> y audita cada bolívar y dólar en tiempo real desde tu celular, sin tener que vivir encerrado en el local.
            </p>

            {/* Botones de Acción */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={INSTALLER_URL}
                download="FacturaPOS-1.0.0.exe"
                className="bg-zinc-950 hover:bg-zinc-800 text-white font-medium text-sm px-6 py-3.5 rounded-xl shadow-sm hover:shadow transition-all inline-flex items-center gap-2 active:scale-98 cursor-pointer"
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
                  <span>Crear cuenta y probar gratis</span>
                  <ArrowRight size={15} className="text-zinc-500" />
                </button>
              )}
            </div>

            {/* Micro-beneficios de Tranquilidad Inmediata */}
            <div className="flex flex-wrap items-center justify-center gap-5 pt-3 text-xs text-zinc-600">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> 14 días gratis sin tarjeta
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> Pagas en Bs por Pago Móvil
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> Cajeros aprenden en 5 min
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> Sigue cobrando si cae internet
              </span>
            </div>
          </div>

          {/* VISTA ANIMADA DE LA APLICACIÓN REAL */}
          <NotionAppShowcase rate={rate} />
        </div>
      </section>

      {/* LOS 4 DOLORES QUE FACTURASYA RESUELVE DE RAÍZ */}
      <section id="soluciones" className="py-20 border-t border-zinc-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Diseñado para la realidad comercial venezolana
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
              Los 4 dolores que le cuestan dinero y tranquilidad a tu negocio todos los días
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed max-w-2xl mx-auto">
              Administrar un local en Venezuela ya es bastante retador. Tu software de punto de venta debería blindar tu dinero y darte paz mental, no crear más problemas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">

            {/* Dolor 1: Vueltos y Descuadres */}
            <div className="p-7 rounded-2xl border border-zinc-200 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 hover:shadow-xs transition-all space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center font-bold">
                  <DollarSign size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-red-600 uppercase tracking-wide">El dolor #1</span>
                  <h3 className="font-bold text-base text-zinc-950">Descuadres nocturnos y vueltos enredados</h3>
                </div>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                <strong className="text-zinc-900 font-semibold">El problema diario:</strong> Cajeros usando la calculadora del teléfono para convertir de $ a Bs, cuentas mal sacadas con billetes de baja denominación, pagos mixtos sin registrar y $30 o $50 que "desaparecen" misteriosamente al cerrar la caja.
              </p>
              <div className="p-3.5 rounded-xl bg-white border border-emerald-200 text-xs text-zinc-800 space-y-1 shadow-2xs">
                <div className="font-semibold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  Cómo te ayuda FacturasYa:
                </div>
                <p className="text-zinc-600 leading-relaxed pl-5">
                  Precios fijados en dólares con conversión instantánea a tasa BCV. Cobro multimoneda en 3 segundos: divide el pago entre Pago Móvil, Punto, Efectivo $ o Zelle, y el sistema te dice el vuelto exacto al centavo. Cero pérdidas.
                </p>
              </div>
            </div>

            {/* Dolor 2: Miedo al SENIAT */}
            <div className="p-7 rounded-2xl border border-zinc-200 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 hover:shadow-xs transition-all space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">El dolor #2</span>
                  <h3 className="font-bold text-base text-zinc-950">Miedo constante a multas y clausuras del SENIAT</h3>
                </div>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                <strong className="text-zinc-900 font-semibold">El problema diario:</strong> La máquina fiscal se traba a mitad del turno, se olvidan de sacar el reporte Z diario, las facturas no tienen el RIF del cliente y los libros de venta están atrasados meses con el contador llamando al borde del colapso.
              </p>
              <div className="p-3.5 rounded-xl bg-white border border-emerald-200 text-xs text-zinc-800 space-y-1 shadow-2xs">
                <div className="font-semibold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  Cómo te ayuda FacturasYa:
                </div>
                <p className="text-zinc-600 leading-relaxed pl-5">
                  Integración nativa con impresoras fiscales The Factory HKA80. Emite facturas fiscales con RIF, notas de crédito y cierres Z en 2 segundos. Descarga tus Libros de Compra y Venta en Excel clasificados por alícuotas en 1 solo clic.
                </p>
              </div>
            </div>

            {/* Dolor 3: Esclavitud del dueño */}
            <div className="p-7 rounded-2xl border border-zinc-200 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 hover:shadow-xs transition-all space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center font-bold">
                  <Smartphone size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wide">El dolor #3</span>
                  <h3 className="font-bold text-base text-zinc-950">Estar encadenado al mostrador 14 horas al día</h3>
                </div>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                <strong className="text-zinc-900 font-semibold">El problema diario:</strong> No puedes salir del local ni cenar con tu familia sin la angustia de no saber cuánto se ha vendido, si los mesoneros están cobrando bien o si los cajeros están manipulando las ventas mientras tú no estás.
              </p>
              <div className="p-3.5 rounded-xl bg-white border border-emerald-200 text-xs text-zinc-800 space-y-1 shadow-2xs">
                <div className="font-semibold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  Cómo te ayuda FacturasYa:
                </div>
                <p className="text-zinc-600 leading-relaxed pl-5">
                  Tu negocio en tu bolsillo. Abre FacturasYa en el navegador de tu celular desde cualquier lugar y audita en vivo: ventas acumuladas, desglose por efectivo o Pago Móvil, mesas ocupadas y facturas emitidas en tiempo real.
                </p>
              </div>
            </div>

            {/* Dolor 4: Software obsoleto y costos ocultos */}
            <div className="p-7 rounded-2xl border border-zinc-200 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 hover:shadow-xs transition-all space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold">
                  <Zap size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wide">El dolor #4</span>
                  <h3 className="font-bold text-base text-zinc-950">Sistemas viejos de $800 que parecen Windows 95</h3>
                </div>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                <strong className="text-zinc-900 font-semibold">El problema diario:</strong> Programas anticuados y lentos que requieren semanas para capacitar a un cajero nuevo, licencias anuales obligatorias carísimas, y pagarle $50 a un técnico cada vez que se descalibra una máquina.
              </p>
              <div className="p-3.5 rounded-xl bg-white border border-emerald-200 text-xs text-zinc-800 space-y-1 shadow-2xs">
                <div className="font-semibold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  Cómo te ayuda FacturasYa:
                </div>
                <p className="text-zinc-600 leading-relaxed pl-5">
                  Interfaz moderna y limpia estilo Notion, tan intuitiva que cualquier cajero la domina en 5 minutos. Instalador ligero para Windows, copia de seguridad automática en la nube y soporte directo en español por WhatsApp.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* COMPARATIVA TRANSPARENTE */}
      <section id="comparativa" className="py-20 border-t border-zinc-100 bg-zinc-50/50">
        <div className="max-w-5xl mx-auto px-4 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-3xl font-extrabold text-zinc-950 tracking-tight">
              ¿Cómo se compara FacturasYa con lo que hay en el mercado?
            </h2>
            <p className="text-sm text-zinc-600">
              Compara con los sistemas tradicionales de escritorio y con las aplicaciones extranjeras que no se adaptan al país.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 uppercase text-[11px] font-semibold">
                  <th className="py-4 px-5">Situación real en tu negocio</th>
                  <th className="py-4 px-5">Sistemas tradicionales (A2, Saint, Valery)</th>
                  <th className="py-4 px-5">Apps extranjeras (Square, Loyverse)</th>
                  <th className="py-4 px-5 bg-zinc-950 text-white font-bold">FacturasYa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Costo de inicio</td>
                  <td className="py-4 px-5 text-zinc-500">$500 a $1,200 + costo de técnico instalador</td>
                  <td className="py-4 px-5 text-zinc-500">Exigen tarjeta de crédito internacional en dólares</td>
                  <td className="py-4 px-5 bg-zinc-50 font-bold text-emerald-700">
                    14 días gratis, luego $20/mes en Bs por Pago Móvil
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Cobro con tasa oficial BCV</td>
                  <td className="py-4 px-5 text-zinc-500">Cálculos manuales torpes y propensos a errores</td>
                  <td className="py-4 px-5 text-red-600 font-medium">No entienden pagos bimoneda ni tasa BCV</td>
                  <td className="py-4 px-5 bg-zinc-50 font-semibold text-zinc-900">
                    Conversión instantánea a tasa BCV y vuelto exacto
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Impresora fiscal SENIAT (HKA80)</td>
                  <td className="py-4 px-5 text-zinc-500">Cobran módulos y licencias fiscales por separado</td>
                  <td className="py-4 px-5 text-red-600 font-medium">Incompatibles: solo tickets térmicos sin validez fiscal</td>
                  <td className="py-4 px-5 bg-zinc-50 font-semibold text-zinc-900">
                    Conexión nativa incluida: Facturas con RIF, X y Z
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-5 font-semibold text-zinc-900">Monitoreo en el celular del dueño</td>
                  <td className="py-4 px-5 text-zinc-500">Imposible sin gastar en servidores y redes VPN complejas</td>
                  <td className="py-4 px-5 text-zinc-500">Tienen app móvil, pero sin datos fiscales venezolanos</td>
                  <td className="py-4 px-5 bg-zinc-50 font-semibold text-zinc-900">
                    Entras desde tu teléfono y ves ventas y caja en vivo
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
                  <td className="py-4 px-5 text-zinc-500">Días de adaptación con terminología de otro país</td>
                  <td className="py-4 px-5 bg-zinc-50 font-semibold text-emerald-700">
                    5 minutos gracias a su diseño limpio e intuitivo
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
              Todo incluido en una sola herramienta
            </h2>
            <p className="text-sm text-zinc-600">
              Sin cobros extras por módulos, sin límites de cajeros y sin complicaciones técnicas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <Printer size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Facturación Fiscal HKA80 Nativa</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Despacha clientes en 10 segundos. Imprime facturas con RIF y razón social, Notas de Crédito, Reporte X y Cierre Z diario cumpliendo la normativa legal del SENIAT.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <QrCode size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Comandas Digitales por QR en Mesas</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Aumenta la rotación de clientes. Los mesoneros toman pedidos con su teléfono celular en el WiFi del local; el ticket se imprime directo en cocina sin gritos ni retrasos.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <FileSpreadsheet size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Libros de Compra y Venta para el Contador</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Ahorra horas de trabajo contable. Genera y descarga en Excel tus libros de compras, ventas y resumen de Z clasificados por alícuotas, listos para declarar el IVA.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <Layers size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Control de Stock y Cero Pérdidas</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Descuenta automáticamente tus productos e insumos al facturar y recibe alertas visuales cuando quede poca mercancía para que nunca te falte inventario en plena hora pico.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <Smartphone size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Monitor de Dueño en Vivo</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Ten paz mental estés donde estés. Revisa desde tu celular cuánto lleva vendido el local hoy, qué mesas están ocupadas y el total recaudado por cada medio de pago en tiempo real.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-bold text-base text-zinc-950">Cierre y Arqueo de Caja Bimoneda</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Cuadra la caja en 2 minutos. Separa con exactitud lo ingresado en Efectivo $, Bolívares en efectivo, Pago Móvil, Punto de Venta y Zelle para evitar descuadres entre turnos.
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
              Precios claros y sin contratos forzosos
            </h2>
            <p className="text-sm text-zinc-600">
              Pagas mes a mes en Bolívares por Pago Móvil a tasa oficial BCV. Sin letras pequeñas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            
            {/* Card 1 */}
            <div className="p-7 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700">
                  Para probar hoy
                </span>
                <div>
                  <h3 className="text-lg font-bold text-zinc-950">Prueba de 14 Días</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-zinc-950 mono-num">$0</span>
                    <span className="text-xs text-zinc-500 font-medium">/ 14 días</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Descarga el programa, instala tu catálogo o menú y pruébalo en tu caja con todas las funciones activas.
                </p>
                <ul className="space-y-2 text-xs text-zinc-600 pt-2 border-t border-zinc-100">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Programa completo para Windows (.EXE)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Conexión con impresora fiscal HKA80</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Mesas y comandas por QR</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Monitor de ventas en tu teléfono</li>
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
                <div>
                  <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-950 text-white">
                    Suscripción Más Popular
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-zinc-950">Licencia por Local</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-zinc-950 mono-num">$20</span>
                    <span className="text-xs text-zinc-500 font-medium">/ mes</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 leading-relaxed">
                  Pagas en Bolívares por Pago Móvil a tasa BCV. Reportas tu pago desde el mismo sistema y listo.
                </p>

                <ul className="space-y-2 text-xs text-zinc-700 pt-2 border-t border-zinc-100 font-medium">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Facturación fiscal ilimitada</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Copia de seguridad automática en la nube</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Libros de Compra y Venta (Excel)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Soporte directo y continuo por WhatsApp</li>
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
                  Cadenas y Franquicias
                </span>
                <div>
                  <h3 className="text-lg font-bold text-zinc-950">Varias Sucursales</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-zinc-950">A consultar</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Para negocios con múltiples sedes o establecimientos grandes con varias cajas de facturación.
                </p>
                <ul className="space-y-2 text-xs text-zinc-600 pt-2 border-t border-zinc-100">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Cuentas separadas por cada sucursal</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Varias cajas e impresoras fiscales conectadas</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Acompañamiento en puesta en marcha</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Atención prioritaria por WhatsApp</li>
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

      {/* BANNER FINAL DE ACCIÓN */}
      <section className="py-16 bg-zinc-950 text-white border-t border-zinc-900">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300">
            <Sparkles size={14} className="text-amber-400" />
            Empieza a proteger tus ingresos hoy mismo
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Deja de perder dinero en caja y factura con total tranquilidad fiscal.
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Instala FacturaPOS en tu computadora en menos de 2 minutos. Prueba todas las funciones durante 14 días sin pagar nada ni ingresar tarjetas.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={INSTALLER_URL}
              download="FacturaPOS-1.0.0.exe"
              className="bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-sm px-6 py-3.5 rounded-xl shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer active:scale-98"
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
            <span>© {new Date().getFullYear()} FacturasYa · Punto de venta fiscal para Venezuela.</span>
          </div>

          <div className="flex items-center gap-5 font-medium text-zinc-600">
            <a href="#soluciones" className="hover:text-zinc-950">Por qué FacturasYa</a>
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
