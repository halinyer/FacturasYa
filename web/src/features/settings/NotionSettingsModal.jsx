import React, { useState } from 'react';
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
  ToggleRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

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

export default function NotionSettingsModal({
  isOpen,
  onClose,
  tenant,
  subStatus,
  session,
  onUpdateTenant
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('fiscal'); // 'fiscal' | 'hardware' | 'subscription' | 'restaurant' | 'account' | 'backup'
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
    instagram: tenant?.instagram || ''
  });
  const [savingFiscal, setSavingFiscal] = useState(false);

  // 2. Estado Modo Restaurante
  const [restaurantMode, setRestaurantMode] = useState(() => {
    try {
      const saved = localStorage.getItem('saas_restaurant_mode');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  // 3. Estado Reporte de Pago Móvil
  const [pagoPlan, setPagoPlan] = useState('monthly');
  const [pagoBank, setPagoBank] = useState(VENEZUELA_BANKS[0]);
  const [pagoPhone, setPagoPhone] = useState('');
  const [pagoRef, setPagoRef] = useState('');
  const [submittingPago, setSubmittingPago] = useState(false);

  // 4. Estado Contraseña
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Guardar Datos Fiscales
  const handleSaveFiscal = async (e) => {
    e.preventDefault();
    setSavingFiscal(true);
    try {
      if (tenant?.id && supabase) {
        const { error } = await supabase
          .from('tenants')
          .update({
            name: fiscalForm.name,
            legal_name: fiscalForm.legalName,
            rif: fiscalForm.rif,
            fiscal_address: fiscalForm.address,
            phone: fiscalForm.phone,
            instagram: fiscalForm.instagram,
            updated_at: new Date().toISOString()
          })
          .eq('id', tenant.id);

        if (error) throw error;
      }

      if (onUpdateTenant) {
        onUpdateTenant({
          ...tenant,
          ...fiscalForm
        });
      }

      showToast('Datos fiscales actualizados con éxito');
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

  // Reportar Pago Móvil
  const handleReportPago = async (e) => {
    e.preventDefault();
    if (!pagoRef.trim() || pagoRef.trim().length < 4) {
      showToast('Ingresa los últimos dígitos válidos de la referencia', 'error');
      return;
    }

    setSubmittingPago(true);
    try {
      if (supabase && tenant?.id) {
        const amountUsd = pagoPlan === 'monthly' ? 20 : 190;
        const { error } = await supabase.from('subscription_payments').insert({
          tenant_id: tenant.id,
          plan: pagoPlan,
          amount_usd: amountUsd,
          payment_method: 'pago_movil',
          bank: pagoBank,
          phone: pagoPhone,
          reference: pagoRef.trim(),
          status: 'pending',
          created_at: new Date().toISOString()
        });

        if (error) throw error;
      }

      showToast('Pago reportado. Tu activación se confirmará en breve.');
      setPagoRef('');
    } catch (err) {
      showToast(err.message || 'Error al reportar pago', 'error');
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
                onClick={() => setActiveTab('restaurant')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                  activeTab === 'restaurant'
                    ? 'bg-zinc-900 text-white shadow-xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <Utensils size={15} />
                <span className="flex-1">Modo Restaurante</span>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Nombre Comercial</label>
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
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Razón Social Legal</label>
                    <input
                      type="text"
                      value={fiscalForm.legalName}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, legalName: e.target.value })}
                      placeholder="Ej. Inversiones Happy Days C.A."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">RIF Fiscal SENIAT</label>
                    <input
                      type="text"
                      value={fiscalForm.rif}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, rif: e.target.value.toUpperCase() })}
                      placeholder="J-50123456-0"
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                      required
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
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Dirección Fiscal Completa</label>
                  <textarea
                    rows={2}
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
                    className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-xs transition-all active:scale-98 disabled:opacity-50"
                  >
                    {savingFiscal ? 'Guardando...' : 'Guardar Datos Fiscales'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: HARDWARE FISCAL Y COMANDERA DE COCINA */}
            {activeTab === 'hardware' && (
              <div className="space-y-5">
                {/* 1. SECCIÓN COMANDERA DE COCINA (58mm vs 80mm) */}
                <div className="border border-zinc-200 rounded-2xl p-4 space-y-4 bg-white shadow-2xs">
                  <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                      <ChefHat size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950">Impresora Térmica de Comandas (Cocina / Barra)</h4>
                      <p className="text-[11px] text-zinc-500">Configura el ancho de papel y la impresora de tickets de comandas</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                        Ancho del Rollo Térmico
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem('pos_comanda_paper_size', '58mm');
                            showToast('Rollo de comanda configurado en 58mm (Estándar)');
                          }}
                          className="flex-1 py-2 px-3 rounded-xl border border-zinc-300 text-xs font-bold hover:bg-zinc-100 text-zinc-800 text-center transition-all cursor-pointer"
                        >
                          📄 58 mm (Estrecho)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem('pos_comanda_paper_size', '80mm');
                            showToast('Rollo de comanda configurado en 80mm (Ancho)');
                          }}
                          className="flex-1 py-2 px-3 rounded-xl border border-zinc-300 text-xs font-bold hover:bg-zinc-100 text-zinc-800 text-center transition-all cursor-pointer"
                        >
                          📜 80 mm (Ancho cocina)
                        </button>
                      </div>
                      <span className="text-[10px] text-zinc-400 mt-1 block">
                        58mm para comanderas estándar pequeñas; 80mm para comanderas industriales de cocina.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                        Comportamiento de Impresión
                      </label>
                      <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600 space-y-1">
                        <p className="font-semibold text-zinc-900">⚡ Impresión Térmica Aislada 1:1</p>
                        <p className="text-[11px] text-zinc-500">
                          Las comandas no se reducen ni se escalan; imprimen en el tamaño exacto del rollo sin diálogo del navegador en Desktop.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. SECCIÓN MÁQUINA FISCAL SENIAT */}
                <div className="border border-zinc-200 rounded-2xl p-4 space-y-4 bg-white shadow-2xs">
                  <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Printer size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950">Máquina Fiscal SENIAT (The Factory HKA80 / Serial)</h4>
                      <p className="text-[11px] text-zinc-500">Conexión física por cable RS232 COM2 a 9600 baudios</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-900 space-y-2">
                    <p className="leading-relaxed">
                      <strong>Diferencia Nube vs Mostrador:</strong> La versión Web en la nube permite registrar ventas, monitorear mesas y ver reportes desde cualquier lugar. La <strong>emisión de facturas fiscales legales por cable serial, cierres Z oficiales y la consulta física de la memoria del chip</strong> se realizan a través de la aplicación nativa para Windows instalada en la computadora de tu caja.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <div className="space-y-0.5">
                      <span className="font-bold text-xs text-zinc-900 block">FacturasYa para Windows (.exe)</span>
                      <span className="text-[11px] text-zinc-500 block">Incluye drivers HKA80, lector de memoria fiscal Z para contador y soporte gaveta</span>
                    </div>
                    <a
                      href="https://github.com/halinyer/FacturasYa/releases/latest/download/FacturaPOS-1.0.0.exe" download="FacturaPOS-1.0.0.exe"
                      className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Descargar Windows (.exe)</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MODO RESTAURANTE */}
            {activeTab === 'restaurant' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 bg-zinc-50">
                  <div className="space-y-0.5">
                    <span className="block text-xs font-bold text-zinc-950">
                      Mapa de Mesas, Cuentas Abiertas y Salón
                    </span>
                    <span className="block text-xs text-zinc-500">
                      Habilita la asignación de pedidos a mesas físicas, comandas a cocina y cuentas pendientes.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleRestaurant}
                    className="p-1 text-zinc-900 transition-transform active:scale-95"
                    title={restaurantMode ? 'Desactivar Modo Restaurante' : 'Activar Modo Restaurante'}
                  >
                    {restaurantMode ? (
                      <ToggleRight size={36} className="text-emerald-600" />
                    ) : (
                      <ToggleLeft size={36} className="text-zinc-400" />
                    )}
                  </button>
                </div>

                <div className="p-3.5 bg-zinc-100 rounded-xl text-xs text-zinc-600 space-y-1">
                  <p>
                    <strong>Estado actual:</strong> {restaurantMode ? '🟢 Mesas y Salón Habilitados' : '⚪ Modo Caja Rápida (Mostrador)'}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Al activar el modo restaurante, el sidebar mostrará la pestaña "Mesas & Salón" y podrás crear comandas para cocina o barra.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: SUSCRIPCIÓN & PAGO MÓVIL */}
            {activeTab === 'subscription' && (
              <div className="space-y-5">
                {/* Banner de días restantes */}
                <div className="p-4 rounded-xl bg-zinc-900 text-white flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      Plan Actual: {tenant?.plan === 'monthly' ? 'Mensual Activo' : 'Prueba Gratuita'}
                    </span>
                    <h3 className="text-sm font-extrabold mt-0.5">
                      {subStatus?.daysRemaining || 14} Días de Acceso Restantes
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-zinc-300">
                      Tasa BCV: Bs. 876,80
                    </span>
                  </div>
                </div>

                {/* Formulario de Reporte de Pago Móvil */}
                <form onSubmit={handleReportPago} className="space-y-3.5 border border-zinc-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
                    <Smartphone size={15} className="text-emerald-600" />
                    <span>Reportar Pago Móvil / Transferencia Bancaria</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">Selecciona el Plan</label>
                      <select
                        value={pagoPlan}
                        onChange={(e) => setPagoPlan(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 bg-white"
                      >
                        <option value="monthly">Plan Mensual — $20 / mes</option>
                        <option value="annual">Plan Anual — $190 / año (Ahorras 20%)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">Banco Emisor</label>
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
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">Teléfono Pagador</label>
                      <input
                        type="text"
                        value={pagoPhone}
                        onChange={(e) => setPagoPhone(e.target.value)}
                        placeholder="0414-1234567"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">Número de Referencia (Últimos dígitos)</label>
                      <input
                        type="text"
                        value={pagoRef}
                        onChange={(e) => setPagoRef(e.target.value)}
                        placeholder="Ej. 849201"
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-zinc-200"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingPago}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                  >
                    {submittingPago ? 'Registrando Pago...' : 'Confirmar y Notificar Pago Móvil'}
                  </button>
                </form>
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
    </div>
  );
}
