import React, { useMemo, useState } from 'react';
import { extendTenant, setTenantStatus, setTenantValidUntil } from './api';
import { Search, ShieldCheck, CheckCircle2, Clock, AlertTriangle, XCircle, Sparkles } from 'lucide-react';

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

export default function TenantsPanel({ tenants, config, onChange, onError }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const rows = useMemo(
    () =>
      tenants.filter(
        (t) =>
          matches(t, filter) &&
          `${t.name || ''} ${t.legal_name || ''} ${t.owner_email || ''} ${t.rif || ''} ${t.phone || ''}`
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [tenants, filter, query]
  );

  const stats = useMemo(() => {
    // Excluir la cuenta propia de super admin en las métricas de clientes
    const clientTenants = tenants.filter(t => t.owner_email !== 'signalnotestudio@gmail.com');
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
              className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
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
            placeholder="Buscar por nombre, RIF, correo..."
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
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4">Verificación SENIAT</th>
                <th className="py-3 px-4">Plan & Estatus</th>
                <th className="py-3 px-4">Vence</th>
                <th className="py-3 px-4 text-right">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {rows.map((t) => {
                const isSuperAdminAccount = t.owner_email === 'signalnotestudio@gmail.com';
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
                      <div className="font-mono text-[10px] text-zinc-400">
                        RIF: {t.rif || 'No ingresado'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-zinc-900 font-medium">{t.owner_email}</div>
                      <div className="text-[11px] text-zinc-500">{t.phone || 'Sin teléfono'}</div>
                    </td>

                    <td className="py-3 px-4">
                      {t.is_fiscal_verified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          <span>Verificado</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                          <Clock size={11} className="text-amber-600" />
                          <span>Pendiente RIF</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="capitalize font-semibold text-zinc-900">{t.plan}</div>
                      <div>
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => run(() => extendTenant(t.id, 30, 'monthly'))}
                          className="px-2 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-[11px] transition-all"
                          title="Extender 30 días adicionales"
                        >
                          +30d
                        </button>
                        <button
                          type="button"
                          onClick={() => run(() => extendTenant(t.id, 365, 'annual'))}
                          className="px-2 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-[11px] transition-all"
                          title="Extender 1 año"
                        >
                          +1a
                        </button>
                        <button
                          type="button"
                          onClick={() => manualDate(t)}
                          className="px-2 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-[11px] transition-all"
                        >
                          Fecha…
                        </button>

                        {t.status === 'suspended' ? (
                          <button
                            type="button"
                            onClick={() => run(() => setTenantStatus(t.id, 'active'))}
                            className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition-all"
                          >
                            Reactivar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => suspend(t)}
                            className="px-2 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-[11px] border border-red-200 transition-all"
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
    </div>
  );
}
