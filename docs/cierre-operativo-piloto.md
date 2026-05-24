# Cierre Operativo Piloto Productivo Agendix

## Actualizacion operativa 2026-05-24

Estado nuevo:

- Production Agendix confirmado: `sbebrhlcxwmzixpzvhuq` (`https://sbebrhlcxwmzixpzvhuq.supabase.co`).
- Staging Agendix creado y confirmado: `mihdpjvdzorsutpgwrgv` (`https://mihdpjvdzorsutpgwrgv.supabase.co`).
- Supabase production sigue en Free. No hay backups automaticos/PITR; el usuario decidio no pagar Supabase por ahora.
- Production queda bloqueado para nuevas migraciones normales hasta tener export manual reciente o backup verificable, staging con migraciones aplicadas, RLS validado y variables Vercel Production revisadas.

Actualizacion posterior:

- Supabase CLI autenticado y staging `mihdpjvdzorsutpgwrgv` migrado completo.
- RLS staging validado por SQL y REST anon: `public_booking_professionals` responde OK; tablas sensibles responden `401`.
- Vercel CLI instalado/autenticado y variables Production revisadas. Se corrigio `APP_BASE_URL=https://app.agendixchile.cl` y se repoblaron `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY` como sensitive.
- Export manual production creado fuera del repo en `/Users/estebantorrescea/Documents/Agendix-production-backups`.
- Production `sbebrhlcxwmzixpzvhuq` migrado con las migraciones pendientes hasta `20260524190313_restrict_public_booking_view_grants.sql`.
- RLS production validado por SQL y REST anon: `public_booking_professionals` responde `206`; tablas sensibles responden `401`.
- Supabase production sigue en Free y sin PITR/backups automaticos. Para futuras migraciones productivas se debe crear un export manual nuevo.

Correcciones locales para poder aplicar staging desde cero:

- `20260520040044_subscription_plans.sql`: se reemplazo un `UPDATE ... FROM lateral` incompatible por un subquery correlacionado.
- `20260522053728_closed_pilot_rls_hardening.sql`: ahora protege `public_booking_professionals` solo si la vista ya existe, para no romper bases nuevas.
- `20260524143000_security_invoker_public_booking_professionals.sql`: se agrego hardening para que la vista publica use `security_invoker = true`.

Pendiente inmediato historico:

1. Resetear/guardar el DB password de `Agendix Staging` o completar login CLI. Resuelto por login CLI.
2. Ejecutar `supabase link --project-ref mihdpjvdzorsutpgwrgv`. Resuelto.
3. Ejecutar `supabase db push --dry-run`. Resuelto.
4. Aplicar staging solo si el dry-run es coherente. Resuelto.
5. Ejecutar matriz RLS en staging. Resuelto.
6. Revisar variables Vercel Production. Resuelto con advertencia: variables sensitive no son desencriptables por `vercel env pull`.
7. Hacer export manual production antes de cualquier migracion, ya que no hay backups automaticos. Resuelto para esta ronda.

Decision: Agendix puede seguir operando como piloto productivo cerrado con datos reales. Esta ronda de migraciones quedo aplicada y validada. Futuras migraciones productivas normales siguen requiriendo staging OK, Vercel OK y export manual production reciente mientras Supabase siga en Free.

## 1. Resumen ejecutivo

Estado general: el codigo local queda preparado para operar como piloto productivo cerrado, pero el cierre operativo remoto esta bloqueado hasta identificar formalmente los proyectos Supabase staging/production, verificar variables Vercel Production y aplicar/validar migraciones en bases reales.

Que se valido: guardrails locales, rutas protegidas, ausencia de service role en cliente revisado, documentacion operativa, migracion de hardening RLS y matriz de roles. Tambien se comprobo que existe sesion Supabase CLI, pero los proyectos listados no estan marcados como staging o production y no coinciden con el ref de `.env.local`.

Que se corrigio: se agrego politica de deploy, runbook de migraciones, matriz RLS realista, matriz de roles piloto, guardrails contra exposicion anon y logs sin destinatarios de email.

Nivel de riesgo final: medio para piloto cerrado despues de aplicar staging, production, Vercel y export manual. El riesgo vuelve a alto antes de futuras migraciones si no se repite export manual porque production sigue sin PITR/backups automaticos.

Recomendacion clara: se puede operar el piloto cerrado con cambios controlados. Antes de escalar, completar QA funcional con usuario real, privacidad/consentimiento y una estrategia de backup mas robusta.

## 2. Variables Production Vercel

Vercel Production fue verificado con Vercel CLI. `APP_BASE_URL` fue corregido a `https://app.agendixchile.cl`; `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_SECRET_KEY` fueron repobladas como sensitive. Las variables sensitive no se desencriptan por `vercel env pull`, por lo que su presencia se confirmo por metadata de Vercel.

| Variable | Estado esperado | Estado verificado | Riesgo | Accion |
| --- | --- | --- | --- | --- |
| `AGENDIX_DEMO_ENABLED` | `false` o ausente | OK: ausente | Critico si esta `true`: mezcla demo/real | Mantener apagado |
| `NEXT_PUBLIC_AGENDIX_DEMO_ENABLED` | `false` o ausente | OK: ausente | Critico si esta `true`: demo en cliente production | Mantener apagado |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase production | OK: `sbebrhlcxwmzixpzvhuq` | Critico si apunta a staging/demo | Ninguna |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key production | OK: presente | Alto si corresponde a otro proyecto | Ninguna |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role production, server-side | OK: sensitive presente | Critico si es `NEXT_PUBLIC` o de otro proyecto | Mantener sensitive/server-side |
| `NEXT_PUBLIC_APP_URL` | Dominio real app production | OK: `https://app.agendixchile.cl` | Medio: redirects/auth rotos | Ninguna |
| `NEXT_PUBLIC_MARKETING_URL` | Dominio marketing real | OK: `https://agendixchile.cl` | Bajo/medio: CTAs incorrectos | Ninguna |
| `APP_BASE_URL` | Dominio real app production | OK: corregido | Medio: links email incorrectos | Ninguna |
| `STRIPE_SECRET_KEY` | Ausente o no usado si pagos reales no listos | OK: ausente en verificador | Alto si pagos incompletos activos | No activar pagos reales |
| `STRIPE_WEBHOOK_SECRET` | Ausente o coherente con entorno si se usa | OK: ausente en verificador | Alto si webhook real incompleto | Mantener inactivo si no hay release pagos |
| `WHATSAPP_MODE` | `live` solo si configurado y aprobado | No configurado en verificador | Medio: mensajes no deseados o mock productivo | Confirmar antes de activar WhatsApp |

Comando recomendado con Vercel CLI autenticado:

```bash
vercel env ls production
vercel env pull .env.production.verification --environment=production
```

No commitear `.env.production.verification`. Revisar valores localmente y eliminar el archivo.

Alternativa sin Vercel CLI: copiar variables Production desde Vercel Dashboard a `.env.production.verification` y ejecutar:

```bash
node scripts/verify-production-env-safety.mjs .env.production.verification
```

El script valida Supabase production, demo apagada y ausencia de secretos con prefijo `NEXT_PUBLIC_` sin imprimir valores sensibles.

## 3. Supabase Staging

Estado: staging dedicado existe como `Agendix Staging`, ref `mihdpjvdzorsutpgwrgv`. Migraciones aplicadas y RLS/REST anon validados. Pehuen/Lawen no pertenecen a Agendix y no se tocan.

Staging requerido:

- Proyecto separado llamado `Agendix Staging`.
- Nunca usar datos reales sin anonimizar.
- Variables Vercel Preview apuntando a staging.
- Demo permitida solo en staging/demo, nunca conectada a production.
- Migraciones probadas aqui antes de production.

Instrucciones exactas:

```bash
supabase link --project-ref mihdpjvdzorsutpgwrgv
supabase migration list --linked
supabase db push --dry-run
supabase db push
supabase migration list --linked
```

Debe aparecer aplicada:

```text
20260522053728_closed_pilot_rls_hardening
```

Resultado esperado: migraciones aplican sin error, portal publico sigue cargando y `anon` queda sin grants sobre tablas sensibles.

Errores: ninguno tras correcciones locales y migracion `20260524190313_restrict_public_booking_view_grants.sql`.

Acciones: repetir este flujo antes de futuras migraciones.

## 4. Supabase Production

Estado: aplicado en production despues de staging OK, Vercel OK y export manual.

Antes de production:

- Confirmar backup vigente.
- Confirmar proyecto Supabase production.
- Confirmar variables Vercel Production.
- Confirmar demo apagada.
- Confirmar que no hay deploy en curso.
- Confirmar rollback Vercel disponible.

Instrucciones exactas:

```bash
supabase link --project-ref sbebrhlcxwmzixpzvhuq
supabase migration list --linked
supabase db push --dry-run
supabase db push
supabase migration list --linked
```

Resultado esperado: `20260522053728_closed_pilot_rls_hardening` aplicada sin errores, app operativa y RLS validado.

Errores: no verificados remoto.

Acciones: no ejecutar hasta staging OK y backup confirmado.

## 5. Validacion RLS

Ejecutar en staging y luego production. La columna "Resultado" queda no verificada hasta correr SQL real.

| Tabla/vista/RPC | anon | authenticated | service_role | Resultado | Riesgo | Accion |
| --- | --- | --- | --- | --- | --- | --- |
| `public_booking_professionals` | Select campos publicos | Select campos publicos | Full server-side | No verificado | Medio | Confirmar grants y columnas |
| `profiles` | Sin acceso directo | Segun politicas actuales | Full server-side | No verificado | Alto | `anon` debe devolver 0 grants |
| `miembros_centro` | Sin acceso directo | Solo centro propio | Full server-side | No verificado | Alto | Validar multi-tenant |
| `pacientes` | Sin acceso | Centro propio segun rol | Full server-side | No verificado | Critico | Validar no acceso anon/otro centro |
| `reservas` | Sin acceso directo | Centro propio segun rol | Full server-side | No verificado | Critico | Validar no acceso anon/otro centro |
| `pagos` | Sin acceso | Centro propio | Full server-side | No verificado | Alto | Confirmar sin pago mock pagado |
| `fichas_clinicas` | Sin acceso | Clinicos del centro | Full server-side | No verificado | Critico | Definir alcance profesional |
| `evoluciones_sesion` | Sin acceso | Admin/profesional segun politica | Full server-side | No verificado | Critico | Validar `WITH CHECK` |
| `recordatorios_reserva` | Sin acceso | Centro propio | Edge/server | No verificado | Alto | Evitar payload sensible en logs |
| `recordatorio_envios` | Sin acceso | Preferible sin acceso directo | Edge/server | No verificado | Alto | Confirmar grants |
| `configuracion_recordatorios` | Sin acceso | Admin/miembros segun politica | Full server-side | No verificado | Medio | Confirmar no anon |
| `configuracion_recordatorios_profesional` | Sin acceso | Admin/miembros segun politica | Full server-side | No verificado | Medio | Confirmar no anon |
| `bloqueos_agenda` | Sin acceso directo | Centro propio | Full server-side | No verificado | Medio | Confirmar portal recibe solo DTO |
| `subscriptions` | Sin acceso | Owner | Webhook/server | No verificado | Alto | Confirmar owner-only |
| `rate_limit_buckets` | Sin acceso | Sin acceso | Full server-side | No verificado | Medio | Confirmar service-only |
| `salas` | Sin acceso anon directo | Centro propio | Full server-side | No verificado | Medio | Confirmar portal no depende de anon |
| `create_reserva_atomic` | Sin execute | Execute authenticated/service | Full server-side | No verificado | Alto | Confirmar `anon_execute=false` |
| `update_reserva_atomic` | Sin execute | Execute authenticated/service | Full server-side | No verificado | Alto | Confirmar grants |
| `check_rate_limit` | Sin execute | Sin execute | Execute | No verificado | Medio | Confirmar service-only |
| `claim_due_reservation_reminders` | Sin execute | Sin execute | Execute | No verificado | Alto | Confirmar service-only |

SQL exacto:

```sql
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
  and table_name in (
    'profiles',
    'miembros_centro',
    'pacientes',
    'reservas',
    'pagos',
    'fichas_clinicas',
    'evoluciones_sesion',
    'recordatorios_reserva',
    'recordatorio_envios',
    'configuracion_recordatorios',
    'configuracion_recordatorios_profesional',
    'bloqueos_agenda',
    'subscriptions',
    'rate_limit_buckets',
    'salas'
  )
order by table_name, privilege_type;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'public_booking_professionals'
order by grantee, privilege_type;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select
  n.nspname as schema,
  p.proname,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'execute') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'execute') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_reserva_atomic',
    'update_reserva_atomic',
    'check_rate_limit',
    'claim_due_reservation_reminders'
  )
order by p.proname;

select table_name, row_security
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'centros',
    'profiles',
    'miembros_centro',
    'pacientes',
    'reservas',
    'pagos',
    'fichas_clinicas',
    'evoluciones_sesion',
    'recordatorios_reserva',
    'recordatorio_envios',
    'configuracion_recordatorios',
    'configuracion_recordatorios_profesional',
    'bloqueos_agenda',
    'subscriptions',
    'rate_limit_buckets',
    'salas'
  )
order by table_name;
```

Validacion multi-tenant manual:

```sql
-- Ejecutar como usuario autenticado del CENTRO_A.
select count(*) as pacientes_otro_centro
from public.pacientes
where centro_id = 'CENTRO_B_UUID'::uuid;

select count(*) as reservas_otro_centro
from public.reservas
where centro_id = 'CENTRO_B_UUID'::uuid;
```

Ambos deben devolver `0`.

## 6. Matriz de roles

Estado actual: el sistema usa `owner`, `admin`, `profesional`, `recepcion` y `anon`. Las politicas base permiten a miembros acceder a datos del centro; la app filtra fichas para profesionales en algunas pantallas, pero RLS no implementa aun una regla estricta "solo asignados" para todo.

Decision cerrada para el piloto: Opcion A temporal controlada. Profesionales pueden ver pacientes/reservas del centro mientras el piloto sea cerrado, con centros pequenos y usuarios confiables. Esta decision no habilita escala comercial. Para escalar o incorporar centros con equipos grandes, migrar a Opcion B: profesionales solo ven pacientes/reservas asignadas.

| Rol | Permisos actuales | Riesgo | Recomendacion |
| --- | --- | --- | --- |
| owner | Gestiona centro, equipo, plan, configuracion, pacientes, reservas y estadisticas | Alto por alcance total | Mantener, proteger cuenta y no compartir credenciales |
| admin | Gestiona centro/equipo/configuracion operativa, pacientes, reservas, servicios y salas | Alto | Mantener para responsables del centro |
| profesional | Opera agenda, pacientes/reservas del centro y fichas filtradas en UI | Alto si hay centros multi-equipo | Aceptar solo en piloto cerrado; planificar Opcion B |
| recepcion | Opera agenda/pacientes/reservas, sin configuracion sensible ni fichas clinicas | Medio | Mantener, validar rutas de fichas/admin |
| anon | Portal publico y auth | Critico si grants se abren | Mantener superficie minima |

Matriz funcional:

| Permiso | owner | admin | profesional | recepcion | anon |
| --- | --- | --- | --- | --- | --- |
| Ver pacientes | Si | Si | Si, centro completo actual | Si | No |
| Crear pacientes | Si | Si | Si | Si | Solo via reserva publica server-side |
| Editar pacientes | Si | Si | Si | Si | No |
| Ver reservas | Si | Si | Si, centro completo actual | Si | No directo |
| Crear reservas | Si | Si | Si | Si | Solo portal publico |
| Editar/cancelar reservas | Si | Si | Si | Si | No |
| Ver configuracion centro | Si | Si | Limitado/no sensible | Limitado/no sensible | No |
| Editar configuracion centro | Si | Si | No | No | No |
| Ver planes | Si | Si/limitado | Limitado | Limitado | No |
| Gestionar profesionales | Si | Si | No | No | No |
| Ver estadisticas | Si | Si | Segun plan/pantalla | Segun plan/pantalla | No |
| Portal publico | Si | Si | Si | Si | Si |

Cambios necesarios para Opcion B:

- Agregar politicas RLS por `profesional_id = auth.uid()` en `reservas` y `evoluciones_sesion`.
- Definir tabla/asignacion paciente-profesional si un paciente puede tener varios profesionales.
- Ajustar consultas de pacientes para derivar visibilidad desde reservas/asignaciones.
- Ajustar dashboard/estadisticas para no filtrar solo en UI.
- Crear tests multi-tenant y multi-profesional.

Estado del riesgo: aceptado temporalmente para piloto cerrado. Alto antes de escalar.

## 7. QA Production

No ejecutado contra production real por falta de usuario real autorizado en esta sesion. El checklist operativo queda en `docs/qa-production-piloto.md` y debe completarse despues de hotfix/deploy/migraciones:

| Flujo | Estado | Observacion | Accion tomada |
| --- | --- | --- | --- |
| Login usuario real | No verificado remoto | Requiere production | Ejecutar post-migracion |
| Dashboard carga | No verificado remoto | Requiere production | Ejecutar post-migracion |
| Pacientes carga | No verificado remoto | Requiere production | Ejecutar post-migracion |
| Profesionales carga | No verificado remoto | Requiere production | Ejecutar post-migracion |
| Servicios carga | No verificado remoto | Requiere production | Ejecutar post-migracion |
| Salas carga | No verificado remoto | Requiere production | Ejecutar post-migracion |
| Agenda carga | No verificado remoto | Requiere production | Ejecutar post-migracion |
| Crear reserva controlada | No verificado remoto | Usar dato test identificado | Ejecutar post-migracion |
| Editar/cancelar reserva controlada | No verificado remoto | Usar dato test identificado | Ejecutar post-migracion |
| Portal publico carga | No verificado remoto | Verificar sin sesion | Ejecutar post-migracion |
| Portal publico reserva | No verificado remoto | Solo si corresponde al centro | Ejecutar post-migracion |
| Confirmacion sin pago online | Validado estatico/local | Tests cubren mock payment | Revalidar visual |
| Rutas privadas sin sesion | Validado estatico | Proxy protege prefijos | Revalidar browser |
| Demo no aparece production | No verificado remoto | Depende de Vercel env | Revisar variables |
| Consola/logs | No verificado remoto | Requiere Vercel/Supabase | Revisar post-deploy |

## 8. Backups y reversion

Checklist antes:

- Confirmar backup production vigente.
- Registrar fecha/hora.
- Confirmar proyecto Supabase staging y production.
- Confirmar rama/commit.
- Confirmar variables Vercel Production.
- Confirmar demo apagada.
- Avisar internamente ventana de cambio.

Checklist durante:

- Aplicar primero staging.
- Ejecutar `supabase db push --dry-run`.
- Aplicar `supabase db push`.
- Revisar errores.
- Ejecutar SQL RLS.
- Aplicar production solo si staging OK.

Checklist despues:

- QA minimo.
- Revisar logs Vercel.
- Revisar logs Supabase.
- Confirmar operacion.
- Registrar resultado.

Plan de reversion:

- Si falla migracion en staging: no tocar production, corregir migracion y repetir.
- Si falla migracion en production: detener deploys, evaluar cambios parciales, usar backup/snapshot si hay perdida o exposicion.
- Si app deja de funcionar: volver al deployment anterior en Vercel y revisar variables/logs.
- Si portal publico falla: pausar reserva publica afectada, revisar grants de vista/RLS, revertir deploy si es codigo.
- Si aparece exposicion de datos: revocar grant/ruta, activar respuesta a incidente, revisar logs, no sumar pacientes hasta cerrar causa raiz.

## 9. Politica de deploy piloto

Archivo: `docs/deploy-policy.md`.

Permitir deploy si:

- Preview OK.
- Staging OK.
- Supabase staging OK.
- QA minimo OK.
- Backup vigente.
- Variables revisadas.
- Riesgos aceptados.

Bloquear deploy si:

- Falla lint/typecheck/test/build/audit.
- Staging no fue validado.
- Migraciones no fueron probadas.
- Demo esta activa en production.
- Hay cambios RLS no revisados.
- Hay cambios en pacientes/reservas sin QA.
- Hay errores criticos en portal publico.

## 10. Tests y comandos

| Comando | Resultado | Observacion |
| --- | --- | --- |
| `npm run lint` | OK equivalente | `npm` no esta disponible; se ejecuto `node_modules/.bin/eslint` |
| `npm run typecheck` | OK equivalente | Se ejecuto `node_modules/.bin/tsc --noEmit` |
| `npm run test` | OK equivalente | Se ejecuto Vitest con Node bundled; 33 tests OK |
| `npm run build` | OK equivalente | `next build --webpack` OK; Turbopack local falla por dependencia nativa `lightningcss` |
| `npm audit --audit-level=moderate` | OK equivalente | Bulk advisories npm contra `package-lock.json`: 0 moderadas+ |

## 11. Archivos modificados

| Archivo | Cambio | Motivo |
| --- | --- | --- |
| `docs/cierre-operativo-piloto.md` | Informe operativo y runbook remoto | Cierre release sin marcar remoto como verificado |
| `docs/deploy-policy.md` | Politica deploy piloto | Evitar deploys riesgosos con pacientes reales |
| `docs/piloto-productivo.md` | Ajuste matriz vista publica | Reflejar grant minimo a anon/authenticated |
| `supabase/migrations/20260522053728_closed_pilot_rls_hardening.sql` | Grant vista publica a anon/authenticated | Evitar falla de portal para usuarios autenticados sin abrir datos sensibles |
| `supabase/migrations/20260524190313_restrict_public_booking_view_grants.sql` | Revoca privilegios extra en vista publica | Asegurar que `anon`/`authenticated` tengan solo `SELECT` |
| `tests/prelaunch-hardening.test.ts` | Guardrail actualizado | Alinear test con grant minimo de vista |

## 12. Riesgos restantes

Criticos:

- No hay backups automaticos/PITR en Supabase Free; antes de futuras migraciones hay que crear un nuevo export manual.
- Restauracion del export manual no ha sido probada en un entorno no productivo.

Altos:

- Profesionales ven alcance de centro en varias tablas; aceptable solo como piloto cerrado con centros pequenos.
- Politica de privacidad/consentimiento sigue como pendiente urgente antes de escalar.
- QA funcional production con usuario real sigue pendiente.

Medios:

- Build Turbopack local falla por dependencia nativa; build webpack OK.
- Revisar logs historicos Vercel/Supabase para confirmar que no hay datos personales antiguos.

Bajos:

- Supabase CLI esta disponible en `/opt/homebrew/bin/supabase`; version local 2.95.4 sugiere actualizar a 2.101.0.

## 13. Recomendacion final

Agendix puede seguir operando como piloto productivo cerrado con datos reales. Mantener bloqueo preventivo para futuras migraciones productivas normales hasta repetir staging/RLS, revisar Vercel Production y crear un export manual reciente si Supabase sigue en Free.

## 14. Estado de ambientes reales

Actualizado despues de revisar `supabase projects list`, `.env.local`, `supabase/config.toml`, `.vercel/project.json`, README y docs operativos.

| Control | Estado | Evidencia | Accion |
| --- | --- | --- | --- |
| Supabase Production identificado | Si | Usuario confirma que `https://sbebrhlcxwmzixpzvhuq.supabase.co` es Agendix | Ninguna |
| Supabase Staging identificado | Si | `Agendix Staging`, ref `mihdpjvdzorsutpgwrgv`, URL `https://mihdpjvdzorsutpgwrgv.supabase.co` | Ninguna |
| Vercel Production variables verificadas | Si | Vercel CLI + verificador local; sensitive vars confirmadas por metadata | Repetir antes de futuras migraciones |
| Backup Production verificado | Export manual | Archivos creados fuera del repo en `/Users/estebantorrescea/Documents/Agendix-production-backups` | Crear export nuevo antes de futuras migraciones |
| Migraciones Staging aplicadas | Si | Staging migrado completo | Repetir antes de futuras migraciones |
| RLS Staging validado | Si | SQL y REST anon OK | Repetir antes de futuras migraciones |
| Migracion Production preparada | Si | Dry-run previo mostro 6 migraciones pendientes; staging/export/Vercel OK | Aplicada |
| Production aprobado para migracion | Aplicado | Migraciones aplicadas y RLS/REST anon OK | Mantener monitoreo |

Informe especifico: `docs/mapeo-ambientes-reales.md`. SQL de emergencia: `docs/supabase-production-emergency-sql.md`.

## 15. Hotfix production aplicado

Fecha de ejecucion: 2026-05-22.

Comando aplicado:

```bash
supabase db query --linked --file supabase/emergency/production-anon-rls-hotfix.sql --output json
```

Resultado:

- `public_booking_professionals` creado y accesible para `anon`/`authenticated`.
- `anon` ya no puede leer `profiles`, `miembros_centro`, `pacientes`, `reservas`, `pagos`, `fichas_clinicas`, `evoluciones_sesion`, `recordatorios_reserva`, configuraciones, `subscriptions`, `rate_limit_buckets`, `bloqueos_agenda` ni `salas`.
- Grants de `public_booking_professionals`: solo `SELECT` para `anon` y `authenticated`.
- RLS habilitado en tablas criticas verificadas.
- RPCs verificadas: `check_rate_limit` y `claim_due_reservation_reminders` no ejecutables por `anon`; `create_reserva_atomic` y `update_reserva_atomic` tampoco son ejecutables por `anon`.

Pendiente urgente:

- Ejecutar QA production con usuario real autorizado.
- Probar restauracion basica del export manual en un entorno no productivo.
- Crear un nuevo export manual antes de futuras migraciones mientras Supabase siga en Free.
