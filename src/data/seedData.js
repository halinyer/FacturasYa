export const seedProducts = [
  { id: 'prod_1', name: 'Barquilla Simple', category: 'Barquillas', priceUSD: 1.5, sku: 'BAR-001', active: true, image: 'https://images.unsplash.com/photo-1557142046-c704a3adf8f6?auto=format&fit=crop&w=400' },
  { id: 'prod_2', name: 'Barquilla Doble', category: 'Barquillas', priceUSD: 2.5, sku: 'BAR-002', active: true, image: 'https://images.unsplash.com/photo-1563805042-7684c8a9e9ce?auto=format&fit=crop&w=400' },
  { id: 'prod_3', name: 'Barquilla Premium', category: 'Barquillas', priceUSD: 3.5, sku: 'BAR-003', active: true, image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=400' },
  { id: 'prod_4', name: 'Helado 1 Litro', category: 'Litros', priceUSD: 6.0, sku: 'LIT-001', active: true, image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=400' },
  { id: 'prod_5', name: 'Helado 2 Litros', category: 'Litros', priceUSD: 11.0, sku: 'LIT-002', active: true, image: 'https://images.unsplash.com/photo-1553177595-4de2bb0842b9?auto=format&fit=crop&w=400' },
  { id: 'prod_6', name: 'Helado 4.5 Litros (Tinetta)', category: 'Litros', priceUSD: 20.0, sku: 'LIT-003', active: true, image: 'https://images.unsplash.com/photo-1570197781417-0a82375c9371?auto=format&fit=crop&w=400' },
  { id: 'prod_7', name: 'Sundae Sencillo', category: 'Sundaes', priceUSD: 2.0, sku: 'SUN-001', active: true, image: 'https://images.unsplash.com/photo-1560008581-09826d1de69e?auto=format&fit=crop&w=400' },
  { id: 'prod_8', name: 'Sundae Especial', category: 'Sundaes', priceUSD: 3.5, sku: 'SUN-002', active: true, image: 'https://images.unsplash.com/photo-1563805042-7684c8a9e9ce?auto=format&fit=crop&w=400' },
  { id: 'prod_9', name: 'Banana Split', category: 'Sundaes', priceUSD: 5.0, sku: 'SUN-003', active: true, image: 'https://images.unsplash.com/photo-1529124479902-1596706e232e?auto=format&fit=crop&w=400' },
  { id: 'prod_10', name: 'Sirope Extra', category: 'Toppings/Extras', priceUSD: 0.5, sku: 'TOP-001', active: true },
  { id: 'prod_11', name: 'Lluvia de Chocolate', category: 'Toppings/Extras', priceUSD: 0.5, sku: 'TOP-002', active: true },
  { id: 'prod_12', name: 'Galleta Adicional', category: 'Toppings/Extras', priceUSD: 0.8, sku: 'TOP-003', active: true }
];

export const seedClients = [
  { id: 'cli_1', name: 'Juan Perez', cedula: 'V-12345678', phone: '04141234567', type: 'normal', address: 'Calle 1, Local 2', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'cli_2', name: 'Maria Rodriguez', cedula: 'V-87654321', phone: '04129876543', type: 'normal', address: 'Av Principal, Edif 3', createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'cli_3', name: 'Carlos Gomez', cedula: 'V-11223344', phone: '04165554433', type: 'normal', address: 'Urbanizacion Sucre', createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'cli_4', name: 'Ana Silva', cedula: 'V-22334455', phone: '04241112233', type: 'normal', address: 'Centro Comercial Centro', createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'cli_5', name: 'Heladeria El Sol', cedula: 'V-10203040', phone: '04149998877', type: 'congelador', address: 'Plaza Mayor', createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'cli_6', name: 'Kiosko La Plaza', cedula: 'V-99887766', phone: '04123334455', type: 'congelador', address: 'Av Bolivar Sur', createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'cli_7', name: 'Bodega San Jose', cedula: 'V-55443322', phone: '04167778899', type: 'congelador', address: 'Barrio San Jose', createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'cli_8', name: 'Supermercado Central', cedula: 'V-11992288', phone: '04245556677', type: 'congelador', address: 'Av Central con Calle 4', createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString() }
];

export const seedInvoices = [
  {
    id: 'inv_1', invoiceNumber: 'FAC-0001', clientId: 'cli_1', date: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ productId: 'prod_1', productName: 'Barquilla Simple', quantity: 2, unitPrice: 1.5, subtotal: 3.0 }],
    totalUSD: 3.0, exchangeRate: 36.5, totalBs: 109.5, paymentMethod: 'pago_movil', status: 'paid', clientType: 'normal'
  },
  {
    id: 'inv_2', invoiceNumber: 'FAC-0002', clientId: 'cli_5', date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ productId: 'prod_6', productName: 'Helado 4.5 Litros (Tinetta)', quantity: 10, unitPrice: 20.0, subtotal: 200.0 }],
    totalUSD: 200.0, exchangeRate: 36.5, totalBs: 7300.0, paymentMethod: 'zelle', status: 'paid', clientType: 'congelador'
  },
  {
    id: 'inv_3', invoiceNumber: 'FAC-0003', clientId: 'cli_2', date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { productId: 'prod_2', productName: 'Barquilla Doble', quantity: 1, unitPrice: 2.5, subtotal: 2.5 },
      { productId: 'prod_10', productName: 'Sirope Extra', quantity: 1, unitPrice: 0.5, subtotal: 0.5 }
    ],
    totalUSD: 3.0, exchangeRate: 36.6, totalBs: 109.8, paymentMethod: 'efectivo_usd', status: 'paid', clientType: 'normal'
  },
  {
    id: 'inv_4', invoiceNumber: 'FAC-0004', clientId: 'cli_6', date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { productId: 'prod_4', productName: 'Helado 1 Litro', quantity: 12, unitPrice: 6.0, subtotal: 72.0 },
      { productId: 'prod_5', productName: 'Helado 2 Litros', quantity: 6, unitPrice: 11.0, subtotal: 66.0 }
    ],
    totalUSD: 138.0, exchangeRate: 36.6, totalBs: 5050.8, paymentMethod: 'efectivo_usd', status: 'partial', clientType: 'congelador'
  },
  {
    id: 'inv_5', invoiceNumber: 'FAC-0005', clientId: 'cli_3', date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ productId: 'prod_9', productName: 'Banana Split', quantity: 2, unitPrice: 5.0, subtotal: 10.0 }],
    totalUSD: 10.0, exchangeRate: 36.7, totalBs: 367.0, paymentMethod: 'efectivo_bs', status: 'paid', clientType: 'normal'
  },
  {
    id: 'inv_6', invoiceNumber: 'FAC-0006', clientId: 'cli_7', date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ productId: 'prod_6', productName: 'Helado 4.5 Litros (Tinetta)', quantity: 5, unitPrice: 20.0, subtotal: 100.0 }],
    totalUSD: 100.0, exchangeRate: 36.7, totalBs: 3670.0, paymentMethod: 'zelle', status: 'pending', clientType: 'congelador'
  },
  {
    id: 'inv_7', invoiceNumber: 'FAC-0007', clientId: 'cli_8', date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { productId: 'prod_4', productName: 'Helado 1 Litro', quantity: 20, unitPrice: 6.0, subtotal: 120.0 },
      { productId: 'prod_6', productName: 'Helado 4.5 Litros (Tinetta)', quantity: 10, unitPrice: 20.0, subtotal: 200.0 }
    ],
    totalUSD: 320.0, exchangeRate: 36.8, totalBs: 11776.0, paymentMethod: 'zelle', status: 'partial', clientType: 'congelador'
  },
  {
    id: 'inv_8', invoiceNumber: 'FAC-0008', clientId: 'cli_4', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ productId: 'prod_7', productName: 'Sundae Sencillo', quantity: 3, unitPrice: 2.0, subtotal: 6.0 }],
    totalUSD: 6.0, exchangeRate: 36.8, totalBs: 220.8, paymentMethod: 'pago_movil', status: 'paid', clientType: 'normal'
  },
  {
    id: 'inv_9', invoiceNumber: 'FAC-0009', clientId: 'cli_5', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ productId: 'prod_6', productName: 'Helado 4.5 Litros (Tinetta)', quantity: 8, unitPrice: 20.0, subtotal: 160.0 }],
    totalUSD: 160.0, exchangeRate: 36.8, totalBs: 5888.0, paymentMethod: 'efectivo_usd', status: 'paid', clientType: 'congelador'
  },
  {
    id: 'inv_10', invoiceNumber: 'FAC-0010', clientId: 'cli_1', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { productId: 'prod_3', productName: 'Barquilla Premium', quantity: 1, unitPrice: 3.5, subtotal: 3.5 },
      { productId: 'prod_11', productName: 'Lluvia de Chocolate', quantity: 1, unitPrice: 0.5, subtotal: 0.5 }
    ],
    totalUSD: 4.0, exchangeRate: 36.9, totalBs: 147.6, paymentMethod: 'pago_movil', status: 'paid', clientType: 'normal'
  },
  {
    id: 'inv_11', invoiceNumber: 'FAC-0011', clientId: 'cli_2', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ productId: 'prod_8', productName: 'Sundae Especial', quantity: 2, unitPrice: 3.5, subtotal: 7.0 }],
    totalUSD: 7.0, exchangeRate: 36.9, totalBs: 258.3, paymentMethod: 'efectivo_usd', status: 'paid', clientType: 'normal'
  },
  {
    id: 'inv_12', invoiceNumber: 'FAC-0012', clientId: 'cli_6', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ productId: 'prod_5', productName: 'Helado 2 Litros', quantity: 10, unitPrice: 11.0, subtotal: 110.0 }],
    totalUSD: 110.0, exchangeRate: 36.9, totalBs: 4059.0, paymentMethod: 'efectivo_usd', status: 'pending', clientType: 'congelador'
  },
  {
    id: 'inv_13', invoiceNumber: 'FAC-0013', clientId: 'cli_3', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    items: [{ productId: 'prod_4', productName: 'Helado 1 Litro', quantity: 1, unitPrice: 6.0, subtotal: 6.0 }],
    totalUSD: 6.0, exchangeRate: 36.9, totalBs: 221.4, paymentMethod: 'pago_movil', status: 'paid', clientType: 'normal'
  },
  {
    id: 'inv_14', invoiceNumber: 'FAC-0014', clientId: 'cli_7', date: new Date().toISOString(),
    items: [{ productId: 'prod_6', productName: 'Helado 4.5 Litros (Tinetta)', quantity: 2, unitPrice: 20.0, subtotal: 40.0 }],
    totalUSD: 40.0, exchangeRate: 37.0, totalBs: 1480.0, paymentMethod: 'efectivo_bs', status: 'paid', clientType: 'congelador'
  },
  {
    id: 'inv_15', invoiceNumber: 'FAC-0015', clientId: 'cli_4', date: new Date().toISOString(),
    items: [{ productId: 'prod_1', productName: 'Barquilla Simple', quantity: 4, unitPrice: 1.5, subtotal: 6.0 }],
    totalUSD: 6.0, exchangeRate: 37.0, totalBs: 222.0, paymentMethod: 'zelle', status: 'paid', clientType: 'normal'
  }
];

export const seedPayments = [
  { id: 'pay_1', invoiceId: 'inv_4', clientId: 'cli_6', amount: 50.0, currency: 'USD', date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), reference: 'Efectivo en tienda' },
  { id: 'pay_2', invoiceId: 'inv_4', clientId: 'cli_6', amount: 40.0, currency: 'USD', date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), reference: 'Efectivo en tienda' },
  { id: 'pay_3', invoiceId: 'inv_7', clientId: 'cli_8', amount: 100.0, currency: 'USD', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), reference: 'Zelle transfer' },
  { id: 'pay_4', invoiceId: 'inv_7', clientId: 'cli_8', amount: 100.0, currency: 'USD', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), reference: 'Zelle transfer 2' },
  { id: 'pay_5', invoiceId: 'inv_6', clientId: 'cli_7', amount: 20.0, currency: 'USD', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), reference: 'Abono efectivo' }
];

export const seedCashCloses = [
  { 
    id: 'cc_1', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), totalSales: 107.0, totalCollected: 107.0, totalPending: 0.0, 
    breakdown: { efectivo_usd: 107.0, efectivo_bs: 0, pago_movil: 0, zelle: 0 } 
  },
  { 
    id: 'cc_2', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), totalSales: 110.0, totalCollected: 0.0, totalPending: 110.0, 
    breakdown: { efectivo_usd: 0, efectivo_bs: 0, pago_movil: 0, zelle: 0 } 
  },
  { 
    id: 'cc_3', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), totalSales: 6.0, totalCollected: 6.0, totalPending: 0.0, 
    breakdown: { efectivo_usd: 0, efectivo_bs: 0, pago_movil: 6.0, zelle: 0 } 
  }
];

import { db } from '../services/dataService';

export function initializeSeedData() {
  const existingProducts = db.rawGet('pos_products') || [];
  if (existingProducts.length === 0) {
    db.rawSet('pos_products', seedProducts);
    db.rawSet('pos_clients', seedClients);
    db.rawSet('pos_invoices', seedInvoices);
    db.rawSet('pos_payments', seedPayments);
    db.rawSet('pos_cash_closes', seedCashCloses);
    console.log('Seed data initialized successfully into memory/fs store.');
  } else {
    // Migration: Add images to existing seed products if they don't have one
    let updated = false;
    const migratedProducts = existingProducts.map(p => {
      if (!p.image) {
        const seedMatch = seedProducts.find(sp => sp.id === p.id);
        if (seedMatch && seedMatch.image) {
          updated = true;
          return { ...p, image: seedMatch.image };
        }
      }
      return p;
    });
    if (updated) {
      db.rawSet('pos_products', migratedProducts);
      console.log('Migrated existing products to include seed images in memory/fs store.');
    } else {
      console.log('Data already exists, skipping seed.');
    }
  }
}
