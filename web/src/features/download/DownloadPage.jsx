import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Laptop,
  Download,
  Printer,
  WifiOff,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Clock,
  Sparkles,
  Layers,
  ChevronDown
} from 'lucide-react';

const INSTALLER_URL =
  import.meta.env.VITE_INSTALLER_URL ||
  'https://github.com/halinyer/FacturasYa/releases/latest/download/FacturaPOS-1.0.0.exe';

export default function DownloadPage() {
  const [downloadStarted, setDownloadStarted] = useState(false);

  const handleDownload = () => {
    setDownloadStarted(true);
    // Disparar descarga real del archivo
    window.location.href = INSTALLER_URL;
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans antialiased selection:bg-zinc-900 selection:text-white">
      
      {/* NAVBAR ESTILO NOTION */}
      <header className="border-b border-zinc-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center font-bold text-sm tracking-tighter">
              FY
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-zinc-950">FacturasYa</span>
              <span className="text-[10px] font-mono font-semibold uppercase text-zinc-400">Desktop</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              Ir a la Versión Web →
            </Link>
            <button
              type="button"
              onClick={handleDownload}
              className="bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-2xs hover:shadow transition-all inline-flex items-center gap-1.5 active:scale-98 cursor-pointer"
            >
              <Download size={13} />
              <span>Descargar .EXE</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO PRINCIPAL DE DESCARGA ESTILO NOTION */}
      <main className="max-w-5xl mx-auto px-4 pt-12 pb-20 space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold">
            <Laptop size={14} className="text-sky-600" />
            <span>FacturasYa para Windows 10 & 11 (64-bit)</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-zinc-950 tracking-tight leading-[1.15]">
            La caja registradora física para tu mostrador.
          </h1>

          <p className="text-base text-zinc-600 leading-relaxed">
            Diseñada especialmente para restaurantes y comercios en Venezuela: imprime facturas fiscales SENIAT por cable serial, dispara comandas a cocina y sigue facturando si se corta el internet.
          </p>

          {/* TARJETA DE DESCARGA PRINCIPAL */}
          <div className="pt-4 flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleDownload}
                className="bg-zinc-950 hover:bg-zinc-800 text-white font-extrabold text-sm sm:text-base px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-3 active:scale-98 cursor-pointer group"
              >
                <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
                <span>Descargar para Windows (.exe)</span>
              </button>

              <Link
                to="/app"
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-sm sm:text-base px-6 py-4 rounded-2xl border border-zinc-200 transition-all inline-flex items-center gap-2 active:scale-98"
              >
                <span>Usar en Navegador Web</span>
                <ArrowRight size={16} className="text-zinc-500" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-500 font-mono">
              <span>Versión 1.0.0 Standalone</span>
              <span>·</span>
              <span>Instalador Portable (~139 MB)</span>
              <span>·</span>
              <span className="text-emerald-700 font-bold">100% Libre de Virus</span>
            </div>
          </div>

          {/* BANNER DINÁMICO DE DESCARGA INICIADA ESTILO NOTION */}
          {downloadStarted && (
            <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-left animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
                  <CheckCircle2 size={16} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-xs text-emerald-950">¡Tu descarga ha comenzado!</h3>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Si la descarga no empieza automáticamente en unos segundos,{' '}
                    <a
                      href={INSTALLER_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-bold text-emerald-950 hover:text-emerald-900"
                    >
                      haz clic aquí para descargar manualmente
                    </a>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* GUÍA VISUAL PREVENTIVA WINDOWS SMARTSCREEN */}
          <div className="mt-8 text-left bg-zinc-50 border border-zinc-200/90 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/70 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-bold">
                  <ShieldCheck size={13} className="text-blue-600" />
                  Guía de Instalación Segura en Windows
                </div>
                <h3 className="text-lg font-extrabold text-zinc-950 tracking-tight">
                  ¿Windows o tu navegador muestran una advertencia preventiva?
                </h3>
              </div>
              <span className="text-xs text-zinc-500 bg-white px-3 py-1.5 rounded-xl border border-zinc-200 font-medium">
                Paso normal en software nuevo
              </span>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Como FacturasYa es una versión de lanzamiento reciente, Microsoft SmartScreen y Google Chrome aún no han acumulado miles de descargas para indexarla automáticamente en su base de datos. <strong>La aplicación es 100% segura, libre de virus y verificada.</strong> Sigue estos 2 sencillos pasos:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Paso 1 */}
              <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-zinc-950 text-white font-mono font-bold text-xs flex items-center justify-center">
                    1
                  </div>
                  <strong className="text-xs font-bold text-zinc-950">En tu Navegador (Chrome o Edge)</strong>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Si dice <em>"Este archivo no se descarga habitualmente"</em>, haz clic en el menú de descarga (o los 3 puntos) y selecciona <strong>"Conservar"</strong> o <strong>"Descargar de todos modos"</strong>.
                </p>
              </div>

              {/* Paso 2 */}
              <div className="p-4 rounded-2xl bg-white border border-blue-200 bg-blue-50/30 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                    2
                  </div>
                  <strong className="text-xs font-bold text-blue-950">En la Pantalla Azul de Windows</strong>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Cuando Windows muestre <em>"Windows protegió su PC"</em>, haz clic en el texto subrayado <strong>"Más información"</strong> y luego pulsa el botón <strong>"Ejecutar de todas formas"</strong>.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>¿Prefieres no instalar nada? Puedes usar FacturasYa directamente desde Google Chrome.</span>
              </span>
              <Link
                to="/app"
                className="font-bold underline text-emerald-950 hover:text-emerald-800 text-xs inline-flex items-center gap-1"
              >
                <span>Abrir Versión Web</span>
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        </div>

        {/* COMPARACIÓN ESTILO NOTION: ¿POR QUÉ USAR LA APP DE ESCRITORIO? */}
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight">
              ¿Por qué instalar la App en tu PC de caja?
            </h2>
            <p className="text-xs text-zinc-500">
              La versión Web te permite monitorear y vender en la nube, pero la PC física de mostrador necesita el ejecutable nativo:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <WifiOff size={18} />
              </div>
              <h3 className="font-bold text-sm text-zinc-950">Modo Offline Blindado</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Si se cae CANTV, la fibra o el router del local, tu cajero puede seguir cobrando y emitiendo notas sin interrupción. Al volver la señal, todas las ventas se sincronizan solas con la nube.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                <Printer size={18} />
              </div>
              <h3 className="font-bold text-sm text-zinc-950">Conexión Física HKA80 / Serial</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Los navegadores web no tienen acceso directo a puertos COM por seguridad. La app de Windows se comunica directamente por cable RS232 (puerto COM2) a 9600 baudios con tu máquina fiscal The Factory.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Cpu size={18} />
              </div>
              <h3 className="font-bold text-sm text-zinc-950">Auditoría Memoria Z para Contador</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Extrae el historial oficial de reportes Z directamente del chip físico de la máquina por rango de fechas (Octubre, etc.) y genera la planilla Forma 30 SENIAT en CSV para tu contador sin descuadres.
              </p>
            </div>

          </div>
        </div>

        {/* PASOS DE INSTALACIÓN ESTILO NOTION (3 PASOS FÁCILES) */}
        <div className="border border-zinc-200 rounded-3xl p-6 sm:p-8 bg-zinc-50/50 space-y-6">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
              Instalación sin complicaciones
            </span>
            <h2 className="text-xl font-black text-zinc-950 tracking-tight">
              Configura tu caja en menos de 2 minutos
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            <div className="space-y-2 relative">
              <div className="w-7 h-7 rounded-full bg-zinc-950 text-white font-mono font-bold text-xs flex items-center justify-center">
                1
              </div>
              <h4 className="font-bold text-xs text-zinc-900">Ejecuta el Instalador</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Abre el archivo descargado <code>FacturaPOS-1.0.0.exe</code>. Es una versión portable o standalone que no requiere configuraciones complejas de Windows.
              </p>
            </div>

            <div className="space-y-2 relative">
              <div className="w-7 h-7 rounded-full bg-zinc-950 text-white font-mono font-bold text-xs flex items-center justify-center">
                2
              </div>
              <h4 className="font-bold text-xs text-zinc-900">Conecta el Cable Serial / USB</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Enchufa el cable serial RS232 de tu impresora fiscal HKA80 (o USB con adaptador) al puerto COM de la PC. El sistema detecta el puerto automáticamente.
              </p>
            </div>

            <div className="space-y-2 relative">
              <div className="w-7 h-7 rounded-full bg-zinc-950 text-white font-mono font-bold text-xs flex items-center justify-center">
                3
              </div>
              <h4 className="font-bold text-xs text-zinc-900">Inicia Sesión y Factura</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Ingresa con tu correo y contraseña. Tu menú, precios en dólares, mesas y clientes se descargarán solos en el primer segundo.
              </p>
            </div>

          </div>
        </div>

        {/* PREGUNTAS FRECUENTES TÉCNICAS */}
        <div className="max-w-2xl mx-auto space-y-4">
          <h3 className="text-base font-bold text-zinc-950 text-center">
            Preguntas Frecuentes
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1">
              <span className="font-bold text-zinc-900 block">¿Qué pasa si uso la versión Web y la Desktop al mismo tiempo?</span>
              <p className="text-zinc-600 leading-relaxed">
                Ambas están sincronizadas por Supabase en tiempo real. Puedes usar la Desktop en el mostrador para emitir tickets fiscales e imprimir comandas, mientras tú como dueño revisas las ventas desde tu teléfono o laptop con la versión Web.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1">
              <span className="font-bold text-zinc-900 block">¿Qué modelos de impresoras fiscales son compatibles?</span>
              <p className="text-zinc-600 leading-relaxed">
                Es compatible con el protocolo fiscal The Factory HKA (modelos HKA80, Bixolon SRP-350, Dascom y Bematech homologadas por el SENIAT en Venezuela).
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1">
              <span className="font-bold text-zinc-900 block">¿Cómo configuro la comandera de cocina (58mm o 80mm)?</span>
              <p className="text-zinc-600 leading-relaxed">
                Dentro de la aplicación, ve al icono de Comanda o Ajustes ⚙️ y selecciona el formato de rollo (58mm estrecho o 80mm ancho). La aplicación enviará el corte de papel automático al finalizar cada pedido.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* FOOTER SOBRIO ESTILO NOTION */}
      <footer className="border-t border-zinc-100 py-8 text-center text-xs text-zinc-400 space-y-2">
        <p>FacturasYa © {new Date().getFullYear()} · Facturación Fiscal & Punto de Venta para Venezuela</p>
        <div className="flex items-center justify-center gap-4 text-zinc-500">
          <Link to="/" className="hover:text-zinc-900">Inicio</Link>
          <span>·</span>
          <Link to="/app" className="hover:text-zinc-900">Punto de Venta Web</Link>
          
        </div>
      </footer>

    </div>
  );
}
