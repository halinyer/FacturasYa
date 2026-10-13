// Configuración centralizada de marca del sistema FacturaPOS (Versión Base)
export const CLIENT_CONFIG = {
  id: 'facturapos',
  name: 'FacturaPOS',
  legalName: 'FacturaPOS Venezuela C.A.',
  subtitle: 'Sistema de Facturación & POS',
  tagline: 'Control total de ventas, mesas y comandas',
  rif: 'J-00000000-0',
  address: 'Venezuela',
  phone: '0412-0000000',
  instagram: '@facturapos',
  
  // Identidad visual
  branding: {
    logoText: 'FacturaPOS',
    logoImage: null, // Sin logo de franquicia en la versión base
    logoIcon: '⚡',
    badge: 'POS',
    colors: {
      primary: '#D52829',
      dark: '#601718',
      warm: '#D6862B',
      peach: '#E99065',
      green: '#7CBE43'
    }
  },

  // Ticket Térmico (80mm / 58mm)
  receipt: {
    headerTitle: 'FACTURAPOS',
    subtitle: 'Comprobante de Consumo',
    nonFiscalNotice: 'Documento de Control Interno (No Fiscal)',
    footerGreeting: '¡Gracias por su compra y preferencia!',
    contactNotice: 'FacturaPOS - Sistema de Facturación',
  },

  // Comandero Tablet / PWA (/waiter)
  waiterApp: {
    title: 'FacturaPOS Comandero',
    shortName: 'POS Comandas',
  }
};

export default CLIENT_CONFIG;
