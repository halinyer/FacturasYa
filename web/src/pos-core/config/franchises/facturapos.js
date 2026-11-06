// Perfil de Marca Base: FacturaPOS
export const facturapos = {
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
    logoImage: null, // Sin imagen fija, usa icono elegante
    logoIcon: '⚡',
    badge: 'POS',
    colors: {
      primary: '#2563eb',          // Azul profesional moderno
      primaryHover: '#1d4ed8',
      dark: '#0f172a',             // Slate profundo
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
    contactNotice: 'FacturaPOS - Sistema Administrativo',
  },

  waiterApp: {
    title: 'FacturaPOS Comandero',
    shortName: 'POS Comandas',
  }
};

export default facturapos;
