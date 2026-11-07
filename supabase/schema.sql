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
  bcv_rate NUMERIC(12,4) DEFAULT 876.80,
  trial_days INT DEFAULT 14,
  pago_movil_bank TEXT DEFAULT '0172 - Bancamiga',
  pago_movil_rif_ci TEXT DEFAULT 'V-00000000',
  pago_movil_phone TEXT DEFAULT '0412-0000000',
  pago_movil_holder TEXT DEFAULT 'FacturasYa - Cobranzas SaaS',
  binance_email TEXT DEFAULT '',
  support_whatsapp TEXT DEFAULT '+584120000000',
  auto_verify_provider TEXT DEFAULT 'manual', -- 'manual' | 'pabilo' | 'cobrix'
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.saas_config ADD COLUMN IF NOT EXISTS bcv_rate NUMERIC(12,4) DEFAULT 876.80;

INSERT INTO public.saas_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 2. TABLA DE RESTAURANTES / INQUILINOS (TENANTS)
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_email TEXT UNIQUE,
  name TEXT NOT NULL,
  legal_name TEXT DEFAULT '',
  slug TEXT UNIQUE,
  rif TEXT DEFAULT '',
  fiscal_address TEXT DEFAULT '',
  fiscal_serial TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  is_fiscal_verified BOOLEAN DEFAULT false,
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

-- Migraciones idempotentes para bases de datos ya existentes
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS legal_name TEXT DEFAULT '';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS fiscal_address TEXT DEFAULT '';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS fiscal_serial TEXT DEFAULT '';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT '';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_fiscal_verified BOOLEAN DEFAULT false;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS fiscal_terminals JSONB DEFAULT '[]'::jsonb;

-- 3. TABLA DE PAGOS DE SUSCRIPCIÓN (PAGO MÓVIL / BINANCE)
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_name TEXT,
  plan TEXT NOT NULL DEFAULT 'monthly' CHECK (plan IN ('monthly', 'annual')),
  payment_method TEXT NOT NULL DEFAULT 'pago_movil' CHECK (payment_method IN ('pago_movil', 'binance', 'zelle', 'transfer')),
  days_to_add INT NOT NULL DEFAULT 30,
  amount_usd NUMERIC(10,2) NOT NULL,
  amount_bs NUMERIC(14,2) NOT NULL,
  rate_bcv NUMERIC(12,4) NOT NULL,
  bank_origin TEXT NOT NULL,
  phone_origin TEXT NOT NULL,
  payer_doc TEXT DEFAULT '',
  reference_last6 TEXT NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  verified_by TEXT DEFAULT 'pending', -- 'api_auto' | 'super_admin' | 'pending'
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'pago_movil';
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS payer_doc TEXT DEFAULT '';
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE;

-- Candado anti-fraude: ninguna referencia bancaria puede reusarse en estado pendiente o aprobado
CREATE UNIQUE INDEX IF NOT EXISTS uq_sub_payments_active_ref
  ON public.subscription_payments (bank_origin, reference_last6)
  WHERE status IN ('pending', 'approved');

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
DECLARe
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
-- Calcula los días restantes usando exclusivamente NOW() del servidor de Supabase, actualiza el estatus si venció
-- y evalúa si existe un Pase de Cortesía en Verificación (pago 'pending' en últimas 24h sin rechazos recientes).
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
  v_has_pending BOOLEAN := false;
  v_has_recent_rejection BOOLEAN := false;
  v_pending_ref TEXT := '';
  v_grace_active BOOLEAN := false;
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

  -- Verificar si tiene un Pago Móvil / Binance en estado 'pending' de las últimas 24 horas
  SELECT true, reference_last6
  INTO v_has_pending, v_pending_ref
  FROM public.subscription_payments
  WHERE tenant_id = p_tenant_id
    AND status = 'pending'
    AND created_at >= (NOW() - INTERVAL '24 hours')
  ORDER BY created_at DESC
  LIMIT 1;

  v_has_pending := COALESCE(v_has_pending, false);
  v_pending_ref := COALESCE(v_pending_ref, '');

  -- Anti-abuso: comprobar si le fue rechazado un pago en las últimas 24 horas
  SELECT EXISTS (
    SELECT 1 FROM public.subscription_payments
    WHERE tenant_id = p_tenant_id
      AND status = 'rejected'
      AND COALESCE(verified_at, created_at) >= (NOW() - INTERVAL '24 hours')
  ) INTO v_has_recent_rejection;

  v_grace_active := (v_has_pending AND NOT v_has_recent_rejection AND v_tenant.status <> 'suspended');

  v_days_remaining := CEIL(EXTRACT(EPOCH FROM (v_tenant.valid_until - NOW())) / 86400.0)::INT;
  v_is_expired := (v_tenant.status IN ('past_due', 'suspended')) OR (v_tenant.valid_until <= NOW());

  RETURN jsonb_build_object(
    'success', true,
    'server_now', NOW(),
    'tenant_id', v_tenant.id,
    'status', v_tenant.status,
    'plan', v_tenant.plan,
    'name', v_tenant.name,
    'legal_name', v_tenant.legal_name,
    'rif', v_tenant.rif,
    'fiscal_address', v_tenant.fiscal_address,
    'fiscal_serial', v_tenant.fiscal_serial,
    'phone', v_tenant.phone,
    'instagram', v_tenant.instagram,
    'is_fiscal_verified', COALESCE(v_tenant.is_fiscal_verified, false),
    'valid_until', v_tenant.valid_until,
    'days_remaining', GREATEST(0, v_days_remaining),
    'raw_days_remaining', v_days_remaining,
    'is_expired', v_is_expired,
    'is_suspended', (v_tenant.status = 'suspended'),
    'has_pending_payment', v_has_pending,
    'pending_reference', v_pending_ref,
    'has_recent_rejection', v_has_recent_rejection,
    'grace_active', v_grace_active
  );
END;
$$;

-- 5.C FUNCIÓN RPC CON AUTORIDAD DE PRECIO EN EL SERVIDOR PARA REPORTAR PAGO MÓVIL / BINANCE
-- Impide que un cliente altere el monto en USD desde el navegador y garantiza unicidad de referencia
CREATE OR REPLACE FUNCTION public.report_subscription_payment(
  p_tenant_id UUID,
  p_plan TEXT DEFAULT 'monthly',
  p_payment_method TEXT DEFAULT 'pago_movil',
  p_bank_origin TEXT DEFAULT '',
  p_phone_origin TEXT DEFAULT '',
  p_payer_doc TEXT DEFAULT '',
  p_reference_last6 TEXT DEFAULT '',
  p_rate_bcv NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant public.tenants%ROWTYPE;
  v_config public.saas_config%ROWTYPE;
  v_clean_ref TEXT;
  v_plan TEXT;
  v_method TEXT;
  v_days INT;
  v_official_usd NUMERIC(10,2);
  v_effective_rate NUMERIC(12,4);
  v_official_bs NUMERIC(14,2);
  v_dup_id UUID;
  v_inserted public.subscription_payments%ROWTYPE;
BEGIN
  IF NOT (public.is_super_admin() OR EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id AND owner_id = auth.uid())) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acceso denegado para reportar pagos en este restaurante.');
  END IF;

  SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Restaurante no encontrado.');
  END IF;

  SELECT * INTO v_config FROM public.saas_config WHERE id = 1;

  v_plan := CASE WHEN p_plan = 'annual' THEN 'annual' ELSE 'monthly' END;
  v_method := CASE WHEN p_payment_method IN ('pago_movil', 'binance', 'zelle', 'transfer') THEN p_payment_method ELSE 'pago_movil' END;
  v_days := CASE WHEN v_plan = 'annual' THEN 365 ELSE 30 END;

  -- Autoridad de precio en el servidor: jamás confiar en el precio USD enviado por el cliente
  v_official_usd := CASE
    WHEN v_plan = 'annual' THEN COALESCE(v_config.annual_price_usd, 300.00)
    ELSE COALESCE(v_config.monthly_price_usd, 30.00)
  END;

  v_effective_rate := COALESCE(NULLIF(p_rate_bcv, 0), NULLIF(v_config.bcv_rate, 0), NULLIF(v_tenant.exchange_rate, 0), 876.80);
  v_official_bs := ROUND(v_official_usd * v_effective_rate, 2);

  v_clean_ref := UPPER(REGEXP_REPLACE(TRIM(COALESCE(p_reference_last6, '')), '[^A-Z0-9]', '', 'g'));
  IF v_method = 'pago_movil' THEN
    v_clean_ref := RIGHT(REGEXP_REPLACE(v_clean_ref, '\D', '', 'g'), 6);
  ELSE
    v_clean_ref := RIGHT(v_clean_ref, 8);
  END IF;

  IF LENGTH(v_clean_ref) < 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ingresa al menos los últimos 6 dígitos válidos del comprobante o referencia.');
  END IF;

  -- Verificar duplicados activos
  SELECT id INTO v_dup_id
  FROM public.subscription_payments
  WHERE bank_origin = TRIM(p_bank_origin)
    AND reference_last6 = v_clean_ref
    AND status IN ('pending', 'approved')
  LIMIT 1;

  IF v_dup_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta referencia (#' || v_clean_ref || ') ya fue registrada anteriormente y se encuentra en verificación o aprobada.'
    );
  END IF;

  INSERT INTO public.subscription_payments (
    tenant_id,
    tenant_name,
    plan,
    payment_method,
    days_to_add,
    amount_usd,
    amount_bs,
    rate_bcv,
    bank_origin,
    phone_origin,
    payer_doc,
    reference_last6,
    payment_date,
    status,
    verified_by
  ) VALUES (
    v_tenant.id,
    v_tenant.name,
    v_plan,
    v_method,
    v_days,
    v_official_usd,
    v_official_bs,
    v_effective_rate,
    TRIM(COALESCE(NULLIF(p_bank_origin, ''), 'Pago Móvil')),
    TRIM(COALESCE(p_phone_origin, '')),
    UPPER(TRIM(COALESCE(p_payer_doc, ''))),
    v_clean_ref,
    CURRENT_DATE,
    'pending',
    'pending'
  )
  RETURNING * INTO v_inserted;

  RETURN jsonb_build_object(
    'success', true,
    'payment', row_to_json(v_inserted)
  );
END;
$$;

-- 6. TRIGGER AUTOMÁTICO: CREAR TENANT AL REGISTRARSE EN SUPABASE AUTH (FLUJO NOTION ULTRA-RÁPIDO)
CREATE OR REPLACE FUNCTION public.handle_new_user_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_name TEXT;
  v_new_tenant_id UUID;
BEGIN
  v_business_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'business_name', ''), 'Mi Negocio');

  INSERT INTO public.tenants (
    owner_id,
    owner_email,
    name,
    legal_name,
    slug,
    rif,
    fiscal_address,
    fiscal_serial,
    phone,
    instagram,
    is_fiscal_verified,
    plan,
    status,
    valid_until
  ) VALUES (
    NEW.id,
    NEW.email,
    v_business_name,
    '',
    LOWER(REGEXP_REPLACE(v_business_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(NEW.id::TEXT, 1, 4),
    '',
    '',
    '',
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    '',
    false,
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

-- 6.B FUNCIÓN RPC: VERIFICACIÓN FISCAL ESTILO BINANCE (1 PRUEBA POR RIF ANTI-ABUSO)
CREATE OR REPLACE FUNCTION public.complete_tenant_fiscal_verification(
  p_tenant_id UUID,
  p_name TEXT,
  p_legal_name TEXT,
  p_rif TEXT,
  p_fiscal_address TEXT,
  p_phone TEXT,
  p_fiscal_serial TEXT DEFAULT '',
  p_instagram TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_rif TEXT;
  v_tenant public.tenants%ROWTYPE;
  v_existing_id UUID;
  v_new_valid TIMESTAMPTZ;
BEGIN
  -- Permisos: Super Admin o Dueño del restaurante
  IF NOT (public.is_super_admin() OR EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id AND owner_id = auth.uid())) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acceso denegado: no tienes permiso para verificar este restaurante.');
  END IF;

  -- Validaciones de obligatoriedad SENIAT
  IF TRIM(COALESCE(p_name, '')) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'El nombre comercial del negocio es obligatorio.');
  END IF;
  IF TRIM(COALESCE(p_legal_name, '')) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'La Razón Social fiscal registrada ante el SENIAT es obligatoria.');
  END IF;
  IF TRIM(COALESCE(p_fiscal_address, '')) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'El domicilio fiscal es obligatorio para los libros y reportes SENIAT.');
  END IF;

  -- Normalizar RIF (Mayúsculas sin caracteres raros)
  v_clean_rif := UPPER(REGEXP_REPLACE(COALESCE(p_rif, ''), '[^A-Z0-9]', '', 'g'));
  IF LENGTH(v_clean_rif) < 7 THEN
    RETURN jsonb_build_object('success', false, 'error', 'El RIF ingresado no es válido (ejemplo: J-12345678-9).');
  END IF;

  -- Anti-abuso: Comprobar si otra empresa ya utilizó este RIF para evitar cuentas infinitas de 14 días
  SELECT id INTO v_existing_id
  FROM public.tenants
  WHERE UPPER(REGEXP_REPLACE(rif, '[^A-Z0-9]', '', 'g')) = v_clean_rif
    AND id <> p_tenant_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Este RIF ya se encuentra registrado con otra cuenta en FacturasYa. Cada empresa tiene derecho a 1 periodo de prueba único. Si necesitas soporte o migrar tu cuenta, comunícate con soporte.'
    );
  END IF;

  -- Anti-abuso adicional: Comprobar si el Serial Fiscal de Máquina HKA ya fue utilizado en otra cuenta
  IF LENGTH(TRIM(COALESCE(p_fiscal_serial, ''))) >= 5 THEN
    SELECT id INTO v_existing_id
    FROM public.tenants
    WHERE UPPER(REGEXP_REPLACE(COALESCE(fiscal_serial, ''), '[^A-Z0-9]', '', 'g')) = UPPER(REGEXP_REPLACE(p_fiscal_serial, '[^A-Z0-9]', '', 'g'))
      AND id <> p_tenant_id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Este Serial de Máquina Fiscal SENIAT ya se encuentra vinculado a otra cuenta en FacturasYa.'
      );
    END IF;
  END IF;

  SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Restaurante no encontrado.');
  END IF;

  -- Si es la primera verificación fiscal y está en trial, garantizar los 14 días a partir de hoy
  IF NOT COALESCE(v_tenant.is_fiscal_verified, false) AND v_tenant.plan = 'trial' THEN
    v_new_valid := NOW() + INTERVAL '14 days';
  ELSE
    v_new_valid := v_tenant.valid_until;
  END IF;

  UPDATE public.tenants
  SET name = TRIM(p_name),
      legal_name = TRIM(p_legal_name),
      rif = TRIM(p_rif),
      fiscal_address = TRIM(p_fiscal_address),
      phone = COALESCE(TRIM(p_phone), v_tenant.phone, ''),
      fiscal_serial = COALESCE(TRIM(p_fiscal_serial), v_tenant.fiscal_serial, ''),
      instagram = COALESCE(TRIM(p_instagram), v_tenant.instagram, ''),
      is_fiscal_verified = true,
      valid_until = v_new_valid,
      status = CASE WHEN v_new_valid > NOW() AND status = 'past_due' THEN 'active' ELSE status END,
      updated_at = NOW()
  WHERE id = p_tenant_id
  RETURNING * INTO v_tenant;

  PERFORM public.log_admin_action('fiscal_verification', p_tenant_id, jsonb_build_object('rif', p_rif, 'legal_name', p_legal_name));

  RETURN jsonb_build_object(
    'success', true,
    'tenant', row_to_json(v_tenant)
  );
END;
$$;

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

CREATE OR REPLACE FUNCTION public.admin_toggle_fiscal_verification(p_tenant_id UUID, p_verified BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_admin_or_service();
  UPDATE public.tenants
  SET is_fiscal_verified = COALESCE(p_verified, true),
      updated_at = NOW()
  WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Restaurante no encontrado');
  END IF;

  PERFORM public.log_admin_action('toggle_fiscal_verification', p_tenant_id, jsonb_build_object('is_fiscal_verified', p_verified));
  RETURN jsonb_build_object('success', true, 'is_fiscal_verified', p_verified);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_tenant_profile(
  p_tenant_id UUID,
  p_name TEXT,
  p_legal_name TEXT DEFAULT '',
  p_rif TEXT DEFAULT '',
  p_fiscal_address TEXT DEFAULT '',
  p_fiscal_serial TEXT DEFAULT '',
  p_phone TEXT DEFAULT '',
  p_instagram TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated public.tenants%ROWTYPE;
BEGIN
  PERFORM public.require_admin_or_service();

  UPDATE public.tenants
  SET name = COALESCE(NULLIF(TRIM(p_name), ''), name),
      legal_name = TRIM(COALESCE(p_legal_name, '')),
      rif = UPPER(TRIM(COALESCE(p_rif, ''))),
      fiscal_address = TRIM(COALESCE(p_fiscal_address, '')),
      fiscal_serial = UPPER(TRIM(COALESCE(p_fiscal_serial, ''))),
      phone = TRIM(COALESCE(p_phone, '')),
      instagram = TRIM(COALESCE(p_instagram, '')),
      updated_at = NOW()
  WHERE id = p_tenant_id
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Restaurante no encontrado');
  END IF;

  PERFORM public.log_admin_action('update_tenant_profile', p_tenant_id, jsonb_build_object('name', p_name, 'rif', p_rif, 'fiscal_serial', p_fiscal_serial));
  RETURN jsonb_build_object('success', true, 'tenant', row_to_json(v_updated));
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
-- El dueno solo puede editar datos del negocio, nunca plan, estado, is_fiscal_verified ni fecha de vencimiento directamente
REVOKE UPDATE ON public.tenants FROM authenticated, anon;
GRANT UPDATE (name, legal_name, phone, rif, fiscal_address, fiscal_serial, fiscal_terminals, instagram, branding, exchange_rate, local_ip, last_online_at) ON public.tenants TO authenticated;

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
  t.id, t.name, t.legal_name, t.owner_email, t.phone, t.rif, t.fiscal_address, t.fiscal_serial, t.instagram,
  t.is_fiscal_verified, t.plan, t.status, t.valid_until, t.created_at, t.last_online_at,
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


-- ============================================================================
-- 9. TABLAS RELACIONALES COMPLEMENTARIAS PARA ENTERPRISE SAAS (PRODUCTOS, FACTURAS, INVENTARIO)
-- ============================================================================
-- Estas tablas permiten consultas directas y escalables desde la Web con RLS (Row Level Security),
-- manteniendo compatibilidad total con tenant_snapshots para la sincronización offline del desktop.

-- 9.1 CATÁLOGO DE PRODUCTOS RELACIONAL
CREATE TABLE IF NOT EXISTS public.tenant_products (
  id TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  price_usd NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  is_exempt BOOLEAN DEFAULT false,
  image_url TEXT,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tenant_id, id)
);

-- 9.2 FACTURACIÓN RELACIONAL (LIBRO DE VENTAS SENIAT)
CREATE TABLE IF NOT EXISTS public.tenant_invoices (
  id TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_name TEXT DEFAULT 'Consumidor Final',
  client_rif TEXT DEFAULT 'V-00000000-0',
  total_usd NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_bs NUMERIC(16,2) NOT NULL DEFAULT 0.00,
  exchange_rate NUMERIC(12,4) NOT NULL DEFAULT 876.80,
  payment_method TEXT DEFAULT 'cash',
  igtf_usd NUMERIC(10,2) DEFAULT 0.00,
  base_imponible_bs NUMERIC(16,2) DEFAULT 0.00,
  iva16_bs NUMERIC(16,2) DEFAULT 0.00,
  items JSONB DEFAULT '[]'::jsonb,
  fiscal_serial TEXT DEFAULT '',
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tenant_id, id)
);

-- 9.3 CLIENTES RELACIONAL
CREATE TABLE IF NOT EXISTS public.tenant_clients (
  id TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rif TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT DEFAULT 'N/A',
  address TEXT DEFAULT 'Venezuela',
  balance_usd NUMERIC(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tenant_id, id)
);

-- 9.4 INVENTARIO RELACIONAL
CREATE TABLE IF NOT EXISTS public.tenant_inventory (
  id TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'Unidades',
  current_stock NUMERIC(12,2) DEFAULT 0.00,
  min_stock NUMERIC(12,2) DEFAULT 0.00,
  cost_usd NUMERIC(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tenant_id, id)
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.tenant_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_inventory ENABLE ROW LEVEL SECURITY;

-- Políticas de aislamiento por tenant
DROP POLICY IF EXISTS "tenant_products_isolation" ON public.tenant_products;
CREATE POLICY "tenant_products_isolation" ON public.tenant_products FOR ALL
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "tenant_invoices_isolation" ON public.tenant_invoices;
CREATE POLICY "tenant_invoices_isolation" ON public.tenant_invoices FOR ALL
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "tenant_clients_isolation" ON public.tenant_clients;
CREATE POLICY "tenant_clients_isolation" ON public.tenant_clients FOR ALL
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "tenant_inventory_isolation" ON public.tenant_inventory;
CREATE POLICY "tenant_inventory_isolation" ON public.tenant_inventory FOR ALL
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));
