// Catálogo Oficial de Productos: Helados La Cascada (Venezuela)
// Precios base expresados en USD ($) con tasa BCV referencial (aprox. 876.80 Bs/$)

export const HELADOS_LA_CASCADA_PRODUCTS = [
  // ==========================================
  // 1. LÍNEA MAXIMUM (PALETAS PREMIUM CROCANTES)
  // ==========================================
  {
    id: 'prod-casc-max-001',
    sku: 'MAX-001',
    name: 'Maximum Clásico Maní',
    category: 'Línea Maximum',
    price: 1.80,
    priceBs: 1578.24,
    description: 'Paleta cremosa de vainilla con gruesa cobertura de chocolate y trocitos de maní tostado crocante',
    isCombo: false,
    stock: 120,
    minStock: 25,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-max-002',
    sku: 'MAX-002',
    name: 'Maximum Chocolate Blanco',
    category: 'Línea Maximum',
    price: 1.80,
    priceBs: 1578.24,
    description: 'Helado cremoso bañado en cobertura de chocolate blanco y crocante de almendras',
    isCombo: false,
    stock: 95,
    minStock: 20,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-max-003',
    sku: 'MAX-003',
    name: 'Maximum Almendras Tostadas',
    category: 'Línea Maximum',
    price: 2.00,
    priceBs: 1753.60,
    description: 'Paleta premium de chocolate oscuro con abundante baño de almendras caramelizadas',
    isCombo: false,
    stock: 80,
    minStock: 15,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },

  // ==========================================
  // 2. LÍNEA SUNDAY (VASOS ESPECIALES CON SIROPE)
  // ==========================================
  {
    id: 'prod-casc-sun-001',
    sku: 'SUN-001',
    name: 'Sunday Chocolate Belga',
    category: 'Línea Sunday',
    price: 1.50,
    priceBs: 1315.20,
    description: 'Helado cremoso de vainilla bañado con generoso sirope espeso de chocolate',
    isCombo: false,
    stock: 85,
    minStock: 20,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-sun-002',
    sku: 'SUN-002',
    name: 'Sunday Fresa Silvestre',
    category: 'Línea Sunday',
    price: 1.50,
    priceBs: 1315.20,
    description: 'Helado de mantecado suave con abundante sirope de fresa natural y trocitos',
    isCombo: false,
    stock: 75,
    minStock: 15,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-sun-003',
    sku: 'SUN-003',
    name: 'Sunday Arequipe Caramelizado',
    category: 'Línea Sunday',
    price: 1.60,
    priceBs: 1402.88,
    description: 'Vaso de helado de vainilla con vetas y tope de dulce de leche arequipe andino',
    isCombo: false,
    stock: 65,
    minStock: 15,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },

  // ==========================================
  // 3. BARQUILLAS Y CONOS (MAXICONO)
  // ==========================================
  {
    id: 'prod-casc-cono-001',
    sku: 'CON-001',
    name: 'Maxicono Vainilla & Chocolate',
    category: 'Barquillas y Conos',
    price: 1.50,
    priceBs: 1315.20,
    description: 'Cono de barquilla crocante relleno de helado combinado con punta de chocolate macizo',
    isCombo: false,
    stock: 130,
    minStock: 30,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-cono-002',
    sku: 'CON-002',
    name: 'Maxicono Doble Chocolate',
    category: 'Barquillas y Conos',
    price: 1.60,
    priceBs: 1402.88,
    description: 'Barquilla oscura con helado de chocolate suizo, sirope y trozos de galleta',
    isCombo: false,
    stock: 110,
    minStock: 25,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-cono-003',
    sku: 'CON-003',
    name: 'Maxicono Dulce de Leche',
    category: 'Barquillas y Conos',
    price: 1.50,
    priceBs: 1315.20,
    description: 'Barquilla crocante con helado de arequipe y corona de maní tostado',
    isCombo: false,
    stock: 90,
    minStock: 20,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },

  // ==========================================
  // 4. PASTEHELADO & ESPECIALIDADES
  // ==========================================
  {
    id: 'prod-casc-pas-001',
    sku: 'PAS-001',
    name: 'Pastehelado Torta Suiza',
    category: 'Pastehelado y Tortas',
    price: 1.80,
    priceBs: 1578.24,
    description: 'Capa de bizcocho suave con helado cremoso de chocolate y cobertura de crema',
    isCombo: false,
    stock: 60,
    minStock: 15,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-pas-002',
    sku: 'PAS-002',
    name: 'Pastehelado Galleta Crema',
    category: 'Pastehelado y Tortas',
    price: 1.80,
    priceBs: 1578.24,
    description: 'Sandwich artesanal de helado estilo torta con galleta de chocolate y helado de nata',
    isCombo: false,
    stock: 55,
    minStock: 15,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },

  // ==========================================
  // 5. LÍNEA INFANTIL (BATI-BATI & MICKY MOUSE)
  // ==========================================
  {
    id: 'prod-casc-inf-001',
    sku: 'INF-001',
    name: 'Bati-Bati con Chicle',
    category: 'Línea Infantil',
    price: 0.90,
    priceBs: 789.12,
    description: 'El clásico helado morado sabor uva con bola de chicle dulce en el fondo',
    isCombo: false,
    stock: 140,
    minStock: 30,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-inf-002',
    sku: 'INF-002',
    name: 'Micky Mouse Paleta',
    category: 'Línea Infantil',
    price: 0.90,
    priceBs: 789.12,
    description: 'Divertida paleta con figura animada, sabor mantecado y orejitas de chocolate',
    isCombo: false,
    stock: 100,
    minStock: 20,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },

  // ==========================================
  // 6. LÍNEA CÍTRICA Y FRUTAL (CITRIX & FRUKYS)
  // ==========================================
  {
    id: 'prod-casc-cit-001',
    sku: 'CIT-001',
    name: 'Citrix Limón Refrescante',
    category: 'Paletas y Frutas',
    price: 0.80,
    priceBs: 701.44,
    description: 'Paleta ultra refrescante de limón natural de los Andes',
    isCombo: false,
    stock: 110,
    minStock: 25,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-cit-002',
    sku: 'CIT-002',
    name: 'Citrix Naranja Tropical',
    category: 'Paletas y Frutas',
    price: 0.80,
    priceBs: 701.44,
    description: 'Paleta cítrica de jugo de naranja natural',
    isCombo: false,
    stock: 95,
    minStock: 20,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-cit-003',
    sku: 'CIT-003',
    name: 'Citrix Parchita Andina',
    category: 'Paletas y Frutas',
    price: 0.80,
    priceBs: 701.44,
    description: 'Paleta de parchita natural agridulce y refrescante',
    isCombo: false,
    stock: 90,
    minStock: 20,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-fru-001',
    sku: 'FRU-001',
    name: 'Frukys Fresa Natural',
    category: 'Paletas y Frutas',
    price: 0.90,
    priceBs: 789.12,
    description: 'Paleta 100% de pulpa de fresa fresca cultivada en los Andes tachirenses',
    isCombo: false,
    stock: 120,
    minStock: 25,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-fru-002',
    sku: 'FRU-002',
    name: 'Frukys Mora Silvestre',
    category: 'Paletas y Frutas',
    price: 0.90,
    priceBs: 789.12,
    description: 'Paleta de mora de montaña, rica en sabor natural y frescura',
    isCombo: false,
    stock: 90,
    minStock: 20,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-fru-003',
    sku: 'FRU-003',
    name: 'Frukys Mango Maduro',
    category: 'Paletas y Frutas',
    price: 0.80,
    priceBs: 701.44,
    description: 'Paleta con auténtica pulpa de mango criollo venezolano',
    isCombo: false,
    stock: 100,
    minStock: 20,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-fru-004',
    sku: 'FRU-004',
    name: 'Frukys Coco Cremoso',
    category: 'Paletas y Frutas',
    price: 1.00,
    priceBs: 876.80,
    description: 'Paleta de coco rallado fresco con leche condensada',
    isCombo: false,
    stock: 130,
    minStock: 25,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },

  // ==========================================
  // 7. LÍNEA TRADICIONAL Y TINITAS
  // ==========================================
  {
    id: 'prod-casc-tra-001',
    sku: 'TRA-001',
    name: 'Tradicional Mantecado',
    category: 'Línea Tradicional',
    price: 0.90,
    priceBs: 789.12,
    description: 'El clásico helado de paleta de mantecado andino cremoso',
    isCombo: false,
    stock: 150,
    minStock: 30,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-tra-002',
    sku: 'TRA-002',
    name: 'Tradicional Choco-Leche',
    category: 'Línea Tradicional',
    price: 0.90,
    priceBs: 789.12,
    description: 'Paleta de chocolate con leche pura de vaca pasteurizada',
    isCombo: false,
    stock: 140,
    minStock: 30,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-tra-003',
    sku: 'TRA-003',
    name: 'Tradicional Ron con Pasas',
    category: 'Línea Tradicional',
    price: 1.00,
    priceBs: 876.80,
    description: 'Helado cremoso de licor fino con pasas maceradas al punto',
    isCombo: false,
    stock: 80,
    minStock: 15,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-tin-001',
    sku: 'TIN-001',
    name: 'Tinita Mantecado',
    category: 'Tinitas y Vasitos',
    price: 1.00,
    priceBs: 876.80,
    description: 'Vasito individual de mantecado con cucharilla incluida',
    isCombo: false,
    stock: 110,
    minStock: 25,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-tin-002',
    sku: 'TIN-002',
    name: 'Tinita Tres Sabores (Napolitano)',
    category: 'Tinitas y Vasitos',
    price: 1.20,
    priceBs: 1052.16,
    description: 'Vaso con porción combinada de Fresa, Mantecado y Chocolate',
    isCombo: false,
    stock: 100,
    minStock: 20,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },

  // ==========================================
  // 8. LÍNEA FAMILIAR Y POTES PARA LLEVAR
  // ==========================================
  {
    id: 'prod-casc-pot-001',
    sku: 'POT-001',
    name: 'Pote Familiar 1 Litro Napolitano',
    category: 'Línea Familiar',
    price: 4.50,
    priceBs: 3945.60,
    description: 'Presentación de 1000ml con la clásica combinación de 3 sabores',
    isCombo: false,
    stock: 45,
    minStock: 10,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-pot-002',
    sku: 'POT-002',
    name: 'Pote Familiar 2 Litros Especial',
    category: 'Línea Familiar',
    price: 8.00,
    priceBs: 7014.40,
    description: 'Pote grande de 2000ml para compartir en familia y reuniones',
    isCombo: false,
    stock: 30,
    minStock: 8,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-pot-003',
    sku: 'POT-003',
    name: 'Balde Comercial 4.5 Litros',
    category: 'Línea Familiar',
    price: 16.00,
    priceBs: 14028.80,
    description: 'Balde industrial para heladerías, eventos y venta por porciones',
    isCombo: false,
    stock: 18,
    minStock: 5,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },

  // ==========================================
  // 9. CONGELADOS CASCADA
  // ==========================================
  {
    id: 'prod-casc-con-001',
    sku: 'CG-001',
    name: 'Hielo en Cubitos Cristalino 3kg',
    category: 'Congelados Cascada',
    price: 2.00,
    priceBs: 1753.60,
    description: 'Bolsa de hielo purificado y filtrado para bebidas y refrescos',
    isCombo: false,
    stock: 50,
    minStock: 10,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  },
  {
    id: 'prod-casc-con-002',
    sku: 'CG-002',
    name: 'Pulpa Concentrada de Fresa 1kg',
    category: 'Congelados Cascada',
    price: 3.50,
    priceBs: 3068.80,
    description: 'Pulpa pasteurizada 100% natural para preparación de batidos y postres',
    isCombo: false,
    stock: 25,
    minStock: 5,
    unit: 'UND',
    taxRate: 0.16,
    available: true
  }
];

export const HELADOS_LA_CASCADA_CLIENTS = [
  {
    id: 'cli-casc-001',
    name: 'Distribuidora Los Andes C.A.',
    rif: 'J-30987654-1',
    phone: '0424-7123456',
    email: 'ventas@distribuidoralosandes.com',
    address: 'Av. Rotaria, Sector Las Delicias, San Cristóbal, Táchira',
    type: 'Mayorista',
    creditLimit: 500.00,
    currentBalance: 0.00
  },
  {
    id: 'cli-casc-002',
    name: 'Heladería y Dulcería El Santo Cristo',
    rif: 'J-40123987-2',
    phone: '0414-7234567',
    email: 'elsantocristo.lagrita@gmail.com',
    address: 'Plaza Bolívar frente a la Basílica, La Grita, Edo. Táchira',
    type: 'Punto de Venta Aliado',
    creditLimit: 250.00,
    currentBalance: 0.00
  },
  {
    id: 'cli-casc-003',
    name: 'Franquicia La Cascada Mérida Centro',
    rif: 'J-50198234-5',
    phone: '0416-6789012',
    email: 'cascada.merida@gmail.com',
    address: 'C.C. Las Tapias, Nivel 1, Mérida, Estado Mérida',
    type: 'Franquicia Autorizada',
    creditLimit: 800.00,
    currentBalance: 0.00
  }
];

export default {
  products: HELADOS_LA_CASCADA_PRODUCTS,
  clients: HELADOS_LA_CASCADA_CLIENTS
};
