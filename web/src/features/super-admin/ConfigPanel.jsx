import React, { useEffect, useState } from 'react';
import { saveConfig } from './api';

const FIELDS = [
  ['monthly_price_usd', 'Plan mensual (USD)', 'number'],
  ['annual_price_usd', 'Plan anual (USD)', 'number'],
  ['trial_days', 'Días de prueba', 'number'],
  ['pago_movil_bank', 'Banco receptor', 'text'],
  ['pago_movil_rif_ci', 'Cédula / RIF', 'text'],
  ['pago_movil_phone', 'Teléfono Pago Móvil', 'text'],
  ['pago_movil_holder', 'Titular', 'text'],
  ['binance_email', 'Correo Binance (opcional)', 'text'],
  ['support_whatsapp', 'WhatsApp de soporte', 'text']
];

export default function ConfigPanel({ config, onChange, onError }) {
  const [form, setForm] = useState(config);
  const [saved, setSaved] = useState(false);

  useEffect(() => setForm(config), [config]);

  if (!form) return null;

  const submit = async (e) => {
    e.preventDefault();
    try {
      await saveConfig(form);
      await onChange();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <form className="card config" onSubmit={submit}>
      <h3>Datos de cobro y precios</h3>
      <div className="grid">
        {FIELDS.map(([key, label, type]) => (
          <label key={key}>
            <span>{label}</span>
            <input
              type={type}
              step={type === 'number' ? '0.01' : undefined}
              value={form[key] ?? ''}
              onChange={(e) => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
            />
          </label>
        ))}
        <label>
          <span>Verificación de pagos</span>
          <select value={form.auto_verify_provider} onChange={(e) => setForm({ ...form, auto_verify_provider: e.target.value })}>
            <option value="manual">Manual (apruebo yo)</option>
            <option value="pabilo">Pabilo (API)</option>
            <option value="cobrix">Cobrix (API)</option>
          </select>
        </label>
      </div>
      <button className="btn primary">{saved ? '✓ Guardado' : 'Guardar cambios'}</button>
    </form>
  );
}
