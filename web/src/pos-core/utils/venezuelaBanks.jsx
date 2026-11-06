import React from 'react';
import { getAssetUrl } from './assetHelper';

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
    code: '0156',
    id: '0156',
    name: '100% Banco',
    shortName: '100% Banco',
    color: '#005baa',
    bg: '#eff6ff',
    borderColor: '#93c5fd'
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
 * Logotipo oficial de cada banco (PNG real de alta definición con fondo transparente/blanco adaptativo)
 * y fallback elegante en caso de código no registrado.
 */
export const BankLogo = ({ code, size = 26, style = {}, className = '' }) => {
  const [imgError, setImgError] = React.useState(false);
  const s = size;

  if (!code || imgError) {
    return (
      <span
        className={className}
        style={{
          width: `${s}px`,
          height: `${s}px`,
          minWidth: `${s}px`,
          minHeight: `${s}px`,
          borderRadius: '6px',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          flexShrink: 0,
          boxSizing: 'border-box',
          ...style
        }}
      >
        <svg width={Math.round(s * 0.65)} height={Math.round(s * 0.65)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="21" x2="21" y2="21" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <polyline points="5 6 12 3 19 6" />
          <line x1="4" y1="10" x2="4" y2="21" />
          <line x1="20" y1="10" x2="20" y2="21" />
        </svg>
      </span>
    );
  }

  // Soporte universal para dev (/) y Electron production (./)
  const logoSrc = getAssetUrl(`banks/${code}.png`);

  return (
    <span
      className={className}
      style={{
        width: `${s}px`,
        height: `${s}px`,
        minWidth: `${s}px`,
        minHeight: `${s}px`,
        borderRadius: '7px',
        background: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
        boxSizing: 'border-box',
        padding: '2px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        ...style
      }}
    >
      <img
        src={logoSrc}
        alt={`Banco ${code}`}
        onError={() => setImgError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block'
        }}
      />
    </span>
  );
};

/**
 * Busca un banco a partir de su código, nombre corto, id o texto compuesto (ej: "0134 - Banesco")
 */
export function findBank(query) {
  if (!query) return null;
  const q = String(query).trim().toLowerCase();

  // 1. Coincidencia exacta por código, id o nombre corto
  const exact = VZLA_BANKS.find(b => 
    b.code === q ||
    b.id.toLowerCase() === q ||
    b.shortName.toLowerCase() === q ||
    b.name.toLowerCase() === q
  );
  if (exact) return exact;

  // 2. Coincidencia si contiene el código o nombre
  return VZLA_BANKS.find(b => 
    q.includes(b.code) ||
    b.name.toLowerCase().includes(q) ||
    q.includes(b.shortName.toLowerCase())
  ) || null;
}
