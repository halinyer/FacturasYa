import React, { useState } from 'react';

const SOURCE_OF_TRUTH = [
  {
    domain: 'Quién es Super Admin',
    location: 'supabase/schema.sql → tabla public.super_admins + función is_super_admin()',
    rule: 'Solo los correos en esta tabla (signalnotestudio@gmail.com) tienen permiso en el servidor para aprobar pagos, extender días o suspender.'
  },
  {
    domain: 'Cálculo de días restantes y vencimiento',
    location: 'supabase/schema.sql → RPC verify_tenant_license() y vista admin_tenants_overview',
    rule: 'Se calcula siempre con NOW() del servidor de PostgreSQL. El POS además guarda una marca de agua monotónica (saas_clock_guard) en src/lib/syncEngine.js para bloquear la caja si atrasan el reloj de Windows.'
  },
  {
    domain: 'Aprobación de Pago Móvil y +30/+365 días',
    location: 'supabase/schema.sql → RPC approve_subscription_payment() y admin_extend_tenant()',
    rule: 'El POS y el Monitor solo insertan pagos en estado "pending". Solo el servidor (vía Super Admin o API bancaria en Edge Function) puede pasarlos a "approved" y sumar días.'
  },
  {
    domain: 'Datos Fiscales del Negocio (Razón Social, RIF, Dirección, Serial Z)',
    location: 'Tabla public.tenants → inyectado en el POS vía src/config/franchises/index.js (CLIENT_CONFIG)',
    rule: 'El dueño los completa en el Dashboard (Verificación Fiscal). El POS los descarga al iniciar sesión y alimenta automáticamente los Libros SENIAT (seniatCsvExporter.js), Forma 30 y Facturas.'
  },
  {
    domain: 'Comunicación con Impresora Fiscal HKA80',
    location: 'electron/fiscalPrinterService.cjs + bin/bridge_fiscal.exe (compilado desde fiscal_service/bridge_fiscal.py)',
    rule: 'Se comunica por puerto serial COM. Cuenta con auto-reparación (Self-Healing): si Windows borra el .exe temporal, lo restaura desde app.asar hacia AppData/Roaming.'
  },
  {
    domain: 'Sincronización Caja PC → Monitor del Dueño',
    location: 'src/contexts/DataContext.jsx → pushLocalSnapshotToCloud() → tabla public.tenant_snapshots',
    rule: 'Unidireccional (PC es la fuente de verdad fiscal → Nube → Celular del dueño en modo lectura Realtime). Evita choques de concurrencia.'
  }
];

const PLAYBOOKS = [
  {
    id: 'happydays-usb',
    tag: 'Clientes Locales (Pendrive)',
    title: '1. Compilar y pasar a pendrive para Happy Days o Helados Cali',
    when: 'Cuando hiciste una mejora para un cliente actual de pendrive y no quieres tocar nada del SaaS.',
    steps: [
      'Cambia a la rama del cliente (nunca mezcles con saas/cloud):',
      'Compila el empaquetado win-unpacked y el ejecutable:',
      'Copia la carpeta dist-electron/win-unpacked al pendrive.'
    ],
    commands: `cd "c:\\Users\\halin\\OneDrive\\Escritorio\\Finanzas personales\\facturacion-pos"
git checkout cliente/happy-days
npm run electron:build`
  },
  {
    id: 'saas-release',
    tag: 'Lanzamiento SaaS',
    title: '2. Publicar nueva versión del instalador SaaS (.exe) para descarga web',
    when: 'Cuando mejoraste el POS en la rama saas/cloud y quieres que el botón de descarga de la web baje la versión nueva.',
    steps: [
      'Asegúrate de estar en la rama saas/cloud:',
      'Ejecuta el build del instalador de Windows:',
      'Sube el archivo generado en dist-electron/ a un nuevo Release en GitHub (github.com/halinyer/FacturasYa/releases).'
    ],
    commands: `cd "c:\\Users\\halin\\OneDrive\\Escritorio\\Finanzas personales\\facturacion-pos"
git checkout saas/cloud
npm run electron:build`
  },
  {
    id: 'pago-movil-unlock',
    tag: 'Operación Diaria',
    title: '3. Desbloquear a un restaurante que pagó por Pago Móvil o Efectivo',
    when: 'Un cliente reportó su Pago Móvil desde la caja/celular o te pagó en efectivo.',
    steps: [
      'Si reportó Pago Móvil: ve a la pestaña "Pagos" de este panel, verifica en tu banco los últimos 6 dígitos y el monto en Bs, y pulsa "Aprobar".',
      'Si te pagó en efectivo o Zelle directo: ve a la pestaña "Restaurantes" y pulsa "+30 días" o "+1 año" en su fila.',
      'El desbloqueo ocurre en menos de 2 segundos vía Supabase Realtime sin que el cliente reinicie la PC.'
    ],
    commands: null
  },
  {
    id: 'fiscal-printer-debug',
    tag: 'Soporte Técnico',
    title: '4. Diagnóstico rápido si la Máquina Fiscal HKA80 no imprime o no lee memoria',
    when: 'El cajero dice que la factura no sale por la máquina fiscal o da error al leer reportes Z.',
    steps: [
      'Verifica en el Administrador de Dispositivos de Windows en qué puerto COM está el cable USB-Serial (ej. COM2, COM3).',
      'En el POS, abre Configuración de Impresora Fiscal y selecciona ese puerto COM.',
      'Verifica que la máquina fiscal no tenga un documento abierto a mitad o falta de papel (luz de error). Si está bloqueada, apaga y enciende la HKA80.',
      'El puente bridge_fiscal.exe se auto-repara solo en C:\\Users\\<Usuario>\\AppData\\Roaming\\facturacion-pos\\bin\\bridge_fiscal.exe.'
    ],
    commands: null
  },
  {
    id: 'pc-formateada',
    tag: 'Recuperación de Desastres',
    title: '5. El cliente formateó o cambió la PC de la caja',
    when: 'Se dañó el disco duro del restaurante o compraron una computadora nueva.',
    steps: [
      'En la PC nueva, entra a tu web y descarga el instalador FacturaPOS-Setup.exe.',
      'Abre el programa e inicia sesión con el correo y contraseña del restaurante.',
      'El motor pullCloudSnapshotToLocal() descarga automáticamente de Supabase sus productos, clientes, inventario, reportes Z, historial de facturas y sus datos fiscales SENIAT.'
    ],
    commands: null
  }
];

export default function RunbookPanel() {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const copyCmd = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredTruth = SOURCE_OF_TRUTH.filter((item) =>
    `${item.domain} ${item.location} ${item.rule}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Encabezado del Runbook */}
      <div className="card space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
          Documentación Privada de Ingeniería · Solo Super Admin
        </span>
        <h2 className="text-lg font-extrabold text-zinc-950">
          Mapa de Arquitectura & Runbook de Operaciones
        </h2>
        <p className="text-xs text-zinc-600 leading-relaxed">
          Esta guía viva documenta cómo está organizado todo tu ecosistema, qué archivo manda sobre cada función (principio de cero duplicación) y qué hacer paso a paso en cada situación operativa.
        </p>
      </div>

      {/* 1. Mapa de las 4 Piezas y Ramas de Git */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card space-y-3">
          <h3 className="text-sm font-bold text-zinc-950">Estructura del Monorepo (Dónde está cada pieza)</h3>
          <div className="p-3 rounded-xl bg-zinc-950 text-zinc-100 font-mono text-xs leading-relaxed overflow-x-auto">
            <div>facturacion-pos/ <span className="text-zinc-400">← Raíz del repositorio Git</span></div>
            <div>├─ src/ <span className="text-emerald-400">← Pieza 1: POS Caja (React + Electron)</span></div>
            <div>├─ electron/ <span className="text-zinc-400">← Proceso nativo Windows + Puente Fiscal</span></div>
            <div>├─ fiscal_service/ <span className="text-zinc-400">← Código Python de bridge_fiscal.exe</span></div>
            <div>├─ supabase/ <span className="text-amber-300">← schema.sql + Edge Functions (Backend)</span></div>
            <div>├─ web/ <span className="text-sky-400">← Web en Vercel (Piezas 2, 3 y 4)</span></div>
            <div>│  ├─ src/features/landing/ <span className="text-zinc-400">← Pieza 4: Landing `/`</span></div>
            <div>│  ├─ src/features/monitor/ <span className="text-zinc-400">← Pieza 3: Monitor `/monitor`</span></div>
            <div>│  └─ src/features/super-admin/ <span className="text-zinc-400">← Pieza 2: Admin `/super-admin`</span></div>
            <div>└─ docs/ <span className="text-zinc-400">← Documentación técnica privada</span></div>
          </div>
        </div>

        <div className="card space-y-3">
          <h3 className="text-sm font-bold text-zinc-950">Mapa de Ramas de Git (Regla de Aislamiento)</h3>
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="flex items-center justify-between">
                <strong className="font-mono text-zinc-950">saas/cloud</strong>
                <span className="badge green">Rama Principal SaaS</span>
              </div>
              <p className="text-zinc-600 mt-1">
                Contiene las 4 piezas del modelo por suscripción, Supabase, Paywall, Pago Móvil y la carpeta <code>web/</code>.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="flex items-center justify-between">
                <strong className="font-mono text-zinc-950">cliente/happy-days</strong>
                <span className="badge amber">Producción Local (Intocable)</span>
              </div>
              <p className="text-zinc-600 mt-1">
                Versión offline dedicada de Happy Days con su memoria fiscal probada. Solo se toca cuando ellos piden un ajuste.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="flex items-center justify-between">
                <strong className="font-mono text-zinc-950">cliente/helados-cali</strong>
                <span className="badge amber">Producción Local (Intocable)</span>
              </div>
              <p className="text-zinc-600 mt-1">
                Versión offline dedicada de Helados Cali. Aislada para no afectar su operación actual.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tabla de Fuente Única de Verdad */}
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">
              ¿Dónde vive cada regla? (Principio de Cero Duplicación)
            </h3>
            <p className="text-xs text-zinc-500">
              Busca cualquier función para saber exactamente qué archivo abrir cuando quieras modificar algo:
            </p>
          </div>
          <input
            type="text"
            placeholder="Filtrar (ej. fiscal, reloj, pago, seniat)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 280 }}
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Función / Responsabilidad</th>
                <th>Archivo exacto (Único lugar)</th>
                <th>Cómo funciona / Regla de negocio</th>
              </tr>
            </thead>
            <tbody>
              {filteredTruth.map((row) => (
                <tr key={row.domain}>
                  <td><strong>{row.domain}</strong></td>
                  <td><code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded">{row.location}</code></td>
                  <td className="text-xs text-zinc-600">{row.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Playbooks Operativos Paso a Paso */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-zinc-950">
          Runbooks de Operación (Qué hacer paso a paso en cada caso)
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          {PLAYBOOKS.map((pb) => (
            <div key={pb.id} className="card space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="badge green">{pb.tag}</span>
                <h4 className="font-bold text-sm text-zinc-950">{pb.title}</h4>
                <p className="text-xs text-zinc-500"><strong>Cuándo usarlo:</strong> {pb.when}</p>
                <ol className="text-xs text-zinc-700 space-y-1 pl-4 list-decimal">
                  {pb.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>

              {pb.commands && (
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                    <span>Comandos de terminal:</span>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => copyCmd(pb.id, pb.commands)}
                    >
                      {copiedId === pb.id ? '✓ Copiado' : 'Copiar comandos'}
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-xl bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto">
                    {pb.commands}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
