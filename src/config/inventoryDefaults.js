// Configuración e insumos iniciales para el inventario pragmático de Happy Days

export const DEFAULT_HAPPY_DAYS_INVENTORY = [
  // --- PANADERÍA (Conteo Diario en 2 Minutos) ---
  {
    id: 'inv_pan_burger',
    name: 'Pan de Hamburguesa',
    category: 'Panadería',
    unit: 'und',
    currentStock: 60,
    minStock: 20,
    costUSD: 0.35,
    active: true
  },
  {
    id: 'inv_pan_perro',
    name: 'Pan de Perro Caliente',
    category: 'Panadería',
    unit: 'und',
    currentStock: 40,
    minStock: 15,
    costUSD: 0.25,
    active: true
  },
  {
    id: 'inv_pan_pepito',
    name: 'Pan de Pepito',
    category: 'Panadería',
    unit: 'und',
    currentStock: 25,
    minStock: 10,
    costUSD: 0.60,
    active: true
  },
  {
    id: 'inv_pan_clubhouse',
    name: 'Pan de Sándwich / Club House',
    category: 'Panadería',
    unit: 'rebanadas',
    currentStock: 80,
    minStock: 30,
    costUSD: 0.10,
    active: true
  },
  {
    id: 'inv_pan_pita',
    name: 'Pan Pita / Shawarma',
    category: 'Panadería',
    unit: 'und',
    currentStock: 30,
    minStock: 10,
    costUSD: 0.40,
    active: true
  },

  // --- PROTEÍNAS Y CARNES (Mayor costo del negocio) ---
  {
    id: 'inv_carne_burger',
    name: 'Carne de Hamburguesa (Patty 120g)',
    category: 'Proteínas',
    unit: 'und',
    currentStock: 70,
    minStock: 25,
    costUSD: 0.85,
    active: true
  },
  {
    id: 'inv_pollo_crispy',
    name: 'Milanesa / Pollo Crispy',
    category: 'Proteínas',
    unit: 'und',
    currentStock: 35,
    minStock: 15,
    costUSD: 0.90,
    active: true
  },
  {
    id: 'inv_salchicha_perro',
    name: 'Salchicha para Perro Caliente',
    category: 'Proteínas',
    unit: 'und',
    currentStock: 50,
    minStock: 20,
    costUSD: 0.30,
    active: true
  },
  {
    id: 'inv_tenders_pollo',
    name: 'Tenders de Pollo',
    category: 'Proteínas',
    unit: 'piezas',
    currentStock: 80,
    minStock: 30,
    costUSD: 0.45,
    active: true
  },
  {
    id: 'inv_masa_cachapa',
    name: 'Porción de Masa de Cachapa',
    category: 'Proteínas',
    unit: 'porciones',
    currentStock: 20,
    minStock: 8,
    costUSD: 0.70,
    active: true
  },

  // --- BEBIDAS (Control 1 a 1 directo anti-fuga) ---
  {
    id: 'inv_refresco_lata',
    name: 'Refresco en Lata 355ml (Surtido)',
    category: 'Bebidas',
    unit: 'latas',
    currentStock: 48,
    minStock: 24,
    costUSD: 0.75,
    active: true
  },
  {
    id: 'inv_refresco_15l',
    name: 'Refresco 1.5L / 2L',
    category: 'Bebidas',
    unit: 'botellas',
    currentStock: 20,
    minStock: 10,
    costUSD: 1.50,
    active: true
  },
  {
    id: 'inv_agua_mineral',
    name: 'Agua Mineral 500ml',
    category: 'Bebidas',
    unit: 'botellas',
    currentStock: 36,
    minStock: 15,
    costUSD: 0.40,
    active: true
  },
  {
    id: 'inv_malta',
    name: 'Malta Polar 355ml',
    category: 'Bebidas',
    unit: 'und',
    currentStock: 30,
    minStock: 12,
    costUSD: 0.80,
    active: true
  },

  // --- EMPAQUES Y DESPACHO (Monitoreo de cajas y vasos) ---
  {
    id: 'inv_caja_burger',
    name: 'Caja de Hamburguesa / Combo',
    category: 'Empaques',
    unit: 'und',
    currentStock: 100,
    minStock: 40,
    costUSD: 0.15,
    active: true
  },
  {
    id: 'inv_bandeja_perro',
    name: 'Bandeja de Perro Caliente',
    category: 'Empaques',
    unit: 'und',
    currentStock: 80,
    minStock: 30,
    costUSD: 0.08,
    active: true
  },
  {
    id: 'inv_vaso_shake',
    name: 'Vaso de Shake 16oz con Tapa',
    category: 'Empaques',
    unit: 'und',
    currentStock: 60,
    minStock: 20,
    costUSD: 0.20,
    active: true
  }
];

/**
 * Resuelve qué insumos descuenta un producto de Happy Days automáticamente.
 * Si el producto tiene una receta explícita definida en `product.recipe`, la usa.
 * Si no, usa la regla categórica inteligente de Happy Days.
 */
export function getProductRecipe(product) {
  if (!product) return [];

  // Si tiene receta personalizada guardada en el producto
  if (Array.isArray(product.recipe) && product.recipe.length > 0) {
    return product.recipe;
  }

  const name = (product.name || product.nombre || '').toUpperCase();
  const cat = (product.category || '').toUpperCase();

  // 1. BEBIDAS (Descuento 1 a 1 directo)
  if (cat.includes('REFRESCO') || cat.includes('BEBIDA')) {
    if (name.includes('1.5') || name.includes('2L') || name.includes('LITRO')) {
      return [{ inventoryId: 'inv_refresco_15l', qty: 1 }];
    }
    if (name.includes('AGUA')) {
      return [{ inventoryId: 'inv_agua_mineral', qty: 1 }];
    }
    if (name.includes('MALTA')) {
      return [{ inventoryId: 'inv_malta', qty: 1 }];
    }
    return [{ inventoryId: 'inv_refresco_lata', qty: 1 }];
  }

  // 2. HAMBURGUESAS
  if (cat.includes('HAMBURGUESA')) {
    const isCrispy = name.includes('CRISPY') || name.includes('POLLO');
    const isTriple = name.includes('TRIPLE') || name.includes('MONSTER');
    const isDoble = name.includes('DOBLE') || name.includes('MEGA') || isTriple;
    const meatQty = isTriple ? 3 : (isDoble ? 2 : 1);

    const recipe = [
      { inventoryId: 'inv_pan_burger', qty: 1 },
      { inventoryId: 'inv_caja_burger', qty: 1 }
    ];

    if (isCrispy) {
      recipe.push({ inventoryId: 'inv_pollo_crispy', qty: isDoble ? 2 : 1 });
    } else {
      recipe.push({ inventoryId: 'inv_carne_burger', qty: meatQty });
    }
    return recipe;
  }

  // 3. POLLO CRISPY
  if (cat.includes('POLLO CRISPY') || cat.includes('CRISPY')) {
    if (name.includes('BURGER')) {
      return [
        { inventoryId: 'inv_pan_burger', qty: 1 },
        { inventoryId: 'inv_pollo_crispy', qty: 1 },
        { inventoryId: 'inv_caja_burger', qty: 1 }
      ];
    }
    return [
      { inventoryId: 'inv_pollo_crispy', qty: 2 },
      { inventoryId: 'inv_caja_burger', qty: 1 }
    ];
  }

  // 4. PERROS CALIENTES
  if (cat.includes('PERRO')) {
    return [
      { inventoryId: 'inv_pan_perro', qty: 1 },
      { inventoryId: 'inv_salchicha_perro', qty: 1 },
      { inventoryId: 'inv_bandeja_perro', qty: 1 }
    ];
  }

  // 5. PEPITOS
  if (cat.includes('PEPITO')) {
    return [
      { inventoryId: 'inv_pan_pepito', qty: 1 },
      { inventoryId: 'inv_caja_burger', qty: 1 }
    ];
  }

  // 6. CLUB HOUSE
  if (cat.includes('CLUB HOUSE') || name.includes('CLUB HOUSE')) {
    return [
      { inventoryId: 'inv_pan_clubhouse', qty: 4 },
      { inventoryId: 'inv_caja_burger', qty: 1 }
    ];
  }

  // 7. SHAWARMAS
  if (cat.includes('SHAWARMA')) {
    return [
      { inventoryId: 'inv_pan_pita', qty: 1 }
    ];
  }

  // 8. CACHAPAS
  if (cat.includes('CACHAPA')) {
    return [
      { inventoryId: 'inv_masa_cachapa', qty: 1 }
    ];
  }

  // 9. COMBOS
  if (cat.includes('COMBO')) {
    if (name.includes('4 BURGER') || name.includes('FAMILIAR')) {
      return [
        { inventoryId: 'inv_pan_burger', qty: 4 },
        { inventoryId: 'inv_carne_burger', qty: 4 },
        { inventoryId: 'inv_caja_burger', qty: 4 },
        { inventoryId: 'inv_refresco_15l', qty: 1 }
      ];
    }
    if (name.includes('2 BURGER')) {
      return [
        { inventoryId: 'inv_pan_burger', qty: 2 },
        { inventoryId: 'inv_carne_burger', qty: 2 },
        { inventoryId: 'inv_caja_burger', qty: 2 },
        { inventoryId: 'inv_refresco_lata', qty: 2 }
      ];
    }
    // Combo estándar de 1 burger con papas y refresco
    return [
      { inventoryId: 'inv_pan_burger', qty: 1 },
      { inventoryId: 'inv_carne_burger', qty: 1 },
      { inventoryId: 'inv_caja_burger', qty: 1 },
      { inventoryId: 'inv_refresco_lata', qty: 1 }
    ];
  }

  // 10. POSTRES / SHAKES
  if (name.includes('SHAKE') || name.includes('MERENGADA') || name.includes('BATIDO')) {
    return [
      { inventoryId: 'inv_vaso_shake', qty: 1 }
    ];
  }

  return [];
}
