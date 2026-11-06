import { createClient } from '@supabase/supabase-js';

// Único cliente de Supabase de la web.
// Soporta tanto VITE_SUPABASE_URL como SUPABASE_URL (inyectada por la integración de Vercel)
const url =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL;

const anonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey && String(url).startsWith('https://'));

export const supabase = isConfigured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
