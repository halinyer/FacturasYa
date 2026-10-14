import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { db, initDB } from '../services/dataService';
import { initializeSeedData } from '../data/seedData';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [cashCloses, setCashCloses] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(() => {
    const cached = localStorage.getItem('pos_exchange_rate_cache');
    if (cached) {
      try {
        const p = JSON.parse(cached);
        if (p?.rate && Number(p.rate) > 100) return Number(p.rate);
      } catch (e) {}
    }
    const manual = localStorage.getItem('pos_exchange_rate');
    if (manual) {
      try {
        const m = JSON.parse(manual);
        if (m && Number(m) > 100) return Number(m);
      } catch (e) {}
    }
    return 876.80;
  });
  const [restaurantMode, setRestaurantMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const exchangeRateRef = React.useRef(exchangeRate);
  useEffect(() => {
    exchangeRateRef.current = exchangeRate;
  }, [exchangeRate]);

  const syncRateToServer = useCallback((rate) => {
    if (!rate || isNaN(rate) || Number(rate) < 100) return;
    fetch('http://localhost:3001/api/restaurant/sync-rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exchangeRate: Number(rate) })
    }).catch(() => {});
  }, []);

  const refreshData = useCallback(() => {
    try {
      const prods = [...(db.getProducts() || [])];
      setProducts(prods);
      setClients([...(db.getClients() || [])]);
      setInvoices([...(db.getInvoices() || [])]);
      setPayments([...(db.getPayments() || [])]);
      setCashCloses([...(db.getCashCloses() || [])]);
      setRestaurantMode(db.getRestaurantMode() || false);

      // Auto-sync products with local restaurant server for tablets
      if (prods.length > 0) {
        const currentRate = exchangeRateRef.current;
        const payload = { products: prods };
        if (currentRate && Number(currentRate) > 100) {
          payload.exchangeRate = Number(currentRate);
        }
        fetch('http://localhost:3001/api/restaurant/sync-menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  }, []);

  useEffect(() => {
    if (exchangeRate && Number(exchangeRate) > 100) {
      syncRateToServer(exchangeRate);
    }
  }, [exchangeRate, syncRateToServer]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setLoading(true);
      await initDB();
      initializeSeedData();
      if (isMounted) {
        refreshData();
      }
      
      // Auto-load live official BCV rate on startup
      try {
        const rate = await db.getExchangeRate(true);
        if (isMounted && rate && Number(rate) > 100) {
          setExchangeRate(rate);
          syncRateToServer(rate);
        }
      } catch (e) {}
      
      if (isMounted) {
        setLoading(false);
      }
    };
    init();

    return () => {
      isMounted = false;
    };
  }, []);

  const addProduct = (product) => {
    const newProd = db.createProduct(product);
    const fresh = [...(db.getProducts() || [])];
    setProducts(fresh);
    refreshData();
    return newProd;
  };

  const updateProduct = (id, data) => {
    const updated = db.updateProduct(id, data);
    const fresh = [...(db.getProducts() || [])];
    setProducts(fresh);
    refreshData();
    return updated;
  };

  const deleteProduct = (id) => {
    db.deleteProduct(id);
    const fresh = [...(db.getProducts() || [])];
    setProducts(fresh);
    refreshData();
  };

  const addClient = (client) => {
    const newClient = db.createClient(client);
    const fresh = [...(db.getClients() || [])];
    setClients(fresh);
    refreshData();
    return newClient;
  };

  const updateClient = (id, data) => {
    const updated = db.updateClient(id, data);
    const fresh = [...(db.getClients() || [])];
    setClients(fresh);
    refreshData();
    return updated;
  };

  const searchClients = (query) => {
    return db.searchClients(query);
  };

  const createInvoice = (invoiceData) => {
    const newInvoice = db.createInvoice(invoiceData);
    refreshData();
    return newInvoice;
  };

  const addPayment = (paymentData) => {
    db.createPayment(paymentData);
    refreshData();
  };

  const getClientDebt = (clientId) => {
    return db.getClientDebt(clientId);
  };

  const loadExchangeRate = useCallback(async (force = false) => {
    try {
      const rate = await db.getExchangeRate(force);
      if (rate && !isNaN(rate) && Number(rate) > 100) {
        setExchangeRate(Number(rate));
        syncRateToServer(Number(rate));
        return Number(rate);
      }
    } catch (e) {
      console.warn('Error loading exchange rate:', e);
    }
    return db.getCurrentRate();
  }, [syncRateToServer]);

  // Auto-actualizar tasa oficial BCV cada 30 minutos
  useEffect(() => {
    const timer = setInterval(() => {
      loadExchangeRate(false);
    }, 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, [loadExchangeRate]);

  const setManualRate = (rate) => {
    const numRate = Number(rate);
    setExchangeRate(numRate);
    db.setManualRate(numRate);
    syncRateToServer(numRate);
  };

  const getFilteredInvoices = (filters) => {
    return db.getInvoices(filters);
  };

  const createCashClose = (data) => {
    const close = db.createCashClose(data);
    refreshData();
    return close;
  };

  const getDailySummary = (date) => {
    return db.getDailySummary(date);
  };

  const getInvoicesByClient = (clientId) => {
    return db.getInvoicesByClient(clientId);
  };

  const getPaymentsByClient = (clientId) => {
    return db.getPaymentsByClient(clientId);
  };

  const getPaymentsByInvoice = (invoiceId) => {
    return db.getPaymentsByInvoice(invoiceId);
  };

  const getActiveProducts = () => {
    return db.getActiveProducts();
  };

  const getCategories = () => {
    return db.getCategories();
  };

  const getNextInvoiceNumber = () => {
    return db.getNextInvoiceNumber();
  };

  const getClientById = (id) => {
    return db.getClientById(id);
  };

  const voidInvoice = (id, reason) => {
    const voided = db.voidInvoice(id, reason);
    refreshData();
    return voided;
  };

  const exportBackup = () => {
    return db.exportBackupData();
  };

  const importBackup = (jsonString) => {
    const res = db.importBackupData(jsonString);
    refreshData();
    return res;
  };

  const toggleRestaurantMode = (enabled) => {
    const val = db.setRestaurantMode(enabled);
    setRestaurantMode(val);
    return val;
  };

  return (
    <DataContext.Provider value={{
      products,
      clients,
      invoices,
      payments,
      cashCloses,
      exchangeRate,
      restaurantMode,
      toggleRestaurantMode,
      loading,
      addProduct,
      updateProduct,
      deleteProduct,
      addClient,
      updateClient,
      searchClients,
      createInvoice,
      voidInvoice,
      addPayment,
      getClientDebt,
      refreshData,
      loadExchangeRate,
      setManualRate,
      getFilteredInvoices,
      createCashClose,
      getDailySummary,
      getInvoicesByClient,
      getPaymentsByClient,
      getPaymentsByInvoice,
      getActiveProducts,
      getCategories,
      getNextInvoiceNumber,
      getClientById,
      exportBackup,
      importBackup
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
