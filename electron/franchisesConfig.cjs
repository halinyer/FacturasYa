// Centralized Franchise Engine (CommonJS for Node.js & Electron Local Server)

const FRANCHISES = {
  facturapos: {
    id: 'facturapos',
    name: 'FacturaPOS',
    legalName: 'FacturaPOS Venezuela C.A.',
    subtitle: 'Sistema de Facturación & POS',
    tagline: 'Control total de ventas, mesas y comandas',
    rif: 'J-00000000-0',
    address: 'Venezuela',
    phone: '0412-0000000',
    instagram: '@facturapos',
    branding: {
      logoText: 'FacturaPOS',
      logoImage: null,
      logoIcon: '⚡',
      badge: 'POS',
      colors: {
        primary: '#09090b',          // Notion Zinc-950
        primaryHover: '#27272a',     // Notion Zinc-800
        dark: '#09090b',             // Notion Zinc-950
        warm: '#71717a',             // Notion Zinc-500
        peach: '#a1a1aa',            // Notion Zinc-400
        green: '#10b981',            // Esmeralda
        accentSoft: '#f4f4f5',       // Notion Zinc-100
        borderSubtle: '#e4e4e7'      // Notion Zinc-200
      }
    },
    receipt: {
      headerTitle: 'FACTURAPOS',
      subtitle: 'Comprobante de Consumo',
      nonFiscalNotice: 'Documento de Control Interno (No Fiscal)',
      footerGreeting: '¡Gracias por su compra y preferencia!',
      contactNotice: 'FacturaPOS - Sistema Administrativo'
    },
    waiterApp: {
      title: 'FacturaPOS Comandero',
      shortName: 'POS Comandas'
    }
  },

  happydays: {
    id: 'happydays',
    name: 'Happy Days',
    legalName: 'Happy Days C.A.',
    subtitle: 'Burgers, Pollo Frito & Shakes',
    tagline: 'Momentos felices, sabores inolvidables',
    rif: 'J-50123456-7',
    address: 'Caracas, Venezuela',
    phone: '0414-1234567',
    instagram: '@happydays_ve',
    branding: {
      logoText: 'Happy Days',
      logoImage: '/happydays/logo.png',
      logoIcon: '🍔',
      badge: 'HD',
      colors: {
        primary: '#09090b',          // Notion Zinc-950 unificado
        primaryHover: '#27272a',
        dark: '#09090b',
        warm: '#71717a',
        peach: '#a1a1aa',
        green: '#10b981',
        accentSoft: '#f4f4f5',
        borderSubtle: '#e4e4e7'
      }
    },
    receipt: {
      headerTitle: 'HAPPY DAYS',
      subtitle: 'Burgers, Pollo Frito & Shakes',
      nonFiscalNotice: 'Documento de Control Interno (No Fiscal)',
      footerGreeting: '¡Gracias por compartir tus momentos felices con nosotros!',
      contactNotice: 'Síguenos en Instagram: @happydays_ve'
    },
    waiterApp: {
      title: 'Happy Days Comandero',
      shortName: 'HD Comandas'
    }
  }
};

function getFranchiseConfig(id) {
  if (!id) return FRANCHISES.facturapos;
  const cleanId = String(id).toLowerCase().replace(/[-_]/g, '');
  if (cleanId.includes('happy')) return FRANCHISES.happydays;
  if (cleanId.includes('factura')) return FRANCHISES.facturapos;
  return FRANCHISES[id] || FRANCHISES.facturapos;
}

function getAvailableFranchises() {
  return Object.keys(FRANCHISES).map(k => ({
    id: FRANCHISES[k].id,
    name: FRANCHISES[k].name,
    badge: FRANCHISES[k].branding.badge,
    colors: FRANCHISES[k].branding.colors
  }));
}

module.exports = {
  FRANCHISES,
  getFranchiseConfig,
  getAvailableFranchises
};
