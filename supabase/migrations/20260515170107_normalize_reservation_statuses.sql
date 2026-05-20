-- Normaliza los estados de reserva al vocabulario canonico de producto.
-- Los bloqueos/descansos siguen fuera de la tabla reservas.

drop index if exists public.reservas_public_booking_conflicts_idx;
drop trigger if exists reservas_sync_recordatorios on public.reservas;

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'estado_reserva'
  )
  and not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'estado_reserva'
      and e.enumlabel = 'pending'
  ) then
    create type public.estado_reserva_v2 as enum (
      'pending',
      'confirmed',
      'completed',
      'cancelled',
      'no_show'
    );

    alter table public.reservas
      alter column estado drop default;

    alter table public.reservas
      alter column estado type public.estado_reserva_v2
      using (
        case
          when estado_asistencia::text = 'no_asistio' then 'no_show'
          when estado::text = 'pendiente' then 'pending'
          when estado::text = 'en_espera' then 'pending'
          when estado::text = 'reagendada' then 'pending'
          when estado::text = 'confirmada' then 'confirmed'
          when estado::text = 'completada' then 'completed'
          when estado::text = 'cancelada' then 'cancelled'
          else 'pending'
        end
      )::public.estado_reserva_v2;

    alter type public.estado_reserva rename to estado_reserva_legacy_20260515;
    alter type public.estado_reserva_v2 rename to estado_reserva;
    drop type public.estado_reserva_legacy_20260515;
  end if;
end $$;

alter table public.reservas
  alter column estado set default 'pending';

comment on type public.estado_reserva is
  'Estados canonicos de una reserva: pending, confirmed, completed, cancelled, no_show.';

grant usage on type public.estado_reserva to authenticated;

create index if not exists reservas_public_booking_conflicts_idx
  on public.reservas (centro_id, profesional_id, fecha_inicio, fecha_fin)
  where estado <> 'cancelled';

create or replace function public.sync_reservation_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  email_hours integer;
  whatsapp_hours integer;
begin
  insert into public.configuracion_recordatorios (
    centro_id,
    email_enabled,
    whatsapp_enabled,
    email_hours_before,
    whatsapp_hours_before,
    whatsapp_mode
  )
  values (
    new.centro_id,
    true,
    false,
    24,
    24,
    'mock'
  )
  on conflict (centro_id) do nothing;

  select
    least(greatest(coalesce(cr.email_hours_before, 24), 1), 168),
    least(greatest(coalesce(cr.whatsapp_hours_before, 24), 1), 168)
  into email_hours, whatsapp_hours
  from public.configuracion_recordatorios cr
  where cr.centro_id = new.centro_id;

  email_hours := coalesce(email_hours, 24);
  whatsapp_hours := coalesce(whatsapp_hours, 24);

  if new.estado = 'cancelled' then
    update public.recordatorios_reserva
    set
      estado = 'omitido',
      error_message = 'Reserva cancelada antes del envio.',
      processing_started_at = null,
      updated_at = now()
    where reserva_id = new.id
      and estado in ('pendiente', 'fallido', 'procesando');

    return new;
  end if;

  insert into public.recordatorios_reserva (
    centro_id,
    reserva_id,
    paciente_id,
    canal,
    tipo,
    estado,
    scheduled_for,
    sent_at,
    error_message
  )
  values
    (
      new.centro_id,
      new.id,
      new.paciente_id,
      'email',
      'recordatorio_48h',
      'pendiente',
      new.fecha_inicio - make_interval(hours => email_hours),
      null,
      null
    ),
    (
      new.centro_id,
      new.id,
      new.paciente_id,
      'whatsapp',
      'recordatorio_24h',
      'pendiente',
      new.fecha_inicio - make_interval(hours => whatsapp_hours),
      null,
      null
    )
  on conflict (reserva_id, canal, tipo) do update
  set
    centro_id = excluded.centro_id,
    paciente_id = excluded.paciente_id,
    scheduled_for = excluded.scheduled_for,
    estado = case
      when public.recordatorios_reserva.estado = 'enviado'
        then public.recordatorios_reserva.estado
      else 'pendiente'::public.estado_recordatorio
    end,
    sent_at = case
      when public.recordatorios_reserva.estado = 'enviado'
        then public.recordatorios_reserva.sent_at
      else null
    end,
    error_message = case
      when public.recordatorios_reserva.estado = 'enviado'
        then public.recordatorios_reserva.error_message
      else null
    end,
    provider = case
      when public.recordatorios_reserva.estado = 'enviado'
        then public.recordatorios_reserva.provider
      else null
    end,
    provider_message_id = case
      when public.recordatorios_reserva.estado = 'enviado'
        then public.recordatorios_reserva.provider_message_id
      else null
    end,
    processing_started_at = null,
    updated_at = now();

  return new;
end;
$$;

create trigger reservas_sync_recordatorios
  after insert or update of centro_id, paciente_id, fecha_inicio, estado
  on public.reservas
  for each row execute function public.sync_reservation_reminders();

create or replace function public.claim_due_reservation_reminders(batch_size integer default 25)
returns table (
  recordatorio_id uuid,
  reserva_id uuid,
  centro_id uuid,
  paciente_id uuid,
  canal public.canal_recordatorio,
  tipo public.tipo_recordatorio,
  scheduled_for timestamptz,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  paciente_nombre text,
  paciente_apellido text,
  paciente_email text,
  paciente_telefono text,
  centro_nombre text,
  centro_email text,
  centro_telefono text,
  servicio_nombre text,
  profesional_nombre text,
  email_subject_template text,
  email_body_template text,
  confirmacion_token text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  effective_batch integer;
begin
  effective_batch := least(greatest(coalesce(batch_size, 25), 1), 100);

  update public.recordatorios_reserva rr
  set
    estado = 'pendiente',
    processing_started_at = null,
    error_message = 'Reintentando luego de un proceso interrumpido.',
    updated_at = now()
  where rr.estado = 'procesando'
    and rr.processing_started_at < now() - interval '15 minutes';

  return query
  with due as (
    select rr.id
    from public.recordatorios_reserva rr
    join public.reservas r on r.id = rr.reserva_id
    join public.configuracion_recordatorios cr on cr.centro_id = rr.centro_id
    where rr.estado = 'pendiente'
      and rr.scheduled_for <= now()
      and r.fecha_inicio > now()
      and r.estado <> 'cancelled'
      and (
        (rr.canal = 'email' and cr.email_enabled = true)
        or (rr.canal = 'whatsapp' and cr.whatsapp_enabled = true)
      )
    order by rr.scheduled_for asc
    limit effective_batch
    for update of rr skip locked
  ),
  claimed as (
    update public.recordatorios_reserva rr
    set
      estado = 'procesando',
      processing_started_at = now(),
      last_attempt_at = now(),
      attempt_count = rr.attempt_count + 1,
      error_message = null,
      updated_at = now()
    from due
    where rr.id = due.id
    returning rr.*
  )
  select
    rr.id,
    rr.reserva_id,
    rr.centro_id,
    rr.paciente_id,
    rr.canal,
    rr.tipo,
    rr.scheduled_for,
    r.fecha_inicio,
    r.fecha_fin,
    p.nombre,
    p.apellido,
    p.email,
    p.telefono,
    c.nombre,
    c.email,
    c.telefono,
    s.nombre,
    coalesce(pr.nombre, 'Profesional'),
    coalesce(nullif(crp.email_subject_template, ''), cr.email_subject_template),
    coalesce(nullif(crp.email_body_template, ''), cr.email_body_template),
    rc.token
  from claimed rr
  join public.reservas r on r.id = rr.reserva_id
  join public.pacientes p on p.id = rr.paciente_id
  join public.centros c on c.id = rr.centro_id
  join public.servicios s on s.id = r.servicio_id
  join public.configuracion_recordatorios cr on cr.centro_id = rr.centro_id
  left join public.configuracion_recordatorios_profesional crp
    on crp.centro_id = rr.centro_id
    and crp.profesional_id = r.profesional_id
  left join public.reserva_confirmaciones rc on rc.reserva_id = rr.reserva_id
  left join public.profiles pr on pr.id = r.profesional_id
  order by rr.scheduled_for asc;
end;
$$;

revoke all on function public.claim_due_reservation_reminders(integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_reservation_reminders(integer)
  to service_role;

create or replace function public.reschedule_email_reminders_for_centro(
  target_centro_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email_hours integer;
  inserted_count integer := 0;
  updated_count integer := 0;
begin
  if auth.role() <> 'service_role'
    and not exists (
      select 1
      from public.miembros_centro mc
      where mc.centro_id = target_centro_id
        and mc.profile_id = auth.uid()
        and mc.rol = 'admin'
        and mc.activo = true
    )
  then
    raise exception 'No tienes permisos para reagendar recordatorios.'
      using errcode = '42501';
  end if;

  insert into public.configuracion_recordatorios (
    centro_id,
    email_enabled,
    whatsapp_enabled,
    email_hours_before,
    whatsapp_hours_before,
    whatsapp_mode
  )
  values (
    target_centro_id,
    true,
    false,
    24,
    24,
    'mock'
  )
  on conflict (centro_id) do nothing;

  select least(greatest(coalesce(cr.email_hours_before, 24), 1), 168)
  into current_email_hours
  from public.configuracion_recordatorios cr
  where cr.centro_id = target_centro_id;

  current_email_hours := coalesce(current_email_hours, 24);

  insert into public.recordatorios_reserva (
    centro_id,
    reserva_id,
    paciente_id,
    canal,
    tipo,
    estado,
    scheduled_for,
    sent_at,
    error_message
  )
  select
    r.centro_id,
    r.id,
    r.paciente_id,
    'email',
    'recordatorio_48h',
    'pendiente',
    r.fecha_inicio - make_interval(hours => current_email_hours),
    null,
    null
  from public.reservas r
  where r.centro_id = target_centro_id
    and r.estado <> 'cancelled'
    and r.fecha_inicio > now()
    and not exists (
      select 1
      from public.recordatorios_reserva rr
      where rr.reserva_id = r.id
        and rr.canal = 'email'
        and rr.tipo = 'recordatorio_48h'
    );

  get diagnostics inserted_count = row_count;

  update public.recordatorios_reserva rr
  set
    scheduled_for = r.fecha_inicio - make_interval(hours => current_email_hours),
    processing_started_at = null,
    updated_at = now()
  from public.reservas r
  where rr.reserva_id = r.id
    and rr.centro_id = target_centro_id
    and rr.canal = 'email'
    and rr.tipo = 'recordatorio_48h'
    and rr.estado in ('pendiente', 'fallido')
    and r.estado <> 'cancelled'
    and r.fecha_inicio > now();

  get diagnostics updated_count = row_count;

  return inserted_count + updated_count;
end;
$$;

revoke all on function public.reschedule_email_reminders_for_centro(uuid)
  from public, anon, authenticated;
grant execute on function public.reschedule_email_reminders_for_centro(uuid)
  to authenticated, service_role;

update public.recordatorios_reserva rr
set
  scheduled_for = r.fecha_inicio - make_interval(
    hours => least(greatest(coalesce(cr.email_hours_before, 24), 1), 168)
  ),
  processing_started_at = null,
  updated_at = now()
from public.reservas r
join public.configuracion_recordatorios cr on cr.centro_id = r.centro_id
where rr.reserva_id = r.id
  and rr.centro_id = r.centro_id
  and rr.canal = 'email'
  and rr.tipo = 'recordatorio_48h'
  and rr.estado in ('pendiente', 'fallido')
  and r.estado <> 'cancelled'
  and r.fecha_inicio > now();
