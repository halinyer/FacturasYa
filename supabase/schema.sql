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
SET search_path = public
AS $$
DECLARE
  v_payment public.subscription_payments%ROWTYPE;
  v_tenant public.tenants%ROWTYPE;
  v_base_date TIMESTAMPTZ;
  v_new_valid_until TIMESTAMPTZ;
BEGIN
  PERFORM public.require_admin_or_service();
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

  PERFORM public.log_admin_action('approve_payment', v_payment.tenant_id, jsonb_build_object('payment_id', p_payment_id, 'verified_by', p_verified_by));

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_payment.tenant_id,
    'new_valid_until', v_new_valid_until
  );
END;
$$;

-- 5.B FUNCIÓN RPC DE AUTORIDAD DE TIEMPO EN EL SERVIDOR (PREVIENE TRAMPA DE RELOJ EN WINDOWS)
-- Calcula los días restantes usando exclusivamente NOW() del servidor de Supabase y actualiza el estatus si venció
CREATE OR REPLACE FUNCTION public.verify_tenant_license(
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant public.tenants%ROWTYPE;
  v_days_remaining INT;
  v_is_expired BOOLEAN;
BEGIN
  IF NOT (public.is_super_admin() OR EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id AND owner_id = auth.uid())) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acceso denegado');
  END IF;
  SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Restaurante no encontrado');
  END IF;

  -- Si la fecha de corte ya pasó según el reloj del servidor y seguía en 'active', pasarlo a 'past_due' en BD
  IF v_tenant.valid_until <= NOW() AND v_tenant.status = 'active' THEN
    UPDATE public.tenants
    SET status = 'past_due',
        last_online_at = NOW(),
        updated_at = NOW()
    WHERE id = p_tenant_id
    RETURNING * INTO v_tenant;
  ELSE
    UPDATE public.tenants
    SET last_online_at = NOW()
    WHERE id = p_tenant_id;
  END IF;

  v_days_remaining := CEIL(EXTRACT(EPOCH FROM (v_tenant.valid_until - NOW())) / 86400.0)::INT;
  v_is_expired := (v_tenant.status IN ('past_due', 'suspended')) OR (v_tenant.valid_until <= NOW());

  RETURN jsonb_build_object(
    'success', true,
    'server_now', NOW(),
    'tenant_id', v_tenant.id,
    'status', v_tenant.status,
    'plan', v_tenant.plan,
    'valid_until', v_tenant.valid_until,
    'days_remaining', GREATEST(0, v_days_remaining),
    'raw_days_remaining', v_days_remaining,
    'is_expired', v_is_expired,
    'is_suspended', (v_tenant.status = 'suspended')
  );
END;
$$;

-- 6. TRIGGER AUTOMÁTICO: CREAR TENANT CON 14 DÍAS DE PRUEBA AL REGISTRARSE EN SUPABASE AUTH
CREATE OR REPLACE FUNCTION public.handle_new_user_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 7. ADMINISTRACION Y SEGURIDAD (RLS)
-- Principio: cada regla vive en un solo lugar. Quien es admin se define SOLO en super_admins;
-- toda accion de administrador pasa por funciones SQL (admin_*) que validan permisos y dejan auditoria.

-- 7.1 Super administradores (unica fuente de verdad)
CREATE TABLE IF NOT EXISTS public.super_admins (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO public.super_admins (email) VALUES ('signalnotestudio@gmail.com') ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Permite al super admin o al backend (Edge Functions con service_role)
CREATE OR REPLACE FUNCTION public.require_admin_or_service()
RETURNS VOID
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_super_admin() THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'Acceso denegado: se requiere super administrador' USING ERRCODE = '42501';
END;
$$;

-- 7.2 Auditoria de acciones administrativas
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  tenant_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.log_admin_action(p_action TEXT, p_tenant_id UUID, p_details JSONB DEFAULT '{}'::jsonb)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.admin_audit_log (actor, action, tenant_id, details)
  VALUES (coalesce(auth.jwt() ->> 'email', auth.role()), p_action, p_tenant_id, coalesce(p_details, '{}'::jsonb));
$$;

-- 7.3 Acciones de administrador (unica via para cambiar plan, estado o fecha de corte)
CREATE OR REPLACE FUNCTION public.admin_extend_tenant(p_tenant_id UUID, p_days INT, p_plan TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant public.tenants%ROWTYPE;
  v_new TIMESTAMPTZ;
BEGIN
  PERFORM public.require_admin_or_service();
  SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Restaurante no encontrado');
  END IF;

  v_new := GREATEST(coalesce(v_tenant.valid_until, NOW()), NOW()) + make_interval(days => p_days);

  UPDATE public.tenants
  SET status = 'active',
      plan = coalesce(p_plan, CASE WHEN v_tenant.plan = 'trial' THEN 'monthly' ELSE v_tenant.plan END),
      valid_until = v_new,
      updated_at = NOW()
  WHERE id = p_tenant_id;

  PERFORM public.log_admin_action('extend', p_tenant_id, jsonb_build_object('days', p_days, 'plan', p_plan, 'valid_until', v_new));
  RETURN jsonb_build_object('success', true, 'valid_until', v_new);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_status(p_tenant_id UUID, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_admin_or_service();
  IF p_status NOT IN ('active', 'past_due', 'suspended') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Estado invalido');
  END IF;

  UPDATE public.tenants SET status = p_status, updated_at = NOW() WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Restaurante no encontrado');
  END IF;

  PERFORM public.log_admin_action('set_status', p_tenant_id, jsonb_build_object('status', p_status));
  RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_valid_until(p_tenant_id UUID, p_valid_until TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_admin_or_service();
  UPDATE public.tenants
  SET valid_until = p_valid_until,
      status = CASE WHEN p_valid_until > NOW() AND status = 'past_due' THEN 'active' ELSE status END,
      updated_at = NOW()
  WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Restaurante no encontrado');
  END IF;

  PERFORM public.log_admin_action('set_valid_until', p_tenant_id, jsonb_build_object('valid_until', p_valid_until));
  RETURN jsonb_build_object('success', true, 'valid_until', p_valid_until);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_payment(p_payment_id UUID, p_notes TEXT DEFAULT '')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant UUID;
BEGIN
  PERFORM public.require_admin_or_service();
  UPDATE public.subscription_payments
  SET status = 'rejected', verified_by = 'super_admin', verified_at = NOW(), notes = coalesce(p_notes, '')
  WHERE id = p_payment_id AND status = 'pending'
  RETURNING tenant_id INTO v_tenant;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pago no encontrado o ya procesado');
  END IF;

  PERFORM public.log_admin_action('reject_payment', v_tenant, jsonb_build_object('payment_id', p_payment_id, 'notes', p_notes));
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7.4 Row Level Security
ALTER TABLE public.saas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Limpiar politicas anteriores (version de pruebas)
DROP POLICY IF EXISTS "Lectura publica de saas_config" ON public.saas_config;
DROP POLICY IF EXISTS "Escritura saas_config autenticados" ON public.saas_config;
DROP POLICY IF EXISTS "Acceso a tenants para usuarios autenticados" ON public.tenants;
DROP POLICY IF EXISTS "Acceso a pagos para usuarios autenticados" ON public.subscription_payments;
DROP POLICY IF EXISTS "Acceso a snapshots para usuarios autenticados" ON public.tenant_snapshots;

-- saas_config: precios y datos de Pago Movil son publicos; solo el super admin los edita
DROP POLICY IF EXISTS "saas_config_select" ON public.saas_config;
CREATE POLICY "saas_config_select" ON public.saas_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "saas_config_admin_write" ON public.saas_config;
CREATE POLICY "saas_config_admin_write" ON public.saas_config FOR ALL
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- tenants: cada dueno ve lo suyo; el admin ve todo. Los cambios de plan/estado/fecha solo via admin_* RPC.
DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
CREATE POLICY "tenants_select" ON public.tenants FOR SELECT
  USING (owner_id = auth.uid() OR public.is_super_admin());
DROP POLICY IF EXISTS "tenants_owner_update" ON public.tenants;
CREATE POLICY "tenants_owner_update" ON public.tenants FOR UPDATE
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
-- El dueno solo puede editar datos del negocio, nunca plan, estado ni fecha de vencimiento
REVOKE UPDATE ON public.tenants FROM authenticated, anon;
GRANT UPDATE (name, phone, rif, branding, exchange_rate, local_ip, last_online_at) ON public.tenants TO authenticated;

-- subscription_payments: el dueno reporta (solo 'pending') y consulta los suyos; el admin ve todos
DROP POLICY IF EXISTS "payments_select" ON public.subscription_payments;
CREATE POLICY "payments_select" ON public.subscription_payments FOR SELECT
  USING (public.is_super_admin() OR tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS "payments_owner_insert" ON public.subscription_payments;
CREATE POLICY "payments_owner_insert" ON public.subscription_payments FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND verified_by = 'pending'
    AND tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );

-- tenant_snapshots: el dueño del restaurante tiene acceso total; el super admin tiene lectura para soporte
DROP POLICY IF EXISTS "snapshots_owner_all" ON public.tenant_snapshots;
CREATE POLICY "snapshots_owner_all" ON public.tenant_snapshots FOR ALL
  USING (public.is_super_admin() OR tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

-- super_admins: cada usuario solo puede ver su propia fila (para saber si es admin)
DROP POLICY IF EXISTS "super_admins_self_select" ON public.super_admins;
CREATE POLICY "super_admins_self_select" ON public.super_admins FOR SELECT
  USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- admin_audit_log: solo lectura para el super admin (se escribe unicamente via log_admin_action)
DROP POLICY IF EXISTS "audit_admin_select" ON public.admin_audit_log;
CREATE POLICY "audit_admin_select" ON public.admin_audit_log FOR SELECT USING (public.is_super_admin());

-- 7.5 Vista del panel admin: los dias restantes los calcula el servidor (NOW()), nunca el navegador
CREATE OR REPLACE VIEW public.admin_tenants_overview
WITH (security_invoker = true) AS
SELECT
  t.id, t.name, t.owner_email, t.phone, t.rif, t.plan, t.status, t.valid_until, t.created_at, t.last_online_at,
  GREATEST(0, CEIL(EXTRACT(EPOCH FROM (t.valid_until - NOW())) / 86400.0))::INT AS days_remaining,
  (t.status IN ('past_due', 'suspended') OR t.valid_until <= NOW()) AS is_expired
FROM public.tenants t;

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
