# Agendix

Agendix es una aplicación web para gestión de agenda clínica, pacientes, reservas, profesionales, salas, servicios y portal público de agendamiento.

## Estado operacional: piloto productivo cerrado

Agendix debe tratarse como un piloto productivo cerrado con datos reales. Puede ser usado por centros seleccionados con pacientes reales solo si production esta separado de staging/demo, el modo demo esta apagado, RLS esta validado, no existen datos demo mezclados con datos reales, hay backups activos y los cambios pasan primero por Preview/Staging.

La guia operativa viva esta en [`docs/piloto-productivo.md`](docs/piloto-productivo.md). Antes de sumar centros o correr migraciones en production, revisa esa guia y ejecuta su checklist SQL.

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Supabase Auth, Database y Edge Functions
- Vercel para despliegue web

## Desarrollo local

```bash
npm install
npm run dev
```

La app queda disponible en `http://localhost:3000`.

## Variables de entorno

Crea un archivo `.env.local` usando `.env.example` como referencia:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-publishable-o-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MARKETING_URL=https://www.agendixchile.cl
```

`SUPABASE_SERVICE_ROLE_KEY` es sensible y solo debe configurarse en entornos server-side como Vercel o Supabase. No debe exponerse en el cliente.

En Vercel Production, configura `NEXT_PUBLIC_APP_URL=https://app.agendixchile.cl`. En desarrollo local puede quedar como `http://localhost:3000`.

### Demo controlada

El modo demo queda apagado por defecto en producción. Para una demo local puedes usar
`AGENDIX_DEMO_MODE=true`. Para activar demo en Vercel Preview o staging, configura
explícitamente `AGENDIX_DEMO_ENABLED=true` y
`NEXT_PUBLIC_AGENDIX_DEMO_ENABLED=true`. No actives estas variables en producción
real con datos de pacientes.

Production real debe tener:

- `AGENDIX_DEMO_ENABLED=false` o ausente.
- `NEXT_PUBLIC_AGENDIX_DEMO_ENABLED=false` o ausente.
- Supabase production separado de staging/demo.
- Sin seed demo ni datos ficticios mezclados.
- Backups activos antes de migraciones.
- `SUPABASE_SERVICE_ROLE_KEY` solo server-side, nunca `NEXT_PUBLIC_`.

## Scripts

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run start
```

## Supabase

Las migraciones viven en `supabase/migrations`.

Para desplegar la base de datos en un proyecto nuevo de Supabase:

```bash
supabase link --project-ref PROJECT_REF
supabase db push
```

## Recordatorios automaticos

Agendix incluye una Edge Function para recordatorios de reserva:

- Email 48 horas antes con Resend.
- Confirmación por WhatsApp 24 horas antes con WhatsApp Business Cloud API.
- Modo mock para pruebas sin enviar mensajes reales.
- Registro de intentos en `recordatorio_envios`.

Variables de la Edge Function, configuradas como secretos en Supabase:

```bash
SUPABASE_URL=https://PROJECT_REF.supabase.co
REMINDERS_CRON_SECRET=...
REMINDERS_DRY_RUN=false
REMINDERS_TIME_ZONE=America/Santiago

RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Agendix <recordatorios@tu-dominio.cl>"

WHATSAPP_MODE=live
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_GRAPH_VERSION=v25.0
WHATSAPP_TEMPLATE_NAME=agendix_confirmacion_cita_24h
WHATSAPP_TEMPLATE_LANGUAGE=es_CL
```

La plantilla aprobada en Meta debe recibir estos parametros de cuerpo, en orden:
paciente, servicio, fecha/hora, profesional y centro.

Despliegue de recordatorios:

```bash
supabase secrets set --env-file ./supabase/.env
supabase functions deploy send-booking-reminders
```

La funcion usa `SUPABASE_SECRET_KEYS` provisto por Supabase para operar con service role y exige `REMINDERS_CRON_SECRET` en cada llamada. Luego ejecuta `supabase/cron/send-booking-reminders.sql` en Supabase SQL Editor, reemplazando `PROJECT_REF` y `A_LONG_RANDOM_CRON_SECRET`.

## Registro y emails con Resend

Supabase Auth envia los correos de confirmacion del registro. Para produccion debe usar SMTP de Resend:

```bash
export RESEND_API_KEY=re_...
supabase config push --project-ref sbebrhlcxwmzixpzvhuq --yes
```

El `config.toml` queda con confirmacion de email activa, SMTP `smtp.resend.com:465`, usuario `resend` y password `env(RESEND_API_KEY)`. No subas la API key al repositorio.

En Resend, verifica `agendixchile.cl` antes de enviar desde `no-reply@agendixchile.cl`. Si prefieres otro remitente, cambia `auth.email.smtp.admin_email` en `supabase/config.toml`.

## Deploy en Vercel

1. Importa este repositorio desde GitHub en Vercel.
2. Configura las variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` y `NEXT_PUBLIC_MARKETING_URL`.
3. Ejecuta el deploy.
4. Agrega `app.agendixchile.cl` como dominio de Production en el proyecto Vercel de la plataforma.
5. Agrega el dominio final en Supabase Auth como Site URL y Redirect URL.

## Dominios y Supabase Auth

Agendix separa la plataforma SaaS y la landing comercial:

- Plataforma: `https://app.agendixchile.cl`
- Landing comercial: `https://www.agendixchile.cl`
- Callback de Auth: `https://app.agendixchile.cl/auth/callback`

Configuracion recomendada en Vercel Production para la plataforma:

```bash
NEXT_PUBLIC_APP_URL=https://app.agendixchile.cl
NEXT_PUBLIC_MARKETING_URL=https://www.agendixchile.cl
```

Configuracion manual recomendada en Supabase > Authentication > URL Configuration:

- Site URL: `https://app.agendixchile.cl`
- Redirect URLs:
  - `https://app.agendixchile.cl/auth/callback`
  - `https://app.agendixchile.cl/**`
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/**`

Para previews de Vercel, agrega un wildcard del equipo o cuenta si vas a probar auth en previews: `https://*-<team-or-account-slug>.vercel.app/**`.

Si tienes plantillas de email personalizadas en Supabase Auth, revisa que usen el enlace de confirmación actual de Supabase o `{{ .RedirectTo }}` donde corresponda cuando se envía `emailRedirectTo`.

La landing debe responder en `www.agendixchile.cl`; el dominio raiz `agendixchile.cl` puede redirigir a `www`. Sus CTAs deben apuntar a:

- Login: `https://app.agendixchile.cl/login`
- Registro: `https://app.agendixchile.cl/register`

## Deploy Preview / Demo Controlada

### Instalacion y validacion local

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

### Variables para Vercel

Obligatorias para preview y produccion:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_MARKETING_URL`

Opcionales segun modulo:

- `APP_BASE_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `MANUAL_REMINDERS_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Solo preview/staging demo:

- `AGENDIX_DEMO_ENABLED=true`
- `NEXT_PUBLIC_AGENDIX_DEMO_ENABLED=true`
- `AGENDIX_DEMO_PLAN=individual`

No actives `AGENDIX_DEMO_ENABLED` ni `NEXT_PUBLIC_AGENDIX_DEMO_ENABLED` en Vercel Production con datos reales. `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `MANUAL_REMINDERS_SECRET`, `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` son secretos server-side y no deben exponerse con prefijo `NEXT_PUBLIC_`.

### Supabase staging

Antes de mostrar una demo conectada a Supabase, aplica las migraciones en un proyecto staging:

```bash
supabase link --project-ref PROJECT_REF_STAGING
supabase db push
```

La migracion `20260522090000_public_booking_minimal_profiles.sql` revoca lectura anonima directa sobre `profiles` y `miembros_centro`, y expone solo `public.public_booking_professionals` para el portal publico. Valida en Supabase SQL Editor que el rol anon no pueda leer columnas internas de perfiles, miembros, pacientes ni reservas.

### Checklist antes de demo comercial

- Build de Vercel Preview en verde.
- Variables obligatorias cargadas en Preview.
- Demo activada solo en Preview/Staging.
- Demo apagada en Production.
- Migraciones aplicadas en Supabase staging.
- Portal publico crea reservas sin pago online real.
- Rutas internas redirigen a login sin sesion.
- No usar datos reales de pacientes hasta revisar RLS, backups, auditoria de privacidad y flujos de consentimiento.
