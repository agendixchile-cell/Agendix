# Hardening Piloto Productivo Agendix

Agendix se trata como un piloto productivo cerrado con datos reales. No es una demo comercial abierta, no es un playground local y no esta listo para escalamiento masivo sin control. Puede operar con centros seleccionados mientras los controles minimos de produccion, privacidad, seguridad, backups, trazabilidad y separacion de ambientes esten activos y verificados.

## 1. Resumen ejecutivo

Estado general: la app ya tiene pacientes reales, por lo que todo cambio debe pasar por staging o preview antes de production. El foco deja de ser venta/demo y pasa a ser continuidad segura del piloto cerrado.

Que cambio respecto a demo comercial: production debe usar una base separada, demo apagada, sin seeds demo, sin pagos mock, sin mezcla de datos ficticios y reales, con RLS validado y backups activos.

Nivel de riesgo actual: medio-alto hasta validar las migraciones y RLS contra Supabase staging/production reales. En codigo local hay controles relevantes, pero no se debe declarar production seguro hasta ejecutar las consultas de verificacion en Supabase.

Recomendacion: continuar el piloto solo con centros controlados, cambios por staging, backups antes de migraciones y revision manual de RLS/grants antes de sumar mas pacientes.

## 2. Separacion de ambientes

| Ambiente | Uso | Datos permitidos | Demo habilitada | Supabase | Riesgos |
| --- | --- | --- | --- | --- | --- |
| Production | Operacion real del piloto cerrado | Centros, usuarios y pacientes reales | No. `AGENDIX_DEMO_ENABLED=false` y `NEXT_PUBLIC_AGENDIX_DEMO_ENABLED=false` | Proyecto production separado | Riesgo alto si se usa staging/demo, si falta backup o si RLS no esta validado |
| Staging / Preview | QA, migraciones, pruebas internas | Datos ficticios o anonimizados | Opcional y explicita | Proyecto staging separado | Riesgo medio si se cargan datos reales o secretos productivos |
| Demo comercial | Reuniones y venta controlada | Solo datos ficticios | Si corresponde | Staging/demo dedicado, nunca production | Riesgo alto si se conecta a production o se muestran capturas reales |

Variables obligatorias por ambiente:

| Variable | Production | Staging / Preview | Demo comercial |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase production | Supabase staging | Supabase demo/staging |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon production | Anon staging | Anon demo/staging |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo server-side production | Solo server-side staging | Solo server-side demo/staging |
| `NEXT_PUBLIC_APP_URL` | Dominio production | URL preview/staging | URL demo |
| `APP_BASE_URL` | Dominio production | URL preview/staging | URL demo |
| `AGENDIX_DEMO_ENABLED` | `false` o ausente | Opcional | `true` si aplica |
| `NEXT_PUBLIC_AGENDIX_DEMO_ENABLED` | `false` o ausente | Opcional | `true` si aplica |
| `AGENDIX_DEMO_PLAN` | Ausente | Opcional | Opcional |
| `WHATSAPP_MODE` | `live` solo si esta configurado | `mock` o `live` controlado | `mock` |
| `STRIPE_SECRET_KEY` | No usar para pagos reales hasta integracion aprobada | Test only | Ausente o test |

## 3. Supabase y RLS

Supabase debe validarse con la matriz siguiente despues de aplicar migraciones. Referencias revisadas: las guias actuales de Supabase indican que las tablas en esquemas expuestos deben tener RLS y que las vistas pueden bypass RLS si son definer; por eso la vista publica debe ser minima y con grants explicitos.

| Tabla/vista/RPC | Acceso anon | Acceso authenticated | Acceso service_role | Riesgo | Accion tomada o recomendada |
| --- | --- | --- | --- | --- | --- |
| `centros` | Lectura publica solo centros activos con portal publico | Miembros del centro | Server-side | Medio | Mantener solo campos publicos en respuestas; validar columnas expuestas |
| `servicios` | Lectura de servicios activos y visibles | Miembros del centro; admins escriben | Server-side | Bajo | Mantener `public_visible`; validar grants |
| `horarios_centro` | Lectura publica para portal | Miembros leen; admins escriben | Server-side | Bajo | Aceptado como dato operacional publico |
| `salas` | Revocado en hardening cerrado | Miembros leen; admins escriben | Server-side | Bajo | Usar server-side para conteos, no Data API anon |
| `profiles` | Revocado | Authenticated puede leer perfiles; admins/usuario actual actualizan | Server-side | Medio | Pendiente: reducir lectura global authenticated si se necesita menor exposicion |
| `miembros_centro` | Revocado | Miembros leen su centro; admins administran | Server-side | Bajo | Validar multi-tenant con usuarios de dos centros |
| `public_booking_professionals` | `select` explicito, solo campos publicos | `select` explicito, mismos campos publicos | Server-side | Medio | Vista intencionalmente minima; no agregar email, telefono ni rol |
| `pacientes` | Sin acceso | Miembros del centro | Server-side | Alto | No exponer a anon; revisar si profesionales deben ver todos o solo asignados |
| `reservas` | Sin acceso directo | Miembros del centro | Server-side | Alto | No exponer paciente/notas en portal; validar confirmacion por token |
| `pagos` | Sin acceso | Miembros del centro | Server-side | Medio | Pago online real sigue desactivado |
| `fichas_clinicas` | Sin acceso | Admin/profesional del centro | Server-side | Alto | App filtra profesional; pendiente endurecer RLS por asignacion si aplica |
| `evoluciones_sesion` | Sin acceso | Admin/profesional; profesional escribe propias | Server-side | Alto | Validar `WITH CHECK` efectivo en staging |
| `recordatorios_reserva` | Sin acceso | Miembros del centro | Server-side/Edge Function | Medio | No registrar contenido clinico sensible en errores |
| `recordatorio_envios` | Sin acceso | Debe ser operativo limitado | Server-side/Edge Function | Medio | Validar grants reales; evitar payloads con datos sensibles en logs |
| `configuracion_recordatorios` | Sin acceso anon directo | Miembros/admin segun politicas | Server-side | Medio | Validar que anon no lea plantillas internas |
| `configuracion_recordatorios_profesional` | Sin acceso | Miembros/admin segun politicas | Server-side | Medio | Validar templates no publicos |
| `bloqueos_agenda` | Sin acceso | Miembros del centro | Server-side | Medio | Revocado para anon; portal solo recibe bloques minimizados |
| `subscriptions` | Sin acceso | Owner administra | Server-side/webhook | Medio | Service role solo server/webhook |
| `rate_limit_buckets` | Sin acceso | Sin acceso | Service role | Bajo | Correcto para rate limit persistente |
| `create_reserva_atomic` | Sin execute | Authenticated y service role | Server-side | Medio | Public booking invoca API server-side |
| `update_reserva_atomic` | Sin execute | Authenticated y service role | Server-side | Medio | Validar grants |
| `check_rate_limit` | Sin execute | Sin execute | Service role | Bajo | Correcto |
| `claim_due_reservation_reminders` | Sin execute | Sin execute | Service role | Medio | Edge Function solamente |

## 4. Datos sensibles

Revisado: pacientes, reservas, fichas, evoluciones, recordatorios, logs, localStorage, variables publicas, rutas publicas y respuestas API principales.

Riesgos encontrados: logs de errores de email incluian `recipient`; no es necesario para diagnostico y puede exponer correos reales. El modo demo usa localStorage, pero guarda solo plan/datasets demo y debe estar apagado en production.

Correcciones aplicadas: remover destinatarios de logs de errores de email y documentar que localStorage demo no se usa en production.

Pendientes: revisar logs reales de Vercel/Supabase para confirmar que no existen payloads historicos con datos clinicos; configurar redaccion en cualquier proveedor de observabilidad.

## 5. Control de acceso y roles

| Rol | Acceso actual esperado | Riesgo |
| --- | --- | --- |
| `owner` | Administra centro, equipo, plan y configuracion | Alto si una cuenta owner se comparte |
| `admin` | Administra centro, profesionales, servicios, salas, pacientes y reservas | Alto por alcance amplio |
| `profesional` | Opera agenda y atencion clinica dentro de su centro | Medio-alto: RLS permite lectura de datos del centro en varias tablas; la app filtra fichas por profesional |
| `recepcion` | Opera agenda/pacientes/reservas sin configuracion sensible | Medio: confirmar que no accede a fichas clinicas |
| Sin sesion | Solo portal publico y auth | Bajo si grants anon se mantienen cerrados |

Pendientes de roles: decidir si el profesional debe ver todos los pacientes/reservas del centro o solo los asignados. Si la regla de producto es "solo asignados", se requiere una migracion RLS adicional y ajuste de pantallas.

## 6. Modo demo vs production

Estado final: demo debe estar desactivada en production. `AGENDIX_DEMO_MODE` solo sirve como legado local cuando `NODE_ENV !== 'production'`. `AGENDIX_DEMO_ENABLED` y `NEXT_PUBLIC_AGENDIX_DEMO_ENABLED` nunca deben estar activos en production con datos reales.

Riesgos evitados: selector demo oculto en production, pago mock desactivado y datasets demo separados del flujo productivo.

## 7. Backups y operacion

Antes de cada deploy:

- Deploy primero en Preview.
- Ejecutar `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` y `npm audit --audit-level=moderate`.
- Probar login, dashboard, agenda, pacientes y portal publico.
- Verificar rutas internas sin sesion redirigen a login.
- Confirmar demo apagada en production.
- Confirmar que production usa Supabase production.
- Confirmar backup antes de cualquier migracion.
- Aplicar migraciones primero en staging y ejecutar checklist SQL.

Despues de cada deploy:

- Revisar logs Vercel sin datos sensibles.
- Revisar errores Supabase Auth, Database, Storage y Edge Functions.
- Probar creacion de reserva publica.
- Probar acceso de usuario real controlado.
- Confirmar portal publico y confirmacion de asistencia.
- Registrar fecha, version, migraciones aplicadas y responsable.

Backups:

- Mantener backups automaticos de Supabase production activos.
- Tomar backup o snapshot antes de migraciones.
- Documentar responsable con acceso para restauracion.
- Probar restauracion en staging antes de necesitarla en emergencia.
- Nunca restaurar datos reales sobre demo comercial.

## 8. Privacidad y legal basico

Checklist privacidad piloto Agendix:

- Politica de privacidad visible o pendiente urgente antes de escalar.
- Aviso de uso de plataforma o consentimiento informado para centros/pacientes.
- Inventario de datos recolectados: identidad, contacto, reservas, asistencia, notas internas y ficha clinica si aplica.
- Finalidad documentada: gestion de agenda y atencion del centro.
- Lista de quienes acceden: owner/admin/profesional/recepcion segun rol.
- Procedimiento para eliminar o corregir datos.
- Contacto responsable operativo.
- Prohibido usar datos reales para demos.
- Prohibido compartir capturas con datos reales.
- Prohibido exportar datos sin control.
- Prohibido enviar datos sensibles por canales inseguros.
- Preparar cumplimiento de normativa chilena de datos personales y datos sensibles antes de escalar.

## 9. Tests y validaciones

| Comando | Resultado | Observacion |
| --- | --- | --- |
| `npm run lint` | OK equivalente | `npm` no esta en PATH del shell; se ejecuto `node_modules/.bin/eslint` |
| `npm run typecheck` | OK equivalente | Se ejecuto `node_modules/.bin/tsc --noEmit` |
| `npm run test` | OK equivalente, 33 tests pasan | Se ejecuto Vitest con el Node bundled por restriccion local de firma nativa |
| `npm run build` | OK equivalente | `next build --webpack` paso; `next build` con Turbopack falla localmente por resolucion de `lightningcss` nativo |
| `npm audit --audit-level=moderate` | OK equivalente, 0 moderadas+ | `npm` no esta en PATH; se consulto el endpoint bulk de advisories de npm contra `package-lock.json` |

Checklist SQL exacto para Supabase SQL Editor:

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

select schemaname, tablename, policyname, roles, cmd
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
```

## 10. Archivos modificados

| Archivo | Cambio | Motivo |
| --- | --- | --- |
| `docs/piloto-productivo.md` | Guia de piloto productivo cerrado, matrices y checklist | Alinear operacion con datos reales |
| `.env.example` | Variables por ambiente y restricciones demo | Evitar mezcla staging/demo/production |
| `README.md` | Enlace y criterio de piloto cerrado | Cambiar enfoque del proyecto |
| `supabase/migrations/20260522053728_closed_pilot_rls_hardening.sql` | Revoke anon en tablas sensibles y grants explicitos de vista publica | Reducir superficie anon |
| `app/api/reserva-publica/route.ts` | Log sin destinatario | Evitar exponer email en logs |
| `app/actions/reservas.ts` | Log sin destinatario | Evitar exponer email en logs |
| `tests/prelaunch-hardening.test.ts` | Guardrails de piloto productivo | Evitar regresiones |

## 11. Riesgos restantes

Criticos:

- No se puede afirmar RLS productivo validado hasta aplicar migraciones y correr SQL en Supabase staging/production.
- No operar production sin backup confirmado antes de migraciones.

Altos:

- Definir regla exacta de privacidad por profesional: todo el centro vs solo pacientes asignados.
- Politica de privacidad/consentimiento debe quedar visible antes de escalar.

Medios:

- Vista publica `public_booking_professionals` es definer por necesidad operativa; mantener proyeccion minima y auditar cualquier columna nueva.
- Revisar logs historicos de proveedores externos.

Bajos:

- Supabase CLI local esta algo detras de la version sugerida; actualizar fuera de cambios urgentes.

## 12. Recomendacion final

Agendix no debería seguir operando con datos reales hasta corregir los siguientes puntos críticos: Supabase production/staging no estan formalmente identificados, backup production no esta verificado, variables Vercel Production no estan verificadas y la matriz RLS real no fue ejecutada. No sumar pacientes ni centros hasta cerrar el NO-GO documentado en `docs/mapeo-ambientes-reales.md`.
