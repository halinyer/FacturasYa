// Configuración centralizada de marca y franquicia para Happy Days
export const CLIENT_CONFIG = {
  id: 'happy-days',
  name: 'Happy Days',
  legalName: 'Happy Days C.A.',
  subtitle: 'Heladería, Diner & Restaurante',
  tagline: 'Momentos felices, sabores inolvidables',
  rif: 'J-50123456-7', // Actualizable con el RIF real
  address: 'Caracas, Venezuela',
  phone: '0414-1234567',
  instagram: '@happydays_ve',
  
  // Identidad visual
  branding: {
    logoText: 'Happy Days',
    logoIcon: '🍦',
    badge: 'HD',
  },

  // Ticket Térmico (80mm / 58mm)
  receipt: {
    headerTitle: 'HAPPY DAYS',
    subtitle: 'Heladería & Restaurant',
    nonFiscalNotice: 'Documento de Control Interno (No Fiscal)',
    footerGreeting: '¡Gracias por compartir tus momentos felices con nosotros!',
    contactNotice: 'Síguenos en Instagram: @happydays_ve',
  },

  // Comandero Tablet / PWA (/waiter)
  waiterApp: {
    title: 'Happy Days Comandero',
    shortName: 'HD Comandas',
  }
};

export default CLIENT_CONFIG;
