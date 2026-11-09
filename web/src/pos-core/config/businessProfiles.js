/**
 * Configuración de Perfiles de Negocio Modulares (Estilo Notion).
 * Permite adaptar la app dinámicamente entre Heladería, Restaurante y Comercio.
 */

export const BUSINESS_PROFILES = {
  restaurant: {
    id: 'restaurant',
    name: 'Restaurante, Bar & Cafetería',
    shortName: 'Restaurante',
    icon: '🍽️',
    badge: 'Mesas + Comandas',
    description: 'Gestión con salón y mesas físicas, comandas térmicas a cocina/barra y pre-cuenta para comensales.',
    features: {
      hasTables: true,
      hasKitchenTickets: true,
      hasMultiPricing: false,
      hasBarcode: false,
      fastCounterCheckout: false
    }
  },
  ice_cream: {
    id: 'ice_cream',
    name: 'Heladería & Venta al Mayor',
    shortName: 'Heladería',
    icon: '🍦',
    badge: 'Venta Rápida + Escalas de Precios',
    description: 'Caja rápida de mostrador con 4 modalidades de precio: Detal, Al Mayor (6+), Congelador y Microdistribuidor.',
    features: {
      hasTables: false,
      hasKitchenTickets: false,
      hasMultiPricing: true,
      pricingTiers: ['detal', 'mayor', 'congelador', 'microdistribuidor'],
      hasBarcode: false,
      fastCounterCheckout: true
    }
  },
  retail: {
    id: 'retail',
    name: 'Bodegón, Retail & Comercio',
    shortName: 'Bodegón / Retail',
    icon: '🏪',
    badge: 'Mostrador + Códigos de Barra',
    description: 'Cobro ágil con lector de códigos de barras, control de inventario por bulto/unidad y precios al mayor.',
    features: {
      hasTables: false,
      hasKitchenTickets: false,
      hasMultiPricing: true,
      pricingTiers: ['detal', 'mayor'],
      hasBarcode: true,
      fastCounterCheckout: true
    }
  },
  custom: {
    id: 'custom',
    name: 'Personalizado / Modular',
    shortName: 'Personalizado',
    icon: '⚙️',
    badge: 'Modular',
    description: 'Configura manualmente qué módulos activar o desactivar según el flujo de tu establecimiento.',
    features: {
      hasTables: false,
      hasKitchenTickets: false,
      hasMultiPricing: false,
      hasBarcode: false,
      fastCounterCheckout: true
    }
  }
};

export const BUSINESS_PROFILES_LIST = Object.values(BUSINESS_PROFILES);

const STORAGE_KEY = 'pos_business_profile';
const FEATURES_STORAGE_KEY = 'pos_business_features';

/**
 * Obtiene el perfil activo del negocio (del almacenamiento local o tenant de Supabase).
 */
export function getActiveBusinessProfile(tenant = null) {
  // 1. Si el tenant tiene configurado business_type en Supabase o en settings
  const tenantType = tenant?.business_type || tenant?.settings?.businessType || tenant?.branding?.businessType;
  if (tenantType && BUSINESS_PROFILES[tenantType]) {
    const base = BUSINESS_PROFILES[tenantType];
    const customFeatures = tenant?.features || tenant?.settings?.features;
    return {
      ...base,
      features: customFeatures ? { ...base.features, ...customFeatures } : base.features
    };
  }

  // 2. Si existe configuración persistente en el dispositivo local
  if (typeof window !== 'undefined') {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId && BUSINESS_PROFILES[savedId]) {
        const base = BUSINESS_PROFILES[savedId];
        const rawCustom = localStorage.getItem(FEATURES_STORAGE_KEY);
        const customFeatures = rawCustom ? JSON.parse(rawCustom) : null;
        return {
          ...base,
          features: customFeatures ? { ...base.features, ...customFeatures } : base.features
        };
      }
    } catch (e) {}
  }

  // 3. Por defecto Restaurante (retrocompatibilidad)
  return BUSINESS_PROFILES.restaurant;
}

/**
 * Guarda el perfil activo tanto localmente como en el objeto tenant.
 */
export function setActiveBusinessProfile(profileId, customFeatures = null) {
  if (typeof window === 'undefined') return;
  const target = BUSINESS_PROFILES[profileId] || BUSINESS_PROFILES.restaurant;
  try {
    localStorage.setItem(STORAGE_KEY, target.id);
    if (customFeatures) {
      localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(customFeatures));
    } else {
      localStorage.removeItem(FEATURES_STORAGE_KEY);
    }

    // Despachar evento para que los componentes React se actualicen inmediatamente sin recargar
    window.dispatchEvent(new CustomEvent('facturasya_profile_changed', {
      detail: { profile: target, features: customFeatures || target.features }
    }));
  } catch (e) {}
  return target;
}
