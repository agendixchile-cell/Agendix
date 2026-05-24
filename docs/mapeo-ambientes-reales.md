# Mapeo y Preparacion de Ambientes Reales Agendix

## 1. Resumen ejecutivo

Estado general: hotfix critico aplicado en production Agendix y ronda de migraciones 2026-05-24 aplicada despues de staging, Vercel y export manual. El usuario confirmo que `https://sbebrhlcxwmzixpzvhuq.supabase.co` es Agendix. Existe un proyecto Supabase separado para `Agendix Staging`. Los proyectos Pehuen Capital/Lawen listados anteriormente no pertenecen a Agendix y no se deben tocar.

Que se pudo verificar:

- `supabase/config.toml` declara `project_id = "sbebrhlcxwmzixpzvhuq"`.
- `.env.local` apunta a `https://sbebrhlcxwmzixpzvhuq.supabase.co`.
- `README.md` contiene un comando production de SMTP contra `sbebrhlcxwmzixpzvhuq`.
- `supabase projects list` lista `tbnwnrxiqdapxbvsmfsb` y `tenlwzmkuledugizgvcj`, ambos saludables, pero el usuario confirmo que corresponden a otros proyectos y no a Agendix.
- Antes del hotfix, validacion REST anon contra `sbebrhlcxwmzixpzvhuq` mostro exposicion: `profiles`, `miembros_centro` y `salas` eran legibles por `anon`, y `public_booking_professionals` no existia.
- Despues del hotfix, `public_booking_professionals` responde `206` y las tablas sensibles probadas responden `401` para `anon`.
- `.vercel/project.json` identifica el proyecto Vercel local como `agendix`.

Que no se pudo verificar:

- Variables Vercel Preview/Development.
- Backups automaticos/PITR Supabase production; production esta en Free y Dashboard muestra que no incluye project backups.
- Restauracion probada del export manual.

Nivel de riesgo: medio operativo para piloto cerrado. La exposicion publica critica fue cerrada, staging dedicado existe, Vercel Production fue revisado y la ronda 2026-05-24 fue aplicada. El riesgo vuelve a subir antes de futuras migraciones si no se crea un nuevo export manual, porque Supabase production sigue en Free sin PITR/backups automaticos.

Recomendacion: Agendix puede continuar como piloto cerrado con cambios controlados. No ejecutar futuras migraciones productivas normales mientras production siga sin backups automaticos/PITR sin crear antes un export manual reciente.

## 2. Supabase Projects

| Project ref | Nombre | URL | Ambiente asignado | Evidencia | Certeza | Accion |
| --- | --- | --- | --- | --- | --- | --- |
| `sbebrhlcxwmzixpzvhuq` | Agendix | `https://sbebrhlcxwmzixpzvhuq.supabase.co` | Production Agendix confirmado | Confirmacion del usuario, `supabase/config.toml`, `.env.local`, README, Dashboard Supabase | Alta | Migraciones 2026-05-24 aplicadas; crear nuevo export antes de futuras migraciones |
| `mihdpjvdzorsutpgwrgv` | Agendix Staging | `https://mihdpjvdzorsutpgwrgv.supabase.co` | Staging Agendix confirmado | Proyecto creado en organizacion `agendixchile`, region `us-east-1`, Data API activo, auto-RLS activo | Alta | Migraciones aplicadas y RLS/REST anon OK |
| `tbnwnrxiqdapxbvsmfsb` | `etorresc1401's Project` | `https://tbnwnrxiqdapxbvsmfsb.supabase.co` | No usar | Usuario confirmo que Agendix no tiene relacion con Pehuen Capital/Lawen; anon key no matchea `.env.local` | Alta | No tocar |
| `tenlwzmkuledugizgvcj` | `etorresc1401's Project` | `https://tenlwzmkuledugizgvcj.supabase.co` | No usar | Usuario confirmo que Agendix no tiene relacion con Pehuen Capital/Lawen; anon key no matchea `.env.local` | Alta | No tocar |

Riesgo especial: `.env.local` tiene `AGENDIX_DEMO_MODE=true` y apunta a production Agendix. Cualquier operacion local fuera del modo demo podria consultar production. Mantener `.env.local` como local-only y no usarlo para seeds ni pruebas destructivas.

Hallazgo critico REST anon y resultado post-hotfix:

| Objeto | Resultado anon real | Riesgo | Accion |
| --- | --- | --- | --- |
| `public_booking_professionals` | Antes: `404 PGRST205`; despues: `206` | Portal publico necesitaba vista minima | Corregido |
| `profiles` | Antes: `206`; despues: `401` | Exposicion publica de perfiles | Corregido |
| `miembros_centro` | Antes: `206`; despues: `401` | Exposicion publica de miembros/roles operativos | Corregido |
| `salas` | Antes: `206`; despues: `401` | Exposicion publica innecesaria de salas | Corregido |

Comandos seguros de solo lectura ya ejecutados:

```bash
supabase projects list --output json
```

Comandos bloqueados hasta DB password/login CLI funcional:

```bash
supabase link --project-ref mihdpjvdzorsutpgwrgv
supabase db push
supabase link --project-ref sbebrhlcxwmzixpzvhuq
supabase db push
```

## 3. Variables Vercel

No hay Vercel CLI disponible en este entorno (`npx` no existe y no se encontro auth local de Vercel). Existe `.vercel/project.json` con `projectName = "agendix"`, pero no permite verificar variables remotas.

| Variable | Production esperado | Estado verificado | Riesgo | Accion |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del Supabase production confirmado | No verificado | Critico si apunta a staging/demo o proyecto desconocido | Revisar en Vercel Dashboard y comparar ref |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key del mismo proyecto production | No verificado | Alto si pertenece a otro proyecto | Comparar contra Supabase Dashboard production |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role production, server-side, sin `NEXT_PUBLIC` | No verificado | Critico si se expone al cliente | Confirmar variable server-side y rotar si estuvo expuesta |
| `NEXT_PUBLIC_APP_URL` | Dominio real de app | No verificado | Medio: auth/links rotos | Confirmar dominio production |
| `NEXT_PUBLIC_MARKETING_URL` | Dominio marketing real | No verificado | Bajo/medio | Confirmar dominio vigente |
| `APP_BASE_URL` | Dominio real de app para emails/functions | No verificado | Medio | Confirmar dominio production |
| `AGENDIX_DEMO_ENABLED` | `false` o ausente | No verificado | Critico si `true` | Apagar en Production |
| `NEXT_PUBLIC_AGENDIX_DEMO_ENABLED` | `false` o ausente | No verificado | Critico si `true` | Apagar en Production |
| `RESEND_API_KEY` | Production si emails reales activos | No verificado | Medio/alto | Confirmar dominio/remitente y no imprimir secreto |
| `STRIPE_SECRET_KEY` | Ausente o no usada mientras pagos reales no esten releaseados | No verificado | Alto | No activar pagos reales incompletos |
| `STRIPE_WEBHOOK_SECRET` | Ausente o coherente con entorno si se usa | No verificado | Alto | No activar webhook real incompleto |

Checklist manual exacto en Vercel Dashboard:

1. Abrir Vercel Dashboard > proyecto `agendix` > Settings > Environment Variables.
2. Filtrar por Production.
3. Verificar que `NEXT_PUBLIC_SUPABASE_URL` contiene el ref production confirmado.
4. Verificar que `NEXT_PUBLIC_SUPABASE_ANON_KEY` pertenece al mismo proyecto.
5. Verificar que `SUPABASE_SERVICE_ROLE_KEY` existe solo como variable server-side, sin prefijo `NEXT_PUBLIC`.
6. Confirmar `AGENDIX_DEMO_ENABLED` ausente o `false`.
7. Confirmar `NEXT_PUBLIC_AGENDIX_DEMO_ENABLED` ausente o `false`.
8. Confirmar `NEXT_PUBLIC_APP_URL` y `APP_BASE_URL` con dominio real de app.
9. Confirmar `NEXT_PUBLIC_MARKETING_URL` con dominio marketing real.
10. Confirmar que no hay refs staging/demo en Production.
11. Confirmar que no hay claves `sk_test`/mock usadas como si fueran production.
12. Repetir para Preview y Development, asegurando que no apunten a production salvo decision explicita y documentada.

Verificacion local sin exponer secretos:

1. En Vercel, exportar o copiar las variables Production a un archivo local llamado `.env.production.verification`.
2. No commitear ese archivo.
3. Ejecutar:

```bash
node scripts/verify-production-env-safety.mjs .env.production.verification
```

El script no imprime secretos. Solo indica si faltan variables, si production apunta a otro Supabase, si demo esta activa o si algun secreto aparece con prefijo `NEXT_PUBLIC_`.

## 4. Backup Production

Estado: verificado parcialmente y no satisfactorio para migraciones futuras.

| Item | Estado | Evidencia | Pendiente |
| --- | --- | --- | --- |
| Backup automatico activo | No verificado como disponible | CLI devuelve `backups: []`, `pitr_enabled: false`, `walg_enabled: true` | Confirmar plan/backups en Dashboard |
| Ultimo backup | No disponible por CLI | `backups: []` | Registrar fecha/hora o crear export antes de nuevas migraciones |
| Restauracion probada | No verificado | No hay evidencia | Probar restore en staging o documentar procedimiento |
| Export manual previo | No | No ejecutado para evitar tocar proyecto desconocido | Crear/exportar solo despues de identificar production |
| Responsable | Pendiente | No documentado en repo | Asignar responsable operativo |

Recomendacion: production queda bloqueado para nuevas migraciones hasta confirmar backup automatico y ultimo backup. El hotfix se aplico por exposicion publica critica y fue transaccional/no destructivo.

## 5. Staging

Staging identificado: si.

| Item | Valor actual |
| --- | --- |
| Nombre | `Agendix Staging` |
| Project ref | `mihdpjvdzorsutpgwrgv` |
| URL | `https://mihdpjvdzorsutpgwrgv.supabase.co` |
| Organizacion | `agendixchile` |
| Region | `us-east-1` |
| Plan | Free, sin backups automaticos/PITR |
| Datos permitidos | Ficticios o anonimizados |
| Estado CLI | Pendiente DB password o login CLI funcional |

Configuracion requerida:

| Item | Valor requerido |
| --- | --- |
| Nombre | `Agendix Staging` |
| Organizacion | `agendixchile` |
| Region | Misma que production si es posible: `us-east-1` |
| Datos | Ficticios o anonimizados |
| Demo | Permitida solo si no toca production |
| Variables Vercel Preview | Deben apuntar a staging, nunca a production |
| Service role | Solo server-side |

Migraciones dry-run por CLI: no ejecutado, porque falta password/login CLI funcional.

Migraciones aplicadas: intento via SQL Editor. La corrida completa detecto dos problemas locales corregidos en repo: un `UPDATE ... FROM lateral` invalido en `20260520040044_subscription_plans.sql` y una migracion de hardening que referenciaba `public_booking_professionals` antes de crear la vista. Se debe reintentar staging con las migraciones corregidas.

QA staging: no ejecutado.

RLS staging: no ejecutado.

Errores detectados y corregidos localmente:

- `ERROR 42P10`: referencia invalida a alias `c` en `UPDATE ... FROM lateral`.
- `ERROR 42P01`: `public.public_booking_professionals` no existia cuando la migracion de hardening intentaba revocar/grantear la vista.

Cuando se tenga el DB password o CLI autenticada, ejecutar:

```bash
supabase link --project-ref mihdpjvdzorsutpgwrgv
supabase migration list --linked
supabase db push --dry-run
```

Si el dry-run lista solo migraciones esperadas y no hay cambios destructivos:

```bash
supabase db push
supabase migration list --linked
```

QA staging minimo:

- Login.
- Dashboard.
- Pacientes.
- Profesionales.
- Servicios.
- Salas.
- Agenda.
- Portal publico.
- Crear reserva de prueba.
- Confirmar pago online desactivado.
- Confirmar demo separada de datos reales.

Bloqueo actual: no se aprueban nuevas migraciones production hasta que staging aplique migraciones corregidas y pase RLS/QA.

## 6. Production

Production identificado: si, por confirmacion del usuario.

Ambiente production: `sbebrhlcxwmzixpzvhuq`.

Dry-run production preparado: no para migraciones completas. Hotfix SQL aplicado via `supabase db query --linked --file supabase/emergency/production-anon-rls-hotfix.sql`.

Riesgos:

- No tener backup confirmado.
- No tener variables Vercel production verificadas.
- No haber pasado staging/RLS.
- Exposicion anon critica fue corregida, pero debe monitorearse.

Recomendacion: no ejecutar migraciones completas hasta tener backup/staging/Vercel verificados. No tocar Pehuen/Lawen.

## 7. RLS

No se ejecuto SQL real porque staging/production no estan identificados. Tabla de validacion pendiente:

| Objeto | Esperado | Resultado | Estado | Accion |
| --- | --- | --- | --- | --- |
| `public_booking_professionals` | Select para `anon`/`authenticated`, campos minimos | `206`, grants solo `SELECT` para `anon`/`authenticated` | OK | Monitorear columnas |
| `profiles` | Sin grants `anon` | `401`; grants anon 0 filas | OK | Ninguna |
| `miembros_centro` | Sin grants `anon` | `401`; grants anon 0 filas | OK | Ninguna |
| `pacientes` | Sin grants `anon`; multi-tenant protegido | `401`; grants anon 0 filas | OK anon | Pendiente authenticated multi-tenant |
| `reservas` | Sin grants `anon`; multi-tenant protegido | `401`; grants anon 0 filas | OK anon | Pendiente authenticated multi-tenant |
| `pagos` | Sin grants `anon` | `401`; grants anon 0 filas | OK | Ninguna |
| `fichas_clinicas` | Sin grants `anon` | `401`; grants anon 0 filas | OK anon | Pendiente reglas profesional |
| `evoluciones_sesion` | Sin grants `anon` | `401`; grants anon 0 filas | OK anon | Pendiente reglas profesional |
| `recordatorios_reserva` | Sin grants `anon` | `401`; grants anon 0 filas | OK | Ninguna |
| `configuracion_recordatorios` | Sin grants `anon` | `401`; grants anon 0 filas | OK | Ninguna |
| `subscriptions` | Sin grants `anon`; owner-only authenticated | `401`; grants anon 0 filas | OK anon | Pendiente owner-only QA |
| `rate_limit_buckets` | Service-only | `401`; grants anon 0 filas | OK | Ninguna |
| `salas` | Sin grants `anon` tras hardening | `401`; grants anon 0 filas | OK | Ninguna |
| `create_reserva_atomic` | `anon_execute=false` | `anon_execute=false` | OK | Ninguna |
| `update_reserva_atomic` | `anon_execute=false` | `anon_execute=false` | OK | Ninguna |
| `check_rate_limit` | Solo `service_role` | `anon_execute=false`, `authenticated_execute=false`, `service_role_execute=true` | OK | Ninguna |

SQL a ejecutar esta en `docs/cierre-operativo-piloto.md`.

## 8. Go / No-Go

GO controlado completado para la ronda de migraciones del 2026-05-24. Staging paso migraciones/RLS/REST anon, Vercel Production fue revisado, se creo export manual production y production fue migrado/validado.

Para futuras migraciones production, volver a NO-GO preventivo hasta repetir:

- Export manual production reciente, porque Supabase sigue en Free sin PITR/backups automaticos.
- Migraciones aplicadas primero en staging.
- RLS/REST anon OK en staging.
- Variables Vercel Production verificadas.
- Dry-run production revisado.

## 9. Proximas acciones

1. Ejecutar QA production con `docs/qa-production-piloto.md`.
2. Monitorear logs Vercel/Supabase post-migracion.
3. Probar restauracion basica del export manual en un entorno no productivo.
4. Antes de futuras migraciones, crear un nuevo export manual y repetir staging/RLS/Vercel.
