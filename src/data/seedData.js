// Catálogo inicial oficial para la franquicia Helados La Cascada (con 4 Modalidades de Venta)
import { HELADOS_LA_CASCADA_PRODUCTS, HELADOS_LA_CASCADA_CLIENTS } from './heladosLaCascadaData';
import { db } from '../services/dataService';

export const seedProducts = HELADOS_LA_CASCADA_PRODUCTS;
export const seedClients = HELADOS_LA_CASCADA_CLIENTS;

export function initializeSeedData() {
  const currentSeedVersion = db.rawGet('pos_client_brand') || '';
  const existingProducts = db.rawGet('pos_products') || [];

  const hasMissingModalidades = existingProducts.some(p => 
    p.priceMayor === undefined || 
    p.priceCongelador === undefined || 
    p.priceMicrodistribuidor === undefined
  );

  if (currentSeedVersion !== 'helados_la_cascada_v3_modalidades' || hasMissingModalidades || existingProducts.length === 0) {
    db.rawSet('pos_client_brand', 'helados_la_cascada_v3_modalidades');
    db.rawSet('pos_products', HELADOS_LA_CASCADA_PRODUCTS);
    db.rawSet('pos_clients', HELADOS_LA_CASCADA_CLIENTS);
    db.rawSet('pos_invoices', []);
    db.rawSet('pos_payments', []);
    db.rawSet('pos_cash_closes', []);
    db.rawSet('pos_open_tabs', []);
    try {
      localStorage.setItem('pos_client_brand', 'helados_la_cascada_v3_modalidades');
      localStorage.setItem('pos_products', JSON.stringify(HELADOS_LA_CASCADA_PRODUCTS));
      localStorage.setItem('pos_clients', JSON.stringify(HELADOS_LA_CASCADA_CLIENTS));
      localStorage.setItem('pos_invoices', JSON.stringify([]));
      localStorage.setItem('pos_payments', JSON.stringify([]));
      localStorage.setItem('pos_cash_closes', JSON.stringify([]));
      localStorage.setItem('pos_open_tabs', JSON.stringify([]));
    } catch (e) {}
    console.log('[Helados La Cascada] Catálogo con 4 modalidades de venta (Detal, Mayor, Congelador, Microdistribuidor) inicializado.');
  }
}

export default seedProducts;
