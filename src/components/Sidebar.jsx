import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import {
  ShoppingCart,
  LayoutDashboard,
  Users,
  Package,
  Calculator,
  LogOut,
  Database,
  CheckCircle,
  AlertCircle,
  QrCode,
  Utensils,
  Sliders,
  BookOpen
} from 'lucide-react';
import QRConnectModal from './QRConnectModal';
import BackupModal from './BackupModal';
import FiscalConfigModal from './fiscal/FiscalConfigModal';
import { CLIENT_CONFIG } from '../config/clientConfig';
import { getAssetUrl } from '../utils/assetHelper';
import './Sidebar.css';

const Sidebar = () => {
  const { user, isAdmin, logout } = useAuth();
  const { restaurantMode, openTabs = [] } = useData() || {};
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">
            {CLIENT_CONFIG.branding.logoImage ? (
              <img src={getAssetUrl(CLIENT_CONFIG.branding.logoImage)} alt="Logo" />
            ) : (
              <span>{CLIENT_CONFIG.branding.logoIcon}</span>
            )}
          </div>
          <span className="brand-text">{CLIENT_CONFIG.branding.logoText}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/pos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ShoppingCart size={22} />
          <span className="nav-text">Punto de Venta</span>
          {openTabs.length > 0 && (
            <span style={{
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: '800',
              padding: '2px 7px',
              borderRadius: '999px',
              marginLeft: 'auto'
            }} title={`${openTabs.length} cuentas abiertas o deliveries`}>
              {openTabs.length}
            </span>
          )}
        </NavLink>

        {restaurantMode && (
          <>
            <NavLink to="/tables" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Utensils size={22} color="#f59e0b" />
              <span className="nav-text" style={{ fontWeight: '700' }}>Mesas y Salón</span>
            </NavLink>
            <button
              type="button"
              onClick={() => setShowQRModal(true)}
              className="nav-item"
              style={{ background: 'rgba(37, 99, 235, 0.08)', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <QrCode size={22} color="#2563eb" />
              <span className="nav-text" style={{ color: '#1d4ed8', fontWeight: '800' }}>Vincular Tablets</span>
            </button>
          </>
        )}

        {isAdmin() && (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={22} />
              <span className="nav-text">Dashboard</span>
            </NavLink>
            <NavLink to="/clients" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={22} />
              <span className="nav-text">Clientes</span>
            </NavLink>
            <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Package size={22} />
              <span className="nav-text">Productos</span>
            </NavLink>
            <NavLink to="/cash-close" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Calculator size={22} />
              <span className="nav-text">Cierre de Caja</span>
            </NavLink>
            <NavLink to="/fiscal-books" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <BookOpen size={22} color="#10b981" />
              <span className="nav-text" style={{ color: '#047857', fontWeight: '700' }}>Libros SENIAT</span>
            </NavLink>

            <button
              type="button"
              onClick={() => setShowBackupModal(true)}
              className="nav-item"
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <Database size={22} color="#f59e0b" />
              <span className="nav-text" style={{ color: '#b45309', fontWeight: '700' }}>Copias de Seguridad</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="nav-item"
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <Sliders size={22} color="#6b7280" />
              <span className="nav-text" style={{ color: '#4b5563', fontWeight: '700' }}>Configuración</span>
            </button>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="user-details">
            <span className="user-name">{user?.name}</span>
            <span className="user-role badge">{user?.role === 'admin' ? 'Admin' : 'Cajero'}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={logout} title="Cerrar Sesión">
          <LogOut size={20} />
          <span className="nav-text">Salir</span>
        </button>
      </div>

      {showBackupModal && (
        <BackupModal onClose={() => setShowBackupModal(false)} showToast={showToast} />
      )}

      {showQRModal && (
        <QRConnectModal onClose={() => setShowQRModal(false)} />
      )}

      {showConfigModal && (
        <FiscalConfigModal onClose={() => setShowConfigModal(false)} showToast={showToast} />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: '#ffffff', padding: '10px 20px', borderRadius: '999px',
          fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.2)', zIndex: 3000, fontSize: '0.88rem'
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
