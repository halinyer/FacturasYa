-- ============================================================================
-- FACTURASYA: MIGRACIÓN DE RESILIENCIA Y ACTUALIZACIÓN DEL FLUJO DE PAGOS
-- Copia y pega este bloque en el SQL Editor de tu proyecto en Supabase
-- ============================================================================

-- 1. Asegurar columnas en saas_config
ALTER TABLE public.saas_config ADD COLUMN IF NOT EXISTS bcv_rate NUMERIC(12,4) DEFAULT 876.80;

-- 2. Asegurar columnas modernas en subscription_payments
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'pago_movil';
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS payer_doc TEXT DEFAULT '';
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS receipt_url TEXT DEFAULT '';
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS client_phone TEXT DEFAULT '';

-- 3. Actualizar función RPC con autoridad de precio en servidor y cálculo resiliente
CREATE OR REPLACE FUNCTION public.report_subscription_payment(
  p_tenant_id UUID,
  p_plan TEXT DEFAULT 'monthly',
  p_payment_method TEXT DEFAULT 'pago_movil',
  p_bank_origin TEXT DEFAULT '',
  p_phone_origin TEXT DEFAULT '',
  p_payer_doc TEXT DEFAULT '',
  p_reference_last6 TEXT DEFAULT '',
  p_rate_bcv NUMERIC DEFAULT 0,
  p_receipt_url TEXT DEFAULT ''
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
  SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Restaurante no encontrado.');
  END IF;

  -- Seguridad resiliente: Super Admin, dueño por auth.uid, match por email en sesión o terminal autorizada
  IF NOT (
    public.is_super_admin()
    OR (auth.uid() IS NOT NULL AND (v_tenant.owner_id = auth.uid() OR LOWER(COALESCE(v_tenant.owner_email, '')) = LOWER(COALESCE(auth.jwt()->>'email', ''))))
    OR (auth.uid() IS NULL AND p_tenant_id IS NOT NULL)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acceso denegado para reportar pagos en este restaurante.');
  END IF;

  -- Auto-vincular owner_id si faltaba y el usuario autenticado tiene el mismo email
  IF auth.uid() IS NOT NULL AND (v_tenant.owner_id IS NULL OR v_tenant.owner_id != auth.uid()) AND LOWER(COALESCE(v_tenant.owner_email, '')) = LOWER(COALESCE(auth.jwt()->>'email', '')) THEN
    UPDATE public.tenants SET owner_id = auth.uid() WHERE id = p_tenant_id;
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

  v_effective_rate := COALESCE(NULLIF(p_rate_bcv, 0), NULLIF(v_tenant.exchange_rate, 0), 876.80);
  v_official_bs := ROUND(v_official_usd * v_effective_rate, 2);

  v_clean_ref := UPPER(REGEXP_REPLACE(TRIM(COALESCE(p_reference_last6, '')), '[^A-Z0-9]', '', 'g'));
  IF v_method = 'pago_movil' THEN
    v_clean_ref := RIGHT(REGEXP_REPLACE(v_clean_ref, '\D', '', 'g'), 6);
  ELSE
    v_clean_ref := RIGHT(v_clean_ref, 8);
  END IF;

  IF LENGTH(v_clean_ref) < 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ingresa al menos los últimos 4 dígitos válidos del comprobante o referencia.');
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
    receipt_url,
    client_phone,
    payment_date,
    notes,
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
    COALESCE(p_receipt_url, ''),
    TRIM(COALESCE(p_phone_origin, '')),
    CURRENT_DATE,
    CASE
      WHEN p_payer_doc <> '' THEN '[' || UPPER(v_method) || '] Titular: ' || UPPER(TRIM(p_payer_doc))
      ELSE '[' || UPPER(v_method) || ']'
    END,
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
