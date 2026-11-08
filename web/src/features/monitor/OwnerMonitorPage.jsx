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
  Printer
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import LoginForm from '../auth/LoginForm';
import { supabase } from '../../lib/supabase';
import { db } from '../../pos-core/services/dataService';
import {
  fetchMyTenant,
  fetchTenantSnapshot,
  fetchSaasConfig,
  fetchMyPayments,
  submitOwnerPagoMovil,
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
  }, [defaultTab]); // 'overview' | 'tables' | 'invoices' | 'inventory' | 'subscription'
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [invoiceFilter, setInvoiceFilter] = useState('all');

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
  const [pagoSubmitting, setPagoSubmitting] = useState(false);
  const [pagoError, setPagoError] = useState('');
  const [pagoSuccessMsg, setPagoSuccessMsg] = useState('');
  const [copiedField, setCopiedField] = useState(null);

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

  // Filtrar ventas del día
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todayInvoices = useMemo(() => {
    const invs = snapshot?.invoices || [];
    return invs.filter((i) => {
      if (!i.date) return false;
      const invDate = String(i.date).slice(0, 10);
      return invDate === todayStr && i.status !== 'voided';
    });
  }, [snapshot?.invoices, todayStr]);

  const kpis = useMemo(() => {
    let totalUsd = 0;
    let cashUsd = 0;
    let pagoMovilBs = 0;
    let posBs = 0;
    let otherUsd = 0;

    todayInvoices.forEach((inv) => {
      const invTotal = Number(inv.total || inv.totalAmount || 0);
      totalUsd += invTotal;

      const method = (inv.paymentMethod || '').toLowerCase();
      if (method.includes('efectivo') || method.includes('cash') || method.includes('dolar')) {
        cashUsd += invTotal;
      } else if (method.includes('movil') || method.includes('pago')) {
        pagoMovilBs += (inv.totalBs ? Number(inv.totalBs) : invTotal * rate);
      } else if (method.includes('punto') || method.includes('debito') || method.includes('tarjeta')) {
        posBs += (inv.totalBs ? Number(inv.totalBs) : invTotal * rate);
      } else {
        otherUsd += invTotal;
      }
    });

    const openTabs = snapshot?.openTabs || [];
    const openTabsCount = openTabs.length;
    const openTabsTotalUsd = openTabs.reduce((sum, tab) => sum + Number(tab.total || tab.subtotal || 0), 0);

    return {
      totalSalesUsd: totalUsd,
      totalSalesBs: totalUsd * rate,
      cashUsd,
      pagoMovilBs,
      posBs,
      otherUsd,
      openTabsCount,
      openTabsTotalUsd,
      openTabsTotalBs: openTabsTotalUsd * rate,
      invoicesCount: todayInvoices.length
    };
  }, [todayInvoices, snapshot?.openTabs, rate]);

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
        autoVerifyProvider: saasConfig?.auto_verify_provider || 'manual'
      });

      const updatedPays = await fetchMyPayments(tenant.id).catch(() => payments);
      setPayments(updatedPays);

      setPagoSuccessMsg('¡Pago reportado con éxito! Tu caja cuenta con Pase de Cortesía activo mientras se verifica la referencia.');
      setPagoRef('');
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
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto border-t border-zinc-100 text-xs font-semibold py-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'overview'
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            Resumen Hoy
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
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'invoices'
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            Facturas ({todayInvoices.length})
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

        {/* METRICS HERO CARDS (HOY) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          
          <div className="p-4 rounded-xl bg-white border border-zinc-200/90 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Ventas Totales Hoy
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-zinc-950 mono-num">
              {formatUsd(kpis.totalSalesUsd)}
            </div>
            <span className="text-xs text-zinc-500 font-medium block mono-num">
              ≈ {formatBs(kpis.totalSalesBs)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-zinc-200/90 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Efectivo USD ($)
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mono-num">
              {formatUsd(kpis.cashUsd)}
            </div>
            <span className="text-xs text-zinc-400 font-medium block">
              En gaveta física de caja
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-zinc-200/90 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Pago Móvil & Bancos (Bs)
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-zinc-950 mono-num">
              {formatBs(kpis.pagoMovilBs + kpis.posBs)}
            </div>
            <span className="text-xs text-zinc-500 font-medium block mono-num">
              ≈ {formatUsd((kpis.pagoMovilBs + kpis.posBs) / rate)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-zinc-200/90 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Mesas Ocupadas
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-zinc-950 mono-num">
              {kpis.openTabsCount}
            </div>
            <span className="text-xs text-zinc-500 font-medium block mono-num">
              Consumo: {formatUsd(kpis.openTabsTotalUsd)}
            </span>
          </div>

        </div>

        {/* SI AÚN NO SE HA REGISTRADO EL PRIMER SNAPSHOT DESDE LA CAJA */}
        {!snapshot && (
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
                  <h3 className="text-sm font-bold text-zinc-950">Desglose de Caja de Hoy</h3>
                  <p className="text-xs text-zinc-500">Separación por moneda y canal receptor:</p>
                </div>
                <span className="text-xs font-semibold text-zinc-600 mono-num">
                  {kpis.invoicesCount} {kpis.invoicesCount === 1 ? 'factura' : 'facturas'}
                </span>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-xs">
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
              </div>
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
                  <span>Ver todas</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {(snapshot?.openTabs || []).length > 0 ? (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(snapshot.openTabs || []).slice(0, 6).map((tab, idx) => (
                    <div key={tab.id || idx} className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-zinc-900">
                          {tab.tableName || `Mesa ${tab.tableNumber || idx + 1}`}
                        </span>
                        <span className="font-bold text-xs text-zinc-950 mono-num">
                          {formatUsd(tab.total || tab.subtotal || 0)}
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
                <p className="text-xs text-zinc-500">Total en consumo: <strong className="text-zinc-900 mono-num">{formatUsd(kpis.openTabsTotalUsd)}</strong> ({formatBs(kpis.openTabsTotalBs)})</p>
              </div>
            </div>

            {(snapshot?.openTabs || []).length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {(snapshot.openTabs || []).map((tab, idx) => (
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
                          {formatUsd(tab.total || tab.subtotal || 0)}
                        </span>
                        <span className="text-[11px] text-zinc-500 mono-num block">
                          {formatBs((tab.total || tab.subtotal || 0) * rate)}
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
                                {formatUsd((item.price || item.priceUsd || 0) * (item.qty || 1))}
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

        {/* PESTAÑA 3: FACTURAS DE HOY (INVOICES) */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-950">Ventas Facturadas Hoy</h3>
                <p className="text-xs text-zinc-500">Historial en tiempo real de comprobantes emitidos en el local:</p>
              </div>

              <div className="flex gap-1.5 text-xs">
                {['all', 'cash', 'movil', 'pos'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setInvoiceFilter(f)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      invoiceFilter === f
                        ? 'bg-zinc-950 text-white shadow-2xs'
                        : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {f === 'all' && 'Todas'}
                    {f === 'cash' && 'Efectivo $'}
                    {f === 'movil' && 'Pago Móvil'}
                    {f === 'pos' && 'Punto'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 uppercase text-[11px] font-semibold">
                      <th className="py-3 px-4">Hora</th>
                      <th className="py-3 px-4">Comprobante</th>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700">
                    {todayInvoices
                      .filter((inv) => {
                        if (invoiceFilter === 'all') return true;
                        const m = (inv.paymentMethod || '').toLowerCase();
                        if (invoiceFilter === 'cash') return m.includes('efectivo') || m.includes('cash') || m.includes('dolar');
                        if (invoiceFilter === 'movil') return m.includes('movil') || m.includes('pago');
                        if (invoiceFilter === 'pos') return m.includes('punto') || m.includes('debito') || m.includes('tarjeta');
                        return true;
                      })
                      .map((inv, idx) => (
                        <tr key={inv.id || idx} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono text-zinc-500">
                            {inv.date ? new Date(inv.date).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="py-3 px-4 font-semibold text-zinc-950">
                            {inv.invoiceNumber || inv.number || `#${idx + 1}`}
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
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-medium text-[11px]">
                              {inv.paymentMethod || 'Efectivo'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-zinc-950 mono-num">
                            {formatUsd(inv.total || inv.totalAmount || 0)}
                            <span className="block text-[10px] text-zinc-400 font-normal">
                              {formatBs((inv.total || inv.totalAmount || 0) * rate)}
                            </span>
                          </td>
                        </tr>
                      ))}

                    {todayInvoices.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-zinc-400 text-xs">
                          No se han emitido facturas hoy todavía.
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
                  {pagoMethod === 'pago_movil' ? 'Últimos 6 dígitos de Referencia' : 'Últimos dígitos del Order ID de Binance'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder={pagoMethod === 'pago_movil' ? 'Ej. 987654' : 'Ej. 28394812'}
                  value={pagoRef}
                  onChange={(e) => setPagoRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-900 font-mono font-bold"
                />
              </div>

              {pagoError && (
                <div className="p-2 rounded-lg bg-red-50 text-red-700 text-xs font-medium">
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
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 font-semibold text-xs text-white shadow-xs transition-all flex items-center justify-center gap-2"
              >
                {pagoSubmitting ? 'Confirmando...' : 'Confirmar Reporte de Pago Móvil →'}
              </button>
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

    </div>
  );
}
