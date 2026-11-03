import React, { useMemo } from 'react';
import { approvePayment, rejectPayment } from './api';

export default function PaymentsPanel({ payments, tenants, onChange, onError }) {
  const names = useMemo(() => Object.fromEntries(tenants.map((t) => [t.id, t.name])), [tenants]);

  // Referencias repetidas (mismo banco + referencia) para alertar de posibles duplicados
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
    const notes = window.prompt('Motivo del rechazo (opcional):', '');
    if (notes === null) return;
    run(() => rejectPayment(p.id, notes));
  };

  return (
    <div className="card table-wrap">
      <table>
        <thead>
          <tr><th>Fecha</th><th>Restaurante</th><th>Plan</th><th>Monto</th><th>Pago Móvil</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td>{new Date(p.created_at).toLocaleString('es-VE')}</td>
              <td>{names[p.tenant_id] || p.tenant_name}</td>
              <td>{p.plan}</td>
              <td>${Number(p.amount_usd).toFixed(2)}<br /><small>Bs {Number(p.amount_bs).toLocaleString('es-VE')}</small></td>
              <td>
                {p.bank_origin} · {p.phone_origin}<br />
                <small>Ref. {p.reference_last6}</small>
                {duplicates[`${p.bank_origin}|${p.reference_last6}`] > 1 && <span className="badge red">Duplicada</span>}
              </td>
              <td><span className={`badge ${p.status === 'approved' ? 'green' : p.status === 'rejected' ? 'red' : 'amber'}`}>{p.status}</span></td>
              <td className="actions">
                {p.status === 'pending' && (
                  <>
                    <button className="btn primary" onClick={() => run(() => approvePayment(p.id))}>Aprobar</button>
                    <button className="btn danger" onClick={() => reject(p)}>Rechazar</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {payments.length === 0 && <tr><td colSpan="7" className="empty">No hay pagos reportados</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
