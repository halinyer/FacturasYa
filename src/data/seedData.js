// Catálogo inicial oficial para la franquicia Helados Cali
import { heladosCaliProducts, heladosCaliClients } from './heladosCaliData';
import { db } from '../services/dataService';

export const seedProducts = heladosCaliProducts;
export const seedClients = heladosCaliClients;

export function initializeSeedData() {
  const currentSeedVersion = db.rawGet('pos_client_brand') || '';
  const existingProducts = db.rawGet('pos_products') || [];

  // En la rama cliente/helados-cali, inicializamos con el catálogo oficial de Helados Cali
  // y limpiamos cualquier plato viejo de hamburguesas
  const hasBurgerData = existingProducts.some(p => 
    p.category === 'Hamburguesas' || 
    p.category === 'Combos' || 
    (p.id && String(p.id).startsWith('hd_'))
  );

  if (currentSeedVersion !== 'helados_cali_oficial_v1' || hasBurgerData || existingProducts.length === 0) {
    db.rawSet('pos_client_brand', 'helados_cali_oficial_v1');
    db.rawSet('pos_products', heladosCaliProducts);
    db.rawSet('pos_clients', heladosCaliClients);
    db.rawSet('pos_invoices', []);
    db.rawSet('pos_payments', []);
    db.rawSet('pos_cash_closes', []);
    db.rawSet('pos_open_tabs', []);
    try {
      localStorage.setItem('pos_client_brand', 'helados_cali_oficial_v1');
      localStorage.setItem('pos_products', JSON.stringify(heladosCaliProducts));
      localStorage.setItem('pos_clients', JSON.stringify(heladosCaliClients));
      localStorage.setItem('pos_invoices', JSON.stringify([]));
      localStorage.setItem('pos_payments', JSON.stringify([]));
      localStorage.setItem('pos_cash_closes', JSON.stringify([]));
      localStorage.setItem('pos_open_tabs', JSON.stringify([]));
    } catch (e) {}
    console.log('[Helados Cali] Catálogo oficial de heladerías inicializado con éxito.');
  }
}

export default seedProducts;
