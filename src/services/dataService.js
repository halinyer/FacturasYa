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
          pos_purchases: localStorage.getItem('pos_purchases') ? JSON.parse(localStorage.getItem('pos_purchases')) : [],
          pos_payments: localStorage.getItem('pos_payments') ? JSON.parse(localStorage.getItem('pos_payments')) : [],
          pos_cash_closes: localStorage.getItem('pos_cash_closes') ? JSON.parse(localStorage.getItem('pos_cash_closes')) : [],
          pos_open_tabs: localStorage.getItem('pos_open_tabs') ? JSON.parse(localStorage.getItem('pos_open_tabs')) : [],
          pos_expenses: localStorage.getItem('pos_expenses') ? JSON.parse(localStorage.getItem('pos_expenses')) : [],
          pos_settings: localStorage.getItem('pos_settings') ? JSON.parse(localStorage.getItem('pos_settings')) : {}
        };
        await window.electronAPI.saveDb(memoryStore);
      } else {
        memoryStore = fileData;
        if (!memoryStore.pos_expenses) memoryStore.pos_expenses = [];
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
      pos_purchases: localStorage.getItem('pos_purchases') ? JSON.parse(localStorage.getItem('pos_purchases')) : [],
      pos_payments: localStorage.getItem('pos_payments') ? JSON.parse(localStorage.getItem('pos_payments')) : [],
      pos_cash_closes: localStorage.getItem('pos_cash_closes') ? JSON.parse(localStorage.getItem('pos_cash_closes')) : [],
      pos_open_tabs: localStorage.getItem('pos_open_tabs') ? JSON.parse(localStorage.getItem('pos_open_tabs')) : [],
      pos_expenses: localStorage.getItem('pos_expenses') ? JSON.parse(localStorage.getItem('pos_expenses')) : []
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
  const uuid = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return `${prefix}_${uuid}`;
};

export const normalizeCedulaRif = (raw) => {
  const str = String(raw || '').trim().toUpperCase();
  if (!str) return 'V-00000000';
  // Si son solo dígitos o dígitos con puntos/espacios, agregar prefijo V-
  const clean = str.replace(/[\.\s]/g, '');
  if (/^\d+$/.test(clean)) {
    return `V-${clean}`;
  }
  const match = clean.match(/^([VEJGP])[-]?(\d+)(?:[-]?(\d))?$/);
  if (match) {
    const letter = match[1];
    const body = match[2];
    const check = match[3];
    return check !== undefined ? `${letter}-${body}-${check}` : `${letter}-${body}`;
  }
  return clean;
};

export const db = {
  rawGet: (key) => getStorageItem(key),
  rawSet: (key, data) => setStorageItem(key, data),
  
  // RESTAURANT MODE
  getRestaurantMode: () => {
    const settings = getStorageItem('pos_settings');
    return settings && typeof settings.restaurantMode === 'boolean' ? settings.restaurantMode : true;
  },
  setRestaurantMode: (enabled) => {
    const settings = getStorageItem('pos_settings');
    const updated = (settings && typeof settings === 'object' && !Array.isArray(settings)) 
      ? { ...settings, restaurantMode: !!enabled } 
      : { restaurantMode: !!enabled };
    setStorageItem('pos_settings', updated);
    return !!enabled;
  },

  // FISCAL PRINTER SETTINGS
  getFiscalSettings: () => {
    const settings = getStorageItem('pos_settings') || {};
    const fiscal = settings.fiscal || {
      enabled: true,
      port: 'COM2',
      baudRate: 9600,
      autoPrintInvoice: false
    };
    return fiscal;
  },
  saveFiscalSettings: (fiscalConfig) => {
    const settings = getStorageItem('pos_settings') || {};
    const cleanConfig = { ...fiscalConfig };
    const updated = {
      ...settings,
      fiscal: { ...(settings.fiscal || {}), ...cleanConfig }
    };
    setStorageItem('pos_settings', updated);
    return updated.fiscal;
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
    const products = getStorageItem('pos_products') || [];
    const newProduct = {
      ...data,
      id: (data && data.id) ? data.id : generateId('prod'),
      active: data.active !== undefined ? data.active : true,
      createdAt: new Date().toISOString()
    };
    const updated = [newProduct, ...products];
    setStorageItem('pos_products', updated);
    return newProduct;
  },
  
  updateProduct: (id, updates) => {
    const products = getStorageItem('pos_products') || [];
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    const updated = [...products];
    updated[index] = { ...updated[index], ...updates };
    setStorageItem('pos_products', updated);
    return updated[index];
  },
  
  deleteProduct: (id) => {
    const products = getStorageItem('pos_products') || [];
    const updated = products.filter(p => p.id !== id);
    setStorageItem('pos_products', updated);
    return true;
  },
  
  getCategories: () => {
    const products = getStorageItem('pos_products') || [];
    const categories = new Set(products.map(p => p.category));
    return Array.from(categories);
  },

  // CLIENTS
  getClients: () => {
    const rawClients = getStorageItem('pos_clients') || [];
    let needsRepair = false;
    const seenIds = new Set();
    const repairedClients = rawClients.map((c, idx) => {
      if (!c || typeof c !== 'object') return c;
      let validId = c.id;
      if (!validId || seenIds.has(validId)) {
        validId = `${generateId('cli')}_${idx}`;
        needsRepair = true;
      }
      seenIds.add(validId);
      return validId === c.id ? c : { ...c, id: validId };
    });
    if (needsRepair) {
      setStorageItem('pos_clients', repairedClients);
    }
    return repairedClients;
  },
  
  getClientById: (id) => {
    const clients = db.getClients();
    return clients.find(c => c.id === id);
  },
  
  searchClients: (query) => {
    const clients = db.getClients();
    if (!query) return clients;
    
    const lowerQuery = query.toLowerCase();
    return clients.filter(c => 
      (c.name || '').toLowerCase().includes(lowerQuery) || 
      (c.cedula || '').toLowerCase().includes(lowerQuery) ||
      (c.phone || '').toLowerCase().includes(lowerQuery) ||
      (c.address || '').toLowerCase().includes(lowerQuery)
    );
  },
  
  createClient: (data) => {
    const clients = db.getClients();
    const cleanName = String(data?.name || '').trim() || 'Cliente';
    const cleanCedula = normalizeCedulaRif(data?.cedula || data?.rif || '');
    const newClient = {
      ...data,
      id: (data && data.id) ? data.id : generateId('cli'),
      name: cleanName,
      cedula: cleanCedula,
      phone: String(data?.phone || '').trim(),
      address: String(data?.address || '').trim(),
      type: data?.type || 'normal',
      createdAt: new Date().toISOString()
    };
    const updated = [newClient, ...clients];
    setStorageItem('pos_clients', updated);
    return newClient;
  },
  
  updateClient: (id, updates) => {
    const clients = db.getClients();
    const index = clients.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    const updated = [...clients];
    const nextCedula = updates?.cedula !== undefined ? normalizeCedulaRif(updates.cedula) : updated[index].cedula;
    updated[index] = {
      ...updated[index],
      ...updates,
      id: updated[index].id,
      name: updates?.name !== undefined ? String(updates.name).trim() : updated[index].name,
      cedula: nextCedula
    };
    setStorageItem('pos_clients', updated);
    return updated[index];
  },

  deleteClient: (id) => {
    const clients = db.getClients();
    const updated = clients.filter(c => c.id !== id);
    setStorageItem('pos_clients', updated);
    return true;
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
  
  updateInvoice: (id, updates) => {
    const invoices = getStorageItem('pos_invoices');
    const index = invoices.findIndex(inv => inv.id === id);
    if (index === -1) return null;

    invoices[index] = { ...invoices[index], ...updates };
    setStorageItem('pos_invoices', invoices);
    return invoices[index];
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
    const index = invoices.findIndex(inv => String(inv.id) === String(id) || String(inv.invoiceNumber) === String(id));
    if (index === -1) return null;
    
    invoices[index].previousStatus = invoices[index].status !== 'voided' ? invoices[index].status : 'paid';
    invoices[index].status = 'voided';
    invoices[index].voidReason = reason || 'Anulada en sistema / impresora fiscal';
    invoices[index].voidDate = new Date().toISOString();
    
    setStorageItem('pos_invoices', invoices);
    return invoices[index];
  },

  restoreInvoice: (id) => {
    const invoices = getStorageItem('pos_invoices');
    const index = invoices.findIndex(inv => String(inv.id) === String(id) || String(inv.invoiceNumber) === String(id));
    if (index === -1) return null;

    invoices[index].status = invoices[index].previousStatus || 'paid';
    delete invoices[index].voidReason;
    delete invoices[index].voidDate;

    setStorageItem('pos_invoices', invoices);
    return invoices[index];
  },

  deleteInvoice: (id) => {
    const invoices = getStorageItem('pos_invoices');
    const filtered = invoices.filter(inv => String(inv.id) !== String(id) && String(inv.invoiceNumber) !== String(id));
    setStorageItem('pos_invoices', filtered);

    // Also remove related payments
    const payments = getStorageItem('pos_payments');
    const filteredPayments = payments.filter(p => String(p.invoiceId) !== String(id));
    setStorageItem('pos_payments', filteredPayments);

    return true;
  },

  deleteCashClose: (idOrDate) => {
    const closes = getStorageItem('pos_cash_closes');
    const targetClean = String(idOrDate).includes('T') ? String(idOrDate).split('T')[0] : String(idOrDate);
    const filtered = closes.filter(c => {
      const cDate = (c.date || '').includes('T') ? c.date.split('T')[0] : c.date;
      return String(c.id) !== String(idOrDate) && cDate !== targetClean;
    });
    setStorageItem('pos_cash_closes', filtered);
    return true;
  },

  clearInvoicesByDate: (dateStr) => {
    const invoices = getStorageItem('pos_invoices');
    const payments = getStorageItem('pos_payments');
    const targetClean = String(dateStr).includes('T') ? String(dateStr).split('T')[0] : String(dateStr);

    const toDeleteIds = new Set();
    const keptInvoices = invoices.filter(inv => {
      const invDate = (inv.date || '').includes('T') ? inv.date.split('T')[0] : (inv.date || '');
      let localDate = '';
      if (inv.date) {
        const d = new Date(inv.date);
        if (!isNaN(d.getTime())) {
          localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      }
      if (invDate === targetClean || localDate === targetClean) {
        toDeleteIds.add(String(inv.id));
        return false;
      }
      return true;
    });

    const keptPayments = payments.filter(p => !toDeleteIds.has(String(p.invoiceId)));

    setStorageItem('pos_invoices', keptInvoices);
    setStorageItem('pos_payments', keptPayments);

    // Also delete any cash close record for that date
    db.deleteCashClose(targetClean);
    return true;
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
    const rawDate = data.date || new Date().toISOString().split('T')[0];
    const targetDateClean = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

    // Verificar si ya existe un cierre para esa fecha
    const existingIndex = closes.findIndex(c => {
      const cDate = (c.date || '').includes('T') ? c.date.split('T')[0] : c.date;
      return cDate === targetDateClean;
    });

    const newClose = {
      id: existingIndex !== -1 ? closes[existingIndex].id : generateId('cc'),
      ...data,
      date: targetDateClean,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex !== -1) {
      closes[existingIndex] = newClose;
    } else {
      closes.push(newClose);
    }

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
    
    const activeInvoices = todaysInvoices.filter(inv => inv.status !== 'voided' && inv.status !== 'anulada');
    const voidedInvoices = todaysInvoices.filter(inv => inv.status === 'voided' || inv.status === 'anulada');

    const summary = {
      totalSales: activeInvoices.reduce((sum, inv) => sum + (Number(inv.totalUSD) || 0), 0),
      totalVoidedUSD: voidedInvoices.reduce((sum, inv) => sum + (Number(inv.totalUSD) || 0), 0),
      voidedCount: voidedInvoices.length,
      totalCollected: 0,
      totalPending: 0,
      breakdown: {
        efectivo_usd: 0,
        efectivo_bs: 0,
        pago_movil: 0,
        zelle: 0
      }
    };
    
    // Calculate collected from fully paid (non-voided) invoices today
    activeInvoices.forEach(inv => {
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

  // EXCHANGE RATE (Tasa Oficial BCV Venezuela en vivo)
  getExchangeRate: async (force = false) => {
    try {
      if (!force) {
        const cached = localStorage.getItem('pos_exchange_rate_cache');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const now = new Date().getTime();
            // Cache por 10 minutos si la tasa es válida y superior a 100 Bs/$
            if (now - parsed.timestamp < 600000 && parsed.rate && Number(parsed.rate) > 100) {
              return Number(parsed.rate);
            }
          } catch (e) {}
        }
      }
      
      let fetchedRate = null;
      let providerName = '';

      // 1. Intentar servidor local (backend Node en puerto 3001 sin bloqueos de red)
      try {
        const controller = new AbortController();
        const tId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`http://localhost:3001/api/bcv/rate${force ? '?force=true' : ''}`, { signal: controller.signal });
        clearTimeout(tId);
        if (res.ok) {
          const data = await res.json();
          if (data && data.rate && !isNaN(data.rate) && Number(data.rate) > 100) {
            fetchedRate = Number(data.rate);
            providerName = data.provider || 'Servidor Local';
          }
        }
      } catch (eLocal) {}

      // 2. Consulta directa a API de respaldo (JustCarlux BCV)
      if (!fetchedRate) {
        try {
          const res = await fetch('https://bcv.justcarlux.dev/api/v1/rates', { cache: 'no-cache', signal: AbortSignal.timeout(3500) });
          if (res.ok) {
            const data = await res.json();
            if (data?.rates?.usd && !isNaN(data.rates.usd) && Number(data.rates.usd) > 100) {
              fetchedRate = Number(data.rates.usd);
              providerName = 'BCV en Vivo (JustCarlux)';
            }
          }
        } catch (eCarlux) {}
      }

      // 3. Consulta a DolarApi Oficial (BCV)
      if (!fetchedRate) {
        try {
          const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', { cache: 'no-cache', signal: AbortSignal.timeout(3500) });
          if (res.ok) {
            const data = await res.json();
            if (data && data.promedio && !isNaN(data.promedio) && Number(data.promedio) > 100) {
              fetchedRate = Number(data.promedio);
              providerName = 'DolarApi Oficial (BCV)';
            }
          }
        } catch (eApi) {}
      }

      // 4. Consulta de respaldo a DolarApi lista completa
      if (!fetchedRate) {
        try {
          const res = await fetch('https://ve.dolarapi.com/v1/dolares', { cache: 'no-cache', signal: AbortSignal.timeout(3500) });
          if (res.ok) {
            const list = await res.json();
            const oficial = Array.isArray(list) ? list.find(d => d.fuente === 'oficial') : null;
            if (oficial && oficial.promedio && !isNaN(oficial.promedio) && Number(oficial.promedio) > 100) {
              fetchedRate = Number(oficial.promedio);
              providerName = 'DolarApi Lista (BCV)';
            }
          }
        } catch (eList) {}
      }
      
      if (fetchedRate && fetchedRate > 100) {
        localStorage.setItem('pos_exchange_rate_cache', JSON.stringify({
          rate: fetchedRate,
          provider: providerName,
          timestamp: new Date().getTime()
        }));
        setStorageItem('pos_exchange_rate', fetchedRate);
        return fetchedRate;
      }
      
      return db.getCurrentRate();
    } catch (error) {
      console.error("Error al consultar tasa oficial BCV:", error);
      return db.getCurrentRate();
    }
  },
  
  setManualRate: (rate) => {
    const numRate = Number(rate);
    if (!isNaN(numRate) && numRate > 0) {
      localStorage.setItem('pos_exchange_rate', JSON.stringify(numRate));
      setStorageItem('pos_exchange_rate', numRate);
    }
  },
  
  getCurrentRate: () => {
    const fromStorage = getStorageItem('pos_exchange_rate');
    if (fromStorage && typeof fromStorage === 'number' && fromStorage > 100) return fromStorage;
    const manual = localStorage.getItem('pos_exchange_rate');
    const cached = localStorage.getItem('pos_exchange_rate_cache');
    
    if (manual) {
      try {
        const val = JSON.parse(manual);
        if (Number(val) > 100) return Number(val);
      } catch (e) {}
    }
    if (cached) {
      try {
        const val = JSON.parse(cached);
        if (val?.rate && Number(val.rate) > 100) return Number(val.rate);
      } catch (e) {}
    }
    return 876.80; // Final active fallback
  },

  // OPEN TABS & DELIVERIES (Control de Cuentas Abiertas y Pedidos)
  getOpenTabs: () => getStorageItem('pos_open_tabs') || [],

  saveOpenTab: (tabData) => {
    const tabs = getStorageItem('pos_open_tabs') || [];
    const id = tabData.id || generateId('tab');
    const existingIndex = tabs.findIndex(t => t.id === id);

    const clientName = tabData.client?.name || tabData.clientName || '';
    const defaultName = tabData.orderType === 'delivery'
      ? (clientName ? `Delivery - ${clientName}` : `Delivery #${tabs.length + 1}`)
      : tabData.orderType === 'para_llevar'
        ? (clientName ? `Llevar - ${clientName}` : `Para Llevar #${tabs.length + 1}`)
        : (clientName ? `Cuenta - ${clientName}` : `Cuenta #${tabs.length + 1}`);

    const tabRecord = {
      id,
      name: (tabData.name && tabData.name.trim()) ? tabData.name.trim() : defaultName,
      orderType: tabData.orderType || 'salon', // 'salon' | 'para_llevar' | 'delivery'
      deliveryInfo: tabData.deliveryInfo || { address: '', phone: '', courier: '', deliveryFee: 0 },
      client: tabData.client || null,
      items: tabData.items || [],
      tableName: tabData.tableName || null,
      status: tabData.status || (tabData.orderType === 'delivery' ? 'cocina' : 'abierta'), // 'abierta' | 'cocina' | 'en_camino' | 'por_cobrar'
      createdAt: tabData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let updated;
    if (existingIndex >= 0) {
      updated = [...tabs];
      updated[existingIndex] = tabRecord;
    } else {
      updated = [tabRecord, ...tabs];
    }

    setStorageItem('pos_open_tabs', updated);
    return tabRecord;
  },

  deleteOpenTab: (id) => {
    const tabs = getStorageItem('pos_open_tabs') || [];
    const updated = tabs.filter(t => t.id !== id);
    setStorageItem('pos_open_tabs', updated);
    return true;
  },

  updateOpenTabStatus: (id, status) => {
    const tabs = getStorageItem('pos_open_tabs') || [];
    const index = tabs.findIndex(t => t.id === id);
    if (index === -1) return null;

    const updated = [...tabs];
    updated[index] = {
      ...updated[index],
      status,
      updatedAt: new Date().toISOString()
    };
    setStorageItem('pos_open_tabs', updated);
    return updated[index];
  },

  // EXPENSES (Gastos y Salidas de Caja)
  getExpenses: () => {
    const list = getStorageItem('pos_expenses') || [];
    return [...list].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  },

  createExpense: (data = {}) => {
    const expenses = getStorageItem('pos_expenses') || [];
    const rate = Number(data.exchangeRate) || db.getCurrentRate() || 876.80;
    const rawAmount = parseFloat(data.amount) || 0;
    const currency = data.currency === 'BS' ? 'BS' : 'USD';
    const amountUSD = currency === 'BS'
      ? Number((rawAmount / rate).toFixed(2))
      : Number((Number(data.amountUSD) || rawAmount).toFixed(2));
    const amountBs = currency === 'BS'
      ? Number(rawAmount.toFixed(2))
      : Number((amountUSD * rate).toFixed(2));

    const newExpense = {
      id: data.id || generateId('exp'),
      date: data.date || new Date().toISOString(),
      description: String(data.description || '').trim() || 'Gasto operativo',
      category: data.category || 'Operativo',
      amountUSD,
      amountBs,
      currency,
      paymentMethod: data.paymentMethod || 'efectivo_usd',
      exchangeRate: rate,
      createdBy: data.createdBy || 'Caja'
    };

    const updated = [newExpense, ...expenses];
    setStorageItem('pos_expenses', updated);
    return newExpense;
  },

  deleteExpense: (id) => {
    const expenses = getStorageItem('pos_expenses') || [];
    const updated = expenses.filter(e => e.id !== id);
    setStorageItem('pos_expenses', updated);
    return true;
  },

  // CLOUD & MOBILE MONITOR SETTINGS (Para que el dueño vea todo desde su teléfono)
  getCloudMonitorSettings: () => {
    const settings = getStorageItem('pos_settings') || {};
    const stored = settings.cloudMonitor || {};
    return { cloudSyncUrl: stored.cloudSyncUrl || '', enablePublicTunnel: true };
  },

  saveCloudMonitorSettings: (cfg) => {
    const settings = getStorageItem('pos_settings') || {};
    settings.cloudMonitor = {
      cloudSyncUrl: (cfg && cfg.cloudSyncUrl) || (settings.cloudMonitor && settings.cloudMonitor.cloudSyncUrl) || '',
      enablePublicTunnel: true
    };
    setStorageItem('pos_settings', settings);
    return settings.cloudMonitor;
  },

  // PURCHASES (Libro de Compras SENIAT)
  getPurchases: () => {
    return getStorageItem('pos_purchases');
  },

  addPurchase: (purchaseData) => {
    const purchases = getStorageItem('pos_purchases');
    const newPurchase = {
      ...purchaseData,
      id: purchaseData.id || ('pur_' + Date.now()),
      createdAt: purchaseData.createdAt || new Date().toISOString()
    };
    purchases.unshift(newPurchase);
    setStorageItem('pos_purchases', purchases);
    return newPurchase;
  },

  updatePurchase: (id, updateData) => {
    const purchases = getStorageItem('pos_purchases');
    const index = purchases.findIndex(p => p.id === id);
    if (index === -1) return null;
    purchases[index] = { ...purchases[index], ...updateData, updatedAt: new Date().toISOString() };
    setStorageItem('pos_purchases', purchases);
    return purchases[index];
  },

  deletePurchase: (id) => {
    const purchases = getStorageItem('pos_purchases');
    const filtered = purchases.filter(p => p.id !== id);
    setStorageItem('pos_purchases', filtered);
    return true;
  },

  // BACKUP & RESTORE (100% Offline Data Protection)
  exportBackupData: () => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      products: getStorageItem('pos_products'),
      clients: getStorageItem('pos_clients'),
      invoices: getStorageItem('pos_invoices'),
      expenses: getStorageItem('pos_expenses'),
      purchases: getStorageItem('pos_purchases'),
      payments: getStorageItem('pos_payments'),
      cashCloses: getStorageItem('pos_cash_closes'),
      openTabs: getStorageItem('pos_open_tabs'),
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
      setStorageItem('pos_expenses', data.expenses || []);
      setStorageItem('pos_purchases', data.purchases || []);
      setStorageItem('pos_payments', data.payments || []);
      setStorageItem('pos_cash_closes', data.cashCloses || []);
      setStorageItem('pos_open_tabs', data.openTabs || []);
      if (data.exchangeRate) {
        db.setManualRate(data.exchangeRate);
      }
      return { success: true, count: data.invoices.length };
    } catch (err) {
      console.error('Error importing backup:', err);
      throw err;
    }
  },

  clearAllSalesData: () => {
    setStorageItem('pos_invoices', []);
    setStorageItem('pos_expenses', []);
    setStorageItem('pos_purchases', []);
    setStorageItem('pos_payments', []);
    setStorageItem('pos_cash_closes', []);
    setStorageItem('pos_open_tabs', []);
    try {
      localStorage.setItem('pos_invoices', JSON.stringify([]));
      localStorage.setItem('pos_expenses', JSON.stringify([]));
      localStorage.setItem('pos_purchases', JSON.stringify([]));
      localStorage.setItem('pos_payments', JSON.stringify([]));
      localStorage.setItem('pos_cash_closes', JSON.stringify([]));
      localStorage.setItem('pos_open_tabs', JSON.stringify([]));
    } catch (e) {}
    try {
      fetch('http://localhost:3001/api/restaurant/reset-orders', { method: 'POST' }).catch(() => {});
    } catch (e) {}
    return true;
  }
};
