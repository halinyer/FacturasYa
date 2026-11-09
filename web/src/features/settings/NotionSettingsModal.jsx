import React, { useState, useEffect } from 'react';
import {
  Building2,
  Printer,
  ChefHat,
  CheckCircle2,
  RefreshCw,
  CreditCard,
  Utensils,
  User,
  Database,
  X,
  AlertCircle,
  Download,
  Laptop,
  Lock,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Copy,
  Check,
  Sliders,
  Store,
  Boxes,
  Package,
  Image as ImageIcon,
  UploadCloud,
  HelpCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { printIsolatedTicket } from '../../pos-core/utils/printIsolatedTicket';
import { useData } from '../../pos-core/contexts/DataContext';
import {
  BUSINESS_PROFILES,
  BUSINESS_PROFILES_LIST,
  getActiveBusinessProfile,
  setActiveBusinessProfile
} from '../../pos-core/config/businessProfiles';
import { HELADOS_LA_CASCADA_PRODUCTS } from '../../pos-core/data/heladosLaCascadaData';
import { db } from '../../pos-core/services/dataService';
import {
  completeFiscalVerification,
  formatRifSeniat,
  getLocalTerminalConfig,
  saveLocalTerminalConfig,
  fetchSaasConfig,
  fetchMyPayments,
  submitOwnerPagoMovil,
  compressReceiptImage
} from '../monitor/api';

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

export default function NotionSettingsModal({
  isOpen,
  onClose,
  tenant,
  subStatus,
  session,
  onUpdateTenant,
  initialTab = 'fiscal'
}) {
  if (!isOpen) return null;

  const data = useData();
  const isElectron = typeof window !== 'undefined' && (Boolean(window?.electronAPI) || window.location.protocol === 'file:');
  const [activeTab, setActiveTab] = useState(initialTab || 'fiscal');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const [terminalConfig, setTerminalConfig] = useState(() => getLocalTerminalConfig());
  const [fiscalPort, setFiscalPort] = useState(() => data?.fiscalSettings?.port || getLocalTerminalConfig().port || 'COM4');
  const [fiscalEnabled, setFiscalEnabled] = useState(() => data?.fiscalSettings?.enabled !== false);
  const [testingFiscal, setTestingFiscal] = useState(false);
  const [detectingPort, setDetectingPort] = useState(false);
  const [readingS1ForFiscal, setReadingS1ForFiscal] = useState(false);
  const [s1Preview, setS1Preview] = useState(null); // 'fiscal' | 'hardware' | 'subscription' | 'restaurant' | 'account' | 'backup'
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Estado Datos Fiscales
  const [fiscalForm, setFiscalForm] = useState({
    name: tenant?.name || '',
    legalName: tenant?.legal_name || '',
    rif: tenant?.rif || 'J-',
    address: tenant?.fiscal_address || '',
    phone: tenant?.phone || '',
    fiscalSerial: tenant?.fiscal_serial || getLocalTerminalConfig().fiscalSerial || '',
    instagram: tenant?.instagram || ''
  });
  const [savingFiscal, setSavingFiscal] = useState(false);

  const handleReadChipS1 = async () => {
    if (!isElectron || !window.electronAPI?.fiscal?.getS1Status) {
      showToast('La lectura directa por cable serial requiere la app de escritorio (.exe)', 'error');
      return;
    }
    setReadingS1ForFiscal(true);
    try {
      const s1 = await window.electronAPI.fiscal.getS1Status(fiscalPort);
      if (s1 && s1.success !== false) {
        const formattedRif = s1.rif ? formatRifSeniat(s1.rif) : fiscalForm.rif;
        const detectedSerial = String(s1.registeredMachineNumber || s1.registered_machine_number || '').trim().toUpperCase();
        setFiscalForm((prev) => ({
          ...prev,
          rif: formattedRif || prev.rif,
          fiscalSerial: detectedSerial || prev.fiscalSerial
        }));
        if (detectedSerial) {
          const nextTerm = saveLocalTerminalConfig({ fiscalSerial: detectedSerial, port: fiscalPort });
          setTerminalConfig(nextTerm);
        }
        showToast(`¡Chip Fiscal leído! RIF: ${formattedRif} · Serial: ${detectedSerial || 'HKA80'}`);
      } else {
        showToast(s1?.error || `No hubo respuesta en ${fiscalPort}. Verifica el puerto en Máquina Fiscal.`, 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error al leer impresora fiscal', 'error');
    } finally {
      setReadingS1ForFiscal(false);
    }
  };

  // 2. Estado Modo Restaurante
  // 1.1 Estado Impresora Térmica de Comandas (Cocina / Barra)
  const [printersList, setPrintersList] = useState([]);
  const [selectedComandaPrinter, setSelectedComandaPrinter] = useState(() => {
    try {
      return localStorage.getItem('pos_comanda_printer') || '';
    } catch {
      return '';
    }
  });
  const [comandaPaperSize, setComandaPaperSize] = useState(() => {
    try {
      return localStorage.getItem('pos_comanda_paper_size') || '58mm';
    } catch {
      return '58mm';
    }
  });
  const [directPrintComanda, setDirectPrintComanda] = useState(() => {
    try {
      return localStorage.getItem('pos_comanda_direct_print') !== 'false';
    } catch {
      return true;
    }
  });
  const [testingComanda, setTestingComanda] = useState(false);
  const [loadingPrinters, setLoadingPrinters] = useState(false);

  const loadNativePrinters = () => {
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.getPrinters === 'function') {
      setLoadingPrinters(true);
      window.electronAPI.getPrinters()
        .then((list) => {
          if (Array.isArray(list)) {
            setPrintersList(list);
            const saved = localStorage.getItem('pos_comanda_printer');
            const exists = list.some((p) => p.name === saved);
            if (!saved || !exists) {
              const thermalRegex = /pos|58|80|thermal|ticket|xp-|tm-|receipt|kitchen|comanda|bixolon|star|epson|citizen|xprinter|3nstar|zkteco/i;
              const autoThermal = list.find((p) => p.isDefault && thermalRegex.test(p.name)) ||
                                  list.find((p) => thermalRegex.test(p.name)) ||
                                  list.find((p) => p.isDefault) ||
                                  list[0];
              if (autoThermal) {
                setSelectedComandaPrinter(autoThermal.name);
                localStorage.setItem('pos_comanda_printer', autoThermal.name);
              }
            }
          }
        })
        .catch((err) => console.warn('Error obteniendo impresoras:', err))
        .finally(() => setLoadingPrinters(false));
    }
  };

  useEffect(() => {
    loadNativePrinters();
  }, []);

  const handleTestComandaPrint = async () => {
    if (testingComanda) return;
    setTestingComanda(true);
    showToast('Enviando ticket de prueba a la comandera...', 'info');

    try {
      const now = new Date();
      const testHtml = `
        <div class="kitchen-paper k-center">
          <p class="k-bold" style="font-size: 13px;">${(tenant?.name || 'FACTURASYA').toUpperCase()}</p>
          <p style="font-size: 10px; margin-top: 2px;">PRUEBA DE COMANDERA DE COCINA</p>
          <div class="k-divider"></div>
          <div style="font-size: 10px; text-align: left; margin: 4px 0;">
            <p><b>Dispositivo:</b> ${selectedComandaPrinter || 'Automática de Windows'}</p>
            <p><b>Ancho Rollo:</b> ${comandaPaperSize}</p>
            <p><b>Fecha:</b> ${now.toLocaleDateString('es-VE')} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <p><b>Modo:</b> Impresión Térmica 1:1 Silenciosa</p>
          </div>
          <div class="k-divider"></div>
          <p class="k-bold" style="font-size: 11px; margin-top: 4px;">¡CONEXIÓN EXITOSA CON COCINA!</p>
          <p style="font-size: 9px; margin-top: 2px; color: #555;">La impresora está lista para recibir comandas de mesas.</p>
          <div class="k-double-divider"></div>
          <div style="height: 10mm; min-height: 10mm; display: block; line-height: 10px;">&nbsp;<br/>&nbsp;</div>
        </div>
      `;

      const res = await printIsolatedTicket({
        html: testHtml,
        paperSize: comandaPaperSize,
        deviceName: selectedComandaPrinter || '',
        silent: true
      });

      if (res && res.success === false) {
        showToast(`Aviso impresora: ${res.failureReason || res.error || 'Verifica la conexión USB del dispositivo'}`, 'error');
      } else {
        showToast('¡Comprobante de prueba impreso con éxito en la comandera!');
      }
    } catch (e) {
      showToast('Error al enviar prueba a la comandera: ' + (e.message || e), 'error');
    } finally {
      setTestingComanda(false);
    }
  };

  const [restaurantMode, setRestaurantMode] = useState(() => {
    try {
      const saved = localStorage.getItem('saas_restaurant_mode');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  // Perfil de Negocio Modular (Notion-style)
  const [activeProfile, setActiveProfileState] = useState(() => getActiveBusinessProfile(tenant));
  const [profileFeatures, setProfileFeatures] = useState(() => getActiveBusinessProfile(tenant).features);

  const handleSelectProfileInSettings = async (profileId) => {
    const prof = BUSINESS_PROFILES[profileId] || BUSINESS_PROFILES.restaurant;
    setActiveProfileState(prof);
    setProfileFeatures(prof.features);
    setActiveBusinessProfile(prof.id, prof.id === 'custom' ? prof.features : null);

    if (tenant?.id && supabase) {
      try {
        await supabase.from('tenants').update({
          business_type: prof.id,
          features: prof.features,
          updated_at: new Date().toISOString()
        }).eq('id', tenant.id);
      } catch (e) {}
    }
    showToast(`Perfil cambiado a: ${prof.name}`);
  };

  const handleToggleModuleInSettings = async (featureKey) => {
    const next = { ...profileFeatures, [featureKey]: !profileFeatures[featureKey] };
    setProfileFeatures(next);
    setActiveProfileState((prev) => ({ ...prev, id: 'custom', features: next }));
    setActiveBusinessProfile('custom', next);

    if (tenant?.id && supabase) {
      try {
        await supabase.from('tenants').update({
          business_type: 'custom',
          features: next,
          updated_at: new Date().toISOString()
        }).eq('id', tenant.id);
      } catch (e) {}
    }
    showToast(`Módulo actualizado`);
  };

  // 3. Estado Reporte de Pago Móvil / Binance Pay
  const [saasConfig, setSaasConfig] = useState(null);
  const [myPayments, setMyPayments] = useState([]);
  const [pagoPlan, setPagoPlan] = useState('monthly');
  const [pagoMethod, setPagoMethod] = useState('pago_movil'); // 'pago_movil' | 'binance'
  const [pagoBank, setPagoBank] = useState(VENEZUELA_BANKS[0]);
  const [pagoPhone, setPagoPhone] = useState(tenant?.phone || '');
  const [pagoPayerDoc, setPagoPayerDoc] = useState(tenant?.rif || 'V-');
  const [pagoRef, setPagoRef] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [selectedReceiptModal, setSelectedReceiptModal] = useState(null);
  const [pagoValidationErrors, setPagoValidationErrors] = useState({});
  const [submittingPago, setSubmittingPago] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Sincronizar teléfono del tenant si se carga después
  useEffect(() => {
    if (tenant?.phone && !pagoPhone) {
      setPagoPhone(tenant.phone);
    }
    if (tenant?.rif && pagoPayerDoc === 'V-') {
      setPagoPayerDoc(tenant.rif);
    }
  }, [tenant]);

  useEffect(() => {
    fetchSaasConfig().then((cfg) => {
      if (cfg) setSaasConfig(cfg);
    }).catch(() => {});
    if (tenant?.id) {
      fetchMyPayments(tenant.id).then(setMyPayments).catch(() => {});
    }
  }, [tenant?.id]);

  const activeRate =
    Number(data?.exchangeRate) ||
    Number(saasConfig?.bcv_rate) ||
    Number(tenant?.exchange_rate) ||
    876.80;

  const monthlyUsd = Number(saasConfig?.monthly_price_usd || 20);
  const currentPlanUsd = monthlyUsd;
  const currentPlanBs = currentPlanUsd * activeRate;

  const copyText = (val, key) => {
    navigator.clipboard.writeText(String(val || ''));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 4. Estado Contraseña
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Guardar Datos Fiscales y completar Verificación SENIAT
  const handleSaveFiscal = async (e) => {
    e.preventDefault();
    setSavingFiscal(true);
    try {
      const formattedRif = formatRifSeniat(fiscalForm.rif);
      const serialClean = String(fiscalForm.fiscalSerial || '').trim().toUpperCase();

      if (tenant?.id && supabase) {
        const updated = await completeFiscalVerification({
          tenantId: tenant.id,
          name: fiscalForm.name.trim(),
          legalName: (fiscalForm.legalName || fiscalForm.name).trim(),
          rif: formattedRif,
          fiscalAddress: (fiscalForm.address || 'Venezuela').trim(),
          phone: (fiscalForm.phone || '').trim(),
          fiscalSerial: serialClean,
          instagram: (fiscalForm.instagram || '').trim()
        });

        if (serialClean) {
          const nextTerm = saveLocalTerminalConfig({ fiscalSerial: serialClean });
          setTerminalConfig(nextTerm);
        }

        if (onUpdateTenant && updated) {
          onUpdateTenant(updated);
        }
      } else if (onUpdateTenant) {
        onUpdateTenant({
          ...tenant,
          name: fiscalForm.name,
          legal_name: fiscalForm.legalName,
          rif: formattedRif,
          fiscal_address: fiscalForm.address,
          phone: fiscalForm.phone,
          fiscal_serial: serialClean,
          is_fiscal_verified: true
        });
      }

      showToast('¡Datos fiscales guardados y negocio verificado ante el SENIAT!');
    } catch (err) {
      showToast(err.message || 'Error al guardar datos fiscales', 'error');
    } finally {
      setSavingFiscal(false);
    }
  };

  // Guardar Modo Restaurante
  const toggleRestaurant = () => {
    const next = !restaurantMode;
    setRestaurantMode(next);
    localStorage.setItem('saas_restaurant_mode', String(next));
    showToast(next ? 'Modo Restaurante activado' : 'Modo Caja Rápida activado');
  };

  const handleReceiptFileChange = async (file) => {
    if (!file) return;
    try {
      const compressedDataUrl = await compressReceiptImage(file);
      setReceiptFile(file);
      setReceiptPreview(compressedDataUrl);
      setPagoValidationErrors((prev) => ({ ...prev, receipt: null }));
    } catch (e) {
      showToast(e.message || 'Error procesando la imagen', 'error');
    }
  };

  const handlePasteReceipt = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          await handleReceiptFileChange(file);
          showToast('¡Capture de pantalla pegado desde el portapapeles!');
          break;
        }
      }
    }
  };

  // Reportar Pago Móvil / Binance Pay unificado con saas_config y RPC seguro
  const handleReportPago = async (e) => {
    e.preventDefault();
    const errors = {};

    const cleanRef = pagoRef.trim().replace(/\D/g, '');
    if (pagoMethod === 'pago_movil') {
      if (!cleanRef || cleanRef.length < 4) {
        errors.ref = 'Ingresa al menos los últimos 4 dígitos de la referencia que aparece en tu comprobante';
      }
      if (!pagoPhone.trim() || pagoPhone.trim().length < 7) {
        errors.phone = 'Ingresa el número de teléfono emisor desde donde hiciste el Pago Móvil';
      }
    } else {
      if (!pagoRef.trim() || pagoRef.trim().length < 4) {
        errors.ref = 'Ingresa el Order ID o referencia de Binance Pay (mínimo 4 caracteres)';
      }
    }

    if (Object.keys(errors).length > 0) {
      setPagoValidationErrors(errors);
      showToast('Por favor completa los datos obligatorios para registrar tu pago.', 'error');
      return;
    }

    setSubmittingPago(true);
    setPagoValidationErrors({});

    try {
      if (tenant?.id) {
        const created = await submitOwnerPagoMovil({
          tenantId: tenant.id,
          tenantName: tenant.name,
          plan: pagoPlan,
          paymentMethod: pagoMethod,
          amountUsd: currentPlanUsd,
          amountBs: currentPlanBs,
          rateBcv: activeRate,
          bankOrigin: pagoMethod === 'binance' ? 'Binance Pay (USDT)' : pagoBank,
          phoneOrigin: pagoMethod === 'binance' ? (session?.user?.email || 'USDT') : pagoPhone.trim(),
          payerDoc: pagoPayerDoc,
          referenceLast6: pagoRef.trim(),
          receiptFile,
          receiptDataUrl: receiptPreview,
          autoVerifyProvider: saasConfig?.auto_verify_provider || 'manual'
        });

        const updatedList = await fetchMyPayments(tenant.id).catch(() => [created, ...myPayments]);
        setMyPayments(updatedList);
      }

      const isSuspended = tenant?.status === 'suspended';
      const msg = isSuspended
        ? '¡Pago reportado con éxito! Tu comprobante fue enviado al Administrador para su aprobación.'
        : '¡Pago reportado con éxito! Tu servicio cuenta con Pase de Cortesía activo mientras se verifica.';
      showToast(msg);
      setPagoRef('');
      setReceiptFile(null);
      setReceiptPreview('');
    } catch (err) {
      const msg = err.message || 'Error al reportar pago';
      if (/ya fue registrada|ya fue reportada/i.test(msg)) {
        setPagoValidationErrors({
          ref: `La referencia #${pagoRef.trim()} ya fue reportada anteriormente. Si cometiste un error, escríbenos a Soporte por WhatsApp.`
        });
      }
      showToast(msg, 'error');
    } finally {
      setSubmittingPago(false);
    }
  };

  // Cambiar Contraseña
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('La contraseña debe tener mínimo 6 caracteres', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }

    setUpdatingPassword(true);
    try {
      if (supabase) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      }
      showToast('Contraseña actualizada correctamente');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err.message || 'Error al cambiar contraseña', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Descargar Copia de Seguridad JSON
  const handleDownloadBackup = () => {
    try {
      const backupData = {
        app: 'FacturasYa Cloud',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        tenant: tenant || {},
        user: session?.user?.email || 'dueño'
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${tenant?.slug || 'facturasya'}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Copia de seguridad descargada');
    } catch (e) {
      showToast('Error al descargar copia', 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white text-zinc-900 border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row w-full max-w-4xl min-h-[580px] max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* SIDEBAR DEL MODAL ESTILO NOTION */}
        <aside className="w-full md:w-64 bg-zinc-50 border-b md:border-b-0 md:border-r border-zinc-200 p-4 flex flex-col justify-between shrink-0 select-none">
          <div className="space-y-4">
            
            {/* ENCABEZADO */}
            <div className="flex items-center gap-2.5 px-2 pb-3 border-b border-zinc-200">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                FY
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-zinc-950 truncate">
                  {tenant?.name || 'Mi Negocio'}
                </h3>
                <span className="text-[11px] text-zinc-500 block truncate">
                  {session?.user?.email || 'admin@facturasya.com'}
                </span>
              </div>
            </div>

            {/* LISTA DE PESTAÑAS */}
            <nav className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Ajustes del Negocio
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('fiscal')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                  activeTab === 'fiscal'
                    ? 'bg-zinc-900 text-white shadow-xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <Building2 size={15} />
                <span className="flex-1">Datos Fiscales SENIAT</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('hardware')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                  activeTab === 'hardware'
                    ? 'bg-zinc-900 text-white shadow-xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <Printer size={15} />
                <span className="flex-1">Máquina Fiscal & Cable</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                  activeTab === 'profile' || activeTab === 'restaurant'
                    ? 'bg-zinc-900 text-white shadow-xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <Sliders size={15} />
                <span className="flex-1">Perfil de Negocio & Módulos</span>
              </button>

              <div className="pt-3 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Cuenta y Planes
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('subscription')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                  activeTab === 'subscription'
                    ? 'bg-zinc-900 text-white shadow-xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <CreditCard size={15} />
                <span className="flex-1">Plan & Suscripción</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  {subStatus?.daysRemaining || 14}d
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('account')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                  activeTab === 'account'
                    ? 'bg-zinc-900 text-white shadow-xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <User size={15} />
                <span className="flex-1">Seguridad & Cuenta</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('backup')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                  activeTab === 'backup'
                    ? 'bg-zinc-900 text-white shadow-xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <Database size={15} />
                <span className="flex-1">Copias de Seguridad</span>
              </button>
            </nav>
          </div>

          <div className="pt-3 border-t border-zinc-200 text-[11px] text-zinc-400 flex items-center justify-between">
            <span>FacturasYa v2.0 SaaS</span>
            <span className="font-semibold text-emerald-600">En línea</span>
          </div>
        </aside>

        {/* CONTENIDO DEL PANEL DERECHO */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col justify-between bg-white">
          <div className="space-y-6">
            
            {/* BARRA SUPERIOR DEL MODAL */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-zinc-950">
                  {activeTab === 'fiscal' && '🏢 Datos Fiscales del Negocio (SENIAT)'}
                  {activeTab === 'hardware' && '🖨️ Conexión con Máquina Fiscal HKA80'}
                  {activeTab === 'restaurant' && '🍔 Modo Restaurante, Mesas y Salón'}
                  {activeTab === 'subscription' && '💳 Plan de Suscripción & Pago Móvil'}
                  {activeTab === 'account' && '👤 Seguridad y Contraseña'}
                  {activeTab === 'backup' && '💾 Respaldos y Copias de Seguridad'}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Ajustes centralizados de tu negocio. Se guardan al instante.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                title="Cerrar ajustes"
              >
                <X size={18} />
              </button>
            </div>

            {/* TOAST DE NOTIFICACIÓN */}
            {toast && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  toast.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                <span>{toast.msg}</span>
              </div>
            )}

            {/* TAB 1: DATOS FISCALES */}
            {activeTab === 'fiscal' && (
              <form onSubmit={handleSaveFiscal} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={18} className={tenant?.is_fiscal_verified ? 'text-emerald-600' : 'text-amber-600'} />
                    <div>
                      <div className="text-xs font-bold text-zinc-950 flex items-center gap-2">
                        <span>Estado Fiscal del Negocio</span>
                        {tenant?.is_fiscal_verified ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Verificado SENIAT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Pendiente de Verificación
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Al guardar tus datos fiscales aquí, tu negocio queda verificado y listo para Libros de Ventas SENIAT.
                      </p>
                    </div>
                  </div>

                  {isElectron && (
                    <button
                      type="button"
                      disabled={readingS1ForFiscal}
                      onClick={handleReadChipS1}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Printer size={13} />
                      <span>{readingS1ForFiscal ? 'Leyendo S1...' : '⚡ Leer RIF y Serial de Impresora'}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Nombre Comercial *</label>
                    <input
                      type="text"
                      value={fiscalForm.name}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, name: e.target.value })}
                      placeholder="Ej. Happy Days Burger"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Razón Social Legal (SENIAT) *</label>
                    <input
                      type="text"
                      required
                      value={fiscalForm.legalName}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, legalName: e.target.value })}
                      placeholder="Ej. Inversiones Happy Days C.A."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">RIF Fiscal SENIAT *</label>
                    <input
                      type="text"
                      value={fiscalForm.rif}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, rif: e.target.value.toUpperCase() })}
                      onBlur={(e) => setFiscalForm((prev) => ({ ...prev, rif: formatRifSeniat(e.target.value) }))}
                      placeholder="J-50123456-0"
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Serial Máquina Fiscal (HKA80)</label>
                    <input
                      type="text"
                      value={fiscalForm.fiscalSerial}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, fiscalSerial: e.target.value.toUpperCase() })}
                      placeholder="Ej. Z7B1234567"
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Teléfono de Contacto</label>
                    <input
                      type="text"
                      value={fiscalForm.phone}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, phone: e.target.value })}
                      placeholder="0412-1234567"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Dirección Fiscal Completa *</label>
                  <textarea
                    rows={2}
                    required
                    value={fiscalForm.address}
                    onChange={(e) => setFiscalForm({ ...fiscalForm, address: e.target.value })}
                    placeholder="Av. Principal, Edif. Centro, Local 2, Ciudad..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingFiscal}
                    className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-xs transition-all active:scale-98 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck size={14} />
                    <span>{savingFiscal ? 'Verificando...' : 'Guardar y Verificar Negocio'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: HARDWARE FISCAL Y COMANDERA DE COCINA */}
            {activeTab === 'hardware' && (
              <div className="space-y-5">
                {/* 0. IDENTIDAD DE CAJA / TERMINAL POS (SOPORTE MULTI-CAJA Y MULTI-MÁQUINA FISCAL) */}
                <div className="border border-zinc-200 rounded-2xl p-4 space-y-3 bg-zinc-50/70 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-200/80 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-zinc-900 text-white">
                        <Laptop size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-950">Identidad de esta Caja / Terminal POS (Multi-Caja)</h4>
                        <p className="text-[11px] text-zinc-500">
                          Cada PC guarda su propio número de Caja, Puerto COM y Serial Fiscal sin sobrescribir las demás cajas.
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white font-mono text-[11px] font-bold">
                      {terminalConfig.terminalId}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">Código de Caja en esta PC</label>
                      <select
                        value={terminalConfig.terminalId}
                        onChange={(e) => {
                          const id = e.target.value;
                          const defaultNames = {
                            'CAJA-01': 'Caja Principal',
                            'CAJA-02': 'Caja Secundaria / Barra',
                            'CAJA-03': 'Caja Terraza / 3',
                            'CAJA-04': 'Caja Delivery / 4'
                          };
                          const next = saveLocalTerminalConfig({
                            terminalId: id,
                            terminalName: defaultNames[id] || terminalConfig.terminalName
                          });
                          setTerminalConfig(next);
                          showToast(`Esta PC quedó asignada como ${id} (${next.terminalName})`);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-white font-bold text-zinc-900"
                      >
                        <option value="CAJA-01">CAJA-01 (Principal)</option>
                        <option value="CAJA-02">CAJA-02 (Caja 2 / Barra)</option>
                        <option value="CAJA-03">CAJA-03 (Caja 3 / Terraza)</option>
                        <option value="CAJA-04">CAJA-04 (Caja 4 / Adicional)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">Nombre de la Caja</label>
                      <input
                        type="text"
                        value={terminalConfig.terminalName}
                        onChange={(e) => {
                          const next = saveLocalTerminalConfig({ terminalName: e.target.value });
                          setTerminalConfig(next);
                        }}
                        placeholder="Ej. Caja Principal"
                        className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">Serial Fiscal de esta Caja</label>
                      <input
                        type="text"
                        value={terminalConfig.fiscalSerial || fiscalForm.fiscalSerial || ''}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          const next = saveLocalTerminalConfig({ fiscalSerial: val });
                          setTerminalConfig(next);
                        }}
                        placeholder="Se detecta con S1 o manual"
                        className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-mono font-bold uppercase"
                      />
                    </div>
                  </div>
                </div>
                {/* 1. SECCIÓN COMANDERA DE COCINA (DISPOSITIVO + ANCHO + MODO DIRECTO + PRUEBA) */}
                <div className="border border-zinc-200 rounded-2xl p-4 space-y-4 bg-white shadow-2xs">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                        <ChefHat size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-950">Impresora Térmica de Comandas (Cocina / Barra)</h4>
                        <p className="text-[11px] text-zinc-500">Tickets de comandas sin diálogo, corte automático y ancho adaptable</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={testingComanda}
                      onClick={handleTestComandaPrint}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                      title="Enviar un ticket corto de prueba a la impresora térmica"
                    >
                      <Sparkles size={13} />
                      <span>{testingComanda ? 'Imprimiendo...' : '⚡ Probar Impresión'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Selector de Impresora Detectada en Windows */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-zinc-700">
                          Dispositivo de Impresión (Windows)
                        </label>
                        {isElectron && (
                          <button
                            type="button"
                            onClick={loadNativePrinters}
                            disabled={loadingPrinters}
                            className="text-[10px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer"
                            title="Refrescar lista de impresoras de Windows"
                          >
                            <RefreshCw size={11} className={loadingPrinters ? 'animate-spin' : ''} />
                            <span>Detectar</span>
                          </button>
                        )}
                      </div>

                      {isElectron ? (
                        printersList.length > 0 ? (
                          <select
                            value={selectedComandaPrinter}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSelectedComandaPrinter(val);
                              localStorage.setItem('pos_comanda_printer', val);
                              showToast(`Comandera configurada en: ${val || 'Automática'}`);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-white text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950 cursor-pointer"
                          >
                            <option value="">-- Detección Automática Inteligente --</option>
                            {printersList.map((p) => {
                              const isDef = p.isDefault;
                              const isThermal = /pos|58|80|thermal|ticket|xp-|tm-|receipt|kitchen|comanda|bixolon|star|epson|citizen|xprinter|3nstar|zkteco/i.test(p.name);
                              return (
                                <option key={p.name} value={p.name}>
                                  {p.name} {isDef ? '★ (Predeterminada)' : ''} {isThermal && !isDef ? '⚡ (Térmica)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600 flex items-center justify-between">
                            <span>Detectando impresoras del sistema...</span>
                            <button
                              type="button"
                              onClick={loadNativePrinters}
                              className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
                            >
                              Reintentar
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-[11px] text-zinc-600 space-y-1">
                          <p className="font-semibold text-zinc-900">🌐 Modo Web / Tablet Remota</p>
                          <p className="text-[10px] text-zinc-500">
                            Las comandas se canalizan automáticamente a la comandera configurada en la PC de caja principal.
                          </p>
                        </div>
                      )}
                      <span className="text-[10px] text-zinc-400 block">
                        {selectedComandaPrinter
                          ? `Enviará comandas directo a: "${selectedComandaPrinter}"`
                          : 'Detección automática: buscará cualquier comandera térmica conectada.'}
                      </span>
                    </div>

                    {/* Ancho del Rollo Térmico */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700">
                        Ancho del Rollo Térmico
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setComandaPaperSize('58mm');
                            localStorage.setItem('pos_comanda_paper_size', '58mm');
                            showToast('Rollo de comanda configurado en 58mm (Estándar)');
                          }}
                          className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            comandaPaperSize === '58mm'
                              ? 'bg-zinc-950 text-white border-zinc-950 shadow-2xs'
                              : 'bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-100'
                          }`}
                        >
                          📄 58 mm (Estándar)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setComandaPaperSize('80mm');
                            localStorage.setItem('pos_comanda_paper_size', '80mm');
                            showToast('Rollo de comanda configurado en 80mm (Ancho)');
                          }}
                          className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            comandaPaperSize === '80mm'
                              ? 'bg-zinc-950 text-white border-zinc-950 shadow-2xs'
                              : 'bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-100'
                          }`}
                        >
                          📜 80 mm (Ancho cocina)
                        </button>
                      </div>
                      <span className="text-[10px] text-zinc-400 block">
                        58mm para comanderas estándar pequeñas; 80mm para comanderas industriales de cocina.
                      </span>
                    </div>
                  </div>

                  {/* Interruptor de Impresión Directa en 1 Clic */}
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-bold text-zinc-900">
                        Impresión Directa en 1 Clic (Sin Ventana Emergente)
                      </span>
                      <span className="block text-[10px] text-zinc-500">
                        Al pulsar "Imprimir" en mesas o barra, el ticket sale directo a cocina en segundo plano.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !directPrintComanda;
                        setDirectPrintComanda(next);
                        localStorage.setItem('pos_comanda_direct_print', String(next));
                        showToast(next ? 'Impresión directa en 1 clic activada' : 'Impresión con vista previa activada');
                      }}
                      className="text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
                    >
                      {directPrintComanda ? (
                        <ToggleRight size={28} className="text-emerald-600" />
                      ) : (
                        <ToggleLeft size={28} className="text-zinc-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 2. SECCIÓN MÁQUINA FISCAL SENIAT */}
                <div className="border border-zinc-200 rounded-2xl p-4 space-y-4 bg-white shadow-2xs">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Printer size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-950">Máquina Fiscal SENIAT (The Factory HKA80 / Serial)</h4>
                        <p className="text-[11px] text-zinc-500">
                          {isElectron
                            ? `Comunicación serial directa activa en ${fiscalPort} (9600 baud)`
                            : 'Conexión física por cable RS232 COM2 a 9600 baudios'}
                        </p>
                      </div>
                    </div>

                    {isElectron && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = !fiscalEnabled;
                          setFiscalEnabled(next);
                          if (data?.updateFiscalSettings) {
                            data.updateFiscalSettings({ enabled: next, port: fiscalPort });
                          }
                          showToast(next ? 'Impresora fiscal habilitada' : 'Impresora fiscal deshabilitada');
                        }}
                        className="text-zinc-700 hover:text-zinc-950 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                      >
                        {fiscalEnabled ? (
                          <ToggleRight size={28} className="text-emerald-600" />
                        ) : (
                          <ToggleLeft size={28} className="text-zinc-400" />
                        )}
                        <span>{fiscalEnabled ? 'Activa' : 'Inactiva'}</span>
                      </button>
                    )}
                  </div>

                  {isElectron ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                            Puerto Serial (RS232 / USB-Serial)
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={fiscalPort}
                              onChange={(e) => {
                                const p = e.target.value;
                                setFiscalPort(p);
                                if (data?.updateFiscalSettings) {
                                  data.updateFiscalSettings({ port: p, enabled: fiscalEnabled });
                                }
                                showToast(`Puerto fiscal cambiado a ${p}`);
                              }}
                              className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-900 bg-white focus:outline-none focus:border-zinc-900"
                            >
                              {['COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8'].map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>

                            <button
                              type="button"
                              disabled={detectingPort}
                              onClick={async () => {
                                setDetectingPort(true);
                                try {
                                  const res = await window.electronAPI?.fiscal?.autoDetectPort?.(fiscalPort);
                                  const found = res?.activePort || res?.port;
                                  if (res?.success && found) {
                                    setFiscalPort(found);
                                    data?.updateFiscalSettings?.({ port: found, enabled: true });
                                    showToast(`Impresora fiscal detectada en ${found}`);
                                  } else {
                                    showToast(res?.message || 'No se detectó respuesta automática; verifica que esté encendida.', 'error');
                                  }
                                } catch (err) {
                                  showToast(err.message, 'error');
                                } finally {
                                  setDetectingPort(false);
                                }
                              }}
                              className="px-3 py-2 rounded-xl border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-xs font-bold text-zinc-800 cursor-pointer flex items-center gap-1.5"
                            >
                              <RefreshCw size={13} className={detectingPort ? 'animate-spin' : ''} />
                              <span>Auto-Detectar</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                            Diagnóstico de Conexión y Estado S1
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={testingFiscal}
                              onClick={async () => {
                                setTestingFiscal(true);
                                try {
                                  const s1 = await window.electronAPI?.fiscal?.getS1Status?.(fiscalPort);
                                  if (s1 && s1.success !== false) {
                                    setS1Preview(s1);
                                    const detectedSerial = String(s1.registeredMachineNumber || s1.registered_machine_number || '').trim().toUpperCase();
                                    if (detectedSerial) {
                                      const nextTerm = saveLocalTerminalConfig({ fiscalSerial: detectedSerial, port: fiscalPort });
                                      setTerminalConfig(nextTerm);
                                    }
                                    showToast(`Conectada en ${fiscalPort} · Serial ${detectedSerial || 'HKA80'}`);
                                  } else {
                                    showToast(s1?.error || `Sin respuesta en ${fiscalPort}`, 'error');
                                  }
                                } catch (err) {
                                  showToast(err.message, 'error');
                                } finally {
                                  setTestingFiscal(false);
                                }
                              }}
                              className="flex-1 py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <RefreshCw size={13} className={testingFiscal ? 'animate-spin' : ''} />
                              <span>Probar Conexión S1</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => window.electronAPI?.fiscal?.openLogFile?.()}
                              className="py-2 px-3 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold cursor-pointer"
                            >
                              Ver Log
                            </button>
                          </div>
                        </div>
                      </div>

                      {s1Preview && (
                        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-700 uppercase block">Serial Máquina</span>
                            <span className="font-mono font-black text-emerald-950">
                              {s1Preview.registeredMachineNumber || s1Preview.registered_machine_number || 'HKA80'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-emerald-700 uppercase block">Última Factura</span>
                            <span className="font-mono font-black text-emerald-950">
                              #{String(s1Preview.lastInvoiceNumber ?? s1Preview.last_invoice_number ?? 0).padStart(8, '0')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-emerald-700 uppercase block">Cierres Z Acumulados</span>
                            <span className="font-mono font-black text-emerald-950">
                              Z #{Number(s1Preview.dailyClosureCounter ?? s1Preview.z_counter ?? 0)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-900 space-y-2">
                        <p className="leading-relaxed">
                          <strong>Modo Web en la Nube:</strong> Para conectar físicamente la impresora fiscal por cable serial RS232/USB y consultar la memoria Z desde el chip, abre la aplicación instalada en tu PC de caja.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                        <div className="space-y-0.5">
                          <span className="font-bold text-xs text-zinc-900 block">FacturasYa para Windows (.exe)</span>
                          <span className="text-[11px] text-zinc-500 block">Instalador directo para tu computadora de mostrador</span>
                        </div>
                        <a
                          href="https://github.com/halinyer/FacturasYa/releases/latest/download/FacturaPOS-1.0.0.exe"
                          download="FacturaPOS-1.0.0.exe"
                          className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Download size={13} />
                          <span>Descargar Windows (.exe)</span>
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: PERFIL DE NEGOCIO Y MÓDULOS MODULARES (ESTILO NOTION) */}
            {(activeTab === 'profile' || activeTab === 'restaurant') && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-950">
                    Giro y Operativa del Negocio
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Adapta la interfaz de FacturasYa para que coincida exactamente con las necesidades de tu establecimiento:
                  </p>
                </div>

                {/* Tarjetas de Selección de Perfil */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {BUSINESS_PROFILES_LIST.filter((p) => p.id !== 'custom').map((p) => {
                    const isSelected = activeProfile.id === p.id;

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProfileInSettings(p.id)}
                        className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-zinc-950 bg-zinc-50/80 shadow-xs ring-1 ring-zinc-950/20'
                            : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xl">{p.icon}</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                              isSelected ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'
                            }`}>
                              {p.badge}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-zinc-950">{p.name}</h4>
                            <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-3 leading-tight">{p.description}</p>
                          </div>
                        </div>

                        <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-bold">
                          <span className={isSelected ? 'text-zinc-950' : 'text-zinc-400'}>
                            {isSelected ? '✓ Activo' : 'Activar'}
                          </span>
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-300 bg-white'
                          }`}>
                            {isSelected && <div className="w-1 h-1 rounded-full bg-white" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Precarga de Catálogo Oficial de Helados */}
                {activeProfile.id === 'ice_cream' && (
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/90 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🍨</span>
                      <div>
                        <span className="font-bold text-amber-950 block">Catálogo Oficial Helados La Cascada</span>
                        <span className="text-[10px] text-amber-800/80 block">60+ helados con 4 escalas de precios listas para facturar.</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('¿Precargar el catálogo oficial de Helados La Cascada con sus 4 precios (Detal, Mayor, Congelador, Microdistribuidor)?')) {
                          db.rawSet('pos_products', HELADOS_LA_CASCADA_PRODUCTS);
                          try { localStorage.setItem('pos_products', JSON.stringify(HELADOS_LA_CASCADA_PRODUCTS)); } catch (e) {}
                          showToast('¡Catálogo de Helados La Cascada cargado exitosamente!');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-900 text-white text-[11px] font-bold hover:bg-amber-950 transition-colors shrink-0 cursor-pointer"
                    >
                      Cargar Catálogo
                    </button>
                  </div>
                )}

                {/* Control Fino de Módulos */}
                <div className="border border-zinc-200 rounded-xl p-3.5 bg-zinc-50/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-950">Módulos de Interfaz Habilitados</h4>
                    <span className="text-[10px] text-zinc-400 font-semibold">
                      {activeProfile.id === 'custom' ? 'Personalizado' : 'Preset activo'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-zinc-200/80">
                      <div>
                        <span className="font-bold text-zinc-900 block text-[11px]">Mesas & Salón</span>
                        <span className="text-[10px] text-zinc-400">Mostrar pestaña y comensales</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleModuleInSettings('hasTables')}
                        className="cursor-pointer"
                      >
                        {profileFeatures.hasTables ? (
                          <ToggleRight size={24} className="text-emerald-600" />
                        ) : (
                          <ToggleLeft size={24} className="text-zinc-400" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-zinc-200/80">
                      <div>
                        <span className="font-bold text-zinc-900 block text-[11px]">Comandas a Cocina</span>
                        <span className="text-[10px] text-zinc-400">Tickets para barra o fogones</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleModuleInSettings('hasKitchenTickets')}
                        className="cursor-pointer"
                      >
                        {profileFeatures.hasKitchenTickets ? (
                          <ToggleRight size={24} className="text-emerald-600" />
                        ) : (
                          <ToggleLeft size={24} className="text-zinc-400" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-zinc-200/80">
                      <div>
                        <span className="font-bold text-zinc-900 block text-[11px]">Escalas de Precios</span>
                        <span className="text-[10px] text-zinc-400">Detal, Mayor 6+, Congelador</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleModuleInSettings('hasMultiPricing')}
                        className="cursor-pointer"
                      >
                        {profileFeatures.hasMultiPricing ? (
                          <ToggleRight size={24} className="text-emerald-600" />
                        ) : (
                          <ToggleLeft size={24} className="text-zinc-400" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-zinc-200/80">
                      <div>
                        <span className="font-bold text-zinc-900 block text-[11px]">Lector de Barras</span>
                        <span className="text-[10px] text-zinc-400">Búsqueda rápida con escáner</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleModuleInSettings('hasBarcode')}
                        className="cursor-pointer"
                      >
                        {profileFeatures.hasBarcode ? (
                          <ToggleRight size={24} className="text-emerald-600" />
                        ) : (
                          <ToggleLeft size={24} className="text-zinc-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SUSCRIPCIÓN & PAGO MÓVIL / BINANCE */}
            {activeTab === 'subscription' && (
              <div className="space-y-5">
                {/* Banner de días restantes */}
                <div className="p-4 rounded-xl bg-zinc-900 text-white flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      Plan Actual: {tenant?.plan === 'annual' ? 'Anual Activo' : tenant?.plan === 'monthly' ? 'Mensual Activo' : 'Prueba Gratuita'}
                    </span>
                    <h3 className="text-sm font-extrabold mt-0.5">
                      {subStatus?.daysRemaining ?? 14} Días de Acceso Restantes
                    </h3>
                    {tenant?.valid_until && (
                      <span className="text-[11px] text-zinc-400 block mt-0.5">
                        Fecha de corte: {new Date(tenant.valid_until).toLocaleDateString('es-VE')}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-zinc-200 block">
                      Tasa BCV: Bs. {activeRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Activación automática en tiempo real
                    </span>
                  </div>
                </div>

                {/* Plan Mensual Único */}
                <div className="p-3.5 rounded-xl border border-zinc-950 bg-zinc-50/70 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-950 text-xs">Suscripción Plan Mensual (+30 días)</span>
                    <span className="font-mono font-extrabold text-sm text-zinc-950">${monthlyUsd.toFixed(0)} / mes</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    Monto en Bolívares: <strong className="text-zinc-900">Bs. {(monthlyUsd * activeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> (Calculado a tasa oficial BCV)
                  </div>
                </div>

                {/* Selector de Método: Pago Móvil vs Binance Pay */}
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPagoMethod('pago_movil')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      pagoMethod === 'pago_movil'
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-2xs'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <Smartphone size={14} />
                    <span>Pago Móvil (Bolívares BCV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPagoMethod('binance')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      pagoMethod === 'binance'
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-2xs'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <CreditCard size={14} />
                    <span>Binance Pay (USDT Sin Límites)</span>
                  </button>
                </div>

                {/* Datos Receptores Dinámicos */}
                {pagoMethod === 'pago_movil' ? (
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Cuenta Receptora Pago Móvil ({saasConfig?.pago_movil_holder || 'FacturasYa'}):
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {saasConfig?.pago_movil_bank || '0172 - Bancamiga'}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-2 pt-1">
                      <div className="p-2.5 rounded-lg bg-white border border-zinc-200/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400 block">Teléfono</span>
                          <strong className="font-mono text-zinc-950">{saasConfig?.pago_movil_phone || '0412-0000000'}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText(saasConfig?.pago_movil_phone || '0412-0000000', 'pm_phone')}
                          className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 cursor-pointer"
                          title="Copiar teléfono"
                        >
                          {copiedKey === 'pm_phone' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white border border-zinc-200/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400 block">Cédula / RIF</span>
                          <strong className="font-mono text-zinc-950">{saasConfig?.pago_movil_rif_ci || 'V-00000000'}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText(saasConfig?.pago_movil_rif_ci || 'V-00000000', 'pm_rif')}
                          className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 cursor-pointer"
                          title="Copiar RIF / Cédula"
                        >
                          {copiedKey === 'pm_rif' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      </div>

                      <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-emerald-700 font-semibold block">Monto Exacto (Bs)</span>
                          <strong className="font-mono text-emerald-950">
                            Bs. {currentPlanBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText(currentPlanBs.toFixed(2), 'pm_bs')}
                          className="p-1.5 rounded-md hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                          title="Copiar monto en Bs"
                        >
                          {copiedKey === 'pm_bs' ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      Datos para Enviar por Binance Pay (0% Comisión):
                    </span>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg bg-white border border-zinc-200/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400 block">Correo / Binance ID</span>
                          <strong className="font-mono text-zinc-950">
                            {saasConfig?.binance_email || 'pagos@facturasya.com'}
                          </strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText(saasConfig?.binance_email || 'pagos@facturasya.com', 'bn_email')}
                          className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 cursor-pointer"
                        >
                          {copiedKey === 'bn_email' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-emerald-700 font-semibold block">Monto a Enviar (USDT)</span>
                          <strong className="font-mono text-emerald-950">${currentPlanUsd.toFixed(2)} USDT</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText(currentPlanUsd.toFixed(2), 'bn_usd')}
                          className="p-1.5 rounded-md hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                        >
                          {copiedKey === 'bn_usd' ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Formulario de Reporte */}
                <form
                  onSubmit={handleReportPago}
                  onPaste={handlePasteReceipt}
                  className="space-y-3.5 border border-zinc-200 rounded-xl p-4 bg-white"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
                      <Smartphone size={15} className="text-emerald-600" />
                      <span>
                        {pagoMethod === 'pago_movil'
                          ? 'Reportar Comprobante de Pago Móvil'
                          : 'Reportar Orden de Binance Pay (USDT)'}
                      </span>
                    </h4>
                    <span className="text-[10px] text-zinc-400">Pega tu capture con Ctrl+V</span>
                  </div>

                  {pagoMethod === 'pago_movil' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-700 mb-1">Banco Emisor *</label>
                        <select
                          value={pagoBank}
                          onChange={(e) => setPagoBank(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 bg-white"
                        >
                          {VENEZUELA_BANKS.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-700 mb-1">Teléfono Emisor *</label>
                        <input
                          type="text"
                          value={pagoPhone}
                          onChange={(e) => {
                            setPagoPhone(e.target.value);
                            if (pagoValidationErrors.phone) {
                              setPagoValidationErrors((prev) => ({ ...prev, phone: null }));
                            }
                          }}
                          placeholder="0414-1234567"
                          className={`w-full px-3 py-2 text-xs rounded-lg border ${
                            pagoValidationErrors.phone ? 'border-red-400 bg-red-50/50' : 'border-zinc-200'
                          }`}
                        />
                        {pagoValidationErrors.phone && (
                          <span className="text-[10px] text-red-600 font-medium block mt-1">
                            {pagoValidationErrors.phone}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-700 mb-1">Cédula / RIF Titular</label>
                        <input
                          type="text"
                          value={pagoPayerDoc}
                          onChange={(e) => setPagoPayerDoc(e.target.value.toUpperCase())}
                          placeholder="V-12345678"
                          className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-200 uppercase"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                      {pagoMethod === 'pago_movil'
                        ? 'Últimos 4 a 6 dígitos de la Referencia Bancaria *'
                        : 'Últimos dígitos del Order ID de Binance Pay *'}
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={pagoRef}
                      onChange={(e) => {
                        setPagoRef(e.target.value);
                        if (pagoValidationErrors.ref) {
                          setPagoValidationErrors((prev) => ({ ...prev, ref: null }));
                        }
                      }}
                      placeholder={pagoMethod === 'pago_movil' ? 'Ej. 984201' : 'Ej. 28394812'}
                      className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border ${
                        pagoValidationErrors.ref ? 'border-red-400 bg-red-50/50' : 'border-zinc-200'
                      }`}
                    />
                    {pagoValidationErrors.ref ? (
                      <span className="text-[10px] text-red-600 font-semibold block mt-1">
                        {pagoValidationErrors.ref}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 block mt-0.5">
                        {pagoMethod === 'pago_movil'
                          ? 'Copia el número de referencia tal como lo muestra tu banco emisor'
                          : 'Copia el identificador de orden que Binance te asignó'}
                      </span>
                    )}
                  </div>

                  {/* Selector / Uploader de Capture de Pantalla */}
                  <div className="border border-dashed border-zinc-200 rounded-xl p-3 bg-zinc-50/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-zinc-700 flex items-center gap-1.5">
                        <ImageIcon size={13} className="text-zinc-500" />
                        <span>Adjuntar Capture / Comprobante (Recomendado)</span>
                      </label>
                      <span className="text-[10px] text-zinc-400 font-medium">JPG, PNG o WebP (Ctrl+V)</span>
                    </div>

                    {receiptPreview ? (
                      <div className="relative inline-block border border-zinc-200 rounded-lg p-1 bg-white shadow-2xs">
                        <img
                          src={receiptPreview}
                          alt="Comprobante"
                          className="h-24 w-auto rounded object-contain max-w-full cursor-pointer hover:opacity-95"
                          onClick={() => setSelectedReceiptModal(receiptPreview)}
                          title="Clic para ampliar comprobante"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptFile(null);
                            setReceiptPreview('');
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs shadow-xs hover:bg-red-700 cursor-pointer"
                          title="Eliminar capture"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 p-3 bg-white border border-zinc-200 rounded-lg cursor-pointer hover:bg-zinc-50 transition-all text-xs text-zinc-600 font-medium">
                        <UploadCloud size={16} className="text-zinc-400" />
                        <span>Seleccionar screenshot del banco o arrastra aquí</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleReceiptFileChange(e.target.files[0]);
                          }}
                        />
                      </label>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submittingPago}
                    className="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submittingPago
                      ? 'Verificando y Registrando Pago...'
                      : `Confirmar Reporte de Pago Mensual ($${monthlyUsd.toFixed(0)}) →`}
                  </button>

                  {/* Asistencia Directa en caso de duda */}
                  <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <HelpCircle size={12} className="text-zinc-400" />
                      <span>¿Tuviste algún error con tu comprobante?</span>
                    </span>
                    <a
                      href={`https://wa.me/${(saasConfig?.support_whatsapp || saasConfig?.pago_movil_phone || '584128269031').replace(/\D/g, '').replace(/^0/, '58')}?text=${encodeURIComponent(
                        `Hola Soporte FacturasYa, tengo una consulta con el reporte de mi pago de suscripción para ${tenant?.name || 'mi restaurante'} (Ref: ${pagoRef || 'N/A'}).`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Soporte por WhatsApp</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </form>

                {/* Historial de Pagos Reportados */}
                {myPayments.length > 0 && (
                  <div className="border border-zinc-200 rounded-xl overflow-hidden">
                    <div className="px-3.5 py-2 bg-zinc-50 border-b border-zinc-200 text-[11px] font-bold text-zinc-700 flex items-center justify-between">
                      <span>Historial de Pagos Reportados</span>
                      <span className="text-[10px] text-zinc-400 font-normal">Actualizado en tiempo real</span>
                    </div>
                    <div className="divide-y divide-zinc-100 text-xs max-h-48 overflow-y-auto">
                      {myPayments.slice(0, 6).map((p) => (
                        <div key={p.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-zinc-50/50">
                          <div className="flex items-center gap-3">
                            {p.receipt_url && (
                              <button
                                type="button"
                                onClick={() => setSelectedReceiptModal(p.receipt_url)}
                                className="w-9 h-9 rounded-lg border border-zinc-200 overflow-hidden bg-zinc-100 shrink-0 hover:ring-2 hover:ring-zinc-900 transition-all cursor-pointer"
                                title="Ver capture"
                              >
                                <img src={p.receipt_url} alt="Capture" className="w-full h-full object-cover" />
                              </button>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-zinc-950">#{p.reference_last6}</span>
                                <span className="text-zinc-500 text-[11px]">· {p.bank_origin}</span>
                              </div>
                              <span className="text-[10px] text-zinc-400 block">
                                {new Date(p.created_at).toLocaleDateString('es-VE')} · ${Number(p.amount_usd || 0).toFixed(0)} ({p.plan === 'annual' ? 'Anual' : 'Mensual'})
                              </span>
                              {p.status === 'rejected' && p.notes && (
                                <span className="text-[10px] text-red-600 font-semibold block mt-0.5">
                                  Motivo de rechazo: {p.notes}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.status === 'approved' ? 'Aprobado' : p.status === 'rejected' ? 'Rechazado' : 'En Verificación'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: SEGURIDAD & CONTRASEÑA */}
            {activeTab === 'account' && (
              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-sm">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={session?.user?.email || ''}
                    disabled
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Nueva Contraseña</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Confirmar Nueva Contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                >
                  {updatingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </form>
            )}

            {/* TAB 6: COPIAS DE SEGURIDAD */}
            {activeTab === 'backup' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-2">
                  <h4 className="text-xs font-bold text-zinc-950 flex items-center gap-2">
                    <Database size={16} className="text-zinc-700" />
                    <span>Descargar Respaldo JSON de tu Negocio</span>
                  </h4>
                  <p className="text-xs text-zinc-600">
                    Exporta tus datos, información fiscal, clientes y catálogo de productos en un archivo seguro en formato JSON.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-xs transition-all active:scale-98"
                  >
                    <Download size={14} />
                    <span>Descargar Respaldo Ahora</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

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
