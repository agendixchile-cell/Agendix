-- Queries manuales de verificacion RLS/RPC pre-lanzamiento.
-- Ejecutar en un entorno seed/staging reemplazando los UUID marcados.

-- 1) Politicas clinicas instaladas.
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('fichas_clinicas', 'evoluciones_sesion')
order by tablename, policyname;

-- 2) Las RPC atomicas existen y no son SECURITY DEFINER.
select n.nspname, p.proname, p.prosecdef
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_reserva_atomic',
    'update_reserva_atomic',
    'check_rate_limit'
  );

-- 3) Verificacion con JWT de profesional:
-- En Supabase SQL Editor, usar "Run as authenticated user" con PROFESIONAL_A.
-- Debe devolver 0 para ficha de paciente que solo pertenece a PROFESIONAL_B.
select count(*) as fichas_no_autorizadas
from public.fichas_clinicas
where paciente_id = 'PACIENTE_SOLO_DE_OTRO_PROFESIONAL'::uuid;

-- 4) Verificacion con JWT de admin:
-- En Supabase SQL Editor, usar "Run as authenticated user" con ADMIN_DEL_CENTRO.
-- Debe devolver >= 1 si el centro tiene fichas.
select count(*) as fichas_visibles_admin
from public.fichas_clinicas
where centro_id = 'CENTRO_ID'::uuid;

-- 5) Verificacion de doble reserva:
-- Ejecutar scripts/verify-concurrent-booking.mjs con variables AGENDIX_VERIFY_*.
-- El resultado esperado es una reserva creada y un conflicto controlado.

-- 6) Verificacion de rate limit serverless:
-- Debe bloquear la segunda llamada cuando el limite es 1 dentro de la ventana.
select *
from public.check_rate_limit(
  'VERIFY_RATE_LIMIT_HASH',
  1,
  60,
  now()
);

-- 7) Grants esperados en RPC nuevas:
-- - check_rate_limit: solo service_role ejecuta.
-- - update_reserva_atomic: authenticated y service_role ejecutan; anon no.
select
  p.proname,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'execute') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'execute') as service_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('check_rate_limit', 'update_reserva_atomic')
order by p.proname;

select *
from public.check_rate_limit(
  'VERIFY_RATE_LIMIT_HASH',
  1,
  60,
  now()
);
