import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';

// Components
import Sidebar from './components/Sidebar';
import GlobalComandaNotifier from './components/GlobalComandaNotifier';

// Pages
import Login from './pages/Login';
import POS from './pages/POS';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Products from './pages/Products';
import CashClose from './pages/CashClose';
import Tables from './pages/Tables';

import { CLIENT_CONFIG } from './config/clientConfig';

// Protected Route Component for Admin
const ProtectedRoute = ({ children }) => {
  const { isAdmin } = useAuth();
  
  if (!isAdmin()) {
    return <Navigate to="/pos" replace />;
  }
  
  return children;
};

function App() {
  const { user, isAdmin } = useAuth();

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
      <div className="app-layout" style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#f4f5f7' }}>
        <Sidebar />
        <GlobalComandaNotifier />
        <main className="main-content" style={{ flex: 1, height: '100vh', overflowY: 'auto', background: '#f4f5f7' }}>
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

            <Route path="/tables" element={<Tables />} />
            <Route path="/mesas" element={<Tables />} />
            
            {/* Default redirect based on role */}
            <Route path="*" element={
              <Navigate to={isAdmin() ? "/dashboard" : "/pos"} replace />
            } />
          </Routes>
        </main>
      </div>
    </DataProvider>
  );
}

export default App;
