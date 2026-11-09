import facturapos from './facturapos.js';
import happydays from './happydays.js';
import heladoslacascada from './heladoslacascada.js';
import heladoscali from './heladoscali.js';

/**
 * Registro de franquicias, restaurantes y heladerías soportados.
 * Para agregar un nuevo establecimiento, simplemente crea un archivo en esta carpeta
 * y agrégalo a este objeto con su respectivo identificador.
 */
export const FRANCHISES = {
  facturapos,
  happydays,
  heladoslacascada,
  heladoscali
};

/**
 * Obtiene la configuración de la franquicia/restaurante activa.
 * En modo SaaS, sobrepone dinámicamente los datos fiscales verificados (RIF, Razón Social SENIAT, Domicilio, Serial Fiscal HKA80)
 * del inquilino autenticado en Supabase (`saas_active_tenant`).
 */
export function getActiveFranchise() {
  let baseFranchise = FRANCHISES.facturapos;
  const savedId = typeof window !== 'undefined' ? localStorage.getItem('pos_active_franchise') : null;
  if (savedId && FRANCHISES[savedId] && savedId !== 'facturapos') {
    baseFranchise = FRANCHISES[savedId];
  }

  // Si existe un tenant SaaS autenticado en localStorage, sobreponer datos fiscales oficiales
  if (typeof window !== 'undefined') {
    try {
      const saasRaw = localStorage.getItem('saas_active_tenant');
      if (saasRaw) {
        const tenant = JSON.parse(saasRaw);
        if (tenant && (tenant.name || tenant.rif || tenant.legal_name)) {
          const brandName = tenant.name || baseFranchise.name;
          const legalName = tenant.legal_name || tenant.legalName || brandName || baseFranchise.legalName;
          const rif = tenant.rif || baseFranchise.rif;
          const address = tenant.fiscal_address || tenant.fiscalAddress || tenant.address || baseFranchise.address;
          const phone = tenant.phone || baseFranchise.phone;
          const instagram = tenant.instagram || baseFranchise.instagram;
          const fiscalSerial = tenant.fiscal_serial || tenant.fiscalSerial || baseFranchise.fiscalMachine?.serial || '';

          const addressLines = address
            ? (address.match(/.{1,45}(\s|$)/g)?.map((s) => s.trim()).filter(Boolean) || [address])
            : baseFranchise.addressLines;

          return {
            ...baseFranchise,
            id: tenant.id || tenant.slug || baseFranchise.id,
            name: brandName,
            legalName: legalName,
            rif: rif,
            address: address,
            addressLines: addressLines,
            phone: phone,
            instagram: instagram,
            fiscalMachine: {
              ...baseFranchise.fiscalMachine,
              serial: fiscalSerial || baseFranchise.fiscalMachine?.serial || 'Z7C7011149'
            },
            branding: {
              ...baseFranchise.branding,
              logoText: tenant.branding?.logoText || brandName,
              colors: {
                ...baseFranchise.branding?.colors,
                primary: tenant.branding?.primaryColor || baseFranchise.branding?.colors?.primary,
                dark: tenant.branding?.darkColor || baseFranchise.branding?.colors?.dark
              }
            },
            receipt: {
              ...baseFranchise.receipt,
              headerTop: (brandName || '').toUpperCase(),
              headerTitle: (legalName || brandName || '').toUpperCase(),
              contactNotice: instagram ? `Síguenos en Instagram: ${instagram}` : (phone ? `Tel: ${phone}` : '')
            }
          };
        }
      }
    } catch (e) {
      console.warn('Error leyendo saas_active_tenant:', e);
    }
  }

  return baseFranchise;
}

/**
 * Aplica los tokens y colores de la franquicia seleccionada como variables CSS
 * directamente en :root del documento HTML.
 */
export function applyFranchiseTheme(franchise) {
  if (typeof document === 'undefined') return;
  const target = franchise || getActiveFranchise();
  const colors = target?.branding?.colors || {};
  const root = document.documentElement;

  if (colors.primary) root.style.setProperty('--brand-primary', colors.primary);
  if (colors.primaryHover) root.style.setProperty('--brand-primary-hover', colors.primaryHover);
  if (colors.dark) root.style.setProperty('--brand-dark', colors.dark);
  if (colors.warm) root.style.setProperty('--brand-warm', colors.warm);
  if (colors.peach) root.style.setProperty('--brand-peach', colors.peach);
  if (colors.green) root.style.setProperty('--brand-green', colors.green);
  if (colors.accentSoft) root.style.setProperty('--brand-accent-soft', colors.accentSoft);
  if (colors.borderSubtle) root.style.setProperty('--brand-border-subtle', colors.borderSubtle);
}

/**
 * Proxy dinámico sobre ACTIVE_FRANCHISE:
 * Asegura que cualquier acceso a CLIENT_CONFIG (ej. CLIENT_CONFIG.legalName, CLIENT_CONFIG.rif)
 * devuelva siempre los datos fiscales en tiempo real del tenant activo sin requerir reinicios de la aplicación.
 */
export const ACTIVE_FRANCHISE = new Proxy({}, {
  get(target, prop) {
    const current = getActiveFranchise();
    return current[prop];
  },
  has(target, prop) {
    const current = getActiveFranchise();
    return prop in current;
  },
  ownKeys() {
    const current = getActiveFranchise();
    return Reflect.ownKeys(current);
  },
  getOwnPropertyDescriptor(target, prop) {
    const current = getActiveFranchise();
    return Reflect.getOwnPropertyDescriptor(current, prop);
  }
});

// Aplicación inmediata del tema visual
if (typeof window !== 'undefined') {
  applyFranchiseTheme(getActiveFranchise());
}

export default ACTIVE_FRANCHISE;
