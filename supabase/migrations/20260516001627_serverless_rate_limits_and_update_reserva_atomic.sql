-- Pendientes pre-lanzamiento:
-- 1) Mueve el rate limit publico a Postgres para que sea consistente en serverless.
-- 2) Agrega update_reserva_atomic para que la edicion interna tenga el mismo
--    lock transaccional por centro que la creacion de reservas.

create table if not exists public.rate_limit_buckets (
  key_hash text primary key,
  bucket_count integer not null default 0,
  reset_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rate_limit_buckets_count_nonnegative check (bucket_count >= 0)
);

create index if not exists rate_limit_buckets_reset_at_idx
  on public.rate_limit_buckets (reset_at);

alter table public.rate_limit_buckets enable row level security;

revoke all on table public.rate_limit_buckets from public;
revoke all on table public.rate_limit_buckets from anon, authenticated;
grant select, insert, update, delete on table public.rate_limit_buckets to service_role;

create or replace function public.check_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer,
  p_now timestamptz default now()
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz,
  retry_after_seconds integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
  v_reset_at timestamptz;
begin
  if p_key_hash is null or length(trim(p_key_hash)) = 0 then
    raise exception 'rate limit key is required';
  end if;

  if p_limit < 1 then
    raise exception 'rate limit must be positive';
  end if;

  if p_window_seconds < 1 then
    raise exception 'rate limit window must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('rate-limit:' || p_key_hash, 0));

  delete from public.rate_limit_buckets
  where reset_at < p_now - interval '1 day';

  select bucket_count, reset_at
    into v_count, v_reset_at
  from public.rate_limit_buckets
  where key_hash = p_key_hash
  for update;

  if v_count is null or v_reset_at <= p_now then
    v_count := 1;
    v_reset_at := p_now + (p_window_seconds * interval '1 second');

    insert into public.rate_limit_buckets (
      key_hash,
      bucket_count,
      reset_at,
      created_at,
      updated_at
    )
    values (
      p_key_hash,
      v_count,
      v_reset_at,
      p_now,
      p_now
    )
    on conflict (key_hash) do update
    set
      bucket_count = excluded.bucket_count,
      reset_at = excluded.reset_at,
      updated_at = excluded.updated_at;

    return query select
      true,
      greatest(0, p_limit - v_count),
      v_reset_at,
      0;
    return;
  end if;

  if v_count >= p_limit then
    return query select
      false,
      0,
      v_reset_at,
      greatest(1, ceil(extract(epoch from (v_reset_at - p_now)))::integer);
    return;
  end if;

  v_count := v_count + 1;

  update public.rate_limit_buckets
  set
    bucket_count = v_count,
    updated_at = p_now
  where key_hash = p_key_hash;

  return query select
    true,
    greatest(0, p_limit - v_count),
    v_reset_at,
    0;
end;
$$;

comment on function public.check_rate_limit(text, integer, integer, timestamptz) is
  'Atomic fixed-window rate limit backed by Postgres. The key must be a server-side hash.';

revoke all on function public.check_rate_limit(
  text,
  integer,
  integer,
  timestamptz
) from public;

grant execute on function public.check_rate_limit(
  text,
  integer,
  integer,
  timestamptz
) to service_role;

grant usage on type public.estado_reserva to authenticated, service_role;
grant usage on type public.estado_asistencia to authenticated, service_role;

create or replace function public.update_reserva_atomic(
  p_reserva_id uuid,
  p_centro_id uuid,
  p_profesional_id uuid,
  p_paciente_id uuid,
  p_servicio_id uuid,
  p_fecha_inicio timestamptz,
  p_sala_id uuid,
  p_estado public.estado_reserva default 'pending',
  p_estado_asistencia public.estado_asistencia default 'sin_marcar',
  p_notas text default null
)
returns table (
  ok boolean,
  code text,
  message text,
  reserva_id uuid,
  sala_id uuid,
  fecha_inicio timestamptz,
  fecha_fin timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_duracion_minutos integer;
  v_fecha_fin timestamptz;
  v_break_minutos integer := 0;
  v_break interval := interval '0 minutes';
  v_dia integer;
  v_horario_activo boolean;
  v_horario_inicio time;
  v_horario_fin time;
  v_descanso_activo boolean;
  v_descanso_inicio time;
  v_descanso_fin time;
  v_start_time time;
  v_end_time time;
  v_existing_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_centro_id::text, 0));

  select r.id
    into v_existing_id
  from public.reservas r
  where r.id = p_reserva_id
    and r.centro_id = p_centro_id
  for update;

  if v_existing_id is null then
    return query select false, 'reserva_no_encontrada', 'No encontramos la reserva seleccionada.', null::uuid, null::uuid, p_fecha_inicio, null::timestamptz;
    return;
  end if;

  select s.duracion_minutos
    into v_duracion_minutos
  from public.servicios s
  where s.id = p_servicio_id
    and s.centro_id = p_centro_id
    and s.activo = true;

  if v_duracion_minutos is null then
    return query select false, 'servicio_no_disponible', 'Selecciona un servicio activo del centro.', p_reserva_id, p_sala_id, p_fecha_inicio, null::timestamptz;
    return;
  end if;

  select coalesce(mc.descanso_entre_reservas_minutos, 0)
    into v_break_minutos
  from public.miembros_centro mc
  where mc.centro_id = p_centro_id
    and mc.profile_id = p_profesional_id
    and mc.activo = true
    and mc.rol in ('admin', 'profesional');

  if v_break_minutos is null then
    return query select false, 'profesional_no_disponible', 'Selecciona un profesional activo del centro.', p_reserva_id, p_sala_id, p_fecha_inicio, null::timestamptz;
    return;
  end if;

  if not exists (
    select 1
    from public.pacientes p
    where p.id = p_paciente_id
      and p.centro_id = p_centro_id
  ) then
    return query select false, 'paciente_no_disponible', 'No encontramos el paciente seleccionado.', p_reserva_id, p_sala_id, p_fecha_inicio, null::timestamptz;
    return;
  end if;

  if not exists (
    select 1
    from public.salas s
    where s.id = p_sala_id
      and s.centro_id = p_centro_id
      and s.activa = true
  ) then
    return query select false, 'sala_no_disponible', 'Selecciona una sala activa del centro.', p_reserva_id, p_sala_id, p_fecha_inicio, null::timestamptz;
    return;
  end if;

  v_fecha_fin := p_fecha_inicio + make_interval(mins => v_duracion_minutos);
  v_break := make_interval(mins => greatest(v_break_minutos, 0));

  if p_estado <> 'cancelled' then
    v_dia := extract(isodow from p_fecha_inicio at time zone 'America/Santiago')::integer;
    v_start_time := (p_fecha_inicio at time zone 'America/Santiago')::time;
    v_end_time := (v_fecha_fin at time zone 'America/Santiago')::time;

    select h.activo, h.inicio::time, h.fin::time, h.descanso_activo, h.descanso_inicio::time, h.descanso_fin::time
      into v_horario_activo, v_horario_inicio, v_horario_fin, v_descanso_activo, v_descanso_inicio, v_descanso_fin
    from public.horarios_centro h
    where h.centro_id = p_centro_id
      and h.dia = v_dia;

    if v_horario_activo is null then
      v_horario_activo := v_dia <= 6;
      v_horario_inicio := time '09:00';
      v_horario_fin := time '19:00';
      v_descanso_activo := false;
      v_descanso_inicio := time '13:00';
      v_descanso_fin := time '14:00';
    end if;

    if not v_horario_activo
      or v_start_time < v_horario_inicio
      or v_end_time > v_horario_fin then
      return query select false, 'fuera_de_horario', 'Ese horario esta fuera del horario de atencion.', p_reserva_id, p_sala_id, p_fecha_inicio, v_fecha_fin;
      return;
    end if;

    if v_descanso_activo
      and v_start_time < v_descanso_fin
      and v_end_time > v_descanso_inicio then
      return query select false, 'descanso_centro', 'Ese horario coincide con el descanso del centro.', p_reserva_id, p_sala_id, p_fecha_inicio, v_fecha_fin;
      return;
    end if;

    if exists (
      select 1
      from public.bloqueos_agenda b
      where b.centro_id = p_centro_id
        and b.fecha_inicio < v_fecha_fin
        and b.fecha_fin > p_fecha_inicio
        and (b.profesional_id is null or b.profesional_id = p_profesional_id)
    ) then
      return query select false, 'horario_bloqueado', 'Ese horario esta bloqueado. Elige otra hora.', p_reserva_id, p_sala_id, p_fecha_inicio, v_fecha_fin;
      return;
    end if;

    if exists (
      select 1
      from public.reservas r
      where r.centro_id = p_centro_id
        and r.id <> p_reserva_id
        and r.profesional_id = p_profesional_id
        and r.estado <> 'cancelled'
        and r.fecha_inicio < v_fecha_fin + v_break
        and r.fecha_fin > p_fecha_inicio - v_break
    ) then
      return query select false, 'conflicto_profesional', 'El profesional ya tiene una reserva en ese horario.', p_reserva_id, p_sala_id, p_fecha_inicio, v_fecha_fin;
      return;
    end if;

    if exists (
      select 1
      from public.reservas r
      where r.centro_id = p_centro_id
        and r.id <> p_reserva_id
        and r.sala_id = p_sala_id
        and r.estado <> 'cancelled'
        and r.fecha_inicio < v_fecha_fin
        and r.fecha_fin > p_fecha_inicio
    ) then
      return query select false, 'conflicto_sala', 'La sala ya tiene una reserva en ese horario.', p_reserva_id, p_sala_id, p_fecha_inicio, v_fecha_fin;
      return;
    end if;
  end if;

  begin
    update public.reservas
    set
      sala_id = p_sala_id,
      profesional_id = p_profesional_id,
      paciente_id = p_paciente_id,
      servicio_id = p_servicio_id,
      fecha_inicio = p_fecha_inicio,
      fecha_fin = v_fecha_fin,
      estado = p_estado,
      estado_asistencia = p_estado_asistencia,
      notas = nullif(trim(p_notas), '')
    where id = p_reserva_id
      and centro_id = p_centro_id;
  exception
    when exclusion_violation then
      if position('reservas_no_solapan_por_sala' in sqlerrm) > 0 then
        return query select false, 'conflicto_sala', 'La sala ya tiene una reserva en ese horario.', p_reserva_id, p_sala_id, p_fecha_inicio, v_fecha_fin;
      else
        return query select false, 'conflicto_profesional', 'El profesional ya tiene una reserva en ese horario.', p_reserva_id, p_sala_id, p_fecha_inicio, v_fecha_fin;
      end if;
      return;
  end;

  return query select true, 'updated', 'Reserva actualizada correctamente.', p_reserva_id, p_sala_id, p_fecha_inicio, v_fecha_fin;
end;
$$;

comment on function public.update_reserva_atomic(
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
) is
  'Actualiza reservas de forma atomica usando advisory lock por centro; valida horario, bloqueos, sala, profesional y descanso entre reservas.';

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
) from public;

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
