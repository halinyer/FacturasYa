import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  Download,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Store,
  Layers,
  HelpCircle,
  ExternalLink,
  Laptop,
  WifiOff,
  Printer,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { fetchMyTenant, fetchTenantSnapshot, fetchSaasConfig } from '../monitor/api';
import WebPosView from '../pos/WebPosView';
import OwnerMonitorPage from '../monitor/OwnerMonitorPage';

const INSTALLER_URL =
  import.meta.env.VITE_INSTALLER_URL || 'https://github.com/halinyer/FacturasYa/releases/latest';

export default function AppShell() {
  const { session, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Estado de navegación: 'pos' | 'monitor' | 'fiscal' | 'subscription' | 'tables'
  const activeTab = searchParams.get('tab') || 'pos';
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  // Datos del Tenant y Snapshot
  const [tenant, setTenant] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados visuales del Shell
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Cargar datos del restaurante
  const loadTenantData = useCallback(async () => {
    try {
      setLoading(true);
      const tData = await fetchMyTenant();
      setTenant(tData);
      if (tData?.id) {
        const snap = await fetchTenantSnapshot(tData.id);
        setSnapshot(snap);
      }
    } catch (e) {
      console.warn('Error cargando tenant en AppShell:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      loadTenantData();
    }
  }, [session, loadTenantData]);

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

  const navItems = [
    {
      id: 'pos',
      label: 'Punto de Venta',
      icon: ShoppingCart,
      badge: 'Caja'
    },
    {
      id: 'monitor',
      label: 'Monitor del Dueño',
      icon: TrendingUp,
      badge: 'En vivo'
    },
    {
      id: 'tables',
      label: 'Mesas & Comandas',
      icon: Layers
    },
    {
      id: 'fiscal',
      label: 'Datos Fiscales SENIAT',
      icon: ShieldCheck,
      badge: tenant?.is_fiscal_verified ? null : 'Pendiente'
    },
    {
      id: 'subscription',
      label: 'Mi Suscripción',
      icon: CreditCard,
      badge: subStatus ? `${subStatus.daysRemaining}d` : null
    }
  ];

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
                    {subStatus?.daysRemaining || 14} días de prueba
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* BOTÓN COLAPSAR (DESKTOP) */}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title={isSidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* BOTÓN CERRAR (MÓVIL) */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-zinc-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* NAVEGACIÓN PRINCIPAL */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {!isSidebarCollapsed && (
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Espacio de Trabajo
            </div>
          )}

          {navItems.map((item) => {
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
                            : item.badge === 'Pendiente'
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
          })}
        </nav>

        {/* PIE DEL SIDEBAR: BOTÓN DESCARGA WINDOWS + USUARIO */}
        <div className="p-2 border-t border-zinc-800 shrink-0 space-y-2">
          
          {/* BOTÓN DESCARGA WINDOWS ESTILO NOTION */}
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

          {/* PERFIL Y LOGOUT */}
          <div
            className={`flex items-center justify-between p-1.5 rounded-lg bg-zinc-950/40 text-xs ${
              isSidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            {!isSidebarCollapsed && (
              <div className="min-w-0 pr-1">
                <span className="block text-[11px] font-bold text-zinc-200 truncate">
                  {session?.user?.email}
                </span>
                <span className="block text-[9px] text-zinc-500 truncate">FacturasYa Cloud</span>
              </div>
            )}

            <button
              type="button"
              onClick={signOut}
              title="Cerrar sesión"
              className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER SUPERIOR EN MÓVIL (BOTÓN HAMBURGUESA) */}
        <div className="lg:hidden bg-zinc-900 text-white p-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1 rounded-lg text-zinc-300 hover:bg-zinc-800"
            >
              <Menu size={20} />
            </button>
            <span className="text-xs font-bold truncate">{tenant?.name || 'FacturasYa'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                activeTab === 'pos' ? 'bg-white text-zinc-950' : 'text-zinc-400'
              }`}
            >
              Punto de Venta
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('monitor')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                activeTab === 'monitor' ? 'bg-white text-zinc-950' : 'text-zinc-400'
              }`}
            >
              Monitor
            </button>
          </div>
        </div>

        {/* VISTAS DINÁMICAS SEGÚN LA PESTAÑA ACTIVA */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'pos' && (
            <WebPosView
              tenant={tenant}
              snapshot={snapshot}
              onSaleComplete={() => loadTenantData()}
            />
          )}

          {activeTab === 'monitor' && (
            <div className="h-full overflow-y-auto">
              <OwnerMonitorPage embedded={true} defaultTab="overview" />
            </div>
          )}

          {activeTab === 'tables' && (
            <div className="h-full overflow-y-auto">
              <OwnerMonitorPage embedded={true} defaultTab="tables" />
            </div>
          )}

          {activeTab === 'fiscal' && (
            <div className="h-full overflow-y-auto">
              <OwnerMonitorPage embedded={true} defaultTab="fiscal" />
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="h-full overflow-y-auto">
              <OwnerMonitorPage embedded={true} defaultTab="subscription" />
            </div>
          )}
        </div>
      </div>

      {/* MODAL EXPLICATIVO DE DESCARGA PARA WINDOWS (ESTILO NOTION) */}
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
                Puedes usar el <strong>Punto de Venta Web</strong> en cualquier navegador o tablet.
                Sin embargo, te recomendamos instalar la <strong>App de Windows</strong> en la PC de tu mostrador si:
              </p>

              <div className="space-y-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-[11px]">
                <div className="flex items-start gap-2">
                  <Printer size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Impresora Fiscal SENIAT por cable:</strong> Se conecta directamente por USB o puerto Serial a máquinas Bixolon, HKA, Custom o Dascom.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <WifiOff size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Modo 100% Offline:</strong> Si se cae el internet o la luz en tu zona, tu cajero sigue facturando sin interrupción.
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href={INSTALLER_URL}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <Download size={15} />
                <span>Descargar FacturasYa para Windows (.exe)</span>
              </a>

              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                className="w-full py-2 rounded-xl text-zinc-500 hover:text-zinc-900 text-xs font-semibold"
              >
                Continuar usando el Punto de Venta Web
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
