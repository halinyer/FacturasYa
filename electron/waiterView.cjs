// Complete Toast/Square-inspired commercial tablet diner POS interface for Happy Days
function renderWaiterView() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Happy Days — Comandero de Mesas</title>
  <link rel="manifest" href="data:application/manifest+json;utf8,{'name':'Happy Days Comandero','short_name':'HD Comandas','display':'standalone','start_url':'/waiter'}">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#601718">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background: #f4f4f7; color: #18181b; height: 100vh; display: flex; flex-direction: column; overflow: hidden; user-select: none; }
    
    /* Header Diner */
    header { background: #601718; color: #ffffff; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #D52829; box-shadow: 0 4px 12px rgba(96,23,24,0.25); flex-shrink: 0; z-index: 50; }
    .brand { display: flex; align-items: center; gap: 9px; cursor: pointer; }
    .brand-logo-img { width: 34px; height: 34px; border-radius: 9px; background: #ffffff; object-fit: contain; padding: 2px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
    .brand-text { display: flex; flex-direction: column; line-height: 1.1; }
    .brand-title { font-weight: 900; font-size: 1.05rem; letter-spacing: 0.5px; text-transform: uppercase; color: #ffffff; }
    .brand-sub { font-size: 0.68rem; font-weight: 700; color: #fca5a5; letter-spacing: 1px; text-transform: uppercase; }
    
    .header-actions { display: flex; align-items: center; gap: 8px; }
    .rate-badge { background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.18); color: #fde047; font-weight: 800; font-size: 0.74rem; padding: 5px 9px; border-radius: 8px; display: flex; align-items: center; gap: 4px; white-space: nowrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    
    .icon-btn { position: relative; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); color: #ffffff; width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; }
    .icon-btn:active { transform: scale(0.92); background: rgba(255,255,255,0.25); }
    .notif-badge { position: absolute; top: -5px; right: -5px; background: #D52829; color: #ffffff; font-size: 0.7rem; font-weight: 900; min-width: 19px; height: 19px; border-radius: 999px; display: flex; align-items: center; justify-content: center; padding: 0 4px; border: 2px solid #601718; box-shadow: 0 2px 6px rgba(213,40,41,0.6); animation: pulseBadge 1.8s infinite; }
    @keyframes pulseBadge { 0% { transform: scale(1); } 50% { transform: scale(1.15); box-shadow: 0 0 10px rgba(213,40,41,0.9); } 100% { transform: scale(1); } }
    
    .waiter-badge { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); color: #ffffff; padding: 6px 11px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: background 0.15s; max-width: 130px; }
    .waiter-badge:active { background: rgba(255,255,255,0.3); }
    .waiter-badge-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    main { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 0 16px 120px 16px; display: flex; flex-direction: column; position: relative; -webkit-overflow-scrolling: touch; }

    /* Screen 1: Login / Turno */
    .login-container { margin: auto; max-width: 360px; width: 100%; text-align: center; padding-top: 24px; }
    .login-header-icon { width: 56px; height: 56px; border-radius: 16px; background: #601718; color: #ffffff; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px auto; box-shadow: 0 6px 16px rgba(96,23,24,0.3); border: 2px solid #D52829; }
    .waiter-card-btn { width: 100%; padding: 14px 16px; background: #ffffff; border: 1.5px solid #e4e4e7; border-radius: 14px; font-weight: 800; font-size: 0.96rem; color: #18181b; cursor: pointer; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 6px rgba(0,0,0,0.03); transition: all 0.15s; margin-bottom: 10px; }
    .waiter-card-btn:active { transform: scale(0.98); background: #fafafa; border-color: #D52829; }
    .waiter-card-enter { color: #D52829; font-weight: 900; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px; }

    /* PIN Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(24,24,27,0.7); display: flex; align-items: flex-end; z-index: 200; backdrop-filter: blur(4px); animation: fadeIn 0.2s ease; }
    .modal-overlay.center { align-items: center; justify-content: center; padding: 16px; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .pin-modal-card { background: #ffffff; border-radius: 24px; padding: 22px; width: 100%; max-width: 320px; margin: auto; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid #e4e4e7; animation: zoomIn 0.2s ease; }
    @keyframes zoomIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .pin-dots { display: flex; justify-content: center; gap: 14px; margin: 16px 0 20px 0; }
    .pin-dot { width: 15px; height: 15px; border-radius: 50%; border: 2px solid #cbd5e1; transition: all 0.15s; background: #ffffff; }
    .pin-dot.filled { background: #D52829; border-color: #D52829; transform: scale(1.18); box-shadow: 0 0 8px rgba(213,40,41,0.5); }
    .pin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .pin-key { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px 0; font-size: 1.45rem; font-weight: 800; color: #0f172a; cursor: pointer; transition: all 0.1s; user-select: none; }
    .pin-key:active { background: #D52829; color: #ffffff; border-color: #D52829; transform: scale(0.94); }
    .pin-key.key-action { font-size: 1rem; background: #f1f5f9; color: #64748b; font-weight: 700; }

    /* Sticky Top Bars for Tables and Ordering */
    .tables-top-bar, .order-top-bar { position: sticky; top: 0; background: #f4f4f7; z-index: 30; margin-left: -16px; margin-right: -16px; padding: 10px 16px 8px 16px; border-bottom: 1.5px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.03); margin-bottom: 12px; }

    /* Segmented Zone / Category Bars */
    .zones-bar { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0 6px 0; margin-bottom: 4px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
    .zones-bar::-webkit-scrollbar { display: none; }
    .zone-pill, .cat-pill { flex-shrink: 0; height: 38px; padding: 0 16px; border-radius: 10px; background: #ffffff; color: #475569; font-weight: 800; font-size: 0.8rem; border: 1.5px solid #e2e8f0; white-space: nowrap; cursor: pointer; transition: all 0.12s ease; text-transform: uppercase; letter-spacing: 0.4px; display: inline-flex; align-items: center; justify-content: center; user-select: none; }
    .zone-pill:active, .cat-pill:active { transform: scale(0.96); }
    .zone-pill.active { background: #601718; color: #ffffff; border-color: #601718; box-shadow: 0 3px 10px rgba(96,23,24,0.3); }
    .cat-pill.active { background: #D52829; color: #ffffff; border-color: #D52829; box-shadow: 0 3px 10px rgba(213,40,41,0.3); }

    /* Tables Grid */
    .tables-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; padding-bottom: 40px; }
    .table-card { background: #ffffff; border-radius: 16px; padding: 14px 12px; display: flex; flex-direction: column; justify-content: space-between; min-height: 120px; border: 2px solid #e2e8f0; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.03); transition: transform 0.12s; position: relative; }
    .table-card:active { transform: scale(0.96); }
    .table-card.libre { border-color: #7CBE43; background: #ffffff; }
    .table-card.ocupada { border-color: #D6862B; background: #ffffff; }
    .table-card.cuenta { border-color: #D52829; background: #fff5f5; animation: pulseRed 2s infinite; }
    @keyframes pulseRed { 0% { box-shadow: 0 0 0 0 rgba(213,40,41,0.35); } 70% { box-shadow: 0 0 0 6px rgba(213,40,41,0); } 100% { box-shadow: 0 0 0 0 rgba(213,40,41,0); } }
    .table-card.ready-dish { border-color: #D6862B; animation: pulseAmber 1.8s infinite; }
    @keyframes pulseAmber { 0% { box-shadow: 0 0 0 0 rgba(214,134,43,0.45); } 70% { box-shadow: 0 0 0 8px rgba(214,134,43,0); } 100% { box-shadow: 0 0 0 0 rgba(214,134,43,0); } }
    
    .table-name { font-weight: 900; font-size: 1.15rem; color: #18181b; }
    .table-status { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; padding: 3px 8px; border-radius: 6px; width: fit-content; margin-top: 4px; letter-spacing: 0.4px; }
    .status-libre { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .status-ocupada { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .status-cuenta { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .table-total { font-weight: 900; font-size: 1.05rem; color: #D52829; text-align: right; }

    /* Ordering Screen Header Elements */
    .menu-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-shrink: 0; }
    .table-badge-active { display: inline-flex; align-items: center; gap: 7px; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 6px 14px; font-size: 0.92rem; font-weight: 900; color: #18181b; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
    .table-badge-dot { width: 8px; height: 8px; border-radius: 50%; background: #7CBE43; }
    .status-cuenta-badge { background: #fee2e2; color: #b91c1c; font-weight: 800; font-size: 0.76rem; padding: 6px 12px; border-radius: 8px; border: 1px solid #fca5a5; white-space: nowrap; }
    .back-btn { background: #ffffff; border: 1.5px solid #e2e8f0; padding: 7px 12px; border-radius: 10px; font-weight: 800; font-size: 0.82rem; color: #1e293b; cursor: pointer; display: flex; align-items: center; gap: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
    .bill-btn { background: #601718; color: #ffffff; border: none; padding: 7px 12px; border-radius: 10px; font-weight: 800; font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(96,23,24,0.3); }
    
    .search-box { position: relative; margin-bottom: 8px; }
    .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
    .search-input { width: 100%; height: 42px; padding: 0 16px 0 40px; border-radius: 11px; border: 1.5px solid #e2e8f0; font-size: 0.9rem; background: #ffffff; outline: none; font-weight: 600; color: #18181b; box-shadow: 0 1px 2px rgba(0,0,0,0.03); transition: border-color 0.15s; }
    .search-input:focus { border-color: #D52829; }

    /* Products Grid */
    .prods-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
    .prod-card { background: #ffffff; border-radius: 15px; border: 1.5px solid #e2e8f0; display: flex; flex-direction: column; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.03); transition: transform 0.1s ease, border-color 0.12s ease, box-shadow 0.12s ease; position: relative; overflow: hidden; user-select: none; }
    .prod-card:active { transform: scale(0.97); border-color: #D52829; }
    .prod-card.tapped { border-color: #D52829; box-shadow: 0 0 0 3px rgba(213,40,41,0.22); }
    
    .prod-img-box { width: 100%; height: 122px; background: #ffffff; display: flex; align-items: center; justify-content: center; position: relative; padding: 6px; box-sizing: border-box; border-bottom: 1px solid #f1f5f9; }
    .prod-img { width: 100%; height: 100%; object-fit: contain; object-position: center; display: block; border-radius: 8px; pointer-events: none; }
    .prod-img-fallback { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fffbeb; color: #D6862B; gap: 4px; border-radius: 8px; }
    .prod-img-fallback-text { font-size: 0.65rem; font-weight: 800; color: #b45309; text-transform: uppercase; }
    
    .prod-cart-badge { position: absolute; top: 7px; right: 7px; background: #D52829; color: #ffffff; font-weight: 900; min-width: 25px; height: 25px; border-radius: 999px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; box-shadow: 0 2px 8px rgba(213,40,41,0.5); z-index: 5; padding: 0 5px; border: 2px solid #ffffff; pointer-events: none; }
    .prod-cart-badge.pop-badge { animation: popBadge 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    @keyframes popBadge { 0% { transform: scale(0.6); } 50% { transform: scale(1.35); } 100% { transform: scale(1); } }
    
    .prod-body { padding: 10px; display: flex; flex-direction: column; justify-content: space-between; flex: 1; }
    
    /* Uniform tag and title alignment */
    .prod-top-info { display: flex; flex-direction: column; }
    .prod-cat-tag { display: inline-flex; align-items: center; font-size: 0.62rem; font-weight: 800; color: #601718; background: #fdf2f2; border: 1px solid #fecaca; border-radius: 5px; padding: 2px 7px; width: fit-content; max-width: 100%; text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; height: 18px; box-sizing: border-box; margin-bottom: 4px; }
    .prod-name { font-weight: 800; font-size: 0.86rem; color: #0f172a; line-height: 1.25; height: 2.5em; max-height: 2.5em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 8px; }
    
    .prod-bottom-info { display: flex; flex-direction: column; margin-top: auto; }
    .prod-prices-row { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; }
    .prod-price-usd { font-weight: 900; color: #D52829; font-size: 1.05rem; line-height: 1; }
    .prod-price-bs { font-size: 0.7rem; color: #64748b; font-weight: 700; font-family: ui-monospace, SFMono-Regular, monospace; }
    
    .prod-add-btn { width: 100%; height: 32px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 0.76rem; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.4px; display: flex; align-items: center; justify-content: center; gap: 4px; cursor: pointer; transition: all 0.1s ease; }
    .prod-card:active .prod-add-btn { background: #D52829; color: #ffffff; border-color: #D52829; }

    /* Bottom Cart Bar */
    .cart-bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(24, 24, 27, 0.98); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); color: #fff; padding: 12px 20px; padding-bottom: max(14px, env(safe-area-inset-bottom)); display: flex; justify-content: space-between; align-items: center; box-shadow: 0 -4px 25px rgba(0,0,0,0.35); z-index: 100; border-top: 2px solid #D52829; }
    .cart-totals { display: flex; flex-direction: column; }
    .cart-count-pill { font-size: 0.72rem; color: #fca5a5; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .cart-total-usd { font-size: 1.35rem; font-weight: 900; color: #ffffff; line-height: 1.1; margin-top: 1px; }
    .cart-total-bs { font-size: 0.76rem; color: #fde047; font-weight: 800; font-family: ui-monospace, SFMono-Regular, monospace; }
    
    .cart-actions { display: flex; gap: 10px; align-items: center; }
    .cart-detail-btn { background: rgba(255,255,255,0.12); border: 1.5px solid rgba(255,255,255,0.25); color: #ffffff; height: 44px; padding: 0 16px; border-radius: 12px; font-weight: 800; font-size: 0.86rem; cursor: pointer; white-space: nowrap; transition: background 0.15s; }
    .cart-detail-btn:active { background: rgba(255,255,255,0.25); }
    .cart-send-btn { background: #D52829; color: #ffffff; border: none; height: 44px; padding: 0 20px; border-radius: 12px; font-weight: 900; font-size: 0.92rem; cursor: pointer; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(213,40,41,0.5); display: flex; align-items: center; gap: 6px; transition: transform 0.1s; }
    .cart-send-btn:active { transform: scale(0.97); }

    /* Modals / Drawers */
    .modal-sheet { background: #ffffff; width: 100%; border-radius: 24px 24px 0 0; padding: 18px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 -10px 30px rgba(0,0,0,0.3); animation: slideUp 0.22s ease; border-top: 1px solid #e4e4e7; }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #e4e4e7; }
    .modal-title { font-size: 1.15rem; font-weight: 900; color: #18181b; display: flex; align-items: center; gap: 6px; }
    .modal-close-btn { border: none; background: #f4f4f7; width: 32px; height: 32px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #71717a; font-weight: 700; }
    
    .cart-item-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f4f4f7; }
    .cart-thumb { width: 44px; height: 44px; border-radius: 8px; background: #ffffff; border: 1px solid #e4e4e7; margin-right: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 2px; }
    .qty-btn { width: 34px; height: 34px; border-radius: 8px; border: 1.5px solid #e4e4e7; background: #f8fafc; font-weight: 900; font-size: 1.15rem; display: flex; align-items: center; justify-content: center; color: #18181b; cursor: pointer; }
    .qty-btn:active { background: #e2e8f0; }

    .alert-banner { position: fixed; top: 12px; left: 12px; right: 12px; background: #15803d; color: #ffffff; padding: 12px 14px; border-radius: 12px; font-weight: 800; font-size: 0.88rem; display: flex; align-items: center; justify-content: space-between; z-index: 1000; box-shadow: 0 10px 25px rgba(0,0,0,0.25); animation: slideDown 0.25s ease; border: 1px solid rgba(255,255,255,0.2); }
    @keyframes slideDown { from { transform: translateY(-40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  </style>
  <script src="/socket.io/socket.io.js"></script>
</head>
<body>

  <header>
    <div class="brand" onclick="location.reload()">
      <img src="/happydays/logo.png" class="brand-logo-img" alt="Logo" onerror="this.onerror=null; this.src='/happydays/logo.jpg'">
      <div class="brand-text">
        <span class="brand-title">Happy Days</span>
        <span class="brand-sub">Comandero</span>
      </div>
    </div>
    <div class="header-actions">
      <div id="tabletRateBadge" class="rate-badge" title="Tasa BCV del Día">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        <span>Bs. --</span>
      </div>
      <button id="notifBellBtn" class="icon-btn" onclick="openNotifsModal()" title="Avisos de Cocina">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span id="notifBadge" class="notif-badge" style="display: none;">0</span>
      </button>
      <div id="waiterBtn" class="waiter-badge" onclick="logoutWaiter()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span id="currentWaiterName" class="waiter-badge-name">Mesero</span>
      </div>
    </div>
  </header>

  <main id="appContent">
    <div style="margin: auto; text-align: center; color: #71717a; padding: 40px;">
      <div style="width: 44px; height: 44px; border: 3px solid #e4e4e7; border-top-color: #D52829; border-radius: 50%; margin: 0 auto 14px auto; animation: spin 0.8s linear infinite;"></div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
      <div style="font-weight: 800; color: #18181b; font-size: 1rem; margin-bottom: 4px;">Conectando con Happy Days POS...</div>
      <div style="font-size: 0.8rem;">Sincronizando comanda y catálogo oficial</div>
    </div>
  </main>

  <!-- Bottom Floating Bar -->
  <div id="cartBar" class="cart-bottom-bar" style="display: none;">
    <div class="cart-totals">
      <span class="cart-count-pill"><span id="cartCount">0</span> ÍTEMS EN COMANDA</span>
      <div class="cart-total-usd" id="cartTotalUSD">$0.00</div>
      <div class="cart-total-bs" id="cartTotalBS">Bs. 0.00</div>
    </div>
    <div class="cart-actions">
      <button class="cart-detail-btn" onclick="openCartModal()">Ver Detalle</button>
      <button class="cart-send-btn" onclick="sendOrderRound()">
        <span>ENVIAR</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  </div>

  <div id="alertBox"></div>

  <script>
    const socket = io();
    let state = {
      waiters: [],
      tables: [],
      activeOrders: [],
      menu: { products: [], categories: ['Todos'], exchangeRate: 876.80 }
    };

    let currentWaiter = null;
    let selectedTable = null;
    let selectedZone = 'Todos';
    let selectedCategory = 'Todos';
    let prodSearchQuery = '';
    let currentCart = [];
    let currentScreen = 'login';

    // Touch PIN Modal State
    let pinTargetWaiter = null;
    let currentPinInput = '';

    // Persistent notifications
    let savedNotifs = [];
    try {
      savedNotifs = JSON.parse(localStorage.getItem('waiter_notifs') || '[]');
      if (!Array.isArray(savedNotifs)) savedNotifs = [];
    } catch (e) {
      savedNotifs = [];
    }

    function persistNotifs() {
      try {
        localStorage.setItem('waiter_notifs', JSON.stringify(savedNotifs));
      } catch (e) {}
      updateNotifBadge();
    }

    function updateNotifBadge() {
      const badge = document.getElementById('notifBadge');
      const count = savedNotifs.filter(function(n) { return !n.served; }).length;
      if (badge) {
        if (count > 0) {
          badge.innerText = count > 9 ? '9+' : count;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }
    }

    function getLiveExchangeRate() {
      const raw = state && state.menu ? Number(state.menu.exchangeRate) : 876.80;
      return (!isNaN(raw) && raw > 100) ? raw : 876.80;
    }

    function updateRateDisplay() {
      const badge = document.getElementById('tabletRateBadge');
      const rate = getLiveExchangeRate();
      if (badge) {
        badge.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><span>Bs. ' + rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span>';
      }
    }

    function playKitchenChime() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        
        const o1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        o1.type = 'triangle';
        o1.frequency.setValueAtTime(587.33, now);
        g1.gain.setValueAtTime(0.4, now);
        g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        o1.connect(g1);
        g1.connect(ctx.destination);
        o1.start(now);
        o1.stop(now + 0.45);

        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.type = 'sine';
        o2.frequency.setValueAtTime(880, now + 0.12);
        g2.gain.setValueAtTime(0.5, now + 0.12);
        g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
        o2.connect(g2);
        g2.connect(ctx.destination);
        o2.start(now + 0.12);
        o2.stop(now + 0.7);
      } catch (err) {}
    }

    function handleProdImgError(img) {
      if (!img.dataset.retried) {
        img.dataset.retried = 'true';
        if (img.src.indexOf('.jpg') !== -1) {
          img.src = img.src.replace('.jpg', '.png');
          return;
        } else if (img.src.indexOf('.png') !== -1) {
          img.src = img.src.replace('.png', '.jpg');
          return;
        }
      }
      img.style.display = 'none';
      if (img.nextElementSibling) {
        img.nextElementSibling.style.display = 'flex';
      }
    }

    function closeModal(id) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }

    function closePinModal() { closeModal('pinModal'); }
    function closeNotifsModal() { closeModal('notifsModal'); }
    function closeCartModal() { closeModal('cartModal'); }

    // Socket Handlers
    socket.on('restaurante:sync', function(data) {
      state = data;
      if (currentWaiter && Array.isArray(state.waiters)) {
        const stillValid = state.waiters.find(function(w) { return w.id === currentWaiter.id && w.active !== false; });
        if (!stillValid) {
          currentWaiter = null;
          localStorage.removeItem('waiter_logged_id');
        } else {
          currentWaiter = stillValid;
        }
      }
      updateRateDisplay();
      if (Array.isArray(state.activeOrders)) {
        state.activeOrders.forEach(function(o) {
          (o.rounds || []).forEach(function(r) {
            if (r.status === 'lista') {
              const exists = savedNotifs.some(function(n) { return n.roundId === r.id; });
              if (!exists) {
                savedNotifs.unshift({
                  id: 'notif_' + r.id,
                  roundId: r.id,
                  tableName: o.tableName,
                  waiterName: r.waiterName || 'Mesero',
                  waiterId: r.waiterId,
                  sentAt: r.sentAt,
                  time: new Date(r.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  items: r.items || [],
                  served: false,
                  timestamp: new Date(r.sentAt).getTime()
                });
              }
            } else if (r.status === 'servida') {
              savedNotifs = savedNotifs.filter(function(n) { return n.roundId !== r.id; });
            }
          });
        });
        persistNotifs();
      }
      renderCurrentScreen();
    });

    socket.on('mesas:actualizadas', function(tables) {
      state.tables = tables;
      if (currentScreen === 'tables') renderTablesScreen();
    });

    socket.on('menu:actualizado', function(menu) {
      state.menu = menu;
      updateRateDisplay();
      if (currentScreen === 'order') renderOrderScreen();
    });

    socket.on('tasa:actualizada', function(data) {
      if (data && data.exchangeRate) {
        if (!state.menu) state.menu = {};
        state.menu.exchangeRate = Number(data.exchangeRate);
        updateRateDisplay();
        if (currentScreen === 'order') renderOrderScreen();
      }
    });

    socket.on('comanda:lista', function(data) {
      playKitchenChime();
      if (navigator.vibrate) navigator.vibrate([350, 150, 350, 150, 500]);

      const notifObj = {
        id: 'notif_' + (data.roundId || Date.now()),
        roundId: data.roundId,
        tableName: data.tableName,
        waiterName: data.waiterName || 'Mesero',
        waiterId: data.waiterId,
        sentAt: data.sentAt,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        items: data.items || [],
        served: false,
        timestamp: Date.now()
      };

      const existingIdx = savedNotifs.findIndex(function(n) { return n.roundId === data.roundId; });
      if (existingIdx >= 0) {
        savedNotifs[existingIdx] = notifObj;
      } else {
        savedNotifs.unshift(notifObj);
      }
      persistNotifs();

      showAlertWithAction('Plato listo en ' + data.tableName + '!', 'Ver Avisos', openNotifsModal, '#D6862B');
      if (currentScreen === 'tables') renderTablesScreen();
    });

    socket.on('comanda:servida', function(data) {
      savedNotifs = savedNotifs.filter(function(n) { return n.roundId !== data.roundId; });
      persistNotifs();
      if (currentScreen === 'tables') renderTablesScreen();
      if (document.getElementById('notifsModal')) openNotifsModal();
    });

    function showAlertWithAction(msg, actionLabel, actionFn, bg) {
      bg = bg || '#15803d';
      const box = document.getElementById('alertBox');
      const alertEl = document.createElement('div');
      alertEl.className = 'alert-banner';
      alertEl.style.background = bg;
      alertEl.innerHTML = 
        '<div style="display:flex; align-items:center; gap:8px; flex:1;">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' +
          '<span>' + msg + '</span>' +
        '</div>' +
        '<div style="display:flex; align-items:center; gap:8px;">' +
          (actionLabel ? '<button class="alert-action-btn" style="background:#ffffff; color:#18181b; border:none; font-weight:900; font-size:0.78rem; padding:6px 12px; border-radius:8px; cursor:pointer; text-transform:uppercase;">' + actionLabel + '</button>' : '') +
          '<span class="alert-close-btn" style="cursor:pointer; font-size:1.3rem; padding:0 4px; font-weight:700;">&times;</span>' +
        '</div>';
      
      const actBtn = alertEl.querySelector('.alert-action-btn');
      if (actBtn && actionFn) {
        actBtn.onclick = function() {
          alertEl.remove();
          actionFn();
        };
      }
      const closeBtn = alertEl.querySelector('.alert-close-btn');
      if (closeBtn) {
        closeBtn.onclick = function() {
          alertEl.remove();
        };
      }

      box.innerHTML = '';
      box.appendChild(alertEl);
      setTimeout(function() { if (alertEl.parentElement) alertEl.remove(); }, 6000);
    }

    function showAlert(msg, bg) {
      showAlertWithAction(msg, null, null, bg || '#15803d');
    }

    // Modal: Bandeja de Notificaciones de Cocina
    function openNotifsModal() {
      closeNotifsModal();
      const activeNotifs = savedNotifs.filter(function(n) { return !n.served; });

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'notifsModal';
      modal.innerHTML = 
        '<div class="modal-sheet" style="max-height: 85vh;">' +
          '<div class="modal-header">' +
            '<div class="modal-title">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D52829" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' +
              '<span>Avisos de Cocina</span>' +
              (activeNotifs.length > 0 ? '<span style="background:#D52829; color:#fff; font-size:0.72rem; font-weight:900; padding:2px 8px; border-radius:999px;">' + activeNotifs.length + ' PENDIENTES</span>' : '') +
            '</div>' +
            '<button class="modal-close-btn" onclick="closeNotifsModal()">&times;</button>' +
          '</div>' +

          '<div style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding-bottom:10px;">' +
            (activeNotifs.length === 0 ? 
              '<div style="text-align:center; padding:40px 16px; color:#71717a;">' +
                '<div style="width:48px; height:48px; border-radius:50%; background:#f4f4f7; display:flex; align-items:center; justify-content:center; margin:0 auto 12px auto; color:#a1a1aa;">' +
                  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' +
                '</div>' +
                '<div style="font-weight:800; font-size:1rem; color:#18181b; margin-bottom:4px;">No hay pedidos pendientes por servir</div>' +
                '<div style="font-size:0.8rem;">Cuando cocina o caja marque una orden lista, aparecerá aquí al instante.</div>' +
              '</div>' :
              activeNotifs.map(function(n) {
                return '<div style="background:#ffffff; border:1.5px solid #7CBE43; border-radius:14px; padding:12px; box-shadow:0 3px 10px rgba(124,190,67,0.12); display:flex; flex-direction:column; gap:10px;">' +
                  '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                    '<div style="display:flex; align-items:center; gap:8px;">' +
                      '<span style="background:#7CBE43; color:#fff; font-weight:900; font-size:0.92rem; padding:4px 10px; border-radius:8px;">' + n.tableName + '</span>' +
                      '<span style="font-size:0.76rem; color:#71717a; font-weight:700;">' + (n.time || '') + '</span>' +
                    '</div>' +
                    '<span style="font-size:0.76rem; color:#601718; font-weight:800;">Mesero: ' + (n.waiterName || '') + '</span>' +
                  '</div>' +
                  (n.items && n.items.length > 0 ? 
                    '<div style="background:#f9fafb; border-radius:8px; padding:8px 10px; font-size:0.84rem; color:#374151; border:1px solid #e5e7eb;">' +
                      n.items.map(function(it) {
                        return '<div style="margin-bottom:2px;"><strong>' + (it.quantity || 1) + 'x</strong> ' + (it.name || it.productName) + (it.note ? ' <span style="color:#b45309; font-style:italic;">(' + it.note + ')</span>' : '') + '</div>';
                      }).join('') +
                    '</div>' : '') +
                  '<button data-round-id="' + n.roundId + '" onclick="markNotifServedFromBtn(this)" style="background:#15803d; color:#ffffff; border:none; padding:11px; border-radius:10px; font-weight:900; font-size:0.86rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; text-transform:uppercase; letter-spacing:0.4px;">' +
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' +
                    '<span>Marcar como Entregado</span>' +
                  '</button>' +
                '</div>';
              }).join('')
            ) +
          '</div>' +

          (activeNotifs.length > 1 ?
            '<div style="margin-top:8px; border-top:1px solid #e4e4e7; padding-top:8px;">' +
              '<button onclick="clearAllNotifications()" style="width:100%; background:#f4f4f7; color:#71717a; border:none; padding:10px; border-radius:10px; font-weight:800; font-size:0.82rem; cursor:pointer;">Limpiar todos los avisos</button>' +
            '</div>' : '') +
        '</div>';

      document.body.appendChild(modal);
    }

    function markNotifServedFromBtn(btn) {
      const roundId = btn.getAttribute('data-round-id');
      markNotificationServed(roundId);
    }

    function markNotificationServed(roundId) {
      fetch('/api/restaurant/round/' + roundId + '/served', { method: 'POST' }).catch(function() {});
      savedNotifs = savedNotifs.filter(function(n) { return n.roundId !== roundId; });
      persistNotifs();
      openNotifsModal();
      if (currentScreen === 'tables') renderTablesScreen();
    }

    function clearAllNotifications() {
      if (confirm('¿Limpiar todos los avisos de la bandeja?')) {
        savedNotifs.forEach(function(n) {
          fetch('/api/restaurant/round/' + n.roundId + '/served', { method: 'POST' }).catch(function() {});
        });
        savedNotifs = [];
        persistNotifs();
        closeNotifsModal();
        if (currentScreen === 'tables') renderTablesScreen();
      }
    }

    // Initial Load from Server
    fetch('/api/restaurant/state')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        state = data;
        const savedWaiterId = localStorage.getItem('waiter_logged_id');
        if (savedWaiterId && Array.isArray(state.waiters)) {
          const w = state.waiters.find(function(x) { return x.id === savedWaiterId; });
          if (w) currentWaiter = w;
        }
        updateNotifBadge();
        updateRateDisplay();
        renderCurrentScreen();
      })
      .catch(function(err) {
        console.error('Error cargando estado:', err);
        renderLoginScreen();
      });

    function renderCurrentScreen() {
      updateNotifBadge();
      if (!currentWaiter) {
        renderLoginScreen();
      } else if (selectedTable) {
        if (currentScreen !== 'order') {
          renderOrderScreen();
        }
      } else {
        renderTablesScreen();
      }
    }

    // SCREEN 1: LOGIN / TURNO
    function renderLoginScreen() {
      currentScreen = 'login';
      document.getElementById('cartBar').style.display = 'none';
      document.getElementById('currentWaiterName').innerText = 'Seleccionar';
      
      const app = document.getElementById('appContent');
      const waitersList = (state.waiters || []).filter(function(w) { return w.active !== false; });

      if (waitersList.length === 0) {
        app.innerHTML = 
          '<div class="login-container">' +
            '<div class="login-header-icon">' +
              '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
            '</div>' +
            '<h2 style="font-size: 1.25rem; font-weight: 900; margin-bottom: 6px; color:#18181b;">Meseros de Salón</h2>' +
            '<p style="color: #71717a; font-size: 0.86rem; margin-bottom: 16px;">No hay meseros activos configurados en la PC.</p>' +
            '<button onclick="location.reload()" style="padding:11px 20px; border-radius:10px; background:#601718; color:#fff; border:none; font-weight:900; font-size:0.86rem; cursor:pointer; text-transform:uppercase;">Reintentar Conexión</button>' +
          '</div>';
        return;
      }

      app.innerHTML = 
        '<div class="login-container">' +
          '<div class="login-header-icon">' +
            '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
          '</div>' +
          '<h2 style="font-size: 1.35rem; font-weight: 900; margin-bottom: 4px; color:#18181b;">Turno de Meseros</h2>' +
          '<p style="color: #71717a; font-size: 0.86rem; margin-bottom: 20px;">Toca tu nombre para iniciar tu sesión de comanda:</p>' +
          '<div style="display: flex; flex-direction: column; gap: 4px;">' +
            waitersList.map(function(w) {
              return '<button class="waiter-card-btn" data-id="' + w.id + '" onclick="selectWaiterFromBtn(this)">' +
                '<span style="display:flex; align-items:center; gap:12px;">' +
                  '<span style="width:36px; height:36px; border-radius:10px; background:#f4f4f7; display:flex; align-items:center; justify-content:center; color:#601718;">' +
                    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
                  '</span>' +
                  '<span style="font-size:1rem; font-weight:800; color:#18181b;">' + w.name + '</span>' +
                '</span>' +
                '<span class="waiter-card-enter">' +
                  '<span>Ingresar</span>' +
                  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>' +
                '</span>' +
              '</button>';
            }).join('') +
          '</div>' +
        '</div>';
    }

    function selectWaiterFromBtn(btn) {
      const waiterId = btn.getAttribute('data-id');
      openPinModal(waiterId);
    }

    // On-Screen Tactile Numeric Keypad Modal
    function openPinModal(waiterId) {
      pinTargetWaiter = (state.waiters || []).find(function(w) { return w.id === waiterId; });
      if (!pinTargetWaiter) return;

      currentPinInput = '';
      closePinModal();

      const modal = document.createElement('div');
      modal.className = 'modal-overlay center';
      modal.id = 'pinModal';
      modal.innerHTML = 
        '<div class="pin-modal-card">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
            '<span style="font-size:0.74rem; font-weight:800; text-transform:uppercase; color:#71717a; letter-spacing:0.5px;">Acceso de Mesero</span>' +
            '<button onclick="closePinModal()" style="border:none; background:none; font-size:1.4rem; cursor:pointer; color:#a1a1aa; font-weight:700;">&times;</button>' +
          '</div>' +
          '<h3 style="font-size:1.2rem; font-weight:900; color:#18181b; margin-bottom:2px;">' + pinTargetWaiter.name + '</h3>' +
          '<p style="font-size:0.8rem; color:#71717a;">Introduce tu PIN de 4 dígitos:</p>' +
          
          '<div class="pin-dots" id="pinDotsRow">' +
            '<div class="pin-dot" id="dot0"></div>' +
            '<div class="pin-dot" id="dot1"></div>' +
            '<div class="pin-dot" id="dot2"></div>' +
            '<div class="pin-dot" id="dot3"></div>' +
          '</div>' +

          '<div class="pin-grid">' +
            ['1','2','3','4','5','6','7','8','9','✕','0','⌫'].map(function(k) {
              if (k === '✕') {
                return '<button class="pin-key pin-key-action" onclick="closePinModal()">✕</button>';
              } else if (k === '⌫') {
                return '<button class="pin-key pin-key-action" data-key="DEL" onclick="onPinKeyBtn(this)">⌫</button>';
              } else {
                return '<button class="pin-key" data-key="' + k + '" onclick="onPinKeyBtn(this)">' + k + '</button>';
              }
            }).join('') +
          '</div>' +
        '</div>';

      document.body.appendChild(modal);
    }

    function onPinKeyBtn(btn) {
      const key = btn.getAttribute('data-key');
      onPinKeyPress(key);
    }

    function onPinKeyPress(key) {
      if (!pinTargetWaiter) return;

      if (key === 'DEL') {
        currentPinInput = currentPinInput.slice(0, -1);
      } else if (currentPinInput.length < 4) {
        currentPinInput += key;
      }

      if (navigator.vibrate) navigator.vibrate(25);
      renderPinDots();

      if (currentPinInput.length === 4) {
        setTimeout(function() {
          if (currentPinInput === pinTargetWaiter.pin) {
            currentWaiter = pinTargetWaiter;
            localStorage.setItem('waiter_logged_id', currentWaiter.id);
            closePinModal();
            document.getElementById('currentWaiterName').innerText = currentWaiter.name;
            renderTablesScreen();
          } else {
            if (navigator.vibrate) navigator.vibrate([150, 100, 150]);
            currentPinInput = '';
            renderPinDots();
            alert('PIN incorrecto. Intenta de nuevo.');
          }
        }, 120);
      }
    }

    function renderPinDots() {
      for (let i = 0; i < 4; i++) {
        const dot = document.getElementById('dot' + i);
        if (dot) {
          if (i < currentPinInput.length) {
            dot.className = 'pin-dot filled';
          } else {
            dot.className = 'pin-dot';
          }
        }
      }
    }

    function logoutWaiter() {
      if (confirm('¿Cerrar turno de ' + (currentWaiter ? currentWaiter.name : '') + '?')) {
        currentWaiter = null;
        localStorage.removeItem('waiter_logged_id');
        selectedTable = null;
        currentCart = [];
        renderLoginScreen();
      }
    }

    // SCREEN 2: TABLES MAP
    function renderTablesScreen() {
      currentScreen = 'tables';
      selectedTable = null;
      document.getElementById('cartBar').style.display = 'none';
      if (currentWaiter) document.getElementById('currentWaiterName').innerText = currentWaiter.name;

      const zones = ['Todos'].concat(Array.from(new Set(state.tables.map(function(t) { return t.zone || 'Salón'; }))));
      const filteredTables = selectedZone === 'Todos' ? state.tables : state.tables.filter(function(t) { return t.zone === selectedZone; });

      const app = document.getElementById('appContent');
      app.innerHTML = 
        '<div class="tables-top-bar">' +
          '<div class="zones-bar">' +
            zones.map(function(z) {
              return '<button class="zone-pill ' + (selectedZone === z ? 'active' : '') + '" data-zone="' + z + '" onclick="filterZoneFromBtn(this)">' + z + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="tables-grid">' +
          filteredTables.map(function(t) {
            const order = (state.activeOrders || []).find(function(o) { return o.tableId === t.id; });
            const totalUSD = order ? order.rounds.reduce(function(acc, r) {
              return acc + r.items.reduce(function(sum, i) { return sum + (i.priceUSD * i.quantity); }, 0);
            }, 0) : 0;
            const hasReadyRound = order && (order.rounds || []).some(function(r) { return r.status === 'lista'; });

            let statusLabel = 'DISPONIBLE';
            if (t.status === 'ocupada') statusLabel = 'OCUPADA';
            if (t.status === 'cuenta') statusLabel = 'PIDIÓ CUENTA';

            return '<div class="table-card ' + t.status + (hasReadyRound ? ' ready-dish' : '') + '" data-id="' + t.id + '" onclick="openTableFromCard(this)">' +
              '<div>' +
                '<div class="table-name">' + t.name + '</div>' +
                '<div class="table-status status-' + t.status + '">' + statusLabel + '</div>' +
                (hasReadyRound ? '<div style="background:#D6862B; color:#fff; font-size:0.68rem; font-weight:900; padding:3px 7px; border-radius:6px; display:inline-flex; align-items:center; gap:4px; margin-top:6px; text-transform:uppercase;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> ¡Plato Listo!</div>' : '') +
              '</div>' +
              (totalUSD > 0 
                ? '<div>' +
                    '<div class="table-total">$' + totalUSD.toFixed(2) + '</div>' +
                    '<div style="font-size:0.68rem; color:#71717a; text-align:right; font-weight:700;">' + (order ? order.waiterName : '') + '</div>' +
                  '</div>' 
                : '<div style="font-size:0.72rem; color:#a1a1aa; font-weight:700; margin-top:8px;">' + (t.zone || 'Salón') + '</div>') +
            '</div>';
          }).join('') +
        '</div>';
    }

    function filterZoneFromBtn(btn) {
      filterZone(btn.getAttribute('data-zone'));
    }

    function filterZone(z) {
      selectedZone = z;
      renderTablesScreen();
    }

    function openTableFromCard(card) {
      const tableId = card.getAttribute('data-id');
      openTable(tableId);
    }

    function openTable(tableId) {
      selectedTable = state.tables.find(function(t) { return t.id === tableId; });
      currentCart = [];
      prodSearchQuery = '';
      renderOrderScreen();
    }

    // SCREEN 3: MENU & ORDERING
    function renderOrderScreen() {
      currentScreen = 'order';
      document.getElementById('cartBar').style.display = 'flex';
      updateCartBar();

      const cats = state.menu.categories || ['Todos'];
      const q = prodSearchQuery.toLowerCase().trim();
      const prods = (state.menu.products || []).filter(function(p) {
        const matchesCat = selectedCategory === 'Todos' || p.category === selectedCategory;
        const matchesQuery = !q || (p.name || '').toLowerCase().indexOf(q) !== -1 || (p.sku || '').toLowerCase().indexOf(q) !== -1;
        return matchesCat && matchesQuery;
      });

      const existingOrder = (state.activeOrders || []).find(function(o) { return o.tableId === selectedTable.id; });

      const app = document.getElementById('appContent');
      app.innerHTML = 
        '<div class="order-top-bar">' +
          '<div class="menu-header">' +
            '<button class="back-btn" onclick="renderTablesScreen()">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>' +
              '<span>Mesas</span>' +
            '</button>' +
            '<div class="table-badge-active">' +
              '<span class="table-badge-dot"></span>' +
              '<span>' + selectedTable.name + '</span>' +
            '</div>' +
            (existingOrder ? (selectedTable.status === 'cuenta' 
              ? '<span class="status-cuenta-badge">Cuenta en Caja</span>' 
              : '<button class="bill-btn" onclick="requestBill()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/></svg><span>Pedir Cuenta</span></button>') : '<div style="width:70px;"></div>') +
          '</div>' +

          '<div class="search-box">' +
            '<svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="2" x2="16.65" y2="16.65"/></svg>' +
            '<input type="text" id="prodSearchInput" class="search-input" placeholder="Buscar combo o hamburguesa..." value="' + prodSearchQuery.replace(/"/g, '&quot;') + '" oninput="onProductSearch(this.value)">' +
          '</div>' +

          '<div class="zones-bar">' +
            cats.map(function(c) {
              return '<button class="cat-pill ' + (selectedCategory === c ? 'active' : '') + '" data-cat="' + c + '" onclick="filterCatFromBtn(this)">' + c + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +

        '<div class="prods-grid">' +
          renderProductsGrid(prods) +
        '</div>';
    }

    function filterCatFromBtn(btn) {
      filterCategory(btn.getAttribute('data-cat'));
    }

    function renderProductsGrid(prods) {
      if (prods.length === 0) {
        return '<div style="grid-column: 1 / -1; text-align:center; padding:48px 16px; color:#71717a;">' +
          '<div style="font-size:2rem; margin-bottom:10px;">🔍</div>' +
          '<div style="font-weight:800; color:#18181b; font-size:1rem;">No se encontraron productos</div>' +
          '<div style="font-size:0.82rem; margin-top:4px; color:#64748b;">Prueba seleccionando otra categoría o limpiando la búsqueda</div>' +
        '</div>';
      }

      const rate = getLiveExchangeRate();

      return prods.map(function(p) {
        const hasImg = p.image && typeof p.image === 'string' && p.image.trim().length > 4;
        const safeImg = hasImg ? p.image.replace(/"/g, '&quot;') : '';
        const safeName = (p.name || 'Producto').replace(/"/g, '&quot;');
        const inCartItem = currentCart.find(function(i) { return i.id === p.id; });
        const usdPrice = Number(p.priceUSD || 0);
        const bsPrice = (usdPrice * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        return '<div class="prod-card" data-id="' + p.id + '" onclick="addToCartFromCard(this)">' +
          '<div class="prod-img-box">' +
            (inCartItem && inCartItem.quantity > 0 ? '<div class="prod-cart-badge">' + inCartItem.quantity + '</div>' : '') +
            (hasImg
              ? '<img class="prod-img" src="' + safeImg + '" alt="' + safeName + '" loading="lazy" onerror="handleProdImgError(this)">' +
                '<div class="prod-img-fallback" style="display:none;">' +
                  '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#D6862B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6v1H3v-1Z"/><path d="M3 16h18v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2Z"/><line x1="2" y1="14" x2="22" y2="14"/></svg>' +
                  '<span class="prod-img-fallback-text">' + (p.category || 'Happy Days') + '</span>' +
                '</div>'
              : '<div class="prod-img-fallback">' +
                  '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#D6862B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6v1H3v-1Z"/><path d="M3 16h18v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2Z"/><line x1="2" y1="14" x2="22" y2="14"/></svg>' +
                  '<span class="prod-img-fallback-text">' + (p.category || 'Happy Days') + '</span>' +
                '</div>'
            ) +
          '</div>' +
          '<div class="prod-body">' +
            '<div class="prod-top-info">' +
              '<span class="prod-cat-tag">' + (p.category || 'Combos') + '</span>' +
              '<div class="prod-name" title="' + safeName + '">' + safeName + '</div>' +
            '</div>' +
            '<div class="prod-bottom-info">' +
              '<div class="prod-prices-row">' +
                '<div class="prod-price-usd">$' + usdPrice.toFixed(2) + '</div>' +
                '<div class="prod-price-bs">Bs. ' + bsPrice + '</div>' +
              '</div>' +
              '<button class="prod-add-btn" type="button">+ AGREGAR</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function addToCartFromCard(card) {
      const prodId = card.getAttribute('data-id');
      card.classList.add('tapped');
      setTimeout(function() { card.classList.remove('tapped'); }, 180);
      addToCart(prodId);
    }

    function onProductSearch(val) {
      prodSearchQuery = val;
      const grid = document.querySelector('.prods-grid');
      const q = prodSearchQuery.toLowerCase().trim();
      const prods = (state.menu.products || []).filter(function(p) {
        const matchesCat = selectedCategory === 'Todos' || p.category === selectedCategory;
        const matchesQuery = !q || (p.name || '').toLowerCase().indexOf(q) !== -1 || (p.sku || '').toLowerCase().indexOf(q) !== -1;
        return matchesCat && matchesQuery;
      });

      if (grid) {
        grid.innerHTML = renderProductsGrid(prods);
      }
    }

    function filterCategory(c) {
      selectedCategory = c;
      renderOrderScreen();
    }

    function updateCardBadge(prodId, qty) {
      const card = document.querySelector('.prod-card[data-id="' + prodId + '"]');
      if (!card) return;
      const imgBox = card.querySelector('.prod-img-box');
      if (!imgBox) return;

      let badge = imgBox.querySelector('.prod-cart-badge');
      if (qty > 0) {
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'prod-cart-badge';
          imgBox.appendChild(badge);
        }
        badge.innerText = qty;
        badge.classList.remove('pop-badge');
        void badge.offsetWidth;
        badge.classList.add('pop-badge');
      } else if (badge) {
        badge.remove();
      }
    }

    function addToCart(prodId) {
      const prod = state.menu.products.find(function(p) { return p.id === prodId; });
      if (!prod) return;

      let existing = currentCart.find(function(i) { return i.id === prodId; });
      if (existing) {
        existing.quantity += 1;
      } else {
        currentCart.push({
          id: prod.id,
          name: prod.name,
          image: prod.image,
          priceUSD: Number(prod.priceUSD),
          quantity: 1,
          note: ''
        });
        existing = currentCart[currentCart.length - 1];
      }
      if (navigator.vibrate) {
        try { navigator.vibrate(25); } catch(e) {}
      }
      updateCartBar();
      updateCardBadge(prodId, existing.quantity);
    }

    function updateCartBar() {
      const count = currentCart.reduce(function(acc, i) { return acc + i.quantity; }, 0);
      const totalUSD = currentCart.reduce(function(acc, i) { return acc + (i.priceUSD * i.quantity); }, 0);
      const rate = getLiveExchangeRate();
      const totalBS = totalUSD * rate;

      const countEl = document.getElementById('cartCount');
      const usdEl = document.getElementById('cartTotalUSD');
      const bsEl = document.getElementById('cartTotalBS');
      
      if (countEl) countEl.innerText = count;
      if (usdEl) usdEl.innerText = '$' + totalUSD.toFixed(2);
      if (bsEl) bsEl.innerText = 'Bs. ' + totalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function openCartModal() {
      if (currentCart.length === 0) {
        alert('No has agregado ningún producto a la comanda todavía.');
        return;
      }

      closeCartModal();

      const rate = getLiveExchangeRate();
      const totalUSD = currentCart.reduce(function(acc, i) { return acc + (i.priceUSD * i.quantity); }, 0);
      const totalBS = totalUSD * rate;

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'cartModal';
      modal.innerHTML = 
        '<div class="modal-sheet">' +
          '<div class="modal-header">' +
            '<div class="modal-title">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D52829" stroke-width="2.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' +
              '<span>Comanda — ' + selectedTable.name + '</span>' +
            '</div>' +
            '<button class="modal-close-btn" onclick="closeCartModal()">&times;</button>' +
          '</div>' +

          '<div id="cartModalItemsList" style="flex:1; overflow-y:auto; max-height:48vh; padding-right:4px;">' +
            currentCart.map(function(i) {
              const hasImg = i.image && typeof i.image === 'string' && i.image.length > 4;
              return '<div class="cart-item-row" id="cartRow_' + i.id + '">' +
                '<div class="cart-thumb">' +
                  (hasImg 
                    ? '<img src="' + i.image + '" style="width:100%; height:100%; object-fit:contain;" onerror="this.style.display=\'none\'">' 
                    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D6862B" stroke-width="2"><path d="M3 11c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6v1H3v-1Z"/><path d="M3 16h18v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2Z"/></svg>'
                  ) +
                '</div>' +
                '<div style="flex:1;">' +
                  '<div style="font-weight:800; font-size:0.9rem; color:#18181b;">' + i.name + '</div>' +
                  '<div class="cart-item-price-val" style="font-size:0.8rem; color:#D52829; font-weight:800;">$' + (i.priceUSD * i.quantity).toFixed(2) + ' <span style="font-size:0.7rem; color:#71717a; font-weight:600;">(Bs. ' + ((i.priceUSD * i.quantity) * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ')</span></div>' +
                  '<input type="text" placeholder="Nota: ej. sin pepinillos, extra salsa..." value="' + (i.note || '').replace(/"/g, '&quot;') + '" onchange="updateItemNote(\'' + i.id + '\', this.value)" style="width:96%; padding:6px 9px; font-size:0.78rem; border:1px solid #e4e4e7; border-radius:6px; margin-top:4px; outline:none;">' +
                '</div>' +
                '<div style="display:flex; align-items:center; gap:6px;">' +
                  '<button class="qty-btn" data-id="' + i.id + '" onclick="changeQtyFromBtn(this, -1)">&minus;</button>' +
                  '<span class="cart-item-qty-val" style="font-weight:900; min-width:20px; text-align:center; font-size:1rem;">' + i.quantity + '</span>' +
                  '<button class="qty-btn" data-id="' + i.id + '" onclick="changeQtyFromBtn(this, 1)">&plus;</button>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>' +

          '<div style="margin-top:14px; padding-top:10px; border-top:1px solid #e4e4e7;">' +
            '<div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px;">' +
              '<span style="font-weight:800; color:#71717a; font-size:0.85rem; text-transform:uppercase;">Total Comanda:</span>' +
              '<div style="text-align:right;">' +
                '<div id="cartModalTotalUSD" style="font-size:1.3rem; font-weight:900; color:#D52829;">$' + totalUSD.toFixed(2) + '</div>' +
                '<div id="cartModalTotalBS" style="font-size:0.75rem; color:#71717a; font-weight:700; font-family:ui-monospace, monospace;">Bs. ' + totalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</div>' +
              '</div>' +
            '</div>' +
            '<button class="cart-send-btn" style="width:100%; padding:14px; font-size:0.95rem; justify-content:center;" onclick="closeCartModal(); sendOrderRound();">' +
              '<span>ENVIAR COMANDA A COCINA Y CAJA</span>' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
    }

    function updateItemNote(id, note) {
      const item = currentCart.find(function(i) { return i.id === id; });
      if (item) item.note = note;
    }

    function changeQtyFromBtn(btn, delta) {
      const prodId = btn.getAttribute('data-id');
      changeQty(prodId, delta);
    }

    function changeQty(prodId, delta) {
      const idx = currentCart.findIndex(function(i) { return i.id === prodId; });
      if (idx === -1) return;
      const item = currentCart[idx];
      item.quantity += delta;
      const finalQty = item.quantity;
      if (item.quantity <= 0) {
        currentCart.splice(idx, 1);
      }
      
      updateCartBar();
      updateCardBadge(prodId, finalQty > 0 ? finalQty : 0);

      const modal = document.getElementById('cartModal');
      if (modal) {
        if (currentCart.length === 0) {
          closeCartModal();
          return;
        }

        const rate = getLiveExchangeRate();
        const totalUSD = currentCart.reduce(function(acc, i) { return acc + (i.priceUSD * i.quantity); }, 0);
        const totalBS = totalUSD * rate;

        const totalUsdEl = document.getElementById('cartModalTotalUSD');
        const totalBsEl = document.getElementById('cartModalTotalBS');
        if (totalUsdEl) totalUsdEl.innerText = '$' + totalUSD.toFixed(2);
        if (totalBsEl) totalBsEl.innerText = 'Bs. ' + totalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const row = document.getElementById('cartRow_' + prodId);
        if (finalQty <= 0) {
          if (row) row.remove();
        } else if (row) {
          const qtyEl = row.querySelector('.cart-item-qty-val');
          const priceEl = row.querySelector('.cart-item-price-val');
          if (qtyEl) qtyEl.innerText = finalQty;
          if (priceEl) {
            priceEl.innerHTML = '$' + (item.priceUSD * finalQty).toFixed(2) + 
              ' <span style="font-size:0.7rem; color:#71717a; font-weight:600;">(Bs. ' + 
              ((item.priceUSD * finalQty) * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ')</span>';
          }
        }
      }
    }

    function sendOrderRound() {
      if (currentCart.length === 0) {
        alert('Agrega al menos un ítem al pedido.');
        return;
      }

      fetch('/api/restaurant/order/round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: selectedTable.id,
          waiterId: currentWaiter.id,
          waiterName: currentWaiter.name,
          items: currentCart
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (res.success) {
          showAlert('Comanda enviada a Caja y Cocina con éxito');
          currentCart = [];
          renderTablesScreen();
        } else {
          alert('Error: ' + res.error);
        }
      })
      .catch(function(err) {
        alert('Error de conexión al enviar el pedido');
      });
    }

    function requestBill() {
      if (confirm('¿Marcar ' + selectedTable.name + ' como Pidiendo Cuenta?')) {
        fetch('/api/restaurant/table/' + selectedTable.id + '/bill', { method: 'POST' })
          .then(function() {
            showAlert('Mesa marcada para cobro en Caja');
            renderTablesScreen();
          });
      }
    }
  </script>
</body>
</html>`;
}

module.exports = { renderWaiterView };
