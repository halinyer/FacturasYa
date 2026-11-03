-- ============================================================================
-- FACTURASYA SaaS - ESQUEMA MULTI-EMPRESA (SUPABASE POSTGRESQL + REALTIME)
-- ============================================================================
-- Instrucciones:
-- 1. Entra a tu proyecto en https://supabase.com
-- 2. Ve al menú lateral "SQL Editor" -> "+ New query"
-- 3. Pega todo este contenido y haz clic en "Run" (Ctrl + Enter)
-- ============================================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLA DE CONFIGURACIÓN GLOBAL DEL SAAS (Datos de Pago Móvil y Planes)
CREATE TABLE IF NOT EXISTS public.saas_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  super_admin_emails TEXT[] DEFAULT ARRAY['admin@facturapos.com', 'halinyer@gmail.com'],
  monthly_price_usd NUMERIC(10,2) DEFAULT 30.00,
  annual_price_usd NUMERIC(10,2) DEFAULT 300.00,
  trial_days INT DEFAULT 14,
  pago_movil_bank TEXT DEFAULT '0172 - Bancamiga',
  pago_movil_rif_ci TEXT DEFAULT 'V-00000000',
  pago_movil_phone TEXT DEFAULT '0412-0000000',
  pago_movil_holder TEXT DEFAULT 'Halinyer - FacturasYa',
  binance_email TEXT DEFAULT '',
  support_whatsapp TEXT DEFAULT '+584120000000',
  auto_verify_provider TEXT DEFAULT 'manual', -- 'manual' | 'pabilo' | 'cobrix'
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.saas_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 2. TABLA DE RESTAURANTES / INQUILINOS (TENANTS)
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_email TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  rif TEXT DEFAULT 'J-00000000-0',
  phone TEXT DEFAULT '',
  plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial', 'monthly', 'annual')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'suspended')),
  valid_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  branding JSONB DEFAULT '{
    "logoText": "FacturaPOS",
    "primaryColor": "#D52829",
    "darkColor": "#0f172a"
  }'::jsonb,
  exchange_rate NUMERIC(12,4) DEFAULT 876.80,
  local_ip TEXT DEFAULT '',
  last_online_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE PAGOS DE SUSCRIPCIÓN (PAGO MÓVIL / BINANCE)
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_name TEXT,
  plan TEXT NOT NULL DEFAULT 'monthly' CHECK (plan IN ('monthly', 'annual')),
  days_to_add INT NOT NULL DEFAULT 30,
  amount_usd NUMERIC(10,2) NOT NULL,
  amount_bs NUMERIC(14,2) NOT NULL,
  rate_bcv NUMERIC(12,4) NOT NULL,
  bank_origin TEXT NOT NULL,
  phone_origin TEXT NOT NULL,
  reference_last6 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  verified_by TEXT DEFAULT 'pending', -- 'api_auto' | 'super_admin' | 'pending'
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

-- Índice para evitar que usen la misma referencia bancaria dos veces el mismo día
CREATE INDEX IF NOT EXISTS idx_sub_payments_ref ON public.subscription_payments (reference_last6, bank_origin);

-- 4. TABLA DE RESPALDO Y SINCRONIZACIÓN EN TIEMPO REAL DEL LOCAL (SNAPSHOT + MONITOR)
-- Almacena el estado sincronizado del POS para restaurar si se daña la PC y alimentar el Monitor del Dueño
CREATE TABLE IF NOT EXISTS public.tenant_snapshots (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  products JSONB DEFAULT '[]'::jsonb,
  clients JSONB DEFAULT '[]'::jsonb,
  invoices JSONB DEFAULT '[]'::jsonb,
  purchases JSONB DEFAULT '[]'::jsonb,
  payments JSONB DEFAULT '[]'::jsonb,
  cash_closes JSONB DEFAULT '[]'::jsonb,
  open_tabs JSONB DEFAULT '[]'::jsonb,
  expenses JSONB DEFAULT '[]'::jsonb,
  inventory JSONB DEFAULT '[]'::jsonb,
  inventory_logs JSONB DEFAULT '[]'::jsonb,
  z_reports JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  exchange_rate NUMERIC(12,4) DEFAULT 876.80,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FUNCIÓN RPC PARA APROBAR UN PAGO Y EXTENDER LA SUSCRIPCIÓN AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION public.approve_subscription_payment(
  p_payment_id UUID,
  p_verified_by TEXT DEFAULT 'super_admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment public.subscription_payments%ROWTYPE;
  v_tenant public.tenants%ROWTYPE;
  v_base_date TIMESTAMPTZ;
  v_new_valid_until TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_payment FROM public.subscription_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pago no encontrado');
  END IF;

  IF v_payment.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este pago ya fue aprobado anteriormente');
  END IF;

  SELECT * INTO v_tenant FROM public.tenants WHERE id = v_payment.tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Restaurante no encontrado');
  END IF;

  -- Si la suscripción ya estaba vencida, sumamos desde HOY. Si aún tenía días vigentes, se los sumamos a su fecha actual.
  IF v_tenant.valid_until IS NULL OR v_tenant.valid_until < NOW() THEN
    v_base_date := NOW();
  ELSE
    v_base_date := v_tenant.valid_until;
  END IF;

  v_new_valid_until := v_base_date + (v_payment.days_to_add || ' days')::INTERVAL;

  -- 1. Marcar pago como aprobado
  UPDATE public.subscription_payments
  SET status = 'approved',
      verified_by = p_verified_by,
      verified_at = NOW()
  WHERE id = p_payment_id;

  -- 2. Actualizar restaurante (Activar y extender fecha de corte)
  UPDATE public.tenants
  SET status = 'active',
      plan = v_payment.plan,
      valid_until = v_new_valid_until,
      updated_at = NOW()
  WHERE id = v_payment.tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_payment.tenant_id,
    'new_valid_until', v_new_valid_until
  );
END;
$$;

-- 6. TRIGGER AUTOMÁTICO: CREAR TENANT CON 14 DÍAS DE PRUEBA AL REGISTRARSE EN SUPABASE AUTH
CREATE OR REPLACE FUNCTION public.handle_new_user_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_business_name TEXT;
  v_rif TEXT;
  v_phone TEXT;
  v_new_tenant_id UUID;
BEGIN
  v_business_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'Mi Restaurante');
  v_rif := COALESCE(NEW.raw_user_meta_data->>'rif', 'J-00000000-0');
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');

  INSERT INTO public.tenants (
    owner_id,
    owner_email,
    name,
    slug,
    rif,
    phone,
    plan,
    status,
    valid_until
  ) VALUES (
    NEW.id,
    NEW.email,
    v_business_name,
    LOWER(REGEXP_REPLACE(v_business_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(NEW.id::TEXT, 1, 4),
    v_rif,
    v_phone,
    'trial',
    'active',
    NOW() + INTERVAL '14 days'
  )
  ON CONFLICT (owner_email) DO UPDATE
  SET owner_id = EXCLUDED.owner_id
  RETURNING id INTO v_new_tenant_id;

  INSERT INTO public.tenant_snapshots (tenant_id)
  VALUES (v_new_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_tenant();

-- 7. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY)
ALTER TABLE public.saas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_snapshots ENABLE ROW LEVEL SECURITY;

-- Lectura pública de configuración de planes y datos de Pago Móvil
DROP POLICY IF EXISTS "Lectura publica de saas_config" ON public.saas_config;
CREATE POLICY "Lectura publica de saas_config" ON public.saas_config
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Escritura saas_config autenticados" ON public.saas_config;
CREATE POLICY "Escritura saas_config autenticados" ON public.saas_config
  FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para tenants
DROP POLICY IF EXISTS "Acceso a tenants para usuarios autenticados" ON public.tenants;
CREATE POLICY "Acceso a tenants para usuarios autenticados" ON public.tenants
  FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para pagos de suscripción
DROP POLICY IF EXISTS "Acceso a pagos para usuarios autenticados" ON public.subscription_payments;
CREATE POLICY "Acceso a pagos para usuarios autenticados" ON public.subscription_payments
  FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para snapshots de restaurante
DROP POLICY IF EXISTS "Acceso a snapshots para usuarios autenticados" ON public.tenant_snapshots;
CREATE POLICY "Acceso a snapshots para usuarios autenticados" ON public.tenant_snapshots
  FOR ALL USING (auth.role() = 'authenticated');

-- 8. ACTIVAR TIEMPO REAL (SUPABASE REALTIME)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_payments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_snapshots;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
