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

export const approvePayment = (paymentId) =>
  supabase.rpc('approve_subscription_payment', { p_payment_id: paymentId, p_verified_by: 'super_admin' }).then(unwrap);

export const rejectPayment = (paymentId, notes = '') =>
  supabase.rpc('admin_reject_payment', { p_payment_id: paymentId, p_notes: notes }).then(unwrap);
