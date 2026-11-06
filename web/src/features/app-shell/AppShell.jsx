import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShoppingCart,
  Utensils,
  LayoutDashboard,
  BookOpen,
  Calculator,
  Boxes,
  Package,
  Users,
  TrendingUp,
  Settings,
  LogOut,
  Laptop,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

// Contextos compartidos
import { useAuth as useWebAuth } from '../auth/AuthProvider';
import { AuthProvider as PosAuthProvider } from '@pos/contexts/AuthContext';
import { DataProvider, useData } from '@pos/contexts/DataContext';
import { db } from '@pos/services/dataService';
import { setCurrentTenant } from '@pos/lib/syncEngine';


// Módulos operativos completos de Happy Days
import WebPosView from '../pos/WebPosView';
import TablesView from '../tables/TablesView';
import SalesDashboardView from '../dashboard/SalesDashboardView';
import FiscalBooksView from '../fiscal/FiscalBooksView';
import CashCloseView from '../cash-close/CashCloseView';
import InventoryView from '../inventory/InventoryView';
import ProductsView from '../products/ProductsView';
import ClientsView from '../clients/ClientsView';








// Monitor Cloud para el dueño y modales
import OwnerMonitorPage from '../monitor/OwnerMonitorPage';
import TopBarRate from './TopBarRate';
import NotionSettingsModal from '../settings/NotionSettingsModal';
import { fetchMyTenant, fetchTenantSnapshot } from '../monitor/api';

const INSTALLER_URL =
  import.meta.env.VITE_INSTALLER_URL || 'https://github.com/halinyer/FacturasYa/releases/latest/download/FacturaPOS-1.0.0.exe';

function AppShellInner() {
  const { session, signOut } = useWebAuth();
  const posData = useData();
  const refreshDataRef = useRef(posData?.refreshData);
  useEffect(() => {
    refreshDataRef.current = posData?.refreshData;
  }, [posData?.refreshData]);
  const hydratedUserIdRef = useRef(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'pos';
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  const [tenant, setTenant] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.checkUpdate) return;
    const check = () => {
      window.electronAPI.checkUpdate().then((res) => {
        if (res?.updateAvailable) setUpdateAvailable(true);
      }).catch(() => {});
    };
    check();
    const timer = setInterval(check, 180000);
    return () => clearInterval(timer);
  }, [isElectron]);

  const loadTenantData = useCallback(async () => {
    try {
      setLoading(true);
      const tData = await fetchMyTenant();
      setTenant(tData);
      if (tData?.id) {
        setCurrentTenant(tData);
        const snap = await fetchTenantSnapshot(tData.id);
        setSnapshot(snap);

        const prevTenantId = localStorage.getItem('pos_active_tenant_id');
        const isSwitchingTenant = prevTenantId && prevTenantId !== tData.id;
        const isLocalEmpty = (db.getProducts() || []).length === 0 && (db.getInvoices() || []).length === 0;

        if (isSwitchingTenant || (isLocalEmpty && snap && hydratedUserIdRef.current !== tData.id)) {
          hydratedUserIdRef.current = tData.id;
          localStorage.setItem('pos_active_tenant_id', tData.id);
          if (Array.isArray(snap?.products) && snap.products.length > 0) {
            db.rawSet('pos_products', snap.products);
          } else if (isSwitchingTenant) {
            db.rawSet('pos_products', []);
          }
          db.rawSet('pos_clients', Array.isArray(snap?.clients) && snap.clients.length > 0 ? snap.clients : [
            { id: 'cli_default', name: 'Consumidor Final', cedula: 'V-00000000', phone: '', type: 'normal', address: 'Mostrador', createdAt: new Date().toISOString() }
          ]);
          db.rawSet('pos_invoices', Array.isArray(snap?.invoices) ? snap.invoices : []);
          db.rawSet('pos_purchases', Array.isArray(snap?.purchases) ? snap.purchases : []);
          db.rawSet('pos_payments', Array.isArray(snap?.payments) ? snap.payments : []);
          db.rawSet('pos_cash_closes', Array.isArray(snap?.cash_closes) ? snap.cash_closes : []);
          db.rawSet('pos_open_tabs', Array.isArray(snap?.open_tabs) ? snap.open_tabs : []);
          db.rawSet('pos_inventory', Array.isArray(snap?.inventory) ? snap.inventory : []);
          db.rawSet('pos_z_reports', Array.isArray(snap?.z_reports) ? snap.z_reports : []);
          if (isSwitchingTenant) {
            localStorage.removeItem('facturasya_restaurant_tables');
          }
          if (refreshDataRef.current) {
            refreshDataRef.current();
          }
        } else if (!prevTenantId) {
          localStorage.setItem('pos_active_tenant_id', tData.id);
        }
      }
    } catch (e) {
      console.warn('Error cargando tenant en AppShell:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      loadTenantData();
    }
  }, [session?.user?.id, loadTenantData]);

  // Días de suscripción restantes
  const subStatus = useMemo(() => {
    if (!tenant) return null;
    const now = Date.now();
    const validUntilMs = tenant.valid_until ? new Date(tenant.valid_until).getTime() : now;
    const diffDays = Math.ceil((validUntilMs - now) / (86400 * 1000));
    return {
      daysRemaining: Math.max(0, diffDays),
      isExpired: tenant.status === 'past_due' || tenant.status === 'suspended' || diffDays <= 0,
      plan: tenant.plan || 'trial'
    };
  }, [tenant]);

  // Lista de navegación 100% OPERATIVA (Cero duplicados de configuración o pago en el sidebar)
  const navSections = [
    {
      title: 'Operaciones',
      items: [
        { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart, badge: 'Caja' },
        { id: 'tables', label: 'Mesas & Salón', icon: Utensils, badge: 'Salas' }
      ]
    },
    {
      title: 'Catálogo & Insumos',
      items: [
        { id: 'products', label: 'Menú & Productos', icon: Package },
        { id: 'inventory', label: 'Inventario & Stock', icon: Boxes },
        { id: 'clients', label: 'Clientes & Crédito', icon: Users }
      ]
    },
    {
      title: 'Administración & SENIAT',
      items: [
        { id: 'dashboard', label: 'Dashboard de Ventas', icon: LayoutDashboard },
        { id: 'fiscal', label: 'Libros SENIAT', icon: BookOpen, badge: 'Legal' },
        { id: 'cash-close', label: 'Cierre de Caja', icon: Calculator, badge: 'Arqueo' }
      ]
    },
    {
      title: 'En la Nube',
      items: [
        { id: 'monitor', label: 'Monitor del Dueño', icon: TrendingUp, badge: 'En vivo' }
      ]
    }
  ];

  const allNavItems = useMemo(() => navSections.flatMap((s) => s.items), []);
  const currentNavItem = allNavItems.find((n) => n.id === activeTab) || allNavItems[0];
  const legacyNavItems = null; /*
    {
      id: 'pos',
      label: 'Punto de Venta',
      icon: ShoppingCart,
      badge: 'Caja'
    },
    {
      id: 'tables',
      label: 'Mesas & Salón',
      icon: Utensils,
      badge: 'Mesas'
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      id: 'fiscal',
      label: 'Libros SENIAT',
      icon: BookOpen,
      badge: 'Compras / Ventas'
    },
    {
      id: 'cash-close',
      label: 'Cierre de Caja',
      icon: Calculator
    },
    {
      id: 'inventory',
      label: 'Inventario',
      icon: Boxes
    },
    {
      id: 'products',
      label: 'Productos & Menú',
      icon: Package
    },
    {
      id: 'clients',
      label: 'Clientes & Crédito',
      icon: Users
    },
    {
      id: 'monitor',
      label: 'Monitor Cloud',
      icon: TrendingUp,
      badge: 'En vivo'
    }
  ];

  */

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 font-sans antialiased text-zinc-900">
      
      {/* SIDEBAR MÓVIL (BACKDROP) */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-2xs lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR ESTILO NOTION */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-zinc-900 text-zinc-300 border-r border-zinc-800 transition-all duration-200 select-none ${
          isSidebarCollapsed ? 'lg:w-16' : 'w-64'
        } ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* HEADER DEL WORKSPACE / NEGOCIO */}
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
              FY
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <h2 className="text-xs font-bold text-white tracking-tight truncate">
                  {tenant?.name || 'Mi Negocio'}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] text-zinc-400 font-semibold truncate">
                    {subStatus?.daysRemaining || 14} días de acceso
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* ROSCA DE CONFIGURACIÓN ESTILO NOTION */}
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Ajustes del Negocio, Hardware y Cuenta (⚙️)"
            >
              <Settings size={15} />
            </button>

            {/* BOTÓN COLAPSAR (DESKTOP) */}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title={isSidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN PRINCIPAL OPERATIVA (CERO DUPLICADOS) */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-3.5">
          {!isSidebarCollapsed && (
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">

            </div>
          )}

          {navSections.map((section, sIdx) => (
            <div key={section.title || sIdx} className="space-y-1">
              {!isSidebarCollapsed && (
                <div className="px-2.5 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all group cursor-pointer ${
                      isActive
                        ? 'bg-zinc-800 text-white shadow-2xs font-bold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                    } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <Icon
                      size={16}
                      className={isActive ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-300'}
                    />
                    {!isSidebarCollapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                              item.badge === 'Caja'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : item.badge === 'Legal'
                                ? 'bg-sky-500/20 text-sky-300'
                                : item.badge === 'Salas'
                                ? 'bg-amber-500/20 text-amber-300'
                                : item.badge === 'Arqueo'
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {/*
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-zinc-800 text-white shadow-2xs font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <Icon
                  size={16}
                  className={isActive ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-300'}
                />
                {!isSidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          item.badge === 'Caja'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : item.badge === 'Compras / Ventas'
                            ? 'bg-sky-500/20 text-sky-300'
                            : item.badge === 'Mesas'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          */}
        </nav>

        {/* PIE DEL SIDEBAR: BOTÓN DESCARGA WINDOWS + USUARIO CON ACCESO A AJUSTES */}
        <div className="p-2 border-t border-zinc-800 shrink-0 space-y-2">
          
          {/* BOTÓN DESCARGA WINDOWS SOLO EN WEB */}
          {!isElectron && (
            <button
              type="button"
              onClick={() => setIsDownloadModalOpen(true)}
              className={`w-full py-2 px-2.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-700/80 transition-all flex items-center gap-2 shadow-2xs group ${
                isSidebarCollapsed ? 'justify-center' : ''
              }`}
              title="Descargar FacturasYa para Windows"
            >
              <Laptop size={15} className="text-sky-400 group-hover:scale-110 transition-transform" />
              {!isSidebarCollapsed && (
                <div className="text-left leading-tight truncate">
                  <span className="block font-bold text-white text-[11px]">App para Windows</span>
                  <span className="block text-[9px] text-zinc-400">Para tu PC de caja física</span>
                </div>
              )}
            </button>
          )}

          {/* PERFIL CON APERTURA DE CONFIGURACIÓN ESTILO NOTION */}
          <div
            onClick={() => setIsSettingsModalOpen(true)}
            className={`flex items-center justify-between p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 cursor-pointer transition-all border border-zinc-700/60 group ${
              isSidebarCollapsed ? 'justify-center' : ''
            }`}
            title="Abrir Ajustes de Negocio, Máquina Fiscal y Cuenta"
          >
            <div className="min-w-0 pr-1 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-700 group-hover:bg-zinc-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {session?.user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold text-zinc-200 truncate">
                    {session?.user?.email || 'admin@facturasya.com'}
                  </span>
                  <span className="block text-[9px] text-emerald-400 font-semibold truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Dueño · Ajustes ⚙️
                  </span>
                </div>
              )}
            </div>

            {!isSidebarCollapsed && (
              <div className="flex items-center gap-1">
                <Settings size={14} className="text-zinc-400 group-hover:text-white transition-colors" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    signOut();
                  }}
                  title="Cerrar sesión"
                  className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-700/60 transition-colors ml-1"
                >
                  <LogOut size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-100/80">
        
        {/* BARRA SUPERIOR FIJA ESTILO NOTION (CON TASA BCV EN VIVO) */}
        <header
          className="h-12 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0 text-white select-none app-drag-region"
          style={isElectron ? { paddingRight: '144px' } : undefined}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-white">
                {currentNavItem.label}
              </span>
              {currentNavItem.badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 hidden sm:inline-block">
                  {currentNavItem.badge}
                </span>
              )}
            </div>
          </div>

          {/* TASA BCV EN VIVO Y ROSCA RÁPIDA DE AJUSTES */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isElectron && updateAvailable && (
              <button
                type="button"
                disabled={installingUpdate}
                onClick={async () => {
                  setInstallingUpdate(true);
                  await window.electronAPI?.installUpdate?.();
                }}
                className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-[11px] flex items-center gap-1.5 shadow-xs cursor-pointer transition-all app-no-drag"
                title="Descargar e instalar automáticamente la nueva versión"
              >
                <span>{installingUpdate ? 'Actualizando...' : '⚡ Actualizar versión'}</span>
              </button>
            )}
            <TopBarRate />

            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="Abrir Ajustes del Negocio (⚙️)"
            >
              <Settings size={15} />
            </button>
          </div>
        </header>

        {/* VISTAS OPERATIVAS COMPLETAS DE HAPPY DAYS */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'pos' && (
            <WebPosView
              tenant={tenant}
              snapshot={snapshot}
              onSaleComplete={() => {}}
            />
          )}
          {activeTab === 'tables' && (
            <TablesView
              onGoToPos={() => setActiveTab('pos')}
            />
          )}
          {activeTab === 'dashboard' && <SalesDashboardView />}
          {activeTab === 'fiscal' && <FiscalBooksView />}
          {activeTab === 'cash-close' && <CashCloseView />}
          {activeTab === 'inventory' && <InventoryView />}
          {activeTab === 'products' && <ProductsView />}
          {activeTab === 'clients' && <ClientsView />}
          {activeTab === 'monitor' && (
            <div className="h-full overflow-y-auto">
              <OwnerMonitorPage embedded={true} defaultTab="overview" />
            </div>
          )}
        </main>
      </div>

      {/* MODAL CENTRALIZADO DE AJUSTES ESTILO NOTION */}
      <NotionSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        tenant={tenant}
        subStatus={subStatus}
        session={session}
        onUpdateTenant={(updated) => setTenant(updated)}
      />

      {/* MODAL EXPLICATIVO DE DESCARGA PARA WINDOWS */}
      {isDownloadModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsDownloadModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                  <Laptop size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">FacturasYa para Windows</h3>
                  <p className="text-[11px] text-zinc-500">Caja Registradora Física para tu Local</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-600 leading-relaxed">
              <p>
                La versión Web sincroniza todos tus pedidos, inventario y mesas en la nube.
                Instala la <strong>App de Windows</strong> en tu PC de mostrador para:
              </p>

              <div className="space-y-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-[11px]">
                <div className="flex items-start gap-2">
                  <span className="text-base">🖨️</span>
                  <span>
                    <strong>Impresora Fiscal SENIAT por cable:</strong> Conexión serial directa HKA80 / COM2 / USB.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-base">⚡</span>
                  <span>
                    <strong>Modo 100% Offline:</strong> Si se corta el internet, tu local sigue facturando sin pausas.
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href={INSTALLER_URL} download="FacturaPOS-1.0.0.exe"
                className="w-full py-3 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <span>Descargar FacturasYa para Windows (.exe)</span>
              </a>

              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                className="w-full py-2 rounded-xl text-zinc-500 hover:text-zinc-900 text-xs font-semibold"
              >
                Continuar en la Web
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AppShell() {
  return (
    <PosAuthProvider>
      <DataProvider>
        <AppShellInner />
      </DataProvider>
    </PosAuthProvider>
  );
}
