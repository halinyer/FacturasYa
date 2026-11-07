import React, { useEffect, useState } from 'react';
import { saveConfig } from './api';
import { Check, Save, Smartphone, CreditCard, ShieldCheck } from 'lucide-react';

const FIELDS = [
  ['monthly_price_usd', 'Precio Plan Mensual ($ USD)', 'number', '30.00'],
  ['annual_price_usd', 'Precio Plan Anual ($ USD)', 'number', '300.00'],
  ['bcv_rate', 'Tasa BCV Referencial (Bs/$)', 'number', '876.80'],
  ['trial_days', 'Días de Prueba Gratis', 'number', '14'],
  ['pago_movil_bank', 'Banco Receptor de Pago Móvil', 'text', '0172 - Bancamiga'],
  ['pago_movil_rif_ci', 'Cédula / RIF del Titular (V- / J-)', 'text', 'V-00000000'],
  ['pago_movil_phone', 'Teléfono Receptor Pago Móvil', 'text', '0412-0000000'],
  ['pago_movil_holder', 'Nombre del Titular / Concepto', 'text', 'FacturasYa - Cobranzas'],
  ['binance_email', 'Correo / ID para Binance Pay (USDT)', 'text', 'pagos@facturasya.com'],
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

  const monthlyUsd = Number(form.monthly_price_usd || 30);
  const annualUsd = Number(form.annual_price_usd || 300);
  const bcvRate = Number(form.bcv_rate || 876.8);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <form onSubmit={submit} className="lg:col-span-2 p-6 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs space-y-6">
        <div className="border-b border-zinc-100 pb-4">
          <h3 className="text-base font-bold text-zinc-950">Precios y Datos Bancarios Receptores (Bancamiga / Binance)</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Estos datos se muestran en tiempo real a todos los dueños de restaurantes y gobiernan la validación de precios en el servidor.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-xs">
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

          <div className="space-y-1 sm:col-span-2">
            <label className="block text-zinc-700 font-semibold">Modo de Verificación de Pagos Móviles</label>
            <select
              value={form.auto_verify_provider || 'manual'}
              onChange={(e) => setForm({ ...form, auto_verify_provider: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/50 text-zinc-900 focus:outline-none focus:border-zinc-950 font-medium"
            >
              <option value="manual">Fase 1: Cuenta Personal P2P + Aprobación 1-Clic con Pase de Cortesía 24h</option>
              <option value="pabilo">Fase 2: Pabilo API (Verificación Automática Bancamiga / Banesco)</option>
              <option value="cobrix">Fase 2: Cobrix API (Verificación Automática BDV / BNC)</option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Los precios tienen autoridad en el servidor (PostgreSQL + Edge Function).
          </span>

          <button
            type="submit"
            disabled={saving}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
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

      {/* Vista previa del Checkout para el cliente */}
      <div className="p-6 rounded-2xl bg-zinc-950 text-white space-y-4 self-start shadow-md">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              Vista Previa en Vivo
            </span>
            <h4 className="text-sm font-bold">Así ve el Checkout el Restaurante</h4>
          </div>
          <ShieldCheck size={18} className="text-emerald-400" />
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Smartphone size={14} />
            <span>Pago Móvil Receptor</span>
          </div>
          <div className="space-y-1 text-zinc-300">
            <div className="flex justify-between">
              <span className="text-zinc-500">Banco:</span>
              <strong className="text-white">{form.pago_movil_bank || '0172 - Bancamiga'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Teléfono:</span>
              <strong className="font-mono text-white">{form.pago_movil_phone || '0412-0000000'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Cédula / RIF:</span>
              <strong className="font-mono text-white">{form.pago_movil_rif_ci || 'V-00000000'}</strong>
            </div>
            <div className="flex justify-between pt-1 border-t border-zinc-800">
              <span className="text-zinc-400">Mensual (${monthlyUsd}):</span>
              <strong className="font-mono text-emerald-400">
                Bs. {(monthlyUsd * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Anual (${annualUsd}):</span>
              <strong className="font-mono text-emerald-400">
                Bs. {(annualUsd * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <CreditCard size={14} />
            <span>Binance Pay (USDT)</span>
          </div>
          <div className="flex justify-between text-zinc-300">
            <span className="text-zinc-500">Correo / ID:</span>
            <strong className="font-mono text-white">{form.binance_email || 'No configurado'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
