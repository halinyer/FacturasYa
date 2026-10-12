import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('pos_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const users = {
    '1234': { role: 'admin', name: 'Administrador', pin: '1234' },
    '0000': { role: 'cajero', name: 'Cajera Principal', pin: '0000' }
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
