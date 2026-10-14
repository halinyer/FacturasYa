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
        primary: '#2563eb',          // Azul profesional estilo Apple
        primaryHover: '#1d4ed8',
        dark: '#0f172a',             // Slate oscuro Apple
        warm: '#d97706',             // Ámbar
        peach: '#f59e0b',
        green: '#10b981',            // Esmeralda
        accentSoft: '#eff6ff',
        borderSubtle: '#e2e8f0'
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
        primary: '#D52829',          // Rojo Principal
        primaryHover: '#b81f20',
        dark: '#601718',             // Granate Profundo
        warm: '#D6862B',             // Ámbar Dorado
        peach: '#E99065',            // Melocotón Cálido
        green: '#7CBE43',            // Verde Fresco
        accentSoft: '#fef2f2',
        borderSubtle: '#fecaca'
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
