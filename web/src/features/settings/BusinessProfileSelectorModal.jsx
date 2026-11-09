import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Utensils,
  Store,
  Boxes,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Package
} from 'lucide-react';
import {
  BUSINESS_PROFILES,
  BUSINESS_PROFILES_LIST,
  getActiveBusinessProfile,
  setActiveBusinessProfile
} from '../../pos-core/config/businessProfiles';
import { HELADOS_LA_CASCADA_PRODUCTS } from '../../pos-core/data/heladosLaCascadaData';
import { db } from '../../pos-core/services/dataService';
import { supabase } from '../../lib/supabase';

export default function BusinessProfileSelectorModal({
  isOpen,
  onClose,
  tenant,
  onProfileSaved
}) {
  if (!isOpen) return null;

  const currentProfile = getActiveBusinessProfile(tenant);
  const [selectedId, setSelectedId] = useState(currentProfile.id);
  const [customFeatures, setCustomFeatures] = useState({
    hasTables: currentProfile.features.hasTables,
    hasKitchenTickets: currentProfile.features.hasKitchenTickets,
    hasMultiPricing: currentProfile.features.hasMultiPricing,
    hasBarcode: currentProfile.features.hasBarcode,
    fastCounterCheckout: currentProfile.features.fastCounterCheckout
  });
  const [loadCatalogOption, setLoadCatalogOption] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSelectCard = (id) => {
    setSelectedId(id);
    if (BUSINESS_PROFILES[id]) {
      setCustomFeatures({ ...BUSINESS_PROFILES[id].features });
      if (id === 'ice_cream') {
        setLoadCatalogOption(true);
      } else {
        setLoadCatalogOption(false);
      }
    }
  };

  const handleToggleFeature = (key) => {
    setCustomFeatures((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
    setSelectedId('custom');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const activeFeatures = selectedId === 'custom'
        ? customFeatures
        : BUSINESS_PROFILES[selectedId].features;

      // 1. Guardar en storage local
      setActiveBusinessProfile(selectedId, selectedId === 'custom' ? customFeatures : null);

      // 2. Si eligió Heladería y marcó cargar catálogo oficial de Helados La Cascada
      if (selectedId === 'ice_cream' && loadCatalogOption) {
        const currentProducts = db.getProducts() || [];
        if (currentProducts.length === 0 || window.confirm('¿Deseas precargar el catálogo oficial de Helados La Cascada con sus 4 modalidades de precios?')) {
          db.rawSet('pos_products', HELADOS_LA_CASCADA_PRODUCTS);
          try {
            localStorage.setItem('pos_products', JSON.stringify(HELADOS_LA_CASCADA_PRODUCTS));
          } catch (e) {}
        }
      }

      // 3. Sincronizar con Supabase si tenant está disponible
      if (tenant?.id && supabase) {
        try {
          await supabase.from('tenants').update({
            business_type: selectedId,
            features: activeFeatures,
            updated_at: new Date().toISOString()
          }).eq('id', tenant.id);
        } catch (supaErr) {
          console.warn('Sync de perfil en cola:', supaErr);
        }
      }

      if (onProfileSaved) {
        onProfileSaved({
          id: selectedId,
          ...BUSINESS_PROFILES[selectedId],
          features: activeFeatures
        });
      }

      onClose();
    } catch (err) {
      console.error('Error guardando perfil de negocio:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white text-zinc-900 border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col w-full max-w-3xl max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ENCABEZADO ESTILO NOTION */}
        <div className="p-6 border-b border-zinc-100 flex items-start justify-between gap-4 bg-zinc-50/50">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-200 text-zinc-800 text-[11px] font-bold">
              <Sparkles size={12} className="text-amber-500" />
              <span>Configuración de Flujo y Pantallas</span>
            </div>
            <h2 className="text-xl font-extrabold text-zinc-950 tracking-tight">
              ¿Cuál es la actividad de tu negocio?
            </h2>
            <p className="text-xs text-zinc-500 max-w-xl leading-relaxed">
              FacturasYa adapta la interfaz, los menús y las modalidades de venta para que solo veas lo que necesitas, con máxima velocidad y sin sobrecargar la caja.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-200/60 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* TARJETAS DE SELECCIÓN DE PERFIL */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {BUSINESS_PROFILES_LIST.filter((p) => p.id !== 'custom').map((p) => {
              const isSelected = selectedId === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectCard(p.id)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-zinc-950 bg-zinc-50/80 shadow-md ring-2 ring-zinc-950/10'
                      : 'border-zinc-200/90 bg-white hover:border-zinc-300 hover:bg-zinc-50/50'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{p.icon}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {p.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-sm text-zinc-950">
                        {p.name}
                      </h3>
                      <p className="text-[11px] text-zinc-500 mt-1 leading-snug">
                        {p.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] font-semibold">
                    <span className={isSelected ? 'text-zinc-950 font-bold' : 'text-zinc-400'}>
                      {isSelected ? '✓ Seleccionado' : 'Elegir perfil'}
                    </span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-300 bg-white'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* OPCIÓN DE CARGA DE CATÁLOGO OFICIAL PARA HELADERÍA */}
          {selectedId === 'ice_cream' && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🍨</span>
                <div>
                  <span className="font-bold text-amber-950 block">
                    Cargar Catálogo Oficial de Helados La Cascada (60+ ítems)
                  </span>
                  <span className="text-[11px] text-amber-800/80 block">
                    Incluye Línea Maximum, Sunday, Conos, Barquillas y Potes con sus 4 precios (Detal, Mayor, Congelador, Microdistribuidor).
                  </span>
                </div>
              </div>

              <input
                type="checkbox"
                id="load_cascada_catalog"
                checked={loadCatalogOption}
                onChange={(e) => setLoadCatalogOption(e.target.checked)}
                className="w-4 h-4 rounded text-zinc-950 cursor-pointer accent-zinc-950"
              />
            </div>
          )}

          {/* AJUSTES FINOS / MÓDULOS AVANZADOS (EXPANDIBLE) */}
          <div className="border border-zinc-200/90 rounded-2xl p-4 bg-zinc-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders size={15} className="text-zinc-500" />
                <h4 className="text-xs font-bold text-zinc-950">Módulos Específicos Habilitados</h4>
              </div>
              <span className="text-[10px] text-zinc-400 font-semibold">
                {selectedId === 'custom' ? 'Modo Personalizado Activo' : 'Predeterminado por perfil'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-zinc-200/80">
                <div>
                  <span className="font-bold text-zinc-900 block">Mesas & Salón Físico</span>
                  <span className="text-[10px] text-zinc-500">Mapa de mesas y cuentas abiertas</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleFeature('hasTables')}
                  className="cursor-pointer"
                >
                  {customFeatures.hasTables ? (
                    <ToggleRight size={26} className="text-emerald-600" />
                  ) : (
                    <ToggleLeft size={26} className="text-zinc-400" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-zinc-200/80">
                <div>
                  <span className="font-bold text-zinc-900 block">Comandas a Cocina / Barra</span>
                  <span className="text-[10px] text-zinc-500">Tickets térmicos automáticos</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleFeature('hasKitchenTickets')}
                  className="cursor-pointer"
                >
                  {customFeatures.hasKitchenTickets ? (
                    <ToggleRight size={26} className="text-emerald-600" />
                  ) : (
                    <ToggleLeft size={26} className="text-zinc-400" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-zinc-200/80">
                <div>
                  <span className="font-bold text-zinc-900 block">Escalas de Precios (Mayor / Detal)</span>
                  <span className="text-[10px] text-zinc-500">Tarifas por volumen o distribuidor</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleFeature('hasMultiPricing')}
                  className="cursor-pointer"
                >
                  {customFeatures.hasMultiPricing ? (
                    <ToggleRight size={26} className="text-emerald-600" />
                  ) : (
                    <ToggleLeft size={26} className="text-zinc-400" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-zinc-200/80">
                <div>
                  <span className="font-bold text-zinc-900 block">Lector de Código de Barras</span>
                  <span className="text-[10px] text-zinc-500">Búsqueda rápida por pistola escáner</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleFeature('hasBarcode')}
                  className="cursor-pointer"
                >
                  {customFeatures.hasBarcode ? (
                    <ToggleRight size={26} className="text-emerald-600" />
                  ) : (
                    <ToggleLeft size={26} className="text-zinc-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PIE DEL MODAL CON ACCIONES */}
        <div className="p-4 sm:p-5 border-t border-zinc-100 flex items-center justify-between gap-3 bg-zinc-50/50">
          <span className="text-xs text-zinc-500">
            Facturación fiscal SENIAT HKA80 y Cierre de Caja están <strong>siempre activos</strong>.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 font-semibold text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>{saving ? 'Guardando...' : 'Aplicar Configuración'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
