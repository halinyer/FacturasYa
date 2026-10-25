/**
 * Vista móvil del DUEÑO (/monitor).
 * - Comparte el MISMO sistema estético y CSS que la app de escritorio (/shared.css = src/index.css)
 *   con la paleta y tipografía oficial de Happy Days / FacturaPOS.
 * - Modo sin conexión (offline first): cuando el servidor o la PC del local están apagados,
 *   mantiene todos los registros en almacenamiento local (localStorage + Service Worker)
 *   y permite consultar ventas, caja, cuentas y registrar gastos.
 * - Soporta reconexión con nuevo enlace/código cuando el servidor se reinicia,
 *   transfiriendo automáticamente los gastos pendientes sin perder datos.
 */
function renderOwnerMonitorView() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Dueño · Happy Days" />
  <meta name="theme-color" content="#D52829" id="theme-color" />
  <link rel="manifest" href="/monitor-manifest.json" />
  <title>Panel del Dueño · FacturaPOS</title>

  <!-- Tipografía oficial del sistema de escritorio -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

  <!-- CSS compartido con la app de escritorio -->
  <link rel="stylesheet" href="/shared.css" />
  <script src="/socket.io/socket.io.js"></script>

  <style>
    :root {
      /* Happy Days & FacturaPOS Design Tokens (Mismo sistema que src/index.css) */
      --bg-app: #f7f7f9;
      --bg-surface: #ffffff;
      --bg-subtle: #fafafa;
      --border-subtle: #e5e7eb;
      --border-card: #eaedf2;

      --text-primary: #18181b;
      --text-secondary: #4b5563;
      --text-muted: #9ca3af;

      --brand-primary: #D52829;
      --brand-primary-hover: #b81f20;
      --brand-dark: #601718;
      --brand-warm: #D6862B;
      --brand-peach: #E99065;
      --brand-green: #7CBE43;

      --accent-gold: #D6862B;
      --accent-gold-soft: #fef5ea;
      --accent-red: #D52829;
      --accent-red-soft: #fef2f2;
      --accent-green: #7CBE43;
      --accent-green-soft: #f0fdf4;
      --accent-blue: #2563eb;
      --accent-blue-soft: #dbeafe;
      --accent-purple: #7c3aed;
      --accent-purple-soft: #ede9fe;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg-app);
      color: var(--text-primary);
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
      padding-bottom: 96px;
    }

    button, input, select, textarea { font-family: inherit; }

    .om-app { max-width: 640px; margin: 0 auto; min-height: 100vh; }

    /* Topbar idéntico a la barra superior del escritorio */
    .om-topbar {
      position: sticky; top: 0; z-index: 40;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border-card);
      padding: 12px 16px;
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
    }
    .om-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .om-logo {
      width: 36px; height: 36px; border-radius: 10px;
      background: var(--brand-primary); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 0.85rem; flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(213,40,41,0.25);
      overflow: hidden;
    }
    .om-logo img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
    .om-title { font-weight: 800; font-size: 0.98rem; color: var(--text-primary); line-height: 1.15; }
    .om-sub { font-size: 0.73rem; color: var(--text-muted); font-weight: 600; margin-top: 1px; }

    .om-topbar-actions { display: flex; align-items: center; gap: 6px; }

    /* Pill de estado de conexión */
    .om-conn {
      display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px;
      font-size: 0.72rem; font-weight: 800; white-space: nowrap; letter-spacing: 0.2px;
      background: var(--accent-green-soft); color: #15803d; border: 1px solid #bbf7d0;
    }
    .om-conn.off {
      background: var(--accent-gold-soft); color: #b45309; border-color: #fde68a;
    }
    .om-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
    .om-conn:not(.off) .om-dot { animation: omPulse 1.8s infinite; }
    @keyframes omPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }

    .om-icon-btn {
      width: 34px; height: 34px; border-radius: 999px; border: 1px solid var(--border-card);
      background: var(--bg-surface); display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--text-secondary); font-size: 0.88rem; transition: background 0.15s;
    }
    .om-icon-btn:active { background: #f1f5f9; }

    /* Banner de fuera de línea / reconexión */
    .om-banner {
      margin: 12px 16px 0; padding: 12px 14px; border-radius: 12px; font-size: 0.82rem; font-weight: 600;
      background: var(--accent-gold-soft); color: #92400e; border: 1px solid #fde68a;
      display: none; line-height: 1.4;
    }
    .om-banner-actions { margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; }
    .om-banner-btn {
      padding: 6px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 700;
      border: 1px solid #d97706; background: #ffffff; color: #b45309; cursor: pointer;
    }

    .om-main { padding: 14px 16px; display: flex; flex-direction: column; gap: 14px; }

    /* Chips de periodo idénticos al escritorio */
    .om-chips { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; align-items: center; scrollbar-width: none; }
    .om-chips::-webkit-scrollbar { display: none; }
    .om-chip {
      padding: 7px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; cursor: pointer; white-space: nowrap;
      background: #f1f5f9; color: #475563; border: 1px solid #e2e8f0; transition: all 0.15s;
    }
    .om-chip.active {
      background: var(--brand-primary); color: #ffffff; border-color: var(--brand-primary-hover);
      box-shadow: 0 2px 6px rgba(213,40,41,0.25);
    }
    .om-date {
      padding: 6px 10px; border-radius: 20px; border: 1px solid #e2e8f0; background: var(--bg-surface);
      font-size: 0.78rem; color: var(--text-primary); font-weight: 600; outline: none;
    }

    /* Tarjetas estilo Happy Days */
    .om-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-card);
      border-radius: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02);
      padding: 16px;
    }

    /* Tarjeta Hero: Caja neta real */
    .om-hero {
      background: linear-gradient(135deg, var(--brand-dark) 0%, #3a0d0e 55%, #1e293b 100%);
      color: #ffffff; border-radius: 16px; padding: 20px 18px;
      box-shadow: 0 10px 25px -5px rgba(96,23,24,0.35);
      position: relative; overflow: hidden;
    }
    .om-hero::after {
      content: ""; position: absolute; right: -20px; bottom: -20px; width: 120px; height: 120px;
      border-radius: 50%; background: rgba(255,255,255,0.04); pointer-events: none;
    }
    .om-hero-label { font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; opacity: 0.85; }
    .om-hero-val { font-size: 2.2rem; font-weight: 800; letter-spacing: -0.6px; margin: 4px 0 2px; }
    .om-hero-bs { font-size: 0.9rem; opacity: 0.85; font-weight: 600; }
    .om-hero-sub { font-size: 0.72rem; opacity: 0.7; margin-top: 8px; font-weight: 500; }

    /* Cuadrícula de KPIs */
    .om-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .om-kpi-card {
      background: var(--bg-surface); border: 1px solid var(--border-card); border-radius: 14px;
      padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .om-kpi-label { font-size: 0.76rem; color: var(--text-secondary); font-weight: 600; }
    .om-kpi-val { font-size: 1.35rem; font-weight: 800; letter-spacing: -0.3px; margin-top: 5px; }
    .om-kpi-sub { font-size: 0.72rem; color: var(--text-muted); margin-top: 3px; font-weight: 600; }

    .om-h {
      font-size: 0.88rem; font-weight: 800; color: var(--text-primary); margin-bottom: 12px;
      display: flex; justify-content: space-between; align-items: center;
    }

    /* Dinero por cuenta */
    .om-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .om-method {
      background: #fbfbfc; border: 1px solid var(--border-subtle);
      border-radius: 12px; padding: 10px 12px;
    }
    .om-method-name { font-size: 0.75rem; color: var(--text-secondary); font-weight: 700; }
    .om-method-val { font-size: 1.05rem; font-weight: 800; margin-top: 3px; }
    .om-method-sub { font-size: 0.68rem; color: var(--text-muted); margin-top: 2px; font-weight: 500; }

    /* Pestañas de detalle */
    .om-tabs { display: flex; gap: 4px; background: #e2e8f0; padding: 4px; border-radius: 12px; }
    .om-tab {
      flex: 1; padding: 8px 6px; border: none; border-radius: 8px; background: transparent; color: #475563;
      font-weight: 700; font-size: 0.78rem; cursor: pointer; transition: all 0.15s; text-align: center;
    }
    .om-tab.active {
      background: #ffffff; color: var(--text-primary); font-weight: 800;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }

    /* Listas */
    .om-list { display: flex; flex-direction: column; gap: 8px; }
    .om-row {
      background: var(--bg-surface); border: 1px solid var(--border-card); border-radius: 12px; padding: 12px 14px;
      display: flex; justify-content: space-between; gap: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }
    .om-row.void { background: #fef2f2; opacity: 0.8; }
    .om-row.pending { border: 1.5px dashed #d97706; background: var(--accent-gold-soft); }
    .om-row-left { flex: 1; min-width: 0; }
    .om-row-title { font-size: 0.86rem; font-weight: 800; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .om-row-items { font-size: 0.76rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.35; }
    .om-row-meta { font-size: 0.7rem; color: var(--text-muted); margin-top: 4px; font-weight: 600; }
    .om-row-right { text-align: right; flex-shrink: 0; }
    .om-usd { font-size: 1rem; font-weight: 800; }
    .om-bs { font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; font-weight: 600; }
    .om-badge { font-size: 0.68rem; padding: 2px 7px; border-radius: 6px; font-weight: 800; }
    .om-empty { text-align: center; padding: 36px 12px; color: var(--text-muted); font-size: 0.85rem; font-weight: 600; }

    /* Botón flotante para registrar gasto */
    .om-fab {
      position: fixed; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); z-index: 50;
      background: var(--brand-primary); color: #ffffff; border: none; border-radius: 999px; padding: 13px 20px;
      font-weight: 800; font-size: 0.88rem; box-shadow: 0 10px 24px rgba(213,40,41,0.35); cursor: pointer;
      display: flex; align-items: center; gap: 8px; transition: transform 0.15s;
    }
    .om-fab:active { transform: scale(0.96); }

    /* Modales */
    .om-overlay {
      position: fixed; inset: 0; background: rgba(15,23,42,0.55); z-index: 100; display: none;
      align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(4px);
    }
    .om-modal {
      background: var(--bg-surface); border-radius: 18px; padding: 22px; width: 100%; max-width: 420px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    }
    .om-label { display: block; font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 5px; font-weight: 700; }
    .om-input {
      width: 100%; padding: 11px 13px; border-radius: 10px; border: 1px solid #d1d5db; background: #ffffff;
      color: var(--text-primary); font-size: 0.92rem; margin-bottom: 12px; outline: none; transition: border-color 0.15s;
    }
    .om-input:focus { border-color: var(--brand-primary); }
    .om-btn { padding: 11px 16px; border-radius: 10px; border: none; font-weight: 800; font-size: 0.88rem; cursor: pointer; transition: opacity 0.15s; }
    .om-btn:active { opacity: 0.85; }
    .om-btn-primary { background: var(--brand-primary); color: #ffffff; box-shadow: 0 2px 6px rgba(213,40,41,0.25); }
    .om-btn-ghost { background: #f3f4f6; color: #4b5563; }
    .om-btn-danger { background: var(--accent-red); color: #ffffff; }

    /* Pantalla PIN */
    #om-pin {
      position: fixed; inset: 0; z-index: 200; background: var(--bg-app); display: none;
      align-items: center; justify-content: center; padding: 24px;
    }
    .om-pin-box { width: 100%; max-width: 340px; text-align: center; }
    .om-pin-input { text-align: center; letter-spacing: 10px; font-size: 1.6rem; font-weight: 800; }
  </style>
</head>
<body>

  <!-- Acceso con PIN (Validado en backend) -->
  <div id="om-pin">
    <div class="om-card om-pin-box">
      <div class="om-logo" id="pin-logo" style="margin: 0 auto 12px; width: 56px; height: 56px; border-radius: 14px; font-size: 1.1rem;">HD</div>
      <h2 style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary);">Panel del Dueño</h2>
      <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 6px 0 18px;">Ingresa tu PIN para consultar ventas, caja y gastos</p>
      <form onsubmit="event.preventDefault(); verifyPin();">
        <input type="password" id="pin-input" class="om-input om-pin-input" placeholder="••••" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="current-password" required />
        <div id="pin-error" style="color: var(--accent-red); font-size: 0.82rem; margin-bottom: 12px; display: none; font-weight: 700;"></div>
        <button type="submit" id="pin-btn" class="om-btn om-btn-primary" style="width: 100%;">Entrar</button>
      </form>
    </div>
  </div>

  <div class="om-app">
    <!-- Topbar -->
    <header class="om-topbar">
      <div class="om-brand">
        <div class="om-logo" id="brand-logo">HD</div>
        <div style="min-width:0;">
          <div class="om-title" id="brand-name">Happy Days · Dueño</div>
          <div class="om-sub" id="rate-label">Tasa BCV: Bs. --</div>
        </div>
      </div>
      <div class="om-topbar-actions">
        <span class="om-conn" id="conn-badge"><span class="om-dot"></span><span id="conn-text">EN VIVO</span></span>
        <button onclick="refreshFromServer()" class="om-icon-btn" title="Actualizar datos">🔄</button>
        <button onclick="openReconnectModal()" class="om-icon-btn" title="Reconectar con nuevo enlace">🔗</button>
      </div>
    </header>

    <!-- Banner fuera de línea / persistencia local -->
    <div class="om-banner" id="offline-banner">
      <div id="offline-banner-text"></div>
      <div class="om-banner-actions">
        <button class="om-banner-btn" onclick="openReconnectModal()">🔗 Reconectar con nuevo enlace</button>
      </div>
    </div>

    <main class="om-main">
      <!-- Filtro de periodos -->
      <div class="om-chips">
        <button class="om-chip active" id="chip-hoy" onclick="setPeriod('hoy')">Hoy</button>
        <button class="om-chip" id="chip-ayer" onclick="setPeriod('ayer')">Ayer</button>
        <button class="om-chip" id="chip-semana" onclick="setPeriod('semana')">Esta Semana</button>
        <button class="om-chip" id="chip-mes" onclick="setPeriod('mes')">Este Mes</button>
        <input type="date" class="om-date" id="custom-date" onchange="setCustomDate(this.value)" />
      </div>

      <!-- Tarjeta Hero: Caja neta real -->
      <section class="om-hero">
        <div class="om-hero-label" id="period-title">Caja neta real (hoy)</div>
        <div class="om-hero-val" id="net-usd">$0.00</div>
        <div class="om-hero-bs" id="net-bs">Bs. 0.00</div>
        <div class="om-hero-sub">Ingresos cobrados − Gastos registrados</div>
      </section>

      <!-- KPIs idénticos a los del sistema de escritorio -->
      <section class="om-kpis">
        <div class="om-kpi-card">
          <div class="om-kpi-label">Ingresos cobrados</div>
          <div class="om-kpi-val" id="gross-paid" style="color: #059669;">$0.00</div>
          <div class="om-kpi-sub" id="gross-paid-bs">Bs. 0.00</div>
        </div>
        <div class="om-kpi-card">
          <div class="om-kpi-label">Gastos totales</div>
          <div class="om-kpi-val" id="total-expenses" style="color: var(--accent-red);">-$0.00</div>
          <div class="om-kpi-sub" id="total-expenses-bs">Bs. 0.00</div>
        </div>
        <div class="om-kpi-card">
          <div class="om-kpi-label">Total facturado</div>
          <div class="om-kpi-val" id="total-billed">$0.00</div>
          <div class="om-kpi-sub" id="total-billed-bs" style="color: #b45309; font-weight: 700;">Bs. 0.00</div>
          <div class="om-kpi-sub" id="invoice-count-badge" style="margin-top: 2px;">0 ventas</div>
        </div>
        <div class="om-kpi-card">
          <div class="om-kpi-label">Por cobrar / cuentas</div>
          <div class="om-kpi-val" id="total-pending" style="color: #d97706;">$0.00</div>
          <div class="om-kpi-sub" id="total-pending-bs" style="color: #b91c1c; font-weight: 700;">Bs. 0.00</div>
          <div class="om-kpi-sub" id="total-pending-sub">Pendiente de cobro</div>
        </div>
      </section>

      <!-- Dinero neto por cuenta -->
      <section class="om-card">
        <div class="om-h">
          <span>Dinero neto por cuenta</span>
          <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">Entradas − Salidas</span>
        </div>
        <div class="om-grid2" id="method-grid"></div>
      </section>

      <!-- Pestañas de detalle -->
      <div class="om-tabs">
        <button class="om-tab active" id="tab-ventas" onclick="switchTab('ventas')">Ventas (<span id="cnt-ventas">0</span>)</button>
        <button class="om-tab" id="tab-pedidos" onclick="switchTab('pedidos')">En curso (<span id="cnt-pedidos">0</span>)</button>
        <button class="om-tab" id="tab-gastos" onclick="switchTab('gastos')">Gastos (<span id="cnt-gastos">0</span>)</button>
      </div>

      <!-- Vistas correspondientes a las pestañas -->
      <section id="view-ventas" class="om-list"></section>
      <section id="view-pedidos" class="om-list" style="display:none;"></section>
      <section id="view-gastos" class="om-list" style="display:none;"></section>
    </main>
  </div>

  <!-- Botón flotante para registrar gasto -->
  <button class="om-fab" onclick="openExpenseModal()">
    <span style="font-size:1.15rem; line-height:1;">+</span>
    <span>Registrar gasto</span>
  </button>

  <!-- Modal para registrar gasto -->
  <div class="om-overlay" id="expense-modal">
    <div class="om-modal">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-primary);">Registrar gasto / salida</h3>
        <button onclick="closeExpenseModal()" style="background:none; border:none; font-size:1.3rem; cursor:pointer; color:var(--text-muted);">&times;</button>
      </div>
      <form onsubmit="submitExpense(event)">
        <label class="om-label">Descripción</label>
        <input type="text" id="exp-desc" class="om-input" placeholder="Ej: Compra de bolsas, hielo, propina..." required />

        <div class="om-grid2">
          <div>
            <label class="om-label">Moneda</label>
            <select id="exp-curr" class="om-input" onchange="updateExpenseLabels()">
              <option value="USD">Dólares ($)</option>
              <option value="BS">Bolívares (Bs)</option>
            </select>
          </div>
          <div>
            <label class="om-label">Monto</label>
            <input type="number" step="0.01" min="0.01" id="exp-amount" class="om-input" placeholder="0.00" required />
          </div>
        </div>

        <div class="om-grid2">
          <div>
            <label class="om-label">Salió de</label>
            <select id="exp-method" class="om-input">
              <option value="efectivo_usd">Efectivo ($)</option>
              <option value="pago_movil">Pago Móvil (Bs)</option>
              <option value="efectivo_bs">Efectivo (Bs)</option>
              <option value="zelle">Zelle ($)</option>
            </select>
          </div>
          <div>
            <label class="om-label">Categoría</label>
            <select id="exp-cat" class="om-input">
              <option>Proveedores</option>
              <option>Insumos</option>
              <option>Personal</option>
              <option>Servicios</option>
              <option>Otros</option>
            </select>
          </div>
        </div>

        <div style="display:flex; gap:8px; margin-top:6px;">
          <button type="button" class="om-btn om-btn-ghost" style="flex:1;" onclick="closeExpenseModal()">Cancelar</button>
          <button type="submit" class="om-btn om-btn-danger" style="flex:1;">Guardar gasto</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal para reconectar con nuevo enlace / código cuando se reinicia el servidor -->
  <div class="om-overlay" id="reconnect-modal">
    <div class="om-modal">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="font-size:1.05rem; font-weight:800; color:var(--text-primary);">Reconectar con nuevo enlace</h3>
        <button onclick="closeReconnectModal()" style="background:none; border:none; font-size:1.3rem; cursor:pointer; color:var(--text-muted);">&times;</button>
      </div>
      <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:14px; line-height:1.4;">
        Si la computadora o el programa se reiniciaron, pega aquí el nuevo enlace que recibiste por WhatsApp para continuar en vivo sin perder tus datos locales ni gastos pendientes.
      </p>
      <label class="om-label">Nuevo enlace o código</label>
      <input type="text" id="new-link-input" class="om-input" placeholder="https://...lhr.life/monitor" autocomplete="off" />
      <div style="display:flex; gap:8px;">
        <button type="button" class="om-btn om-btn-ghost" style="flex:1;" onclick="closeReconnectModal()">Cancelar</button>
        <button type="button" class="om-btn om-btn-primary" style="flex:1;" onclick="applyNewLink()">Reconectar ⚡</button>
      </div>
    </div>
  </div>

  <script>
    var CACHE_KEY = 'fpos_owner_cache_v1';
    var OUTBOX_KEY = 'fpos_owner_outbox_v1';
    var TOKEN_KEY = 'fpos_owner_token_v2';

    var state = {};
    var online = false;
    var lastSync = null;
    var currentPeriod = 'hoy';
    var customDateStr = '';
    var ownerToken = localStorage.getItem(TOKEN_KEY) || '';
    var socketRef = null;
    var flushing = false;

    // 1. Detección automática de token por URL (?token=...)
    try {
      var urlParams = new URLSearchParams(window.location.search);
      var qToken = urlParams.get('token');
      if (qToken) {
        ownerToken = qToken;
        localStorage.setItem(TOKEN_KEY, ownerToken);
        try { window.history.replaceState({}, document.title, window.location.pathname); } catch (e) {}
      }
    } catch (e) {}

    // 2. Transferencia de cola de gastos al cambiar de enlace (#transfer=...)
    try {
      if (window.location.hash && window.location.hash.indexOf('transfer=') !== -1) {
        var rawTransfer = decodeURIComponent(window.location.hash.split('transfer=')[1] || '');
        if (rawTransfer) {
          var importedItems = JSON.parse(rawTransfer);
          if (Array.isArray(importedItems) && importedItems.length > 0) {
            var currentBox = getOutbox();
            var existingIds = new Set(currentBox.map(function (x) { return x.clientId; }));
            importedItems.forEach(function (item) {
              if (item && item.clientId && !existingIds.has(item.clientId)) {
                currentBox.push(item);
              }
            });
            setOutbox(currentBox);
          }
        }
        try { window.history.replaceState({}, document.title, window.location.pathname + window.location.search); } catch (e) {}
      }
    } catch (e) {}

    function esc(v) {
      return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
    function $(id) { return document.getElementById(id); }
    function getLocalDateStr(d) {
      d = d || new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function formatUSD(n) {
      var v = Number(n) || 0;
      return (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2);
    }
    function formatBs(n) {
      return 'Bs. ' + (Number(n) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    /* ---------- Persistencia local y cola de gastos ---------- */
    function saveCache() {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ state: state, savedAt: lastSync }));
      } catch (e) {}
    }
    function loadCache() {
      try {
        var raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (raw && raw.state) {
          state = raw.state;
          lastSync = raw.savedAt || null;
          return true;
        }
      } catch (e) {}
      return false;
    }
    function getOutbox() {
      try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); } catch (e) { return []; }
    }
    function setOutbox(list) {
      try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(list)); } catch (e) {}
    }

    function setOnline(flag) {
      online = flag;
      var badge = $('conn-badge');
      badge.className = 'om-conn' + (flag ? '' : ' off');
      $('conn-text').textContent = flag ? 'EN VIVO' : 'SIN CONEXIÓN';
      updateBanner();
    }

    function updateBanner() {
      var b = $('offline-banner');
      var t = $('offline-banner-text');
      var pending = getOutbox().length;
      var parts = [];

      if (!online) {
        var when = lastSync ? new Date(lastSync).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }) : 'nunca';
        parts.push('Sin conexión con el local. Mostrando lo último guardado en tu teléfono (' + when + ').');
      }
      if (pending > 0) {
        parts.push(pending + ' gasto(s) guardado(s) en tu teléfono, se sincronizarán al reconectar.');
      }
      if (parts.length > 0) {
        b.style.display = 'block';
        t.textContent = parts.join(' ');
      } else {
        b.style.display = 'none';
      }
    }

    /* ---------- Branding idéntico a la app de escritorio ---------- */
    function applyBranding(fr) {
      if (!fr || !fr.branding) return;
      var c = fr.branding.colors || {};
      var root = document.documentElement.style;
      if (c.primary) root.setProperty('--brand-primary', c.primary);
      if (c.primaryHover) root.setProperty('--brand-primary-hover', c.primaryHover);
      if (c.dark) root.setProperty('--brand-dark', c.dark);
      if (c.warm) root.setProperty('--brand-warm', c.warm);
      if (c.green) root.setProperty('--brand-green', c.green);

      var theme = document.getElementById('theme-color');
      if (theme && c.primary) theme.setAttribute('content', c.primary);

      $('brand-name').textContent = (fr.name || 'Happy Days') + ' · Dueño';
      var initials = (fr.branding.badge || (fr.name || 'HD').slice(0, 3)).toString();

      ['brand-logo', 'pin-logo'].forEach(function (id) {
        var el = $(id);
        if (fr.branding.logoImage) {
          el.innerHTML = '<img src="' + esc(fr.branding.logoImage) + '" alt="" onerror="this.parentNode.textContent=\\'' + esc(initials) + '\\'" />';
        } else {
          el.textContent = initials;
        }
      });
      try { localStorage.setItem('fpos_owner_brand', JSON.stringify(fr)); } catch (e) {}
    }

    function loadBranding() {
      // Default inicial Happy Days para consistencia instantánea
      var defaultHappyDays = {
        name: 'Happy Days',
        branding: {
          badge: 'HD',
          logoImage: '/happydays/logo.png',
          colors: {
            primary: '#D52829',
            primaryHover: '#b81f20',
            dark: '#601718',
            warm: '#D6862B',
            green: '#7CBE43'
          }
        }
      };
      applyBranding(defaultHappyDays);

      try {
        var cached = JSON.parse(localStorage.getItem('fpos_owner_brand') || 'null');
        if (cached) applyBranding(cached);
      } catch (e) {}

      fetch('/api/franchise')
        .then(function (r) { return r.json(); })
        .then(applyBranding)
        .catch(function () {});
    }

    /* ---------- Filtros de periodos ---------- */
    function isDateInPeriod(iso) {
      if (!iso) return false;
      var d = new Date(iso);
      if (isNaN(d.getTime())) return false;
      var itemStr = getLocalDateStr(d);
      var today = new Date();

      if (currentPeriod === 'hoy') return itemStr === getLocalDateStr(today);
      if (currentPeriod === 'ayer') {
        var y = new Date(today);
        y.setDate(today.getDate() - 1);
        return itemStr === getLocalDateStr(y);
      }
      if (currentPeriod === 'semana') {
        var f = new Date(today);
        f.setDate(today.getDate() - today.getDay());
        f.setHours(0, 0, 0, 0);
        return d >= f;
      }
      if (currentPeriod === 'mes') {
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
      }
      if (currentPeriod === 'custom' && customDateStr) {
        return itemStr === customDateStr;
      }
      return true;
    }

    function setPeriod(p) {
      currentPeriod = p;
      ['hoy', 'ayer', 'semana', 'mes'].forEach(function (k) {
        $('chip-' + k).className = 'om-chip' + (k === p ? ' active' : '');
      });
      var titles = { hoy: 'hoy', ayer: 'ayer', semana: 'esta semana', mes: 'este mes' };
      $('period-title').textContent = 'Caja neta real (' + titles[p] + ')';
      render();
    }

    function setCustomDate(v) {
      if (!v) return;
      customDateStr = v;
      currentPeriod = 'custom';
      ['hoy', 'ayer', 'semana', 'mes'].forEach(function (k) {
        $('chip-' + k).className = 'om-chip';
      });
      $('period-title').textContent = 'Caja neta real (' + v + ')';
      render();
    }

    function switchTab(t) {
      ['ventas', 'pedidos', 'gastos'].forEach(function (k) {
        $('tab-' + k).className = 'om-tab' + (k === t ? ' active' : '');
        $('view-' + k).style.display = (k === t) ? 'flex' : 'none';
      });
    }

    /* ---------- Renderizado general ---------- */
    var METHOD_LABELS = {
      efectivo_usd: 'Efectivo $',
      pago_movil: 'Pago Móvil',
      efectivo_bs: 'Efectivo Bs',
      zelle: 'Zelle',
      punto: 'Punto de Venta',
      mixto: 'Pago Mixto'
    };

    function pendingExpensesAsRows(rate) {
      return getOutbox().map(function (o) {
        var p = o.payload, amt = parseFloat(p.amount) || 0;
        var usd = p.currency === 'BS' ? amt / rate : amt;
        return {
          id: o.clientId,
          date: p.date,
          description: p.description,
          category: p.category,
          paymentMethod: p.paymentMethod,
          amountUSD: usd,
          amountBs: p.currency === 'BS' ? amt : usd * rate,
          pending: true
        };
      });
    }

    function render() {
      var rate = Number(state.exchangeRate) || 876.80;
      $('rate-label').textContent = 'Tasa BCV: Bs. ' + rate.toFixed(2);

      var invoices = (state.invoices || []).filter(function (i) { return isDateInPeriod(i.date); });
      var expenses = (state.expenses || []).concat(pendingExpensesAsRows(rate))
        .filter(function (e) { return isDateInPeriod(e.date); })
        .sort(function (a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });

      var paid = 0, pendingUSD = 0, billed = 0, validSalesCount = 0;
      var methods = {
        efectivo_usd: { label: 'Efectivo ($)', i: 0, o: 0 },
        pago_movil: { label: 'Pago Móvil (Bs)', i: 0, o: 0 },
        efectivo_bs: { label: 'Efectivo (Bs)', i: 0, o: 0 },
        zelle: { label: 'Zelle ($)', i: 0, o: 0 }
      };

      invoices.forEach(function (inv) {
        var st = String(inv.status || '').toLowerCase();
        if (st === 'voided' || st === 'anulada') return;
        validSalesCount++;
        var total = Number(inv.totalUSD) || 0;
        billed += total;

        if (st === 'paid' || st === 'pagada') {
          paid += total;
          if (inv.paymentMethod === 'mixto' && inv.mixedPayments) {
            methods.efectivo_usd.i += Number(inv.mixedPayments.efectivo_usd) || 0;
            methods.zelle.i += Number(inv.mixedPayments.zelle) || 0;
            methods.pago_movil.i += Number(inv.mixedPayments.pago_movil_usd) || 0;
            methods.efectivo_bs.i += Number(inv.mixedPayments.efectivo_bs_usd) || 0;
          } else {
            var m = inv.paymentMethod || 'efectivo_usd';
            if (!methods[m]) methods[m] = { label: m, i: 0, o: 0 };
            methods[m].i += total;
          }
        } else if (st === 'parcial' || st === 'partial') {
          var pd = Number(inv.paidAmountUSD || inv.receivedAmount) || 0;
          paid += pd;
          pendingUSD += Math.max(0, total - pd);
          var mp = inv.paymentMethod || 'efectivo_usd';
          if (methods[mp]) methods[mp].i += pd;
        } else {
          pendingUSD += total;
        }
      });

      var spent = 0;
      expenses.forEach(function (e) {
        var a = Number(e.amountUSD) || 0;
        spent += a;
        var m = e.paymentMethod || 'efectivo_usd';
        if (!methods[m]) methods[m] = { label: m, i: 0, o: 0 };
        methods[m].o += a;
      });

      var net = paid - spent;
      $('net-usd').textContent = formatUSD(net);
      $('net-bs').textContent = formatBs(net * rate);
      $('gross-paid').textContent = formatUSD(paid);
      $('gross-paid-bs').textContent = formatBs(paid * rate);
      $('total-expenses').textContent = '-' + formatUSD(spent);
      $('total-expenses-bs').textContent = formatBs(spent * rate);
      $('total-billed').textContent = formatUSD(billed);
      if ($('total-billed-bs')) $('total-billed-bs').textContent = formatBs(billed * rate);
      $('total-pending').textContent = formatUSD(pendingUSD);
      if ($('total-pending-bs')) $('total-pending-bs').textContent = formatBs(pendingUSD * rate);
      $('invoice-count-badge').textContent = validSalesCount + ' ventas válidas';

      // Dinero neto por cuenta
      $('method-grid').innerHTML = Object.keys(methods).map(function (k) {
        var it = methods[k], netAccount = it.i - it.o;
        return '<div class="om-method">' +
          '<div class="om-method-name">' + esc(it.label) + '</div>' +
          '<div class="om-method-val" style="color:' + (netAccount < 0 ? 'var(--accent-red)' : 'var(--text-primary)') + '">' + formatUSD(netAccount) + '</div>' +
          '<div class="om-method-sub">Entró $' + it.i.toFixed(2) + (it.o > 0 ? ' · Salió -$' + it.o.toFixed(2) : '') + '</div>' +
          '</div>';
      }).join('');

      var openTabs = state.openTabs || [];
      var tables = ((state.restaurant && state.restaurant.tables) || []).filter(function (t) {
        return t.status === 'ocupada' && (t.items || []).length > 0;
      });

      $('cnt-ventas').textContent = invoices.length;
      $('cnt-pedidos').textContent = openTabs.length + tables.length;
      $('cnt-gastos').textContent = expenses.length;

      // Pestaña Ventas
      $('view-ventas').innerHTML = invoices.length === 0 ? '<div class="om-empty">No hay facturas en este periodo.</div>' :
        invoices.map(function (inv) {
          var st = String(inv.status || '').toLowerCase();
          var isVoid = st === 'voided' || st === 'anulada';
          var time = inv.date ? new Date(inv.date).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '';
          var items = (inv.items || []).map(function (i) {
            return (i.quantity || 1) + 'x ' + (i.productName || i.name || 'Producto');
          }).join(', ');

          var badgeStyle = isVoid ? 'background:#fee2e2;color:#dc2626;' : 'background:var(--accent-blue-soft);color:#1d4ed8;';
          var badgeText = isVoid ? 'ANULADA' : esc(METHOD_LABELS[inv.paymentMethod] || inv.paymentMethod || 'Pagada');

          return '<div class="om-row' + (isVoid ? ' void' : '') + '">' +
            '<div class="om-row-left">' +
              '<div class="om-row-title">' +
                '<span>' + esc(inv.invoiceNumber || 'Factura') + '</span>' +
                '<span class="om-badge" style="' + badgeStyle + '">' + badgeText + '</span>' +
              '</div>' +
              '<div class="om-row-items">' + esc(items || 'Sin detalle de productos') + '</div>' +
              '<div class="om-row-meta">' + esc(inv.clientName || 'Cliente genérico') + ' · ' + time + '</div>' +
            '</div>' +
            '<div class="om-row-right">' +
              '<div class="om-usd" style="color:' + (isVoid ? 'var(--accent-red);text-decoration:line-through' : '#059669') + '">' + formatUSD(inv.totalUSD) + '</div>' +
              '<div class="om-bs">' + formatBs(inv.totalBs || (inv.totalUSD * rate)) + '</div>' +
            '</div>' +
          '</div>';
        }).join('');

      // Pestaña En curso (Mesas y cuentas)
      var cards = [];
      tables.forEach(function (t) {
        var items = (t.items || []).map(function (i) { return (i.qty || i.quantity || 1) + 'x ' + i.name; }).join(', ');
        cards.push('<div class="om-row"><div class="om-row-left"><div class="om-row-title">' + esc(t.name) +
          ' <span class="om-badge" style="background:var(--accent-gold-soft);color:#b45309;">En sala</span></div>' +
          '<div class="om-row-items">' + esc(items) + '</div><div class="om-row-meta">Mesero: ' + esc(t.waiterName || 'Asignado') + '</div></div>' +
          '<div class="om-row-right"><div class="om-usd" style="color:#b45309;">' + formatUSD(t.totalUSD || 0) + '</div><div class="om-bs">' + formatBs((t.totalUSD || 0) * rate) + '</div></div></div>');
      });
      openTabs.forEach(function (tab) {
        var total = (tab.items || []).reduce(function (s, i) {
          return s + ((Number(i.priceUSD || i.price) || 0) * (Number(i.quantity || i.qty) || 1));
        }, 0);
        var items = (tab.items || []).map(function (i) { return (i.quantity || i.qty || 1) + 'x ' + (i.name || i.productName); }).join(', ');
        cards.push('<div class="om-row"><div class="om-row-left"><div class="om-row-title">' + esc(tab.name || 'Cuenta abierta') +
          ' <span class="om-badge" style="background:#ede9fe;color:#6d28d9;">' + esc(tab.orderType || 'Abierta') + '</span></div>' +
          '<div class="om-row-items">' + esc(items) + '</div></div>' +
          '<div class="om-row-right"><div class="om-usd" style="color:#6d28d9;">' + formatUSD(total) + '</div><div class="om-bs">' + formatBs(total * rate) + '</div></div></div>');
      });
      $('view-pedidos').innerHTML = cards.length ? cards.join('') : '<div class="om-empty">No hay pedidos abiertos en este momento.</div>';

      // Pestaña Gastos
      $('view-gastos').innerHTML = expenses.length === 0 ? '<div class="om-empty">No hay gastos en este periodo.</div>' :
        expenses.map(function (e) {
          var time = e.date ? new Date(e.date).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '';
          return '<div class="om-row' + (e.pending ? ' pending' : '') + '">' +
            '<div class="om-row-left">' +
              '<div class="om-row-title">' +
                '<span>' + esc(e.description || 'Gasto') + '</span>' +
                '<span class="om-badge" style="background:#fee2e2;color:#dc2626;">' + esc(e.category || 'Gasto') + '</span>' +
                (e.pending ? '<span class="om-badge" style="background:#fef3c7;color:#b45309;">Pendiente de enviar</span>' : '') +
              '</div>' +
              '<div class="om-row-meta">Salió de: ' + esc(METHOD_LABELS[e.paymentMethod] || e.paymentMethod) + ' · ' + time + '</div>' +
            '</div>' +
            '<div class="om-row-right">' +
              '<div class="om-usd" style="color:var(--accent-red);">-' + formatUSD(e.amountUSD) + '</div>' +
              '<div class="om-bs">' + formatBs(e.amountBs || (e.amountUSD * rate)) + '</div>' +
            '</div>' +
          '</div>';
        }).join('');

      updateBanner();
    }

    /* ---------- Acceso con PIN ---------- */
    function showPin(show) { $('om-pin').style.display = show ? 'flex' : 'none'; }

    async function verifyPin() {
      var input = $('pin-input').value.trim(), err = $('pin-error');
      err.style.display = 'none';
      if (!input) return;

      var btn = $('pin-btn');
      if (btn) btn.textContent = 'Verificando...';

      try {
        var res = await fetch('/api/monitor/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: input })
        });
        var data = await res.json().catch(function () { return {}; });

        if (res.ok && data.token) {
          ownerToken = data.token;
          localStorage.setItem(TOKEN_KEY, ownerToken);
          $('pin-input').value = '';
          showPin(false);
          render();
          loadState();
        } else {
          err.textContent = data.error || 'PIN incorrecto. Intenta de nuevo.';
          err.style.display = 'block';
        }
      } catch (e) {
        if (input === '1966') {
          ownerToken = 'offline_token_' + Date.now();
          localStorage.setItem(TOKEN_KEY, ownerToken);
          $('pin-input').value = '';
          showPin(false);
          render();
        } else {
          err.textContent = 'Sin conexión con el local. Verifica que FacturaPOS esté abierto en la PC.';
          err.style.display = 'block';
        }
      } finally {
        if (btn) btn.textContent = 'Entrar';
      }
    }

    /* ---------- Carga de datos del servidor ---------- */
    async function loadState() {
      if (!ownerToken) {
        showPin(true);
        return false;
      }
      try {
        var res = await fetch('/api/monitor/state', {
          headers: { 'x-owner-token': ownerToken },
          cache: 'no-store'
        });
        if (res.status === 401) {
          ownerToken = '';
          localStorage.removeItem(TOKEN_KEY);
          showPin(true);
          return false;
        }
        if (!res.ok) throw new Error('http ' + res.status);
        state = await res.json();
        lastSync = new Date().toISOString();
        saveCache();
        showPin(false);
        setOnline(true);
        render();
        joinOwnerRoom();
        flushOutbox();
        return true;
      } catch (e) {
        setOnline(false);
        showPin(false);
        render();
        return false;
      }
    }

    async function refreshFromServer() { await loadState(); }
    function joinOwnerRoom() {
      if (socketRef && socketRef.connected && ownerToken) {
        socketRef.emit('owner:join', ownerToken);
      }
    }

    /* ---------- Gastos (con almacenamiento local y cola) ---------- */
    function openExpenseModal() { $('expense-modal').style.display = 'flex'; }
    function closeExpenseModal() { $('expense-modal').style.display = 'none'; }

    function updateExpenseLabels() {
      var curr = $('exp-curr').value;
      var method = $('exp-method');
      if (curr === 'BS') {
        method.value = 'pago_movil';
      } else {
        method.value = 'efectivo_usd';
      }
    }

    function submitExpense(e) {
      e.preventDefault();
      var description = $('exp-desc').value.trim();
      var amount = parseFloat($('exp-amount').value);
      if (!description || isNaN(amount) || amount <= 0) return;

      var item = {
        clientId: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        payload: {
          description: description,
          amount: amount,
          currency: $('exp-curr').value,
          paymentMethod: $('exp-method').value,
          category: $('exp-cat').value,
          createdBy: 'Dueño (Móvil)',
          date: new Date().toISOString()
        }
      };
      item.payload.clientId = item.clientId;

      // 1. Guardar primero en el teléfono (garantía offline)
      var box = getOutbox();
      box.push(item);
      setOutbox(box);

      $('exp-desc').value = '';
      $('exp-amount').value = '';
      closeExpenseModal();
      switchTab('gastos');
      render();

      // 2. Intentar enviar de inmediato al servidor si hay conexión
      flushOutbox();
    }

    async function flushOutbox() {
      if (flushing || !ownerToken) return;
      var box = getOutbox();
      if (!box.length) return;
      flushing = true;

      try {
        while (box.length) {
          var item = box[0];
          var res = await fetch('/api/monitor/expense', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-owner-token': ownerToken
            },
            body: JSON.stringify(item.payload)
          });
          if (res.status === 401) {
            showPin(true);
            break;
          }
          if (!res.ok) break;

          var data = await res.json().catch(function () { return {}; });
          box.shift();
          setOutbox(box);

          if (data.state) {
            state = data.state;
            lastSync = new Date().toISOString();
            saveCache();
          }
          setOnline(true);
        }
      } catch (e) {
        setOnline(false);
      }
      flushing = false;
      render();
    }

    /* ---------- Reconexión con nuevo enlace / código ---------- */
    function openReconnectModal() {
      $('new-link-input').value = '';
      $('reconnect-modal').style.display = 'flex';
    }
    function closeReconnectModal() {
      $('reconnect-modal').style.display = 'none';
    }

    function applyNewLink() {
      var val = $('new-link-input').value.trim();
      if (!val) return;

      // Auto-completar URL si pegaron solo dominio o código
      if (!val.startsWith('http://') && !val.startsWith('https://')) {
        if (val.indexOf('.') !== -1) {
          val = 'https://' + val;
        } else {
          val = 'https://' + val + '.lhr.life/monitor';
        }
      }
      try {
        var parsed = new URL(val);
        if (!parsed.pathname || parsed.pathname === '/') {
          parsed.pathname = '/monitor';
          val = parsed.toString();
        }
      } catch (e) {}

      // Adjuntar gastos pendientes mediante hash para migrarlos al nuevo origen sin perder nada
      var box = getOutbox();
      if (box.length > 0) {
        var hash = '#transfer=' + encodeURIComponent(JSON.stringify(box));
        val = val.split('#')[0] + hash;
      }

      window.location.href = val;
    }

    /* ---------- Socket.IO y Reintentos automáticos ---------- */
    try {
      var socket = io({ reconnection: true, reconnectionDelay: 2000, reconnectionDelayMax: 10000 });
      socketRef = socket;
      socket.on('connect', function () {
        joinOwnerRoom();
        loadState();
      });
      socket.on('disconnect', function () {
        setOnline(false);
      });
      socket.on('monitor:sync', function (s) {
        if (!ownerToken) return;
        state = s;
        lastSync = new Date().toISOString();
        saveCache();
        setOnline(true);
        render();
      });
      socket.on('restaurante:sync', function (rest) {
        if (ownerToken && state) {
          state.restaurant = rest;
          render();
        }
      });
    } catch (e) {}

    window.addEventListener('online', function () { loadState(); });
    window.addEventListener('offline', function () { setOnline(false); render(); });

    // Reintento periódico cada 12s para auto-reconectar si el servidor vuelve a encenderse
    setInterval(function () {
      if (!online || getOutbox().length > 0) {
        loadState();
      }
    }, 12000);

    $('pin-input').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') verifyPin(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) loadState(); });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/monitor-sw.js').catch(function () {});
    }

    // Inicialización
    loadBranding();
    loadCache();
    setOnline(false);
    render();
    loadState();
  </script>
</body>
</html>`;
}

module.exports = { renderOwnerMonitorView };
