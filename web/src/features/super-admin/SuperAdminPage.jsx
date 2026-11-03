import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import LoginForm from '../auth/LoginForm';
import { supabase } from '../../lib/supabase';
import { listTenants, listPayments, listAudit, getConfig } from './api';
import TenantsPanel from './TenantsPanel';
import PaymentsPanel from './PaymentsPanel';
import ConfigPanel from './ConfigPanel';
import AuditPanel from './AuditPanel';

const TABS = [
  ['tenants', 'Restaurantes'],
  ['payments', 'Pagos'],
  ['config', 'Configuración'],
  ['audit', 'Auditoría']
];

function Dashboard() {
  const { signOut, session } = useAuth();
  const [tab, setTab] = useState('tenants');
  const [data, setData] = useState({ tenants: [], payments: [], audit: [], config: null });
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [tenants, payments, audit, config] = await Promise.all([listTenants(), listPayments(), listAudit(), getConfig()]);
      setData({ tenants, payments, audit, config });
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Tiempo real: un pago reportado o un cambio de restaurante refresca el panel
    const channel = supabase
      .channel('super-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_payments' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, refresh)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [refresh]);

  const pending = data.payments.filter((p) => p.status === 'pending').length;

  return (
    <div className="shell">
      <header>
        <h1>FacturasYa · Super Admin</h1>
        <span>{session.user.email} <button className="btn" onClick={signOut}>Salir</button></span>
      </header>
      <nav>
        {TABS.map(([key, label]) => (
          <button key={key} className={`tab ${tab === key ? 'on' : ''}`} onClick={() => setTab(key)}>
            {label}{key === 'payments' && pending > 0 && <span className="badge amber">{pending}</span>}
          </button>
        ))}
      </nav>
      {error && <p className="error banner" onClick={() => setError('')}>{error}</p>}
      {tab === 'tenants' && <TenantsPanel tenants={data.tenants} config={data.config} onChange={refresh} onError={setError} />}
      {tab === 'payments' && <PaymentsPanel payments={data.payments} tenants={data.tenants} onChange={refresh} onError={setError} />}
      {tab === 'config' && <ConfigPanel config={data.config} onChange={refresh} onError={setError} />}
      {tab === 'audit' && <AuditPanel audit={data.audit} tenants={data.tenants} />}
    </div>
  );
}

export default function SuperAdminPage() {
  const { session, isAdmin, loading, signOut } = useAuth();

  if (loading) return <p className="center">Cargando…</p>;
  if (!session) return <div className="center"><LoginForm title="Acceso Super Admin" /></div>;
  if (!isAdmin) {
    return (
      <div className="center card">
        <h2>Acceso denegado</h2>
        <p>Esta cuenta no tiene permisos de administrador.</p>
        <button className="btn" onClick={signOut}>Salir</button>
      </div>
    );
  }
  return <Dashboard />;
}
