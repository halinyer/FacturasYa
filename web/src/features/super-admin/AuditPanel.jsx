import React, { useMemo } from 'react';
import { ShieldAlert } from 'lucide-react';

export default function AuditPanel({ audit, tenants }) {
  const names = useMemo(() => Object.fromEntries(tenants.map((t) => [t.id, t.name])), [tenants]);

  return (
    <div className="border border-zinc-200/90 rounded-2xl bg-white shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-500 uppercase text-[10px] font-bold tracking-wider">
              <th className="py-3 px-4">Fecha & Hora</th>
              <th className="py-3 px-4">Operador</th>
              <th className="py-3 px-4">Acción Realizada</th>
              <th className="py-3 px-4">Restaurante Afectado</th>
              <th className="py-3 px-4">Detalles JSON</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-zinc-700">
            {audit.map((a) => (
              <tr key={a.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="py-3 px-4 whitespace-nowrap text-zinc-950 font-mono">
                  {new Date(a.created_at).toLocaleString('es-VE')}
                </td>
                <td className="py-3 px-4 font-semibold text-zinc-900">{a.actor}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 font-mono font-bold text-[10px]">
                    {a.action}
                  </span>
                </td>
                <td className="py-3 px-4 font-medium text-zinc-900">{names[a.tenant_id] || a.tenant_id || '—'}</td>
                <td className="py-3 px-4 font-mono text-[11px] text-zinc-500 max-w-xs truncate">
                  {JSON.stringify(a.details)}
                </td>
              </tr>
            ))}
            {audit.length === 0 && (
              <tr>
                <td colSpan="5" className="py-8 text-center text-zinc-400 text-xs">
                  No hay movimientos administrativos registrados aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
