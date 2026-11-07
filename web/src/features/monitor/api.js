import { supabase } from '../../lib/supabase';

const unwrap = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

// Formatea automáticamente un RIF venezolano (ej. "J501234567" -> "J-50123456-7")
export const formatRifSeniat = (raw = '') => {
  const clean = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return '';
  const prefixMatch = clean.match(/^[JVEGPC]/);
  const letter = prefixMatch ? prefixMatch[0] : 'J';
  const digits = (prefixMatch ? clean.slice(1) : clean).replace(/\D/g, '').slice(0, 9);
  if (digits.length === 0) return `${letter}-`;
  if (digits.length <= 8) return `${letter}-${digits}`;
  return `${letter}-${digits.slice(0, 8)}-${digits.slice(8, 9)}`;
};

// Lee la configuración local de esta Caja / Terminal POS (Soporte Multi-Caja)
export const getLocalTerminalConfig = () => {
  try {
    const raw = localStorage.getItem('pos_fiscal_terminal');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.terminalId) return parsed;
    }
  } catch (e) {}
  return {
    terminalId: 'CAJA-01',
    terminalName: 'Caja Principal Mostrador',
    port: 'COM2',
    fiscalSerial: ''
  };
};

// Guarda la configuración local de esta Caja / Terminal POS
export const saveLocalTerminalConfig = (partial) => {
  const current = getLocalTerminalConfig();
  const next = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem('pos_fiscal_terminal', JSON.stringify(next));
  } catch (e) {}
  return next;
};

// Obtiene el restaurante asociado a la cuenta del dueño autenticado
export const fetchMyTenant = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let foundTenant = null;

  // 1. Buscar si es dueño directo
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (tenant) {
    foundTenant = tenant;
  } else if (user.email) {
    // 2. Si no encontró por owner_id, buscar por owner_email
    const { data: byEmail } = await supabase
      .from('tenants')
      .select('*')
      .eq('owner_email', user.email.toLowerCase())
      .maybeSingle();
    if (byEmail) foundTenant = byEmail;
  }

  // 3. Si el usuario es Super Admin, puede consultar el primer tenant para visualización
  if (!foundTenant) {
    const { data: isAdmin } = await supabase.rpc('is_super_admin');
    if (isAdmin) {
      const { data: firstTenant } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      foundTenant = firstTenant;
    }
  }

  if (foundTenant) {
    // Si tiene RIF y Razón Social completos y fue verificado localmente, mantener consistencia
    try {
      const localVerified = localStorage.getItem(`pos_fiscal_verified_${foundTenant.id}`) === 'true';
      if (localVerified && foundTenant.rif && foundTenant.legal_name) {
        foundTenant.is_fiscal_verified = true;
      }
    } catch (e) {}
  }

  return foundTenant;
};

// Obtiene el último snapshot en la nube de la caja del restaurante
export const fetchTenantSnapshot = async (tenantId) => {
  if (!tenantId) return null;
  const res = await supabase
    .from('tenant_snapshots')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  return unwrap(res);
};

// Obtiene los datos receptores de Pago Móvil y planes
export const fetchSaasConfig = async () => {
  const res = await supabase.from('saas_config').select('*').eq('id', 1).single();
  return unwrap(res);
};

// Historial de pagos reportados por este restaurante
export const fetchMyPayments = async (tenantId) => {
  if (!tenantId) return [];
  const res = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(20);
  return unwrap(res) || [];
};

// Reportar Pago Móvil / Binance Pay con Autoridad de Precio en el Servidor
export const submitOwnerPagoMovil = async ({
  tenantId,
  tenantName,
  plan = 'monthly',
  paymentMethod = 'pago_movil',
  amountUsd,
  amountBs,
  rateBcv,
  bankOrigin,
  phoneOrigin,
  payerDoc = '',
  referenceLast6,
  autoVerifyProvider = 'manual'
}) => {
  const isBinance = paymentMethod === 'binance';
  const cleanRef = isBinance
    ? String(referenceLast6 || '').trim().replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase()
    : String(referenceLast6 || '').replace(/\D/g, '').slice(-6);

  if (!isBinance && (!bankOrigin || !phoneOrigin || cleanRef.length < 4)) {
    throw new Error('Completa el banco emisor, teléfono y los últimos 6 dígitos de la referencia.');
  }
  if (isBinance && cleanRef.length < 4) {
    throw new Error('Ingresa los últimos dígitos del Order ID de Binance Pay.');
  }

  const finalBank = isBinance ? 'Binance Pay (USDT)' : bankOrigin;
  const finalPhone = isBinance ? (phoneOrigin || 'USDT').trim() : phoneOrigin.trim();
  const cleanDoc = payerDoc ? formatRifSeniat(payerDoc) : '';
  const daysToAdd = plan === 'annual' ? 365 : 30;

  // 1. Si hay pasarela automática configurada (Pabilo / Cobrix), invocar la Edge Function
  if (!isBinance && (autoVerifyProvider === 'pabilo' || autoVerifyProvider === 'cobrix')) {
    try {
      const { data: fnData, error: fnErr } = await supabase.functions.invoke('verify-pago-movil', {
        body: {
          tenantId,
          tenantName,
          plan,
          paymentMethod,
          amountUsd: Number(amountUsd),
          amountBs: Number(amountBs),
          rateBcv: Number(rateBcv),
          bankOrigin: finalBank,
          phoneOrigin: finalPhone,
          payerDoc: cleanDoc,
          referenceLast6: cleanRef
        }
      });
      if (!fnErr && fnData?.success) {
        return fnData.payment || fnData;
      }
      if (fnData && fnData.success === false && fnData.error) {
        throw new Error(fnData.error);
      }
    } catch (e) {
      if (e.message && (e.message.includes('registrada') || e.message.includes('monto') || e.message.includes('encontró'))) {
        throw e;
      }
    }
  }

  // 2. Intentar vía RPC seguro con Autoridad de Precio en el Servidor (report_subscription_payment)
  const rpcRes = await supabase.rpc('report_subscription_payment', {
    p_tenant_id: tenantId,
    p_plan: plan,
    p_payment_method: paymentMethod,
    p_bank_origin: finalBank,
    p_phone_origin: finalPhone,
    p_payer_doc: cleanDoc,
    p_reference_last6: cleanRef,
    p_rate_bcv: Number(rateBcv) || 0
  });

  if (!rpcRes.error && rpcRes.data) {
    if (rpcRes.data.success === false) {
      throw new Error(rpcRes.data.error || 'No se pudo registrar el reporte de pago.');
    }
    if (rpcRes.data.payment) {
      return rpcRes.data.payment;
    }
  }

  // 3. Fallback directo a la tabla subscription_payments (compatible antes y después de migración SQL)
  const fullPayload = {
    tenant_id: tenantId,
    tenant_name: tenantName,
    plan,
    payment_method: paymentMethod,
    days_to_add: daysToAdd,
    amount_usd: Number(amountUsd),
    amount_bs: Number(amountBs),
    rate_bcv: Number(rateBcv),
    bank_origin: finalBank,
    phone_origin: finalPhone,
    payer_doc: cleanDoc,
    reference_last6: cleanRef,
    status: 'pending',
    verified_by: 'pending'
  };

  const res = await supabase
    .from('subscription_payments')
    .insert(fullPayload)
    .select()
    .single();

  if (res.error) {
    // Si la BD aún no tiene las columnas payment_method / payer_doc, reintentar con columnas base
    if (/column .* does not exist/i.test(res.error.message || '')) {
      const legacyRes = await supabase
        .from('subscription_payments')
        .insert({
          tenant_id: tenantId,
          tenant_name: tenantName,
          plan,
          days_to_add: daysToAdd,
          amount_usd: Number(amountUsd),
          amount_bs: Number(amountBs),
          rate_bcv: Number(rateBcv),
          bank_origin: finalBank,
          phone_origin: finalPhone,
          reference_last6: cleanRef,
          status: 'pending',
          verified_by: 'pending'
        })
        .select()
        .single();
      if (legacyRes.error && /uq_sub_payments_active_ref|duplicate key/i.test(legacyRes.error.message || '')) {
        throw new Error(`La referencia #${cleanRef} ya fue registrada anteriormente.`);
      }
      return unwrap(legacyRes);
    }
    if (/uq_sub_payments_active_ref|duplicate key/i.test(res.error.message || '')) {
      throw new Error(`La referencia #${cleanRef} ya fue registrada anteriormente.`);
    }
    throw new Error(res.error.message);
  }

  return res.data;
};

// Completa la verificación fiscal estilo Binance (1 prueba por RIF/Serial anti-abuso)
export const completeFiscalVerification = async ({
  tenantId,
  name,
  legalName,
  rif,
  fiscalAddress,
  phone,
  fiscalSerial,
  instagram
}) => {
  const cleanRif = formatRifSeniat(rif);
  if (!name || !name.trim()) {
    throw new Error('El Nombre Comercial del negocio es obligatorio.');
  }
  if (!legalName || !legalName.trim()) {
    throw new Error('La Razón Social SENIAT es obligatoria.');
  }
  if (cleanRif.replace(/[^A-Z0-9]/g, '').length < 8) {
    throw new Error('Ingresa un RIF válido (ejemplo: J-12345678-9).');
  }
  if (!fiscalAddress || !fiscalAddress.trim()) {
    throw new Error('El Domicilio Fiscal es obligatorio.');
  }

  const res = await supabase.rpc('complete_tenant_fiscal_verification', {
    p_tenant_id: tenantId,
    p_name: name.trim(),
    p_legal_name: legalName.trim(),
    p_rif: cleanRif,
    p_fiscal_address: fiscalAddress.trim(),
    p_phone: (phone || '').trim(),
    p_fiscal_serial: (fiscalSerial || '').trim().toUpperCase(),
    p_instagram: (instagram || '').trim()
  });

  if (!res.error && res.data?.success) {
    try {
      localStorage.setItem(`pos_fiscal_verified_${tenantId}`, 'true');
    } catch (e) {}
    return res.data.tenant;
  }

  // Si el RPC devolvió un error de negocio explícito (ej. RIF duplicado), lanzarlo
  if (res.data && res.data.success === false && res.data.error) {
    throw new Error(res.data.error);
  }

  // Fallback si la función RPC aún no existía en la base de datos de Supabase
  const directUpdate = await supabase
    .from('tenants')
    .update({
      name: name.trim(),
      legal_name: legalName.trim(),
      rif: cleanRif,
      fiscal_address: fiscalAddress.trim(),
      phone: (phone || '').trim(),
      fiscal_serial: (fiscalSerial || '').trim().toUpperCase(),
      instagram: (instagram || '').trim(),
      updated_at: new Date().toISOString()
    })
    .eq('id', tenantId)
    .select()
    .single();

  if (directUpdate.error) {
    throw new Error(res.error?.message || directUpdate.error.message || 'Error al verificar datos fiscales.');
  }

  try {
    localStorage.setItem(`pos_fiscal_verified_${tenantId}`, 'true');
  } catch (e) {}

  return {
    ...directUpdate.data,
    is_fiscal_verified: true
  };
};

// Actualiza los datos fiscales del negocio una vez verificado
export const updateTenantFiscalProfile = async (tenantId, updates) => {
  const res = await supabase
    .from('tenants')
    .update({
      name: updates.name,
      legal_name: updates.legal_name,
      rif: formatRifSeniat(updates.rif),
      fiscal_address: updates.fiscal_address,
      fiscal_serial: updates.fiscal_serial,
      phone: updates.phone,
      instagram: updates.instagram,
      updated_at: new Date().toISOString()
    })
    .eq('id', tenantId)
    .select()
    .single();

  return unwrap(res);
};
