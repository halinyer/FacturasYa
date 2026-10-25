// Catálogo inicial oficial para la franquicia Helados La Cascada
import { HELADOS_LA_CASCADA_PRODUCTS, HELADOS_LA_CASCADA_CLIENTS } from './heladosLaCascadaData';
import { db } from '../services/dataService';

export const seedProducts = HELADOS_LA_CASCADA_PRODUCTS;
export const seedClients = HELADOS_LA_CASCADA_CLIENTS;

export function initializeSeedData() {
  const currentSeedVersion = db.rawGet('pos_client_brand') || '';
  const existingProducts = db.rawGet('pos_products') || [];

  // En la rama cliente/helados-la-cascada, inicializamos con el catálogo oficial de Helados La Cascada
  // y limpiamos cualquier plato viejo
  const hasOldData = existingProducts.some(p => 
    p.category === 'Hamburguesas' || 
    p.category === 'Combos' || 
    (p.id && (String(p.id).startsWith('hd_') || String(p.id).startsWith('cali_') || String(p.id).startsWith('prod-cali-'))) ||
    !p.image
  );

  if (currentSeedVersion !== 'helados_la_cascada_oficial_v2' || hasOldData || existingProducts.length === 0) {
    db.rawSet('pos_client_brand', 'helados_la_cascada_oficial_v2');
    db.rawSet('pos_products', HELADOS_LA_CASCADA_PRODUCTS);
    db.rawSet('pos_clients', HELADOS_LA_CASCADA_CLIENTS);
    db.rawSet('pos_invoices', []);
    db.rawSet('pos_payments', []);
    db.rawSet('pos_cash_closes', []);
    db.rawSet('pos_open_tabs', []);
    try {
      localStorage.setItem('pos_client_brand', 'helados_la_cascada_oficial_v2');
      localStorage.setItem('pos_products', JSON.stringify(HELADOS_LA_CASCADA_PRODUCTS));
      localStorage.setItem('pos_clients', JSON.stringify(HELADOS_LA_CASCADA_CLIENTS));
      localStorage.setItem('pos_invoices', JSON.stringify([]));
      localStorage.setItem('pos_payments', JSON.stringify([]));
      localStorage.setItem('pos_cash_closes', JSON.stringify([]));
      localStorage.setItem('pos_open_tabs', JSON.stringify([]));
    } catch (e) {}
    console.log('[Helados La Cascada] Catálogo con fotos oficiales inicializado con éxito.');
  }
}

export default seedProducts;
