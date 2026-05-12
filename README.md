# Agendix

Agendix es una aplicación web para gestión de agenda clínica, pacientes, reservas, profesionales, salas, servicios y portal público de agendamiento.

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
```

`SUPABASE_SERVICE_ROLE_KEY` es sensible y solo debe configurarse en entornos server-side como Vercel o Supabase. No debe exponerse en el cliente.

## Scripts

```bash
npm run lint
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
- WhatsApp 24 horas antes con WhatsApp Business Cloud API.
- Modo mock para WhatsApp mientras no existan credenciales reales.
- Registro de intentos en `recordatorio_envios`.

Variables de la Edge Function, configuradas como secretos en Supabase:

```bash
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
REMINDERS_CRON_SECRET=...
REMINDERS_DRY_RUN=false
REMINDERS_TIME_ZONE=America/Santiago

RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Agendix <recordatorios@tu-dominio.cl>"

WHATSAPP_MODE=mock
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_GRAPH_VERSION=v25.0
WHATSAPP_TEMPLATE_NAME=agendix_reserva_24h
WHATSAPP_TEMPLATE_LANGUAGE=es_CL
```

Despliegue de recordatorios:

```bash
supabase secrets set --env-file ./supabase/.env
supabase functions deploy send-booking-reminders
```

Luego ejecuta `supabase/cron/send-booking-reminders.sql` en Supabase SQL Editor, reemplazando `PROJECT_REF`, `SUPABASE_ANON_KEY` y `A_LONG_RANDOM_CRON_SECRET`.

## Deploy en Vercel

1. Importa este repositorio desde GitHub en Vercel.
2. Configura las variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.
3. Ejecuta el deploy.
4. Agrega el dominio final en Supabase Auth como Site URL y Redirect URL.
