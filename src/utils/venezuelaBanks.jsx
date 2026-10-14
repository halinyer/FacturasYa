import React from 'react';

/**
 * Catálogo oficial de Bancos de Venezuela con sus códigos oficiales de 4 dígitos (SUDEBAN/BCV),
 * colores de marca, siglas y logotipos vectoriales SVG optimizados y offline.
 */
export const VZLA_BANKS = [
  {
    code: '0102',
    id: '0102',
    name: 'Banco de Venezuela',
    shortName: 'BDV',
    color: '#c8102e',
    bg: '#fef2f2',
    borderColor: '#fca5a5'
  },
  {
    code: '0134',
    id: '0134',
    name: 'Banesco',
    shortName: 'Banesco',
    color: '#007a3d',
    bg: '#ecfdf5',
    borderColor: '#86efac'
  },
  {
    code: '0105',
    id: '0105',
    name: 'Mercantil',
    shortName: 'Mercantil',
    color: '#002b66',
    bg: '#eff6ff',
    borderColor: '#93c5fd'
  },
  {
    code: '0108',
    id: '0108',
    name: 'BBVA Provincial',
    shortName: 'Provincial',
    color: '#004481',
    bg: '#eff6ff',
    borderColor: '#93c5fd'
  },
  {
    code: '0172',
    id: '0172',
    name: 'Bancamiga',
    shortName: 'Bancamiga',
    color: '#00a896',
    bg: '#f0fdfa',
    borderColor: '#99f6e4'
  },
  {
    code: '0191',
    id: '0191',
    name: 'Banco Nacional de Crédito',
    shortName: 'BNC',
    color: '#0f5b47',
    bg: '#f0fdf4',
    borderColor: '#a7f3d0'
  },
  {
    code: '0114',
    id: '0114',
    name: 'Bancaribe',
    shortName: 'Bancaribe',
    color: '#008080',
    bg: '#f0fdfa',
    borderColor: '#99f6e4'
  },
  {
    code: '0163',
    id: '0163',
    name: 'Banco del Tesoro',
    shortName: 'Tesoro',
    color: '#881337',
    bg: '#fef2f2',
    borderColor: '#fca5a5'
  },
  {
    code: '0174',
    id: '0174',
    name: 'Banplus',
    shortName: 'Banplus',
    color: '#0284c7',
    bg: '#f0f9ff',
    borderColor: '#bae6fd'
  },
  {
    code: '0175',
    id: '0175',
    name: 'Banco Bicentenario',
    shortName: 'Bicentenario',
    color: '#b91c1c',
    bg: '#fef2f2',
    borderColor: '#fca5a5'
  },
  {
    code: '0115',
    id: '0115',
    name: 'Banco Exterior',
    shortName: 'Exterior',
    color: '#0369a1',
    bg: '#f0f9ff',
    borderColor: '#bae6fd'
  },
  {
    code: '0138',
    id: '0138',
    name: 'Banco Plaza',
    shortName: 'Plaza',
    color: '#15803d',
    bg: '#f0fdf4',
    borderColor: '#bbf7d0'
  },
  {
    code: '0104',
    id: '0104',
    name: 'Venezolano de Crédito',
    shortName: 'BVC',
    color: '#1e3a8a',
    bg: '#eff6ff',
    borderColor: '#bfdbfe'
  },
  {
    code: '0151',
    id: '0151',
    name: 'BFC Banco Fondo Común',
    shortName: 'BFC',
    color: '#c2410c',
    bg: '#fff7ed',
    borderColor: '#fed7aa'
  },
  {
    code: '0128',
    id: '0128',
    name: 'Banco Caroní',
    shortName: 'Caroní',
    color: '#d97706',
    bg: '#fffbeb',
    borderColor: '#fde68a'
  },
  {
    code: '0169',
    id: '0169',
    name: 'Mi Banco',
    shortName: 'Mi Banco',
    color: '#0f766e',
    bg: '#f0fdfa',
    borderColor: '#99f6e4'
  },
  {
    code: '0171',
    id: '0171',
    name: 'Banco Activo',
    shortName: 'Activo',
    color: '#e11d48',
    bg: '#fff1f2',
    borderColor: '#fecdd3'
  },
  {
    code: '0177',
    id: '0177',
    name: 'BANFANB',
    shortName: 'BANFANB',
    color: '#166534',
    bg: '#f0fdf4',
    borderColor: '#bbf7d0'
  },
  {
    code: '0168',
    id: '0168',
    name: 'Bancrecer',
    shortName: 'Bancrecer',
    color: '#0284c7',
    bg: '#f0f9ff',
    borderColor: '#bae6fd'
  },
  {
    code: '0157',
    id: '0157',
    name: 'DELSUR',
    shortName: 'DELSUR',
    color: '#9a3412',
    bg: '#fff7ed',
    borderColor: '#fed7aa'
  }
];

/**
 * Logotipo vectorizado SVG de cada banco para máxima nitidez y rendimiento offline
 */
export const BankLogo = ({ code, size = 26 }) => {
  const s = size;

  switch (code) {
    case '0102': // BDV - Banco de Venezuela (Rojo y Amarillo)
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '7px', flexShrink: 0 }}>
          <rect width="36" height="36" rx="7" fill="#C8102E" />
          <path d="M18 7L24 18H12L18 7Z" fill="#FECB00" />
          <path d="M18 29L12 18H24L18 29Z" fill="#FFFFFF" />
          <circle cx="18" cy="18" r="3.5" fill="#C8102E" />
        </svg>
      );

    case '0134': // Banesco (Verde institucional con lazo característico)
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '7px', flexShrink: 0 }}>
          <rect width="36" height="36" rx="7" fill="#007A3D" />
          <path d="M8 24C12 24 15 14 21 14C24 14 27 16 28 19C26 13 22 11 18 11C12 11 10 20 8 24Z" fill="#FFFFFF" />
          <circle cx="24" cy="22" r="3.5" fill="#FECB00" />
        </svg>
      );

    case '0105': // Mercantil (Azul oscuro y chispa naranja)
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '7px', flexShrink: 0 }}>
          <rect width="36" height="36" rx="7" fill="#002B66" />
          <circle cx="18" cy="18" r="9" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
          <path d="M18 10C22 10 25 13 25 17C22 15 19 14 18 10Z" fill="#FF7900" />
          <circle cx="18" cy="18" r="3.5" fill="#FF7900" />
        </svg>
      );

    case '0108': // BBVA Provincial (Azul BBVA y tipografía)
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '7px', flexShrink: 0 }}>
          <rect width="36" height="36" rx="7" fill="#004481" />
          <text x="18" y="22" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="-0.5px">
            BBVA
          </text>
        </svg>
      );

    case '0172': // Bancamiga (Verde azulado y lazo infinito amarillo)
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '7px', flexShrink: 0 }}>
          <rect width="36" height="36" rx="7" fill="#00A896" />
          <path d="M11 18C11 15 14 13 16.5 15.5L19.5 18.5C22 21 25 19 25 16C25 13 22 11 19.5 13.5L16.5 16.5C14 19 11 17 11 18Z" stroke="#FECB00" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        </svg>
      );

    case '0191': // BNC - Banco Nacional de Crédito (Verde oscuro y naranja)
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '7px', flexShrink: 0 }}>
          <rect width="36" height="36" rx="7" fill="#0F5B47" />
          <rect x="7" y="10" width="22" height="16" rx="3" fill="#EA580C" opacity="0.3" />
          <text x="18" y="23" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.5px">
            BNC
          </text>
        </svg>
      );

    case '0114': // Bancaribe (Turquesa con olas)
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '7px', flexShrink: 0 }}>
          <rect width="36" height="36" rx="7" fill="#008080" />
          <path d="M9 16C13 12 17 20 21 16C24 13 27 15 28 17" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M9 21C13 17 17 25 21 21C24 18 27 20 28 22" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case '0163': // Banco del Tesoro
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '7px', flexShrink: 0 }}>
          <rect width="36" height="36" rx="7" fill="#881337" />
          <circle cx="18" cy="18" r="8" fill="#F59E0B" opacity="0.9" />
          <text x="18" y="22" textAnchor="middle" fill="#881337" fontSize="10" fontWeight="900" fontFamily="sans-serif">
            BT
          </text>
        </svg>
      );

    case '0174': // Banplus
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '7px', flexShrink: 0 }}>
          <rect width="36" height="36" rx="7" fill="#0284C7" />
          <path d="M14 18H22M18 14V22" stroke="#F97316" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );

    case '0175': // Bicentenario
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '7px', flexShrink: 0 }}>
          <rect width="36" height="36" rx="7" fill="#B91C1C" />
          <text x="18" y="22" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="sans-serif">
            200
          </text>
        </svg>
      );

    default: // Genérico banco venezolano
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '7px', flexShrink: 0 }}>
          <rect width="36" height="36" rx="7" fill="#475569" />
          <path d="M18 10L10 15V17H26V15L18 10Z" fill="#FFFFFF" />
          <rect x="12" y="18" width="2.5" height="7" fill="#FFFFFF" />
          <rect x="17" y="18" width="2.5" height="7" fill="#FFFFFF" />
          <rect x="22" y="18" width="2.5" height="7" fill="#FFFFFF" />
          <rect x="9" y="25" width="18" height="2" fill="#FFFFFF" />
        </svg>
      );
  }
};

/**
 * Busca un banco a partir de su código, nombre corto o id
 */
export function findBank(query) {
  if (!query) return null;
  const q = String(query).trim().toLowerCase();
  return VZLA_BANKS.find(b => 
    b.code === q ||
    b.id.toLowerCase() === q ||
    b.shortName.toLowerCase() === q ||
    b.name.toLowerCase().includes(q)
  ) || null;
}
