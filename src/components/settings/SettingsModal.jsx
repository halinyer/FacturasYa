import React, { useState, useEffect } from 'react';
import {
  Building2,
  Printer,
  CreditCard,
  Utensils,
  User,
  Database,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Lock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { CLIENT_CONFIG } from '../../config/clientConfig';
import { supabase } from '../../lib/supabaseClient';

const VENEZUELA_BANKS = [
  '0102 - Banco de Venezuela',
  '0108 - Banco Provincial (BBVA)',
  '0134 - Banesco',
  '0105 - Banco Mercantil',
  '0172 - Bancamiga',
  '0114 - Bancaribe',
  '0116 - Banco Occidental de Descuento (BNC)',
  '0174 - Banplus'
];

export default function SettingsModal({ isOpen, onClose, showToast }) {
  if (!isOpen) return null;

  const { tenant, subStatus, user } = useAuth();
  const {
    restaurantMode,
    toggleRestaurantMode,
    fiscalSettings,
    updateFiscalSettings,
    fiscalAutoDetectPort,
    fiscalTestConnection,
    fiscalGetPorts
  } = useData() || {};

  const [activeTab, setActiveTab] = useState('fiscal'); // 'fiscal' | 'hardware' | 'subscription' | 'restaurant' | 'account' | 'backup'

  // 1. Estado de Datos Fiscales
  const [fiscalForm, setFiscalForm] = useState({
    name: tenant?.name || CLIENT_CONFIG?.name || '',
    legalName: tenant?.legal_name || CLIENT_CONFIG?.legalName || '',
    rif: tenant?.rif || CLIENT_CONFIG?.rif || 'J-',
    address: tenant?.fiscal_address || CLIENT_CONFIG?.address || '',
    phone: tenant?.phone || CLIENT_CONFIG?.phone || '',
    instagram: tenant?.instagram || CLIENT_CONFIG?.instagram || ''
  });
  const [savingFiscal, setSavingFiscal] = useState(false);

  // 2. Estado de Hardware Fiscal
  const [fiscalPorts, setFiscalPorts] = useState([]);
  const [detectingPorts, setDetectingPorts] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [selectedPort, setSelectedPort] = useState(fiscalSettings?.port || 'COM2');

  // 3. Estado de Suscripción / Pago Móvil
  const [pagoPlan, setPagoPlan] = useState('monthly');
  const [pagoBank, setPagoBank] = useState(VENEZUELA_BANKS[0]);
  const [pagoPhone, setPagoPhone] = useState('');
  const [pagoRef, setPagoRef] = useState('');
  const [submittingPago, setSubmittingPago] = useState(false);

  // 4. Estado de Cuenta y Contraseña
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Auto-detectar puertos fiscal si está en Electron
  useEffect(() => {
    if (activeTab === 'hardware' && fiscalAutoDetectPort) {
      setDetectingPorts(true);
      fiscalAutoDetectPort(selectedPort)
        .then((res) => {
          if (res?.ports) setFiscalPorts(res.ports);
          if (res?.success) setConnectionStatus({ ok: true, msg: `Conectada en ${res.activePort || selectedPort}` });
        })
        .catch(() => {})
        .finally(() => setDetectingPorts(false));
    }
  }, [activeTab]);

  // Manejo de guardado fiscal
  const handleSaveFiscal = async (e) => {
    e.preventDefault();
    setSavingFiscal(true);
    try {
      if (tenant?.id && supabase) {
        await supabase
          .from('tenants')
          .update({
            name: fiscalForm.name.trim(),
            legal_name: fiscalForm.legalName.trim(),
            rif: fiscalForm.rif.trim().toUpperCase(),
            fiscal_address: fiscalForm.address.trim(),
            phone: fiscalForm.phone.trim(),
            instagram: fiscalForm.instagram.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', tenant.id);
      }
      // Actualizar localStorage para modo local
      const current = JSON.parse(localStorage.getItem('saas_active_tenant') || '{}');
      localStorage.setItem('saas_active_tenant', JSON.stringify({
        ...current,
        name: fiscalForm.name,
        legal_name: fiscalForm.legalName,
        rif: fiscalForm.rif,
        fiscal_address: fiscalForm.address,
        phone: fiscalForm.phone,
        instagram: fiscalForm.instagram
      }));

      showToast?.('¡Datos fiscales guardados con éxito!', 'success');
    } catch (err) {
      showToast?.(err.message || 'Error guardando datos fiscales.', 'error');
    } finally {
      setSavingFiscal(false);
    }
  };

  // Manejo de detección y test de impresora fiscal
  const handleDetectFiscal = async () => {
    setDetectingPorts(true);
    try {
      if (fiscalAutoDetectPort) {
        const res = await fiscalAutoDetectPort(selectedPort);
        if (res?.ports) setFiscalPorts(res.ports);
        const active = res?.activePort || res?.port;
        if (active) {
          setSelectedPort(active);
          updateFiscalSettings?.({ port: active });
          setConnectionStatus({ ok: true, msg: `Impresora detectada en ${active}` });
          showToast?.(`¡Impresora HKA detectada en ${active}!`, 'success');
        } else {
          setConnectionStatus({ ok: false, msg: 'No se detectó impresora fiscal en los puertos COM.' });
          showToast?.('No se detectó impresora fiscal en los puertos COM.', 'error');
        }
      } else {
        showToast?.('Detección directa por cable USB/Serial solo disponible en la app de Windows.', 'info');
      }
    } catch (err) {
      showToast?.('Error al escanear puertos.', 'error');
    } finally {
      setDetectingPorts(false);
    }
  };

  const handleTestFiscal = async () => {
    setTestingConnection(true);
    try {
      if (fiscalTestConnection) {
        const res = await fiscalTestConnection();
        if (res?.success) {
          setConnectionStatus({ ok: true, msg: 'Comunicación exitosa (Comando S1 respondido).' });
          showToast?.('¡Impresora fiscal respondiendo correctamente!', 'success');
        } else {
          setConnectionStatus({ ok: false, msg: res?.error || 'Sin respuesta de la impresora.' });
          showToast?.(res?.error || 'Sin respuesta de la impresora fiscal.', 'error');
        }
      } else {
        showToast?.('Disponible en la aplicación de escritorio de Windows conectada a la máquina.', 'info');
      }
    } catch (err) {
      showToast?.('Error en prueba de comunicación.', 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  // Manejo de reporte de Pago Móvil
  const handleReportPago = async (e) => {
    e.preventDefault();
    if (!pagoPhone || pagoRef.length < 4) {
      showToast?.('Ingresa el teléfono emisor y los últimos 6 dígitos de referencia.', 'error');
      return;
    }
    setSubmittingPago(true);
    try {
      if (tenant?.id && supabase) {
        await supabase
          .from('subscription_payments')
          .insert({
            tenant_id: tenant.id,
            tenant_name: tenant.name || 'Mi Negocio',
            plan: pagoPlan,
            amount_usd: pagoPlan === 'annual' ? 300 : 30,
            amount_bs: (pagoPlan === 'annual' ? 300 : 30) * 876.80,
            rate_bcv: 876.80,
            bank_origin: pagoBank,
            phone_origin: pagoPhone.trim(),
            reference_last6: pagoRef.trim().slice(-6),
            status: 'pending',
            verified_by: 'pending'
          });
        showToast?.('¡Pago Móvil reportado con éxito! Se activará tras la verificación.', 'success');
        setPagoRef('');
      } else {
        showToast?.('Pago reportado en modo demostración.', 'success');
      }
    } catch (err) {
      showToast?.(err.message || 'Error reportando el pago.', 'error');
    } finally {
      setSubmittingPago(false);
    }
  };

  // Manejo de cambio de contraseña
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast?.('La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast?.('Las contraseñas no coinciden.', 'error');
      return;
    }
    setUpdatingPassword(true);
    try {
      if (supabase) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        showToast?.('¡Contraseña actualizada con éxito!', 'success');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      showToast?.(err.message || 'Error actualizando contraseña.', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Manejo de descarga de copia de seguridad JSON
  const handleDownloadBackup = () => {
    const data = {
      tenant,
      products: localStorage.getItem('pos_products') ? JSON.parse(localStorage.getItem('pos_products')) : [],
      clients: localStorage.getItem('pos_clients') ? JSON.parse(localStorage.getItem('pos_clients')) : [],
      invoices: localStorage.getItem('pos_invoices') ? JSON.parse(localStorage.getItem('pos_invoices')) : [],
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${tenant?.slug || 'facturasya'}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast?.('Copia de seguridad descargada en tu computadora.', 'success');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-4xl w-full flex flex-col md:flex-row min-h-[580px] max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150 text-zinc-900 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* SIDEBAR DE CONFIGURACIÓN ESTILO NOTION */}
        <aside className="w-full md:w-64 bg-zinc-50/80 border-b md:border-b-0 md:border-r border-zinc-200 p-4 flex flex-col justify-between shrink-0 select-none">
          <div className="space-y-4">
            
            {/* ENCABEZADO DE CUENTA */}
            <div className="flex items-center gap-2.5 px-2 pb-3 border-b border-zinc-200">
              <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">
                FY
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-zinc-950 truncate">
                  {tenant?.name || CLIENT_CONFIG?.branding?.logoText || 'FacturasYa'}
                </h3>
                <span className="text-[11px] text-zinc-500 truncate block">
                  {user?.email || tenant?.owner_email || 'Configuración'}
                </span>
              </div>
            </div>

            {/* LISTA DE PESTAÑAS */}
            <nav className="space-y-1 text-xs">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Ajustes del Negocio
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('fiscal')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-bold text-left transition-all ${
                  activeTab === 'fiscal'
                    ? 'bg-zinc-950 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                }`}
              >
                <Building2 size={15} />
                <span className="flex-1 truncate">Datos Fiscales SENIAT</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('hardware')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-bold text-left transition-all ${
                  activeTab === 'hardware'
                    ? 'bg-zinc-950 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                }`}
              >
                <Printer size={15} />
                <span className="flex-1 truncate">Impresora Fiscal & Puerto</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('subscription')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-bold text-left transition-all ${
                  activeTab === 'subscription'
                    ? 'bg-zinc-950 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                }`}
              >
                <CreditCard size={15} />
                <span className="flex-1 truncate">Plan & Suscripción</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold shrink-0">
                  {subStatus?.daysRemaining || 14}d
                </span>
              </button>

              <div className="pt-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Sistema & Seguridad
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('restaurant')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-bold text-left transition-all ${
                  activeTab === 'restaurant'
                    ? 'bg-zinc-950 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                }`}
              >
                <Utensils size={15} />
                <span className="flex-1 truncate">Modo Restaurante & Mesas</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('account')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-bold text-left transition-all ${
                  activeTab === 'account'
                    ? 'bg-zinc-950 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                }`}
              >
                <User size={15} />
                <span className="flex-1 truncate">Seguridad & Contraseña</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('backup')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-bold text-left transition-all ${
                  activeTab === 'backup'
                    ? 'bg-zinc-950 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                }`}
              >
                <Database size={15} />
                <span className="flex-1 truncate">Copia de Seguridad</span>
              </button>
            </nav>
          </div>

          <div className="pt-3 border-t border-zinc-200 text-[10px] text-zinc-400">
            FacturasYa Cloud v2.1
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL DEL MODAL */}
        <main className="flex-1 p-5 md:p-6 overflow-y-auto relative">
          
          {/* BOTÓN CERRAR SUPERIOR DERECHO */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>

          {/* 1. TAB: DATOS FISCALES SENIAT */}
          {activeTab === 'fiscal' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <h2 className="text-sm font-extrabold text-zinc-950">Datos Fiscales Oficiales (SENIAT)</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Esta información se refleja en los tickets fiscales, notas de entrega y libros de venta.
                </p>
              </div>

              <form onSubmit={handleSaveFiscal} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Nombre Comercial del Local</label>
                  <input
                    type="text"
                    required
                    value={fiscalForm.name}
                    onChange={(e) => setFiscalForm({ ...fiscalForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:border-zinc-950 font-bold bg-zinc-50/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">RIF SENIAT</label>
                    <input
                      type="text"
                      required
                      value={fiscalForm.rif}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, rif: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:border-zinc-950 font-bold bg-zinc-50/50"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Razón Social Jurídica</label>
                    <input
                      type="text"
                      required
                      value={fiscalForm.legalName}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, legalName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:border-zinc-950 bg-zinc-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Domicilio Fiscal Registrado</label>
                  <textarea
                    rows={2}
                    required
                    value={fiscalForm.address}
                    onChange={(e) => setFiscalForm({ ...fiscalForm, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:border-zinc-950 bg-zinc-50/50 leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={fiscalForm.phone}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:border-zinc-950 bg-zinc-50/50"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Instagram</label>
                    <input
                      type="text"
                      value={fiscalForm.instagram}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, instagram: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:border-zinc-950 bg-zinc-50/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingFiscal}
                  className="py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold shadow-xs transition-all flex items-center gap-2 active:scale-98"
                >
                  <CheckCircle2 size={15} />
                  <span>{savingFiscal ? 'Guardando...' : 'Guardar Datos Fiscales'}</span>
                </button>
              </form>
            </div>
          )}

          {/* 2. TAB: IMPRESORA FISCAL (CENTRALIZADA, SIN DUPLICADOS) */}
          {activeTab === 'hardware' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-extrabold text-zinc-950">Impresora Fiscal & Hardware</h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Único Panel Central
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Gestiona la conexión con la máquina fiscal SENIAT por cable USB o Serial (HKA80, Bixolon, Custom).
                </p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-900 block">Puerto Serial Asignado</span>
                    <span className="text-[11px] text-zinc-500">Velocidad estándar: 9600 bps</span>
                  </div>
                  <select
                    value={selectedPort}
                    onChange={(e) => {
                      setSelectedPort(e.target.value);
                      updateFiscalSettings?.({ port: e.target.value });
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-zinc-300 font-mono text-xs font-bold bg-white text-zinc-900"
                  >
                    {fiscalPorts.length > 0 ? (
                      fiscalPorts.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))
                    ) : (
                      <>
                        <option value="COM1">COM1</option>
                        <option value="COM2">COM2 (Recomendado)</option>
                        <option value="COM3">COM3</option>
                        <option value="COM4">COM4</option>
                      </>
                    )}
                  </select>
                </div>

                {connectionStatus && (
                  <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center gap-2 ${
                    connectionStatus.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {connectionStatus.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{connectionStatus.msg}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200">
                  <button
                    type="button"
                    onClick={handleDetectFiscal}
                    disabled={detectingPorts}
                    className="py-2 px-3 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Search size={14} />
                    <span>{detectingPorts ? 'Escaneando...' : 'Auto-Detectar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestFiscal}
                    disabled={testingConnection}
                    className="py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all"
                  >
                    <Sparkles size={14} className="text-emerald-400" />
                    <span>{testingConnection ? 'Probando...' : 'Test S1'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/70 text-blue-900 text-xs leading-relaxed">
                <strong>Organización Limpia:</strong> La pantalla de Cierre de Caja ahora queda 100% libre de configuraciones técnicas de puertos, enfocándose únicamente en el arqueo del dinero y la emisión del Reporte Z.
              </div>
            </div>
          )}

          {/* 3. TAB: PLAN & SUSCRIPCIÓN */}
          {activeTab === 'subscription' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <h2 className="text-sm font-extrabold text-zinc-950">Plan & Suscripción SaaS</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Renueva tu servicio mensual o anual y reporta tus pagos en bolívares.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Estatus de Cuenta</span>
                  <div className="text-base font-extrabold text-zinc-950">
                    {subStatus?.isExpired ? 'Suscripción Vencida' : 'Prueba Gratuita (14d)'}
                  </div>
                  <span className={`text-xs font-bold block ${subStatus?.isExpired ? 'text-red-600' : 'text-emerald-600'}`}>
                    {subStatus?.daysRemaining || 14} días restantes
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Costo Mensual</span>
                  <div className="text-base font-extrabold text-zinc-950">$30.00 / mes</div>
                  <span className="text-[11px] text-zinc-500 block">≈ Bs. 26,304.00 (Tasa BCV)</span>
                </div>
              </div>

              {/* FORMULARIO DE REPORTE DE PAGO MÓVIL */}
              <form onSubmit={handleReportPago} className="p-4 rounded-xl border border-zinc-200 space-y-3 text-xs">
                <div className="border-b border-zinc-100 pb-2">
                  <span className="font-bold text-zinc-900 block">Reportar Pago Móvil de Renovación</span>
                  <span className="text-[11px] text-zinc-500">Datos receptores: 0172 Bancamiga · V-00000000 · 0412-0000000</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Banco Origen</label>
                    <select
                      value={pagoBank}
                      onChange={(e) => setPagoBank(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs bg-white text-zinc-900"
                    >
                      {VENEZUELA_BANKS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Teléfono Pagador</label>
                    <input
                      type="text"
                      placeholder="0412-1234567"
                      value={pagoPhone}
                      onChange={(e) => setPagoPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs bg-white text-zinc-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Últimos 6 dígitos de Referencia</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Ej: 849201"
                    value={pagoRef}
                    onChange={(e) => setPagoRef(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold bg-white text-zinc-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingPago}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold shadow-xs transition-all active:scale-98"
                >
                  {submittingPago ? 'Enviando comprobante...' : 'Reportar Pago Móvil →'}
                </button>
              </form>
            </div>
          )}

          {/* 4. TAB: MODO RESTAURANTE & MESAS */}
          {activeTab === 'restaurant' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <h2 className="text-sm font-extrabold text-zinc-950">Modo Restaurante & Mesas</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Habilita las herramientas para atención en mesas, salón y reparto a domicilio.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-zinc-900 block">Salón, Mapa de Mesas & Cuentas Abiertas</span>
                    <span className="text-[11px] text-zinc-500">Muestra el mapa interactivo de mesas y cobro diferido</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={restaurantMode}
                    onChange={(e) => toggleRestaurantMode?.(e.target.checked)}
                    className="w-4 h-4 rounded text-zinc-950 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. TAB: SEGURIDAD Y CUENTA */}
          {activeTab === 'account' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <h2 className="text-sm font-extrabold text-zinc-950">Seguridad & Cuenta Personal</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Gestiona tus credenciales de acceso a la nube.
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Correo de la Cuenta</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || tenant?.owner_email || ''}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-500 font-bold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Nueva Contraseña</label>
                  <input
                    type="password"
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:border-zinc-950 bg-zinc-50/50"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Confirmar Nueva Contraseña</label>
                  <input
                    type="password"
                    minLength={6}
                    placeholder="Repite la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:border-zinc-950 bg-zinc-50/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold shadow-xs transition-all active:scale-98"
                >
                  {updatingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </form>
            </div>
          )}

          {/* 6. TAB: COPIA DE SEGURIDAD */}
          {activeTab === 'backup' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <h2 className="text-sm font-extrabold text-zinc-950">Copias de Seguridad (Backup)</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Descarga una copia completa de tus productos, facturas y clientes en formato JSON seguro.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-3 text-xs">
                <p className="leading-relaxed text-zinc-600">
                  Tus datos se sincronizan automáticamente con la nube de FacturasYa en Supabase.
                  Sin embargo, puedes descargar una copia local en cualquier momento para tu archivo contable o migración.
                </p>

                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold shadow-xs transition-all flex items-center gap-2 active:scale-98"
                >
                  <Database size={15} />
                  <span>Descargar Respaldo JSON Completo</span>
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
