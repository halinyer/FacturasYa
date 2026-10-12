// Catálogo oficial de productos para Happy Days
export const seedProducts = [
  // --- COMBOS PRINCIPALES (Con arte oficial de Happy Days) ---
  { 
    id: 'hd_prod_1', 
    name: '2 Burger Mini!', 
    category: 'Combos', 
    priceUSD: 5.99, 
    sku: 'CMB-001', 
    active: true, 
    image: '/happydays/combo_2_burger_mini.jpg',
    description: '2 Mini Burgers + 1 Refresco Bombita'
  },
  { 
    id: 'hd_prod_2', 
    name: '4 Burger Pana!', 
    category: 'Combos', 
    priceUSD: 14.99, 
    sku: 'CMB-002', 
    active: true, 
    image: '/happydays/combo_4_burger_pana.jpg',
    description: '4 Mini Burgers + 2 Papas Fritas'
  },
  { 
    id: 'hd_prod_3', 
    name: 'Happy Panita!', 
    category: 'Combos', 
    priceUSD: 21.99, 
    sku: 'CMB-003', 
    active: true, 
    image: '/happydays/combo_happy_panita.jpg',
    description: '4 Piezas de Pollo Frito + 2 Pollo Cheese + 2 Papas Fritas + 1 Refresco 1Lt'
  },
  { 
    id: 'hd_prod_4', 
    name: 'Full Burger Happy!', 
    category: 'Combos', 
    priceUSD: 24.99, 
    sku: 'CMB-004', 
    active: true, 
    image: '/happydays/combo_full_burger_happy.jpg',
    description: '4 Burger Gourmet (Carne o Pollo) + 1/2 Kg Papas Fritas + Tequeños + 1 Refresco 1Lt'
  },
  { 
    id: 'hd_prod_5', 
    name: 'Full Pollo Happy!', 
    category: 'Combos', 
    priceUSD: 24.99, 
    sku: 'CMB-005', 
    active: true, 
    image: '/happydays/combo_full_pollo_happy.jpg',
    description: '8 Piezas de Pollo + Tequeños + 2 Ensaladas + 4 Papas Fritas + 1 Refresco 1Lt'
  },
  { 
    id: 'hd_prod_6', 
    name: 'Club House Happy!', 
    category: 'Combos', 
    priceUSD: 34.99, 
    sku: 'CMB-006', 
    active: true, 
    image: '/happydays/combo_club_house_happy.jpg',
    description: '4 Hamburguesas + 1 MEGA Club House + Ración de Tequeños + 1 Refresco 1.5Lt'
  },
  { 
    id: 'hd_prod_7', 
    name: 'Happy Familiar!', 
    category: 'Combos', 
    priceUSD: 49.99, 
    sku: 'CMB-007', 
    active: true, 
    image: '/happydays/combo_happy_familiar.jpg',
    description: '6 Hamburguesas + 6 Piezas de Pollo + Papas Fritas + Tequeños + 1 Ensalada César + 1 Refresco 2Lt'
  },
  { 
    id: 'hd_prod_8', 
    name: 'Parrilla Happy!', 
    category: 'Combos', 
    priceUSD: 49.99, 
    sku: 'CMB-008', 
    active: true, 
    image: '/happydays/combo_parrilla_happy.jpg',
    description: '4 Hamburguesas + 1 Parrilla Mixta + 1 Refresco 2Lt'
  },

  // --- HAMBURGUESAS & ESPECIALIDADES ---
  { 
    id: 'hd_prod_9', 
    name: 'Mini Burger Individual', 
    category: 'Hamburguesas', 
    priceUSD: 2.50, 
    sku: 'HAM-001', 
    active: true,
    description: 'Carne o Pollo Crispy con vegetales y queso'
  },
  { 
    id: 'hd_prod_10', 
    name: 'Burger Gourmet Carne', 
    category: 'Hamburguesas', 
    priceUSD: 4.50, 
    sku: 'HAM-002', 
    active: true,
    description: 'Carne artesanal, queso cheddar y salsa especial'
  },
  { 
    id: 'hd_prod_11', 
    name: 'Burger Pollo Cheese', 
    category: 'Hamburguesas', 
    priceUSD: 4.50, 
    sku: 'HAM-003', 
    active: true,
    description: 'Pollo crispy, tocineta, queso fundido y vegetales'
  },
  { 
    id: 'hd_prod_12', 
    name: 'MEGA Club House', 
    category: 'Especialidades', 
    priceUSD: 9.00, 
    sku: 'ESP-001', 
    active: true,
    description: 'Mega sándwich 4 pisos con papas y queso gratinado'
  },
  { 
    id: 'hd_prod_13', 
    name: 'Parrilla Mixta', 
    category: 'Especialidades', 
    priceUSD: 14.00, 
    sku: 'ESP-002', 
    active: true,
    description: 'Carne, pollo, chorizo, aguacate y acompañante'
  },

  // --- POLLO FRITO ---
  { 
    id: 'hd_prod_14', 
    name: 'Pieza de Pollo Crispy', 
    category: 'Pollo Frito', 
    priceUSD: 2.00, 
    sku: 'POL-001', 
    active: true 
  },
  { 
    id: 'hd_prod_15', 
    name: 'Cesta 4 Piezas Pollo', 
    category: 'Pollo Frito', 
    priceUSD: 7.50, 
    sku: 'POL-002', 
    active: true 
  },

  // --- ACOMPAÑANTES ---
  { 
    id: 'hd_prod_16', 
    name: 'Papas Fritas Regular', 
    category: 'Acompañantes', 
    priceUSD: 2.50, 
    sku: 'ACO-001', 
    active: true 
  },
  { 
    id: 'hd_prod_17', 
    name: '1/2 Kg Papas Fritas', 
    category: 'Acompañantes', 
    priceUSD: 4.50, 
    sku: 'ACO-002', 
    active: true 
  },
  { 
    id: 'hd_prod_18', 
    name: 'Ración de Tequeños (5 uds)', 
    category: 'Acompañantes', 
    priceUSD: 3.50, 
    sku: 'ACO-003', 
    active: true 
  },
  { 
    id: 'hd_prod_19', 
    name: 'Ensalada César', 
    category: 'Acompañantes', 
    priceUSD: 3.50, 
    sku: 'ACO-004', 
    active: true 
  },

  // --- BEBIDAS ---
  { 
    id: 'hd_prod_20', 
    name: 'Refresco Bombita', 
    category: 'Bebidas', 
    priceUSD: 1.00, 
    sku: 'BEB-001', 
    active: true 
  },
  { 
    id: 'hd_prod_21', 
    name: 'Refresco 1 Litro', 
    category: 'Bebidas', 
    priceUSD: 1.80, 
    sku: 'BEB-002', 
    active: true 
  },
  { 
    id: 'hd_prod_22', 
    name: 'Refresco 1.5 Litros', 
    category: 'Bebidas', 
    priceUSD: 2.20, 
    sku: 'BEB-003', 
    active: true 
  },
  { 
    id: 'hd_prod_23', 
    name: 'Refresco 2 Litros', 
    category: 'Bebidas', 
    priceUSD: 2.80, 
    sku: 'BEB-004', 
    active: true 
  },
  { 
    id: 'hd_prod_24', 
    name: 'Agua Mineral', 
    category: 'Bebidas', 
    priceUSD: 1.00, 
    sku: 'BEB-005', 
    active: true 
  }
];

// Clientes limpios: solo cliente base de mostrador
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

// Facturas limpias: Dashboard en 0
export const seedInvoices = [];

// Pagos limpios: en 0
export const seedPayments = [];

// Cierres de caja limpios: en 0
export const seedCashCloses = [];

import { db } from '../services/dataService';

export function initializeSeedData() {
  const currentSeedVersion = db.rawGet('pos_client_brand') || '';
  const existingProducts = db.rawGet('pos_products') || [];

  // Detectar si la base de datos aún tiene datos viejos o de la heladería
  const hasOldData = existingProducts.some(p => p.sku === 'BAR-001' || p.id === 'prod_1' || p.category === 'Barquillas');

  if (currentSeedVersion !== 'happydays_v1' || hasOldData || existingProducts.length === 0) {
    db.rawSet('pos_client_brand', 'happydays_v1');
    db.rawSet('pos_products', seedProducts);
    db.rawSet('pos_clients', seedClients);
    db.rawSet('pos_invoices', seedInvoices);
    db.rawSet('pos_payments', seedPayments);
    db.rawSet('pos_cash_closes', seedCashCloses);
    console.log('[HappyDays] Inicialización limpia de catálogo y base de datos de Happy Days.');
  }
}
