// In-memory cache for synchronous operations
let memoryStore = null;

export const initDB = async () => {
  if (memoryStore) return; // already initialized
  
  if (window.electronAPI) {
    try {
      const fileData = await window.electronAPI.loadDb();
      if (!fileData || Object.keys(fileData).length === 0) {
        // First run on Electron! Let's migrate existing localStorage data to file
        memoryStore = {
          pos_products: localStorage.getItem('pos_products') ? JSON.parse(localStorage.getItem('pos_products')) : [],
          pos_clients: localStorage.getItem('pos_clients') ? JSON.parse(localStorage.getItem('pos_clients')) : [],
          pos_invoices: localStorage.getItem('pos_invoices') ? JSON.parse(localStorage.getItem('pos_invoices')) : [],
          pos_payments: localStorage.getItem('pos_payments') ? JSON.parse(localStorage.getItem('pos_payments')) : [],
          pos_cash_closes: localStorage.getItem('pos_cash_closes') ? JSON.parse(localStorage.getItem('pos_cash_closes')) : []
        };
        await window.electronAPI.saveDb(memoryStore);
      } else {
        memoryStore = fileData;
      }
    } catch (e) {
      console.error("Failed to load from Electron fs, falling back to localStorage", e);
      memoryStore = {};
    }
  } else {
    // Web environment fallback
    memoryStore = {
      pos_products: localStorage.getItem('pos_products') ? JSON.parse(localStorage.getItem('pos_products')) : [],
      pos_clients: localStorage.getItem('pos_clients') ? JSON.parse(localStorage.getItem('pos_clients')) : [],
      pos_invoices: localStorage.getItem('pos_invoices') ? JSON.parse(localStorage.getItem('pos_invoices')) : [],
      pos_payments: localStorage.getItem('pos_payments') ? JSON.parse(localStorage.getItem('pos_payments')) : [],
      pos_cash_closes: localStorage.getItem('pos_cash_closes') ? JSON.parse(localStorage.getItem('pos_cash_closes')) : []
    };
  }
};

// Helper for interacting with storage
const getStorageItem = (key) => {
  if (!memoryStore) {
    const item = localStorage.getItem(key);
    if (!item) return key === 'pos_settings' ? {} : [];
    return JSON.parse(item);
  }
  if (!memoryStore[key]) memoryStore[key] = key === 'pos_settings' ? {} : [];
  return memoryStore[key];
};

let saveTimeout = null;
const persistStore = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    if (window.electronAPI && memoryStore) {
      await window.electronAPI.saveDb(memoryStore);
    }
  }, 500); // 500ms debounce
};

const setStorageItem = (key, data) => {
  if (memoryStore) {
    memoryStore[key] = data;
    persistStore();
  }
  // Fallback to localStorage (might throw QuotaExceededError if large, so we catch it)
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("localStorage quota exceeded, data is only saved in Electron.");
  }
};

const generateId = (prefix) => {
  return `${prefix}_${crypto.randomUUID()}`;
};

export const db = {
  rawGet: (key) => getStorageItem(key),
  rawSet: (key, data) => setStorageItem(key, data),
  
  // RESTAURANT MODE
  getRestaurantMode: () => {
    const settings = getStorageItem('pos_settings');
    return settings && typeof settings.restaurantMode === 'boolean' ? settings.restaurantMode : false;
  },
  setRestaurantMode: (enabled) => {
    const settings = getStorageItem('pos_settings');
    const updated = (settings && typeof settings === 'object' && !Array.isArray(settings)) 
      ? { ...settings, restaurantMode: !!enabled } 
      : { restaurantMode: !!enabled };
    setStorageItem('pos_settings', updated);
    return !!enabled;
  },

  // PRODUCTS
  getProducts: () => getStorageItem('pos_products'),
  
  getActiveProducts: () => {
    const products = getStorageItem('pos_products');
    return products.filter(p => p.active);
  },
  
  getProductById: (id) => {
    const products = getStorageItem('pos_products');
    return products.find(p => p.id === id);
  },
  
  createProduct: (data) => {
    const products = getStorageItem('pos_products');
    const newProduct = {
      id: generateId('prod'),
      ...data,
      active: true,
      createdAt: new Date().toISOString()
    };
    products.push(newProduct);
    setStorageItem('pos_products', products);
    return newProduct;
  },
  
  updateProduct: (id, updates) => {
    const products = getStorageItem('pos_products');
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    products[index] = { ...products[index], ...updates };
    setStorageItem('pos_products', products);
    return products[index];
  },
  
  deleteProduct: (id) => {
    return db.updateProduct(id, { active: false });
  },
  
  getCategories: () => {
    const products = getStorageItem('pos_products');
    const categories = new Set(products.map(p => p.category));
    return Array.from(categories);
  },

  // CLIENTS
  getClients: () => getStorageItem('pos_clients'),
  
  getClientById: (id) => {
    const clients = getStorageItem('pos_clients');
    return clients.find(c => c.id === id);
  },
  
  searchClients: (query) => {
    const clients = getStorageItem('pos_clients');
    if (!query) return clients;
    
    const lowerQuery = query.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(lowerQuery) || 
      c.cedula.toLowerCase().includes(lowerQuery)
    );
  },
  
  createClient: (data) => {
    const clients = getStorageItem('pos_clients');
    const newClient = {
      id: generateId('cli'),
      ...data,
      createdAt: new Date().toISOString()
    };
    clients.push(newClient);
    setStorageItem('pos_clients', clients);
    return newClient;
  },
  
  updateClient: (id, updates) => {
    const clients = getStorageItem('pos_clients');
    const index = clients.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    clients[index] = { ...clients[index], ...updates };
    setStorageItem('pos_clients', clients);
    return clients[index];
  },
  
  getClientDebt: (clientId) => {
    const invoices = getStorageItem('pos_invoices');
    const payments = getStorageItem('pos_payments');
    
    const clientInvoices = invoices.filter(inv => inv.clientId === clientId && inv.status !== 'paid');
    
    let totalDebt = 0;
    clientInvoices.forEach(inv => {
      const initialPaid = inv.status === 'pending' ? 0 : (inv.receivedAmount || 0);
      const invoicePayments = payments
        .filter(p => p.invoiceId === inv.id)
        .reduce((sum, p) => sum + p.amount, 0);
        
      totalDebt += Math.max(0, inv.totalUSD - (initialPaid + invoicePayments));
    });
    
    return totalDebt;
  },

  // INVOICES
  getInvoices: (filters = {}) => {
    let invoices = getStorageItem('pos_invoices');
    
    if (filters.dateFrom) {
      invoices = invoices.filter(inv => new Date(inv.date) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      invoices = invoices.filter(inv => new Date(inv.date) <= new Date(filters.dateTo));
    }
    if (filters.clientId) {
      invoices = invoices.filter(inv => inv.clientId === filters.clientId);
    }
    if (filters.status) {
      invoices = invoices.filter(inv => inv.status === filters.status);
    }
    if (filters.clientType) {
      invoices = invoices.filter(inv => inv.clientType === filters.clientType);
    }
    if (filters.productId) {
      invoices = invoices.filter(inv => inv.items.some(item => item.productId === filters.productId));
    }
    
    return invoices.sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  
  getInvoiceById: (id) => {
    const invoices = getStorageItem('pos_invoices');
    return invoices.find(inv => inv.id === id);
  },
  
  getInvoicesByClient: (clientId) => {
    return db.getInvoices({ clientId });
  },
  
  getNextInvoiceNumber: () => {
    const invoices = getStorageItem('pos_invoices');
    const maxNum = invoices.reduce((max, inv) => {
      const parts = (inv?.invoiceNumber || '').split('-');
      const num = parts.length > 1 ? parseInt(parts[1], 10) : 0;
      const validNum = isNaN(num) ? 0 : num;
      return validNum > max ? validNum : max;
    }, 0);
    return `FAC-${String(maxNum + 1).padStart(4, '0')}`;
  },
  
  createInvoice: (data) => {
    const invoices = getStorageItem('pos_invoices');
    const newInvoice = {
      id: generateId('inv'),
      invoiceNumber: db.getNextInvoiceNumber(),
      date: new Date().toISOString(),
      ...data
    };
    invoices.push(newInvoice);
    setStorageItem('pos_invoices', invoices);
    return newInvoice;
  },
  
  updateInvoiceStatus: (id, status) => {
    const invoices = getStorageItem('pos_invoices');
    const index = invoices.findIndex(inv => inv.id === id);
    if (index === -1) return null;
    
    invoices[index].status = status;
    setStorageItem('pos_invoices', invoices);
    return invoices[index];
  },
  
  voidInvoice: (id, reason) => {
    const invoices = getStorageItem('pos_invoices');
    const index = invoices.findIndex(inv => inv.id === id);
    if (index === -1) return null;
    
    invoices[index].status = 'voided';
    invoices[index].voidReason = reason;
    invoices[index].voidDate = new Date().toISOString();
    
    setStorageItem('pos_invoices', invoices);
    return invoices[index];
  },

  // PAYMENTS
  getPayments: () => getStorageItem('pos_payments'),
  
  getPaymentsByClient: (clientId) => {
    const payments = getStorageItem('pos_payments');
    return payments.filter(p => p.clientId === clientId);
  },
  
  getPaymentsByInvoice: (invoiceId) => {
    const payments = getStorageItem('pos_payments');
    return payments.filter(p => p.invoiceId === invoiceId);
  },
  
  createPayment: (data) => {
    const payments = getStorageItem('pos_payments');
    const newPayment = {
      id: generateId('pay'),
      date: new Date().toISOString(),
      ...data
    };
    payments.push(newPayment);
    setStorageItem('pos_payments', payments);
    
    // Automatically update invoice status
    const invoice = db.getInvoiceById(data.invoiceId);
    if (invoice) {
      const initialPaid = invoice.status === 'pending' ? 0 : (invoice.receivedAmount || 0);
      const invoicePayments = db.getPaymentsByInvoice(invoice.id);
      const totalPaid = initialPaid + invoicePayments.reduce((sum, p) => sum + p.amount, 0);
      
      if (totalPaid >= invoice.totalUSD - 0.001) { // -0.001 to handle float precision
        db.updateInvoiceStatus(invoice.id, 'paid');
      } else if (totalPaid > 0) {
        db.updateInvoiceStatus(invoice.id, 'partial');
      }
    }
    
    return newPayment;
  },

  // CASH CLOSES
  getCashCloses: () => {
    const closes = getStorageItem('pos_cash_closes');
    return closes.sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  
  createCashClose: (data) => {
    const closes = getStorageItem('pos_cash_closes');
    const newClose = {
      id: generateId('cc'),
      ...data,
      date: new Date().toISOString()
    };
    closes.push(newClose);
    setStorageItem('pos_cash_closes', closes);
    return newClose;
  },
  
  getDailySummary: (dateStr) => {
    // dateStr format: YYYY-MM-DD
    const invoices = getStorageItem('pos_invoices');
    const payments = getStorageItem('pos_payments');
    
    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate.setHours(0,0,0,0)).getTime();
    const endOfDay = new Date(targetDate.setHours(23,59,59,999)).getTime();
    
    const todaysInvoices = invoices.filter(inv => {
      const time = new Date(inv.date).getTime();
      return time >= startOfDay && time <= endOfDay;
    });
    
    const todaysPayments = payments.filter(p => {
      const time = new Date(p.date).getTime();
      return time >= startOfDay && time <= endOfDay;
    });
    
    const summary = {
      totalSales: todaysInvoices.reduce((sum, inv) => sum + inv.totalUSD, 0),
      totalCollected: 0,
      totalPending: 0,
      breakdown: {
        efectivo_usd: 0,
        efectivo_bs: 0,
        pago_movil: 0,
        zelle: 0
      }
    };
    
    // Calculate collected from fully paid invoices today
    todaysInvoices.forEach(inv => {
      if (inv.status === 'paid' && !payments.some(p => p.invoiceId === inv.id)) {
        summary.totalCollected += inv.totalUSD;
        if (inv.paymentMethod === 'mixto' && inv.mixedPayments) {
          summary.breakdown.efectivo_usd += inv.mixedPayments.efectivo_usd || 0;
          summary.breakdown.zelle += inv.mixedPayments.zelle || 0;
          summary.breakdown.pago_movil += inv.mixedPayments.pago_movil_usd || 0;
          summary.breakdown.efectivo_bs += inv.mixedPayments.efectivo_bs_usd || 0;
        } else if (summary.breakdown[inv.paymentMethod] !== undefined) {
          summary.breakdown[inv.paymentMethod] += inv.totalUSD;
        }
      } else if (inv.status === 'pending') {
        summary.totalPending += inv.totalUSD;
      }
    });
    
    // Add payments received today (for partials or old invoices)
    todaysPayments.forEach(p => {
      summary.totalCollected += p.amount;
      // Note: Payment objects might need a paymentMethod field, assuming it's tracked if necessary.
      // For simplicity in this summary, we might just add to totalCollected unless payment method is recorded.
    });
    
    return summary;
  },

  // EXCHANGE RATE
  getExchangeRate: async () => {
    try {
      const cached = localStorage.getItem('pos_exchange_rate_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        const now = new Date().getTime();
        // Check if cache is less than 1 hour old (3600000 ms)
        if (now - parsed.timestamp < 3600000) {
          return parsed.rate;
        }
      }
      
      const response = await fetch('https://pydolarve.org/api/v2/dollar?monitor=bcv');
      const data = await response.json();
      
      if (data && data.price) {
        const rate = data.price;
        localStorage.setItem('pos_exchange_rate_cache', JSON.stringify({
          rate,
          timestamp: new Date().getTime()
        }));
        return rate;
      }
      
      // Fallback to manual if fetch fails but we don't throw
      return db.getCurrentRate();
    } catch (error) {
      console.error("Error fetching exchange rate:", error);
      return db.getCurrentRate();
    }
  },
  
  setManualRate: (rate) => {
    localStorage.setItem('pos_exchange_rate', JSON.stringify(rate));
  },
  
  getCurrentRate: () => {
    const manual = localStorage.getItem('pos_exchange_rate');
    const cached = localStorage.getItem('pos_exchange_rate_cache');
    
    if (manual) return JSON.parse(manual);
    if (cached) return JSON.parse(cached).rate;
    return 36.5; // Final fallback
  },

  // BACKUP & RESTORE (100% Offline Data Protection)
  exportBackupData: () => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      products: getStorageItem('pos_products'),
      clients: getStorageItem('pos_clients'),
      invoices: getStorageItem('pos_invoices'),
      payments: getStorageItem('pos_payments'),
      cashCloses: getStorageItem('pos_cash_closes'),
      exchangeRate: db.getCurrentRate()
    };
    return JSON.stringify(data, null, 2);
  },

  importBackupData: (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (!data || !Array.isArray(data.products) || !Array.isArray(data.invoices)) {
        throw new Error('El archivo no contiene un formato de respaldo válido de FacturaPOS.');
      }
      setStorageItem('pos_products', data.products);
      setStorageItem('pos_clients', data.clients || []);
      setStorageItem('pos_invoices', data.invoices || []);
      setStorageItem('pos_payments', data.payments || []);
      setStorageItem('pos_cash_closes', data.cashCloses || []);
      if (data.exchangeRate) {
        db.setManualRate(data.exchangeRate);
      }
      return { success: true, count: data.invoices.length };
    } catch (err) {
      console.error('Error importing backup:', err);
      throw err;
    }
  }
};
