-- Recordatorios automaticos para reservas.
-- Email 48h antes y WhatsApp 24h antes, con logs e idempotencia.

create table if not exists public.configuracion_recordatorios (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centros(id) on delete cascade,
  email_enabled boolean not null default true,
  whatsapp_enabled boolean not null default true,
  email_hours_before integer not null default 48 check (email_hours_before = 48),
  whatsapp_hours_before integer not null default 24 check (whatsapp_hours_before = 24),
  whatsapp_mode text not null default 'mock' check (whatsapp_mode in ('mock', 'live')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint configuracion_recordatorios_centro_unique unique (centro_id)
);

insert into public.configuracion_recordatorios (centro_id)
select id
from public.centros
on conflict (centro_id) do nothing;

alter table public.recordatorios_reserva
  add column if not exists centro_id uuid references public.centros(id) on delete cascade,
  add column if not exists provider text,
  add column if not exists provider_message_id text,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists processing_started_at timestamptz,
  add column if not exists last_attempt_at timestamptz;

update public.recordatorios_reserva rr
set centro_id = r.centro_id
from public.reservas r
where rr.reserva_id = r.id
  and rr.centro_id is null;

alter table public.recordatorios_reserva
  alter column centro_id set not null;

update public.recordatorios_reserva rr
set canal = 'email'::public.canal_recordatorio
where rr.canal = 'whatsapp'
  and rr.tipo = 'recordatorio_48h'
  and rr.estado = 'pendiente'
  and not exists (
    select 1
    from public.recordatorios_reserva existing
    where existing.reserva_id = rr.reserva_id
      and existing.canal = 'email'
      and existing.tipo = 'recordatorio_48h'
  );

create index if not exists recordatorios_reserva_centro_estado_schedule_idx
  on public.recordatorios_reserva (centro_id, estado, scheduled_for);

create index if not exists recordatorios_reserva_processing_idx
  on public.recordatorios_reserva (estado, processing_started_at)
  where estado = 'procesando';

create table if not exists public.recordatorio_envios (
  id uuid primary key default gen_random_uuid(),
  recordatorio_id uuid not null references public.recordatorios_reserva(id) on delete cascade,
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  centro_id uuid not null references public.centros(id) on delete cascade,
  canal public.canal_recordatorio not null,
  tipo public.tipo_recordatorio not null,
  estado public.estado_recordatorio not null,
  provider text not null,
  provider_message_id text,
  recipient text,
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists recordatorio_envios_recordatorio_idx
  on public.recordatorio_envios (recordatorio_id, created_at desc);

create index if not exists recordatorio_envios_centro_idx
  on public.recordatorio_envios (centro_id, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'configuracion_recordatorios_updated_at'
  ) then
    create trigger configuracion_recordatorios_updated_at
      before update on public.configuracion_recordatorios
      for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.configuracion_recordatorios enable row level security;
alter table public.recordatorio_envios enable row level security;

create policy "miembros pueden leer configuracion recordatorios"
  on public.configuracion_recordatorios for select
  using (
    exists (
      select 1
      from public.miembros_centro mc
      where mc.centro_id = configuracion_recordatorios.centro_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
    )
  );

create policy "admins pueden escribir configuracion recordatorios"
  on public.configuracion_recordatorios for all
  using (
    exists (
      select 1
      from public.miembros_centro mc
      where mc.centro_id = configuracion_recordatorios.centro_id
        and mc.profile_id = auth.uid()
        and mc.rol = 'admin'
        and mc.activo = true
    )
  )
  with check (
    exists (
      select 1
      from public.miembros_centro mc
      where mc.centro_id = configuracion_recordatorios.centro_id
        and mc.profile_id = auth.uid()
        and mc.rol = 'admin'
        and mc.activo = true
    )
  );

create policy "miembros pueden leer logs recordatorios"
  on public.recordatorio_envios for select
  using (
    exists (
      select 1
      from public.miembros_centro mc
      where mc.centro_id = recordatorio_envios.centro_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
    )
  );

create or replace function public.ensure_default_reminder_config()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.configuracion_recordatorios (centro_id)
  values (new.id)
  on conflict (centro_id) do nothing;

  return new;
end;
$$;

drop trigger if exists centros_default_reminder_config on public.centros;

create trigger centros_default_reminder_config
  after insert on public.centros
  for each row execute function public.ensure_default_reminder_config();

create or replace function public.sync_reservation_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
      new.fecha_inicio - interval '48 hours',
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
      new.fecha_inicio - interval '24 hours',
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

drop trigger if exists reservas_sync_recordatorios on public.reservas;

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
  profesional_nombre text
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
      and r.estado <> 'cancelada'
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
    coalesce(pr.nombre, 'Profesional')
  from claimed rr
  join public.reservas r on r.id = rr.reserva_id
  join public.pacientes p on p.id = rr.paciente_id
  join public.centros c on c.id = rr.centro_id
  join public.servicios s on s.id = r.servicio_id
  left join public.profiles pr on pr.id = r.profesional_id
  order by rr.scheduled_for asc;
end;
$$;

revoke all on function public.claim_due_reservation_reminders(integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_reservation_reminders(integer)
  to service_role;
