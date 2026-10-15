// Perfil de Franquicia: Happy Days (Datos Fiscales SENIAT Oficiales)
export const happydays = {
  id: 'happy-days',
  name: 'Happy Days',
  legalName: 'INVERSIONES HAPPY DAYS 1 C.A',
  subtitle: 'Burgers, Pollo Frito & Shakes',
  tagline: 'Momentos felices, sabores inolvidables',
  rif: 'J-500195923',
  address: 'AV FRANCISCO DE MIRANDA FRENTE EL MARQUEZ C.C UNICENTRO EL MARQUEZ LOCAL NR0126 URB EL MARQUEZ CARACAS PETARE MIRANDA ZONA POSTAL 1070',
  addressLines: [
    'AV FRANCISCO DE MIRANDA FRENTE EL MARQUEZ',
    'C.C UNICENTRO EL MARQUEZ LOCAL NR0126',
    'URB EL MARQUEZ CARACAS PETARE MIRANDA',
    'ZONA POSTAL 1070'
  ],
  phone: '0412-4444929',
  instagram: '@happydays_ve',

  fiscalMachine: {
    type: 'MH',
    serial: 'Z7C7011149'
  },

  branding: {
    logoText: 'Happy Days',
    logoImage: './happydays/logo.png',
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
    headerTop: 'HAPPY DAYS',
    headerTitle: 'INVERSIONES HAPPY DAYS 1 C.A',
    subtitle: 'Burgers, Pollo Frito & Shakes',
    nonFiscalNotice: 'DOCUMENTO DE CONTROL INTERNO - PRE-ORDEN',
    footerGreeting: '¡Gracias por su visita!',
    contactNotice: 'Síguenos en Instagram: @happydays_ve',
  },

  waiterApp: {
    title: 'Happy Days Comandero',
    shortName: 'HD Comandas',
  }
};

export default happydays;
