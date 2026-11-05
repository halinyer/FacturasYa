# Mapa de Arquitectura & Runbook Operativo (Privado)

Este documento resume la arquitectura completa del ecosistema SaaS y sirve como guía rápida de referencia para mantenimiento y soporte.

---

## 1. Estructura de Carpetas (Las 4 Piezas)

```text
facturacion-pos/                 ← Raíz del repositorio Git
├─ src/                          ← Pieza 1: POS de Caja (React + Electron)
├─ electron/                     ← Proceso principal de Windows + Puente Fiscal (fiscalPrinterService.cjs)
├─ fiscal_service/               ← Código fuente Python de bridge_fiscal.exe (HKA80)
├─ bin/                          ← Ejecutable compilado bridge_fiscal.exe
├─ supabase/                     ← schema.sql + Edge Functions (Backend PostgreSQL)
├─ web/                          ← Aplicación Web desplegable en Vercel (Piezas 2, 3 y 4)
│  ├─ src/features/landing/      ← Pieza 4: Landing Pública (/)
│  ├─ src/features/monitor/      ← Pieza 3: Monitor Cloud del Dueño (/monitor)
│  └─ src/features/super-admin/  ← Pieza 2: Panel Super Admin (/super-admin + Runbook)
└─ docs/                         ← Documentación técnica privada
```

---

## 2. Mapa de Ramas de Git (Regla de Aislamiento)

| Rama | Propósito | Regla |
|---|---|---|
| `saas/cloud` | Producto SaaS Multi-Empresa (Supabase + Web + POS con Suscripción) | Todo el desarrollo del modelo de suscripción vive aquí. |
| `cliente/happy-days` | Versión local dedicada de Happy Days | **Intocable por el SaaS.** Solo se abre cuando Happy Days pide un cambio en pendrive. |
| `cliente/helados-cali` | Versión local dedicada de Helados Cali | **Intocable por el SaaS.** |

---

## 3. Principio de Cero Duplicación (Dónde vive cada regla)

| Responsabilidad | Archivo Único (Fuente de la Verdad) |
|---|---|
| **Quién es Super Admin** | `supabase/schema.sql` → tabla `public.super_admins` (`signalnotestudio@gmail.com`) + función `public.is_super_admin()` |
| **Cálculo de días restantes y vencimiento** | `supabase/schema.sql` → RPC `verify_tenant_license()` (usa `NOW()` del servidor) + `src/lib/syncEngine.js` (`saas_clock_guard` contra atraso de reloj en Windows) |
| **Aprobación de Pago Móvil y +30/+365 días** | `supabase/schema.sql` → RPC `approve_subscription_payment()` y `admin_extend_tenant()` |
| **Datos Fiscales SENIAT del negocio** | Tabla `public.tenants` → inyectada dinámicamente en `src/config/franchises/index.js` (`CLIENT_CONFIG`) para alimentar `seniatCsvExporter.js`, `TaxSummaryForma30.jsx` e `InvoicePreview.jsx` |
| **Comunicación con Máquina Fiscal HKA80** | `electron/fiscalPrinterService.cjs` + `bin/bridge_fiscal.exe` (con auto-reparación en `AppData/Roaming/facturacion-pos/bin`) |
| **Sincronización PC → Celular del Dueño** | `src/contexts/DataContext.jsx` → `pushLocalSnapshotToCloud()` → tabla `public.tenant_snapshots` |

---

## 4. Playbooks Paso a Paso (Recetario de Comandos)

### Caso 1: Compilar versión local en pendrive para Happy Days
```powershell
cd "c:\Users\halin\OneDrive\Escritorio\Finanzas personales\facturacion-pos"
git checkout cliente/happy-days
npm run electron:build
# Copiar dist-electron/win-unpacked al pendrive
```

### Caso 2: Compilar instalador SaaS para GitHub Releases
```powershell
cd "c:\Users\halin\OneDrive\Escritorio\Finanzas personales\facturacion-pos"
git checkout saas/cloud
npm run electron:build
```

### Caso 3: Correr la Web (Landing + Monitor + Super Admin) en local
```powershell
cd "c:\Users\halin\OneDrive\Escritorio\Finanzas personales\facturacion-pos\web"
npm run dev
# Abre http://localhost:5180
```


---

## 5. Flujo de Onboarding & Seguridad Anti-Abuso (Estilo Notion + Binance)

1. **Entrada Fricción-Cero (Landing `/`)**:
   - Registro en 5 segundos con solo `email` y `password` (estilo Notion).
   - Genera el inquilino en estado preliminar (`is_fiscal_verified = false`) y redirige de inmediato a `/monitor`.

2. **Verificación Progresiva (Monitor `/monitor`)**:
   - Banner y Modal de Verificación Fiscal estilo Binance KYC (`complete_tenant_fiscal_verification` RPC).
   - Exige RIF, Razón Social SENIAT, Domicilio Fiscal y Serial Máquina Fiscal HKA80 (opcional).
   - **Gating de Seguridad**: La descarga del instalador `.exe` permanece bloqueada hasta que la empresa complete la verificación fiscal.

3. **Candados Anti-Fraude Implementados**:
   - **1 Prueba Gratuita por RIF**: La función PostgreSQL `complete_tenant_fiscal_verification` normaliza el RIF y rechaza tenants duplicados para impedir crear cuentas infinitas de 14 días.
   - **Anti-Replay en Pago Móvil**: Índice único `uq_sub_payments_active_ref` en `public.subscription_payments` impide que dos clientes reporten la misma referencia bancaria del mismo banco.
   - **Sello de Integridad de Licencia**: `src/lib/syncEngine.js` firma el tenant local con `computeLicenseSeal()`. Modificar manualmente `localStorage` invalida la licencia.
   - **Límite Offline 72 Horas**: Si el POS pasa más de 72 horas sin sincronizar con Supabase, solicita conexión a internet para revalidar la licencia.
   - **Bloqueo de DevTools en Windows**: En versiones de producción de Electron (`electron/main.cjs`), se anula el atajo `F12` y `Ctrl+Shift+I/J`.
