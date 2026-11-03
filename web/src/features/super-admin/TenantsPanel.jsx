import React, { useMemo, useState } from 'react';
import { extendTenant, setTenantStatus, setTenantValidUntil } from './api';

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
          `${t.name} ${t.owner_email} ${t.phone}`.toLowerCase().includes(query.toLowerCase())
      ),
    [tenants, filter, query]
  );

  const stats = useMemo(() => {
    const paying = tenants.filter((t) => t.plan !== 'trial' && !t.is_expired);
    const monthly = Number(config?.monthly_price_usd || 0);
    const annual = Number(config?.annual_price_usd || 0);
    return {
      total: tenants.length,
      paying: paying.length,
      mrr: paying.reduce((sum, t) => sum + (t.plan === 'annual' ? annual / 12 : monthly), 0),
      soon: tenants.filter((t) => !t.is_expired && t.days_remaining <= 7).length
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
    if (window.confirm(`¿Suspender a ${t.name}? Su caja se bloqueará de inmediato.`)) {
      run(() => setTenantStatus(t.id, 'suspended'));
    }
  };

  return (
    <>
      <div className="stats">
        <div className="card stat"><span>Clientes</span><strong>{stats.total}</strong></div>
        <div className="card stat"><span>Pagando</span><strong>{stats.paying}</strong></div>
        <div className="card stat"><span>Ingreso mensual est.</span><strong>${stats.mrr.toFixed(0)}</strong></div>
        <div className="card stat"><span>Vencen en 7 días</span><strong>{stats.soon}</strong></div>
      </div>

      <div className="toolbar">
        {FILTERS.map(([key, label]) => (
          <button key={key} className={`chip ${filter === key ? 'on' : ''}`} onClick={() => setFilter(key)}>{label}</button>
        ))}
        <input placeholder="Buscar nombre, correo o teléfono" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Restaurante</th><th>Contacto</th><th>Plan</th><th>Estado</th><th>Vence</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td><strong>{t.name}</strong><br /><small>{t.rif}</small></td>
                <td>{t.owner_email}<br /><small>{t.phone}</small></td>
                <td>{t.plan}</td>
                <td><span className={`badge ${t.status === 'suspended' ? 'red' : t.is_expired ? 'amber' : 'green'}`}>
                  {t.status === 'suspended' ? 'Suspendido' : t.is_expired ? 'Vencido' : 'Activo'}
                </span></td>
                <td>{new Date(t.valid_until).toLocaleDateString('es-VE')}<br /><small>{t.days_remaining} días</small></td>
                <td className="actions">
                  <button className="btn" onClick={() => run(() => extendTenant(t.id, 30, 'monthly'))}>+30 días</button>
                  <button className="btn" onClick={() => run(() => extendTenant(t.id, 365, 'annual'))}>+1 año</button>
                  <button className="btn" onClick={() => manualDate(t)}>Fecha…</button>
                  {t.status === 'suspended'
                    ? <button className="btn primary" onClick={() => run(() => setTenantStatus(t.id, 'active'))}>Reactivar</button>
                    : <button className="btn danger" onClick={() => suspend(t)}>Suspender</button>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="6" className="empty">Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
