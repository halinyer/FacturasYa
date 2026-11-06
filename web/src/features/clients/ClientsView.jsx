import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  X,
  CheckCircle2
} from 'lucide-react';
import { useData } from '../../pos-core/contexts/DataContext';

const DEFAULT_CLIENTS = [
  { id: 'c-1', name: 'Consumidor Final', rif: 'V-00000000-0', phone: 'N/A', address: 'Local', balanceUsd: 0 },
  { id: 'c-2', name: 'Inversiones Los Chaguaramos C.A.', rif: 'J-31456789-0', phone: '0414-1234567', address: 'Av. Libertador, Caracas', balanceUsd: 45.00 },
  { id: 'c-3', name: 'Mariana Silva', rif: 'V-18456123-4', phone: '0424-9876543', address: 'Urb. El Rosal, Chacao', balanceUsd: 0 },
  { id: 'c-4', name: 'Servicios Gastronómicos del Ávila', rif: 'J-40987123-5', phone: '0412-5551234', address: 'Las Mercedes, Caracas', balanceUsd: 120.50 }
];

export default function ClientsView() {
  const data = useData();
  const rawClients = data?.clients && data.clients.length > 0 ? data.clients : DEFAULT_CLIENTS;

  const [clients, setClients] = useState(rawClients);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario nuevo cliente
  const [name, setName] = useState('');
  const [rifPrefix, setRifPrefix] = useState('V');
  const [rifNumber, setRifNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.rif && c.rif.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }, [clients, searchQuery]);

  const handleSaveClient = (e) => {
    e.preventDefault();
    if (!name.trim() || !rifNumber.trim()) return;

    const fullRif = `${rifPrefix}-${rifNumber.trim()}`;
    const newClient = {
      id: 'c-' + Date.now(),
      name: name.trim(),
      rif: fullRif,
      phone: phone.trim() || 'N/A',
      address: address.trim() || 'Venezuela',
      balanceUsd: 0
    };

    setClients([newClient, ...clients]);
    if (data?.saveClient) {
      data.saveClient(newClient);
    }

    setIsModalOpen(false);
    setName('');
    setRifNumber('');
    setPhone('');
    setAddress('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-y-auto">
      {/* HEADER NOTION */}
      <div className="bg-white border-b border-zinc-200/80 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
                <Users size={18} />
              </span>
              <h1 className="text-xl font-bold text-zinc-950 tracking-tight">Clientes & Crédito</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                {clients.length} registrados
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Directorio de clientes con RIF/Cédula, datos de contacto y cuentas por cobrar
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <Plus size={15} />
            <span>Nuevo Cliente</span>
          </button>
        </div>

        {/* BÚSQUEDA */}
        <div className="mt-4 pt-3 border-t border-zinc-100">
          <div className="relative max-w-sm w-full">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, RIF o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400"
            />
          </div>
        </div>
      </div>

      {/* TABLA NOTION DE CLIENTES */}
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50/80 text-zinc-500 font-semibold border-b border-zinc-100">
                <tr>
                  <th className="py-3 px-4">RIF / Cédula</th>
                  <th className="py-3 px-4">Nombre / Razón Social</th>
                  <th className="py-3 px-4">Teléfono</th>
                  <th className="py-3 px-4">Dirección Fiscal</th>
                  <th className="py-3 px-4 text-right">Saldo Deudor ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {filteredClients.map((c) => {
                  const hasDebt = Number(c.balanceUsd || 0) > 0;

                  return (
                    <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-zinc-950">{c.rif}</td>
                      <td className="py-3 px-4 font-semibold text-zinc-900">{c.name}</td>
                      <td className="py-3 px-4 text-zinc-500 font-mono">{c.phone}</td>
                      <td className="py-3 px-4 text-zinc-500 truncate max-w-xs">{c.address}</td>
                      <td className="py-3 px-4 text-right">
                        {hasDebt ? (
                          <span className="font-bold text-rose-600 font-mono">
                            ${Number(c.balanceUsd).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Solvente
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL CREAR CLIENTE */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-950 text-base">Registrar Nuevo Cliente</h3>
                <p className="text-xs text-zinc-500">Datos fiscales para facturación SENIAT</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Nombre o Razón Social</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Inversiones Ávila C.A."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">RIF / Cédula</label>
                <div className="flex gap-2">
                  <select
                    value={rifPrefix}
                    onChange={(e) => setRifPrefix(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold bg-zinc-50"
                  >
                    <option value="V">V-</option>
                    <option value="J">J-</option>
                    <option value="E">E-</option>
                    <option value="G">G-</option>
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="12345678-0"
                    value={rifNumber}
                    onChange={(e) => setRifNumber(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-xs font-mono font-bold focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="0414-1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Dirección Fiscal</label>
                  <input
                    type="text"
                    placeholder="Ciudad, Municipio"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-zinc-950 text-white font-bold hover:bg-zinc-800 transition-all cursor-pointer shadow-xs"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
