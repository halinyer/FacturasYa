import React, { useState, useMemo } from 'react';
import { Search, Plus, User, Check, X, Building2, MapPin, Phone, Hash } from 'lucide-react';
import { useData } from '../../pos-core/contexts/DataContext';
import { supabase } from '../../lib/supabase';
import { getActiveBusinessProfile } from '../../pos-core/config/businessProfiles';
import { MODALIDADES_LIST, MODALIDADES } from '../../pos-core/utils/pricingEngine';

export default function ClientSelectorModal({
  isOpen,
  onClose,
  selectedClient,
  onSelectClient,
  tenant
}) {
  if (!isOpen) return null;

  const data = useData();
  const clients = data?.clients || [];

  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'create'
  const [searchQuery, setSearchQuery] = useState('');
  const businessProfile = useMemo(() => getActiveBusinessProfile(), []);

  // Formulario nuevo cliente
  const [docPrefix, setDocPrefix] = useState('V');
  const [docNumber, setDocNumber] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [clientType, setClientType] = useState('detal'); // 'detal' | 'mayor' | 'congelador' | 'microdistribuidor'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Clientes filtrados por búsqueda
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase().trim();
    return clients.filter((c) => {
      const matchName = c.name?.toLowerCase().includes(q);
      const matchRif = (c.cedula || c.rif)?.toLowerCase().includes(q);
      const matchPhone = c.phone?.toLowerCase().includes(q);
      return matchName || matchRif || matchPhone;
    });
  }, [clients, searchQuery]);

  // Selección rápida de Consumidor Final
  const handleSelectConsumidorFinal = () => {
    onSelectClient({
      id: 'generic',
      name: 'Consumidor Final',
      rif: 'V-00000000-0',
      cedula: 'V-00000000-0',
      address: 'Mostrador / Local'
    });
    onClose();
  };

  // Guardar y seleccionar nuevo cliente
  const handleCreateClient = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanNum = docNumber.replace(/\D/g, '').trim();
    if (!cleanNum) {
      setFormError('Por favor ingresa el número de Cédula o RIF.');
      return;
    }
    if (!name.trim()) {
      setFormError('Por favor ingresa el Nombre o Razón Social.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullRif = `${docPrefix}-${cleanNum}`;
      const newClientObj = {
        id: 'cli_' + Date.now(),
        name: name.trim(),
        rif: fullRif,
        cedula: fullRif,
        address: address.trim() || 'Ciudad',
        phone: phone.trim() || '',
        type: clientType,
        clientType: clientType,
        tipoCliente: clientType,
        created_at: new Date().toISOString()
      };

      // 1. Guardar en DataContext local
      if (data?.addClient) {
        data.addClient(newClientObj);
      }

      // 2. Si tenant activo, sincronizar con Supabase
      if (tenant?.id) {
        try {
          await supabase.from('tenant_clients').upsert({
            tenant_id: tenant.id,
            name: newClientObj.name,
            rif: newClientObj.rif,
            address: newClientObj.address,
            phone: newClientObj.phone
          });
        } catch (sErr) {
          console.warn('Sync client to Supabase warning:', sErr);
        }
      }

      onSelectClient(newClientObj);
      onClose();
    } catch (err) {
      setFormError('Error guardando cliente: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABECERA */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-zinc-50/70">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-zinc-950 text-white">
              <User size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-zinc-950">Cliente / Receptor Fiscal</h3>
              <p className="text-[11px] text-zinc-500 font-mono">Facturación SENIAT y Notas de Entrega</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* PESTAÑAS: BUSCAR vs REGISTRAR NUEVO */}
        <div className="grid grid-cols-2 p-1.5 bg-zinc-100 border-b border-zinc-200/80 shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'search' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <Search size={13} />
            <span>Buscar Existente ({clients.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'create' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <Plus size={13} />
            <span>+ Registrar Nuevo RIF</span>
          </button>
        </div>

        {/* CONTENIDO SEGÚN PESTAÑA */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'search' ? (
            <>
              {/* BOTÓN RÁPIDO: CONSUMIDOR FINAL */}
              <div
                onClick={handleSelectConsumidorFinal}
                className="p-3 rounded-xl border border-dashed border-zinc-300 hover:border-zinc-950 bg-zinc-50/60 hover:bg-zinc-100/80 cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-xs text-zinc-950 block">Consumidor Final (Venta Rápida)</span>
                  <span className="text-[11px] text-zinc-500 font-mono">RIF: V-00000000-0</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-200 text-zinc-700">
                  Ticket Anónimo
                </span>
              </div>

              {/* BUSCADOR */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar por Nombre, RIF o Teléfono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400 bg-zinc-50/50"
                  autoFocus
                />
              </div>

              {/* LISTA DE CLIENTES REGISTRADOS */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <div className="text-center py-6 text-zinc-400 text-xs">
                    <p>No se encontraron clientes con "{searchQuery}"</p>
                    <button
                      type="button"
                      onClick={() => {
                        setName(searchQuery);
                        setActiveTab('create');
                      }}
                      className="mt-2 text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      + Registrar como nuevo cliente
                    </button>
                  </div>
                ) : (
                  filteredClients.map((c) => {
                    const rif = c.cedula || c.rif || 'V-00000000';
                    const isSelected = selectedClient?.rif === rif || selectedClient?.name === c.name;

                    return (
                      <div
                        key={c.id || rif}
                        onClick={() => {
                          onSelectClient({
                            id: c.id,
                            name: c.name,
                            rif: rif,
                            cedula: rif,
                            address: c.address || 'Ciudad',
                            phone: c.phone || '',
                            type: c.type || c.clientType || 'normal',
                            clientType: c.type || c.clientType || 'normal',
                            tipoCliente: c.type || c.clientType || 'normal'
                          });
                          onClose();
                        }}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 font-bold'
                            : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs text-zinc-950 truncate">{c.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600">
                              {rif}
                            </span>
                            {c.type && c.type !== 'normal' && c.type !== 'detal' && MODALIDADES[c.type] && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                {MODALIDADES[c.type]?.name || c.type}
                              </span>
                            )}
                          </div>
                          {c.address && (
                            <p className="text-[10px] text-zinc-400 truncate mt-0.5">{c.address}</p>
                          )}
                        </div>
                        {isSelected && <Check size={16} className="text-emerald-600 shrink-0 ml-2" />}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* PESTAÑA: FORMULARIO DE REGISTRO NUEVO CLIENTE FISCAL */
            <form onSubmit={handleCreateClient} className="space-y-3 text-xs">
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
                  {formError}
                </div>
              )}

              {/* PREFIJO Y CÉDULA / RIF */}
              <div>
                <label className="text-[11px] font-bold text-zinc-700 block mb-1">
                  Cédula / RIF Fiscal (SENIAT):
                </label>
                <div className="flex gap-2">
                  <div className="flex rounded-xl border border-zinc-300 overflow-hidden shrink-0">
                    {['V', 'J', 'G', 'E'].map((pref) => (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => setDocPrefix(pref)}
                        className={`px-2.5 py-1.5 font-bold font-mono text-xs cursor-pointer transition-colors ${
                          docPrefix === pref ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        {pref}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="12345678"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-zinc-300 font-mono font-bold text-xs"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* RAZÓN SOCIAL / NOMBRE COMPLETO */}
              <div>
                <label className="text-[11px] font-bold text-zinc-700 block mb-1">
                  Razón Social / Nombre y Apellido:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Inversiones La Cascada C.A."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-semibold"
                  required
                />
              </div>

              {/* DIRECCIÓN FISCAL (REQUERIDO SENIAT) */}
              <div>
                <label className="text-[11px] font-bold text-zinc-700 block mb-1">
                  Dirección Fiscal (Requerido en Facturas con RIF):
                </label>
                <input
                  type="text"
                  placeholder="Ej: Av. Bolívar, C.C. Plaza, Local 4, Maturín"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs"
                />
              </div>

              {/* TELÉFONO / WHATSAPP */}
              <div>
                <label className="text-[11px] font-bold text-zinc-700 block mb-1">
                  Teléfono / WhatsApp (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="0414-1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-mono"
                />
              </div>

              {/* TIPO DE CLIENTE / TARIFA PREFERENCIAL (SI MULTI-PRECIOS ACTIVO) */}
              {businessProfile?.features?.hasMultiPricing && (
                <div>
                  <label className="text-[11px] font-bold text-zinc-700 block mb-1">
                    Tarifa de Venta / Modalidad Asignada:
                  </label>
                  <select
                    value={clientType}
                    onChange={(e) => setClientType(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-bold bg-white"
                  >
                    {MODALIDADES_LIST.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.icon} {m.name} ({m.description})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* BOTÓN REGISTRAR Y USAR */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                >
                  <Check size={15} className="text-emerald-400" />
                  <span>{isSubmitting ? 'Guardando Cliente...' : 'Guardar y Usar en esta Venta'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
