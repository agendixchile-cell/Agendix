-- Personalizacion de recordatorios por centro/profesional y confirmacion
-- publica de asistencia desde el correo.

create extension if not exists pgcrypto with schema extensions;

alter table public.configuracion_recordatorios
  add column if not exists email_subject_template text not null
    default 'Recordatorio de tu hora en {{centro_nombre}}',
  add column if not exists email_body_template text not null
    default 'Hola {{paciente_nombre}}, te recordamos que tienes una hora agendada en {{centro_nombre}}.

Servicio: {{servicio_nombre}}
Profesional: {{profesional_nombre}}
Fecha y hora: {{fecha_hora}}

Confirma tu asistencia desde el boton del correo. Si necesitas cambiar tu hora, contacta directamente al centro.';

create table if not exists public.configuracion_recordatorios_profesional (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null,
  profesional_id uuid not null,
  email_subject_template text,
  email_body_template text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint configuracion_recordatorios_profesional_unique
    unique (centro_id, profesional_id),
  constraint configuracion_recordatorios_profesional_miembro_fkey
    foreign key (centro_id, profesional_id)
    references public.miembros_centro(centro_id, profile_id)
    on delete cascade,
  constraint configuracion_recordatorios_profesional_subject_length
    check (
      email_subject_template is null
      or char_length(btrim(email_subject_template)) between 5 and 160
    ),
  constraint configuracion_recordatorios_profesional_body_length
    check (
      email_body_template is null
      or char_length(btrim(email_body_template)) between 20 and 1600
    )
);

drop trigger if exists configuracion_recordatorios_profesional_updated_at
  on public.configuracion_recordatorios_profesional;

create trigger configuracion_recordatorios_profesional_updated_at
  before update on public.configuracion_recordatorios_profesional
  for each row execute function public.set_updated_at();

alter table public.configuracion_recordatorios_profesional enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'configuracion_recordatorios_profesional'
      and policyname = 'miembros pueden leer configuracion recordatorios profesional'
  ) then
    create policy "miembros pueden leer configuracion recordatorios profesional"
      on public.configuracion_recordatorios_profesional for select
      using (
        exists (
          select 1
          from public.miembros_centro mc
          where mc.centro_id = configuracion_recordatorios_profesional.centro_id
            and mc.profile_id = auth.uid()
            and mc.activo = true
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'configuracion_recordatorios_profesional'
      and policyname = 'admins pueden escribir configuracion recordatorios profesional'
  ) then
    create policy "admins pueden escribir configuracion recordatorios profesional"
      on public.configuracion_recordatorios_profesional for all
      using (
        exists (
          select 1
          from public.miembros_centro mc
          where mc.centro_id = configuracion_recordatorios_profesional.centro_id
            and mc.profile_id = auth.uid()
            and mc.rol = 'admin'
            and mc.activo = true
        )
      )
      with check (
        exists (
          select 1
          from public.miembros_centro mc
          where mc.centro_id = configuracion_recordatorios_profesional.centro_id
            and mc.profile_id = auth.uid()
            and mc.rol = 'admin'
            and mc.activo = true
        )
      );
  end if;
end $$;

create table if not exists public.reserva_confirmaciones (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  centro_id uuid not null references public.centros(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  token text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reserva_confirmaciones_reserva_unique unique (reserva_id),
  constraint reserva_confirmaciones_token_unique unique (token),
  constraint reserva_confirmaciones_token_length check (char_length(token) >= 32)
);

create index if not exists reserva_confirmaciones_token_idx
  on public.reserva_confirmaciones (token);

create index if not exists reserva_confirmaciones_centro_idx
  on public.reserva_confirmaciones (centro_id, created_at desc);

drop trigger if exists reserva_confirmaciones_updated_at
  on public.reserva_confirmaciones;

create trigger reserva_confirmaciones_updated_at
  before update on public.reserva_confirmaciones
  for each row execute function public.set_updated_at();

alter table public.reserva_confirmaciones enable row level security;

create or replace function public.ensure_reserva_confirmacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.reserva_confirmaciones (
    reserva_id,
    centro_id,
    paciente_id
  )
  values (
    new.id,
    new.centro_id,
    new.paciente_id
  )
  on conflict (reserva_id) do update
  set
    centro_id = excluded.centro_id,
    paciente_id = excluded.paciente_id,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists reservas_ensure_confirmacion on public.reservas;

create trigger reservas_ensure_confirmacion
  after insert or update of centro_id, paciente_id
  on public.reservas
  for each row execute function public.ensure_reserva_confirmacion();

insert into public.reserva_confirmaciones (
  reserva_id,
  centro_id,
  paciente_id
)
select
  id,
  centro_id,
  paciente_id
from public.reservas
on conflict (reserva_id) do update
set
  centro_id = excluded.centro_id,
  paciente_id = excluded.paciente_id,
  updated_at = now();

drop function if exists public.claim_due_reservation_reminders(integer);

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
