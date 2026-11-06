import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import LoginForm from '../auth/LoginForm';
import { supabase } from '../../lib/supabase';
import { listTenants, listPayments, listAudit, getConfig } from './api';
import TenantsPanel from './TenantsPanel';
import PaymentsPanel from './PaymentsPanel';
import ConfigPanel from './ConfigPanel';
import AuditPanel from './AuditPanel';
import RunbookPanel from './RunbookPanel';
import {
  Store,
  CreditCard,
  Settings,
  ShieldCheck,
  BookOpen,
  LogOut,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const TABS = [
  { id: 'tenants', label: 'Restaurantes', icon: Store },
  { id: 'payments', label: 'Pagos Móviles', icon: CreditCard },
  { id: 'config', label: 'Configuración SaaS', icon: Settings },
  { id: 'audit', label: 'Auditoría', icon: ShieldCheck },
  { id: 'runbook', label: 'Mapa & Runbook', icon: BookOpen }
];

function Dashboard() {
  const { signOut, session } = useAuth();
  const [tab, setTab] = useState('tenants');
  const [data, setData] = useState({ tenants: [], payments: [], audit: [], config: null });
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const [tenants, payments, audit, config] = await Promise.all([
        listTenants(),
        listPayments(),
        listAudit(),
        getConfig()
      ]);
      setData({ tenants, payments, audit, config });
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Suscripción Realtime en Supabase
    const channel = supabase
      .channel('super-admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_payments' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, refresh)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [refresh]);

  const pending = data.payments.filter((p) => p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased pb-16">
      
      {/* HEADER SUPER ADMIN */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
              FY
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-zinc-950">
                  FacturasYa · Super Admin
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-zinc-900 text-white text-[10px] font-mono font-bold">
                  PROD
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 block">
                {session?.user?.email} · Panel de Control Maestro
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 transition-colors"
              title="Refrescar datos"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>

            <button
              type="button"
              onClick={signOut}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <LogOut size={14} />
              <span>Cerrar sesión</span>
            </button>
          </div>

        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto border-t border-zinc-100 text-xs font-semibold py-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isSelected = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-zinc-950 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                }`}
              >
                <Icon size={14} />
                <span>{t.label}</span>
                {t.id === 'payments' && pending > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected ? 'bg-amber-400 text-zinc-950' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {pending}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {error && (
          <div
            onClick={() => setError('')}
            className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {tab === 'tenants' && (
          <TenantsPanel
            tenants={data.tenants}
            config={data.config}
            onChange={refresh}
            onError={setError}
          />
        )}
        {tab === 'payments' && (
          <PaymentsPanel
            payments={data.payments}
            tenants={data.tenants}
            onChange={refresh}
            onError={setError}
          />
        )}
        {tab === 'config' && (
          <ConfigPanel
            config={data.config}
            onChange={refresh}
            onError={setError}
          />
        )}
        {tab === 'audit' && (
          <AuditPanel
            audit={data.audit}
            tenants={data.tenants}
          />
        )}
        {tab === 'runbook' && <RunbookPanel />}
      </main>

    </div>
  );
}

export default function SuperAdminPage() {
  const { session, isAdmin, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-zinc-500 font-medium">Verificando credenciales Super Admin...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white font-bold flex items-center justify-center mx-auto shadow-sm">
              FY
            </div>
            <h1 className="text-lg font-bold text-zinc-950">FacturasYa · Super Admin</h1>
            <p className="text-xs text-zinc-500">
              Acceso restringido a operadores del sistema.
            </p>
          </div>
          <LoginForm title="Entrar a Super Admin" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-base font-bold text-zinc-950">Acceso denegado</h2>
          <p className="text-xs text-zinc-600 leading-relaxed">
            La cuenta <strong>{session.user.email}</strong> no está registrada en la tabla de Super Administradores.
          </p>
          <button
            type="button"
            onClick={signOut}
            className="px-4 py-2 rounded-xl bg-zinc-950 text-white font-semibold text-xs hover:bg-zinc-800 transition-all"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}
