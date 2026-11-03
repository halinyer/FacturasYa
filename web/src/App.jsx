import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthProvider';
import SuperAdminPage from './features/super-admin/SuperAdminPage';
import { isConfigured } from './lib/supabase';

// Rutas (una por pieza):
//   /             -> Pieza 4: Landing + registro + descarga del instalador
//   /monitor      -> Pieza 3: Dashboard del dueño
//   /super-admin  -> Pieza 2: Panel del administrador
const Soon = ({ title }) => (
  <div className="center card"><h2>{title}</h2><p>Próximamente.</p></div>
);

export default function App() {
  if (!isConfigured) {
    return (
      <div className="center card">
        <h2>Falta configurar Supabase</h2>
        <p>Copia <code>.env.example</code> a <code>.env</code> y completa <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.</p>
      </div>
    );
  }
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Soon title="FacturasYa" />} />
          <Route path="/monitor" element={<Soon title="Monitor del dueño" />} />
          <Route path="/super-admin" element={<SuperAdminPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
