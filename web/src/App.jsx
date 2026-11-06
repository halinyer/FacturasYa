import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthProvider';
import { isConfigured } from './lib/supabase';

// Code-Splitting estilo Notion: La landing carga ultra-ligera en <300ms,
// y la aplicación POS compartida se descarga solo cuando el usuario entra.
const LandingPage = lazy(() => import('./features/landing/LandingPage'));
const AppShell = lazy(() => import('./features/app-shell/AppShell'));
const SuperAdminPage = lazy(() => import('./features/super-admin/SuperAdminPage'));
const OwnerMonitorPage = lazy(() => import('./features/monitor/OwnerMonitorPage'));
const DownloadPage = lazy(() => import('./features/download/DownloadPage'));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('FacturasYa ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-zinc-900 border border-red-500/30 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <span className="text-2xl">⚠️</span>
              <div>
                <h2 className="text-base font-bold text-white">Error al cargar la aplicación</h2>
                <p className="text-xs text-zinc-400">Ocurrió un problema inesperado al inicializar la pantalla.</p>
              </div>
            </div>
            <pre className="bg-black/60 p-3 rounded-xl text-[11px] text-red-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-48 border border-zinc-800">
              {this.state.error?.message || String(this.state.error)}
              {this.state.error?.stack ? '\n\n' + this.state.error.stack : ''}
            </pre>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 py-2 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-colors"
              >
                Recargar página
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.clear();
                    sessionStorage.clear();
                  } catch (e) {}
                  window.location.reload();
                }}
                className="py-2 px-3 rounded-xl border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-800"
                title="Borrar caché local y recargar"
              >
                Limpiar datos locales
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const PageLoader = () => (
  <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
    <div className="w-9 h-9 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
    <span className="text-xs text-zinc-400 font-bold mt-3 tracking-wide">Cargando FacturasYa...</span>
  </div>
);

// Passthrough seguro: si Supabase no está disponible, la app sigue abriendo en modo offline/local
const NeedsSupabase = ({ children }) => {
  return children;
};

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Landing Comercial (Ultraligera <300ms) */}
              <Route path="/" element={<LandingPage />} />

              {/* Página de Descarga Desktop estilo Notion */}
              <Route path="/download" element={<DownloadPage />} />
              <Route path="/descargar" element={<DownloadPage />} />
              <Route path="/desktop" element={<DownloadPage />} />

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

              {/* Espacio de Trabajo SaaS estilo Notion (AppShell con POS, Mesas, Monitor y Ajustes) */}
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
              <Route
                path="/pos"
                element={
                  <NeedsSupabase>
                    <AppShell />
                  </NeedsSupabase>
                }
              />
              <Route
                path="/pos/*"
                element={
                  <NeedsSupabase>
                    <AppShell />
                  </NeedsSupabase>
                }
              />
              <Route
                path="/tables"
                element={
                  <NeedsSupabase>
                    <AppShell />
                  </NeedsSupabase>
                }
              />
              <Route
                path="/tables/*"
                element={
                  <NeedsSupabase>
                    <AppShell />
                  </NeedsSupabase>
                }
              />
              <Route
                path="/mesas"
                element={
                  <NeedsSupabase>
                    <AppShell />
                  </NeedsSupabase>
                }
              />
              <Route
                path="/mesas/*"
                element={
                  <NeedsSupabase>
                    <AppShell />
                  </NeedsSupabase>
                }
              />

              {/* 404 / Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
