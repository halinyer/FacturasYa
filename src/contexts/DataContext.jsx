import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { db, initDB } from '../services/dataService';
import { initializeSeedData } from '../data/seedData';

export const getTodayLocalDateStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [currentLocalDate, setCurrentLocalDate] = useState(getTodayLocalDateStr);
  const currentDateRef = useRef(getTodayLocalDateStr());
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [cashCloses, setCashCloses] = useState([]);
  const [openTabs, setOpenTabs] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [cloudMonitorSettings, setCloudMonitorSettings] = useState(() => db.getCloudMonitorSettings());
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

  const MONITOR_SYNC_ENABLED = true; // Sincronización automática con el monitor del teléfono del dueño

  const syncMonitorData = useCallback((customData = {}) => {
    if (!MONITOR_SYNC_ENABLED) return;
    try {
      const invs = customData.invoices || db.getInvoices() || [];
      const exps = customData.expenses || db.getExpenses() || [];
      const tabs = customData.openTabs || db.getOpenTabs() || [];
      const clis = customData.clients || db.getClients() || [];
      const pays = customData.payments || db.getPayments() || [];
      const monCfg = customData.cloudMonitorSettings || db.getCloudMonitorSettings() || {};
      const rate = Number(exchangeRateRef.current) || 876.80;

      fetch('http://localhost:3001/api/monitor/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoices: invs.slice(0, 250),
          expenses: exps.slice(0, 200),
          openTabs: tabs,
          clients: clis,
          payments: pays.slice(0, 200),
          exchangeRate: rate,
          cloudMonitorSettings: monCfg
        })
      }).catch(() => {});
    } catch (e) {}
  }, []);

  const refreshData = useCallback(() => {
    try {
      const prods = [...(db.getProducts() || [])];
      const clis = [...(db.getClients() || [])];
      const invs = [...(db.getInvoices() || [])];
      const pays = [...(db.getPayments() || [])];
      const closes = [...(db.getCashCloses() || [])];
      const tabs = [...(db.getOpenTabs() || [])];
      const pur = [...(db.getPurchases() || [])];
      const exps = [...(db.getExpenses() || [])];
      const monCfg = { ...(db.getCloudMonitorSettings() || {}) };

      setProducts(prods);
      setClients(clis);
      setInvoices(invs);
      setPayments(pays);
      setCashCloses(closes);
      setOpenTabs(tabs);
      setPurchases(pur);
      setExpenses(exps);
      setCloudMonitorSettings(monCfg);
      setRestaurantMode(db.getRestaurantMode() || false);
      setFiscalSettings({ ...(db.getFiscalSettings() || { enabled: true, port: 'COM2', baudRate: 9600 }) });

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

      // Sync financial movements with mobile owner monitor
      syncMonitorData({
        invoices: invs,
        expenses: exps,
        openTabs: tabs,
        clients: clis,
        payments: pays,
        cloudMonitorSettings: monCfg
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  }, [syncMonitorData]);

  useEffect(() => {
    if (exchangeRate && Number(exchangeRate) > 100) {
      syncRateToServer(exchangeRate);
    }
  }, [exchangeRate, syncRateToServer]);

  // Vigilante de medianoche (12:00 AM) para reiniciar automáticamente el día a 0
  useEffect(() => {
    const checkMidnight = setInterval(() => {
      const nowStr = getTodayLocalDateStr();
      if (nowStr !== currentDateRef.current) {
        currentDateRef.current = nowStr;
        setCurrentLocalDate(nowStr);
        refreshData();
      }
    }, 10000);
    return () => clearInterval(checkMidnight);
  }, [refreshData]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setLoading(true);
      await initDB();
      initializeSeedData();
      if (isMounted) {
        refreshData();
        setLoading(false);
      }

      // Auto-detectar y sincronizar puerto de impresora fiscal silenciosamente en segundo plano
      if (window.electronAPI && window.electronAPI.fiscal && window.electronAPI.fiscal.autoDetectPort) {
        const currentCfg = db.getFiscalSettings();
        window.electronAPI.fiscal.autoDetectPort(currentCfg?.port).then((res) => {
          const detected = res?.activePort || res?.port;
          if (isMounted && res?.success && detected) {
            const updated = db.saveFiscalSettings({ port: detected });
            setFiscalSettings({ ...updated });
          }
        }).catch(() => {});
      }
      
      // Consultar tasa oficial BCV en segundo plano sin bloquear la apertura de la ventana
      db.getExchangeRate(true).then((rate) => {
        if (isMounted && rate && Number(rate) > 100) {
          setExchangeRate(rate);
          syncRateToServer(rate);
        }
      }).catch(() => {});
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

  const deleteClient = (id) => {
    db.deleteClient(id);
    const fresh = [...(db.getClients() || [])];
    setClients(fresh);
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

  const restoreInvoice = (id) => {
    const restored = db.restoreInvoice(id);
    refreshData();
    return restored;
  };

  const deleteInvoice = (id) => {
    const res = db.deleteInvoice(id);
    refreshData();
    return res;
  };

  const deleteCashClose = (idOrDate) => {
    const res = db.deleteCashClose(idOrDate);
    refreshData();
    return res;
  };

  const clearInvoicesByDate = (dateStr) => {
    const res = db.clearInvoicesByDate(dateStr);
    refreshData();
    return res;
  };

  const updateInvoice = (id, updates) => {
    const updated = db.updateInvoice(id, updates);
    refreshData();
    return updated;
  };

  const exportBackup = () => {
    return db.exportBackupData();
  };

  const importBackup = (jsonString) => {
    const res = db.importBackupData(jsonString);
    refreshData();
    return res;
  };

  const clearAllSalesData = () => {
    db.clearAllSalesData();
    refreshData();
  };

  const toggleRestaurantMode = (enabled) => {
    const val = db.setRestaurantMode(enabled);
    setRestaurantMode(val);
    return val;
  };

  const saveOpenTab = (tabData) => {
    const saved = db.saveOpenTab(tabData);
    const tabs = [...(db.getOpenTabs() || [])];
    setOpenTabs(tabs);
    syncMonitorData({ openTabs: tabs });
    return saved;
  };

  const deleteOpenTab = (tabId) => {
    const res = db.deleteOpenTab(tabId);
    const tabs = [...(db.getOpenTabs() || [])];
    setOpenTabs(tabs);
    syncMonitorData({ openTabs: tabs });
    return res;
  };

  const updateOpenTabStatus = (tabId, status) => {
    const res = db.updateOpenTabStatus(tabId, status);
    const tabs = [...(db.getOpenTabs() || [])];
    setOpenTabs(tabs);
    syncMonitorData({ openTabs: tabs });
    return res;
  };

  const addExpense = (expenseData) => {
    const created = db.createExpense({
      ...expenseData,
      exchangeRate: expenseData?.exchangeRate || exchangeRateRef.current || 876.80
    });
    const exps = [...(db.getExpenses() || [])];
    setExpenses(exps);
    syncMonitorData({ expenses: exps });
    return created;
  };

  const deleteExpense = (id) => {
    const res = db.deleteExpense(id);
    const exps = [...(db.getExpenses() || [])];
    setExpenses(exps);
    syncMonitorData({ expenses: exps });
    return res;
  };

  const updateCloudMonitorSettings = (cfg) => {
    const updated = db.saveCloudMonitorSettings(cfg);
    setCloudMonitorSettings({ ...updated });
    syncMonitorData({ cloudMonitorSettings: updated });
    return updated;
  };

  const [fiscalSettings, setFiscalSettings] = useState(() => db.getFiscalSettings());

  const updateFiscalSettings = (newConfig) => {
    const updated = db.saveFiscalSettings(newConfig);
    setFiscalSettings({ ...updated });
    return updated;
  };

  const fiscalGetPorts = async () => {
    if (window.electronAPI && window.electronAPI.fiscal) {
      return await window.electronAPI.fiscal.getPorts();
    }
    return { success: false, error: 'No disponible fuera de Electron', ports: [] };
  };

  const fiscalAutoDetectPort = async (preferredPort = fiscalSettings?.port) => {
    if (window.electronAPI && window.electronAPI.fiscal && window.electronAPI.fiscal.autoDetectPort) {
      const res = await window.electronAPI.fiscal.autoDetectPort(preferredPort);
      const detected = res?.activePort || res?.port;
      if (res && res.success && detected) {
        updateFiscalSettings({ port: detected });
      }
      return res;
    }
    return { success: false, error: 'No disponible fuera de Electron' };
  };

  const fiscalGetLog = async () => {
    if (window.electronAPI && window.electronAPI.fiscal && window.electronAPI.fiscal.getFiscalLog) {
      return await window.electronAPI.fiscal.getFiscalLog();
    }
    return { success: false, error: 'No disponible fuera de Electron' };
  };

  const fiscalOpenLogFile = async () => {
    if (window.electronAPI && window.electronAPI.fiscal && window.electronAPI.fiscal.openLogFile) {
      return await window.electronAPI.fiscal.openLogFile();
    }
    return { success: false, error: 'No disponible fuera de Electron' };
  };

  const syncDetectedPort = (res) => {
    const detected = res?.activePort || res?.port;
    if (detected && detected !== fiscalSettings?.port) {
      updateFiscalSettings({ port: detected });
    }
    return res;
  };

  const fiscalTestConnection = async (port = fiscalSettings?.port) => {
    if (window.electronAPI && window.electronAPI.fiscal) {
      const res = await window.electronAPI.fiscal.testConnection(port || 'COM2');
      return syncDetectedPort(res);
    }
    return { success: false, error: 'No disponible fuera de Electron' };
  };

  const fiscalGetS1Status = async (port = fiscalSettings?.port) => {
    if (window.electronAPI && window.electronAPI.fiscal && window.electronAPI.fiscal.getS1Status) {
      const res = await window.electronAPI.fiscal.getS1Status(port || 'COM2');
      return syncDetectedPort(res);
    }
    return { success: false, error: 'No disponible fuera de Electron' };
  };

  const fiscalGetAuditStatus = async (port = fiscalSettings?.port) => {
    if (window.electronAPI && window.electronAPI.fiscal && window.electronAPI.fiscal.getAuditStatus) {
      const res = await window.electronAPI.fiscal.getAuditStatus(port || 'COM2');
      return syncDetectedPort(res);
    }
    return { success: false, error: 'No disponible fuera de Electron' };
  };

  const fiscalCancelInvoice = async (port = fiscalSettings?.port) => {
    if (window.electronAPI && window.electronAPI.fiscal && window.electronAPI.fiscal.cancelInvoice) {
      const res = await window.electronAPI.fiscal.cancelInvoice(port || 'COM2');
      return syncDetectedPort(res);
    }
    return { success: false, error: 'No disponible fuera de Electron' };
  };

  const fiscalPrintReportX = async (port = fiscalSettings?.port) => {
    if (window.electronAPI && window.electronAPI.fiscal) {
      const res = await window.electronAPI.fiscal.printReportX(port || 'COM2');
      return syncDetectedPort(res);
    }
    return { success: false, error: 'No disponible fuera de Electron' };
  };

  const fiscalPrintReportZ = async (port = fiscalSettings?.port) => {
    if (window.electronAPI && window.electronAPI.fiscal) {
      const res = await window.electronAPI.fiscal.printReportZ(port || 'COM2');
      return syncDetectedPort(res);
    }
    return { success: false, error: 'No disponible fuera de Electron' };
  };

  const fiscalPrintInvoice = async (invoiceData, port = fiscalSettings?.port) => {
    if (window.electronAPI && window.electronAPI.fiscal) {
      const res = await window.electronAPI.fiscal.printInvoice(port || 'COM2', invoiceData);
      return syncDetectedPort(res);
    }
    return { success: false, error: 'No disponible fuera de Electron' };
  };

  const fiscalLaunchEmulator = async () => {
    if (window.electronAPI && window.electronAPI.fiscal && window.electronAPI.fiscal.launchEmulator) {
      return await window.electronAPI.fiscal.launchEmulator();
    }
    return { success: false, error: 'No disponible fuera de Electron' };
  };

  const fiscalGetFiscalMemory = async (options = {}, port = fiscalSettings?.port) => {
    if (window.electronAPI && window.electronAPI.fiscal && window.electronAPI.fiscal.getFiscalMemory) {
      const res = await window.electronAPI.fiscal.getFiscalMemory(port || 'COM2', options);
      return syncDetectedPort(res);
    }
    return { success: false, error: 'No disponible fuera de Electron', records: [] };
  };

  const fiscalPrintFiscalMemory = async (options = {}, port = fiscalSettings?.port) => {
    if (window.electronAPI && window.electronAPI.fiscal && window.electronAPI.fiscal.printFiscalMemory) {
      const res = await window.electronAPI.fiscal.printFiscalMemory(port || 'COM2', options);
      return syncDetectedPort(res);
    }
    return { success: false, error: 'No disponible fuera de Electron' };
  };

  const addPurchase = (purchaseData) => {
    const created = db.addPurchase(purchaseData);
    setPurchases([...(db.getPurchases() || [])]);
    return created;
  };

  const updatePurchase = (id, purchaseData) => {
    const updated = db.updatePurchase(id, purchaseData);
    setPurchases([...(db.getPurchases() || [])]);
    return updated;
  };

  const deletePurchase = (id) => {
    const res = db.deletePurchase(id);
    setPurchases([...(db.getPurchases() || [])]);
    return res;
  };

  return (
    <DataContext.Provider value={{
      products,
      clients,
      invoices,
      expenses,
      addExpense,
      deleteExpense,
      cloudMonitorSettings,
      updateCloudMonitorSettings,
      purchases,
      payments,
      cashCloses,
      openTabs,
      saveOpenTab,
      deleteOpenTab,
      updateOpenTabStatus,
      exchangeRate,
      restaurantMode,
      toggleRestaurantMode,
      loading,
      addProduct,
      updateProduct,
      deleteProduct,
      addClient,
      updateClient,
      deleteClient,
      searchClients,
      createInvoice,
      updateInvoice,
      voidInvoice,
      restoreInvoice,
      deleteInvoice,
      deleteCashClose,
      clearInvoicesByDate,
      currentLocalDate,
      addPayment,
      addPurchase,
      updatePurchase,
      deletePurchase,
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
      importBackup,
      clearAllSalesData,
      fiscalSettings,
      updateFiscalSettings,
      fiscalGetPorts,
      fiscalAutoDetectPort,
      fiscalTestConnection,
      fiscalPrintReportX,
      fiscalPrintReportZ,
      fiscalPrintInvoice,
      fiscalGetS1Status,
      fiscalGetAuditStatus,
      fiscalCancelInvoice,
      fiscalLaunchEmulator,
      fiscalGetFiscalMemory,
      fiscalPrintFiscalMemory,
      fiscalGetLog,
      fiscalOpenLogFile
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
