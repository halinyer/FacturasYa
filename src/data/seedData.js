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
    image: './happydays/combo_2_burger_mini.jpg',
    description: '2 Mini Burgers + 1 Refresco Bombita'
  },
  { 
    id: 'hd_prod_2', 
    name: '4 Burger Pana!', 
    category: 'Combos', 
    priceUSD: 14.99, 
    sku: 'CMB-002', 
    active: true, 
    image: './happydays/combo_4_burger_pana.jpg',
    description: '4 Mini Burgers + 2 Papas Fritas'
  },
  { 
    id: 'hd_prod_3', 
    name: 'Happy Panita!', 
    category: 'Combos', 
    priceUSD: 21.99, 
    sku: 'CMB-003', 
    active: true, 
    image: './happydays/combo_happy_panita.jpg',
    description: '4 Piezas de Pollo Frito + 2 Pollo Cheese + 2 Papas Fritas + 1 Refresco 1Lt'
  },
  { 
    id: 'hd_prod_4', 
    name: 'Full Burger Happy!', 
    category: 'Combos', 
    priceUSD: 24.99, 
    sku: 'CMB-004', 
    active: true, 
    image: './happydays/combo_full_burger_happy.jpg',
    description: '4 Burger Gourmet (Carne o Pollo) + 1/2 Kg Papas Fritas + Tequeños + 1 Refresco 1Lt'
  },
  { 
    id: 'hd_prod_5', 
    name: 'Full Pollo Happy!', 
    category: 'Combos', 
    priceUSD: 24.99, 
    sku: 'CMB-005', 
    active: true, 
    image: './happydays/combo_full_pollo_happy.jpg',
    description: '8 Piezas de Pollo + Tequeños + 2 Ensaladas + 4 Papas Fritas + 1 Refresco 1Lt'
  },
  { 
    id: 'hd_prod_6', 
    name: 'Club House Happy!', 
    category: 'Combos', 
    priceUSD: 34.99, 
    sku: 'CMB-006', 
    active: true, 
    image: './happydays/combo_club_house_happy.jpg',
    description: '4 Hamburguesas + 1 MEGA Club House + Ración de Tequeños + 1 Refresco 1.5Lt'
  },
  { 
    id: 'hd_prod_7', 
    name: 'Happy Familiar!', 
    category: 'Combos', 
    priceUSD: 49.99, 
    sku: 'CMB-007', 
    active: true, 
    image: './happydays/combo_happy_familiar.jpg',
    description: '6 Hamburguesas + 6 Piezas de Pollo + Papas Fritas + Tequeños + 1 Ensalada César + 1 Refresco 2Lt'
  },
  { 
    id: 'hd_prod_8', 
    name: 'Parrilla Happy!', 
    category: 'Combos', 
    priceUSD: 49.99, 
    sku: 'CMB-008', 
    active: true, 
    image: './happydays/combo_parrilla_happy.jpg',
    description: '4 Hamburguesas + 1 Parrilla Mixta + 1 Refresco 2Lt'
  },



  // --- REFRESCOS Y BEBIDAS (Catálogo Oficial con Imágenes Reales) ---
  // Coca-Cola
  { 
    id: 'hd_prod_coca_lata', 
    name: 'Coca-Cola Original (Lata 355ml)', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 1.50, 
    sku: 'REF-CC-001', 
    active: true,
    image: './happydays/drinks/coca_cola_lata_355ml.jpg',
    description: 'Refresco Coca-Cola Sabor Original en lata 355ml fría'
  },
  { 
    id: 'hd_prod_coca_500', 
    name: 'Coca-Cola Botella 500ml', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 1.80, 
    sku: 'REF-CC-002', 
    active: true,
    image: './happydays/drinks/coca_cola_botella_500ml.jpg',
    description: 'Coca-Cola presentación personal 500ml PET'
  },
  { 
    id: 'hd_prod_coca_15l', 
    name: 'Coca-Cola Botella 1.5 Litros', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 2.50, 
    sku: 'REF-CC-003', 
    active: true,
    image: './happydays/drinks/coca_cola_botella_1.5l.jpg',
    description: 'Coca-Cola tamaño mediano 1.5 Litros'
  },
  { 
    id: 'hd_prod_coca_2l', 
    name: 'Coca-Cola Botella 2 Litros', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 3.00, 
    sku: 'REF-CC-004', 
    active: true,
    image: './happydays/drinks/coca_cola_botella_2l.jpg',
    description: 'Coca-Cola tamaño familiar 2 Litros'
  },
  { 
    id: 'hd_prod_coca_zero', 
    name: 'Coca-Cola Sin Azúcar (Lata 355ml)', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 1.50, 
    sku: 'REF-CC-005', 
    active: true,
    image: './happydays/drinks/coca_cola_zero_lata.jpg',
    description: 'Coca-Cola Zero Sugar sin calorías en lata 355ml'
  },

  // 7Up
  { 
    id: 'hd_prod_7up_lata', 
    name: '7Up (Lata 355ml)', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 1.50, 
    sku: 'REF-7UP-001', 
    active: true,
    image: './happydays/drinks/7up_lata_355ml.jpg',
    description: 'Refresco 7Up lima-limón en lata 355ml'
  },
  { 
    id: 'hd_prod_7up_15l', 
    name: '7Up Botella 1.5 Litros', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 2.50, 
    sku: 'REF-7UP-002', 
    active: true,
    image: './happydays/drinks/7up_botella_1.5l.jpg',
    description: '7Up lima-limón en botella 1.5 Litros'
  },
  { 
    id: 'hd_prod_7up_2l', 
    name: '7Up Botella 2 Litros', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 3.00, 
    sku: 'REF-7UP-003', 
    active: true,
    image: './happydays/drinks/7up_botella_2l.jpg',
    description: '7Up lima-limón tamaño familiar 2 Litros'
  },

  // Pepsi
  { 
    id: 'hd_prod_pepsi_lata', 
    name: 'Pepsi Cola (Lata 355ml)', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 1.50, 
    sku: 'REF-PEP-001', 
    active: true,
    image: './happydays/drinks/pepsi_lata_355ml.jpg',
    description: 'Refresco Pepsi Cola en lata 355ml fría'
  },
  { 
    id: 'hd_prod_pepsi_15l', 
    name: 'Pepsi Botella 1.5 Litros', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 2.50, 
    sku: 'REF-PEP-002', 
    active: true,
    image: './happydays/drinks/pepsi_botella_1.5l.jpg',
    description: 'Pepsi Cola en botella 1.5 Litros'
  },
  { 
    id: 'hd_prod_pepsi_2l', 
    name: 'Pepsi Botella 2 Litros', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 3.00, 
    sku: 'REF-PEP-003', 
    active: true,
    image: './happydays/drinks/pepsi_botella_2l.jpg',
    description: 'Pepsi Cola tamaño familiar 2 Litros'
  },

  // Frescolita
  { 
    id: 'hd_prod_frescolita_lata', 
    name: 'Frescolita (Lata 355ml)', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 1.50, 
    sku: 'REF-FRS-001', 
    active: true,
    image: './happydays/drinks/frescolita_lata_355ml.jpg',
    description: 'Tradicional refresco Frescolita en lata 355ml'
  },
  { 
    id: 'hd_prod_frescolita_15l', 
    name: 'Frescolita Botella 1.5 Litros', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 2.50, 
    sku: 'REF-FRS-002', 
    active: true,
    image: './happydays/drinks/frescolita_botella_1.5l.jpg',
    description: 'Frescolita tamaño 1.5 Litros'
  },
  { 
    id: 'hd_prod_frescolita_2l', 
    name: 'Frescolita Botella 2 Litros', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 3.00, 
    sku: 'REF-FRS-003', 
    active: true,
    image: './happydays/drinks/frescolita_botella_2l.jpg',
    description: 'Frescolita tamaño familiar 2 Litros'
  },

  // Chinotto
  { 
    id: 'hd_prod_chinotto_lata', 
    name: 'Chinotto (Lata 355ml)', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 1.50, 
    sku: 'REF-CHN-001', 
    active: true,
    image: './happydays/drinks/chinotto_lata_355ml.jpg',
    description: 'Refresco Chinotto lima-limón en lata 355ml'
  },
  { 
    id: 'hd_prod_chinotto_15l', 
    name: 'Chinotto Botella 1.5 Litros', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 2.50, 
    sku: 'REF-CHN-002', 
    active: true,
    image: './happydays/drinks/chinotto_botella_1.5l.jpg',
    description: 'Chinotto lima-limón botella 1.5 Litros'
  },

  // Hit
  { 
    id: 'hd_prod_hit_naranja_lata', 
    name: 'Hit Naranja (Lata 355ml)', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 1.50, 
    sku: 'REF-HIT-001', 
    active: true,
    image: './happydays/drinks/hit_naranja_lata.jpg',
    description: 'Refresco Hit sabor Naranja en lata 355ml'
  },
  { 
    id: 'hd_prod_hit_naranja_15l', 
    name: 'Hit Naranja Botella 1.5 Litros', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 2.50, 
    sku: 'REF-HIT-002', 
    active: true,
    image: './happydays/drinks/hit_naranja_botella_1.5l.jpg',
    description: 'Refresco Hit sabor Naranja botella 1.5 Litros'
  },
  { 
    id: 'hd_prod_hit_uva_lata', 
    name: 'Hit Uva (Lata 355ml)', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 1.50, 
    sku: 'REF-HIT-003', 
    active: true,
    image: './happydays/drinks/hit_uva_lata.jpg',
    description: 'Refresco Hit sabor Uva en lata 355ml'
  },

  // Maltín Polar
  { 
    id: 'hd_prod_maltin_lata', 
    name: 'Maltín Polar (Lata 355ml)', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 1.50, 
    sku: 'REF-MAL-001', 
    active: true,
    image: './happydays/drinks/maltin_polar_lata.jpg',
    description: 'Maltín Polar tradicional en lata 355ml'
  },
  { 
    id: 'hd_prod_maltin_botella', 
    name: 'Maltín Polar (Botella)', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 1.50, 
    sku: 'REF-MAL-002', 
    active: true,
    image: './happydays/drinks/maltin_polar_botella.jpg',
    description: 'Maltín Polar en botella retornable/vidrio'
  },

  // Agua Mineral
  { 
    id: 'hd_prod_agua_600', 
    name: 'Agua Mineral 600ml', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 1.00, 
    sku: 'REF-AGU-001', 
    active: true,
    image: './happydays/drinks/agua_mineral_botella.jpg',
    description: 'Agua mineral natural sin gas 600ml'
  },
  { 
    id: 'hd_prod_agua_15l', 
    name: 'Agua Mineral 1.5 Litros', 
    category: 'Refrescos y Bebidas', 
    priceUSD: 1.80, 
    sku: 'REF-AGU-002', 
    active: true,
    image: './happydays/drinks/agua_mineral_botella.jpg',
    description: 'Agua mineral natural sin gas botella 1.5 Litros'
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
  const hasProductsWithoutImages = existingProducts.some(p => !p.image || !p.image.trim());

  if (currentSeedVersion !== 'happydays_v3_clean_only_photos' || hasOldData || hasProductsWithoutImages || existingProducts.length === 0) {
    db.rawSet('pos_client_brand', 'happydays_v3_clean_only_photos');
    db.rawSet('pos_products', seedProducts);
    if (!existingProducts || existingProducts.length === 0) {
      db.rawSet('pos_clients', seedClients);
      db.rawSet('pos_invoices', seedInvoices);
      db.rawSet('pos_payments', seedPayments);
      db.rawSet('pos_cash_closes', seedCashCloses);
    }
    console.log('[HappyDays] Catálogo depurado: solo productos con fotos de alta resolución oficiales.');
  } else {
    // Migración automática de URLs de imágenes para resolver el problema de rutas absolutas en file://
    let modified = false;
    existingProducts.forEach(p => {
      if (p.image && typeof p.image === 'string' && p.image.startsWith('/')) {
        p.image = `.${p.image}`;
        modified = true;
      }
    });
    if (modified) {
      db.rawSet('pos_products', existingProducts);
    }
  }
}
