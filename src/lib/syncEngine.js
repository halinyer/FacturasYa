import { supabase, isSupabaseConfigured, DEFAULT_SAAS_CONFIG } from './supabaseClient';
import { CLIENT_CONFIG } from '../config/clientConfig';

const TENANT_STORAGE_KEY = 'saas_active_tenant';
const CONFIG_STORAGE_KEY = 'saas_global_config';
const PAYMENTS_STORAGE_KEY = 'saas_subscription_payments';
const ALL_TENANTS_STORAGE_KEY = 'saas_all_tenants';

// Canal de tiempo real local (para sincronizar al instante entre pestañas/ventanas en la misma PC)
const realtimeChannel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('facturasya_saas_realtime')
  : null;

const listeners = new Set();

function notifyListeners(payload) {
  listeners.forEach((cb) => {
    try { cb(payload); } catch (e) {}
  });
}

if (realtimeChannel) {
  realtimeChannel.onmessage = (event) => {
    if (event.data) {
      notifyListeners(event.data);
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (
      e.key === TENANT_STORAGE_KEY ||
      e.key === ALL_TENANTS_STORAGE_KEY ||
      e.key === PAYMENTS_STORAGE_KEY ||
      e.key === CONFIG_STORAGE_KEY
    ) {
      notifyListeners({ type: 'STORAGE_UPDATED', key: e.key });
    }
  });
}

function broadcastEvent(data) {
  if (realtimeChannel) {
    try { realtimeChannel.postMessage(data); } catch (e) {}
  }
  notifyListeners(data);
}

// Inicializar lista de tenants de demostración si está vacía
export function getLocalTenantsList() {
  try {
    const raw = localStorage.getItem(ALL_TENANTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  const defaultValidUntil = new Date(Date.now() + 14 * 86400 * 1000).toISOString();
  const initialTenants = [
    {
      id: 'tenant_happydays_01',
      owner_email: 'admin@happydays.com',
      name: CLIENT_CONFIG?.name || 'Happy Days',
      slug: 'happy-days',
      rif: CLIENT_CONFIG?.rif || 'J-50123456-0',
      phone: '0412-5551234',
      plan: 'trial',
      status: 'active',
      valid_until: defaultValidUntil,
      branding: {
        logoText: CLIENT_CONFIG?.branding?.logoText || 'Happy Days',
        primaryColor: CLIENT_CONFIG?.branding?.colors?.primary || '#D52829'
      },
      exchange_rate: 876.80,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'tenant_heladoscali_02',
      owner_email: 'admin@heladoscali.com',
      name: 'Helados Cali',
      slug: 'helados-cali',
      rif: 'J-40987654-1',
      phone: '0414-9998877',
      plan: 'monthly',
      status: 'active',
      valid_until: new Date(Date.now() + 22 * 86400 * 1000).toISOString(),
      branding: {
        logoText: 'Helados Cali',
        primaryColor: '#0284c7'
      },
      exchange_rate: 876.80,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  localStorage.setItem(ALL_TENANTS_STORAGE_KEY, JSON.stringify(initialTenants));
  return initialTenants;
}

export function saveLocalTenantsList(list) {
  localStorage.setItem(ALL_TENANTS_STORAGE_KEY, JSON.stringify(list));
  // Si el tenant activo está en la lista, sincronizarlo también
  const active = getCurrentTenant();
  if (active) {
    const updatedActive = list.find((t) => t.id === active.id || t.owner_email === active.owner_email);
    if (updatedActive) {
      localStorage.setItem(TENANT_STORAGE_KEY, JSON.stringify(updatedActive));
    }
  }
  broadcastEvent({ type: 'TENANTS_UPDATED', tenants: list });
}

export function getCurrentTenant() {
  try {
    const raw = localStorage.getItem(TENANT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function setCurrentTenant(tenant) {
  if (!tenant) {
    localStorage.removeItem(TENANT_STORAGE_KEY);
  } else {
    localStorage.setItem(TENANT_STORAGE_KEY, JSON.stringify(tenant));
    // Asegurar que exista en la lista general
    const list = getLocalTenantsList();
    const idx = list.findIndex((t) => t.id === tenant.id || t.owner_email === tenant.owner_email);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...tenant };
    } else {
      list.unshift(tenant);
    }
    localStorage.setItem(ALL_TENANTS_STORAGE_KEY, JSON.stringify(list));
  }
  broadcastEvent({ type: 'ACTIVE_TENANT_CHANGED', tenant });
}

export function getSaasConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) return { ...DEFAULT_SAAS_CONFIG, ...JSON.parse(raw) };
  } catch (e) {}
  return DEFAULT_SAAS_CONFIG;
}

export async function saveSaasConfig(newCfg) {
  const merged = { ...getSaasConfig(), ...newCfg, updated_at: new Date().toISOString() };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(merged));

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('saas_config').upsert({ id: 1, ...merged });
    } catch (e) {
      console.warn('Error guardando saas_config en Supabase:', e);
    }
  }
  broadcastEvent({ type: 'CONFIG_UPDATED', config: merged });
  return merged;
}

// Calcula el estado exacto de la suscripción (Días restantes, aviso <= 3 días y bloqueo Kill Switch)
export function evaluateSubscriptionStatus(tenant) {
  if (!tenant) {
    return {
      isLinked: false,
      isExpired: false,
      isSuspended: false,
      isWarningSoon: false,
      daysRemaining: 14,
      statusLabel: 'Sin vincular'
    };
  }

  const now = Date.now();
  const validUntilMs = tenant.valid_until ? new Date(tenant.valid_until).getTime() : now + 14 * 86400 * 1000;
  const diffMs = validUntilMs - now;
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const isSuspended = tenant.status === 'suspended';
  const isPastDue = tenant.status === 'past_due' || diffMs <= 0;
  const isExpired = isSuspended || isPastDue;
  const isWarningSoon = !isExpired && daysRemaining <= 3;

  let statusLabel = 'Activa';
  if (isSuspended) statusLabel = 'Suspendida por Administración';
  else if (isExpired) statusLabel = 'Suscripción Vencida';
  else if (tenant.plan === 'trial') statusLabel = `Prueba Gratis (${daysRemaining} días restantes)`;
  else if (tenant.plan === 'annual') statusLabel = `Plan Anual (${daysRemaining} días restantes)`;
  else statusLabel = `Plan Mensual (${daysRemaining} días restantes)`;

  return {
    isLinked: true,
    isExpired,
    isSuspended,
    isWarningSoon,
    daysRemaining: Math.max(0, daysRemaining),
    rawDaysRemaining: daysRemaining,
    validUntilDate: new Date(validUntilMs),
    statusLabel
  };
}

// Iniciar sesión de restaurante (Conecta con Supabase si está configurado, o valida en local)
export async function loginTenantAccount(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw new Error('Ingresa el correo y contraseña del restaurante.');
  }

  if (isSupabaseConfigured() && supabase) {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });
    if (authErr) throw new Error(authErr.message);

    // Buscar tenant en Supabase
    const { data: tenantRow, error: tenantErr } = await supabase
      .from('tenants')
      .select('*')
      .eq('owner_email', cleanEmail)
      .maybeSingle();

    if (tenantErr) throw new Error(tenantErr.message);

    if (tenantRow) {
      setCurrentTenant(tenantRow);
      // Restaurar datos desde la nube si existen
      await pullCloudSnapshotToLocal(tenantRow.id);
      return tenantRow;
    }
  }

  // Modo Local / Híbrido
  const list = getLocalTenantsList();
  let found = list.find((t) => (t.owner_email || '').toLowerCase() === cleanEmail);

  if (!found) {
    // Si ingresa un correo nuevo en modo demo, crear el tenant con 14 días de prueba
    found = {
      id: 'tenant_' + Date.now(),
      owner_email: cleanEmail,
      name: cleanEmail.split('@')[0].toUpperCase(),
      slug: cleanEmail.split('@')[0].toLowerCase(),
      rif: 'J-50000000-1',
      phone: '',
      plan: 'trial',
      status: 'active',
      valid_until: new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
      branding: {
        logoText: CLIENT_CONFIG?.branding?.logoText || 'FacturaPOS',
        primaryColor: '#D52829'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  setCurrentTenant(found);
  return found;
}

// Registrar un nuevo restaurante con 14 días de prueba gratis
export async function registerTenantAccount({ businessName, rif, phone, email, password }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!businessName || !cleanEmail || !password) {
    throw new Error('Completa el nombre del negocio, correo y contraseña.');
  }

  if (isSupabaseConfigured() && supabase) {
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          business_name: businessName.trim(),
          rif: (rif || 'J-00000000-0').trim().toUpperCase(),
          phone: (phone || '').trim()
        }
      }
    });

    if (signUpErr) throw new Error(signUpErr.message);

    // Consultar el tenant recién creado por el trigger
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('*')
      .eq('owner_email', cleanEmail)
      .maybeSingle();

    if (tenantRow) {
      setCurrentTenant(tenantRow);
      return tenantRow;
    }
  }

  // Creación local inmediata con 14 días de prueba gratis
  const newTenant = {
    id: 'tenant_' + Date.now(),
    owner_email: cleanEmail,
    name: businessName.trim(),
    slug: businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    rif: (rif || 'J-00000000-0').trim().toUpperCase(),
    phone: (phone || '').trim(),
    plan: 'trial',
    status: 'active',
    valid_until: new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
    branding: {
      logoText: businessName.trim(),
      primaryColor: '#D52829'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  setCurrentTenant(newTenant);
  return newTenant;
}

// Obtener historial de pagos de suscripción
export function getSubscriptionPayments() {
  try {
    const raw = localStorage.getItem(PAYMENTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

// Reportar un Pago Móvil desde el POS o desde el panel del dueño
export async function submitPagoMovilReport({
  tenantId,
  tenantName,
  plan = 'monthly',
  amountUsd,
  amountBs,
  rateBcv,
  bankOrigin,
  phoneOrigin,
  referenceLast6,
  autoApproveSimulation = false
}) {
  const cleanRef = String(referenceLast6 || '').replace(/\D/g, '').slice(-6);
  if (!bankOrigin || !phoneOrigin || cleanRef.length < 4) {
    throw new Error('Ingresa el banco emisor, teléfono y los últimos 6 dígitos de la referencia.');
  }

  const existingPayments = getSubscriptionPayments();
  const duplicate = existingPayments.find(
    (p) => p.reference_last6 === cleanRef && p.bank_origin === bankOrigin && p.status !== 'rejected'
  );
  if (duplicate) {
    throw new Error(`La referencia #${cleanRef} ya fue registrada anteriormente.`);
  }

  const daysToAdd = plan === 'annual' ? 365 : 30;

  // 1. Si Supabase está configurado, invocar la Edge Function o insertar en tabla
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('verify-pago-movil', {
        body: {
          tenantId,
          tenantName,
          plan,
          amountUsd,
          amountBs,
          rateBcv,
          bankOrigin,
          phoneOrigin,
          referenceLast6: cleanRef
        }
      });

      if (!error && data && data.success) {
        return data;
      }
    } catch (e) {
      console.warn('Edge function fallback a inserción directa en tabla:', e);
    }

    const { data: inserted, error: dbErr } = await supabase
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
        phone_origin: phoneOrigin,
        reference_last6: cleanRef,
        status: autoApproveSimulation ? 'approved' : 'pending'
      })
      .select()
      .single();

    if (dbErr) throw new Error(dbErr.message);

    if (autoApproveSimulation && inserted) {
      await supabase.rpc('approve_subscription_payment', {
        p_payment_id: inserted.id,
        p_verified_by: 'api_auto'
      });
    }
  }

  // 2. Guardar registro en almacenamiento local / espejo y notificar en tiempo real
  const newPayment = {
    id: 'pay_' + Date.now(),
    tenant_id: tenantId,
    tenant_name: tenantName,
    plan,
    days_to_add: daysToAdd,
    amount_usd: Number(amountUsd),
    amount_bs: Number(amountBs),
    rate_bcv: Number(rateBcv),
    bank_origin: bankOrigin,
    phone_origin: phoneOrigin,
    reference_last6: cleanRef,
    status: 'pending',
    verified_by: 'pending',
    created_at: new Date().toISOString()
  };

  const updatedPayments = [newPayment, ...existingPayments];
  localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(updatedPayments));
  broadcastEvent({ type: 'PAYMENT_REPORTED', payment: newPayment });

  // Si se activó la validación automática (API Bancaria Pabilo/Cobrix simulada o activa)
  if (autoApproveSimulation) {
    return approveSubscriptionPayment(newPayment.id, 'api_auto');
  }

  return {
    success: true,
    status: 'PENDING_VERIFICATION',
    payment: newPayment,
    message: 'Pago Móvil reportado. Tu servicio se activará automáticamente en segundos al verificarse la referencia.'
  };
}

// Aprobar un Pago Móvil (desde API automática o desde tu botón en Super Admin)
export async function approveSubscriptionPayment(paymentId, verifiedBy = 'super_admin') {
  const payments = getSubscriptionPayments();
  const idx = payments.findIndex((p) => p.id === paymentId);
  if (idx === -1) throw new Error('Pago no encontrado.');

  const payment = payments[idx];
  const daysToAdd = Number(payment.days_to_add) || (payment.plan === 'annual' ? 365 : 30);

  payments[idx] = {
    ...payment,
    status: 'approved',
    verified_by: verifiedBy,
    verified_at: new Date().toISOString()
  };
  localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));

  // Extender la fecha del restaurante
  const updatedTenant = await extendTenantSubscription(payment.tenant_id, daysToAdd, payment.plan);

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.rpc('approve_subscription_payment', {
        p_payment_id: paymentId,
        p_verified_by: verifiedBy
      });
    } catch (e) {}
  }

  broadcastEvent({
    type: 'PAYMENT_APPROVED',
    payment: payments[idx],
    tenant: updatedTenant
  });

  return {
    success: true,
    status: 'APPROVED',
    payment: payments[idx],
    tenant: updatedTenant
  };
}

// Extender días o cambiar estado de un restaurante (Super Admin / Kill Switch)
export async function extendTenantSubscription(tenantId, daysToAdd = 30, newPlan = 'monthly') {
  const list = getLocalTenantsList();
  const idx = list.findIndex((t) => t.id === tenantId);
  const currentActive = getCurrentTenant();

  let target = idx >= 0 ? list[idx] : currentActive;
  if (!target) return null;

  const now = Date.now();
  const currentValidMs = target.valid_until ? new Date(target.valid_until).getTime() : now;
  const baseMs = currentValidMs > now ? currentValidMs : now;
  const newValidUntil = new Date(baseMs + daysToAdd * 86400 * 1000).toISOString();

  const updated = {
    ...target,
    plan: newPlan || target.plan,
    status: 'active',
    valid_until: newValidUntil,
    updated_at: new Date().toISOString()
  };

  if (idx >= 0) {
    list[idx] = updated;
    saveLocalTenantsList(list);
  }
  if (currentActive && currentActive.id === updated.id) {
    setCurrentTenant(updated);
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase
        .from('tenants')
        .update({
          plan: updated.plan,
          status: 'active',
          valid_until: newValidUntil,
          updated_at: updated.updated_at
        })
        .eq('id', tenantId);
    } catch (e) {}
  }

  broadcastEvent({ type: 'TENANT_UNLOCKED', tenant: updated });
  return updated;
}

// Activar o desactivar el Kill Switch (Suspender / Vencer / Reactivar)
export async function updateTenantStatus(tenantId, newStatus, customValidUntil = null) {
  const list = getLocalTenantsList();
  const idx = list.findIndex((t) => t.id === tenantId);
  const currentActive = getCurrentTenant();

  let target = idx >= 0 ? list[idx] : currentActive;
  if (!target) return null;

  const updated = {
    ...target,
    status: newStatus,
    valid_until: customValidUntil || target.valid_until,
    updated_at: new Date().toISOString()
  };

  if (idx >= 0) {
    list[idx] = updated;
    saveLocalTenantsList(list);
  }
  if (currentActive && currentActive.id === updated.id) {
    setCurrentTenant(updated);
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase
        .from('tenants')
        .update({
          status: updated.status,
          valid_until: updated.valid_until,
          updated_at: updated.updated_at
        })
        .eq('id', tenantId);
    } catch (e) {}
  }

  broadcastEvent({ type: 'TENANT_STATUS_CHANGED', tenant: updated });
  return updated;
}

// Suscribirse a cambios en tiempo real (Supabase Realtime + BroadcastChannel local)
export function subscribeToSaasRealtime(tenantId, callback) {
  listeners.add(callback);

  let supaSubscription = null;
  if (isSupabaseConfigured() && supabase && tenantId) {
    supaSubscription = supabase
      .channel(`tenant_realtime_${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenants', filter: `id=eq.${tenantId}` },
        (payload) => {
          if (payload.new) {
            setCurrentTenant(payload.new);
            callback({ type: 'SUPABASE_TENANT_UPDATE', tenant: payload.new });
          }
        }
      )
      .subscribe();
  }

  return () => {
    listeners.delete(callback);
    if (supaSubscription && supabase) {
      supabase.removeChannel(supaSubscription);
    }
  };
}

// Respaldo automático PC -> Nube (Supabase tenant_snapshots)
export async function pushLocalSnapshotToCloud(snapshotData) {
  const tenant = getCurrentTenant();
  if (!tenant) return false;

  // Guardar copia local para el monitor web local
  try {
    localStorage.setItem(`saas_snapshot_${tenant.id}`, JSON.stringify({
      ...snapshotData,
      updated_at: new Date().toISOString()
    }));
    broadcastEvent({ type: 'SNAPSHOT_UPDATED', tenantId: tenant.id });
  } catch (e) {}

  if (!isSupabaseConfigured() || !supabase) return false;

  try {
    await supabase.from('tenant_snapshots').upsert({
      tenant_id: tenant.id,
      products: snapshotData.products || [],
      clients: snapshotData.clients || [],
      invoices: (snapshotData.invoices || []).slice(0, 500),
      purchases: (snapshotData.purchases || []).slice(0, 200),
      payments: (snapshotData.payments || []).slice(0, 300),
      cash_closes: (snapshotData.cashCloses || []).slice(0, 100),
      open_tabs: snapshotData.openTabs || [],
      expenses: (snapshotData.expenses || []).slice(0, 200),
      inventory: snapshotData.inventory || [],
      inventory_logs: (snapshotData.inventoryLogs || []).slice(0, 200),
      z_reports: (snapshotData.zReports || []).slice(0, 200),
      exchange_rate: Number(snapshotData.exchangeRate) || 876.80,
      updated_at: new Date().toISOString()
    });
    return true;
  } catch (e) {
    console.warn('Sync a Supabase en cola (sin internet):', e);
    return false;
  }
}

// Restaurar datos Nube -> PC (Cuando el cliente cambia o formatea la PC e inicia sesión)
export async function pullCloudSnapshotToLocal(tenantId) {
  if (!isSupabaseConfigured() || !supabase || !tenantId) return null;
  try {
    const { data, error } = await supabase
      .from('tenant_snapshots')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch (e) {
    return null;
  }
}
