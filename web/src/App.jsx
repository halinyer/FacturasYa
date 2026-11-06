import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthProvider';
import { isConfigured } from './lib/supabase';

// Code-Splitting estilo Notion: La landing carga ultra-ligera en <300ms,
// y la aplicación POS compartida se descarga solo cuando el usuario entra.
const LandingPage = lazy(() => import('./features/landing/LandingPage'));
const PosAppWrapper = lazy(() => import('./features/pos/PosAppWrapper'));
const SuperAdminPage = lazy(() => import('./features/super-admin/SuperAdminPage'));
const OwnerMonitorPage = lazy(() => import('./features/monitor/OwnerMonitorPage'));

const PageLoader = () => (
  <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
    <div className="w-9 h-9 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
            {/* Landing Comercial (Ultraligera <300ms) */}
            <Route path="/" element={<LandingPage />} />

            {/* Monitor Cloud del Dueño */}
            <Route
              path="/monitor"
              element={
                <NeedsSupabase>
                  <OwnerMonitorPage />
                </NeedsSupabase>
              }
            />

            {/* Panel Super Admin (Solo signalnotestudio@gmail.com) */}
            <Route
              path="/super-admin"
              element={
                <NeedsSupabase>
                  <SuperAdminPage />
                </NeedsSupabase>
              }
            />

            {/* Aplicación POS Unificada compartida con Escritorio */}
            <Route
              path="/app/*"
              element={
                <NeedsSupabase>
                  <PosAppWrapper />
                </NeedsSupabase>
              }
            />
            <Route
              path="/pos/*"
              element={
                <NeedsSupabase>
                  <PosAppWrapper />
                </NeedsSupabase>
              }
            />
            <Route
              path="/dashboard/*"
              element={
                <NeedsSupabase>
                  <PosAppWrapper />
                </NeedsSupabase>
              }
            />
            <Route
              path="/tables/*"
              element={
                <NeedsSupabase>
                  <PosAppWrapper />
                </NeedsSupabase>
              }
            />
            <Route
              path="/mesas/*"
              element={
                <NeedsSupabase>
                  <PosAppWrapper />
                </NeedsSupabase>
              }
            />
            <Route
              path="/products/*"
              element={
                <NeedsSupabase>
                  <PosAppWrapper />
                </NeedsSupabase>
              }
            />
            <Route
              path="/productos/*"
              element={
                <NeedsSupabase>
                  <PosAppWrapper />
                </NeedsSupabase>
              }
            />
            <Route
              path="/inventory/*"
              element={
                <NeedsSupabase>
                  <PosAppWrapper />
                </NeedsSupabase>
              }
            />
            <Route
              path="/inventario/*"
              element={
                <NeedsSupabase>
                  <PosAppWrapper />
                </NeedsSupabase>
              }
            />
            <Route
              path="/cash-close/*"
              element={
                <NeedsSupabase>
                  <PosAppWrapper />
                </NeedsSupabase>
              }
            />
            <Route
              path="/fiscal-books/*"
              element={
                <NeedsSupabase>
                  <PosAppWrapper />
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
