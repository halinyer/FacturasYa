import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthProvider';
import { isConfigured } from './lib/supabase';

// Code-Splitting estilo Notion: La landing carga ultra-ligera en <300ms,
// y la aplicación web se descarga solo cuando el usuario entra.
const LandingPage = lazy(() => import('./features/landing/LandingPage'));
const AppShell = lazy(() => import('./features/app-shell/AppShell'));
const SuperAdminPage = lazy(() => import('./features/super-admin/SuperAdminPage'));

const PageLoader = () => (
  <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
    <span className="text-xs text-zinc-400 font-bold mt-3 tracking-wide">Cargando FacturasYa...</span>
  </div>
);

const NeedsSupabase = ({ children }) => {
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center p-4">
        <div className="bg-zinc-800 p-6 rounded-2xl max-w-sm text-center space-y-3 border border-zinc-700">
          <h2 className="text-base font-bold text-red-400">Falta configurar Supabase</h2>
          <p className="text-xs text-zinc-300">
            Completa <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en tu panel de Vercel o archivo .env.
          </p>
        </div>
      </div>
    );
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Landing Comercial (Ultraligera) */}
            <Route path="/" element={<LandingPage />} />

            {/* FacturasYa Web App (Espacio de trabajo estilo Notion) */}
            <Route
              path="/app"
              element={
                <NeedsSupabase>
                  <AppShell />
                </NeedsSupabase>
              }
            />
            <Route
              path="/app/*"
              element={
                <NeedsSupabase>
                  <AppShell />
                </NeedsSupabase>
              }
            />

            {/* Redirecciones de conveniencia para enlaces antiguos */}
            <Route path="/pos" element={<Navigate to="/app?tab=pos" replace />} />
            <Route path="/monitor" element={<Navigate to="/app?tab=monitor" replace />} />

            {/* Panel Super Admin (Solo signalnotestudio@gmail.com) */}
            <Route
              path="/super-admin"
              element={
                <NeedsSupabase>
                  <SuperAdminPage />
                </NeedsSupabase>
              }
            />

            {/* 404 / Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
