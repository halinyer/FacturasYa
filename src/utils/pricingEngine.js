/**
 * Arquitectura de Modalidades de Precios para Helados La Cascada (Venezuela).
 * 
 * En Helados La Cascada, el precio de todo el catálogo cambia según la MODALIDAD seleccionada:
 * 1. DETAL: Precio al público para consumo directo (1 a 5 unidades).
 * 2. AL MAYOR: Precio a partir de 6 unidades para compras al por mayor.
 * 3. CONGELADOR: Precio preferencial para comercios y aliados que tienen congelador de la marca.
 * 4. MICRODISTRIBUIDOR: Precio para revendedores ambulantes, carritos y microdistribuidores.
 */

export const MODALIDADES = {
  detal: {
    id: 'detal',
    name: 'Detal',
    shortLabel: 'Detal',
    badge: 'DETAL',
    icon: '🛍️',
    description: 'Consumo al detal (1 a 5 helados)',
    color: '#2563eb',
    bgActive: '#2563eb',
    bgLight: '#eff6ff',
    border: '#bfdbfe',
    textColor: '#1e40af'
  },
  mayor: {
    id: 'mayor',
    name: 'Al Mayor',
    shortLabel: 'Al Mayor (6+)',
    badge: 'MAYOR 6+',
    icon: '📦',
    description: 'Ventas al mayor a partir de 6 unidades',
    color: '#059669',
    bgActive: '#059669',
    bgLight: '#ecfdf5',
    border: '#a7f3d0',
    textColor: '#065f46'
  },
  congelador: {
    id: 'congelador',
    name: 'Cliente Congelador',
    shortLabel: 'Congelador',
    badge: 'CONGELADOR',
    icon: '❄️',
    description: 'Clientes con cava o congelador de la marca',
    color: '#d97706',
    bgActive: '#d97706',
    bgLight: '#fef3c7',
    border: '#fde68a',
    textColor: '#92400e'
  },
  microdistribuidor: {
    id: 'microdistribuidor',
    name: 'Microdistribuidor',
    shortLabel: 'Microdistribuidor',
    badge: 'MICRODIST.',
    icon: '🛵',
    description: 'Revendedores, carritos y bodegas aliadas',
    color: '#7c3aed',
    bgActive: '#7c3aed',
    bgLight: '#f5f3ff',
    border: '#ddd6fe',
    textColor: '#5b21b6'
  }
};

export const MODALIDADES_LIST = Object.values(MODALIDADES);

/**
 * Retorna el precio unitario exacto de un producto según la modalidad activa.
 */
export function getProductPriceByModalidad(product, modalidad = 'detal') {
  if (!product) return 0;
  
  const baseDetal = Number(product.priceDetal || product.priceUSD || product.price || 0);

  switch (modalidad) {
    case 'mayor': {
      if (product.priceMayor !== undefined && product.priceMayor !== null && product.priceMayor !== '') {
        return Number(product.priceMayor);
      }
      if (product.price_mayor !== undefined) return Number(product.price_mayor);
      // Fallback proporcional razonable si no se cargó explícitamente (~20% descuento)
      return Number((baseDetal * 0.80).toFixed(2));
    }
    case 'congelador': {
      if (product.priceCongelador !== undefined && product.priceCongelador !== null && product.priceCongelador !== '') {
        return Number(product.priceCongelador);
      }
      if (product.price_congelador !== undefined) return Number(product.price_congelador);
      // Fallback proporcional (~28% descuento)
      return Number((baseDetal * 0.72).toFixed(2));
    }
    case 'microdistribuidor': {
      if (product.priceMicrodistribuidor !== undefined && product.priceMicrodistribuidor !== null && product.priceMicrodistribuidor !== '') {
        return Number(product.priceMicrodistribuidor);
      }
      if (product.price_micro !== undefined) return Number(product.price_micro);
      // Fallback proporcional (~35% descuento)
      return Number((baseDetal * 0.65).toFixed(2));
    }
    case 'detal':
    default:
      return baseDetal;
  }
}

/**
 * Obtiene la modalidad recomendada a partir del tipo de cliente registrado.
 */
export function getModalidadForClient(client) {
  if (!client) return 'detal';
  const type = (client.type || '').toLowerCase();
  if (type === 'congelador') return 'congelador';
  if (type === 'microdistribuidor' || type === 'micro') return 'microdistribuidor';
  if (type === 'mayor' || type === 'mayorista') return 'mayor';
  return 'detal';
}

export default {
  MODALIDADES,
  MODALIDADES_LIST,
  getProductPriceByModalidad,
  getModalidadForClient
};
