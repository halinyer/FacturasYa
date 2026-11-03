import React, { useMemo } from 'react';

export default function AuditPanel({ audit, tenants }) {
  const names = useMemo(() => Object.fromEntries(tenants.map((t) => [t.id, t.name])), [tenants]);

  return (
    <div className="card table-wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Quién</th><th>Acción</th><th>Restaurante</th><th>Detalle</th></tr></thead>
        <tbody>
          {audit.map((a) => (
            <tr key={a.id}>
              <td>{new Date(a.created_at).toLocaleString('es-VE')}</td>
              <td>{a.actor}</td>
              <td>{a.action}</td>
              <td>{names[a.tenant_id] || '—'}</td>
              <td><small>{JSON.stringify(a.details)}</small></td>
            </tr>
          ))}
          {audit.length === 0 && <tr><td colSpan="5" className="empty">Sin movimientos</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
