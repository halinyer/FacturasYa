function renderWaiterView(initialState) {
  const safeInitialState = initialState ? JSON.stringify(initialState).replace(/</g, '\\u003c') : 'null';
  const franchise = (initialState && initialState.franchise) ? initialState.franchise : {
    name: 'FacturaPOS',
    branding: {
      logoText: 'FacturaPOS',
      logoIcon: '⚡',
      badge: 'POS',
      colors: {
        primary: '#2563eb',
        primaryHover: '#1d4ed8',
        dark: '#0f172a',
        warm: '#d97706',
        green: '#10b981',
        accentSoft: '#eff6ff',
        borderSubtle: '#e2e8f0'
      }
    },
    waiterApp: {
      title: 'FacturaPOS Comandero',
      shortName: 'POS Comandas'
    }
  };
  const colors = franchise.branding ? franchise.branding.colors : {
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    dark: '#0f172a',
    warm: '#d97706',
    green: '#10b981',
    accentSoft: '#eff6ff',
    borderSubtle: '#e2e8f0'
  };
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>${franchise.waiterApp ? franchise.waiterApp.title : franchise.name + ' — Comandero'}</title>
  <link rel="manifest" href="/waiter-manifest.json">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="${franchise.waiterApp ? franchise.waiterApp.shortName : 'Comandero'}">
  <meta name="theme-color" content="${colors.dark}">
  <style>
    :root {
      --brand-primary: ${colors.primary};
      --brand-primary-hover: ${colors.primaryHover || colors.primary};
      --brand-dark: ${colors.dark};
      --brand-warm: ${colors.warm || '#D6862B'};
      --brand-green: ${colors.green || '#10b981'};
      --brand-accent-soft: ${colors.accentSoft || '#eff6ff'};
      --brand-border-subtle: ${colors.borderSubtle || '#e2e8f0'};
      
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
      --safe-left: env(safe-area-inset-left, 0px);
      --safe-right: env(safe-area-inset-right, 0px);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background: #f8fafc; color: #0f172a; height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; user-select: none; overscroll-behavior: none; }
    
    /* Apple Elegant Translucent Header with Notch Safe-Area Protection */
    header {
      background: var(--brand-dark);
      color: #ffffff;
      padding-top: max(14px, calc(var(--safe-top) + 8px));
      padding-bottom: 10px;
      padding-left: max(14px, calc(var(--safe-left) + 8px));
      padding-right: max(14px, calc(var(--safe-right) + 8px));
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.16);
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
      z-index: 50;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    .header-main-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      gap: 10px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .brand-logo-icon {
      width: 36px;
      height: 36px;
      border-radius: 11px;
      background: rgba(255, 255, 255, 0.16);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.2);
    }
    .brand-text { display: flex; flex-direction: column; line-height: 1.15; }
    .brand-title { font-weight: 900; font-size: 1.05rem; letter-spacing: -0.2px; text-transform: uppercase; color: #ffffff; }
    .brand-sub { font-size: 0.65rem; font-weight: 800; color: rgba(255,255,255,0.7); letter-spacing: 0.8px; text-transform: uppercase; }
    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 7px;
      flex-shrink: 0;
    }

    /* Prominent Apple-Style Waiter Chip */
    .apple-waiter-chip {
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.22);
      color: #ffffff;
      padding: 4px 10px 4px 6px;
      border-radius: 999px;
      font-size: 0.8rem;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      user-select: none;
      max-width: 150px;
    }
    .apple-waiter-chip:active {
      transform: scale(0.95);
      background: rgba(255, 255, 255, 0.28);
    }
    .waiter-avatar {
      width: 25px;
      height: 25px;
      border-radius: 50%;
      background: var(--brand-primary);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
      font-weight: 900;
      border: 1.5px solid rgba(255, 255, 255, 0.6);
      flex-shrink: 0;
    }
    .waiter-chip-text {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
      text-align: left;
      overflow: hidden;
    }
    .waiter-chip-role {
      font-size: 0.54rem;
      font-weight: 800;
      letter-spacing: 0.6px;
      opacity: 0.75;
      text-transform: uppercase;
    }
    .waiter-chip-name {
      font-size: 0.82rem;
      font-weight: 800;
      color: #ffffff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .waiter-chip-chevron {
      opacity: 0.7;
      flex-shrink: 0;
    }

    /* Icon Buttons (Bell & Fullscreen) */
    .icon-btn {
      position: relative;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .icon-btn:active {
      transform: scale(0.92);
      background: rgba(255, 255, 255, 0.25);
    }
    .notif-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: #ffffff;
      font-size: 0.68rem;
      font-weight: 900;
      min-width: 18px;
      height: 18px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      border: 2px solid var(--brand-dark);
      box-shadow: 0 2px 6px rgba(239,68,68,0.6);
      animation: pulseBadge 1.8s infinite;
    }
    @keyframes pulseBadge {
      0% { transform: scale(1); }
      50% { transform: scale(1.15); box-shadow: 0 0 10px rgba(239,68,68,0.9); }
      100% { transform: scale(1); }
    }

    /* Sub Row: Tasa BCV & Contextual Status (Completely Away from Camera Cutout) */
    .header-sub-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding-top: 5px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .apple-rate-pill {
      background: rgba(0, 0, 0, 0.32);
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #fde047;
      font-weight: 800;
      font-size: 0.76rem;
      padding: 4px 10px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      white-space: nowrap;
    }
    .rate-pill-icon { font-size: 0.82rem; }
    .rate-pill-label { color: #94a3b8; font-size: 0.65rem; letter-spacing: 0.4px; text-transform: uppercase; font-weight: 900; }
    .rate-pill-val { color: #fde047; font-weight: 800; }

    .apple-context-pill {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.72rem;
      padding: 4px 10px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    .context-pill-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--brand-green);
      box-shadow: 0 0 6px var(--brand-green);
    }

    main {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0 16px 120px 16px;
      display: flex;
      flex-direction: column;
      position: relative;
      -webkit-overflow-scrolling: touch;
    }

    /* Screen 1: Login / Turno */
    .login-container {
      margin: auto;
      max-width: 380px;
      width: 100%;
      text-align: center;
      padding: 24px 8px;
    }
    .login-header-icon {
      width: 58px;
      height: 58px;
      border-radius: 18px;
      background: var(--brand-dark);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px auto;
      box-shadow: 0 8px 20px rgba(0,0,0,0.15);
      border: 2px solid var(--brand-primary);
    }
    .waiter-card-btn {
      width: 100%;
      padding: 14px 16px;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 16px;
      font-weight: 800;
      font-size: 0.98rem;
      color: #0f172a;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 3px 8px rgba(0,0,0,0.02);
      transition: all 0.15s ease;
      margin-bottom: 10px;
    }
    .waiter-card-btn:active {
      transform: scale(0.98);
      background: #f8fafc;
      border-color: var(--brand-primary);
    }
    .waiter-card-enter {
      color: var(--brand-primary);
      font-weight: 900;
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Apple PIN Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      display: flex;
      align-items: flex-end;
      z-index: 200;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      animation: fadeIn 0.2s ease;
    }
    .modal-overlay.center {
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .pin-modal-card {
      background: #ffffff;
      border-radius: 24px;
      padding: 22px;
      width: 100%;
      max-width: 320px;
      margin: auto;
      text-align: center;
      box-shadow: 0 24px 48px rgba(0,0,0,0.25);
      border: 1px solid #e2e8f0;
      animation: zoomIn 0.2s ease;
    }
    @keyframes zoomIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .pin-dots { display: flex; justify-content: center; gap: 14px; margin: 16px 0 20px 0; }
    .pin-dot {
      width: 15px;
      height: 15px;
      border-radius: 50%;
      border: 2px solid #cbd5e1;
      transition: all 0.15s;
      background: #ffffff;
    }
    .pin-dot.filled {
      background: var(--brand-primary);
      border-color: var(--brand-primary);
      transform: scale(1.18);
      box-shadow: 0 0 8px rgba(37,99,235,0.4);
    }
    .pin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .pin-key {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px 0;
      font-size: 1.45rem;
      font-weight: 800;
      color: #0f172a;
      cursor: pointer;
      transition: all 0.1s;
      user-select: none;
    }
    .pin-key:active {
      background: var(--brand-primary);
      color: #ffffff;
      border-color: var(--brand-primary);
      transform: scale(0.94);
    }
    .pin-key.key-action { font-size: 1rem; background: #f1f5f9; color: #64748b; font-weight: 700; }

    /* Sticky Top Bars for Tables and Ordering */
    .tables-top-bar, .order-top-bar {
      position: sticky;
      top: 0;
      background: #f8fafc;
      z-index: 30;
      margin-left: -16px;
      margin-right: -16px;
      padding: 10px 16px 8px 16px;
      border-bottom: 1.5px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      margin-bottom: 12px;
    }

    /* Segmented Zone / Category Bars (Apple Style) */
    .zones-bar {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 2px 0 6px 0;
      margin-bottom: 4px;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }
    .zones-bar::-webkit-scrollbar { display: none; }
    .zone-pill, .cat-pill {
      flex-shrink: 0;
      height: 38px;
      padding: 0 16px;
      border-radius: 999px;
      background: #ffffff;
      color: #475569;
      font-weight: 800;
      font-size: 0.8rem;
      border: 1.5px solid #e2e8f0;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.12s ease;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .zone-pill:active, .cat-pill:active { transform: scale(0.96); }
    .zone-pill.active {
      background: var(--brand-dark);
      color: #ffffff;
      border-color: var(--brand-dark);
      box-shadow: 0 4px 12px rgba(0,0,0,0.18);
    }
    .cat-pill.active {
      background: var(--brand-primary);
      color: #ffffff;
      border-color: var(--brand-primary);
      box-shadow: 0 4px 12px rgba(37,99,235,0.3);
    }

    /* Tables Grid */
    .tables-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; padding-bottom: 40px; }
    .table-card {
      background: #ffffff;
      border-radius: 18px;
      padding: 14px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 120px;
      border: 2px solid #e2e8f0;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
      transition: transform 0.12s, border-color 0.12s;
      position: relative;
    }
    .table-card:active { transform: scale(0.96); }
    .table-card.libre { border-color: var(--brand-green); background: #ffffff; }
    .table-card.ocupada { border-color: var(--brand-warm); background: #ffffff; }
    .table-card.cuenta { border-color: #ef4444; background: #fef2f2; animation: pulseRed 2s infinite; }
    @keyframes pulseRed { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.35); } 70% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } }
    .table-card.ready-dish { border-color: var(--brand-warm); animation: pulseAmber 1.8s infinite; }
    @keyframes pulseAmber { 0% { box-shadow: 0 0 0 0 rgba(214,134,43,0.45); } 70% { box-shadow: 0 0 0 8px rgba(214,134,43,0); } 100% { box-shadow: 0 0 0 0 rgba(214,134,43,0); } }
    
    .table-name { font-weight: 900; font-size: 1.15rem; color: #0f172a; }
    .table-status { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; padding: 3px 8px; border-radius: 6px; width: fit-content; margin-top: 4px; letter-spacing: 0.4px; }
    .status-libre { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .status-ocupada { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .status-cuenta { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .table-total { font-weight: 900; font-size: 1.05rem; color: var(--brand-primary); text-align: right; }

    /* Ordering Screen Header Elements */
    .menu-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-shrink: 0; }
    .table-badge-active {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 0.92rem;
      font-weight: 900;
      color: #0f172a;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .table-badge-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--brand-green); box-shadow: 0 0 6px var(--brand-green); }
    .status-cuenta-badge { background: #fee2e2; color: #b91c1c; font-weight: 800; font-size: 0.76rem; padding: 6px 12px; border-radius: 8px; border: 1px solid #fca5a5; white-space: nowrap; }
    .back-btn { background: #ffffff; border: 1.5px solid #e2e8f0; padding: 7px 12px; border-radius: 10px; font-weight: 800; font-size: 0.82rem; color: #1e293b; cursor: pointer; display: flex; align-items: center; gap: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
    .bill-btn { background: var(--brand-dark); color: #ffffff; border: none; padding: 7px 12px; border-radius: 10px; font-weight: 800; font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
    
    .search-box { position: relative; margin-bottom: 8px; }
    .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
    .search-input { width: 100%; height: 42px; padding: 0 16px 0 40px; border-radius: 12px; border: 1.5px solid #e2e8f0; font-size: 0.9rem; background: #ffffff; outline: none; font-weight: 600; color: #0f172a; box-shadow: 0 1px 2px rgba(0,0,0,0.02); transition: border-color 0.15s; }
    .search-input:focus { border-color: var(--brand-primary); }

    /* Products Grid */
    .prods-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)); gap: 12px; }
    @media (orientation: landscape) and (min-width: 768px) {
      .prods-grid { grid-template-columns: repeat(auto-fill, minmax(185px, 1fr)); gap: 14px; }
      .prod-img-box { height: 135px; }
    }
    .prod-card {
      background: #ffffff;
      border-radius: 18px;
      border: 1.5px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
      transition: border-color 0.12s ease, box-shadow 0.12s ease;
      position: relative;
      overflow: hidden;
      user-select: none;
    }
    .prod-card.tapped { border-color: var(--brand-primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.2); }
    
    .prod-img-box {
      width: 100%;
      height: 122px;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      padding: 6px;
      box-sizing: border-box;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      transition: transform 0.12s ease, opacity 0.12s ease;
    }
    .prod-img-box:active {
      transform: scale(0.97);
      opacity: 0.9;
    }
    .prod-zoom-hint {
      position: absolute;
      bottom: 6px;
      right: 6px;
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      color: #ffffff;
      font-size: 0.62rem;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      gap: 3px;
      pointer-events: none;
      box-shadow: 0 2px 5px rgba(0,0,0,0.25);
      z-index: 4;
      letter-spacing: 0.2px;
    }
    .prod-img { width: 100%; height: 100%; object-fit: contain; object-position: center; display: block; border-radius: 10px; pointer-events: none; }
    .prod-img-fallback { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; color: var(--brand-primary); gap: 4px; border-radius: 10px; }
    .prod-img-fallback-text { font-size: 0.65rem; font-weight: 800; color: #64748b; text-transform: uppercase; }
    
    .prod-cart-badge {
      position: absolute;
      top: 7px;
      right: 7px;
      background: var(--brand-primary);
      color: #ffffff;
      font-weight: 900;
      min-width: 25px;
      height: 25px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.78rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      z-index: 5;
      padding: 0 5px;
      border: 2px solid #ffffff;
      pointer-events: none;
    }
    .prod-cart-badge.pop-badge { animation: popBadge 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    @keyframes popBadge { 0% { transform: scale(0.6); } 50% { transform: scale(1.35); } 100% { transform: scale(1); } }
    
    .prod-body { padding: 10px; display: flex; flex-direction: column; justify-content: space-between; flex: 1; }
    .prod-top-info { display: flex; flex-direction: column; }
    .prod-cat-tag {
      display: inline-flex;
      align-items: center;
      font-size: 0.62rem;
      font-weight: 800;
      color: var(--brand-primary);
      background: var(--brand-accent-soft);
      border: 1px solid var(--brand-border-subtle);
      border-radius: 6px;
      padding: 2px 7px;
      width: fit-content;
      max-width: 100%;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      height: 18px;
      box-sizing: border-box;
      margin-bottom: 4px;
    }
    .prod-name { font-weight: 800; font-size: 0.86rem; color: #0f172a; line-height: 1.25; height: 2.5em; max-height: 2.5em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 8px; }
    
    .prod-bottom-info { display: flex; flex-direction: column; margin-top: auto; gap: 6px; }
    .prod-prices-row {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      margin-bottom: 2px;
      background: #f8fafc;
      padding: 6px 9px;
      border-radius: 9px;
      border: 1px solid #f1f5f9;
      width: 100%;
      box-sizing: border-box;
    }
    .prod-price-usd { font-weight: 900; color: var(--brand-primary); font-size: 1.15rem; line-height: 1.1; letter-spacing: -0.2px; }
    .prod-price-bs { font-size: 0.74rem; color: #64748b; font-weight: 700; font-family: ui-monospace, SFMono-Regular, monospace; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    
    .prod-action-area { width: 100%; margin-top: 2px; }
    .prod-add-btn {
      width: 100%;
      height: 36px;
      background: var(--brand-accent-soft);
      border: 1.5px solid var(--brand-primary);
      border-radius: 10px;
      font-size: 0.78rem;
      font-weight: 900;
      color: var(--brand-primary);
      text-transform: uppercase;
      letter-spacing: 0.4px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      cursor: pointer;
      transition: all 0.12s ease;
      touch-action: manipulation;
    }
    .prod-add-btn:active {
      background: var(--brand-primary);
      color: #ffffff;
      transform: scale(0.97);
    }

    .card-qty-stepper {
      width: 100%;
      height: 36px;
      background: #ffffff;
      border: 2px solid var(--brand-primary);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
      user-select: none;
    }
    .card-qty-btn {
      width: 40px;
      height: 100%;
      background: transparent;
      border: none;
      font-size: 1.3rem;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.1s ease;
      user-select: none;
      touch-action: manipulation;
      line-height: 1;
    }
    .card-qty-btn.minus {
      color: #dc2626;
      background: #fef2f2;
      border-right: 1.5px solid #fed7d7;
    }
    .card-qty-btn.minus:active {
      background: #dc2626;
      color: #ffffff;
    }
    .card-qty-num {
      flex: 1;
      text-align: center;
      font-size: 1.05rem;
      font-weight: 900;
      color: #0f172a;
      font-family: ui-monospace, SFMono-Regular, monospace;
    }
    .card-qty-btn.plus {
      color: #ffffff;
      background: var(--brand-primary);
    }
    .card-qty-btn.plus:active {
      filter: brightness(0.9);
      transform: scale(0.96);
    }

    /* Bottom Floating Cart Bar (Apple Dynamic Island Style with Safe-Area) */
    .cart-bottom-bar {
      position: fixed;
      bottom: max(10px, calc(var(--safe-bottom) + 6px));
      left: max(12px, calc(var(--safe-left) + 6px));
      right: max(12px, calc(var(--safe-right) + 6px));
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      color: #fff;
      padding: 12px 18px;
      border-radius: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      z-index: 100;
      border: 1px solid rgba(255,255,255,0.15);
    }
    .cart-totals { display: flex; flex-direction: column; }
    .cart-count-pill { font-size: 0.7rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .cart-total-usd { font-size: 1.35rem; font-weight: 900; color: #ffffff; line-height: 1.1; margin-top: 1px; }
    .cart-total-bs { font-size: 0.76rem; color: #fde047; font-weight: 800; font-family: ui-monospace, SFMono-Regular, monospace; }
    
    .cart-actions { display: flex; gap: 10px; align-items: center; }
    .cart-detail-btn { background: rgba(255,255,255,0.12); border: 1.5px solid rgba(255,255,255,0.22); color: #ffffff; height: 42px; padding: 0 15px; border-radius: 12px; font-weight: 800; font-size: 0.84rem; cursor: pointer; white-space: nowrap; transition: background 0.15s; }
    .cart-detail-btn:active { background: rgba(255,255,255,0.25); }
    .cart-send-btn { background: var(--brand-primary); color: #ffffff; border: none; height: 42px; padding: 0 18px; border-radius: 12px; font-weight: 900; font-size: 0.9rem; cursor: pointer; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 6px; transition: transform 0.1s; }
    .cart-send-btn:active { transform: scale(0.97); }

    /* Apple Action Sheet for Waiter Switching & Logout */
    .apple-action-sheet {
      background: #ffffff;
      width: 100%;
      max-width: 420px;
      margin: 0 auto;
      border-radius: 26px 26px 0 0;
      padding: 16px 20px 24px 20px;
      padding-bottom: max(24px, calc(var(--safe-bottom) + 16px));
      display: flex;
      flex-direction: column;
      box-shadow: 0 -12px 36px rgba(0,0,0,0.3);
      animation: slideUp 0.22s ease;
    }
    .apple-sheet-handle {
      width: 36px;
      height: 4px;
      background: #cbd5e1;
      border-radius: 999px;
      margin: 0 auto 14px auto;
    }
    .apple-sheet-header {
      text-align: center;
      margin-bottom: 16px;
    }
    .apple-sheet-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--brand-dark);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      font-weight: 900;
      margin: 0 auto 6px auto;
      border: 2px solid var(--brand-primary);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .apple-sheet-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .apple-sheet-btn {
      width: 100%;
      height: 48px;
      border-radius: 14px;
      font-weight: 800;
      font-size: 0.94rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      border: none;
      transition: all 0.12s ease;
    }
    .apple-sheet-btn.primary {
      background: var(--brand-primary);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(37,99,235,0.3);
    }
    .apple-sheet-btn.primary:active {
      transform: scale(0.97);
      background: var(--brand-primary-hover);
    }
    .apple-sheet-btn.danger {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .apple-sheet-btn.danger:active {
      background: #fecaca;
      transform: scale(0.97);
    }
    .apple-sheet-btn.cancel {
      background: #f1f5f9;
      color: #475569;
    }
    .apple-sheet-btn.cancel:active {
      background: #e2e8f0;
      transform: scale(0.97);
    }

    /* Modals / Drawers */
    .modal-sheet {
      background: #ffffff;
      width: 100%;
      border-radius: 26px 26px 0 0;
      padding: 18px;
      padding-bottom: max(20px, calc(var(--safe-bottom) + 16px));
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 -10px 30px rgba(0,0,0,0.3);
      animation: slideUp 0.22s ease;
      border-top: 1px solid #e2e8f0;
    }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
    .modal-title { font-size: 1.15rem; font-weight: 900; color: #0f172a; display: flex; align-items: center; gap: 6px; }
    .modal-close-btn { border: none; background: #f1f5f9; width: 32px; height: 32px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; font-weight: 700; }

    /* Product Detail Sheet & Lightbox */
    .product-detail-sheet {
      background: #ffffff;
      width: 100%;
      max-width: 480px;
      margin: auto;
      border-radius: 28px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 60px rgba(0,0,0,0.35);
      animation: zoomInSheet 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      max-height: 90vh;
      box-sizing: border-box;
    }
    @keyframes zoomInSheet {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .product-detail-hero {
      position: relative;
      width: 100%;
      height: 240px;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px;
      box-sizing: border-box;
      border-bottom: 1.5px solid #f1f5f9;
      flex-shrink: 0;
    }
    .product-detail-hero img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center;
      filter: drop-shadow(0 6px 16px rgba(0,0,0,0.12));
      border-radius: 14px;
      cursor: pointer;
    }
    .product-detail-cat-pill {
      position: absolute;
      top: 14px;
      left: 14px;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(8px);
      color: var(--brand-primary);
      font-weight: 900;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 5px 12px;
      border-radius: 999px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border: 1px solid rgba(0,0,0,0.06);
    }
    .product-detail-close-btn {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      color: #ffffff;
      border: none;
      font-size: 1.3rem;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: transform 0.1s;
      z-index: 5;
    }
    .product-detail-close-btn:active { transform: scale(0.9); }
    .product-detail-body {
      padding: 18px 20px 20px 20px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
      -webkit-overflow-scrolling: touch;
    }
    .product-detail-title {
      font-size: 1.35rem;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.2;
    }
    .product-detail-prices {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
    }
    .product-detail-usd {
      font-size: 1.6rem;
      font-weight: 900;
      color: var(--brand-primary);
      line-height: 1;
    }
    .product-detail-bs {
      font-size: 1.05rem;
      font-weight: 800;
      color: #059669;
      font-family: ui-monospace, monospace;
      text-align: right;
    }
    .product-detail-desc-box {
      background: #f8fafc;
      border-radius: 14px;
      padding: 12px 14px;
      border: 1px solid #e2e8f0;
    }
    .product-detail-desc-label {
      font-size: 0.72rem;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .product-detail-desc-text {
      font-size: 0.92rem;
      color: #334155;
      font-weight: 600;
      line-height: 1.45;
    }
    .detail-qty-stepper {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 16px;
      padding: 6px;
    }
    .detail-qty-btn {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      border: none;
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 900;
      font-size: 1.4rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.1s;
    }
    .detail-qty-btn:active { background: #e2e8f0; transform: scale(0.95); }
    .detail-qty-num {
      font-size: 1.4rem;
      font-weight: 900;
      color: #0f172a;
      min-width: 40px;
      text-align: center;
      font-family: ui-monospace, monospace;
    }
    .note-pills-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }
    .note-pill {
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      color: #475569;
      padding: 5px 11px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.12s;
    }
    .note-pill:active {
      background: var(--brand-accent-soft);
      border-color: var(--brand-primary);
      color: var(--brand-primary);
    }
    .detail-add-btn {
      width: 100%;
      height: 52px;
      border-radius: 16px;
      background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-hover) 100%);
      color: #ffffff;
      border: none;
      font-size: 1rem;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(37,99,235,0.35);
      transition: transform 0.1s;
      letter-spacing: 0.3px;
    }
    .detail-add-btn:active { transform: scale(0.98); }
    
    .cart-item-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .cart-thumb { width: 44px; height: 44px; border-radius: 8px; background: #ffffff; border: 1px solid #e2e8f0; margin-right: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 2px; }
    .qty-btn { width: 34px; height: 34px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #f8fafc; font-weight: 900; font-size: 1.15rem; display: flex; align-items: center; justify-content: center; color: #0f172a; cursor: pointer; }
    .qty-btn:active { background: #e2e8f0; }

    .alert-banner { position: fixed; top: max(14px, calc(var(--safe-top) + 8px)); left: 12px; right: 12px; background: #15803d; color: #ffffff; padding: 12px 14px; border-radius: 14px; font-weight: 800; font-size: 0.88rem; display: flex; align-items: center; justify-content: space-between; z-index: 1000; box-shadow: 0 10px 25px rgba(0,0,0,0.25); animation: slideDown 0.25s ease; border: 1px solid rgba(255,255,255,0.2); }
    @keyframes slideDown { from { transform: translateY(-40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    /* Takeaway button & Table Order Bar */
    .takeaway-quick-btn {
      background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
      color: #ffffff;
      border: none;
      padding: 8px 14px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(234, 88, 12, 0.35);
      white-space: nowrap;
      flex-shrink: 0;
      transition: transform 0.1s;
    }
    .takeaway-quick-btn:active { transform: scale(0.96); }

    .table-order-bar {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 10px 14px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.03);
    }
    .table-order-bar.cuenta-active {
      background: #fef2f2;
      border-color: #fca5a5;
    }
    .table-order-left { display: flex; flex-direction: column; gap: 2px; }
    .table-order-status-tag {
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 6px;
      width: fit-content;
      letter-spacing: 0.3px;
    }
    .tag-en-consumo { background: #dbeafe; color: #1e40af; }
    .tag-en-caja { background: #fee2e2; color: #b91c1c; border: 1px solid #f87171; }
    .table-order-right { display: flex; align-items: center; gap: 10px; }
    .table-order-totals { text-align: right; }
    .table-order-usd { font-size: 1.15rem; font-weight: 900; color: #0f172a; line-height: 1.1; }
    .table-order-bs { font-size: 0.78rem; font-weight: 800; color: #059669; font-family: ui-monospace, SFMono-Regular, monospace; }
    .btn-view-order {
      background: var(--brand-dark);
      color: #ffffff;
      border: none;
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 0.8rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }
    .btn-view-order:active { transform: scale(0.97); }

    .order-summary-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px;
      margin-top: 10px;
    }
    .round-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px;
      margin-bottom: 8px;
    }
    .round-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px dashed #e2e8f0;
      font-size: 0.75rem;
      font-weight: 800;
      color: #64748b;
    }
    .round-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 5px 0;
      font-size: 0.85rem;
      border-bottom: 1px solid #f8fafc;
    }
    .round-item-name { font-weight: 700; color: #1e293b; }
    .round-item-note { font-size: 0.72rem; color: #dc2626; font-style: italic; margin-top: 1px; }
    .round-item-price { font-weight: 800; color: #0f172a; text-align: right; }
    .round-item-price-bs { font-size: 0.7rem; color: #64748b; font-family: ui-monospace, SFMono-Regular, monospace; }
  </style>
  <script src="/socket.io/socket.io.js"></script>
</head>
<body>

  <!-- Dynamic Header with Dual Rows (Safe from Camera Cutouts) -->
  <header>
    <!-- Row 1: Brand & Actions -->
    <div class="header-main-row">
      <div class="brand" onclick="goHome()">
        <div class="brand-logo-icon">
          ${franchise.branding && franchise.branding.logoImage 
            ? `<img src="${franchise.branding.logoImage}" alt="${franchise.branding.logoText}" style="width:100%; height:100%; object-fit:contain;">` 
            : `<span>${franchise.branding ? franchise.branding.logoIcon : '⚡'}</span>`}
        </div>
        <div class="brand-text">
          <span class="brand-title">${franchise.branding ? franchise.branding.logoText : 'FacturaPOS'}</span>
          <span class="brand-sub">${franchise.waiterApp ? franchise.waiterApp.shortName : 'Comandero'}</span>
        </div>
      </div>

      <div class="header-actions">
        <!-- Prominent Waiter Profile Chip -->
        <div id="waiterBtn" class="apple-waiter-chip" onclick="handleWaiterChipClick()" title="Sesión de Mesero">
          <div class="waiter-avatar" id="waiterAvatar">👤</div>
          <div class="waiter-chip-text">
            <span class="waiter-chip-role">MESERO</span>
            <span id="currentWaiterName" class="waiter-chip-name">Seleccionar</span>
          </div>
          <svg class="waiter-chip-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>

        <!-- Kitchen Bell -->
        <button id="notifBellBtn" class="icon-btn" onclick="openNotifsModal()" title="Avisos de Cocina">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span id="notifBadge" class="notif-badge" style="display: none;">0</span>
        </button>

        <!-- Fullscreen Button -->
        <button id="fullscreenBtn" class="icon-btn" onclick="toggleFullscreen()" title="Pantalla Completa">
          <svg id="fsEnterIcon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
          <svg id="fsExitIcon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Row 2: Tasa BCV & Contextual Status Strip (Safe from Camera Notch) -->
    <div class="header-sub-row">
      <div id="tabletRateBadge" class="apple-rate-pill" title="Tasa BCV del Día">
        <span class="rate-pill-icon">💵</span>
        <span class="rate-pill-label">BCV:</span>
        <span class="rate-pill-val">Bs. --</span>
      </div>
      <div id="headerContextPill" class="apple-context-pill">
        <span class="context-pill-dot"></span>
        <span id="headerContextText">Turno de Meseros</span>
      </div>
    </div>
  </header>

  <main id="appContent">
    <div style="margin: auto; text-align: center; color: #71717a; padding: 40px;">
      <div style="width: 44px; height: 44px; border: 3px solid #e4e4e7; border-top-color: #D52829; border-radius: 50%; margin: 0 auto 14px auto; animation: spin 0.8s linear infinite;"></div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
      <div style="font-weight: 800; color: #18181b; font-size: 1rem; margin-bottom: 4px;">Conectando con FacturaPOS...</div>
      <div style="font-size: 0.8rem;">Sincronizando comanda y catálogo</div>
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
      <button class="cart-send-btn" onclick="promptSelectTableAndSend()">
        <span>ENVIAR</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  </div>

  <div id="alertBox"></div>

  <script>
    const socket = io();
    const serverInitialState = ${safeInitialState};
    let state = serverInitialState || {
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
        const valSpan = badge.querySelector('.rate-pill-val');
        if (valSpan) {
          valSpan.innerText = 'Bs. ' + rate.toLocaleString('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
        } else {
          badge.innerHTML = '<span class="rate-pill-icon">💵</span><span class="rate-pill-label">BCV:</span><span class="rate-pill-val">Bs. ' + rate.toLocaleString('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + '</span>';
        }
      }
    }

    function updateContextBadge(text) {
      const el = document.getElementById('headerContextText');
      if (el) el.innerText = text;
    }

    function updateWaiterUI() {
      const nameEl = document.getElementById('currentWaiterName');
      const avatarEl = document.getElementById('waiterAvatar');
      const chip = document.getElementById('waiterBtn');
      if (!currentWaiter) {
        if (nameEl) nameEl.innerText = 'Seleccionar';
        if (avatarEl) avatarEl.innerText = '👤';
      } else {
        const nameParts = (currentWaiter.name || 'Mesero').trim().split(' ');
        const displayName = nameParts.length > 1 ? nameParts[0] + ' ' + nameParts[1].charAt(0) + '.' : nameParts[0];
        if (nameEl) nameEl.innerText = displayName;
        if (avatarEl) avatarEl.innerText = (currentWaiter.name.charAt(0) || 'M').toUpperCase();
      }
    }

    function goHome() {
      if (selectedTable) {
        if (currentCart.length > 0) {
          if (!confirm('¿Deseas volver al mapa de mesas? Los productos agregados se conservarán.')) return;
        }
        renderTablesScreen();
      }
    }

    // Waiter Action Sheet
    function handleWaiterChipClick() {
      if (!currentWaiter) {
        renderLoginScreen();
        return;
      }
      openWaiterSheet();
    }

    function openWaiterSheet() {
      closeWaiterSheet();
      const sheet = document.createElement('div');
      sheet.className = 'modal-overlay';
      sheet.id = 'waiterSheet';
      sheet.innerHTML = 
        '<div class="apple-action-sheet">' +
          '<div class="apple-sheet-handle"></div>' +
          '<div class="apple-sheet-header">' +
            '<div class="apple-sheet-avatar">' + (currentWaiter.name ? currentWaiter.name.charAt(0).toUpperCase() : '👤') + '</div>' +
            '<div style="font-size:1.15rem; font-weight:900; color:#0f172a; margin-top:6px;">' + currentWaiter.name + '</div>' +
            '<div style="font-size:0.78rem; color:#64748b; font-weight:700; margin-top:2px;">Turno de Salón Activo</div>' +
          '</div>' +
          '<div class="apple-sheet-actions">' +
            '<button class="apple-sheet-btn primary" onclick="switchWaiterAction()">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' +
              '<span>Cambiar de Mesero</span>' +
            '</button>' +
            '<button class="apple-sheet-btn danger" onclick="confirmLogoutWaiter()">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
              '<span>Cerrar Sesión</span>' +
            '</button>' +
            '<button class="apple-sheet-btn cancel" onclick="closeWaiterSheet()">Cancelar</button>' +
          '</div>' +
        '</div>';
      sheet.onclick = function(e) { if (e.target === sheet) closeWaiterSheet(); };
      document.body.appendChild(sheet);
    }

    function closeWaiterSheet() {
      const s = document.getElementById('waiterSheet');
      if (s) s.remove();
    }

    function switchWaiterAction() {
      closeWaiterSheet();
      renderLoginScreen();
    }

    function confirmLogoutWaiter() {
      closeWaiterSheet();
      currentWaiter = null;
      localStorage.removeItem('waiter_logged_id');
      selectedTable = null;
      currentCart = [];
      updateWaiterUI();
      renderLoginScreen();
    }

    function toggleFullscreen() {
      try {
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
        if (!isFs) {
          const docEl = document.documentElement;
          if (docEl.requestFullscreen) {
            docEl.requestFullscreen().catch(function() {});
          } else if (docEl.webkitRequestFullscreen) {
            docEl.webkitRequestFullscreen();
          } else if (docEl.mozRequestFullScreen) {
            docEl.mozRequestFullScreen();
          } else if (docEl.msRequestFullscreen) {
            docEl.msRequestFullscreen();
          }
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(function() {});
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
          } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
          }
        }
      } catch (err) {}
    }

    function updateFullscreenIcons() {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      const enterIcon = document.getElementById('fsEnterIcon');
      const exitIcon = document.getElementById('fsExitIcon');
      const btn = document.getElementById('fullscreenBtn');
      if (enterIcon && exitIcon) {
        enterIcon.style.display = isFs ? 'none' : 'block';
        exitIcon.style.display = isFs ? 'block' : 'none';
      }
      if (btn) {
        btn.title = isFs ? 'Salir de Pantalla Completa' : 'Pantalla Completa';
      }
    }

    document.addEventListener('fullscreenchange', updateFullscreenIcons);
    document.addEventListener('webkitfullscreenchange', updateFullscreenIcons);
    document.addEventListener('mozfullscreenchange', updateFullscreenIcons);
    document.addEventListener('MSFullscreenChange', updateFullscreenIcons);

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
      updateNotifBadge();
      updateWaiterUI();

      if (currentScreen === 'tables') {
        renderTablesScreen();
      } else if (currentScreen === 'order') {
        refreshOrderMenuOnly();
      } else if (!currentWaiter) {
        renderLoginScreen();
      }
    });

    socket.on('mesas:actualizadas', function(tables) {
      state.tables = tables;
      if (currentScreen === 'tables') {
        renderTablesScreen();
      } else if (selectedTable) {
        const liveT = tables.find(function(t) { return t.id === selectedTable.id; });
        if (liveT) selectedTable = liveT;
      }
    });

    socket.on('menu:actualizado', function(menu) {
      state.menu = menu;
      updateRateDisplay();
      if (currentScreen === 'order') {
        refreshOrderMenuOnly();
      }
    });

    socket.on('tasa:actualizada', function(data) {
      if (data && data.exchangeRate) {
        if (!state.menu) state.menu = {};
        state.menu.exchangeRate = Number(data.exchangeRate);
        updateRateDisplay();
        if (currentScreen === 'order') {
          refreshOrderMenuOnly();
        } else if (currentScreen === 'tables') {
          renderTablesScreen();
        }
      }
    });

    socket.on('franchise:actualizada', function(f) {
      if (f) applyFranchiseThemeToDoc(f);
    });

    function applyFranchiseThemeToDoc(f) {
      if (!f || !f.branding || !f.branding.colors) return;
      const c = f.branding.colors;
      const root = document.documentElement;
      if (c.primary) root.style.setProperty('--brand-primary', c.primary);
      if (c.primaryHover) root.style.setProperty('--brand-primary-hover', c.primaryHover);
      if (c.dark) root.style.setProperty('--brand-dark', c.dark);
      if (c.warm) root.style.setProperty('--brand-warm', c.warm);
      if (c.green) root.style.setProperty('--brand-green', c.green);
      if (c.accentSoft) root.style.setProperty('--brand-accent-soft', c.accentSoft);
      if (c.borderSubtle) root.style.setProperty('--brand-border-subtle', c.borderSubtle);
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta && c.dark) themeMeta.setAttribute('content', c.dark);
    }

    socket.on('comanda:lista', function(data) {
      // 1. Immediately mutate local activeOrders round status so table badge updates in 0ms!
      if (Array.isArray(state.activeOrders)) {
        state.activeOrders.forEach(function(o) {
          if (o.id === data.orderId || o.tableId === data.tableId) {
            (o.rounds || []).forEach(function(r) {
              if (r.id === data.roundId) {
                r.status = 'lista';
                r.readyAt = new Date().toISOString();
              }
            });
          }
        });
      }

      // 2. Multi-waiter industry standard:
      // High-priority audible chime & vibration only for the waiter who took the order.
      // Other peer waiters receive silent visual updates (food runner support without audio fatigue).
      const isMyOrder = currentWaiter && (
        (data.waiterId && currentWaiter.id === data.waiterId) ||
        (data.waiterName && currentWaiter.name.trim().toLowerCase() === data.waiterName.trim().toLowerCase())
      );

      if (isMyOrder) {
        playKitchenChime();
        if (navigator.vibrate) navigator.vibrate([350, 150, 350]);
        showAlert('🍽️ ¡PLATO LISTO PARA SERVIR! ' + data.tableName + ' (Mesera: ' + (data.waiterName || 'Mesero') + ')', '#15803d');
      } else {
        // Silent peer notification: subtle banner without ringing audio so other tablets aren't disturbed
        showAlert('🍽️ Plato listo en ' + data.tableName + ' (' + (data.waiterName || 'Mesero') + ')', '#475569');
      }

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
      updateNotifBadge();

      if (currentScreen === 'tables') renderTablesScreen();
    });

    socket.on('comanda:servida', function(data) {
      if (Array.isArray(state.activeOrders)) {
        state.activeOrders.forEach(function(o) {
          if (o.id === data.orderId || o.tableId === data.tableId) {
            (o.rounds || []).forEach(function(r) {
              if (r.id === data.roundId) {
                r.status = 'servida';
                r.servedAt = data.servedAt || new Date().toISOString();
              }
            });
          }
        });
      }
      savedNotifs = savedNotifs.filter(function(n) { return n.roundId !== data.roundId; });
      persistNotifs();
      updateNotifBadge();
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
      const activeNotifs = savedNotifs;

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'notifsModal';
      modal.innerHTML = 
        '<div class="modal-sheet" style="max-height: 85vh;">' +
          '<div class="modal-header">' +
            '<div class="modal-title">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' +
              '<span>Avisos de Cocina</span>' +
              (activeNotifs.length > 0 ? '<span style="background:#10b981; color:#fff; font-size:0.72rem; font-weight:900; padding:2px 8px; border-radius:999px;">' + activeNotifs.length + ' RECIENTES</span>' : '') +
            '</div>' +
            '<button class="modal-close-btn" onclick="closeNotifsModal()">&times;</button>' +
          '</div>' +

          '<div style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding-bottom:10px;">' +
            (activeNotifs.length === 0 ? 
              '<div style="text-align:center; padding:40px 16px; color:#71717a;">' +
                '<div style="width:48px; height:48px; border-radius:50%; background:#f4f4f7; display:flex; align-items:center; justify-content:center; margin:0 auto 12px auto; color:#a1a1aa;">' +
                  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' +
                '</div>' +
                '<div style="font-weight:800; font-size:1rem; color:#18181b; margin-bottom:4px;">No hay avisos recientes</div>' +
                '<div style="font-size:0.8rem;">Cuando cocina o caja marque un plato listo, te sonará la campana automáticamente.</div>' +
              '</div>' :
              activeNotifs.map(function(n) {
                return '<div style="background:#ffffff; border:1.5px solid #10b981; border-radius:14px; padding:12px; box-shadow:0 2px 8px rgba(16,185,129,0.1); display:flex; flex-direction:column; gap:8px;">' +
                  '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                    '<div style="display:flex; align-items:center; gap:8px;">' +
                      '<span style="background:#10b981; color:#fff; font-weight:900; font-size:0.92rem; padding:4px 10px; border-radius:8px;">' + n.tableName + '</span>' +
                      '<span style="font-size:0.76rem; color:#71717a; font-weight:700;">' + (n.time || '') + '</span>' +
                    '</div>' +
                    '<span style="font-size:0.76rem; color:#0f172a; font-weight:800;">Mesero: ' + (n.waiterName || '') + '</span>' +
                  '</div>' +
                  (n.items && n.items.length > 0 ? 
                    '<div style="background:#f9fafb; border-radius:8px; padding:8px 10px; font-size:0.84rem; color:#374151; border:1px solid #e5e7eb;">' +
                      n.items.map(function(it) {
                        return '<div style="margin-bottom:2px;"><strong>' + (it.quantity || 1) + 'x</strong> ' + (it.name || it.productName) + (it.note ? ' <span style="color:#b45309; font-style:italic;">(' + it.note + ')</span>' : '') + '</div>';
                      }).join('') +
                    '</div>' : '') +
                  '<div style="font-size:0.75rem; color:#059669; font-weight:800; text-align:right;">✓ Notificado por Cocina</div>' +
                '</div>';
              }).join('')
            ) +
          '</div>' +

          (activeNotifs.length > 0 ?
            '<div style="margin-top:8px; border-top:1px solid #e4e4e7; padding-top:8px;">' +
              '<button onclick="clearAllNotifications()" style="width:100%; background:#f4f4f7; color:#71717a; border:none; padding:10px; border-radius:10px; font-weight:800; font-size:0.82rem; cursor:pointer;">Limpiar Historial</button>' +
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
      if (Array.isArray(state.activeOrders)) {
        state.activeOrders.forEach(function(o) {
          (o.rounds || []).forEach(function(r) {
            if (r.id === roundId) r.status = 'servida';
          });
        });
      }
      savedNotifs = savedNotifs.filter(function(n) { return n.roundId !== roundId; });
      persistNotifs();
      updateNotifBadge();
      openNotifsModal();
      if (currentScreen === 'tables') renderTablesScreen();
    }

    function clearAllNotifications() {
      if (confirm('¿Limpiar todos los avisos de la bandeja?')) {
        savedNotifs.forEach(function(n) {
          fetch('/api/restaurant/round/' + n.roundId + '/served', { method: 'POST' }).catch(function() {});
        });
        if (Array.isArray(state.activeOrders)) {
          state.activeOrders.forEach(function(o) {
            (o.rounds || []).forEach(function(r) {
              r.status = 'servida';
            });
          });
        }
        savedNotifs = [];
        persistNotifs();
        updateNotifBadge();
        closeNotifsModal();
        if (currentScreen === 'tables') renderTablesScreen();
      }
    }

    // Instant boot if server provided state directly (zero waiting / zero spinner freeze)
    if (serverInitialState) {
      const savedWaiterId = localStorage.getItem('waiter_logged_id');
      if (savedWaiterId && Array.isArray(state.waiters)) {
        const w = state.waiters.find(function(x) { return x.id === savedWaiterId; });
        if (w) currentWaiter = w;
      }
      updateNotifBadge();
      updateRateDisplay();
      renderCurrentScreen();
    }

    // Secondary fetch to ensure real-time consistency
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
        if (!serverInitialState) renderLoginScreen();
      });

    function renderCurrentScreen() {
      updateNotifBadge();
      updateWaiterUI();
      if (!currentWaiter) {
        renderLoginScreen();
      } else if (currentScreen === 'tables') {
        renderTablesScreen();
      } else {
        if (currentScreen !== 'order') {
          renderOrderScreen();
        } else {
          refreshOrderMenuOnly();
        }
      }
    }

    // SCREEN 1: LOGIN / TURNO
    function renderLoginScreen() {
      currentScreen = 'login';
      document.getElementById('cartBar').style.display = 'none';
      updateContextBadge('Turno de Meseros');
      updateWaiterUI();
      
      const app = document.getElementById('appContent');
      const waitersList = (state.waiters || []).filter(function(w) { return w.active !== false; });

      if (waitersList.length === 0) {
        app.innerHTML = 
          '<div class="login-container">' +
            '<div class="login-header-icon">' +
              '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
            '</div>' +
            '<h2 style="font-size: 1.25rem; font-weight: 900; margin-bottom: 6px; color:#0f172a;">Meseros de Salón</h2>' +
            '<p style="color: #64748b; font-size: 0.86rem; margin-bottom: 16px;">No hay meseros activos configurados en la PC.</p>' +
            '<button onclick="location.reload()" style="padding:11px 20px; border-radius:12px; background:var(--brand-dark); color:#fff; border:none; font-weight:900; font-size:0.86rem; cursor:pointer; text-transform:uppercase;">Reintentar Conexión</button>' +
          '</div>';
        return;
      }

      app.innerHTML = 
        '<div class="login-container">' +
          '<div class="login-header-icon">' +
            '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
          '</div>' +
          '<h2 style="font-size: 1.35rem; font-weight: 900; margin-bottom: 4px; color:#0f172a;">Turno de Meseros</h2>' +
          '<p style="color: #64748b; font-size: 0.86rem; margin-bottom: 20px;">Toca tu nombre para acceder al comandero:</p>' +
          '<div style="display: flex; flex-direction: column; gap: 4px;">' +
            waitersList.map(function(w) {
              const initial = (w.name.charAt(0) || 'M').toUpperCase();
              return '<button class="waiter-card-btn" data-id="' + w.id + '" onclick="selectWaiterFromBtn(this)">' +
                '<span style="display:flex; align-items:center; gap:12px;">' +
                  '<span style="width:38px; height:38px; border-radius:12px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:var(--brand-primary); font-weight:900; font-size:1.1rem; border:1px solid #e2e8f0;">' +
                    initial +
                  '</span>' +
                  '<span style="font-size:1rem; font-weight:800; color:#0f172a;">' + w.name + '</span>' +
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
            updateWaiterUI();
            selectedTable = null;
            renderOrderScreen();
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
      openWaiterSheet();
    }

    // SCREEN 2: TABLES MAP
    function renderTablesScreen() {
      currentScreen = 'tables';
      selectedTable = null;
      document.getElementById('cartBar').style.display = 'none';
      updateWaiterUI();
      updateContextBadge('Mapa de Mesas');

      const zones = ['Todos'].concat(Array.from(new Set(state.tables.map(function(t) { return t.zone || 'Salón'; }))));
      const filteredTables = selectedZone === 'Todos' ? state.tables : state.tables.filter(function(t) { return t.zone === selectedZone; });

      const rate = getLiveExchangeRate();

      const app = document.getElementById('appContent');
      app.innerHTML = 
        '<div class="tables-top-bar" style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:12px;">' +
          '<div class="zones-bar" style="flex:1; overflow-x:auto;">' +
            zones.map(function(z) {
              const zLabel = z === 'Para Llevar' ? '🛍️ Para Llevar' : z;
              return '<button class="zone-pill ' + (selectedZone === z ? 'active' : '') + '" data-zone="' + z + '" onclick="filterZoneFromBtn(this)">' + zLabel + '</button>';
            }).join('') +
          '</div>' +
          '<div style="display:flex; gap:6px; flex-shrink:0;">' +
            '<button class="takeaway-quick-btn" style="background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:#fff; box-shadow:0 2px 8px rgba(16,185,129,0.3); border:none;" onclick="startNewOrderMenu()">' +
              '<span style="font-size:1.1rem; line-height:1;">⚡</span>' +
              '<span>Tomar Pedido</span>' +
            '</button>' +
            '<button class="takeaway-quick-btn" onclick="openNewTakeawayModal()">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' +
              '<span>+ Llevar</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="tables-grid">' +
          filteredTables.map(function(t) {
            const order = (state.activeOrders || []).find(function(o) { return o.tableId === t.id; });
            const totalUSD = order ? order.rounds.reduce(function(acc, r) {
              return acc + r.items.reduce(function(sum, i) { return sum + (i.priceUSD * i.quantity); }, 0);
            }, 0) : 0;
            const totalBS = totalUSD * rate;
            const formattedBS = totalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const hasReadyRound = order && (order.rounds || []).some(function(r) { return r.status === 'lista'; });
            const itemCount = order ? order.rounds.reduce(function(sum, r) {
              return sum + r.items.reduce(function(s, i) { return s + i.quantity; }, 0);
            }, 0) : 0;

            let statusLabel = 'DISPONIBLE';
            if (t.status === 'ocupada') statusLabel = 'OCUPADA';
            if (t.status === 'cuenta') statusLabel = 'PIDIÓ CUENTA';
            if (t.isTakeaway || t.zone === 'Para Llevar') {
              if (t.status === 'libre') statusLabel = 'PARA LLEVAR';
            }

            return '<div class="table-card ' + t.status + (hasReadyRound ? ' ready-dish' : '') + '" data-id="' + t.id + '" onclick="openTableFromCard(this)">' +
              '<div>' +
                '<div class="table-name">' + (t.isTakeaway ? '🛍️ ' : '') + t.name + '</div>' +
                '<div class="table-status status-' + t.status + '">' + statusLabel + '</div>' +
                (hasReadyRound ? '<div style="background:#D6862B; color:#fff; font-size:0.68rem; font-weight:900; padding:3px 7px; border-radius:6px; display:inline-flex; align-items:center; gap:4px; margin-top:6px; text-transform:uppercase;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> ¡Plato Listo!</div>' : '') +
              '</div>' +
              (totalUSD > 0 
                ? '<div>' +
                    '<div class="table-total">$' + totalUSD.toFixed(2) + '</div>' +
                    '<div style="font-size:0.75rem; color:#059669; font-weight:800; text-align:right; font-family:ui-monospace, monospace; margin-top:1px;">Bs. ' + formattedBS + '</div>' +
                    '<div style="font-size:0.68rem; color:#71717a; text-align:right; font-weight:700; margin-top:2px;">' + (order ? order.waiterName : '') + (itemCount > 0 ? ' (' + itemCount + ' p.)' : '') + '</div>' +
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

    function startNewOrderMenu() {
      selectedTable = null;
      currentCart = [];
      prodSearchQuery = '';
      renderOrderScreen();
    }

    // SCREEN 3: MENU & ORDERING
    function renderOrderScreen() {
      currentScreen = 'order';
      document.getElementById('cartBar').style.display = 'flex';
      updateCartBar();
      updateWaiterUI();
      updateContextBadge(selectedTable ? selectedTable.name : '✨ Nuevo Pedido');

      const cats = state.menu.categories || ['Todos'];
      const q = prodSearchQuery.toLowerCase().trim();
      const prods = (state.menu.products || []).filter(function(p) {
        const matchesCat = selectedCategory === 'Todos' || p.category === selectedCategory;
        const matchesQuery = !q || (p.name || '').toLowerCase().indexOf(q) !== -1 || (p.sku || '').toLowerCase().indexOf(q) !== -1;
        return matchesCat && matchesQuery;
      });

      const existingOrder = selectedTable ? (state.activeOrders || []).find(function(o) { return o.tableId === selectedTable.id; }) : null;
      const rate = getLiveExchangeRate();
      const orderTotalUSD = existingOrder ? existingOrder.rounds.reduce(function(acc, r) {
        return acc + r.items.reduce(function(sum, i) { return sum + (i.priceUSD * i.quantity); }, 0);
      }, 0) : 0;
      const orderTotalBS = orderTotalUSD * rate;
      const orderItemCount = existingOrder ? existingOrder.rounds.reduce(function(sum, r) {
        return sum + r.items.reduce(function(s, i) { return s + i.quantity; }, 0);
      }, 0) : 0;

      const app = document.getElementById('appContent');
      app.innerHTML = 
        '<div class="order-top-bar">' +
          '<div class="menu-header">' +
            '<button class="back-btn" onclick="renderTablesScreen()">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>' +
              '<span>Ver Salón</span>' +
            '</button>' +
            (selectedTable ? (
              '<div style="display:flex; align-items:center; gap:6px;">' +
                '<div class="table-badge-active" onclick="openSelectTableModal()" style="cursor:pointer;" title="Toca para cambiar de mesa">' +
                  '<span class="table-badge-dot"></span>' +
                  '<span>' + (selectedTable.isTakeaway ? '🛍️ ' : '') + selectedTable.name + '</span>' +
                  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-left:4px;"><polyline points="6 9 12 15 18 9"/></svg>' +
                '</div>' +
                '<button onclick="resetToNewOrder()" title="Volver a Nuevo Pedido sin mesa" style="background:#fee2e2; color:#b91c1c; border:none; padding:6px 10px; border-radius:8px; font-weight:800; font-size:0.75rem; cursor:pointer;">✕ Limpiar</button>' +
              '</div>'
            ) : (
              '<div class="table-badge-active" onclick="openSelectTableModal()" style="background:#f1f5f9; color:#0f172a; border:1.5px dashed #cbd5e1; cursor:pointer;" title="Toca para asignar mesa">' +
                '<span style="color:#f59e0b; font-size:0.95rem;">⚡</span>' +
                '<span>Nuevo Pedido</span>' +
                '<span style="font-size:0.72rem; color:#64748b; font-weight:700; margin-left:4px;">(Mesa al enviar)</span>' +
              '</div>'
            )) +
            (existingOrder ? (selectedTable.status === 'cuenta' 
              ? '<span class="status-cuenta-badge" onclick="openTableOrderModal()" style="cursor:pointer;">⚠️ En Caja</span>' 
              : '<button class="bill-btn" onclick="requestBill()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/></svg><span>Pedir Cuenta</span></button>') : '<div style="width:20px;"></div>') +
          '</div>' +

          (existingOrder && existingOrder.rounds && existingOrder.rounds.length > 0 ? (
            '<div class="table-order-bar ' + (selectedTable.status === 'cuenta' ? 'cuenta-active' : '') + '">' +
              '<div class="table-order-left">' +
                '<div style="display:flex; align-items:center; gap:6px;">' +
                  '<span class="table-order-status-tag ' + (selectedTable.status === 'cuenta' ? 'tag-en-caja' : 'tag-en-consumo') + '">' +
                    (selectedTable.status === 'cuenta' ? '⚠️ CUENTA EN CAJA' : '🍽️ EN CONSUMO') +
                  '</span>' +
                  '<span style="font-size:0.75rem; color:#64748b; font-weight:800;">' + orderItemCount + ' plato(s)</span>' +
                '</div>' +
                '<div style="font-size:0.72rem; color:#64748b; margin-top:2px;">' +
                  'Mesero: <strong>' + (existingOrder.waiterName || 'Mesero') + '</strong>' +
                '</div>' +
              '</div>' +
              '<div class="table-order-right">' +
                '<div class="table-order-totals">' +
                  '<div class="table-order-usd">$' + orderTotalUSD.toFixed(2) + '</div>' +
                  '<div class="table-order-bs">Bs. ' + orderTotalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</div>' +
                '</div>' +
                '<button class="btn-view-order" onclick="openTableOrderModal()">' +
                  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' +
                  '<span>Ver Pedido</span>' +
                '</button>' +
              '</div>' +
            '</div>' +
            (selectedTable.status === 'cuenta' ? (
              '<div style="background:#fee2e2; border:1px solid #fca5a5; border-radius:10px; padding:7px 12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">' +
                '<div style="font-size:0.76rem; color:#b91c1c; font-weight:800;">' +
                  '⚠️ Esta cuenta ya fue enviada a Caja para cobro.' +
                '</div>' +
                '<button onclick="reopenTable()" style="background:#b91c1c; color:#fff; border:none; padding:4px 10px; border-radius:6px; font-size:0.72rem; font-weight:800; cursor:pointer;">' +
                  '🔄 Reabrir Mesa' +
                '</button>' +
              '</div>'
            ) : '')
          ) : '') +

          '<div class="search-box">' +
            '<svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="2" x2="16.65" y2="16.65"/></svg>' +
            '<input type="text" id="prodSearchInput" class="search-input" placeholder="Buscar producto o combo..." value="' + prodSearchQuery.replace(/"/g, '&quot;') + '" oninput="onProductSearch(this.value)">' +
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
      if (!prods || prods.length === 0) {
        return '<div style="grid-column: 1 / -1; text-align:center; padding:48px 16px; color:#71717a;">' +
          '<div style="font-size:2rem; margin-bottom:10px;">🔍</div>' +
          '<div style="font-weight:800; color:#18181b; font-size:1rem;">No se encontraron productos</div>' +
          '<div style="font-size:0.82rem; margin-top:4px; color:#64748b;">Prueba seleccionando otra categoría o limpiando la búsqueda</div>' +
        '</div>';
      }

      // Dejar los que no tienen foto de último
      const sortedProds = prods.slice().sort(function(a, b) {
        const aHas = (a.image && typeof a.image === 'string' && a.image.trim().length > 4) ? 1 : 0;
        const bHas = (b.image && typeof b.image === 'string' && b.image.trim().length > 4) ? 1 : 0;
        return bHas - aHas;
      });

      const rate = getLiveExchangeRate();

      return sortedProds.map(function(p) {
        const hasImg = p.image && typeof p.image === 'string' && p.image.trim().length > 4;
        let safeImg = hasImg ? p.image.replace(/"/g, '&quot;') : '';
        if (safeImg.startsWith('./')) safeImg = '/' + safeImg.substring(2);
        const safeName = (p.name || 'Producto').replace(/"/g, '&quot;');
        const inCartQty = getProdCartQty(p.id);
        const usdPrice = Number(p.priceUSD || 0);
        const bsPrice = (usdPrice * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        return '<div class="prod-card" data-id="' + p.id + '">' +
          '<div class="prod-img-box"' + (hasImg ? ' onclick="openCardPhotoLightbox(this)"' : '') + '>' +
            (inCartQty > 0 ? '<div class="prod-cart-badge">' + inCartQty + '</div>' : '') +
            (hasImg ? '<div class="prod-zoom-hint">' +
              '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
              '<span>Ver</span>' +
            '</div>' : '') +
            (hasImg
              ? '<img class="prod-img" src="' + safeImg + '" alt="' + safeName + '" loading="lazy" onerror="handleProdImgError(this)">' +
                '<div class="prod-img-fallback" style="display:none;">' +
                  '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#D6862B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6v1H3v-1Z"/><path d="M3 16h18v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2Z"/><line x1="2" y1="14" x2="22" y2="14"/></svg>' +
                  '<span class="prod-img-fallback-text">' + (p.category || 'FacturaPOS') + '</span>' +
                '</div>'
              : '<div class="prod-img-fallback">' +
                  '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#D6862B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6v1H3v-1Z"/><path d="M3 16h18v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2Z"/><line x1="2" y1="14" x2="22" y2="14"/></svg>' +
                  '<span class="prod-img-fallback-text">' + (p.category || 'FacturaPOS') + '</span>' +
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
              '<div class="prod-action-area">' +
                renderCardActionAreaHtml(p.id, inCartQty) +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function renderCardActionAreaHtml(prodId, qty) {
      if (qty > 0) {
        return '<div class="card-qty-stepper" data-id="' + prodId + '">' +
          '<button class="card-qty-btn minus" type="button" onclick="event.stopPropagation(); changeCardQty(this, -1);">&minus;</button>' +
          '<span class="card-qty-num">' + qty + '</span>' +
          '<button class="card-qty-btn plus" type="button" onclick="event.stopPropagation(); changeCardQty(this, 1);">&plus;</button>' +
        '</div>';
      }
      return '<button class="prod-add-btn" type="button" data-id="' + prodId + '" onclick="event.stopPropagation(); changeCardQty(this, 1);">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
        '<span>AGREGAR</span>' +
      '</button>';
    }

    function getProdCartQty(prodId) {
      return currentCart
        .filter(function(i) { return i.id === prodId; })
        .reduce(function(acc, i) { return acc + i.quantity; }, 0);
    }

    function openCardPhotoLightbox(box) {
      const img = box.querySelector('img.prod-img');
      if (!img || !img.src) return;
      const title = img.getAttribute('alt') || '';
      openLightbox(img.src, title);
    }

    function openProductDetailFromBox(box) {
      openCardPhotoLightbox(box);
    }

    function changeCardQty(btnOrId, delta) {
      const prodId = typeof btnOrId === 'string' ? btnOrId : (btnOrId.getAttribute('data-id') || (btnOrId.closest('[data-id]') && btnOrId.closest('[data-id]').getAttribute('data-id')));
      if (!prodId) return;

      const prod = (state.menu && state.menu.products || []).find(function(p) { return p.id === prodId; });
      if (!prod) return;

      if (delta > 0) {
        let existing = currentCart.find(function(i) { return i.id === prodId && !i.note; });
        if (!existing) {
          existing = currentCart.find(function(i) { return i.id === prodId; });
        }
        if (existing) {
          existing.quantity += delta;
        } else {
          currentCart.push({
            id: prod.id,
            name: prod.name,
            image: prod.image,
            priceUSD: Number(prod.priceUSD),
            quantity: delta,
            note: ''
          });
        }
      } else if (delta < 0) {
        let idx = currentCart.findIndex(function(i) { return i.id === prodId && !i.note; });
        if (idx === -1) {
          idx = currentCart.findIndex(function(i) { return i.id === prodId; });
        }
        if (idx !== -1) {
          currentCart[idx].quantity += delta;
          if (currentCart[idx].quantity <= 0) {
            currentCart.splice(idx, 1);
          }
        }
      }

      if (navigator.vibrate) {
        try { navigator.vibrate(25); } catch(e) {}
      }

      updateCartBar();
      syncCardUI(prodId);
    }

    function syncCardUI(prodId) {
      const qty = getProdCartQty(prodId);
      updateCardBadge(prodId, qty);
      const card = document.querySelector('.prod-card[data-id="' + prodId + '"]');
      if (card) {
        const actionArea = card.querySelector('.prod-action-area');
        if (actionArea) {
          actionArea.innerHTML = renderCardActionAreaHtml(prodId, qty);
        }
      }
    }

    function syncAllCardsUI() {
      const cards = document.querySelectorAll('.prod-card');
      cards.forEach(function(card) {
        const pid = card.getAttribute('data-id');
        if (pid) syncCardUI(pid);
      });
    }

    function quickAddFromCard(btn) {
      changeCardQty(btn, 1);
    }

    function addToCartFromCard(card) {
      openProductDetail(card);
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

    function refreshOrderMenuOnly() {
      if (currentScreen !== 'order') return;
      updateCartBar();
      updateWaiterUI();
      updateRateDisplay();

      if (selectedTable) {
        const liveT = (state.tables || []).find(function(t) { return t.id === selectedTable.id; });
        if (liveT) selectedTable = liveT;
      }

      const q = prodSearchQuery.toLowerCase().trim();
      const prods = (state.menu && state.menu.products || []).filter(function(p) {
        const matchesCat = selectedCategory === 'Todos' || p.category === selectedCategory;
        const matchesQuery = !q || (p.name || '').toLowerCase().indexOf(q) !== -1 || (p.sku || '').toLowerCase().indexOf(q) !== -1;
        return matchesCat && matchesQuery;
      });

      const grid = document.querySelector('.prods-grid');
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
      const prod = (state.menu && state.menu.products || []).find(function(p) { return p.id === prodId; });
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
      syncCardUI(prodId);
    }

    function updateCartBar() {
      const count = currentCart.reduce(function(acc, i) { return acc + i.quantity; }, 0);
      const rate = getLiveExchangeRate();

      const countEl = document.getElementById('cartCount');
      const usdEl = document.getElementById('cartTotalUSD');
      const bsEl = document.getElementById('cartTotalBS');
      const detailBtn = document.querySelector('.cart-detail-btn');
      const sendBtn = document.querySelector('.cart-send-btn');

      if (count > 0) {
        const totalUSD = currentCart.reduce(function(acc, i) { return acc + (i.priceUSD * i.quantity); }, 0);
        const totalBS = totalUSD * rate;
        if (countEl) countEl.innerText = count + ' NUEVOS POR ENVIAR';
        if (usdEl) usdEl.innerText = '$' + totalUSD.toFixed(2);
        if (bsEl) bsEl.innerText = 'Bs. ' + totalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (detailBtn) {
          detailBtn.innerText = 'Ver Comanda';
          detailBtn.onclick = openCartModal;
        }
        if (sendBtn) {
          sendBtn.style.display = 'flex';
          sendBtn.disabled = false;
          const labelSpan = sendBtn.querySelector('span');
          if (labelSpan) {
            labelSpan.innerText = selectedTable ? ('ENVIAR (' + selectedTable.name + ')') : 'ELEGIR MESA Y ENVIAR ➔';
          }
        }
      } else {
        const existingOrder = selectedTable ? (state.activeOrders || []).find(function(o) { return o.tableId === selectedTable.id; }) : null;
        if (existingOrder && existingOrder.rounds && existingOrder.rounds.length > 0) {
          const exTotalUSD = existingOrder.rounds.reduce(function(acc, r) {
            return acc + r.items.reduce(function(s, i) { return s + (i.priceUSD * i.quantity); }, 0);
          }, 0);
          const exTotalBS = exTotalUSD * rate;
          const exCount = existingOrder.rounds.reduce(function(acc, r) {
            return acc + r.items.reduce(function(s, i) { return s + i.quantity; }, 0);
          }, 0);
          if (countEl) countEl.innerText = 'CONSUMO MESA (' + exCount + ' PLATOS)';
          if (usdEl) usdEl.innerText = '$' + exTotalUSD.toFixed(2);
          if (bsEl) bsEl.innerText = 'Bs. ' + exTotalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          if (detailBtn) {
            detailBtn.innerText = '📋 Ver Pedido Mesa';
            detailBtn.onclick = openTableOrderModal;
          }
          if (sendBtn) {
            sendBtn.style.display = 'none';
          }
        } else {
          if (countEl) countEl.innerText = '0 ÍTEMS';
          if (usdEl) usdEl.innerText = '$0.00';
          if (bsEl) bsEl.innerText = 'Bs. 0,00';
          if (detailBtn) {
            detailBtn.innerText = 'Ver Detalle';
            detailBtn.onclick = openCartModal;
          }
          if (sendBtn) {
            sendBtn.style.display = 'flex';
            sendBtn.disabled = true;
            const labelSpan = sendBtn.querySelector('span');
            if (labelSpan) labelSpan.innerText = 'ENVIAR';
          }
        }
      }
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
              '<span>Comanda — ' + (selectedTable ? selectedTable.name : 'Nuevo Pedido (Mesa al enviar)') + '</span>' +
            '</div>' +
            '<button class="modal-close-btn" onclick="closeCartModal()">&times;</button>' +
          '</div>' +

          '<div id="cartModalItemsList" style="flex:1; overflow-y:auto; max-height:48vh; padding-right:4px;">' +
            currentCart.map(function(i) {
              const hasImg = i.image && typeof i.image === 'string' && i.image.length > 4;
              let itemImg = hasImg ? (i.image.startsWith('./') ? '/' + i.image.substring(2) : i.image) : '';
              return '<div class="cart-item-row" id="cartRow_' + i.id + '">' +
                '<div class="cart-thumb">' +
                  (hasImg 
                    ? '<img src="' + itemImg + '" style="width:100%; height:100%; object-fit:contain;" onerror="handleProdImgError(this)">' 
                    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D6862B" stroke-width="2"><path d="M3 11c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6v1H3v-1Z"/><path d="M3 16h18v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2Z"/></svg>'
                  ) +
                '</div>' +
                '<div style="flex:1;">' +
                  '<div style="font-weight:800; font-size:0.9rem; color:#18181b;">' + i.name + '</div>' +
                  '<div class="cart-item-price-val" style="font-size:0.8rem; color:#D52829; font-weight:800;">$' + (i.priceUSD * i.quantity).toFixed(2) + ' <span style="font-size:0.7rem; color:#71717a; font-weight:600;">(Bs. ' + ((i.priceUSD * i.quantity) * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ')</span></div>' +
                  '<input type="text" placeholder="Nota: ej. sin pepinillos, extra salsa..." data-id="' + i.id + '" value="' + (i.note || '').replace(/"/g, '&quot;') + '" onchange="updateItemNote(this.dataset.id, this.value)" style="width:96%; padding:6px 9px; font-size:0.78rem; border:1px solid #e4e4e7; border-radius:6px; margin-top:4px; outline:none;">' +
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
            '<button class="cart-send-btn" style="width:100%; padding:14px; font-size:0.95rem; justify-content:center;" onclick="closeCartModal(); promptSelectTableAndSend();">' +
              '<span>' + (selectedTable ? ('ENVIAR A ' + selectedTable.name.toUpperCase()) : 'ELEGIR MESA Y ENVIAR ➔') + '</span>' +
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

    function promptSelectTableAndSend() {
      if (currentCart.length === 0) {
        alert('Agrega al menos un ítem al pedido antes de enviar.');
        return;
      }
      if (selectedTable) {
        executeSendRound(selectedTable.id);
      } else {
        openSelectTableModal();
      }
    }

    function openSelectTableModal() {
      closeSelectTableModal();

      const count = currentCart.reduce(function(acc, i) { return acc + i.quantity; }, 0);
      const totalUSD = currentCart.reduce(function(acc, i) { return acc + (i.priceUSD * i.quantity); }, 0);
      const rate = getLiveExchangeRate();
      const totalBS = totalUSD * rate;

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'selectTableModal';
      modal.innerHTML = 
        '<div class="modal-sheet" style="max-width:540px; max-height:88vh; display:flex; flex-direction:column;">' +
          '<div class="modal-header" style="border-bottom:1.5px solid #e2e8f0; padding-bottom:12px;">' +
            '<div>' +
              '<div class="modal-title" style="font-size:1.15rem; font-weight:900; color:#0f172a; display:flex; align-items:center; gap:8px;">' +
                '<span>🍽️ Asignar Mesa al Pedido</span>' +
              '</div>' +
              '<div style="font-size:0.78rem; color:#64748b; margin-top:3px;">' +
                count + ' ítem(s) &bull; <strong style="color:#D52829;">$' + totalUSD.toFixed(2) + '</strong> (Bs. ' + totalBS.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ') &bull; Toca para enviar directo' +
              '</div>' +
            '</div>' +
            '<button class="modal-close-btn" onclick="closeSelectTableModal()">&times;</button>' +
          '</div>' +

          '<div style="margin:12px 0 8px 0;">' +
            '<button onclick="sendAsQuickTakeaway()" style="width:100%; height:48px; background:linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color:#fff; border:none; border-radius:12px; font-weight:900; font-size:0.95rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 3px 10px rgba(234,88,12,0.25);">' +
              '<span style="font-size:1.15rem;">🛍️</span>' +
              '<span>Enviar como Pedido Para Llevar</span>' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
            '</button>' +
          '</div>' +

          '<div style="font-size:0.75rem; font-weight:800; color:#94a3b8; text-transform:uppercase; margin:8px 0 6px 0; letter-spacing:0.04em;">O selecciona la mesa donde se sentará el cliente:</div>' +

          '<div style="flex:1; overflow-y:auto; padding-right:2px; display:grid; grid-template-columns:repeat(auto-fill, minmax(110px, 1fr)); gap:10px; margin-bottom:12px; max-height:48vh;">' +
            (state.tables || []).map(function(t) {
              const isOccupied = t.status === 'ocupada';
              const isCuenta = t.status === 'cuenta';
              const bg = isCuenta ? '#fef2f2' : (isOccupied ? '#fff7ed' : '#ffffff');
              const border = isCuenta ? '#fca5a5' : (isOccupied ? '#fdba74' : '#cbd5e1');
              const statusText = isCuenta ? '⚠️ En Caja' : (isOccupied ? 'Ocupada (+ ronda)' : 'LIBRE');
              const statusColor = isCuenta ? '#b91c1c' : (isOccupied ? '#c2410c' : '#16a34a');

              return '<div class="select-table-item" data-id="' + t.id + '" onclick="selectTableFromCard(this)" style="background:' + bg + '; border:2px solid ' + border + '; border-radius:14px; padding:12px 8px; text-align:center; cursor:pointer; display:flex; flex-direction:column; justify-content:space-between; min-height:85px; box-shadow:0 2px 6px rgba(0,0,0,0.04);">' +
                '<div style="font-weight:900; font-size:1rem; color:#0f172a;">' + (t.isTakeaway ? '🛍️ ' : '') + t.name + '</div>' +
                '<div style="font-size:0.68rem; font-weight:800; color:' + statusColor + '; text-transform:uppercase; margin-top:4px;">' + statusText + '</div>' +
                '<div style="font-size:0.65rem; color:#94a3b8; font-weight:700; margin-top:2px;">' + (t.zone || 'Salón') + '</div>' +
              '</div>';
            }).join('') +
          '</div>' +

          '<button onclick="closeSelectTableModal()" style="width:100%; height:42px; background:#f1f5f9; border:none; border-radius:10px; font-weight:800; font-size:0.85rem; color:#64748b; cursor:pointer;">' +
            'Cancelar y Volver al Menú' +
          '</button>' +
        '</div>';

      document.body.appendChild(modal);
    }

    function closeSelectTableModal() {
      const m = document.getElementById('selectTableModal');
      if (m) m.remove();
    }

    function selectTableFromCard(el) {
      const tableId = el.getAttribute('data-id');
      selectTableAndSend(tableId);
    }

    function selectTableAndSend(tableId) {
      closeSelectTableModal();
      const tbl = (state.tables || []).find(function(t) { return t.id === tableId; });
      if (!tbl) {
        alert('Mesa no encontrada');
        return;
      }
      selectedTable = tbl;
      executeSendRound(tbl.id);
    }

    function sendAsQuickTakeaway() {
      closeSelectTableModal();
      const takeawayCount = (state.tables || []).filter(function(t) { return t.isTakeaway || (t.zone === 'Para Llevar'); }).length;
      const finalName = 'Llevar #' + (takeawayCount + 1);

      fetch('/api/restaurant/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          zone: 'Para Llevar',
          isTakeaway: true
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(newTable) {
        if (newTable && newTable.id) {
          if (!state.tables.some(function(t) { return t.id === newTable.id; })) {
            state.tables.push(newTable);
          }
          selectedTable = newTable;
          executeSendRound(newTable.id);
        }
      })
      .catch(function(err) {
        alert('Error creando comanda para llevar');
      });
    }

    function executeSendRound(tableId) {
      if (currentCart.length === 0) {
        alert('Agrega al menos un ítem al pedido.');
        return;
      }
      if (!currentWaiter) {
        alert('Sesión no identificada. Por favor ingresa tu PIN.');
        openWaiterSheet();
        return;
      }

      const targetTbl = (state.tables || []).find(function(t) { return t.id === tableId; }) || selectedTable;
      const tblName = targetTbl ? targetTbl.name : 'Mesa';

      fetch('/api/restaurant/order/round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: tableId,
          waiterId: currentWaiter.id,
          waiterName: currentWaiter.name,
          items: currentCart
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (res.success) {
          showAlert('✅ Comanda de ' + tblName + ' enviada a Cocina y Caja');
          currentCart = [];
          if (res.order && Array.isArray(state.activeOrders)) {
            const idx = state.activeOrders.findIndex(function(o) { return o.id === res.order.id; });
            if (idx >= 0) state.activeOrders[idx] = res.order;
            else state.activeOrders.push(res.order);
          }
          if (targetTbl) {
            targetTbl.status = 'ocupada';
          }
          // Reset selectedTable so the screen is immediately clean and ready for the next customer greeting
          selectedTable = null;
          syncAllCardsUI();
          renderOrderScreen();
        } else {
          alert('Error: ' + res.error);
        }
      })
      .catch(function(err) {
        alert('Error de conexión al enviar el pedido');
      });
    }

    function sendOrderRound() {
      promptSelectTableAndSend();
    }

    function resetToNewOrder() {
      selectedTable = null;
      currentCart = [];
      syncAllCardsUI();
      renderOrderScreen();
    }

    function requestBill() {
      if (!selectedTable) return;
      if (confirm('¿Marcar ' + selectedTable.name + ' como Pidiendo Cuenta?')) {
        fetch('/api/restaurant/table/' + selectedTable.id + '/bill', { method: 'POST' })
          .then(function() {
            showAlert('Mesa marcada para cobro en Caja');
            renderTablesScreen();
          });
      }
    }

    function reopenTable(tableId) {
      const id = tableId || (selectedTable ? selectedTable.id : null);
      if (!id) return;
      if (confirm('¿Deseas reabrir esta mesa para seguir agregando productos?')) {
        fetch('/api/restaurant/table/' + id + '/reopen', { method: 'POST' })
          .then(function(r) { return r.json(); })
          .then(function(res) {
            showAlert('Mesa reabierta para seguir consumiendo');
            const tbl = (state.tables || []).find(function(t) { return t.id === tableId; });
            if (tbl) tbl.status = 'ocupada';
            if (selectedTable && selectedTable.id === tableId) selectedTable.status = 'ocupada';
            if (currentScreen === 'order') renderOrderScreen();
            else renderTablesScreen();
          })
          .catch(function() {
            alert('Error al reabrir la mesa');
          });
      }
    }

    function openTableOrderModal() {
      if (!selectedTable) return;
      closeTableOrderModal();

      const existingOrder = (state.activeOrders || []).find(function(o) { return o.tableId === selectedTable.id; });
      if (!existingOrder || !existingOrder.rounds || existingOrder.rounds.length === 0) {
        alert('Esta mesa aún no tiene consumos enviados a cocina o caja.');
        return;
      }

      const rate = getLiveExchangeRate();
      const totalUSD = existingOrder.rounds.reduce(function(acc, r) {
        return acc + r.items.reduce(function(sum, i) { return sum + (i.priceUSD * i.quantity); }, 0);
      }, 0);
      const totalBS = totalUSD * rate;

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tableOrderModal';
      modal.innerHTML = 
        '<div class="modal-sheet" style="max-height:85vh; display:flex; flex-direction:column;">' +
          '<div class="modal-header" style="border-bottom:1.5px solid #e2e8f0; padding-bottom:10px;">' +
            '<div>' +
              '<div class="modal-title" style="font-size:1.1rem; font-weight:900; color:#0f172a; display:flex; align-items:center; gap:8px;">' +
                '<span>📋 ' + (selectedTable.isTakeaway ? '🛍️ ' : '') + selectedTable.name + '</span>' +
                (selectedTable.status === 'cuenta' 
                  ? '<span class="status-cuenta-badge" style="font-size:0.7rem; padding:3px 8px;">Cuenta en Caja</span>' 
                  : '<span class="table-status status-ocupada" style="font-size:0.68rem; margin:0;">En Consumo</span>') +
              '</div>' +
              '<div style="font-size:0.75rem; color:#64748b; margin-top:2px;">' +
                'Mesero: <strong>' + (existingOrder.waiterName || 'Mesero') + '</strong> &bull; ' +
                'Hora: ' + (existingOrder.createdAt ? new Date(existingOrder.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '') +
              '</div>' +
            '</div>' +
            '<button class="modal-close-btn" onclick="closeTableOrderModal()">&times;</button>' +
          '</div>' +

          '<div style="flex:1; overflow-y:auto; padding:10px 0;">' +
            existingOrder.rounds.map(function(r, idx) {
              const rTime = r.sentAt ? new Date(r.sentAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
              let statusBadge = '<span style="background:#e0f2fe; color:#0369a1; padding:2px 7px; border-radius:6px; font-size:0.68rem; font-weight:800;">EN COCINA</span>';
              if (r.status === 'lista') {
                statusBadge = '<span style="background:#fef3c7; color:#b45309; padding:2px 7px; border-radius:6px; font-size:0.68rem; font-weight:800; border:1px solid #fde68a;">¡PLATO LISTO!</span>';
              } else if (r.status === 'servida') {
                statusBadge = '<span style="background:#f0fdf4; color:#15803d; padding:2px 7px; border-radius:6px; font-size:0.68rem; font-weight:800;">SERVIDO</span>';
              }

              return '<div class="round-card">' +
                '<div class="round-header">' +
                  '<span>Ronda #' + (idx + 1) + ' (' + rTime + ')</span>' +
                  statusBadge +
                '</div>' +
                r.items.map(function(item) {
                  const itemUsd = Number(item.priceUSD || 0) * Number(item.quantity || 1);
                  const itemBs = itemUsd * rate;
                  return '<div class="round-item">' +
                    '<div style="flex:1;">' +
                      '<div class="round-item-name">[' + item.quantity + '] ' + item.name + '</div>' +
                      (item.note ? '<div class="round-item-note">&gt;&gt; ' + item.note + '</div>' : '') +
                    '</div>' +
                    '<div style="text-align:right;">' +
                      '<div class="round-item-price">$' + itemUsd.toFixed(2) + '</div>' +
                      '<div class="round-item-price-bs">Bs. ' + itemBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</div>' +
                    '</div>' +
                  '</div>';
                }).join('') +
              '</div>';
            }).join('') +
          '</div>' +

          /* Resumen de Cuenta */
          '<div class="order-summary-box">' +
            '<div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px;">' +
              '<span style="font-weight:900; font-size:0.95rem; color:#0f172a;">TOTAL CUENTA:</span>' +
              '<div style="text-align:right;">' +
                '<div style="font-size:1.4rem; font-weight:900; color:var(--brand-primary); line-height:1.1;">$' + totalUSD.toFixed(2) + '</div>' +
                '<div style="font-size:0.92rem; font-weight:800; color:#059669; font-family:ui-monospace, monospace; margin-top:2px;">Bs. ' + totalBS.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</div>' +
              '</div>' +
            '</div>' +
            '<div style="font-size:0.72rem; color:#64748b; font-weight:600; text-align:right;">' +
              'Tasa Oficial BCV: Bs. ' + rate.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' / USD' +
            '</div>' +
          '</div>' +

          /* Botones de acción */
          '<div style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">' +
            (selectedTable.status !== 'cuenta'
              ? '<button class="cart-send-btn" style="width:100%; height:46px; justify-content:center; background:var(--brand-dark); font-size:0.92rem;" onclick="closeTableOrderModal(); requestBill();">' +
                  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/></svg>' +
                  '<span>PEDIR CUENTA / ENVIAR A CAJA</span>' +
                '</button>'
              : '<div style="background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:10px; text-align:center;">' +
                  '<div style="font-weight:800; color:#b91c1c; font-size:0.86rem; margin-bottom:4px;">⚠️ Cuenta enviada a Caja para cobro</div>' +
                  '<button onclick="closeTableOrderModal(); reopenTable();" style="background:#ffffff; color:#b91c1c; border:1.5px solid #fca5a5; padding:6px 14px; border-radius:8px; font-weight:800; font-size:0.78rem; cursor:pointer;">' +
                    '🔄 Reabrir Mesa (Seguir Ordenando)' +
                  '</button>' +
                '</div>'
            ) +
            '<button onclick="closeTableOrderModal()" style="width:100%; height:40px; background:#f1f5f9; border:none; border-radius:10px; font-weight:800; font-size:0.85rem; color:#475569; cursor:pointer;">' +
              'Volver al Menú' +
            '</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
    }

    function closeTableOrderModal() {
      const modal = document.getElementById('tableOrderModal');
      if (modal) modal.remove();
    }

    function openNewTakeawayModal() {
      closeNewTakeawayModal();
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'takeawayModal';
      modal.innerHTML = 
        '<div class="modal-sheet" style="max-width:420px; border-radius:24px;">' +
          '<div class="modal-header">' +
            '<div class="modal-title">' +
              '<span style="font-size:1.3rem;">🛍️</span>' +
              '<span>Nuevo Pedido Para Llevar</span>' +
            '</div>' +
            '<button class="modal-close-btn" onclick="closeNewTakeawayModal()">&times;</button>' +
          '</div>' +
          '<div style="padding:14px 0;">' +
            '<label style="display:block; font-size:0.82rem; font-weight:800; color:#334155; margin-bottom:6px;">' +
              'Nombre del Cliente o Referencia (Opcional):' +
            '</label>' +
            '<input type="text" id="takeawayClientInput" placeholder="Ej. Carlos, Pedido #1, etc." style="width:100%; height:44px; padding:0 14px; border:1.5px solid #cbd5e1; border-radius:10px; font-size:0.95rem; font-weight:700; color:#0f172a; outline:none; box-sizing:border-box;">' +
            '<div style="font-size:0.75rem; color:#64748b; margin-top:6px;">' +
              'Se creará la comanda de Para Llevar con este nombre para cocina y caja.' +
            '</div>' +
          '</div>' +
          '<div style="display:flex; gap:10px; margin-top:8px;">' +
            '<button onclick="closeNewTakeawayModal()" style="flex:1; height:44px; background:#f1f5f9; border:none; border-radius:10px; font-weight:800; color:#64748b; cursor:pointer;">' +
              'Cancelar' +
            '</button>' +
            '<button onclick="submitNewTakeaway()" style="flex:2; height:44px; background:linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color:#fff; border:none; border-radius:10px; font-weight:900; font-size:0.92rem; cursor:pointer; box-shadow:0 3px 10px rgba(234,88,12,0.3);">' +
              '🛍️ Comenzar Pedido' +
            '</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
      setTimeout(function() {
        const inp = document.getElementById('takeawayClientInput');
        if (inp) inp.focus();
      }, 100);
    }

    function closeNewTakeawayModal() {
      const m = document.getElementById('takeawayModal');
      if (m) m.remove();
    }

    function submitNewTakeaway() {
      const inp = document.getElementById('takeawayClientInput');
      const val = inp ? inp.value.trim() : '';
      const takeawayCount = (state.tables || []).filter(function(t) { return t.isTakeaway || (t.zone === 'Para Llevar'); }).length;
      const finalName = val ? ('Llevar: ' + val) : ('Para Llevar #' + (takeawayCount + 1));

      fetch('/api/restaurant/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          zone: 'Para Llevar',
          isTakeaway: true
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(newTable) {
        closeNewTakeawayModal();
        if (newTable && newTable.id) {
          if (!state.tables.some(function(t) { return t.id === newTable.id; })) {
            state.tables.push(newTable);
          }
          openTable(newTable.id);
        }
      })
      .catch(function(err) {
        alert('Error creando comanda para llevar');
      });
    }

    /* Product Detail Modal & High-Res Lightbox */
    let currentDetailProduct = null;
    let currentDetailQty = 1;

    function onDetailImgError(img) {
      img.onerror = null;
      img.src = '/happydays/logo.png';
    }

    function openProductDetail(cardOrId) {
      const prodId = typeof cardOrId === 'string' ? cardOrId : cardOrId.getAttribute('data-id');
      const p = (state.menu && state.menu.products || []).find(function(x) { return x.id === prodId; });
      if (!p) return;

      currentDetailProduct = p;
      currentDetailQty = 1;
      closeProductDetailModal();

      const rate = getLiveExchangeRate();
      const usdPrice = Number(p.priceUSD || 0);
      const bsPrice = (usdPrice * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const hasImg = p.image && typeof p.image === 'string' && p.image.trim().length > 4;
      let safeImg = hasImg ? p.image.replace(/"/g, '&quot;') : '';
      if (safeImg.startsWith('./')) safeImg = '/' + safeImg.substring(2);
      const safeName = (p.name || 'Producto').replace(/"/g, '&quot;');
      const safeDesc = (p.description || 'Elaborado artesanalmente al momento con ingredientes frescos seleccionados y receta de la casa.').replace(/"/g, '&quot;');

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'productDetailModal';
      modal.onclick = function(e) {
        if (e.target === modal) closeProductDetailModal();
      };

      modal.innerHTML = 
        '<div class="product-detail-sheet" onclick="event.stopPropagation()">' +
          '<div class="product-detail-hero">' +
            '<span class="product-detail-cat-pill">' + (p.category || 'Happy Days') + '</span>' +
            '<button class="product-detail-close-btn" type="button" onclick="closeProductDetailModal()">&times;</button>' +
            (hasImg
              ? '<img src="' + safeImg + '" alt="' + safeName + '" data-name="' + safeName + '" onclick="openLightboxFromImg(this)" onerror="onDetailImgError(this)">' +
                '<div style="position:absolute; bottom:8px; right:12px; background:rgba(0,0,0,0.6); color:#fff; font-size:0.68rem; font-weight:800; padding:3px 9px; border-radius:6px; pointer-events:none; backdrop-filter:blur(4px); display:flex; align-items:center; gap:4px;">' +
                  '<span>🔍</span><span>Toca la foto para ampliar</span>' +
                '</div>'
              : '<div class="prod-img-fallback" style="width:100%; height:100%; border-radius:14px;">' +
                  '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D6862B" stroke-width="2"><path d="M3 11c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6v1H3v-1Z"/><path d="M3 16h18v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2Z"/><line x1="2" y1="14" x2="22" y2="14"/></svg>' +
                  '<span style="font-weight:800; font-size:0.85rem; color:#64748b; margin-top:6px;">' + (p.category || 'Happy Days') + '</span>' +
                '</div>'
            ) +
          '</div>' +
          '<div class="product-detail-body">' +
            '<div>' +
              '<div class="product-detail-title">' + safeName + '</div>' +
              (p.sku ? '<div style="font-size:0.75rem; color:#94a3b8; font-weight:700; margin-top:3px;">Código / SKU: ' + p.sku + '</div>' : '') +
            '</div>' +

            '<div class="product-detail-prices">' +
              '<div>' +
                '<div style="font-size:0.7rem; font-weight:800; color:#64748b; text-transform:uppercase;">Precio Unitario</div>' +
                '<div class="product-detail-usd">$' + usdPrice.toFixed(2) + '</div>' +
              '</div>' +
              '<div style="text-align:right;">' +
                '<div style="font-size:0.7rem; font-weight:800; color:#64748b; text-transform:uppercase;">Precio en Bs. (BCV)</div>' +
                '<div class="product-detail-bs">Bs. ' + bsPrice + '</div>' +
              '</div>' +
            '</div>' +

            '<div class="product-detail-desc-box">' +
              '<div class="product-detail-desc-label">' +
                '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' +
                '<span>Ingredientes y Descripción</span>' +
              '</div>' +
              '<div class="product-detail-desc-text">' + safeDesc + '</div>' +
            '</div>' +

            '<div>' +
              '<label style="display:block; font-size:0.78rem; font-weight:800; color:#334155; margin-bottom:6px;">Cantidad a ordenar:</label>' +
              '<div class="detail-qty-stepper">' +
                '<button class="detail-qty-btn" type="button" onclick="changeDetailQty(-1)">&minus;</button>' +
                '<div class="detail-qty-num" id="detailQtyNum">1</div>' +
                '<button class="detail-qty-btn" type="button" onclick="changeDetailQty(1)">&plus;</button>' +
              '</div>' +
            '</div>' +

            '<div>' +
              '<label style="display:block; font-size:0.78rem; font-weight:800; color:#334155; margin-bottom:6px;">Nota o instrucción para cocina (opcional):</label>' +
              '<input type="text" id="detailNoteInput" placeholder="Ej. Sin cebolla, salsa aparte, bien cocido..." style="width:100%; height:44px; border:1.5px solid #cbd5e1; border-radius:12px; padding:0 14px; font-size:0.9rem; font-weight:600; color:#0f172a; outline:none; box-sizing:border-box;">' +
              '<div class="note-pills-row">' +
                '<button type="button" class="note-pill" data-note="Sin cebolla" onclick="onPillClick(this)">Sin cebolla</button>' +
                '<button type="button" class="note-pill" data-note="Salsa aparte" onclick="onPillClick(this)">Salsa aparte</button>' +
                '<button type="button" class="note-pill" data-note="Bien cocido" onclick="onPillClick(this)">Bien cocido</button>' +
                '<button type="button" class="note-pill" data-note="Término medio" onclick="onPillClick(this)">Término medio</button>' +
                '<button type="button" class="note-pill" data-note="Extra queso" onclick="onPillClick(this)">Extra queso</button>' +
              '</div>' +
            '</div>' +

            '<div style="margin-top:4px;">' +
              '<button class="detail-add-btn" id="detailAddBtn" type="button" onclick="submitProductDetailAdd()">' +
                '<span>🛍️ AGREGAR A LA COMANDA</span>' +
                '<span style="opacity:0.88; font-size:0.9rem; font-weight:800;" id="detailAddBtnTotals">($' + usdPrice.toFixed(2) + ' / Bs. ' + bsPrice + ')</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      document.body.appendChild(modal);
    }

    function closeProductDetailModal() {
      const m = document.getElementById('productDetailModal');
      if (m) m.remove();
    }

    function changeDetailQty(delta) {
      currentDetailQty = Math.max(1, currentDetailQty + delta);
      const numEl = document.getElementById('detailQtyNum');
      if (numEl) numEl.innerText = currentDetailQty;
      updateDetailAddBtnTotals();
    }

    function onPillClick(btn) {
      const text = btn.getAttribute('data-note') || '';
      appendDetailNote(text);
    }

    function appendDetailNote(text) {
      const inp = document.getElementById('detailNoteInput');
      if (!inp || !text) return;
      const current = inp.value.trim();
      if (current.indexOf(text) !== -1) return;
      inp.value = current ? (current + ', ' + text) : text;
    }

    function updateDetailAddBtnTotals() {
      if (!currentDetailProduct) return;
      const rate = getLiveExchangeRate();
      const unitUsd = Number(currentDetailProduct.priceUSD || 0);
      const totalUsd = unitUsd * currentDetailQty;
      const totalBs = totalUsd * rate;
      const btnTotals = document.getElementById('detailAddBtnTotals');
      if (btnTotals) {
        btnTotals.innerText = '($' + totalUsd.toFixed(2) + ' / Bs. ' + totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ')';
      }
    }

    function submitProductDetailAdd() {
      if (!currentDetailProduct) return;
      const inp = document.getElementById('detailNoteInput');
      const note = inp ? inp.value.trim() : '';

      addCustomItemToCart(currentDetailProduct.id, currentDetailQty, note);
      closeProductDetailModal();
      showAlert('Agregado: [' + currentDetailQty + '] ' + currentDetailProduct.name);
    }

    function addCustomItemToCart(prodId, qty, note) {
      const prod = (state.menu && state.menu.products || []).find(function(p) { return p.id === prodId; });
      if (!prod) return;

      let existing = currentCart.find(function(i) { return i.id === prodId && (i.note || '') === (note || ''); });
      if (existing) {
        existing.quantity += qty;
      } else {
        currentCart.push({
          id: prod.id,
          name: prod.name,
          image: prod.image,
          priceUSD: Number(prod.priceUSD),
          quantity: qty,
          note: note || ''
        });
        existing = currentCart[currentCart.length - 1];
      }
      if (navigator.vibrate) {
        try { navigator.vibrate(35); } catch(e) {}
      }
      updateCartBar();
      const totalForProd = currentCart.filter(function(i) { return i.id === prodId; }).reduce(function(acc, i) { return acc + i.quantity; }, 0);
      updateCardBadge(prodId, totalForProd);
    }

    function openLightboxFromImg(img) {
      const src = img.src;
      const title = img.getAttribute('data-name') || '';
      openLightbox(src, title);
    }

    function openLightbox(imgSrc, title) {
      closeLightbox();
      const lb = document.createElement('div');
      lb.className = 'modal-overlay';
      lb.id = 'lightboxModal';
      lb.style.cssText = 'z-index: 10000; background: rgba(0,0,0,0.92); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); padding: 14px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer;';
      lb.onclick = closeLightbox;

      lb.innerHTML = 
        '<div style="position:relative; max-width:94vw; max-height:90vh; display:flex; flex-direction:column; align-items:center;">' +
          '<button type="button" onclick="closeLightbox()" style="position:absolute; top:-16px; right:-16px; width:44px; height:44px; border-radius:50%; background:#ffffff; color:#0f172a; border:none; font-size:1.5rem; font-weight:900; cursor:pointer; box-shadow:0 4px 16px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:10;">&times;</button>' +
          '<img src="' + imgSrc + '" style="max-width:92vw; max-height:82vh; object-fit:contain; border-radius:20px; box-shadow:0 12px 40px rgba(0,0,0,0.6); background:#ffffff; padding:10px; box-sizing:border-box;">' +
          (title ? '<div style="color:#ffffff; font-size:1.25rem; font-weight:900; margin-top:12px; text-shadow:0 2px 8px rgba(0,0,0,0.8); text-align:center;">' + title + '</div>' : '') +
          '<div style="color:#cbd5e1; font-size:0.75rem; font-weight:700; margin-top:4px;">Toca en cualquier parte para cerrar</div>' +
        '</div>';

      document.body.appendChild(lb);
    }

    function closeLightbox() {
      const el = document.getElementById('lightboxModal');
      if (el) el.remove();
    }
  </script>
</body>
</html>`;
}

module.exports = { renderWaiterView };
