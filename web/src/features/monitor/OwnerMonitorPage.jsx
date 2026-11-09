import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  DollarSign,
  TrendingUp,
  Smartphone,
  CreditCard,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Download,
  Receipt,
  FileSpreadsheet,
  X,
  Copy,
  Check,
  Sparkles,
  Printer,
  Calendar,
  Filter,
  ArrowUpRight,
  ShoppingBag,
  Eye,
  Search,
  Banknote,
  ArrowDownRight,
  Percent,
  UtensilsCrossed,
  Image as ImageIcon,
  UploadCloud
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import LoginForm from '../auth/LoginForm';
import { supabase } from '../../lib/supabase';
import { db } from '../../pos-core/services/dataService';
import InvoicePreview from '../../pos-core/components/InvoicePreview';
import { BankLogo, findBank } from '../../pos-core/utils/venezuelaBanks';
import {
  fetchMyTenant,
  fetchTenantSnapshot,
  fetchSaasConfig,
  fetchMyPayments,
  submitOwnerPagoMovil,
  compressReceiptImage,
  completeFiscalVerification,
  updateTenantFiscalProfile,
  formatRifSeniat,
  getLocalTerminalConfig,
  saveLocalTerminalConfig
} from './api';

const INSTALLER_URL = import.meta.env.VITE_INSTALLER_URL || 'https://github.com/halinyer/FacturasYa/releases/latest/download/FacturaPOS-1.0.0.exe';

const VENEZUELA_BANKS = [
  '0102 - Banco de Venezuela',
  '0108 - Banco Provincial (BBVA)',
  '0134 - Banesco',
  '0105 - Banco Mercantil',
  '0172 - Bancamiga',
  '0114 - Bancaribe',
  '0116 - Banco Occidental de Descuento (BNC)',
  '0175 - Banco Bicentenario',
  '0163 - Banco del Tesoro',
  '0166 - Banco Agrícola de Venezuela',
  '0174 - Banplus',
  '0138 - Banco Plaza',
  '0151 - Banco Fondo Común (BFC)',
  '0157 - DelSur Banco Universal',
  '0171 - Banco Activo'
];

function formatBs(val) {
  return 'Bs. ' + Number(val || 0).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatUsd(val) {
  return '$' + Number(val || 0).toFixed(2);
}

export default function OwnerMonitorPage({ embedded = false, defaultTab = 'overview', onTenantChange }) {
  const { session, isAdmin, loading: authLoading, signOut } = useAuth();
  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI);
  const [tenant, setTenant] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [saasConfig, setSaasConfig] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab);
  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab]); // 'overview' | 'tables' | 'invoices' | 'expenses' | 'inventory' | 'subscription'
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [selectedInvoiceForPreview, setSelectedInvoiceForPreview] = useState(null);

  // Moneda activa de visualización: 'USD' | 'BS'
  const [currencyView, setCurrencyView] = useState(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem('pos_owner_currency') || 'USD') : 'USD';
  });
  const toggleCurrency = (curr) => {
    setCurrencyView(curr);
    try { localStorage.setItem('pos_owner_currency', curr); } catch (e) {}
  };

  // Filtro de período dinámico estilo Happy Days y SalesDashboard
  const todayLocalDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [dateRange, setDateRange] = useState('today'); // 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  const [customStartDate, setCustomStartDate] = useState(todayLocalDateStr);
  const [customEndDate, setCustomEndDate] = useState(todayLocalDateStr);
  const [searchInvoiceQuery, setSearchInvoiceQuery] = useState('');

  // Verificación Fiscal Híbrida SENIAT (Auto-Lectura S1 + Manual)
  const [fiscalModalOpen, setFiscalModalOpen] = useState(false);
  const [fiscalForm, setFiscalForm] = useState({
    name: '',
    legalName: '',
    rif: '',
    fiscalAddress: '',
    phone: '',
    fiscalSerial: '',
    instagram: ''
  });
  const [fiscalSubmitting, setFiscalSubmitting] = useState(false);
  const [readingS1, setReadingS1] = useState(false);
  const [fiscalError, setFiscalError] = useState('');
  const [fiscalSuccessMsg, setFiscalSuccessMsg] = useState('');

  // Sincronizar formulario cuando se cargue el restaurante
  useEffect(() => {
    if (tenant) {
      const localTerm = getLocalTerminalConfig();
      setFiscalForm({
        name: tenant.name || '',
        legalName: tenant.legal_name || '',
        rif: tenant.rif || '',
        fiscalAddress: tenant.fiscal_address || '',
        phone: tenant.phone || '',
        fiscalSerial: tenant.fiscal_serial || localTerm.fiscalSerial || '',
        instagram: tenant.instagram || ''
      });
    }
  }, [tenant]);

  const handleReadFromFiscalPrinter = async () => {
    if (!isElectron || !window.electronAPI?.fiscal?.getS1Status) {
      setFiscalError('La lectura automática por cable serial solo está disponible desde la app de escritorio (.exe). Puedes completar los campos manualmente.');
      return;
    }
    setReadingS1(true);
    setFiscalError('');
    setFiscalSuccessMsg('');
    try {
      const localTerm = getLocalTerminalConfig();
      const port = localTerm.port || 'COM4';
      const s1 = await window.electronAPI.fiscal.getS1Status(port);
      if (s1 && s1.success) {
        const formattedRif = s1.rif ? formatRifSeniat(s1.rif) : fiscalForm.rif;
        const detectedSerial = (s1.registeredMachineNumber || '').trim().toUpperCase();
        setFiscalForm((prev) => ({
          ...prev,
          rif: formattedRif || prev.rif,
          fiscalSerial: detectedSerial || prev.fiscalSerial
        }));
        if (detectedSerial) {
          saveLocalTerminalConfig({ fiscalSerial: detectedSerial });
        }
        setFiscalSuccessMsg(
          `¡Chip Fiscal leído en ${port}! RIF: ${formattedRif || '—'} · Serial Máquina: ${detectedSerial || '—'}. Completa tu Razón Social y Domicilio Fiscal para finalizar.`
        );
      } else {
        setFiscalError(
          s1?.error || `No se pudo leer el Estado S1 en ${port}. Verifica que la impresora HKA80 esté encendida o ingresa los datos manualmente.`
        );
      }
    } catch (err) {
      setFiscalError('Error al consultar la impresora fiscal: ' + (err.message || 'Verifica el puerto COM'));
    } finally {
      setReadingS1(false);
    }
  };

  const handleFiscalSubmit = async (e) => {
    e.preventDefault();
    setFiscalSubmitting(true);
    setFiscalError('');
    setFiscalSuccessMsg('');

    try {
      const serialClean = fiscalForm.fiscalSerial.trim().toUpperCase();
      const updated = await completeFiscalVerification({
        tenantId: tenant.id,
        name: fiscalForm.name.trim(),
        legalName: fiscalForm.legalName.trim(),
        rif: formatRifSeniat(fiscalForm.rif),
        fiscalAddress: fiscalForm.fiscalAddress.trim(),
        phone: fiscalForm.phone.trim(),
        fiscalSerial: serialClean,
        instagram: fiscalForm.instagram.trim()
      });

      if (serialClean) {
        saveLocalTerminalConfig({ fiscalSerial: serialClean });
      }
      setTenant(updated);
      if (onTenantChange) onTenantChange(updated);
      setFiscalSuccessMsg('¡Datos fiscales SENIAT verificados! Tu negocio y tus Libros de Ventas SENIAT están activos.');
      setTimeout(() => {
        setFiscalModalOpen(false);
        setFiscalSuccessMsg('');
      }, 1800);
    } catch (err) {
      setFiscalError(err.message || 'Error al verificar datos fiscales.');
    } finally {
      setFiscalSubmitting(false);
    }
  };

  const handleDownloadInstaller = () => {
    if (!tenant?.is_fiscal_verified) {
      setFiscalModalOpen(true);
      return;
    }
    window.open(INSTALLER_URL, '_blank');
  };

  // Modal de Pago Móvil / Binance Pay para el dueño
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly'); // 'monthly' | 'annual'
  const [pagoMethod, setPagoMethod] = useState('pago_movil'); // 'pago_movil' | 'binance'
  const [pagoBank, setPagoBank] = useState(VENEZUELA_BANKS[0]);
  const [pagoPhone, setPagoPhone] = useState('');
  const [pagoPayerDoc, setPagoPayerDoc] = useState('');
  const [pagoRef, setPagoRef] = useState('');
  const [pagoReceiptFile, setPagoReceiptFile] = useState(null);
  const [pagoReceiptPreview, setPagoReceiptPreview] = useState('');
  const [selectedReceiptModal, setSelectedReceiptModal] = useState(null);
  const [pagoSubmitting, setPagoSubmitting] = useState(false);
  const [pagoError, setPagoError] = useState('');
  const [pagoSuccessMsg, setPagoSuccessMsg] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  const handleMonitorReceiptFile = async (file) => {
    if (!file) return;
    try {
      const compressedDataUrl = await compressReceiptImage(file);
      setPagoReceiptFile(file);
      setPagoReceiptPreview(compressedDataUrl);
      setPagoError('');
    } catch (e) {
      setPagoError(e.message || 'Error procesando la imagen');
    }
  };

  const handleMonitorPaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          await handleMonitorReceiptFile(file);
          break;
        }
      }
    }
  };

  // Carga inicial de datos
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tData, cfg] = await Promise.all([fetchMyTenant(), fetchSaasConfig().catch(() => null)]);
      setTenant(tData);
      setSaasConfig(cfg);

      if (tData) {
        const [snap, pays] = await Promise.all([
          fetchTenantSnapshot(tData.id).catch(() => null),
          fetchMyPayments(tData.id).catch(() => [])
        ]);
        setSnapshot(snap);
        setPayments(pays);
        setLastSyncTime(new Date());
      }
    } catch (e) {
      console.warn('Error cargando datos del monitor:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session, loadData]);

  // Suscripción en Tiempo Real (Supabase Realtime)
  useEffect(() => {
    if (!tenant?.id) return;

    const channel = supabase
      .channel(`owner_monitor_${tenant.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenant_snapshots', filter: `tenant_id=eq.${tenant.id}` },
        (payload) => {
          if (payload.new) {
            setSnapshot(payload.new);
            setLastSyncTime(new Date());
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenants', filter: `id=eq.${tenant.id}` },
        (payload) => {
          if (payload.new) {
            setTenant(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscription_payments', filter: `tenant_id=eq.${tenant.id}` },
        () => {
          fetchMyPayments(tenant.id).then(setPayments).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id]);

  // Cálculos de métricas del día y Tasa BCV Oficial en Vivo
  const [liveBcvRate, setLiveBcvRate] = useState(null);
  const [syncingBcv, setSyncingBcv] = useState(false);

  const syncLiveBcvRate = useCallback(async (force = true) => {
    try {
      setSyncingBcv(true);
      const fetched = await db.getExchangeRate(force);
      if (fetched && Number(fetched) > 10) {
        setLiveBcvRate(Number(fetched));
        if (tenant?.id && supabase) {
          supabase.from('tenants').update({ exchange_rate: Number(fetched) }).eq('id', tenant.id).then(() => {});
        }
      }
    } catch (e) {
    } finally {
      setSyncingBcv(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    syncLiveBcvRate(false);
  }, [syncLiveBcvRate]);

  const rate =
    Number(liveBcvRate) ||
    (Number(snapshot?.exchange_rate) !== 876.8 ? Number(snapshot?.exchange_rate) : 0) ||
    (Number(tenant?.exchange_rate) !== 876.8 ? Number(tenant?.exchange_rate) : 0) ||
    Number(snapshot?.exchange_rate) ||
    Number(tenant?.exchange_rate) ||
    896.12;

  // Carga de respaldo local (offline first) por si el snapshot aún no tiene datos o la PC está en red local
  const localFallback = useMemo(() => {
    if (typeof window === 'undefined') return { invoices: [], expenses: [], openTabs: [], products: [] };
    try {
      const invs = JSON.parse(localStorage.getItem('pos_invoices') || '[]');
      const exps = JSON.parse(localStorage.getItem('pos_expenses') || '[]');
      const tabs = JSON.parse(localStorage.getItem('pos_open_tabs') || '[]');
      const prods = JSON.parse(localStorage.getItem('pos_products') || '[]');
      return { invoices: invs, expenses: exps, openTabs: tabs, products: prods };
    } catch (e) {
      return { invoices: [], expenses: [], openTabs: [], products: [] };
    }
  }, []);

  // Consolidar fuentes de datos (Snapshot Cloud + Local Fallback)
  const allInvoices = useMemo(() => {
    if (Array.isArray(snapshot?.invoices) && snapshot.invoices.length > 0) {
      return snapshot.invoices;
    }
    return localFallback.invoices || [];
  }, [snapshot?.invoices, localFallback.invoices]);

  const allExpenses = useMemo(() => {
    if (Array.isArray(snapshot?.expenses) && snapshot.expenses.length > 0) {
      return snapshot.expenses;
    }
    return localFallback.expenses || [];
  }, [snapshot?.expenses, localFallback.expenses]);

  const allOpenTabs = useMemo(() => {
    if (Array.isArray(snapshot?.open_tabs) && snapshot.open_tabs.length > 0) {
      return snapshot.open_tabs;
    }
    if (Array.isArray(snapshot?.openTabs) && snapshot.openTabs.length > 0) {
      return snapshot.openTabs;
    }
    return localFallback.openTabs || [];
  }, [snapshot?.open_tabs, snapshot?.openTabs, localFallback.openTabs]);

  const formatPrimary = useCallback((usd, bs) => {
    return currencyView === 'USD' ? formatUsd(usd) : formatBs(bs);
  }, [currencyView]);

  const formatSecondary = useCallback((usd, bs) => {
    return currencyView === 'USD' ? formatBs(bs) : formatUsd(usd);
  }, [currencyView]);


  // Filtrado de Facturas según el período seleccionado
  const filteredInvoices = useMemo(() => {
    return (allInvoices || []).filter((inv) => {
      if (!inv.date) return true;
      const invDateStr = inv.date.includes('T') ? inv.date.split('T')[0] : String(inv.date).slice(0, 10);

      if (dateRange === 'today') {
        if (invDateStr !== todayLocalDateStr) return false;
      } else if (dateRange === 'yesterday') {
        if (invDateStr !== yesterdayStr) return false;
      } else if (dateRange === 'week') {
        const invTime = new Date(inv.date).getTime();
        const diffDays = (Date.now() - invTime) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (dateRange === 'month') {
        const invTime = new Date(inv.date).getTime();
        const diffDays = (Date.now() - invTime) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) return false;
      } else if (dateRange === 'custom') {
        if (customStartDate && invDateStr < customStartDate) return false;
        if (customEndDate && invDateStr > customEndDate) return false;
      }

      if (searchInvoiceQuery.trim()) {
        const q = searchInvoiceQuery.toLowerCase();
        const client = String(inv.client?.name || inv.clientName || '').toLowerCase();
        const rif = String(inv.client?.rif || inv.clientRif || '').toLowerCase();
        const num = String(inv.invoiceNumber || inv.id || inv.number || '').toLowerCase();
        return client.includes(q) || rif.includes(q) || num.includes(q);
      }

      return true;
    });
  }, [allInvoices, dateRange, todayLocalDateStr, yesterdayStr, customStartDate, customEndDate, searchInvoiceQuery]);

  // Alias para retrocompatibilidad
  const todayInvoices = filteredInvoices;

  // Filtrado de Gastos según el mismo período
  const filteredExpenses = useMemo(() => {
    return (allExpenses || []).filter((exp) => {
      if (!exp.date && !exp.createdAt) return true;
      const expDate = (exp.date || exp.createdAt || '').slice(0, 10);

      if (dateRange === 'today') {
        if (expDate !== todayLocalDateStr) return false;
      } else if (dateRange === 'yesterday') {
        if (expDate !== yesterdayStr) return false;
      } else if (dateRange === 'week') {
        const expTime = new Date(exp.date || exp.createdAt).getTime();
        const diffDays = (Date.now() - expTime) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (dateRange === 'month') {
        const expTime = new Date(exp.date || exp.createdAt).getTime();
        const diffDays = (Date.now() - expTime) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) return false;
      } else if (dateRange === 'custom') {
        if (customStartDate && expDate < customStartDate) return false;
        if (customEndDate && expDate > customEndDate) return false;
      }
      return true;
    });
  }, [allExpenses, dateRange, todayLocalDateStr, yesterdayStr, customStartDate, customEndDate]);

  // KPIs y Desglose Financiero Completo con soporte para Pagos Mixtos
  const kpis = useMemo(() => {
    let totalSalesUsd = 0;
    let totalSalesBs = 0;
    let validCount = 0;
    let voidedCount = 0;

    let cashUsd = 0;
    let cashBs = 0;
    let pagoMovilBs = 0;
    let posBs = 0;
    let zelleUsd = 0;
    let otherUsd = 0;

    filteredInvoices.forEach((inv) => {
      const stat = (inv.status || '').toLowerCase();
      const isVoided = stat === 'voided' || stat === 'anulada';
      if (isVoided) {
        voidedCount++;
        return;
      }
      validCount++;

      const invUsd = Number(inv.total || inv.totalUSD || inv.totalUsd || inv.totalAmount || 0);
      const invRate = Number(inv.exchangeRate) || rate;
      const invBs = Number(inv.totalBs || invUsd * invRate);

      totalSalesUsd += invUsd;
      totalSalesBs += invBs;

      const method = (inv.paymentMethod || '').toLowerCase();
      if (method === 'mixto') {
        // Desglose multi-tender idéntico al POS y Dashboard
        const cUsd = Number(inv.paymentDetails?.cashUsd || 0);
        const cBs = Number(inv.paymentDetails?.cashBs || 0);
        const pBs = Number(inv.paymentDetails?.pagoMovilBs || 0);
        const ptBs = Number(inv.paymentDetails?.puntoBs || 0);
        const zUsd = Number(inv.paymentDetails?.zelleUsd || 0);
        cashUsd += cUsd;
        cashBs += cBs;
        pagoMovilBs += pBs;
        posBs += ptBs;
        zelleUsd += zUsd;
      } else if (method.includes('efectivo') || method.includes('cash') || method.includes('dolar')) {
        if (method.includes('bs')) {
          cashBs += invBs;
        } else {
          cashUsd += invUsd;
        }
      } else if (method.includes('movil') || method.includes('pago')) {
        pagoMovilBs += invBs;
      } else if (method.includes('punto') || method.includes('debito') || method.includes('tarjeta') || method.includes('pos')) {
        posBs += invBs;
      } else if (method.includes('zelle')) {
        zelleUsd += invUsd;
      } else {
        otherUsd += invUsd;
      }
    });

    // Gastos acumulados del período
    let totalExpensesUsd = 0;
    let totalExpensesBs = 0;
    filteredExpenses.forEach((exp) => {
      const usd = Number(exp.amountUsd || exp.totalUSD || 0);
      const bs = Number(exp.amountBs || exp.totalBs || 0);
      if (usd > 0) {
        totalExpensesUsd += usd;
        totalExpensesBs += bs > 0 ? bs : usd * rate;
      } else if (bs > 0) {
        totalExpensesBs += bs;
        totalExpensesUsd += bs / rate;
      }
    });

    const netCashUsd = totalSalesUsd - totalExpensesUsd;
    const netCashBs = totalSalesBs - totalExpensesBs;
    const avgTicketUsd = validCount > 0 ? totalSalesUsd / validCount : 0;
    const avgTicketBs = validCount > 0 ? totalSalesBs / validCount : 0;

    const openTabsCount = allOpenTabs.length;
    const openTabsTotalUsd = allOpenTabs.reduce((sum, tab) => sum + Number(tab.total || tab.subtotal || 0), 0);
    const openTabsTotalBs = openTabsTotalUsd * rate;

    return {
      totalSalesUsd,
      totalSalesBs,
      totalExpensesUsd,
      totalExpensesBs,
      netCashUsd,
      netCashBs,
      avgTicketUsd,
      avgTicketBs,
      validCount,
      voidedCount,
      totalCount: filteredInvoices.length,
      cashUsd,
      cashBs,
      pagoMovilBs,
      posBs,
      zelleUsd,
      otherUsd,
      openTabsCount,
      openTabsTotalUsd,
      openTabsTotalBs,
      invoicesCount: validCount
    };
  }, [filteredInvoices, filteredExpenses, allOpenTabs, rate]);

  // Ranking de "Los Items" / Productos Estrella más vendidos
  const topProducts = useMemo(() => {
    const map = new Map();
    let totalQty = 0;

    filteredInvoices.forEach((inv) => {
      const stat = (inv.status || '').toLowerCase();
      if (stat === 'voided' || stat === 'anulada') return;

      const items = inv.items || inv.products || [];
      items.forEach((it) => {
        const id = it.id || it.productId || it.name;
        const name = it.name || 'Producto';
        const qty = Number(it.qty || it.quantity || 1);
        const priceUsd = Number(it.priceUsd ?? it.priceUSD ?? it.unitPrice ?? it.price ?? 0);
        const invRate = Number(inv.exchangeRate) || rate;
        const totalUsd = Number(it.totalUsd ?? it.totalUSD ?? (priceUsd * qty));
        const totalBs = Number(it.totalBs || totalUsd * invRate);

        totalQty += qty;

        if (map.has(id)) {
          const prev = map.get(id);
          prev.qty += qty;
          prev.totalUsd += totalUsd;
          prev.totalBs += totalBs;
        } else {
          map.set(id, { id, name, qty, totalUsd, totalBs, priceUsd });
        }
      });
    });

    const list = Array.from(map.values());
    list.sort((a, b) => b.qty - a.qty);
    const top6 = list.slice(0, 6);
    const maxQty = top6.length > 0 ? top6[0].qty : 1;

    return top6.map((it) => ({
      ...it,
      percentage: Math.round((it.qty / (totalQty || 1)) * 100),
      barWidth: Math.round((it.qty / maxQty) * 100)
    }));
  }, [filteredInvoices, rate]);

  // Días restantes de suscripción SaaS
  const subStatus = useMemo(() => {
    if (!tenant) return null;
    const now = Date.now();
    const validUntilMs = tenant.valid_until ? new Date(tenant.valid_until).getTime() : now;
    const diffDays = Math.ceil((validUntilMs - now) / (86400 * 1000));
    const isExpired = tenant.status === 'past_due' || tenant.status === 'suspended' || diffDays <= 0;
    const isWarning = !isExpired && diffDays <= 3;

    return {
      daysRemaining: Math.max(0, diffDays),
      isExpired,
      isWarning,
      isSuspended: tenant.status === 'suspended',
      validUntilDate: new Date(validUntilMs),
      plan: tenant.plan || 'trial'
    };
  }, [tenant]);

  const copyToClipboard = (text, fieldKey) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePagoSubmit = async (e) => {
    e.preventDefault();
    setPagoSubmitting(true);
    setPagoError('');
    setPagoSuccessMsg('');

    try {
      const priceUsd = selectedPlan === 'annual'
        ? Number(saasConfig?.annual_price_usd || 300)
        : Number(saasConfig?.monthly_price_usd || 30);
      const amountBs = priceUsd * rate;

      await submitOwnerPagoMovil({
        tenantId: tenant.id,
        tenantName: tenant.name,
        plan: selectedPlan,
        paymentMethod: pagoMethod,
        amountUsd: priceUsd,
        amountBs,
        rateBcv: rate,
        bankOrigin: pagoMethod === 'binance' ? 'Binance Pay (USDT)' : pagoBank,
        phoneOrigin: pagoMethod === 'binance' ? (session?.user?.email || 'USDT') : pagoPhone,
        payerDoc: pagoPayerDoc || tenant?.rif || '',
        referenceLast6: pagoRef,
        receiptFile: pagoReceiptFile,
        receiptDataUrl: pagoReceiptPreview,
        autoVerifyProvider: saasConfig?.auto_verify_provider || 'manual'
      });

      const updatedPays = await fetchMyPayments(tenant.id).catch(() => payments);
      setPayments(updatedPays);

      setPagoSuccessMsg('¡Pago reportado con éxito! Tu caja cuenta con Pase de Cortesía activo mientras se verifica la referencia.');
      setPagoRef('');
      setPagoReceiptFile(null);
      setPagoReceiptPreview('');
      setTimeout(() => {
        setPagoModalOpen(false);
        setPagoSuccessMsg('');
      }, 3500);
    } catch (err) {
      setPagoError(err.message || 'Error reportando el pago.');
    } finally {
      setPagoSubmitting(false);
    }
  };

  // 1. Pantalla de carga
  if (authLoading || (loading && session)) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-zinc-500 font-medium">Conectando con tu restaurante en vivo...</p>
        </div>
      </div>
    );
  }

  // 2. Pantalla de inicio de sesión si no está autenticado
  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white font-bold flex items-center justify-center mx-auto shadow-sm">
              FY
            </div>
            <h1 className="text-lg font-bold text-zinc-950">Monitor Cloud del Dueño</h1>
            <p className="text-xs text-zinc-500">
              Inicia sesión con tu correo para monitorear tu local en tiempo real desde tu teléfono.
            </p>
          </div>
          <LoginForm title="Entrar a mi Restaurante" />
          <div className="text-center">
            <Link to="/" className="text-xs text-zinc-500 hover:text-zinc-900 font-medium">
              ← Volver al sitio principal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Caso cuando el usuario aún no tiene un restaurante registrado
  if (!tenant) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Store size={24} />
          </div>
          <h2 className="text-base font-bold text-zinc-950">No hay restaurante vinculado</h2>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Tu cuenta de usuario no tiene asignado un restaurante todavía. Registra tu local desde la página de inicio para activar tus 14 días gratis.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            {isAdmin && (
              <Link to="/super-admin" className="btn primary">
                🛡️ Ir a Consola Super Admin
              </Link>
            )}
            <Link to="/" className="btn primary">Registrar mi restaurante</Link>
            <button onClick={signOut} className="btn">Cerrar sesión</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased pb-16">
      
      {/* HEADER PRINCIPAL */}
      {!embedded && (
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-zinc-200/80">
        <div className="max-w-5xl mx-auto px-4 h-15 flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
              FY
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-zinc-950 truncate max-w-[180px] sm:max-w-none">
                  {tenant.name}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  En Vivo
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 inline-flex items-center gap-1.5">
                <span>{tenant.rif || 'RIF pendiente'} · Tasa BCV:</span>
                <strong className="text-zinc-800 mono-num">{rate.toFixed(2)} Bs/$</strong>
                <button
                  type="button"
                  onClick={() => syncLiveBcvRate(true)}
                  disabled={syncingBcv}
                  className="p-0.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer"
                  title="Sincronizar con BCV en vivo"
                >
                  <RefreshCw size={11} className={syncingBcv ? 'animate-spin text-emerald-600' : ''} />
                </button>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                to="/super-admin"
                className="px-2.5 py-1 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-bold inline-flex items-center gap-1 transition-colors"
                title="Abrir Consola Super Admin SaaS"
              >
                <ShieldCheck size={12} />
                <span>Super Admin</span>
              </Link>
            )}
            {/* Indicador de Suscripción */}
            {subStatus?.isExpired ? (
              <button
                type="button"
                onClick={() => setPagoModalOpen(true)}
                className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold inline-flex items-center gap-1 animate-pulse"
              >
                <AlertTriangle size={12} />
                <span>Vencido · Pagar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('subscription')}
                className={`px-2.5 py-1 rounded-full border text-xs font-semibold inline-flex items-center gap-1 ${
                  subStatus?.isWarning
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}
              >
                <span>{subStatus?.daysRemaining}d restantes</span>
              </button>
            )}

            <button
              type="button"
              onClick={signOut}
              title="Cerrar sesión"
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>

        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto border-t border-zinc-100 text-xs font-semibold py-1.5 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'overview'
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            Resumen General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'tables'
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <span>Mesas Activas</span>
            {kpis.openTabsCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'tables' ? 'bg-zinc-800 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {kpis.openTabsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'invoices'
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <span>Facturas</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'invoices' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-800'
            }`}>
              {kpis.totalCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'expenses'
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <span>Gastos & Caja</span>
            {filteredExpenses.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'expenses' ? 'bg-zinc-800 text-white' : 'bg-rose-100 text-rose-800'
              }`}>
                {filteredExpenses.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'inventory'
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            Inventario & Mermas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subscription')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'subscription'
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            Suscripción SaaS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fiscal')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'fiscal'
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <ShieldCheck size={13} className={tenant?.is_fiscal_verified ? 'text-emerald-500' : 'text-amber-500'} />
            <span>Datos Fiscales SENIAT</span>
            {!tenant?.is_fiscal_verified && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            )}
          </button>
        </div>
      </header>
      )}

      {/* BANNER DE VERIFICACIÓN FISCAL (ESTILO BINANCE KYC / ONBOARDING PROGRESIVO) */}
      {!tenant?.is_fiscal_verified && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-200/80 px-4 py-3">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-amber-950">
                    Verificación Fiscal del Negocio Pendiente
                  </h4>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Modo Exploración
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/90 leading-tight mt-0.5">
                  Registra tu RIF, Razón Social SENIAT y Domicilio Fiscal para activar tus 14 días de prueba y descargar el instalador .exe de tu caja.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFiscalModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all shrink-0 inline-flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Sparkles size={13} />
              <span>Verificar Negocio (1 min)</span>
            </button>
          </div>
        </div>
      )}

      {/* BANNER DE AVISO SI FALTA POCO O VENCIÓ */}
      {subStatus?.isExpired && (
        <div className="bg-red-500 text-white text-xs px-4 py-2 font-semibold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full justify-between">
            <span className="flex items-center gap-1.5">
              <AlertTriangle size={15} />
              Tu suscripción mensual venció. Realiza tu Pago Móvil para reactivar la emisión de facturas.
            </span>
            <button
              type="button"
              onClick={() => setPagoModalOpen(true)}
              className="px-3 py-1 rounded bg-white text-red-600 font-bold hover:bg-zinc-100 whitespace-nowrap"
            >
              Pagar Ahora
            </button>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">

        {/* BARRA DE FILTROS DE PERÍODO Y MONEDA ESTILO HAPPY DAYS & SALES DASHBOARD */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-zinc-200/90 shadow-2xs">
          {/* Chips de Selección de Período */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            <span className="text-zinc-400 font-semibold flex items-center gap-1 mr-1 text-[11px] shrink-0">
              <Calendar size={13} />
              <span>Período:</span>
            </span>
            {[
              { id: 'today', label: 'Hoy' },
              { id: 'yesterday', label: 'Ayer' },
              { id: 'week', label: 'Esta Semana' },
              { id: 'month', label: 'Este Mes' },
              { id: 'custom', label: 'Personalizado' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDateRange(p.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  dateRange === p.id
                    ? 'bg-zinc-950 text-white shadow-2xs'
                    : 'bg-zinc-100 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/70'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Rango de Fechas si es Personalizado + Toggle Moneda */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
            {dateRange === 'custom' && (
              <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="font-semibold bg-transparent text-zinc-800 focus:outline-none cursor-pointer"
                />
                <span className="text-zinc-400">a</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="font-semibold bg-transparent text-zinc-800 focus:outline-none cursor-pointer"
                />
              </div>
            )}

            {/* Toggle Moneda de Visualización */}
            <div className="flex items-center bg-zinc-100 p-1 rounded-xl text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => toggleCurrency('USD')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  currencyView === 'USD'
                    ? 'bg-white text-zinc-950 shadow-2xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                $ USD
              </button>
              <button
                type="button"
                onClick={() => toggleCurrency('BS')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  currencyView === 'BS'
                    ? 'bg-white text-zinc-950 shadow-2xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Bs.
              </button>
            </div>
          </div>
        </div>

        {/* HERO CARD: CAJA NETA REAL (INGRESOS FACTURADOS - GASTOS) */}
        <section className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 text-white rounded-2xl p-6 shadow-sm border border-zinc-800 relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-xs uppercase tracking-wider font-extrabold text-zinc-300">
                Caja Neta Real ({dateRange === 'today' ? 'Hoy' : dateRange === 'yesterday' ? 'Ayer' : dateRange === 'week' ? 'Esta Semana' : dateRange === 'month' ? 'Este Mes' : 'Período'})
              </span>
            </div>
            <span className="text-xs text-zinc-400 font-medium">
              Ventas Cobradas − Gastos Registrados
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mono-num">
                {formatPrimary(kpis.netCashUsd, kpis.netCashBs)}
              </div>
              <div className="text-sm text-zinc-400 font-semibold mono-num mt-0.5">
                ≈ {formatSecondary(kpis.netCashUsd, kpis.netCashBs)}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-zinc-800/80 text-zinc-200 text-xs font-semibold border border-zinc-700/60 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>{kpis.validCount} {kpis.validCount === 1 ? 'venta cobrada' : 'ventas cobradas'}</span>
              </span>
              {kpis.voidedCount > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-950/60 text-rose-300 text-xs font-semibold border border-rose-800/40">
                  {kpis.voidedCount} anulada(s)
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-zinc-800/80 text-xs">
            <div>
              <span className="text-zinc-400 block text-[11px] font-medium">(+) Ingresos Facturados:</span>
              <span className="font-extrabold text-emerald-400 text-sm mono-num">
                +{formatPrimary(kpis.totalSalesUsd, kpis.totalSalesBs)}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[11px] font-medium">(-) Gastos / Salidas:</span>
              <span className="font-extrabold text-rose-400 text-sm mono-num">
                -{formatPrimary(kpis.totalExpensesUsd, kpis.totalExpensesBs)}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-zinc-400 block text-[11px] font-medium">Consumo en Mesas Activas:</span>
              <span className="font-extrabold text-zinc-200 text-sm mono-num">
                {formatPrimary(kpis.openTabsTotalUsd, kpis.openTabsTotalBs)} ({kpis.openTabsCount})
              </span>
            </div>
          </div>
        </section>

        {/* METRICS 4 FINANCIAL KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          
          <div className="p-4 rounded-xl bg-white border border-zinc-200/90 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Ventas Período
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-zinc-950 mono-num">
              {formatPrimary(kpis.totalSalesUsd, kpis.totalSalesBs)}
            </div>
            <span className="text-xs text-zinc-500 font-medium block mono-num">
              ≈ {formatSecondary(kpis.totalSalesUsd, kpis.totalSalesBs)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-zinc-200/90 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Ticket Promedio
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-zinc-950 mono-num">
              {formatPrimary(kpis.avgTicketUsd, kpis.avgTicketBs)}
            </div>
            <span className="text-xs text-zinc-400 font-medium block">
              Por cliente / factura emitida
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-zinc-200/90 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Efectivo en Gaveta
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mono-num">
              {formatUsd(kpis.cashUsd)}
            </div>
            <span className="text-xs text-zinc-500 font-medium block mono-num">
              {kpis.cashBs > 0 ? `+ ${formatBs(kpis.cashBs)}` : 'Gaveta física en caja'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-zinc-200/90 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Pago Móvil & Bancos
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-zinc-950 mono-num">
              {formatBs(kpis.pagoMovilBs + kpis.posBs)}
            </div>
            <span className="text-xs text-zinc-500 font-medium block mono-num">
              ≈ {formatUsd((kpis.pagoMovilBs + kpis.posBs) / rate)}
            </span>
          </div>

        </div>

        {/* SI AÚN NO SE HA REGISTRADO EL PRIMER SNAPSHOT DESDE LA CAJA NI VENTAS */}
        {!snapshot && allInvoices.length === 0 && (
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 text-center space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-600">
              <Download size={22} />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <div className="flex items-center justify-center gap-2">
                <h3 className="font-bold text-sm text-zinc-950">Esperando primer inicio de sesión en tu PC</h3>
                {tenant?.is_fiscal_verified ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    Verificado SENIAT
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                    Verificación Requerida
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {tenant?.is_fiscal_verified
                  ? <>Abre el instalador en la computadora de tu caja e inicia sesión con tu correo (<strong>{session.user.email}</strong>). Al facturar la primera cuenta, verás los datos en vivo aquí.</>
                  : <>Completa la verificación fiscal de tu RIF y Razón Social para desbloquear la descarga del instalador de caja y activar tu periodo de 14 días.</>}
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleDownloadInstaller}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all ${
                tenant?.is_fiscal_verified
                  ? 'bg-zinc-950 text-white hover:bg-zinc-800'
                  : 'bg-amber-600 text-white hover:bg-amber-700'
              }`}
            >
              <Download size={15} />
              <span>
                {tenant?.is_fiscal_verified
                  ? 'Descargar FacturaPOS para Windows (.exe)'
                  : 'Completar Verificación para Descargar (.exe)'}
              </span>
            </button>
          </div>
        )}

        {/* PESTAÑA 1: RESUMEN GENERAL (OVERVIEW) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Desglose de Ventas por Método de Pago */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Desglose de Caja por Canal de Cobro</h3>
                  <p className="text-xs text-zinc-500">Conciliación neta de entradas según método receptor:</p>
                </div>
                <span className="text-xs font-semibold text-zinc-600 mono-num">
                  {kpis.validCount} {kpis.validCount === 1 ? 'factura' : 'facturas'}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                  <span className="text-zinc-500 font-medium">Efectivo Divisas ($)</span>
                  <div className="font-extrabold text-base text-zinc-950 mono-num">
                    {formatUsd(kpis.cashUsd)}
                  </div>
                  <span className="text-[11px] text-zinc-400 mono-num">
                    ≈ {formatBs(kpis.cashUsd * rate)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                  <span className="text-zinc-500 font-medium">Pago Móvil (Bolívares)</span>
                  <div className="font-extrabold text-base text-zinc-950 mono-num">
                    {formatBs(kpis.pagoMovilBs)}
                  </div>
                  <span className="text-[11px] text-zinc-400 mono-num">
                    ≈ {formatUsd(kpis.pagoMovilBs / rate)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                  <span className="text-zinc-500 font-medium">Punto de Venta (Tarjeta)</span>
                  <div className="font-extrabold text-base text-zinc-950 mono-num">
                    {formatBs(kpis.posBs)}
                  </div>
                  <span className="text-[11px] text-zinc-400 mono-num">
                    ≈ {formatUsd(kpis.posBs / rate)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                  <span className="text-zinc-500 font-medium">Zelle & Transferencia ($)</span>
                  <div className="font-extrabold text-base text-zinc-950 mono-num">
                    {formatUsd(kpis.zelleUsd + kpis.otherUsd)}
                  </div>
                  <span className="text-[11px] text-zinc-400 mono-num">
                    ≈ {formatBs((kpis.zelleUsd + kpis.otherUsd) * rate)}
                  </span>
                </div>
              </div>
            </div>

            {/* RANKING DE PLATOS & BEBIDAS ESTRELLA MÁS VENDIDOS ("LOS ITEMS") */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                    <UtensilsCrossed size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">Platos & Bebidas más Vendidos (Top Ítems)</h3>
                    <p className="text-xs text-zinc-500">Ranking por volumen de unidades y recaudación en el período:</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-zinc-500">
                  Top 6 más pedidos
                </span>
              </div>

              {topProducts.length > 0 ? (
                <div className="space-y-3">
                  {topProducts.map((prod, idx) => (
                    <div key={prod.id || idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 ${
                            idx === 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            idx === 1 ? 'bg-zinc-200 text-zinc-800' :
                            idx === 2 ? 'bg-amber-50 text-amber-800' :
                            'bg-zinc-100 text-zinc-600'
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-zinc-900 truncate">
                            {prod.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-bold text-zinc-700 mono-num">
                            {prod.qty} {prod.qty === 1 ? 'unidad' : 'unidades'}
                          </span>
                          <span className="font-extrabold text-zinc-950 mono-num text-right w-20">
                            {formatPrimary(prod.totalUsd, prod.totalBs)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-zinc-950 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(6, prod.barWidth)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-zinc-400 text-xs">
                  No se registran platos o bebidas vendidas en este período todavía.
                </div>
              )}
            </div>

            {/* Vista Rápida de Mesas Abiertas */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Mesas y Comandas en Curso</h3>
                  <p className="text-xs text-zinc-500">Cuentas que los clientes están consumiendo en este instante:</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('tables')}
                  className="text-xs font-semibold text-zinc-950 hover:underline inline-flex items-center gap-1"
                >
                  <span>Ver todas ({allOpenTabs.length})</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {allOpenTabs.length > 0 ? (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {allOpenTabs.slice(0, 6).map((tab, idx) => (
                    <div key={tab.id || idx} className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-zinc-900">
                          {tab.tableName || `Mesa ${tab.tableNumber || idx + 1}`}
                        </span>
                        <span className="font-bold text-xs text-zinc-950 mono-num">
                          {formatPrimary(Number(tab.total || tab.subtotal || 0), Number(tab.total || tab.subtotal || 0) * rate)}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 line-clamp-2">
                        {Array.isArray(tab.items) && tab.items.length > 0
                          ? tab.items.map((i) => `${i.qty || 1}x ${i.name}`).join(', ')
                          : 'Comanda abierta sin platos registrados'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-zinc-400 text-xs">
                  No hay mesas abiertas en este momento.
                </div>
              )}
            </div>

          </div>
        )}

        {/* PESTAÑA 2: MESAS Y COMANDAS (TABLES) */}
        {activeTab === 'tables' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-950">Mesas Abiertas en Salón</h3>
                <p className="text-xs text-zinc-500">
                  Total en consumo: <strong className="text-zinc-900 mono-num">{formatPrimary(kpis.openTabsTotalUsd, kpis.openTabsTotalBs)}</strong> ({formatSecondary(kpis.openTabsTotalUsd, kpis.openTabsTotalBs)})
                </p>
              </div>
            </div>

            {allOpenTabs.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {allOpenTabs.map((tab, idx) => (
                  <div key={tab.id || idx} className="p-4 rounded-xl bg-white border border-zinc-200/90 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between border-b border-zinc-100 pb-2.5">
                      <div>
                        <span className="font-bold text-sm text-zinc-950 block">
                          {tab.tableName || `Mesa ${tab.tableNumber || idx + 1}`}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          Mesonero: {tab.server || tab.waiter || 'Caja Principal'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-base text-zinc-950 mono-num block">
                          {formatPrimary(Number(tab.total || tab.subtotal || 0), Number(tab.total || tab.subtotal || 0) * rate)}
                        </span>
                        <span className="text-[11px] text-zinc-500 mono-num block">
                          ≈ {formatSecondary(Number(tab.total || tab.subtotal || 0), Number(tab.total || tab.subtotal || 0) * rate)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                        Platos y Bebidas Pedidos:
                      </span>
                      {Array.isArray(tab.items) && tab.items.length > 0 ? (
                        <div className="divide-y divide-zinc-50 space-y-1">
                          {tab.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex justify-between items-center py-1">
                              <span className="text-zinc-700">
                                {item.qty || 1}x {item.name}
                              </span>
                              <span className="text-zinc-500 mono-num text-[11px]">
                                {formatPrimary((item.price || item.priceUsd || 0) * (item.qty || 1), (item.price || item.priceUsd || 0) * (item.qty || 1) * rate)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-xs">Sin ítems</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-white border border-zinc-200 text-center text-zinc-400 text-xs">
                Todas las mesas se encuentran libres y cerradas en este momento.
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: FACTURAS EMITIDAS (INVOICES) */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-950">
                  Ventas Facturadas ({filteredInvoices.length})
                </h3>
                <p className="text-xs text-zinc-500">
                  Historial de comprobantes emitidos en el período ({dateRange === 'today' ? 'Hoy' : dateRange === 'yesterday' ? 'Ayer' : dateRange === 'week' ? 'Esta Semana' : dateRange === 'month' ? 'Este Mes' : 'Rango Personalizado'}):
                </p>
              </div>

              {/* Buscador de Factura en Tiempo Real */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchInvoiceQuery}
                  onChange={(e) => setSearchInvoiceQuery(e.target.value)}
                  placeholder="Buscar factura, cliente, RIF..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900"
                />
                {searchInvoiceQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchInvoiceQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Filtros por Método de Cobro */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {[
                { id: 'all', label: 'Todas las Ventas' },
                { id: 'cash', label: 'Efectivo $' },
                { id: 'movil', label: 'Pago Móvil' },
                { id: 'pos', label: 'Punto de Venta' },
                { id: 'mixto', label: 'Pago Mixto' }
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setInvoiceFilter(f.id)}
                  className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    invoiceFilter === f.id
                      ? 'bg-zinc-950 text-white shadow-2xs font-bold'
                      : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 uppercase text-[11px] font-semibold">
                      <th className="py-3 px-4">Fecha / Hora</th>
                      <th className="py-3 px-4">Comprobante</th>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Platos / Ítems</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                      <th className="py-3 px-3 text-center">Ticket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700">
                    {filteredInvoices
                      .filter((inv) => {
                        if (invoiceFilter === 'all') return true;
                        const m = (inv.paymentMethod || '').toLowerCase();
                        if (invoiceFilter === 'cash') return m.includes('efectivo') || m.includes('cash') || m.includes('dolar');
                        if (invoiceFilter === 'movil') return m.includes('movil') || m.includes('pago');
                        if (invoiceFilter === 'pos') return m.includes('punto') || m.includes('debito') || m.includes('tarjeta');
                        if (invoiceFilter === 'mixto') return m.includes('mixto') || Boolean(inv.paymentDetails?.isMixto);
                        return true;
                      })
                      .map((inv, idx) => {
                        const totalUsd = Number(inv.total || inv.totalAmount || inv.totalUSD || 0);
                        const invRate = Number(inv.exchangeRate) || rate;
                        const totalBs = Number(inv.totalBs || totalUsd * invRate);
                        const isVoided = (inv.status || '').toLowerCase() === 'voided' || (inv.status || '').toLowerCase() === 'anulada';
                        const items = inv.items || inv.products || [];

                        return (
                          <tr
                            key={inv.id || idx}
                            className={`hover:bg-zinc-50/70 transition-colors ${isVoided ? 'bg-rose-50/30 opacity-75' : ''}`}
                          >
                            <td className="py-3 px-4 font-mono text-zinc-500 whitespace-nowrap">
                              {inv.date ? new Date(inv.date).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                            </td>
                            <td className="py-3 px-4 font-semibold text-zinc-950">
                              <div className="flex items-center gap-1.5">
                                <span>{inv.invoiceNumber || inv.number || `#${idx + 1}`}</span>
                                {isVoided && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
                                    ANULADA
                                  </span>
                                )}
                              </div>
                              {inv.fiscalReceiptNumber && (
                                <span className="block text-[10px] text-emerald-700 font-mono font-medium">
                                  SENIAT: {inv.fiscalReceiptNumber}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium text-zinc-900 block truncate max-w-[140px]">
                                {inv.client?.name || inv.clientName || 'Consumidor Final'}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {inv.client?.rif || inv.clientRif || 'V-00000000'}
                              </span>
                            </td>
                            <td className="py-3 px-4 max-w-[200px]">
                              {items.length > 0 ? (
                                <span className="text-zinc-600 truncate block text-[11px]" title={items.map((i) => `${i.qty || 1}x ${i.name}`).join(', ')}>
                                  {items.map((i) => `${i.qty || 1}x ${i.name}`).join(', ')}
                                </span>
                              ) : (
                                <span className="text-zinc-400 text-[11px]">Consumo general</span>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="inline-block px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-medium text-[11px]">
                                {inv.paymentMethod || 'Efectivo'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-zinc-950 mono-num whitespace-nowrap">
                              {formatPrimary(totalUsd, totalBs)}
                              <span className="block text-[10px] text-zinc-400 font-normal">
                                ≈ {formatSecondary(totalUsd, totalBs)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedInvoiceForPreview(inv)}
                                title="Ver comprobante e imprimir ticket fiscal"
                                className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors inline-flex items-center justify-center cursor-pointer"
                              >
                                <Eye size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                    {filteredInvoices.length === 0 && (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-zinc-400 text-xs">
                          No se encontraron ventas para los filtros seleccionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: GASTOS Y SALIDAS (EXPENSES) */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-950">Gastos y Salidas de Caja del Período</h3>
                <p className="text-xs text-zinc-500">
                  Egresos registrados para cuadre de caja y control de gaveta:
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-zinc-200/90 shadow-2xs flex items-center gap-3">
                <span className="text-xs text-zinc-500 font-semibold">Total Gastos:</span>
                <span className="font-extrabold text-sm text-rose-600 mono-num">
                  -{formatPrimary(kpis.totalExpensesUsd, kpis.totalExpensesBs)}
                </span>
                <span className="text-[11px] text-zinc-400 mono-num">
                  ({formatSecondary(kpis.totalExpensesUsd, kpis.totalExpensesBs)})
                </span>
              </div>
            </div>

            <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 uppercase text-[11px] font-semibold">
                      <th className="py-3 px-4">Fecha / Hora</th>
                      <th className="py-3 px-4">Concepto / Motivo</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Salió De</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700">
                    {filteredExpenses.map((exp, idx) => {
                      const usd = Number(exp.amountUsd || exp.totalUSD || 0);
                      const bs = Number(exp.amountBs || exp.totalBs || 0);
                      const d = exp.date || exp.createdAt;
                      const dateFormatted = d ? new Date(d).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }) : '—';

                      return (
                        <tr key={exp.id || idx} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono text-zinc-500 whitespace-nowrap">
                            {dateFormatted}
                          </td>
                          <td className="py-3 px-4 font-semibold text-zinc-950">
                            {exp.description || exp.concept || exp.name || 'Gasto Operativo'}
                            {exp.notes && (
                              <span className="block text-[10px] text-zinc-400 font-normal">
                                {exp.notes}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[11px] font-medium">
                              {exp.category || 'Insumos / Operativo'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-medium border border-amber-200">
                              {exp.paymentMethod || exp.method || 'Efectivo Divisas ($)'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-rose-600 mono-num whitespace-nowrap">
                            -{formatPrimary(usd > 0 ? usd : bs / rate, bs > 0 ? bs : usd * rate)}
                            <span className="block text-[10px] text-zinc-400 font-normal">
                              ≈ {formatSecondary(usd > 0 ? usd : bs / rate, bs > 0 ? bs : usd * rate)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredExpenses.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-zinc-400 text-xs">
                          No se han registrado salidas ni gastos de caja en este período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: INVENTARIO & MERMAS */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-zinc-950">Control de Insumos & Mermas</h3>
              <p className="text-xs text-zinc-500">Alertas de existencias y productos críticos en cocina:</p>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(snapshot?.inventory || []).map((item, idx) => {
                const stock = Number(item.stock || item.quantity || 0);
                const min = Number(item.minStock || 5);
                const isLow = stock <= min;

                return (
                  <div
                    key={item.id || idx}
                    className={`p-4 rounded-xl border bg-white space-y-2 ${
                      isLow ? 'border-amber-300 bg-amber-50/20 shadow-2xs' : 'border-zinc-200/90'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-bold text-xs text-zinc-900 block truncate pr-2">
                        {item.name}
                      </span>
                      {isLow && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Bajo Stock
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between pt-1 border-t border-zinc-100">
                      <span className="text-xs text-zinc-500">Existencia actual:</span>
                      <span className={`font-mono font-extrabold text-sm ${isLow ? 'text-amber-800' : 'text-zinc-950'}`}>
                        {stock} {item.unit || 'uds'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {(snapshot?.inventory || []).length === 0 && (
                <div className="col-span-full p-8 rounded-xl bg-white border border-zinc-200 text-center text-zinc-400 text-xs">
                  No hay insumos registrados en el módulo de inventario.
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 6: DATOS FISCALES SENIAT (SINGLE SOURCE OF TRUTH) */}
        {activeTab === 'fiscal' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-zinc-950">Datos Fiscales SENIAT del Negocio</h3>
                    {tenant?.is_fiscal_verified ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Verificado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                        Pendiente de Verificación
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Estos datos se reflejan automáticamente en el libro de ventas SENIAT en Excel, la Forma 30 y las facturas fiscales HKA80.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setFiscalModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-950 text-white font-semibold text-xs shadow-xs hover:bg-zinc-800 transition-all flex items-center gap-1.5"
                >
                  <Sparkles size={13} />
                  <span>{tenant?.is_fiscal_verified ? 'Editar Datos Fiscales' : 'Completar Verificación'}</span>
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                  <span className="text-zinc-500 font-medium">Nombre Comercial:</span>
                  <div className="font-bold text-sm text-zinc-950">{tenant?.name || '—'}</div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                  <span className="text-zinc-500 font-medium">Razón Social SENIAT:</span>
                  <div className="font-bold text-sm text-zinc-950">{tenant?.legal_name || '—'}</div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                  <span className="text-zinc-500 font-medium">RIF Fiscal:</span>
                  <div className="font-mono font-bold text-sm text-zinc-950">{tenant?.rif || '—'}</div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                  <span className="text-zinc-500 font-medium">Serial Máquina Fiscal HKA80:</span>
                  <div className="font-mono font-bold text-sm text-zinc-950">{tenant?.fiscal_serial || 'Sin impresora asignada'}</div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1 sm:col-span-2">
                  <span className="text-zinc-500 font-medium">Domicilio Fiscal SENIAT:</span>
                  <div className="text-zinc-900 leading-relaxed">{tenant?.fiscal_address || '—'}</div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                  <span className="text-zinc-500 font-medium">Teléfono / WhatsApp:</span>
                  <div className="font-bold text-zinc-950">{tenant?.phone || '—'}</div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                  <span className="text-zinc-500 font-medium">Instagram:</span>
                  <div className="font-bold text-zinc-950">{tenant?.instagram || '—'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 5: SUSCRIPCIÓN SAAS & PAGOS */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            
            {/* Tarjeta de Estado de Licencia */}
            <div className="p-6 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                <div>
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Estado de tu Servicio FacturasYa
                  </span>
                  <h3 className="text-lg font-bold text-zinc-950">
                    {subStatus?.isSuspended
                      ? 'Servicio Suspendido'
                      : subStatus?.isExpired
                      ? 'Suscripción Vencida'
                      : tenant.plan === 'trial'
                      ? 'Período de Prueba Gratuita'
                      : 'Suscripción Activa'}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setPagoModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-zinc-950 text-white font-semibold text-xs shadow-xs hover:bg-zinc-800 transition-all flex items-center gap-1.5"
                >
                  <Smartphone size={14} />
                  <span>Pagar con Pago Móvil (${Number(saasConfig?.monthly_price_usd || 30).toFixed(0)}/mes)</span>
                </button>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-0.5">
                  <span className="text-zinc-500">Plan contratado:</span>
                  <div className="font-bold text-sm text-zinc-950 capitalize">{tenant.plan || 'trial'}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-0.5">
                  <span className="text-zinc-500">Días restantes:</span>
                  <div className="font-bold text-sm text-zinc-950 mono-num">{subStatus?.daysRemaining} días</div>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-0.5">
                  <span className="text-zinc-500">Fecha de corte:</span>
                  <div className="font-bold text-sm text-zinc-950">
                    {subStatus?.validUntilDate ? subStatus.validUntilDate.toLocaleDateString('es-VE') : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Historial de Pagos Reportados */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-zinc-950">Historial de Pagos Móviles</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 uppercase text-[11px] font-semibold">
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Referencia</th>
                      <th className="py-2.5 px-3">Banco</th>
                      <th className="py-2.5 px-3">Monto</th>
                      <th className="py-2.5 px-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 px-3">{new Date(p.created_at).toLocaleDateString('es-VE')}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-zinc-950">#{p.reference_last6}</td>
                        <td className="py-2.5 px-3">
                          <div>{p.bank_origin}</div>
                          {p.status === 'rejected' && p.notes && (
                            <span className="text-[10px] text-red-600 font-semibold block">
                              Motivo: {p.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono">{formatUsd(p.amount_usd)} ({formatBs(p.amount_bs)})</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.status === 'approved' ? 'Aprobado' : p.status === 'rejected' ? 'Rechazado' : 'En Verificación'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-zinc-400 text-xs">
                          No has reportado pagos todavía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* MODAL DE PAGO MÓVIL DIRECTO DESDE EL TELÉFONO */}
      {pagoModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPagoModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Renovación Directa
                </span>
                <h3 className="text-base font-bold text-zinc-950 mt-0.5">
                  Pagar Suscripción con Pago Móvil
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPagoModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selector de Plan */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSelectedPlan('monthly')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedPlan === 'monthly'
                    ? 'border-zinc-950 bg-zinc-50 shadow-2xs'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50'
                }`}
              >
                <div className="font-bold text-zinc-950">Plan Mensual</div>
                <div className="text-zinc-600 font-mono mt-0.5">
                  ${Number(saasConfig?.monthly_price_usd || 30).toFixed(0)} / mes
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  {formatBs((Number(saasConfig?.monthly_price_usd || 30)) * rate)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan('annual')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedPlan === 'annual'
                    ? 'border-zinc-950 bg-zinc-50 shadow-2xs'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50'
                }`}
              >
                <div className="font-bold text-zinc-950 flex items-center justify-between">
                  <span>Plan Anual</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">
                    Ahorras $60
                  </span>
                </div>
                <div className="text-zinc-600 font-mono mt-0.5">
                  ${Number(saasConfig?.annual_price_usd || 300).toFixed(0)} / año
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  {formatBs((Number(saasConfig?.annual_price_usd || 300)) * rate)}
                </div>
              </button>
            </div>

            {/* Selector de Método: Pago Móvil vs Binance Pay */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPagoMethod('pago_movil')}
                className={`py-2 px-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  pagoMethod === 'pago_movil'
                    ? 'bg-zinc-950 text-white border-zinc-950'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <Smartphone size={13} />
                <span>Pago Móvil (Bs)</span>
              </button>
              <button
                type="button"
                onClick={() => setPagoMethod('binance')}
                className={`py-2 px-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  pagoMethod === 'binance'
                    ? 'bg-zinc-950 text-white border-zinc-950'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <CreditCard size={13} />
                <span>Binance Pay (USDT)</span>
              </button>
            </div>

            {/* Datos Bancarios Receptores */}
            {pagoMethod === 'pago_movil' ? (
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Datos para hacer tu Pago Móvil ({saasConfig?.pago_movil_holder || 'FacturasYa'}):
                </span>
                <div className="space-y-1.5 text-zinc-700">
                  <div className="flex justify-between items-center">
                    <span>Banco:</span>
                    <strong className="text-zinc-950">{saasConfig?.pago_movil_bank || '0172 - Bancamiga'}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Teléfono:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(saasConfig?.pago_movil_phone || '0412-0000000', 'phone')}
                      className="font-mono font-bold text-zinc-950 inline-flex items-center gap-1 hover:underline"
                    >
                      <span>{saasConfig?.pago_movil_phone || '0412-0000000'}</span>
                      {copiedField === 'phone' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-zinc-400" />}
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Cédula / RIF:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(saasConfig?.pago_movil_rif_ci || 'V-00000000', 'rif')}
                      className="font-mono font-bold text-zinc-950 inline-flex items-center gap-1 hover:underline"
                    >
                      <span>{saasConfig?.pago_movil_rif_ci || 'V-00000000'}</span>
                      {copiedField === 'rif' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-zinc-400" />}
                    </button>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-zinc-200">
                    <span>Monto exacto a transferir:</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          ((selectedPlan === 'annual' ? Number(saasConfig?.annual_price_usd || 300) : Number(saasConfig?.monthly_price_usd || 30)) * rate).toFixed(2),
                          'amount_bs'
                        )
                      }
                      className="text-emerald-700 font-bold font-mono text-sm inline-flex items-center gap-1 hover:underline"
                    >
                      <span>
                        {formatBs((selectedPlan === 'annual' ? Number(saasConfig?.annual_price_usd || 300) : Number(saasConfig?.monthly_price_usd || 30)) * rate)}
                      </span>
                      {copiedField === 'amount_bs' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-emerald-600" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Datos para Enviar por Binance Pay (0% Comisión):
                </span>
                <div className="space-y-1.5 text-zinc-700">
                  <div className="flex justify-between items-center">
                    <span>Correo / Binance ID:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(saasConfig?.binance_email || 'pagos@facturasya.com', 'binance')}
                      className="font-mono font-bold text-zinc-950 inline-flex items-center gap-1 hover:underline"
                    >
                      <span>{saasConfig?.binance_email || 'pagos@facturasya.com'}</span>
                      {copiedField === 'binance' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-zinc-400" />}
                    </button>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-zinc-200">
                    <span>Monto exacto en USDT:</span>
                    <strong className="text-emerald-700 font-mono text-sm">
                      ${(selectedPlan === 'annual' ? Number(saasConfig?.annual_price_usd || 300) : Number(saasConfig?.monthly_price_usd || 30)).toFixed(2)} USDT
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Formulario de Reporte */}
            <form onSubmit={handlePagoSubmit} className="space-y-3 text-xs">
              {pagoMethod === 'pago_movil' && (
                <>
                  <div>
                    <label className="block text-zinc-700 font-semibold mb-1">Banco desde donde pagaste</label>
                    <select
                      value={pagoBank}
                      onChange={(e) => setPagoBank(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-900"
                    >
                      {VENEZUELA_BANKS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-zinc-700 font-semibold mb-1">Tu Teléfono emisor</label>
                      <input
                        type="text"
                        required
                        placeholder="0412-1234567"
                        value={pagoPhone}
                        onChange={(e) => setPagoPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-700 font-semibold mb-1">Cédula / RIF Titular</label>
                      <input
                        type="text"
                        placeholder="V-12345678"
                        value={pagoPayerDoc}
                        onChange={(e) => setPagoPayerDoc(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-900 font-mono uppercase"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">
                  {pagoMethod === 'pago_movil' ? 'Últimos 4 a 6 dígitos de Referencia *' : 'Últimos dígitos del Order ID de Binance *'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  placeholder={pagoMethod === 'pago_movil' ? 'Ej. 987654' : 'Ej. 28394812'}
                  value={pagoRef}
                  onChange={(e) => setPagoRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-900 font-mono font-bold"
                />
              </div>

              {/* Uploader de Capture */}
              <div className="border border-dashed border-zinc-200 rounded-xl p-3 bg-zinc-50/60">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-zinc-700 flex items-center gap-1.5">
                    <ImageIcon size={13} className="text-zinc-500" />
                    <span>Adjuntar Capture / Screenshot (Recomendado)</span>
                  </label>
                  <span className="text-[10px] text-zinc-400">JPG/PNG</span>
                </div>

                {pagoReceiptPreview ? (
                  <div className="relative inline-block border border-zinc-200 rounded-lg p-1 bg-white shadow-2xs">
                    <img
                      src={pagoReceiptPreview}
                      alt="Comprobante"
                      className="h-20 w-auto rounded object-contain max-w-full cursor-pointer hover:opacity-95"
                      onClick={() => setSelectedReceiptModal(pagoReceiptPreview)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPagoReceiptFile(null);
                        setPagoReceiptPreview('');
                      }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs shadow-xs hover:bg-red-700 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-2.5 bg-white border border-zinc-200 rounded-lg cursor-pointer hover:bg-zinc-50 transition-all text-xs text-zinc-600 font-medium">
                    <UploadCloud size={15} className="text-zinc-400" />
                    <span>Seleccionar comprobante del banco</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleMonitorReceiptFile(e.target.files[0]);
                      }}
                    />
                  </label>
                )}
              </div>

              {pagoError && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                  {pagoError}
                </div>
              )}

              {pagoSuccessMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>{pagoSuccessMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={pagoSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 font-semibold text-xs text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {pagoSubmitting ? 'Confirmando...' : 'Confirmar Reporte de Pago Móvil →'}
              </button>

              <div className="text-center pt-1">
                <a
                  href={`https://wa.me/584120000000?text=${encodeURIComponent(
                    `Hola Soporte FacturasYa, tengo una consulta con mi pago de suscripción para ${tenant?.name || 'mi negocio'}.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-zinc-500 hover:text-zinc-950 hover:underline inline-flex items-center gap-1"
                >
                  <span>¿Dudas con tu pago? Escríbenos a soporte por WhatsApp</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE VERIFICACIÓN FISCAL SENIAT (HÍBRIDO: CHIP S1 + FORMULARIO MANUAL) */}
      {fiscalModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setFiscalModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  <ShieldCheck size={11} /> Verificación Fiscal SENIAT
                </span>
                <h3 className="text-base font-bold text-zinc-950 mt-1">
                  Verifica los Datos Fiscales de tu Negocio
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Activa tus Libros de Ventas SENIAT, Forma 30 y sincronización de máquinas fiscales HKA80.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFiscalModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Opción 1: Lectura Automática por Chip Fiscal S1 (si está en Desktop .exe) */}
            {isElectron ? (
              <div className="p-3.5 rounded-xl bg-zinc-900 text-white space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      Opción 1 · Detección por Hardware (HKA80)
                    </span>
                    <div className="text-xs font-semibold">
                      Extraer RIF y Serial directamente de la Memoria Fiscal (S1)
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={readingS1}
                    onClick={handleReadFromFiscalPrinter}
                    className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Printer size={13} />
                    <span>{readingS1 ? 'Leyendo S1...' : '⚡ Leer Impresora'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Consulta el estado S1 por el puerto COM configurado y rellena automáticamente el RIF fiscal y el Serial Único de tu máquina.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 text-[11px] text-zinc-600 flex items-center justify-between gap-3">
                <span>
                  💡 <strong>Tip:</strong> Puedes completar los datos manualmente aquí abajo, o desde la app de escritorio (<code>.exe</code>) leer el RIF y Serial directo desde la impresora fiscal.
                </span>
              </div>
            )}

            <form onSubmit={handleFiscalSubmit} className="space-y-3 text-xs">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                    Nombre Comercial *
                  </label>
                  <input
                    type="text"
                    required
                    value={fiscalForm.name}
                    onChange={(e) => setFiscalForm({ ...fiscalForm, name: e.target.value })}
                    placeholder="Ej. Helados Happy Days"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                    Razón Social SENIAT *
                  </label>
                  <input
                    type="text"
                    required
                    value={fiscalForm.legalName}
                    onChange={(e) => setFiscalForm({ ...fiscalForm, legalName: e.target.value })}
                    placeholder="Ej. INVERSIONES HAPPY DAYS, C.A."
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                    RIF Fiscal SENIAT *
                  </label>
                  <input
                    type="text"
                    required
                    value={fiscalForm.rif}
                    onChange={(e) => setFiscalForm({ ...fiscalForm, rif: e.target.value.toUpperCase() })}
                    onBlur={(e) => setFiscalForm((prev) => ({ ...prev, rif: formatRifSeniat(e.target.value) }))}
                    placeholder="J-12345678-9"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-900 font-mono uppercase focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                    Serial Máquina Fiscal (Opcional)
                  </label>
                  <input
                    type="text"
                    value={fiscalForm.fiscalSerial}
                    onChange={(e) => setFiscalForm({ ...fiscalForm, fiscalSerial: e.target.value.toUpperCase() })}
                    placeholder="Ej. Z7B1234567"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-900 font-mono uppercase focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                  Domicilio Fiscal Exacto *
                </label>
                <textarea
                  rows={2}
                  required
                  value={fiscalForm.fiscalAddress}
                  onChange={(e) => setFiscalForm({ ...fiscalForm, fiscalAddress: e.target.value })}
                  placeholder="Av. Principal, Local Nro 1, Zona Centro..."
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={fiscalForm.phone}
                    onChange={(e) => setFiscalForm({ ...fiscalForm, phone: e.target.value })}
                    placeholder="0414-0000000"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                    Instagram / Red Social
                  </label>
                  <input
                    type="text"
                    value={fiscalForm.instagram}
                    onChange={(e) => setFiscalForm({ ...fiscalForm, instagram: e.target.value })}
                    placeholder="@tunegocio"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              {fiscalError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {fiscalError}
                </div>
              )}

              {fiscalSuccessMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{fiscalSuccessMsg}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setFiscalModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={fiscalSubmitting}
                  className="px-5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 font-semibold text-xs text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck size={14} />
                  <span>{fiscalSubmitting ? 'Verificando...' : 'Guardar y Verificar Negocio'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PREVISUALIZACIÓN DE FACTURA FISCAL / TICKET TÉRMICO */}
      {selectedInvoiceForPreview && (
        <InvoicePreview
          invoice={selectedInvoiceForPreview}
          onClose={() => setSelectedInvoiceForPreview(null)}
        />
      )}

      {/* MODAL LIGHTBOX PARA VISUALIZAR CAPTURE DE COMPROBANTE EN ALTA RESOLUCIÓN */}
      {selectedReceiptModal && (
        <div
          className="fixed inset-0 z-60 bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedReceiptModal(null)}
        >
          <div
            className="relative max-w-xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 border-b border-zinc-100">
              <span className="text-xs font-bold text-zinc-900">Comprobante de Pago</span>
              <button
                type="button"
                onClick={() => setSelectedReceiptModal(null)}
                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center">
              <img
                src={selectedReceiptModal}
                alt="Comprobante en Alta Resolución"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
            <div className="p-2 border-t border-zinc-100 flex justify-end">
              <a
                href={selectedReceiptModal}
                target="_blank"
                rel="noreferrer"
                download="comprobante-pago.jpg"
                className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 flex items-center gap-1"
              >
                <span>Abrir imagen completa</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
