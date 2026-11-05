import { createClient } from '@supabase/supabase-js';

// Lee las credenciales desde variables de entorno (.env) o desde configuración guardada en la app
const getStoredCreds = () => {
  try {
    const raw = localStorage.getItem('saas_supabase_creds');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
};

const stored = getStoredCreds();
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || stored?.url || '';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  stored?.anonKey ||
  '';

export const isSupabaseConfigured = () => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('https://'));
};

export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export const saveSupabaseCreds = (url, anonKey) => {
  localStorage.setItem(
    'saas_supabase_creds',
    JSON.stringify({ url: (url || '').trim(), anonKey: (anonKey || '').trim() })
  );
  window.location.reload();
};

// Configuración por defecto de tus planes y Pago Móvil receptor
export const DEFAULT_SAAS_CONFIG = {
  id: 1,
  monthly_price_usd: 30.00,
  annual_price_usd: 300.00,
  trial_days: 14,
  pago_movil_bank: '0172 - Bancamiga',
  pago_movil_rif_ci: 'V-00000000',
  pago_movil_phone: '0412-0000000',
  pago_movil_holder: 'Halinyer - FacturasYa',
  binance_email: 'pagos@facturapos.com',
  support_whatsapp: '+584120000000',
  auto_verify_provider: 'manual'
};
