// Perfil de Franquicia: Helados Cali (Datos Fiscales y Corporativos Oficiales)
export const heladoscali = {
  id: 'helados-cali',
  name: 'Helados Cali',
  legalName: 'DISTRIBUIDORA Y FRANQUICIA HELADOS CALI C.A.',
  subtitle: 'La Alegría de Compartir',
  tagline: 'El sabor de la alegría en cada rincón de Venezuela',
  rif: 'J-310555888-2',
  address: 'AV. PRINCIPAL ZONA INDUSTRIAL SAN FELIX, ESTADO BOLIVAR / DISTRIBUIDORA AUTORIZADA VENEZUELA',
  addressLines: [
    'AV. PRINCIPAL ZONA INDUSTRIAL',
    'FRANQUICIA Y DISTRIBUCION COMERCIAL',
    'ESTADO BOLIVAR / COBERTURA NACIONAL',
    'ZONA POSTAL 8051'
  ],
  phone: '0414-8889900',
  instagram: '@heladoscali_oficial',

  fiscalMachine: {
    type: 'TFHKA',
    serial: 'Z1B1234567'
  },

  branding: {
    logoText: 'Helados Cali',
    logoImage: './helados_cali_logo.png',
    logoIcon: '🍦',
    badge: 'CALI',
    colors: {
      primary: '#D91C24',          // Rojo Intenso Cali
      primaryHover: '#b9131a',
      dark: '#7F1D1D',             // Rojo Oscuro / Borde Profundo
      warm: '#F59E0B',             // Amarillo Dorado / Mostrador Neveras
      peach: '#FDE68A',            // Crema Vainilla Suave
      green: '#059669',            // Verde Aprobado / Cobrado
      cyan: '#0284C7',             // Azul Hielo Refrescante
      accentSoft: '#fff1f2',
      borderSubtle: '#fecdd3'
    }
  },

  receipt: {
    headerTop: 'HELADOS CALI',
    headerTitle: 'DISTRIBUIDORA Y FRANQUICIA HELADOS CALI C.A.',
    subtitle: 'La Alegría de Compartir',
    nonFiscalNotice: 'DOCUMENTO DE CONTROL INTERNO - DESPACHO DE HELADERIA',
    footerGreeting: '¡Gracias por compartir la alegría con Helados Cali!',
    contactNotice: 'Síguenos en Instagram: @heladoscali_oficial',
  },

  waiterApp: {
    title: 'Helados Cali POS',
    shortName: 'Cali Ventas',
  }
};

export default heladoscali;
