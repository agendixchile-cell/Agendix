-- Ajusta grants explicitos que Supabase/PostgREST expuso a anon/authenticated.
-- check_rate_limit debe ser invocado solo desde el servidor con service_role.
-- update_reserva_atomic no debe ser invocable por anon.

revoke execute on function public.check_rate_limit(
  text,
  integer,
  integer,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.check_rate_limit(
  text,
  integer,
  integer,
  timestamptz
) to service_role;

revoke execute on function public.update_reserva_atomic(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  timestamptz,
  uuid,
  public.estado_reserva,
  public.estado_asistencia,
  text
) from public, anon;

grant execute on function public.update_reserva_atomic(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  timestamptz,
  uuid,
  public.estado_reserva,
  public.estado_asistencia,
  text
) to authenticated, service_role;
