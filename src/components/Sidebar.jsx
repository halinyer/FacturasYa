import React, { useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ShoppingCart, LayoutDashboard, Users, Package, Calculator, LogOut, Database, Download, Upload, CheckCircle, AlertCircle, X, QrCode, Utensils, Sliders } from 'lucide-react';
import QRConnectModal from './QRConnectModal';
import { CLIENT_CONFIG } from '../config/clientConfig';
import './Sidebar.css';

const Sidebar = () => {
  const { user, isAdmin, logout } = useAuth();
  const { exportBackup, importBackup, restaurantMode, toggleRestaurantMode } = useData() || {};
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleExport = () => {
    try {
      const json = exportBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `respaldo_facturapos_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('¡Copia de seguridad descargada exitosamente!', 'success');
    } catch (err) {
      showToast('Error al exportar los datos', 'error');
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const res = importBackup(text);
        showToast(`¡Respaldo restaurado con éxito! (${res.count} facturas recuperadas)`, 'success');
        setShowBackupModal(false);
      } catch (err) {
        showToast(err.message || 'Error al procesar el archivo de respaldo', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">
            {CLIENT_CONFIG.branding.logoImage ? (
              <img src={CLIENT_CONFIG.branding.logoImage} alt="Logo" />
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

            {/* Backup & Restore Action */}
            <button
              type="button"
              onClick={() => setShowBackupModal(true)}
              className="nav-item"
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <Database size={22} color="#f59e0b" />
              <span className="nav-text" style={{ color: '#b45309', fontWeight: '700' }}>Copias de Seguridad</span>
            </button>

            {/* System Configuration Action */}
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

      {/* Backup Modal */}
      {showBackupModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', padding: '24px',
            maxWidth: '440px', width: '90%', border: '1px solid #eaedf2',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)', color: '#111827'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', fontWeight: '800' }}>
                <Database size={20} color="#f59e0b" /> Copias de Seguridad (Offline)
              </div>
              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#6b7280', margin: '0 0 20px 0', lineHeight: '1.4' }}>
              Protege tus facturas, productos, fotos y cuentas por cobrar guardando un archivo en tu computadora o en una memoria USB.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Export Button */}
              <button
                type="button"
                onClick={handleExport}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '12px', background: '#fef3c7', border: '1.5px solid #fde68a',
                  color: '#b45309', borderRadius: '12px', fontWeight: '800', cursor: 'pointer',
                  fontSize: '0.92rem'
                }}
              >
                <Download size={18} /> Descargar Respaldo Ahora (.json)
              </button>

              {/* Import Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('⚠️ Atención: Al restaurar un respaldo se sobrescribirán los datos actuales con el contenido del archivo. ¿Deseas continuar?')) {
                    fileInputRef.current?.click();
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '12px', background: '#f3f4f6', border: '1px solid #d1d5db',
                  color: '#374151', borderRadius: '12px', fontWeight: '700', cursor: 'pointer',
                  fontSize: '0.92rem'
                }}
              >
                <Upload size={18} /> Restaurar desde Archivo (.json)
              </button>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#4b5563', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Connect Tablets Modal */}
      {showQRModal && (
        <QRConnectModal onClose={() => setShowQRModal(false)} />
      )}

      {/* System Settings Modal (Modo Restaurante) */}
      {showConfigModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', padding: '24px',
            maxWidth: '460px', width: '90%', border: '1px solid #eaedf2',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)', color: '#111827'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: '800' }}>
                <Sliders size={20} color="#2563eb" /> Configuración del Sistema
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#6b7280', margin: '0 0 20px 0', lineHeight: '1.4' }}>
              Personaliza el tipo de negocio y activa módulos avanzados según el establecimiento.
            </p>

            {/* Restaurant Mode Switch Card */}
            <div style={{
              background: restaurantMode ? '#eff6ff' : '#f8fafc',
              border: `1.5px solid ${restaurantMode ? '#3b82f6' : '#e2e8f0'}`,
              borderRadius: '14px', padding: '16px', marginBottom: '20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ paddingRight: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '0.95rem', color: restaurantMode ? '#1e40af' : '#1e293b' }}>
                  <Utensils size={18} color={restaurantMode ? '#2563eb' : '#64748b'} /> Modo Restaurante y Comandas
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  Habilita el servidor Wi-Fi local para tablets de meseros, comandas y gestión de mesas en sala.
                </div>
              </div>

              {/* Toggle switch */}
              <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px', flexShrink: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!restaurantMode}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    toggleRestaurantMode(isChecked);
                    showToast(isChecked ? 'Modo Restaurante activado' : 'Modo Restaurante desactivado', 'success');
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: restaurantMode ? '#2563eb' : '#cbd5e1',
                  transition: '0.2s', borderRadius: '28px'
                }}>
                  <span style={{
                    position: 'absolute', content: '""', height: '22px', width: '22px',
                    left: restaurantMode ? '25px' : '3px', bottom: '3px',
                    backgroundColor: 'white', transition: '0.2s', borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                style={{ padding: '9px 20px', background: '#0f172a', border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: '700', cursor: 'pointer', fontSize: '0.88rem' }}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#10b981' : '#dc2626',
          color: '#fff', padding: '10px 22px', borderRadius: '24px',
          fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)', zIndex: 3000, fontSize: '0.88rem'
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

    </div>
  );
};

export default Sidebar;
