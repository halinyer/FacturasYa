import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthProvider';
import LandingPage from './features/landing/LandingPage';
import OwnerMonitorPage from './features/monitor/OwnerMonitorPage';
import SuperAdminPage from './features/super-admin/SuperAdminPage';
import { isConfigured } from './lib/supabase';

// Rutas (una por pieza):
//   /             -> Pieza 4: Landing + simulador BCV + registro 14 días + descarga del instalador
//   /monitor      -> Pieza 3: Dashboard del dueño
//   /super-admin  -> Pieza 2: Panel del administrador
const Soon = ({ title }) => (
  <div className="center card">
    <h2>{title}</h2>
    <p>Próximamente (Pieza 3).</p>
  </div>
);

const NeedsSupabase = ({ children }) => {
  if (!isConfigured) {
    return (
      <div className="center card">
        <h2>Falta configurar Supabase</h2>
        <p>
          Copia <code>.env.example</code> a <code>.env</code> y completa{' '}
          <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.
        </p>
      </div>
    );
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/monitor" element={<NeedsSupabase><OwnerMonitorPage /></NeedsSupabase>} />
          <Route path="/super-admin" element={<NeedsSupabase><SuperAdminPage /></NeedsSupabase>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
