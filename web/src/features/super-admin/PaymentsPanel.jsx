import React, { useMemo, useState } from 'react';
import { approvePayment, rejectPayment } from './api';
import { CheckCircle2, XCircle, AlertTriangle, Search, Copy, Check, ExternalLink } from 'lucide-react';

function formatBs(val) {
  return 'Bs. ' + Number(val || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_FILTERS = [
  ['all', 'Todos'],
  ['pending', 'Pendientes'],
  ['approved', 'Aprobados'],
  ['rejected', 'Rechazados']
];

export default function PaymentsPanel({ payments, tenants, onChange, onError }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const tenantMap = useMemo(() => Object.fromEntries(tenants.map((t) => [t.id, t])), [tenants]);

  // Detección de referencias repetidas para alertar
  const duplicates = useMemo(() => {
    const seen = {};
    payments.forEach((p) => {
      const k = `${p.bank_origin}|${p.reference_last6}`;
      seen[k] = (seen[k] || 0) + 1;
    });
    return seen;
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!query.trim()) return true;
      const t = tenantMap[p.tenant_id];
      const haystack = `${t?.name || ''} ${p.tenant_name || ''} ${p.bank_origin || ''} ${p.phone_origin || ''} ${p.payer_doc || ''} ${p.reference_last6 || ''}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [payments, statusFilter, query, tenantMap]);

  const run = async (fn) => {
    try {
      await fn();
      await onChange();
    } catch (e) {
      onError(e.message);
    }
  };

  const reject = (p) => {
    const notes = window.prompt('Motivo del rechazo de la referencia bancaria (se mostrará al dueño):', 'Referencia no encontrada en Bancamiga');
    if (notes === null) return;
    run(() => rejectPayment(p.id, notes));
  };

  const copyRef = (id, ref) => {
    navigator.clipboard.writeText(String(ref || ''));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-4">
      {/* Barra de filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto text-xs">
          {STATUS_FILTERS.map(([key, label]) => {
            const count = key === 'all' ? payments.length : payments.filter((p) => p.status === key).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === key
                    ? 'bg-zinc-950 text-white shadow-2xs'
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
                }`}
              >
                <span>{label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusFilter === key ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar referencia, banco, restaurante..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-72 pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 shadow-2xs"
          />
        </div>
      </div>

      {/* Tabla de Pagos */}
      <div className="border border-zinc-200/90 rounded-2xl bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-500 uppercase text-[10px] font-bold tracking-wider">
                <th className="py-3 px-4">Fecha Reportado</th>
                <th className="py-3 px-4">Restaurante</th>
                <th className="py-3 px-4">Plan & Canal</th>
                <th className="py-3 px-4">Monto ($ / Bs)</th>
                <th className="py-3 px-4">Datos para Conciliar en Banco</th>
                <th className="py-3 px-4">Estatus</th>
                <th className="py-3 px-4 text-right">Validación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {filteredPayments.map((p) => {
                const isDuplicated = duplicates[`${p.bank_origin}|${p.reference_last6}`] > 1;
                const tenant = tenantMap[p.tenant_id];
                const isBinance = p.payment_method === 'binance' || /binance/i.test(p.bank_origin || '');
                const cleanWa = String(tenant?.phone || p.phone_origin || '').replace(/\D/g, '');
                const waUrl = cleanWa.length >= 10
                  ? `https://wa.me/${cleanWa.startsWith('58') ? cleanWa : '58' + cleanWa.replace(/^0/, '')}`
                  : null;

                return (
                  <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-zinc-950">
                        {new Date(p.created_at).toLocaleDateString('es-VE')}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {new Date(p.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <strong className="text-zinc-950 block">{tenant?.name || p.tenant_name}</strong>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-zinc-400 font-mono">{tenant?.rif || `ID: ${p.tenant_id?.slice(0, 8)}`}</span>
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-emerald-700 hover:underline font-semibold inline-flex items-center gap-0.5"
                            title="Escribir por WhatsApp al comercio"
                          >
                            <span>WhatsApp</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-900">
                        {p.plan === 'annual' ? 'Anual (+365d)' : 'Mensual (+30d)'}
                      </div>
                      <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        isBinance ? 'bg-amber-100 text-amber-900' : 'bg-sky-50 text-sky-800 border border-sky-200'
                      }`}>
                        {isBinance ? 'Binance Pay (USDT)' : 'Pago Móvil (Bs)'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-950 font-mono text-sm">
                        ${Number(p.amount_usd).toFixed(2)}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-mono font-semibold">
                        {formatBs(p.amount_bs)}
                      </div>
                      {p.rate_bcv && (
                        <div className="text-[10px] text-zinc-400 font-mono">
                          Tasa: {Number(p.rate_bcv).toFixed(2)} Bs/$
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-900">{p.bank_origin}</div>
                      <div className="text-[11px] text-zinc-500 flex flex-wrap items-center gap-x-2">
                        <span>Tel: <strong>{p.phone_origin}</strong></span>
                        {p.payer_doc && <span>· CI/RIF: <strong className="font-mono">{p.payer_doc}</strong></span>}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => copyRef(p.id, p.reference_last6)}
                          className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-mono font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          title="Copiar referencia"
                        >
                          <span>#{p.reference_last6}</span>
                          {copiedId === p.id ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} className="text-zinc-500" />}
                        </button>
                        {isDuplicated && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                            <AlertTriangle size={10} /> Ref Repetida
                          </span>
                        )}
                      </div>
                      {p.notes && (
                        <div className="text-[10px] text-red-600 font-medium mt-0.5">
                          Nota: {p.notes}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status === 'approved' ? 'Aprobado' : p.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {p.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => run(() => approvePayment(p.id))}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 size={13} />
                            <span>Aprobar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => reject(p)}
                            className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle size={13} />
                            <span>Rechazar</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-400">
                          {p.verified_by === 'api_auto' ? 'Auto API' : 'Procesado'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-zinc-400 text-xs">
                    No hay reportes de pago que coincidan con el filtro seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
