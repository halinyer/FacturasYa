import { db } from '../services/dataService';
import { happyDaysProducts } from './happyDaysData';
import { DEFAULT_HAPPY_DAYS_INVENTORY } from '../config/inventoryDefaults';

// Catálogo completo de Happy Days (108 productos con precios oficiales)
export const seedProducts = happyDaysProducts || [];

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
  const existingProducts = db.rawGet('pos_products') || [];
  const existingInventory = db.rawGet('pos_inventory') || [];
  const existingClients = db.rawGet('pos_clients') || [];

  // 1. GARANTIZAR CATÁLOGO DE PRODUCTOS:
  // Si no hay productos o se perdieron en una versión previa, restaurar de inmediato los 108 productos de Happy Days
  if (!Array.isArray(existingProducts) || existingProducts.length === 0) {
    console.log('[SeedData] Restaurando catálogo completo de 108 productos de Happy Days con precios en USD...');
    db.rawSet('pos_products', happyDaysProducts);
    try {
      localStorage.setItem('pos_products', JSON.stringify(happyDaysProducts));
    } catch (e) {}
  } else {
    // Si ya hay productos, verificar si faltan los de Happy Days o tienen imágenes con ruta absoluta
    let modified = false;
    existingProducts.forEach((p) => {
      if (p.image && typeof p.image === 'string' && p.image.startsWith('/') && !p.image.startsWith('./')) {
        p.image = `.${p.image}`;
        modified = true;
      }
    });

    // Si tiene muy pocos productos (menos de 10) y no son de Happy Days, o si se borraron los platos de Happy Days:
    const hasHappyDaysPlates = existingProducts.some(p => String(p.id || '').startsWith('hd_'));
    if (!hasHappyDaysPlates && existingProducts.length < 5) {
      console.log('[SeedData] Incorporando catálogo oficial de Happy Days...');
      const merged = [...happyDaysProducts, ...existingProducts];
      db.rawSet('pos_products', merged);
      try {
        localStorage.setItem('pos_products', JSON.stringify(merged));
      } catch (e) {}
    } else if (modified) {
      db.rawSet('pos_products', existingProducts);
    }
  }

  // 2. GARANTIZAR CLIENTES
  if (!Array.isArray(existingClients) || existingClients.length === 0) {
    db.rawSet('pos_clients', seedClients);
    try {
      localStorage.setItem('pos_clients', JSON.stringify(seedClients));
    } catch (e) {}
  }

  // 3. GARANTIZAR INVENTARIO OPERATIVO
  if (!Array.isArray(existingInventory) || existingInventory.length === 0) {
    db.rawSet('pos_inventory', DEFAULT_HAPPY_DAYS_INVENTORY);
    try {
      localStorage.setItem('pos_inventory', JSON.stringify(DEFAULT_HAPPY_DAYS_INVENTORY));
    } catch (e) {}
  }
}
