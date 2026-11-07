import { supabase, isSupabaseConfigured, DEFAULT_SAAS_CONFIG } from './supabaseClient';
import { CLIENT_CONFIG } from '../config/clientConfig';

const TENANT_STORAGE_KEY = 'saas_active_tenant';
const CONFIG_STORAGE_KEY = 'saas_global_config';
const PAYMENTS_STORAGE_KEY = 'saas_subscription_payments';
const ALL_TENANTS_STORAGE_KEY = 'saas_all_tenants';
const CLOCK_GUARD_STORAGE_KEY = 'saas_clock_guard';

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

export function getCurrentTenant() {
  try {
    const raw = localStorage.getItem(TENANT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function computeLicenseSeal(t) {
  if (!t || !t.id) return '';
  const payload = `${t.id}:${t.owner_email}:${t.status}:${t.plan}:${t.valid_until}:facturasya_salt_ve_2026`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) - hash) + payload.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function setCurrentTenant(tenant) {
  if (!tenant) {
    localStorage.removeItem(TENANT_STORAGE_KEY);
    broadcastEvent({ type: 'ACTIVE_TENANT_CHANGED', tenant: null });
  } else {
    const sealedTenant = {
      ...tenant,
      license_seal: computeLicenseSeal(tenant)
    };
    localStorage.setItem(TENANT_STORAGE_KEY, JSON.stringify(sealedTenant));
    // Asegurar que exista en la lista general
    const list = getLocalTenantsList();
    const idx = list.findIndex((t) => t.id === tenant.id || t.owner_email === tenant.owner_email);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...sealedTenant };
    } else {
      list.unshift(sealedTenant);
    }
    localStorage.setItem(ALL_TENANTS_STORAGE_KEY, JSON.stringify(list));
    broadcastEvent({ type: 'ACTIVE_TENANT_CHANGED', tenant: sealedTenant });
    return sealedTenant;
  }
}

export function getSaasConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) return { ...DEFAULT_SAAS_CONFIG, ...JSON.parse(raw) };
  } catch (e) {}
  return DEFAULT_SAAS_CONFIG;
}

// ============================================================================
// SEGURIDAD DE RELOJ Y CÁLCULO DE LICENCIA EN BACKEND (ANTI-MANIPULACIÓN DE PC)
// ============================================================================
export function getClockGuard() {
  try {
    const raw = localStorage.getItem(CLOCK_GUARD_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    max_seen_ms: Date.now(),
    server_offset_ms: 0,
    last_server_sync_ms: null,
    server_now_iso: null
  };
}

export function updateClockGuard(serverNowIso = null) {
  const localNow = Date.now();
  const prev = getClockGuard();

  let serverOffsetMs = prev.server_offset_ms || 0;
  let effectiveNowMs = localNow + serverOffsetMs;

  if (serverNowIso) {
    const parsedServerMs = new Date(serverNowIso).getTime();
    if (!Number.isNaN(parsedServerMs) && parsedServerMs > 0) {
      serverOffsetMs = parsedServerMs - localNow;
      effectiveNowMs = parsedServerMs;
    }
  }

  // Tolerancia de 15 minutos por desajustes menores de batería CMOS
  const ROLLBACK_TOLERANCE_MS = 15 * 60 * 1000;
  const maxSeenMs = Math.max(prev.max_seen_ms || 0, localNow, effectiveNowMs);
  const isClockTampered = !serverNowIso && (localNow + ROLLBACK_TOLERANCE_MS < (prev.max_seen_ms || 0));

  const nextGuard = {
    max_seen_ms: maxSeenMs,
    server_offset_ms: serverOffsetMs,
    last_server_sync_ms: serverNowIso ? localNow : prev.last_server_sync_ms,
    server_now_iso: serverNowIso || prev.server_now_iso,
    is_tampered: isClockTampered
  };

  try {
    localStorage.setItem(CLOCK_GUARD_STORAGE_KEY, JSON.stringify(nextGuard));
  } catch (e) {}

  return nextGuard;
}

// Verifica los días restantes directamente en el Backend PostgreSQL de Supabase (función RPC verify_tenant_license)
export async function verifyLicenseWithBackend(tenantId) {
  const active = getCurrentTenant();
  const targetId = tenantId || active?.id;
  if (!targetId) return null;

  // 1. Si Supabase está configurado, el cálculo ocurre 100% en PostgreSQL usando NOW() del servidor
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.rpc('verify_tenant_license', {
        p_tenant_id: targetId
      });

      if (!error && data && data.success) {
        const guard = updateClockGuard(data.server_now);
        const current = getCurrentTenant();
        if (current && current.id === targetId) {
          const updatedTenant = {
            ...current,
            status: data.status || current.status,
            plan: data.plan || current.plan,
            name: data.name || current.name,
            legal_name: data.legal_name || current.legal_name,
            rif: data.rif || current.rif,
            fiscal_address: data.fiscal_address || current.fiscal_address,
            fiscal_serial: data.fiscal_serial || current.fiscal_serial,
            phone: data.phone || current.phone,
            instagram: data.instagram || current.instagram,
            is_fiscal_verified: typeof data.is_fiscal_verified === 'boolean' ? data.is_fiscal_verified : current.is_fiscal_verified,
            valid_until: data.valid_until || current.valid_until,
            server_days_remaining: data.days_remaining,
            server_raw_days_remaining: data.raw_days_remaining,
            server_is_expired: data.is_expired,
            server_verified_at: data.server_now,
            has_pending_payment: Boolean(data.has_pending_payment),
            pending_reference: data.pending_reference || '',
            has_recent_rejection: Boolean(data.has_recent_rejection),
            grace_active: Boolean(data.grace_active)
          };
          setCurrentTenant(updatedTenant);
          return { ...data, guard };
        }
        return { ...data, guard };
      }
    } catch (e) {
      console.warn('Verificación RPC en espera de conexión a internet, aplicando guardia monotónica local:', e);
    }
  }

  // 2. Si está offline o en modo local, actualizar la marca de agua monotónica para detectar atraso de reloj
  const guard = updateClockGuard(null);
  return {
    success: true,
    offline: true,
    guard
  };
}

// Calcula el estado exacto de la suscripción priorizando el veredicto del Backend + Guardia Anti-Atraso de Reloj
export function evaluateSubscriptionStatus(tenant, paymentsList = []) {
  if (!tenant) {
    return {
      isLinked: false,
      isExpired: false,
      shouldBlockPos: false,
      isGracePending: false,
      pendingReference: '',
      isSuspended: false,
      isClockTampered: false,
      isWarningSoon: false,
      daysRemaining: 14,
      plan: 'trial',
      statusLabel: 'Sin vincular'
    };
  }

  const guard = updateClockGuard(null);
  const isClockTampered = Boolean(guard.is_tampered);

  // Hora efectiva: usa el desfase oficial del servidor o la marca de agua máxima vista (impide ganar días atrasando el reloj de Windows)
  const effectiveNowMs = Math.max(
    Date.now() + (guard.server_offset_ms || 0),
    guard.max_seen_ms || Date.now()
  );

  const validUntilMs = tenant.valid_until
    ? new Date(tenant.valid_until).getTime()
    : effectiveNowMs + 14 * 86400 * 1000;

  const diffMs = validUntilMs - effectiveNowMs;
  const computedDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Si el backend de Supabase devolvió recientemente el cálculo oficial, respetarlo
  const daysRemaining = typeof tenant.server_days_remaining === 'number' && !isSupabaseConfigured() === false
    ? tenant.server_days_remaining
    : computedDays;

  // Candado de integridad: verificar si alguien alteró el localStorage manualmente
  const expectedSeal = computeLicenseSeal(tenant);
  const isSealTampered = Boolean(tenant.license_seal && tenant.license_seal !== expectedSeal);

  // Período de gracia offline máximo de 72 horas para instalaciones enlazadas a la nube
  const MAX_OFFLINE_GRACE_MS = 72 * 60 * 60 * 1000;
  const isOfflineGraceExceeded = Boolean(
    isSupabaseConfigured() &&
    guard.last_server_sync_ms &&
    (Date.now() - guard.last_server_sync_ms > MAX_OFFLINE_GRACE_MS)
  );

  const isSuspended = tenant.status === 'suspended';
  const isPastDue = tenant.status === 'past_due' || diffMs <= 0 || Boolean(tenant.server_is_expired);
  const isExpired = isSuspended || isPastDue || isClockTampered || isSealTampered || isOfflineGraceExceeded;
  const isWarningSoon = !isExpired && daysRemaining <= 3;

  // Evaluación de Pase de Cortesía en Verificación (24h) cuando reportó un Pago Móvil y no tiene rechazos recientes
  const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
  const recentPendingFromList = Array.isArray(paymentsList)
    ? paymentsList.find((p) => p.status === 'pending' && new Date(p.created_at).getTime() >= cutoff24h)
    : null;
  const hasRecentRejectionFromList = Array.isArray(paymentsList)
    ? paymentsList.some((p) => p.status === 'rejected' && new Date(p.verified_at || p.created_at).getTime() >= cutoff24h)
    : false;

  const isGracePending = Boolean(
    !isSuspended &&
    !isClockTampered &&
    !isSealTampered &&
    (tenant.grace_active || (Boolean(recentPendingFromList || tenant.has_pending_payment) && !hasRecentRejectionFromList && !tenant.has_recent_rejection))
  );

  const pendingReference = recentPendingFromList?.reference_last6 || tenant.pending_reference || '';
  const shouldBlockPos = isExpired && !isGracePending;

  let statusLabel = 'Activa';
  if (isClockTampered) statusLabel = 'Bloqueado: Reloj de Windows Atrasado';
  else if (isSealTampered) statusLabel = 'Bloqueado: Integridad de Licencia Violada';
  else if (isOfflineGraceExceeded) statusLabel = 'Bloqueado: Más de 72h Offline (Requiere Sincronización)';
  else if (isSuspended) statusLabel = 'Suspendida por Administración';
  else if (isExpired && isGracePending) statusLabel = `En Verificación Bancaria (Ref #${pendingReference || 'Pendiente'})`;
  else if (isExpired) statusLabel = 'Suscripción Vencida';
  else if (tenant.plan === 'trial') statusLabel = `Prueba Gratis (${Math.max(0, daysRemaining)} días restantes)`;
  else if (tenant.plan === 'annual') statusLabel = `Plan Anual (${Math.max(0, daysRemaining)} días restantes)`;
  else statusLabel = `Plan Mensual (${Math.max(0, daysRemaining)} días restantes)`;

  return {
    isLinked: true,
    isExpired,
    shouldBlockPos,
    isGracePending,
    pendingReference,
    isSuspended,
    isClockTampered,
    isSealTampered,
    isOfflineGraceExceeded,
    isFiscalVerified: Boolean(tenant.is_fiscal_verified),
    isWarningSoon,
    daysRemaining: Math.max(0, daysRemaining),
    rawDaysRemaining: daysRemaining,
    validUntilDate: new Date(validUntilMs),
    plan: tenant.plan || 'trial',
    serverVerifiedAt: tenant.server_verified_at || guard.server_now_iso || null,
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
      // Verificar licencia oficial contra el reloj del servidor de Supabase
      await verifyLicenseWithBackend(tenantRow.id);
      // Restaurar datos desde la nube si existen
      await pullCloudSnapshotToLocal(tenantRow.id);
      return getCurrentTenant() || tenantRow;
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
  referenceLast6
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
        status: 'pending',
        verified_by: 'pending'
      })
      .select()
      .single();

    if (dbErr) throw new Error(dbErr.message);

    // La aprobación NO ocurre aquí: la hace el servidor (API bancaria) o el Super Admin desde la web.
    return {
      success: true,
      status: 'PENDING_VERIFICATION',
      payment: inserted,
      message: 'Pago Móvil reportado. Tu servicio se activará automáticamente al verificarse la referencia.'
    };
  }

  // 2. Modo local sin Supabase: solo se registra el reporte (no se puede aprobar desde el POS)
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

  return {
    success: true,
    status: 'PENDING_VERIFICATION',
    payment: newPayment,
    message: 'Pago Móvil reportado. Tu servicio se activará automáticamente al verificarse la referencia.'
  };
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
