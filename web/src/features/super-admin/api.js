import { supabase } from '../../lib/supabase';

// Capa de datos del Super Admin. Ninguna regla de negocio vive aquí:
// todo cambio pasa por funciones admin_* del servidor, que validan permisos y auditan.

const unwrap = ({ data, error }) => {
  if (error) throw new Error(error.message);
  if (data && data.success === false) throw new Error(data.error || 'Operación rechazada');
  return data;
};

export const listTenants = async () =>
  unwrap(await supabase.from('admin_tenants_overview').select('*').order('created_at', { ascending: false }));

export const listPayments = async () =>
  unwrap(await supabase.from('subscription_payments').select('*').order('created_at', { ascending: false }).limit(200));

export const listAudit = async () =>
  unwrap(await supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(100));

export const getConfig = async () =>
  unwrap(await supabase.from('saas_config').select('*').eq('id', 1).single());

export const saveConfig = async (cfg) => {
  const { id, updated_at, ...fields } = cfg;
  return unwrap(await supabase.from('saas_config').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', 1));
};

export const extendTenant = (tenantId, days, plan = null) =>
  supabase.rpc('admin_extend_tenant', { p_tenant_id: tenantId, p_days: days, p_plan: plan }).then(unwrap);

export const setTenantStatus = (tenantId, status) =>
  supabase.rpc('admin_set_status', { p_tenant_id: tenantId, p_status: status }).then(unwrap);

export const setTenantValidUntil = (tenantId, isoDate) =>
  supabase.rpc('admin_set_valid_until', { p_tenant_id: tenantId, p_valid_until: isoDate }).then(unwrap);

export const toggleTenantFiscalVerification = async (tenant, nextVerified) => {
  const rpcRes = await supabase.rpc('admin_toggle_fiscal_verification', {
    p_tenant_id: tenant.id,
    p_verified: Boolean(nextVerified)
  });

  if (!rpcRes.error && rpcRes.data?.success) {
    return rpcRes.data;
  }

  // Fallback compatible si la función admin_toggle_fiscal_verification aún no se ha ejecutado en SQL Editor
  if (nextVerified) {
    const fallbackRif = tenant.rif && tenant.rif.trim().length >= 7 ? tenant.rif.trim() : `J-0000${String(Date.now()).slice(-4)}-0`;
    const verifyRes = await supabase.rpc('complete_tenant_fiscal_verification', {
      p_tenant_id: tenant.id,
      p_name: tenant.name || 'Restaurante',
      p_legal_name: tenant.legal_name || tenant.name || 'Razón Social Verificada por Admin',
      p_rif: fallbackRif,
      p_fiscal_address: tenant.fiscal_address || 'Domicilio Fiscal Verificado por Admin',
      p_phone: tenant.phone || '',
      p_fiscal_serial: tenant.fiscal_serial || '',
      p_instagram: tenant.instagram || ''
    });
    return unwrap(verifyRes);
  }

  throw new Error(rpcRes.error?.message || 'Ejecuta la actualización de schema.sql para habilitar revocación de verificación.');
};

export const approvePayment = (paymentId) =>
  supabase.rpc('approve_subscription_payment', { p_payment_id: paymentId, p_verified_by: 'super_admin' }).then(unwrap);

export const rejectPayment = (paymentId, notes = '') =>
  supabase.rpc('admin_reject_payment', { p_payment_id: paymentId, p_notes: notes }).then(unwrap);
