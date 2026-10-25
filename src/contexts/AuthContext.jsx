import React, { createContext, useState, useContext, useEffect } from 'react';
import { ACCESS_PINS } from '../config/accessConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = JSON.parse(localStorage.getItem('pos_user') || 'null');
      // Sesiones guardadas con el esquema de PIN anterior se descartan (obliga a iniciar sesión de nuevo)
      if (savedUser && savedUser.v === 2) return savedUser;
    } catch (e) {}
    localStorage.removeItem('pos_user');
    return null;
  });

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

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
