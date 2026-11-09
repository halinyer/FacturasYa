// Perfil de Franquicia: Helados La Cascada (La Grita, Edo. Táchira - Venezuela)
export const heladoslacascada = {
  id: 'helados-la-cascada',
  name: 'Helados La Cascada',
  legalName: 'PRODUCTOS LA CASCADA C.A.',
  subtitle: 'El Sabor que Une Generaciones',
  tagline: 'Tradición heladera desde La Grita, Estado Táchira para toda Venezuela',
  rif: 'J-30819445-0',
  address: 'AV. FRANCISCO DE CACERES Nº 12-134, EL CENTRO, LA GRITA, ESTADO TACHIRA',
  addressLines: [
    'AV. FRANCISCO DE CACERES Nº 12-134',
    'EL CENTRO, LA GRITA, EDO. TACHIRA',
    'FABRICA Y DISTRIBUCION NACIONAL',
    'ZONA POSTAL 5022'
  ],
  phone: '0414-7407076',
  instagram: '@heladoslacascada',

  fiscalMachine: {
    type: 'TFHKA',
    serial: 'Z3C9876543'
  },

  branding: {
    logoText: 'Helados La Cascada',
    logoImage: './helados_la_cascada_logo.png',
    logoIcon: '🍦',
    badge: 'CASCADA',
    colors: {
      primary: '#FF4562',          // Rosa Frambuesa Cascada
      primaryHover: '#e0334f',
      dark: '#2C35A3',             // Azul Noche Cascada
      warm: '#FDEA00',             // Amarillo Vainilla
      peach: '#FFE4E8',            // Rosa Suave Pastel
      green: '#059669',            // Verde Aprobado
      cyan: '#00D3C3',             // Aqua / Turquesa Cascada
      accentSoft: '#fff0f3',
      borderSubtle: '#fecdd6'
    }
  },

  receipt: {
    headerTop: 'HELADOS LA CASCADA',
    headerTitle: 'PRODUCTOS LA CASCADA C.A.',
    subtitle: 'El Sabor que Une Generaciones',
    nonFiscalNotice: 'DOCUMENTO DE CONTROL INTERNO - DESPACHO DE HELADERIA',
    footerGreeting: '¡Gracias por preferir Helados La Cascada!',
    contactNotice: 'Síguenos en Instagram: @heladoslacascada • La Grita, Táchira',
  },

  waiterApp: {
    title: 'La Cascada POS',
    shortName: 'Cascada Ventas',
  }
};

export default heladoslacascada;
