# Estructura del repo y despliegue (rama `saas/cloud`)

```
/                  ← POS Electron (instalable en el local)
├─ src/ electron/ fiscal_service/ ...
├─ supabase/       ← schema.sql + Edge Functions (compartido POS + web)
├─ web/            ← Landing, Monitor del dueño, Super Admin (sitio web)
└─ docs/
```

Ramas: `cliente/happy-days` y `cliente/helados-cali` NO se tocan. Todo lo SaaS vive en `saas/cloud`.

## Qué se despliega y dónde
| Pieza | Carpeta | Destino | Cómo |
|---|---|---|---|
| POS | `/` | GitHub Releases | `npm run electron:build` → subir `Setup.exe` al Release |
| Web | `web/` | Vercel / Cloudflare Pages | Root Directory = `web`, build `npm run build`, output `dist` |
| BD + funciones | `supabase/` | Supabase | SQL Editor con `schema.sql`; `supabase functions deploy verify-pago-movil` |

## Reglas
- En `web/` y el POS solo la `anon key`. `service_role` y llaves de Pabilo/Cobrix van como *secrets* de Supabase.
- Dos proyectos Supabase: `pruebas` y `produccion`.
- Antes de vender: endurecer RLS (cada dueño solo lo suyo; super-admin solo tú). Se hace en la Pieza 2.
- Vercel: configurar "Ignored Build Step" para que cambios solo del POS no redespliegue la web.
