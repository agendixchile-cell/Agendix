-- Mantiene la RPC atomica fuera del acceso anonimo directo.
-- El portal publico crea reservas solo por app/api/reserva-publica con service role.

revoke all on function public.create_reserva_atomic(
  uuid,
  uuid,
  uuid,
  uuid,
  timestamptz,
  uuid,
  public.estado_reserva,
  text,
  text,
  text,
  text,
  numeric,
  char
) from public, anon;

grant execute on function public.create_reserva_atomic(
  uuid,
  uuid,
  uuid,
  uuid,
  timestamptz,
  uuid,
  public.estado_reserva,
  text,
  text,
  text,
  text,
  numeric,
  char
) to authenticated, service_role;

revoke all on function public.update_reserva_atomic(
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
