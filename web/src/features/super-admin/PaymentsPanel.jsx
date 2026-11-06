import React, { useMemo } from 'react';
import { approvePayment, rejectPayment } from './api';
import { CheckCircle2, XCircle, AlertTriangle, Phone, Building } from 'lucide-react';

function formatBs(val) {
  return 'Bs. ' + Number(val || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PaymentsPanel({ payments, tenants, onChange, onError }) {
  const names = useMemo(() => Object.fromEntries(tenants.map((t) => [t.id, t.name])), [tenants]);

  // Detección de referencias repetidas para alertar
  const duplicates = useMemo(() => {
    const seen = {};
    payments.forEach((p) => {
      const k = `${p.bank_origin}|${p.reference_last6}`;
      seen[k] = (seen[k] || 0) + 1;
    });
    return seen;
  }, [payments]);

  const run = async (fn) => {
    try {
      await fn();
      await onChange();
    } catch (e) {
      onError(e.message);
    }
  };

  const reject = (p) => {
    const notes = window.prompt('Motivo del rechazo de la referencia bancaria (opcional):', '');
    if (notes === null) return;
    run(() => rejectPayment(p.id, notes));
  };

  return (
    <div className="border border-zinc-200/90 rounded-2xl bg-white shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-500 uppercase text-[10px] font-bold tracking-wider">
              <th className="py-3 px-4">Fecha Reportado</th>
              <th className="py-3 px-4">Restaurante</th>
              <th className="py-3 px-4">Plan Solicitado</th>
              <th className="py-3 px-4">Monto ($ / Bs)</th>
              <th className="py-3 px-4">Datos del Pago Móvil</th>
              <th className="py-3 px-4">Estatus</th>
              <th className="py-3 px-4 text-right">Validación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-zinc-700">
            {payments.map((p) => {
              const isDuplicated = duplicates[`${p.bank_origin}|${p.reference_last6}`] > 1;
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
                    <strong className="text-zinc-950 block">{names[p.tenant_id] || p.tenant_name}</strong>
                    <span className="text-[11px] text-zinc-400 font-mono">ID: {p.tenant_id?.slice(0, 8)}...</span>
                  </td>

                  <td className="py-3 px-4 capitalize font-semibold text-zinc-900">
                    {p.plan === 'annual' ? 'Anual (+365d)' : 'Mensual (+30d)'}
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-zinc-950 font-mono text-sm">
                      ${Number(p.amount_usd).toFixed(2)}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      {formatBs(p.amount_bs)}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-zinc-900">{p.bank_origin}</div>
                    <div className="text-[11px] text-zinc-500">
                      Tel: <strong>{p.phone_origin}</strong> · Ref: <strong className="font-mono text-zinc-950">#{p.reference_last6}</strong>
                    </div>
                    {isDuplicated && (
                      <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                        <AlertTriangle size={10} /> Ref Repetida
                      </span>
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
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1"
                        >
                          <CheckCircle2 size={13} />
                          <span>Aprobar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => reject(p)}
                          className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-all flex items-center gap-1"
                        >
                          <XCircle size={13} />
                          <span>Rechazar</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-zinc-400">Procesado</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {payments.length === 0 && (
              <tr>
                <td colSpan="7" className="py-8 text-center text-zinc-400 text-xs">
                  No hay reportes de pago móvil registrados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
