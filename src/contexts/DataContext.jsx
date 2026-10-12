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
  const [exchangeRate, setExchangeRate] = useState(36.5);
  const [restaurantMode, setRestaurantMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const syncRateToServer = useCallback((rate) => {
    if (!rate || isNaN(rate)) return;
    fetch('http://localhost:3001/api/restaurant/sync-rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exchangeRate: Number(rate) })
    }).catch(() => {});
  }, []);

  const refreshData = useCallback(() => {
    try {
      const prods = db.getProducts() || [];
      setProducts(prods);
      setClients(db.getClients() || []);
      setInvoices(db.getInvoices() || []);
      setPayments(db.getPayments() || []);
      setCashCloses(db.getCashCloses() || []);
      setRestaurantMode(db.getRestaurantMode() || false);

      // Auto-sync products with local restaurant server for tablets
      if (prods.length > 0) {
        fetch('http://localhost:3001/api/restaurant/sync-menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: prods, exchangeRate })
        }).catch(() => {});
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  }, [exchangeRate]);

  useEffect(() => {
    syncRateToServer(exchangeRate);
  }, [exchangeRate, syncRateToServer]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await initDB();
      initializeSeedData();
      refreshData();
      
      // Try to load exchange rate
      db.getExchangeRate().then(rate => {
        if (rate) {
          setExchangeRate(rate);
          syncRateToServer(rate);
        }
      }).catch(() => {});
      
      setLoading(false);
    };
    init();
  }, [refreshData, syncRateToServer]);

  const addProduct = (product) => {
    db.createProduct(product);
    refreshData();
  };

  const updateProduct = (id, data) => {
    db.updateProduct(id, data);
    refreshData();
  };

  const deleteProduct = (id) => {
    db.deleteProduct(id);
    refreshData();
  };

  const addClient = (client) => {
    const newClient = db.createClient(client);
    refreshData();
    return newClient;
  };

  const updateClient = (id, data) => {
    db.updateClient(id, data);
    refreshData();
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

  const loadExchangeRate = async () => {
    const rate = await db.getExchangeRate();
    if (rate) {
      setExchangeRate(rate);
      syncRateToServer(rate);
    }
    return rate;
  };

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
