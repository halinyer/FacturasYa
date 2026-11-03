import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';

// Components
import Sidebar from './components/Sidebar';
import GlobalComandaNotifier from './components/GlobalComandaNotifier';
import SubscriptionBanner from './components/subscription/SubscriptionBanner';
import PaywallLockScreen from './components/subscription/PaywallLockScreen';
import PagoMovilModal from './components/subscription/PagoMovilModal';

// Pages
import Login from './pages/Login';
import POS from './pages/POS';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import CashClose from './pages/CashClose';
import Tables from './pages/Tables';
import FiscalBooks from './pages/FiscalBooks';

import { CLIENT_CONFIG } from './config/clientConfig';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', maxWidth: '600px', margin: '40px auto', background: '#fff', borderRadius: '16px', border: '1.5px solid #fecaca', color: '#0f172a' }}>
          <h2 style={{ color: '#dc2626', margin: '0 0 10px 0' }}>Error al cargar la pantalla</h2>
          <p style={{ color: '#64748b' }}>{this.state.error?.message || 'Error inesperado'}</p>
          <button type="button" onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Protected Route Component for Admin
const ProtectedRoute = ({ children }) => {
  const { isAdmin } = useAuth();
  
  if (!isAdmin()) {
    return <Navigate to="/pos" replace />;
  }
  
  return children;
};

// Layout interno que conecta el estado de suscripción SaaS, el Kill Switch y el Modal de Pago Móvil
function SaaSPosShell() {
  const { isAdmin, tenant, subStatus } = useAuth();
  const { exchangeRate = 876.80 } = useData() || {};
  const [showPagoMovilModal, setShowPagoMovilModal] = useState(false);
  const [allowSeniatReadOnly, setAllowSeniatReadOnly] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Si la suscripción vuelve a estar activa, desactivar el modo solo lectura
  useEffect(() => {
    if (!subStatus?.isExpired && allowSeniatReadOnly) {
      setAllowSeniatReadOnly(false);
    }
  }, [subStatus?.isExpired, allowSeniatReadOnly]);

  const isFiscalRoute =
    location.pathname.includes('fiscal-books') ||
    location.pathname.includes('libros-fiscales');

  const shouldShowKillSwitch =
    subStatus?.isExpired && !(allowSeniatReadOnly && isFiscalRoute);

  const handleAllowFiscalOnly = () => {
    setAllowSeniatReadOnly(true);
    navigate('/fiscal-books');
  };

  return (
    <div className="app-layout" style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#f4f5f7' }}>
      <Sidebar />
      <GlobalComandaNotifier />

      {/* KILL SWITCH: Pantalla de Bloqueo cuando la suscripción está vencida */}
      {shouldShowKillSwitch && (
        <PaywallLockScreen
          tenant={tenant}
          subStatus={subStatus}
          onOpenPagoMovil={() => setShowPagoMovilModal(true)}
          onAllowFiscalBooksOnly={isAdmin() ? handleAllowFiscalOnly : null}
        />
      )}

      {/* MODAL DE PAGO MÓVIL (Mensual / Anual a tasa BCV) */}
      <PagoMovilModal
        isOpen={showPagoMovilModal}
        onClose={() => setShowPagoMovilModal(false)}
        tenant={tenant}
        exchangeRate={exchangeRate}
      />

      <main className="main-content" style={{ flex: 1, height: '100vh', overflowY: 'auto', background: '#f4f5f7', display: 'flex', flexDirection: 'column' }}>
        {/* Barra Superior de Estado SaaS / Aviso de 3 días / Simulador */}
        <SubscriptionBanner
          tenant={tenant}
          subStatus={subStatus}
          onOpenPagoMovil={() => setShowPagoMovilModal(true)}
        />

        {/* Si está en modo lectura legal de libros SENIAT con suscripción vencida */}
        {subStatus?.isExpired && allowSeniatReadOnly && isFiscalRoute && (
          <div style={{
            background: '#dc2626',
            color: '#ffffff',
            padding: '10px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: '800',
            fontSize: '0.84rem'
          }}>
            <span>🔒 MODO SOLO LECTURA FISCAL: La facturación sigue bloqueada por suscripción vencida.</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowPagoMovilModal(true)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#10b981',
                  color: '#ffffff',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                💳 Pagar Mensualidad Ahora
              </button>
              <button
                type="button"
                onClick={() => setAllowSeniatReadOnly(false)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.4)',
                  background: 'transparent',
                  color: '#ffffff',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Volver al Bloqueo
              </button>
            </div>
          </div>
        )}

        <div style={{ flex: 1 }}>
          <ErrorBoundary>
            <Routes>
              <Route path="/pos" element={<POS />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/clients" element={
                <ProtectedRoute>
                  <Clients />
                </ProtectedRoute>
              } />
              <Route path="/clientes" element={
                <ProtectedRoute>
                  <Clients />
                </ProtectedRoute>
              } />
              
              <Route path="/products" element={
                <ProtectedRoute>
                  <Products />
                </ProtectedRoute>
              } />
              <Route path="/productos" element={
                <ProtectedRoute>
                  <Products />
                </ProtectedRoute>
              } />
              
              <Route path="/inventory" element={
                <ProtectedRoute>
                  <Inventory />
                </ProtectedRoute>
              } />
              <Route path="/inventario" element={
                <ProtectedRoute>
                  <Inventory />
                </ProtectedRoute>
              } />
              
              <Route path="/cash-close" element={
                <ProtectedRoute>
                  <CashClose />
                </ProtectedRoute>
              } />
              <Route path="/cierre" element={
                <ProtectedRoute>
                  <CashClose />
                </ProtectedRoute>
              } />

              <Route path="/fiscal-books" element={
                <ProtectedRoute>
                  <FiscalBooks />
                </ProtectedRoute>
              } />
              <Route path="/libros-fiscales" element={
                <ProtectedRoute>
                  <FiscalBooks />
                </ProtectedRoute>
              } />

              <Route path="/tables" element={<Tables />} />
              <Route path="/mesas" element={<Tables />} />
              
              {/* Default redirect based on role */}
              <Route path="*" element={
                <Navigate to={isAdmin() ? "/dashboard" : "/pos"} replace />
              } />
            </Routes>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

function App() {
  const { user } = useAuth();

  React.useEffect(() => {
    // Sincronizar franquicia activa con el servidor local para tablets
    if (CLIENT_CONFIG && CLIENT_CONFIG.id) {
      fetch('http://localhost:3001/api/franchise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ franchiseId: CLIENT_CONFIG.id })
      }).catch(() => {});
    }
  }, []);

  if (!user) {
    return <Login />;
  }

  return (
    <DataProvider>
      <SaaSPosShell />
    </DataProvider>
  );
}

export default App;
