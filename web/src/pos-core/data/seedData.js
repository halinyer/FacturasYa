import { db } from '../services/dataService';

// Catálogo base limpio para cuentas SaaS (el usuario registra su propio menú)
export const seedProducts = [];

// Cliente base por defecto SENIAT
export const seedClients = [
  {
    id: 'cli_default',
    name: 'Consumidor Final',
    cedula: 'V-00000000',
    phone: '',
    type: 'normal',
    address: 'Mostrador',
    createdAt: new Date().toISOString()
  }
];

export const seedInvoices = [];
export const seedPayments = [];
export const seedCashCloses = [];

export function initializeSeedData() {
  const currentSeedVersion = db.rawGet('pos_client_brand') || '';

  // Purga automática de catálogo legado de Happy Days para dejar el POS limpio por cuenta
  if (currentSeedVersion !== 'facturasya_saas_clean_v1') {
    const existingProducts = db.rawGet('pos_products') || [];
    // Conservar únicamente los productos propios creados por el usuario (descartar los de Happy Days hd_*)
    const customUserProducts = Array.isArray(existingProducts)
      ? existingProducts.filter(
          (p) =>
            p &&
            !String(p.id || '').startsWith('hd_') &&
            !String(p.id || '').startsWith('hd-') &&
            !String(p.image || '').includes('happydays')
        )
      : [];

    db.rawSet('pos_client_brand', 'facturasya_saas_clean_v1');
    db.rawSet('pos_products', customUserProducts);
    db.rawSet('pos_clients', seedClients);
    db.rawSet('pos_inventory', []);

    try {
      localStorage.setItem('pos_client_brand', JSON.stringify('facturasya_saas_clean_v1'));
      localStorage.setItem('pos_products', JSON.stringify(customUserProducts));
      localStorage.setItem('pos_inventory', JSON.stringify([]));
      // Limpiar mesas pre-cargadas con platos de Happy Days
      const savedTables = localStorage.getItem('facturasya_restaurant_tables');
      if (savedTables && savedTables.includes('Happy')) {
        localStorage.removeItem('facturasya_restaurant_tables');
      }
    } catch (e) {}
  }
}
