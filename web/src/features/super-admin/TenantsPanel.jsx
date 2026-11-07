import React, { useMemo, useState } from 'react';
import {
  extendTenant,
  setTenantStatus,
  setTenantValidUntil,
  toggleTenantFiscalVerification,
  updateTenantProfileByAdmin
} from './api';
import {
  Search,
  CheckCircle2,
  Clock,
  Printer,
  ExternalLink,
  Eye,
  X,
  Save,
  Package,
  Receipt,
  TrendingUp
} from 'lucide-react';

const FILTERS = [
  ['all', 'Todos'],
  ['trial', 'En prueba'],
  ['paid', 'Pagando'],
  ['expired', 'Vencidos'],
  ['suspended', 'Suspendidos']
];

const matches = (t, filter) => {
  if (filter === 'trial') return t.plan === 'trial' && !t.is_expired;
  if (filter === 'paid') return t.plan !== 'trial' && !t.is_expired;
  if (filter === 'expired') return t.is_expired && t.status !== 'suspended';
  if (filter === 'suspended') return t.status === 'suspended';
  return true;
};

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Sin conexión aún';
  const ms = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(ms)) return '—';
  const mins = Math.floor(ms / 60000);
  if (mins < 5) return '🟢 En línea ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

export default function TenantsPanel({ tenants = [], snapshots = [], payments = [], config, onChange, onError }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const snapshotMap = useMemo(() => {
    const map = {};
    (snapshots || []).forEach((s) => {
      if (!s?.tenant_id) return;
      const productsCount = Array.isArray(s.products) ? s.products.length : 0;
      const invoices = Array.isArray(s.invoices) ? s.invoices.filter((i) => i.status !== 'voided') : [];
      const totalSalesUsd = invoices.reduce((acc, inv) => acc + Number(inv.total || inv.totalAmount || 0), 0);
      const zCount = Array.isArray(s.z_reports) ? s.z_reports.length : 0;
      const openTabsCount = Array.isArray(s.open_tabs) ? s.open_tabs.length : 0;
      map[s.tenant_id] = {
        productsCount,
        invoicesCount: invoices.length,
        totalSalesUsd,
        zCount,
        openTabsCount,
        exchangeRate: s.exchange_rate,
        updatedAt: s.updated_at
      };
    });
    return map;
  }, [snapshots]);

  const rows = useMemo(
    () =>
      tenants.filter(
        (t) =>
          matches(t, filter) &&
          `${t.name || ''} ${t.legal_name || ''} ${t.owner_email || ''} ${t.rif || ''} ${t.fiscal_serial || ''} ${t.phone || ''}`
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [tenants, filter, query]
  );

  const stats = useMemo(() => {
    const clientTenants = tenants.filter((t) => t.owner_email !== 'signalnotestudio@gmail.com');
    const paying = clientTenants.filter((t) => t.plan !== 'trial' && !t.is_expired);
    const monthly = Number(config?.monthly_price_usd || 30);
    const annual = Number(config?.annual_price_usd || 300);
    return {
      total: clientTenants.length,
      paying: paying.length,
      mrr: paying.reduce((sum, t) => sum + (t.plan === 'annual' ? annual / 12 : monthly), 0),
      soon: clientTenants.filter((t) => !t.is_expired && t.days_remaining <= 7).length
    };
  }, [tenants, config]);

  const run = async (fn) => {
    try {
      await fn();
      await onChange();
    } catch (e) {
      onError(e.message);
    }
  };

  const manualDate = (t) => {
    const value = window.prompt(`Nueva fecha de corte para ${t.name} (AAAA-MM-DD):`, '');
    if (!value) return;
    const d = new Date(`${value}T23:59:59`);
    if (Number.isNaN(d.getTime())) return onError('Fecha inválida');
    run(() => setTenantValidUntil(t.id, d.toISOString()));
  };

  const suspend = (t) => {
    if (window.confirm(`¿Suspender a ${t.name}? Su sistema de caja se bloqueará de inmediato.`)) {
      run(() => setTenantStatus(t.id, 'suspended'));
    }
  };

  const handleToggleVerification = (t) => {
    const nextState = !t.is_fiscal_verified;
    const msg = nextState
      ? `¿Aprobar manualmente la Verificación Fiscal SENIAT de "${t.name}"?`
      : `¿Marcar a "${t.name}" como Pendiente de Verificación Fiscal?`;
    if (window.confirm(msg)) {
      run(() => toggleTenantFiscalVerification(t, nextState));
    }
  };

  const openInspector = (t) => {
    setSelectedTenant(t);
    setEditForm({
      name: t.name || '',
      legal_name: t.legal_name || '',
      rif: t.rif || '',
      fiscal_address: t.fiscal_address || '',
      fiscal_serial: t.fiscal_serial || '',
      phone: t.phone || '',
      instagram: t.instagram || ''
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!selectedTenant || !editForm) return;
    setSavingEdit(true);
    try {
      await updateTenantProfileByAdmin(selectedTenant.id, editForm);
      await onChange();
      setSelectedTenant(null);
    } catch (err) {
      onError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const buildWhatsAppLink = (t) => {
    const cleanPhone = String(t.phone || '').replace(/\D/g, '');
    if (cleanPhone.length < 10) return null;
    const intl = cleanPhone.startsWith('58') ? cleanPhone : `58${cleanPhone.replace(/^0/, '')}`;
    const validDate = t.valid_until ? new Date(t.valid_until).toLocaleDateString('es-VE') : '';
    const msg = t.is_expired
      ? `Hola ${t.name}, te escribimos del soporte de FacturasYa. Tu suscripción venció el ${validDate}. Puedes reportar tu Pago Móvil desde la caja o tu teléfono para reactivar el servicio al instante.`
      : `Hola ${t.name}, te escribimos de FacturasYa. ¿Cómo va todo con la facturación? Tu plan actual tiene ${t.days_remaining} días vigentes (corte: ${validDate}).`;
    return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-5">
      {/* TARJETAS DE MÉTRICAS GLOBALES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Restaurantes Clientes
          </span>
          <div className="text-2xl font-extrabold text-zinc-950 mono-num">{stats.total}</div>
          <span className="text-[11px] text-zinc-400">Cuentas creadas</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Suscripciones Activas
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 mono-num">{stats.paying}</div>
          <span className="text-[11px] text-zinc-400">Planes de pago vigentes</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Ingreso Mensual (MRR)
          </span>
          <div className="text-2xl font-extrabold text-zinc-950 mono-num">
            ${stats.mrr.toFixed(0)} <span className="text-xs text-zinc-400 font-normal">/mes</span>
          </div>
          <span className="text-[11px] text-zinc-400">Facturación recurrente</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Vencen en 7 Días
          </span>
          <div className="text-2xl font-extrabold text-amber-600 mono-num">{stats.soon}</div>
          <span className="text-[11px] text-zinc-400">Para seguimiento de cobro</span>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS Y BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto text-xs">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                filter === key
                  ? 'bg-zinc-950 text-white shadow-2xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, RIF, serial, correo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-72 pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 shadow-2xs"
          />
        </div>
      </div>

      {/* TABLA DE RESTAURANTES */}
      <div className="border border-zinc-200/90 rounded-2xl bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-500 uppercase text-[10px] font-bold tracking-wider">
                <th className="py-3 px-4">Restaurante / Razón Social</th>
                <th className="py-3 px-4">Contacto & Uso</th>
                <th className="py-3 px-4">Verificación SENIAT</th>
                <th className="py-3 px-4">Plan & Estatus</th>
                <th className="py-3 px-4">Vence</th>
                <th className="py-3 px-4 text-right">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {rows.map((t) => {
                const isSuperAdminAccount = t.owner_email === 'signalnotestudio@gmail.com';
                const usage = snapshotMap[t.id];
                const lastSeen = usage?.updatedAt || t.last_online_at;
                const waLink = buildWhatsAppLink(t);
                const pendingPay = payments.find((p) => p.tenant_id === t.id && p.status === 'pending');

                return (
                  <tr key={t.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <strong className="text-zinc-950 font-bold">{t.name}</strong>
                        {isSuperAdminAccount && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-900 text-white text-[9px] font-bold">
                            Tú (Super Admin)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {t.legal_name || 'Sin razón social registrada'}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px] text-zinc-500">
                        <span>RIF: <strong className="text-zinc-700">{t.rif || 'No ingresado'}</strong></span>
                        {t.fiscal_serial && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-100 border border-zinc-200 text-zinc-700 inline-flex items-center gap-1">
                            <Printer size={10} />
                            {t.fiscal_serial}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-zinc-900 font-medium">{t.owner_email}</div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        <span>{t.phone || 'Sin teléfono'}</span>
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                            title="Escribir recordatorio o soporte por WhatsApp"
                          >
                            <span>WhatsApp</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-2">
                        <span>{formatTimeAgo(lastSeen)}</span>
                        {usage && (
                          <span className="font-mono text-zinc-600">
                            · {usage.invoicesCount} fact · {usage.productsCount} prod
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col items-start gap-1">
                        {t.is_fiscal_verified ? (
                          <button
                            type="button"
                            onClick={() => handleToggleVerification(t)}
                            title="Haz clic para cambiar estado de verificación fiscal"
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 cursor-pointer transition-colors"
                          >
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            <span>Verificado SENIAT</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                              <Clock size={11} className="text-amber-600" />
                              <span>Pendiente</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleVerification(t)}
                              className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-[10px] font-semibold cursor-pointer transition-colors"
                              title="Aprobar verificación fiscal manualmente"
                            >
                              ✓ Aprobar
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="capitalize font-semibold text-zinc-900">{t.plan}</div>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            t.status === 'suspended'
                              ? 'bg-red-100 text-red-800'
                              : t.is_expired
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {t.status === 'suspended'
                            ? 'Suspendido'
                            : t.is_expired
                            ? 'Vencido'
                            : 'Activo'}
                        </span>
                        {pendingPay && (
                          <span className="inline-block px-1.5 py-0.2 rounded bg-sky-100 text-sky-900 text-[9px] font-bold">
                            Pago #{pendingPay.reference_last6}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-950">
                        {new Date(t.valid_until).toLocaleDateString('es-VE')}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        {t.days_remaining} {t.days_remaining === 1 ? 'día' : 'días'}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openInspector(t)}
                          className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
                          title="Ver Ficha 360° y editar datos fiscales/contacto"
                        >
                          <Eye size={11} />
                          <span>Ficha</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => run(() => extendTenant(t.id, 7, t.plan))}
                          className="px-2 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-[11px] transition-all cursor-pointer"
                          title="Dar 7 días de cortesía"
                        >
                          +7d
                        </button>
                        <button
                          type="button"
                          onClick={() => run(() => extendTenant(t.id, 30, 'monthly'))}
                          className="px-2 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-[11px] transition-all cursor-pointer"
                          title="Extender 30 días adicionales"
                        >
                          +30d
                        </button>
                        <button
                          type="button"
                          onClick={() => run(() => extendTenant(t.id, 365, 'annual'))}
                          className="px-2 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-[11px] transition-all cursor-pointer"
                          title="Extender 1 año"
                        >
                          +1a
                        </button>
                        <button
                          type="button"
                          onClick={() => manualDate(t)}
                          className="px-2 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-[11px] transition-all cursor-pointer"
                        >
                          Fecha…
                        </button>

                        {t.status === 'suspended' ? (
                          <button
                            type="button"
                            onClick={() => run(() => setTenantStatus(t.id, 'active'))}
                            className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition-all cursor-pointer"
                          >
                            Reactivar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => suspend(t)}
                            className="px-2 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-[11px] border border-red-200 transition-all cursor-pointer"
                          >
                            Suspender
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-zinc-400 text-xs">
                    No hay restaurantes que coincidan con el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INSPECTOR 360° & EDICIÓN DE DATOS DEL CLIENTE */}
      {selectedTenant && editForm && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedTenant(null)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Ficha 360° de Cliente & Soporte Remoto
                </span>
                <h3 className="text-base font-extrabold text-zinc-950">
                  {selectedTenant.name} ({selectedTenant.owner_email})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTenant(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Métricas de uso sincronizadas desde su Caja */}
            {(() => {
              const u = snapshotMap[selectedTenant.id];
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Receipt size={11} /> Facturas Emitidas
                    </span>
                    <div className="text-base font-extrabold text-zinc-950 font-mono mt-0.5">
                      {u ? u.invoicesCount : 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <TrendingUp size={11} /> Ventas Sincronizadas
                    </span>
                    <div className="text-base font-extrabold text-emerald-700 font-mono mt-0.5">
                      ${u ? u.totalSalesUsd.toFixed(2) : '0.00'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Package size={11} /> Productos en Menú
                    </span>
                    <div className="text-base font-extrabold text-zinc-950 font-mono mt-0.5">
                      {u ? u.productsCount : 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Printer size={11} /> Cierres Z / Mesas
                    </span>
                    <div className="text-base font-extrabold text-zinc-950 font-mono mt-0.5">
                      {u ? `${u.zCount} Z · ${u.openTabsCount} mesas` : '0 Z'}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Formulario para editar los datos fiscales o de contacto del restaurante */}
            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs border border-zinc-200 rounded-xl p-4">
              <div className="font-bold text-zinc-950 text-xs">
                Editar Datos Fiscales SENIAT y Contacto del Restaurante
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Razón Social SENIAT</label>
                  <input
                    type="text"
                    value={editForm.legal_name}
                    onChange={(e) => setEditForm({ ...editForm, legal_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 mb-1">RIF Fiscal</label>
                  <input
                    type="text"
                    value={editForm.rif}
                    onChange={(e) => setEditForm({ ...editForm, rif: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Serial Máquina HKA80</label>
                  <input
                    type="text"
                    value={editForm.fiscal_serial}
                    onChange={(e) => setEditForm({ ...editForm, fiscal_serial: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Domicilio Fiscal</label>
                <input
                  type="text"
                  value={editForm.fiscal_address}
                  onChange={(e) => setEditForm({ ...editForm, fiscal_address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTenant(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={13} />
                  <span>{savingEdit ? 'Guardando...' : 'Guardar Cambios en Cliente'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
