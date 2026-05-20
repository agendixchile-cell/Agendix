# Propuesta tecnica: agendix-landing

## Objetivo

Separar la landing comercial de la plataforma SaaS. La app actual queda como plataforma autenticada en `https://app.agendixchile.cl`; la landing responde en `https://www.agendixchile.cl`, con el dominio raiz `https://agendixchile.cl` redirigiendo a `www`.

## Arquitectura recomendada

- Repositorio o proyecto separado: `agendix-landing`.
- Framework: Next.js App Router, idealmente con el mismo sistema visual base de Agendix para consistencia de marca.
- Hosting: Vercel separado del proyecto `agendix`.
- Dominios:
  - `agendixchile.cl` -> redirige a `www.agendixchile.cl`
  - `www.agendixchile.cl` -> landing comercial
  - `app.agendixchile.cl` -> plataforma actual
- Variables:
  - `NEXT_PUBLIC_APP_URL=https://app.agendixchile.cl`
  - `NEXT_PUBLIC_MARKETING_URL=https://www.agendixchile.cl`

## Mapa de paginas

- `/`: landing principal.
- `/privacidad`: politica de privacidad.
- `/terminos`: terminos del servicio.
- `/contacto`: formulario comercial o link directo a canal de ventas.

## Estructura de la landing principal

1. Hero section: propuesta clara para centros y profesionales de salud, con CTA primario a registro y CTA secundario a login/demo.
2. Problema: reservas dispersas, confirmaciones manuales, ausencias, perdida de informacion operacional.
3. Solucion: agenda clinica online, portal publico de reservas y gestion centralizada.
4. Features: agenda, reservas publicas, pacientes, profesionales, salas, servicios, recordatorios y fichas clinicas.
5. Beneficios para profesionales de salud: menos coordinacion manual, mejor ocupacion de agenda, experiencia mas simple para pacientes, control del equipo.
6. Pricing: planes por etapa del centro, con un plan inicial simple y CTA a registro/contacto.
7. FAQ: seguridad, datos, recordatorios, migracion, soporte, prueba inicial.
8. CTA final: abrir cuenta o entrar a la plataforma.

## CTAs obligatorios

- Login: `https://app.agendixchile.cl/login`
- Registro: `https://app.agendixchile.cl/register`

## Consideraciones de producto

- La landing no debe manejar sesiones de Supabase.
- La landing no debe replicar dashboards ni features internas.
- Todo flujo autenticado debe salir hacia `app.agendixchile.cl`.
- Si se agrega analytics, medir conversiones de CTA hacia `/register` y `/login`.
- Mantener copy B2B HealthTech sobrio, enfocado en operacion clinica y confianza.

## Checklist de lanzamiento

- Crear proyecto Vercel `agendix-landing`.
- Asignar `agendixchile.cl` y `www.agendixchile.cl` al proyecto de landing.
- Verificar que `app.agendixchile.cl` siga asignado solo al proyecto SaaS.
- Configurar redirects de `www` segun preferencia canonica.
- Validar CTAs a login/register en produccion.
- Agregar paginas legales antes de campañas pagadas.
