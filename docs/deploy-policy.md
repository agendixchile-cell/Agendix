# Politica de deploy para piloto productivo Agendix

Agendix opera como piloto productivo cerrado con datos reales. Esta politica bloquea cambios riesgosos sin convertir el proceso en burocracia pesada.

## Regla principal

No se deploya a production si staging no fue validado, si no existe respaldo verificable o si hay dudas sobre variables, RLS o proyecto Supabase destino.

## Deploy permitido

Se puede promover a production solo cuando:

- Preview de Vercel esta OK.
- Staging esta OK.
- Supabase staging tiene migraciones aplicadas.
- QA minimo en staging esta OK.
- Backup production vigente confirmado o export manual verificado si Supabase sigue en Free.
- Variables Vercel Production revisadas.
- `node scripts/verify-production-env-safety.mjs .env.production.verification` pasa si se uso export local de variables.
- Demo apagada en Production.
- `SUPABASE_SERVICE_ROLE_KEY` existe solo server-side.
- No hay cambios RLS sin revision.
- No hay cambios en pacientes/reservas sin QA.
- Riesgos conocidos estan aceptados por el responsable del piloto.

## Deploy bloqueado

No se deploya a production si:

- `npm run lint` falla.
- `npm run typecheck` falla.
- `npm run test` falla.
- `npm run build` falla.
- `npm audit --audit-level=moderate` reporta vulnerabilidades moderadas, altas o criticas.
- Staging no fue validado.
- Migraciones no fueron probadas en staging.
- `AGENDIX_DEMO_ENABLED=true` en production.
- `NEXT_PUBLIC_AGENDIX_DEMO_ENABLED=true` en production.
- Production apunta a Supabase staging/demo.
- Staging/demo apunta a Supabase production.
- Hay claves `sk_test`, mocks o proveedores de pago reales incompletos activos en production.
- Hay cambios RLS no revisados.
- El portal publico muestra datos sensibles o falla.
- Rutas privadas abren sin sesion.
- Hay errores criticos en logs Vercel o Supabase.
- No existe staging Supabase dedicado de Agendix para probar migraciones.
- Supabase production esta en Free y no existe export manual reciente para una migracion que toque datos reales.

## Checklist final de release

Antes:

- Confirmar rama/commit.
- Confirmar proyecto Vercel Production.
- Confirmar proyecto Supabase staging.
- Confirmar proyecto Supabase production.
- Confirmar backup production vigente o crear export manual antes de migraciones si Supabase sigue en Free.
- Confirmar variables Production con checklist de Vercel o con `scripts/verify-production-env-safety.mjs`.
- Ejecutar comandos de calidad.
- Aplicar migraciones en staging.
- Ejecutar SQL de verificacion RLS.

Durante:

- No hacer cambios paralelos de schema.
- Aplicar production solo si staging OK.
- Registrar hora de inicio, responsable y migraciones aplicadas.
- Monitorear salida de `supabase db push`.

Despues:

- Ejecutar QA minimo.
- Revisar logs Vercel.
- Revisar logs Supabase.
- Confirmar portal publico.
- Confirmar login y rutas internas.
- Completar `docs/qa-production-piloto.md`.
- Registrar resultado y riesgos pendientes.

## Rollback basico

Si falla el deploy web:

- Volver al deployment anterior en Vercel.
- Confirmar que variables production no cambiaron.
- Revisar errores en logs antes de reintentar.

Si falla una migracion:

- Detener cualquier deploy adicional.
- No aplicar production si el fallo fue en staging.
- Si fallo en production, evaluar si la migracion dejo cambios parciales.
- Usar backup/snapshot production si hay perdida de datos o exposicion.
- Contactar soporte Supabase si la restauracion no es inmediata.

Si falla el portal publico:

- Pausar nuevas reservas publicas si el error afecta privacidad o integridad.
- Volver a deploy anterior si el fallo es de aplicacion.
- Revisar grants/RLS si el fallo aparece despues de migraciones.

Si aparece exposicion de datos:

- Bloquear el vector de acceso inmediatamente.
- Revocar grants o desactivar ruta afectada.
- Revisar logs para alcance.
- Documentar incidente y comunicar internamente.
- No seguir sumando pacientes hasta cerrar causa raiz.

## Estado de ambientes reales

Estado actual: GO controlado completado para la ronda aplicada el 2026-05-24. Futuras migraciones production vuelven a quedar bloqueadas hasta repetir staging, Vercel y export manual.

| Control | Estado | Bloqueo |
| --- | --- | --- |
| Supabase Production identificado | Si | Usuario confirma `https://sbebrhlcxwmzixpzvhuq.supabase.co` como Agendix |
| Supabase Staging identificado | Si | `Agendix Staging`, ref `mihdpjvdzorsutpgwrgv`, URL `https://mihdpjvdzorsutpgwrgv.supabase.co` |
| Vercel Production variables verificadas | Si | `vercel env pull --environment=production` + `scripts/verify-production-env-safety.mjs`; sensitive vars verificadas por metadata |
| Backup Production verificado | Export manual | Supabase Free no incluye project backups/PITR; export manual creado fuera del repo en `/Users/estebantorrescea/Documents/Agendix-production-backups` |
| Migraciones Staging aplicadas | Si | Staging `mihdpjvdzorsutpgwrgv` migrado completo |
| RLS Staging validado | Si | SQL y REST anon OK |
| Migracion Production preparada | Si | Dry-run mostro 6 migraciones pendientes, staging OK y export manual creado |
| Production aprobado para migracion | Aplicado | Migraciones production aplicadas y RLS/REST anon OK |
| QA Production post-hotfix | Pendiente usuario | Ejecutar `docs/qa-production-piloto.md` con usuario real autorizado |

Antes de cualquier nueva ronda de migraciones, repetir staging con migraciones/RLS, variables Vercel Production y respaldo. Si no se pagara Supabase Pro, el respaldo minimo aceptado es un export manual reciente y probado para restauracion basica.

Hotfix production ejecutado el 2026-05-22:

- `anon` ya no lee tablas sensibles verificadas.
- `public_booking_professionals` existe y solo expone `SELECT`.
- Para nuevas migraciones, repetir backup/staging/Vercel antes de aplicar production.
