# 🧠 Contexto Maestro de FacturasYa (POS + SaaS Cloud + Fiscal SENIAT) — Especialista en Suscripciones

Este documento contiene el mapa arquitectónico completo de **FacturasYa** hasta la fecha (`commit c1817bb`) para que cualquier nuevo contexto o agente pueda encargarse del **Módulo de Suscripciones, Pagos y Licenciamiento** sin perder ningún detalle de lo que hace la aplicación.

---

## 1. Visión General de la Aplicación
**FacturasYa** es un ecosistema híbrido **SaaS Cloud (React + Vite + Supabase + Vercel)** y **Desktop para Windows (`.exe` con Electron + PowerShell + `TfhkaNet.dll`)** diseñado para restaurantes, heladerías y comercios en Venezuela con diseño estilo **Notion Minimalista**.

### Stack y Ramas Git
- **Ruta del repositorio**: `c:\Users\halin\OneDrive\Escritorio\Finanzas personales\facturacion-pos`
- **Ramas activas (sincronizadas)**: `saas/cloud` y `main` (hacer push a ambas: `git push origin saas/cloud` y `git push origin saas/cloud:main`).
- **Frontend Unificado (`web/`)**: React 18 + Tailwind CSS v4 + Lucide Icons. Este mismo código `web/` es el que se despliega en Vercel y también el que se empaqueta dentro del ejecutable `.exe` de Electron mediante [`scripts/build.cjs`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/scripts/build.cjs).
- **CI/CD Desktop**: [`.github/workflows/release-desktop.yml`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/.github/workflows/release-desktop.yml) compila `FacturaPOS-1.0.0.exe` y estampa `BUILD_SHA:<commit>` en el Release de GitHub (`latest`) para que las PCs instaladas detecten actualizaciones automáticamente al comparar con `dist/build-info.json`.

---

## 2. Qué Hace la Aplicación Actualmente (Módulos Completados)

1. **Punto de Venta Split-View ([`WebPosView.jsx`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/web/src/features/pos/WebPosView.jsx))**:
   - Cobro multimoneda USD / Bs con tasa BCV en vivo ([`TopBarRate.jsx`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/web/src/features/app-shell/TopBarRate.jsx)).
   - Métodos de pago venezolanos: Efectivo USD (con cálculo automático de **IGTF 3%**), Pago Móvil (bancos SUDEBAN + validación de referencia), Punto de Venta, Zelle y Pago Mixto.
   - Emisión de Factura Fiscal (HKA80) o Nota de Entrega, más comanda térmica aislada 58mm / 80mm ([`KitchenTicketModal.jsx`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/web/src/features/pos/KitchenTicketModal.jsx)).
2. **Mesas, Salón y Comandero Móvil para Meseros**:
   - Gestión de zonas (Salón, Terraza, Barra), cuentas abiertas y envío a cocina en [`TablesView.jsx`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/web/src/features/tables/TablesView.jsx).
   - **Servidor LAN en Electron (`http://<IP_CAJA>:3847/mesero`)**: Renderizado por [`electron/waiterView.cjs`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/electron/waiterView.cjs) con estilo Notion para que los meseros tomen pedidos desde tablets/teléfonos por Wi-Fi local sin consumir internet, con gestión de cuentas/PIN de meseros en [`WaitersDrawerModal.jsx`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/web/src/features/tables/WaitersDrawerModal.jsx).
3. **Puente Fiscal SENIAT HKA80 (⚠️ INTOCABLE / PROTEGIDO)**:
   - [`electron/fiscalPrinterService.cjs`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/electron/fiscalPrinterService.cjs), [`electron/fiscalBridge.ps1`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/electron/fiscalBridge.ps1) y `electron/lib/TfhkaNet.dll`.
   - Soporta Factura Fiscal, Nota de Crédito, Reporte X, Cierre Z, Lectura de Estado `S1` y **Auditoría de Memoria Fiscal Z por rango de fechas/números (`U2`/`U3`)** para el contador en [`FiscalMemoryModal.jsx`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/web/src/pos-core/components/cashClose/FiscalMemoryModal.jsx) y [`FiscalBooksView.jsx`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/web/src/features/fiscal/FiscalBooksView.jsx).
4. **Verificación Fiscal Híbrida SENIAT y Soporte Multi-Caja**:
   - Lectura automática del RIF y Serial Fiscal desde el chip `S1` de la HKA80, formulario manual asistido con protección anti-abuso (`complete_tenant_fiscal_verification`), y aprobación en 1 clic desde Super Admin (`admin_toggle_fiscal_verification`).
   - Cada PC física guarda su identidad (`CAJA-01`, `CAJA-02`, puerto COM y `fiscalSerial`) en `localStorage['facturasya_terminal_config_v1']` mediante [`web/src/features/monitor/api.js`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/web/src/features/monitor/api.js).
5. **Sincronización Offline-First a la Nube**:
   - [`web/src/pos-core/lib/syncEngine.js`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/web/src/pos-core/lib/syncEngine.js) sincroniza `tenant_snapshots` (productos, clientes, facturas, compras, cierres de caja, reportes Z, inventario y mesas abiertas) hacia Supabase en tiempo real.

---

## 3. Estado Actual del Módulo de Suscripciones (Lo que debes conocer y evolucionar)

### A. Base de Datos y RPCs en [`supabase/schema.sql`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/supabase/schema.sql)
1. **Tabla `public.tenants`**:
   - Campos de suscripción:
     - `plan TEXT NOT NULL DEFAULT 'trial'` (`'trial' | 'monthly' | 'annual'`)
     - `status TEXT NOT NULL DEFAULT 'trial'` (`'trial' | 'active' | 'past_due' | 'suspended'`)
     - `trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days')`
     - `valid_until TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days')`
     - `monthly_price_usd NUMERIC(10,2) DEFAULT 20.00`
     - `annual_price_usd NUMERIC(10,2) DEFAULT 300.00`
     - `is_fiscal_verified BOOLEAN NOT NULL DEFAULT false`
2. **Tabla `public.saas_config` (Fila única `id = 1`)**:
   - Define precios globales (`monthly_price_usd`, `annual_price_usd`), `bcv_rate`, y datos receptores de Pago Móvil (`pago_movil_bank`, `pago_movil_phone`, `pago_movil_rif_ci`).
3. **Tabla `public.subscription_payments`**:
   - Campos: `id`, `tenant_id`, `tenant_name`, `plan` (`'monthly' | 'annual'`), `amount_usd`, `amount_bs`, `bcv_rate`, `bank_origin`, `phone_origin`, `reference_last6`, `payment_date`, `status` (`'pending' | 'approved' | 'rejected'`), `verified_by`, `verified_at`, `notes`, `created_at`.
4. **Funciones RPC de Suscripción en Supabase**:
   - `approve_subscription_payment(p_payment_id UUID, p_verified_by TEXT)`: Marca el pago como `'approved'`, suma `+30 days` (mensual) o `+365 days` (anual) a `tenants.valid_until` (partiendo de `GREATEST(valid_until, NOW())`), cambia `status = 'active'` y registra auditoría en `admin_audit_log`.
   - `admin_reject_payment(p_payment_id UUID, p_notes TEXT)`: Marca el pago como `'rejected'`.
   - `admin_extend_tenant(p_tenant_id UUID, p_days INT, p_plan TEXT)`: Extiende o resta días manualmente (`+7d`, `+30d`, `+365d`).
   - `admin_set_status(p_tenant_id UUID, p_status TEXT)`: Cambia el estatus entre `'trial'`, `'active'`, `'past_due'`, `'suspended'`.
   - `admin_set_valid_until(p_tenant_id UUID, p_valid_until TIMESTAMPTZ)`: Fija una fecha de corte exacta.

### B. Archivos Frontend y Electron Involucrados en Suscripciones
1. **Vista del Dueño / Comercio**:
   - [`web/src/features/monitor/OwnerMonitorPage.jsx`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/web/src/features/monitor/OwnerMonitorPage.jsx) (Pestaña `subscription` y Modal de Pago Móvil directo usando `submitOwnerPagoMovil` de [`web/src/features/monitor/api.js`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/web/src/features/monitor/api.js)).
   - [`web/src/features/settings/NotionSettingsModal.jsx`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/web/src/features/settings/NotionSettingsModal.jsx) (Pestaña `subscription`: `Plan & Suscripción`).
   - [`web/src/features/app-shell/AppShell.jsx`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/web/src/features/app-shell/AppShell.jsx) (Cálculo de `subStatus`: `daysRemaining`, `isExpired`, `plan`).
2. **Vista del Super Admin (`/admin`)**:
   - [`web/src/features/super-admin/SuperAdminPage.jsx`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/web/src/features/super-admin/SuperAdminPage.jsx)
   - [`web/src/features/super-admin/TenantsPanel.jsx`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/web/src/features/super-admin/TenantsPanel.jsx) (Control de planes, días restantes, extensión rápida `+7d`, `+30d`, `+1a`, suspensión/reactivación).
   - [`web/src/features/super-admin/PaymentsPanel.jsx`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/web/src/features/super-admin/PaymentsPanel.jsx) (Cola de aprobación/rechazo de Pagos Móviles con detector de referencias duplicadas).
   - [`web/src/features/super-admin/ConfigPanel.jsx`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/web/src/features/super-admin/ConfigPanel.jsx) (Ajuste global de precios USD, tasa BCV y cuenta receptora de Pago Móvil).
3. **Servicio de Licencia Local en Electron**:
   - [`electron/licenseService.cjs`](file:///c:/Users/halin/OneDrive/Escritorio/Finanzas%20personales/facturacion-pos/electron/licenseService.cjs): Verifica el estado de la suscripción del restaurante y almacena caché firmada localmente para permitir operación offline temporal sin bloquear una caja a mitad de turno si cae el internet, pero bloqueando cuando la licencia está vencida o suspendida.

### C. Mejoras Completadas en el Módulo de Suscripciones (Bancamiga P2P + Binance Pay + Kill Switch)
1. **Unificación Total del Checkout (`NotionSettingsModal.jsx` + `OwnerMonitorPage.jsx` + `api.js`)**:
   - Tanto el modal de ajustes en el POS como el Monitor del Dueño usan `submitOwnerPagoMovil` conectado a `saas_config` en vivo y al nuevo RPC seguro `report_subscription_payment` (con autoridad de precio en el servidor).
   - Soporte dual **Pago Móvil (Bs a tasa BCV)** y **Binance Pay (USDT sin límites)** para evitar bloqueos por límite diario P2P en el Plan Anual ($300).
   - Incluye campo de Cédula/RIF del titular emisor (`payer_doc`), botones para copiar teléfono/RIF/monto exacto en Bs y tabla de historial con notas de rechazo.
2. **Paywall Inteligente ("Kill Switch"), Aviso de 3 Días y Pase de Cortesía 24h (`AppShell.jsx` + `syncEngine.js`)**:
   - Verificación contra el reloj oficial del servidor (`verify_tenant_license`) y suscripción **Supabase Realtime** sobre `tenants` y `subscription_payments`.
   - **Banner Preventivo (`<= 3 días`)** y **Pase de Cortesía en Verificación (24h)** (`isGracePending`) cuando el restaurante vencido reporta un Pago Móvil válido y sin rechazos recientes, evitando frenar la caja un viernes o sábado por la noche mientras el Super Admin aprueba en `/admin`.
   - **Kill Switch (Paywall Notion Minimalista)** cuando `shouldBlockPos === true`, permitiendo reportar el pago ahí mismo o consultar los Libros SENIAT resguardados.
3. **Panel Super Admin Mejorado (`PaymentsPanel.jsx` + `ConfigPanel.jsx`)**:
   - Filtros por estatus (`Todos`, `Pendientes`, `Aprobados`, `Rechazados`), buscador, insignia de canal (`Pago Móvil` vs `Binance Pay`), Cédula/RIF emisor, botón de copiar referencia, enlace directo al WhatsApp del comercio y vista previa en vivo del Checkout en `ConfigPanel.jsx`.
