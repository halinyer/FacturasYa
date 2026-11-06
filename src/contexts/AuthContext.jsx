import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  getCurrentTenant,
  setCurrentTenant,
  getLocalTenantsList,
  evaluateSubscriptionStatus,
  verifyLicenseWithBackend,
  loginTenantAccount,
  registerTenantAccount,
  subscribeToSaasRealtime
} from '../lib/syncEngine';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // 1. Inquilino SaaS (Cuenta del Restaurante / Dueño en Supabase)
  const [tenant, setTenantState] = useState(() => {
    const existing = getCurrentTenant();
    if (existing) return existing;
    const list = getLocalTenantsList();
    if (list && list.length > 0) {
      setCurrentTenant(list[0]);
      return list[0];
    }
    return null;
  });

  // 2. Usuario autenticado (Derivado directamente de la cuenta del restaurante, sin PIN local)
  const [user, setUser] = useState(() => {
    const active = getCurrentTenant();
    if (active) {
      return {
        name: active.name || active.owner_email || 'Administrador',
        email: active.owner_email || '',
        role: 'admin',
        v: 2
      };
    }
    return null;
  });

  // Sincronizar usuario automáticamente cuando cambie el tenant
  useEffect(() => {
    if (tenant) {
      const u = {
        name: tenant.name || tenant.owner_email || 'Administrador',
        email: tenant.owner_email || '',
        role: 'admin',
        v: 2
      };
      setUser(u);
      localStorage.setItem('pos_user', JSON.stringify(u));
    } else {
      setUser(null);
      localStorage.removeItem('pos_user');
    }
  }, [tenant]);

  // Escuchar cambios en tiempo real de la suscripción (Supabase Realtime)
  useEffect(() => {
    const unsubscribe = subscribeToSaasRealtime(tenant?.id, () => {
      const fresh = getCurrentTenant();
      setTenantState(fresh ? { ...fresh } : null);
    });

    if (tenant?.id) {
      verifyLicenseWithBackend(tenant.id).catch(() => {});
      const interval = setInterval(() => {
        verifyLicenseWithBackend(tenant.id).catch(() => {});
      }, 5 * 60 * 1000);
      return () => {
        clearInterval(interval);
        unsubscribe();
      };
    }

    return () => unsubscribe();
  }, [tenant?.id]);

  // Login unificado con Correo y Contraseña
  const loginTenant = async (email, password) => {
    const loggedTenant = await loginTenantAccount(email, password);
    setTenantState({ ...loggedTenant });
    return loggedTenant;
  };

  const registerTenant = async (data) => {
    const newTenant = await registerTenantAccount(data);
    setTenantState({ ...newTenant });
    return newTenant;
  };

  const logout = () => {
    setCurrentTenant(null);
    setTenantState(null);
    setUser(null);
    localStorage.removeItem('saas_active_tenant');
    localStorage.removeItem('pos_user');
  };

  const unlinkTenant = logout;

  // Acceso administrativo unificado para el dueño autenticado (sin distinción admin/cajero)
  const isAdmin = () => Boolean(tenant || user);

  const subStatus = evaluateSubscriptionStatus(tenant);

  return (
    <AuthContext.Provider value={{
      user,
      login: loginTenant,
      logout,
      isAdmin,
      tenant,
      subStatus,
      loginTenant,
      registerTenant,
      unlinkTenant
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
