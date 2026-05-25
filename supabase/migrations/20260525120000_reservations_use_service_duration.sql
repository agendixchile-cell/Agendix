-- Reserva real = duracion del servicio.
-- El intervalo/duracion configurado en miembros_centro solo define granularidad
-- operacional de agenda, no el termino de la reserva.

do $$
declare
  function_oid oid;
  function_definition text;
begin
  select p.oid
    into function_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_reserva_atomic'
  order by p.oid desc
  limit 1;

  if function_oid is null then
    raise exception 'create_reserva_atomic not found';
  end if;

  function_definition := pg_get_functiondef(function_oid);
  function_definition := replace(
    function_definition,
    'coalesce(mc.duracion_sesion_minutos, v_servicio_duracion_minutos),',
    'v_servicio_duracion_minutos,'
  );

  execute function_definition;

  select p.oid
    into function_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'update_reserva_atomic'
  order by p.oid desc
  limit 1;

  if function_oid is null then
    raise exception 'update_reserva_atomic not found';
  end if;

  function_definition := pg_get_functiondef(function_oid);
  function_definition := replace(
    function_definition,
    'coalesce(mc.duracion_sesion_minutos, v_servicio_duracion_minutos)',
    'v_servicio_duracion_minutos'
  );

  execute function_definition;
end $$;

comment on column public.miembros_centro.duracion_sesion_minutos is
  'Duracion base operativa/legacy del profesional. La duracion real de reservas se calcula desde servicios.duracion_minutos.';

comment on column public.miembros_centro.intervalo_reservas_minutos is
  'Frecuencia en minutos para ofrecer horarios de inicio; no determina la duracion final de la reserva.';
