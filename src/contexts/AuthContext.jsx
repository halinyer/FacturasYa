import React, { createContext, useState, useContext, useEffect } from 'react';
import { ACCESS_PINS } from '../config/accessConfig';
import {
  getCurrentTenant,
  setCurrentTenant,
  getLocalTenantsList,
  evaluateSubscriptionStatus,
  loginTenantAccount,
  registerTenantAccount,
  subscribeToSaasRealtime
} from '../lib/syncEngine';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // 1. Inquilino SaaS (Cuenta del Restaurante en Supabase / Local)
  const [tenant, setTenantState] = useState(() => {
    const existing = getCurrentTenant();
    if (existing) return existing;
    // Por defecto para desarrollo rápido vinculamos el primer tenant de la lista si existe
    const list = getLocalTenantsList();
    if (list && list.length > 0) {
      setCurrentTenant(list[0]);
      return list[0];
    }
    return null;
  });

  // 2. Usuario de turno en la caja (PIN de Administrador o Cajero)
  const [user, setUser] = useState(() => {
    try {
      const savedUser = JSON.parse(localStorage.getItem('pos_user') || 'null');
      if (savedUser && savedUser.v === 2) return savedUser;
    } catch (e) {}
    localStorage.removeItem('pos_user');
    return null;
  });

  // Escuchar cambios en tiempo real de la suscripción (Supabase Realtime + Broadcast local)
  useEffect(() => {
    const unsubscribe = subscribeToSaasRealtime(tenant?.id, () => {
      const fresh = getCurrentTenant();
      setTenantState(fresh ? { ...fresh } : null);
    });
    return () => unsubscribe();
  }, [tenant?.id]);

  const users = {
    [ACCESS_PINS.admin]: { role: 'admin', name: 'Administrador', v: 2 },
    [ACCESS_PINS.cajero]: { role: 'cajero', name: 'Cajera Principal', v: 2 }
  };

  const login = (role, pin) => {
    if (users[pin] && users[pin].role === role) {
      setUser(users[pin]);
      localStorage.setItem('pos_user', JSON.stringify(users[pin]));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pos_user');
  };

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

  const unlinkTenant = () => {
    setCurrentTenant(null);
    setTenantState(null);
    logout();
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const subStatus = evaluateSubscriptionStatus(tenant);

  return (
    <AuthContext.Provider value={{
      user,
      login,
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
