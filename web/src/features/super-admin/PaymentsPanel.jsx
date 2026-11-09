import React, { useMemo, useState } from 'react';
import { approvePayment, rejectPayment, updatePaymentDetails } from './api';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  Image as ImageIcon,
  MessageCircle,
  Maximize2,
  Save,
  HelpCircle,
  X
} from 'lucide-react';

function formatBs(val) {
  return 'Bs. ' + Number(val || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_FILTERS = [
  ['all', 'Todos'],
  ['pending', 'Pendientes'],
  ['approved', 'Aprobados'],
  ['rejected', 'Rechazados']
];

const REJECTION_REASONS = [
  'Referencia bancaria no encontrada en el extracto receptor',
  'Monto transferido no coincide con el costo del plan',
  'Comprobante / Capture de pantalla ilegible o incompleto',
  'Referencia bancaria repetida o ya conciliada anteriormente',
  'Otro motivo...'
];

const VENEZUELA_BANKS = [
  '0102 - Banco de Venezuela',
  '0108 - Banco Provincial (BBVA)',
  '0134 - Banesco',
  '0105 - Banco Mercantil',
  '0172 - Bancamiga',
  '0114 - Bancaribe',
  '0116 - Banco Occidental de Descuento (BNC)',
  '0175 - Banco Bicentenario',
  '0163 - Banco del Tesoro',
  '0151 - Banco Fondo Común (BFC)',
  '0169 - Banco Mi Banco',
  '0171 - Banco Activo',
  '0174 - Banplus',
  '0177 - Banco de la Fuerza Armada (BANFANB)',
  '0191 - Banco Nacional de Crédito (BNC)'
];

export default function PaymentsPanel({ payments, tenants, onChange, onError }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Modales de soporte y corrección
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [rejectingPayment, setRejectingPayment] = useState(null);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);
  const [rejectionCustomText, setRejectionCustomText] = useState('');
  const [openWhatsAppOnReject, setOpenWhatsAppOnReject] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const tenantMap = useMemo(() => Object.fromEntries(tenants.map((t) => [t.id, t])), [tenants]);

  // Detección de referencias repetidas para alertar al admin
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

  const copyRef = (id, ref) => {
    navigator.clipboard.writeText(String(ref || ''));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Abre el modal para corregir typo del cliente en la referencia
  const startEditPayment = (p) => {
    setEditingPayment({
      id: p.id,
      tenantId: p.tenant_id,
      tenantName: tenantMap[p.tenant_id]?.name || p.tenant_name,
      referenceLast6: p.reference_last6,
      bankOrigin: p.bank_origin,
      phoneOrigin: p.phone_origin,
      payerDoc: p.payer_doc || '',
      receiptUrl: p.receipt_url || '',
      notes: p.notes || ''
    });
  };

  const savePaymentEdit = async (andApprove = false) => {
    if (!editingPayment) return;
    setSavingEdit(true);
    try {
      await updatePaymentDetails(editingPayment.id, {
        newReference: editingPayment.referenceLast6,
        newBank: editingPayment.bankOrigin,
        newPhone: editingPayment.phoneOrigin,
        newPayerDoc: editingPayment.payerDoc,
        notes: editingPayment.notes
      });

      if (andApprove) {
        await approvePayment(editingPayment.id);
      }

      await onChange();
      setEditingPayment(null);
    } catch (e) {
      onError(e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Confirmación de rechazo pedagógico con opción de WhatsApp
  const confirmRejection = async () => {
    if (!rejectingPayment) return;
    const finalReason = rejectionReason === 'Otro motivo...' ? rejectionCustomText.trim() : rejectionReason;
    if (!finalReason) {
      onError('Por favor especifica el motivo del rechazo');
      return;
    }

    try {
      await rejectPayment(rejectingPayment.id, finalReason);

      if (openWhatsAppOnReject) {
        const tenant = tenantMap[rejectingPayment.tenant_id];
        const cleanWa = String(tenant?.phone || rejectingPayment.phone_origin || '').replace(/\D/g, '');
        if (cleanWa.length >= 10) {
          const intlPhone = cleanWa.startsWith('58') ? cleanWa : '58' + cleanWa.replace(/^0/, '');
          const message = `Hola ${tenant?.name || 'estimado cliente'}, te escribimos del Soporte de FacturasYa sobre tu reporte de Pago Móvil por Bs. ${Number(rejectingPayment.amount_bs || 0).toLocaleString('es-VE')} (Ref: #${rejectingPayment.reference_last6}).\n\nDetalle: ${finalReason}.\n\nPor favor envíanos tu capture de pantalla por aquí para asistirte de inmediato y activar tu servicio.`;
          window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`, '_blank');
        }
      }

      await onChange();
      setRejectingPayment(null);
    } catch (e) {
      onError(e.message);
    }
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
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Comprobante</th>
                <th className="py-3 px-4">Restaurante</th>
                <th className="py-3 px-4">Plan & Canal</th>
                <th className="py-3 px-4">Monto ($ / Bs)</th>
                <th className="py-3 px-4">Datos Conciliación Bancaria</th>
                <th className="py-3 px-4">Estatus</th>
                <th className="py-3 px-4 text-right">Acciones de Soporte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {filteredPayments.map((p) => {
                const isDuplicated = duplicates[`${p.bank_origin}|${p.reference_last6}`] > 1;
                const tenant = tenantMap[p.tenant_id];
                const isBinance = p.payment_method === 'binance' || /binance/i.test(p.bank_origin || '');
                const cleanWa = String(tenant?.phone || p.phone_origin || '').replace(/\D/g, '');
                const waUrl = cleanWa.length >= 10
                  ? `https://wa.me/${cleanWa.startsWith('58') ? cleanWa : '58' + cleanWa.replace(/^0/, '')}?text=${encodeURIComponent(
                      `Hola ${tenant?.name || 'estimado cliente'}, te escribimos de FacturasYa respecto a tu pago de suscripción (Ref: #${p.reference_last6}).`
                    )}`
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

                    {/* Columna Comprobante / Screenshot */}
                    <td className="py-3 px-4">
                      {p.receipt_url ? (
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(p.receipt_url)}
                          className="group relative w-12 h-12 rounded-lg border border-zinc-200 overflow-hidden bg-zinc-100 block hover:ring-2 hover:ring-zinc-900 transition-all cursor-pointer"
                          title="Clic para ver capture en alta resolución"
                        >
                          <img src={p.receipt_url} alt="Capture" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-zinc-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Maximize2 size={12} />
                          </div>
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-mono italic">Sin capture</span>
                      )}
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
                            <MessageCircle size={10} />
                            <span>WhatsApp</span>
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

                    {/* Datos para conciliar con el banco receptor */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-900">{p.bank_origin}</div>
                      <div className="text-[11px] text-zinc-500 flex flex-wrap items-center gap-x-2">
                        <span>Tel: <strong>{p.phone_origin}</strong></span>
                        {p.payer_doc && <span>· CI/RIF: <strong className="font-mono">{p.payer_doc}</strong></span>}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => copyRef(p.id, p.reference_last6)}
                          className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-mono font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          title="Copiar referencia"
                        >
                          <span>#{p.reference_last6}</span>
                          {copiedId === p.id ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} className="text-zinc-500" />}
                        </button>

                        {/* Botón para Corregir Referencia / Typo del Cliente */}
                        <button
                          type="button"
                          onClick={() => startEditPayment(p)}
                          className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 inline-flex items-center gap-0.5 cursor-pointer"
                          title="Corregir si el cliente se equivocó al escribir la referencia"
                        >
                          <Edit3 size={10} />
                          <span>Corregir Typo</span>
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
                            onClick={() => {
                              setRejectingPayment(p);
                              setRejectionReason(REJECTION_REASONS[0]);
                              setRejectionCustomText('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle size={13} />
                            <span>Rechazar</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEditPayment(p)}
                            className="text-[11px] text-zinc-500 hover:text-zinc-950 font-medium hover:underline inline-flex items-center gap-1"
                          >
                            <Edit3 size={11} />
                            <span>Editar datos</span>
                          </button>
                          <span className="text-[10px] text-zinc-300">·</span>
                          <span className="text-[11px] text-zinc-400">
                            {p.verified_by === 'api_auto' ? 'Auto API' : 'Procesado'}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-zinc-400 text-xs">
                    No hay reportes de pago que coincidan con el filtro seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: VISOR LIGHTBOX DE COMPROBANTE EN ALTA RESOLUCIÓN */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 z-60 bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="relative max-w-xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 border-b border-zinc-100">
              <span className="text-xs font-bold text-zinc-900">Comprobante de Pago Móvil</span>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center bg-zinc-900/5 rounded-lg">
              <img
                src={selectedReceipt}
                alt="Comprobante en Alta Resolución"
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-xs"
              />
            </div>
            <div className="p-2 border-t border-zinc-100 flex justify-end">
              <a
                href={selectedReceipt}
                target="_blank"
                rel="noreferrer"
                download="comprobante-pago.jpg"
                className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 flex items-center gap-1"
              >
                <span>Abrir en pestaña nueva</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CORREGIR TYPO DEL CLIENTE EN LA REFERENCIA */}
      {editingPayment && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setEditingPayment(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-zinc-950 flex items-center gap-1.5">
                  <Edit3 size={15} className="text-amber-600" />
                  <span>Corregir Datos del Pago ({editingPayment.tenantName})</span>
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Usa esta herramienta si el cliente cometió un typo al transcribir su referencia bancaria.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Vista previa miniatura del capture si existe */}
            {editingPayment.receiptUrl && (
              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center gap-3">
                <img
                  src={editingPayment.receiptUrl}
                  alt="Capture"
                  className="w-16 h-16 rounded object-cover border border-zinc-200 cursor-pointer"
                  onClick={() => setSelectedReceipt(editingPayment.receiptUrl)}
                  title="Clic para ampliar comprobante"
                />
                <div className="text-xs">
                  <span className="font-bold text-zinc-900 block">Comprobante adjunto por el cliente</span>
                  <span className="text-[11px] text-zinc-500">
                    Inspecciona la imagen a la izquierda para copiar la referencia exacta del banco.
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-700 font-bold mb-1">Referencia Bancaria Corregida *</label>
                <input
                  type="text"
                  maxLength={12}
                  value={editingPayment.referenceLast6}
                  onChange={(e) => setEditingPayment({ ...editingPayment, referenceLast6: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 font-mono font-bold text-sm text-zinc-950 bg-amber-50/40 focus:bg-white"
                />
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  Escribe los últimos dígitos numéricos reales que aparecen en el capture.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-bold mb-1">Banco Emisor</label>
                  <select
                    value={editingPayment.bankOrigin}
                    onChange={(e) => setEditingPayment({ ...editingPayment, bankOrigin: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-xs bg-white"
                  >
                    {VENEZUELA_BANKS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-700 font-bold mb-1">Teléfono Emisor</label>
                  <input
                    type="text"
                    value={editingPayment.phoneOrigin}
                    onChange={(e) => setEditingPayment({ ...editingPayment, phoneOrigin: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 font-bold mb-1">Notas de Auditoría / Corrección</label>
                <input
                  type="text"
                  placeholder="Ej: Corregido dígito 0 por 1 según capture Bancamiga"
                  value={editingPayment.notes}
                  onChange={(e) => setEditingPayment({ ...editingPayment, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-xs"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-semibold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => savePaymentEdit(false)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save size={13} />
                  <span>Solo Guardar</span>
                </button>
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => savePaymentEdit(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <CheckCircle2 size={13} />
                  <span>Guardar y Aprobar →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RECHAZO PEDAGÓGICO CON NOTIFICACIÓN POR WHATSAPP */}
      {rejectingPayment && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setRejectingPayment(null)}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-red-700 flex items-center gap-1.5">
                  <XCircle size={15} />
                  <span>Rechazar Reporte de Pago (#{rejectingPayment.reference_last6})</span>
                </h3>
                <p className="text-[11px] text-zinc-500">
                  El cliente verá el motivo en su pantalla para que pueda corregirlo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectingPayment(null)}
                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-700 font-bold mb-1.5">Selecciona el Motivo del Rechazo:</label>
                <div className="space-y-2">
                  {REJECTION_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        rejectionReason === reason
                          ? 'border-red-400 bg-red-50/50 text-red-950 font-semibold'
                          : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rejectionReason"
                        value={reason}
                        checked={rejectionReason === reason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="mt-0.5"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {rejectionReason === 'Otro motivo...' && (
                <div>
                  <label className="block text-zinc-700 font-bold mb-1">Escribe el Motivo Personalizado:</label>
                  <textarea
                    rows={2}
                    value={rejectionCustomText}
                    onChange={(e) => setRejectionCustomText(e.target.value)}
                    placeholder="Describe claramente por qué no se pudo conciliar el pago..."
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-xs"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-zinc-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={openWhatsAppOnReject}
                    onChange={(e) => setOpenWhatsAppOnReject(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Abrir chat de WhatsApp con el cliente para explicarle el motivo</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingPayment(null)}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-semibold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmRejection}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <XCircle size={13} />
                <span>Confirmar Rechazo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
