-- MVP Agenda Clinica
-- Separa estado administrativo de reserva y asistencia clinica.
-- Agrega ficha clinica simple, evoluciones de sesion y recordatorios WhatsApp.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_asistencia') then
    create type public.estado_asistencia as enum ('sin_marcar', 'asistio', 'no_asistio');
  end if;

  if not exists (select 1 from pg_type where typname = 'canal_recordatorio') then
    create type public.canal_recordatorio as enum ('whatsapp');
  end if;

  if not exists (select 1 from pg_type where typname = 'tipo_recordatorio') then
    create type public.tipo_recordatorio as enum ('recordatorio_48h', 'recordatorio_24h');
  end if;

  if not exists (select 1 from pg_type where typname = 'estado_recordatorio') then
    create type public.estado_recordatorio as enum ('pendiente', 'enviado', 'fallido');
  end if;
end $$;

alter type public.estado_reserva add value if not exists 'reagendada';

alter table public.reservas
  add column if not exists estado_asistencia public.estado_asistencia not null default 'sin_marcar';

create table if not exists public.fichas_clinicas (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centros(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  antecedentes_relevantes text,
  motivo_consulta text,
  diagnostico_hipotesis text,
  notas_clinicas text,
  documentos jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fichas_clinicas_paciente_unique unique (centro_id, paciente_id)
);

create table if not exists public.evoluciones_sesion (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  profesional_id uuid not null references public.profiles(id) on delete restrict,
  centro_id uuid not null references public.centros(id) on delete cascade,
  fecha timestamptz not null,
  texto_evolucion text not null,
  proximos_pasos text,
  observaciones_privadas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evoluciones_sesion_reserva_unique unique (reserva_id)
);

create table if not exists public.recordatorios_reserva (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  canal public.canal_recordatorio not null default 'whatsapp',
  tipo public.tipo_recordatorio not null,
  estado public.estado_recordatorio not null default 'pendiente',
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recordatorios_reserva_unico unique (reserva_id, canal, tipo)
);

create index if not exists fichas_clinicas_centro_paciente_idx
  on public.fichas_clinicas (centro_id, paciente_id);

create index if not exists evoluciones_sesion_centro_paciente_fecha_idx
  on public.evoluciones_sesion (centro_id, paciente_id, fecha desc);

create index if not exists recordatorios_reserva_estado_schedule_idx
  on public.recordatorios_reserva (estado, scheduled_for);

create trigger fichas_clinicas_updated_at
  before update on public.fichas_clinicas
  for each row execute function public.set_updated_at();

create trigger evoluciones_sesion_updated_at
  before update on public.evoluciones_sesion
  for each row execute function public.set_updated_at();

create trigger recordatorios_reserva_updated_at
  before update on public.recordatorios_reserva
  for each row execute function public.set_updated_at();

alter table public.fichas_clinicas enable row level security;
alter table public.evoluciones_sesion enable row level security;
alter table public.recordatorios_reserva enable row level security;

create policy "miembros clinicos pueden leer fichas"
  on public.fichas_clinicas for select
  using (
    exists (
      select 1 from public.miembros_centro mc
      where mc.centro_id = fichas_clinicas.centro_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
        and mc.rol in ('admin', 'profesional')
    )
  );

create policy "miembros clinicos pueden escribir fichas"
  on public.fichas_clinicas for all
  using (
    exists (
      select 1 from public.miembros_centro mc
      where mc.centro_id = fichas_clinicas.centro_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
        and mc.rol in ('admin', 'profesional')
    )
  );

create policy "miembros clinicos pueden leer evoluciones"
  on public.evoluciones_sesion for select
  using (
    exists (
      select 1 from public.miembros_centro mc
      where mc.centro_id = evoluciones_sesion.centro_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
        and mc.rol in ('admin', 'profesional')
    )
  );

create policy "profesionales pueden escribir sus evoluciones"
  on public.evoluciones_sesion for all
  using (
    exists (
      select 1 from public.miembros_centro mc
      where mc.centro_id = evoluciones_sesion.centro_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
        and (
          mc.rol = 'admin'
          or (mc.rol = 'profesional' and evoluciones_sesion.profesional_id = auth.uid())
        )
    )
  );

create policy "miembros pueden leer recordatorios"
  on public.recordatorios_reserva for select
  using (
    exists (
      select 1
      from public.reservas r
      join public.miembros_centro mc on mc.centro_id = r.centro_id
      where r.id = recordatorios_reserva.reserva_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
    )
  );

create policy "miembros pueden escribir recordatorios"
  on public.recordatorios_reserva for all
  using (
    exists (
      select 1
      from public.reservas r
      join public.miembros_centro mc on mc.centro_id = r.centro_id
      where r.id = recordatorios_reserva.reserva_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
        and mc.rol in ('admin', 'recepcion')
    )
  );
