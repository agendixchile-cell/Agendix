-- Timing configurable para recordatorios por correo.
-- Predeterminado: 24 horas antes de la cita, con confirmacion por link.

do $$
declare
  check_name text;
begin
  for check_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.configuracion_recordatorios'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%email_hours_before%'
  loop
    execute format(
      'alter table public.configuracion_recordatorios drop constraint %I',
      check_name
    );
  end loop;
end $$;

alter table public.configuracion_recordatorios
  alter column email_hours_before set default 24;

update public.configuracion_recordatorios
set
  email_hours_before = 24,
  updated_at = now()
where email_hours_before = 48
  or email_hours_before < 1
  or email_hours_before > 168;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.configuracion_recordatorios'::regclass
      and conname = 'configuracion_recordatorios_email_hours_before_range'
  ) then
    alter table public.configuracion_recordatorios
      add constraint configuracion_recordatorios_email_hours_before_range
      check (email_hours_before between 1 and 168);
  end if;
end $$;

create or replace function public.ensure_default_reminder_config()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
    new.id,
    true,
    false,
    24,
    24,
    'mock'
  )
  on conflict (centro_id) do nothing;

  return new;
end;
$$;

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

  if new.estado = 'cancelada' then
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
    and r.estado <> 'cancelada'
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
    and r.estado <> 'cancelada'
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
  and r.estado <> 'cancelada'
  and r.fecha_inicio > now();
