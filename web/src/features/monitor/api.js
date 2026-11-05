import { supabase } from '../../lib/supabase';

const unwrap = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

// Obtiene el restaurante asociado a la cuenta del dueño autenticado
export const fetchMyTenant = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Buscar si es dueño directo
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (tenant) return tenant;

  // 2. Si no encontró por owner_id, buscar por owner_email
  if (user.email) {
    const { data: byEmail } = await supabase
      .from('tenants')
      .select('*')
      .eq('owner_email', user.email.toLowerCase())
      .maybeSingle();
    if (byEmail) return byEmail;
  }

  // 3. Si el usuario es Super Admin, puede consultar el primer tenant para visualización
  const { data: isAdmin } = await supabase.rpc('is_super_admin');
  if (isAdmin) {
    const { data: firstTenant } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return firstTenant;
  }

  return null;
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

// Reportar Pago Móvil desde el celular del dueño
export const submitOwnerPagoMovil = async ({
  tenantId,
  tenantName,
  plan,
  amountUsd,
  amountBs,
  rateBcv,
  bankOrigin,
  phoneOrigin,
  referenceLast6
}) => {
  const cleanRef = String(referenceLast6 || '').replace(/\D/g, '').slice(-6);
  if (!bankOrigin || !phoneOrigin || cleanRef.length < 4) {
    throw new Error('Completa el banco emisor, teléfono y los últimos 6 dígitos de la referencia.');
  }

  const daysToAdd = plan === 'annual' ? 365 : 30;

  const res = await supabase
    .from('subscription_payments')
    .insert({
      tenant_id: tenantId,
      tenant_name: tenantName,
      plan,
      days_to_add: daysToAdd,
      amount_usd: Number(amountUsd),
      amount_bs: Number(amountBs),
      rate_bcv: Number(rateBcv),
      bank_origin: bankOrigin,
      phone_origin: phoneOrigin.trim(),
      reference_last6: cleanRef,
      status: 'pending',
      verified_by: 'pending'
    })
    .select()
    .single();

  return unwrap(res);
};

// Completa la verificación fiscal estilo Binance (1 prueba por RIF anti-abuso)
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
  const res = await supabase.rpc('complete_tenant_fiscal_verification', {
    p_tenant_id: tenantId,
    p_name: name,
    p_legal_name: legalName,
    p_rif: rif,
    p_fiscal_address: fiscalAddress,
    p_phone: phone || '',
    p_fiscal_serial: fiscalSerial || '',
    p_instagram: instagram || ''
  });

  if (res.error) throw new Error(res.error.message);
  if (!res.data?.success) throw new Error(res.data?.error || 'Error al completar la verificación fiscal.');
  return res.data.tenant;
};

// Actualiza los datos fiscales del negocio una vez verificado
export const updateTenantFiscalProfile = async (tenantId, updates) => {
  const res = await supabase
    .from('tenants')
    .update({
      name: updates.name,
      legal_name: updates.legal_name,
      rif: updates.rif,
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
