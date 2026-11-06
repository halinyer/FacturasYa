import React, { useEffect, useState } from 'react';
import { saveConfig } from './api';
import { Check, Settings, Save } from 'lucide-react';

const FIELDS = [
  ['monthly_price_usd', 'Precio Plan Mensual ($ USD)', 'number', '30.00'],
  ['annual_price_usd', 'Precio Plan Anual ($ USD)', 'number', '300.00'],
  ['trial_days', 'Días de Prueba Gratis', 'number', '14'],
  ['pago_movil_bank', 'Banco Receptor de Pago Móvil', 'text', '0172 - Bancamiga'],
  ['pago_movil_rif_ci', 'Cédula / RIF del Titular', 'text', 'V-00000000'],
  ['pago_movil_phone', 'Teléfono Receptor Pago Móvil', 'text', '0412-0000000'],
  ['pago_movil_holder', 'Nombre del Titular de la Cuenta', 'text', 'FacturasYa - Cobranzas'],
  ['binance_email', 'Correo para Binance Pay (Opcional)', 'text', 'pagos@facturasya.com'],
  ['support_whatsapp', 'WhatsApp de Soporte para Clientes', 'text', '+584120000000']
];

export default function ConfigPanel({ config, onChange, onError }) {
  const [form, setForm] = useState(config);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setForm(config), [config]);

  if (!form) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveConfig(form);
      await onChange();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-6 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs space-y-6">
      <div className="border-b border-zinc-100 pb-4">
        <h3 className="text-base font-bold text-zinc-950">Precios y Datos Bancarios Receptores</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Estos datos se muestran dinámicamente a todos los dueños de restaurantes en su pantalla de Pago Móvil.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {FIELDS.map(([key, label, type, placeholder]) => (
          <div key={key} className="space-y-1">
            <label className="block text-zinc-700 font-semibold">{label}</label>
            <input
              type={type}
              step={type === 'number' ? '0.01' : undefined}
              placeholder={placeholder}
              value={form[key] ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  [key]: type === 'number' ? Number(e.target.value) : e.target.value
                })
              }
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/50 text-zinc-900 focus:outline-none focus:border-zinc-950 font-medium"
            />
          </div>
        ))}

        <div className="space-y-1">
          <label className="block text-zinc-700 font-semibold">Modo de Verificación de Pagos</label>
          <select
            value={form.auto_verify_provider || 'manual'}
            onChange={(e) => setForm({ ...form, auto_verify_provider: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/50 text-zinc-900 focus:outline-none focus:border-zinc-950 font-medium"
          >
            <option value="manual">Manual (Aprobación por Super Admin)</option>
            <option value="pabilo">Pabilo API (Automático Bancamiga/Banesco)</option>
            <option value="cobrix">Cobrix API (Automático Venezuela/BNC)</option>
          </select>
        </div>
      </div>

      <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          Los cambios se sincronizan en tiempo real con todos los clientes.
        </span>

        <button
          type="submit"
          disabled={saving}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 ${
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-zinc-950 text-white hover:bg-zinc-800'
          }`}
        >
          {saved ? <Check size={14} /> : <Save size={14} />}
          <span>{saved ? 'Cambios Guardados' : saving ? 'Guardando...' : 'Guardar Cambios'}</span>
        </button>
      </div>
    </form>
  );
}
