-- Bloqueos explicitos de agenda para cerrar horarios del centro o de un profesional.
create table if not exists public.bloqueos_agenda (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centros(id) on delete cascade,
  profesional_id uuid references public.profiles(id) on delete cascade,
  fecha_inicio timestamptz not null,
  fecha_fin timestamptz not null,
  motivo text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bloqueos_agenda_fecha_fin_after_inicio check (fecha_fin > fecha_inicio),
  constraint bloqueos_agenda_motivo_length check (
    motivo is null or char_length(motivo) <= 240
  )
);

create index if not exists bloqueos_agenda_centro_fecha_idx
  on public.bloqueos_agenda (centro_id, fecha_inicio, fecha_fin);

create index if not exists bloqueos_agenda_profesional_fecha_idx
  on public.bloqueos_agenda (profesional_id, fecha_inicio, fecha_fin)
  where profesional_id is not null;

drop trigger if exists bloqueos_agenda_updated_at on public.bloqueos_agenda;

create trigger bloqueos_agenda_updated_at
  before update on public.bloqueos_agenda
  for each row execute function public.set_updated_at();

alter table public.bloqueos_agenda enable row level security;

drop policy if exists "miembros pueden leer bloqueos de agenda"
  on public.bloqueos_agenda;
drop policy if exists "miembros pueden escribir bloqueos de agenda"
  on public.bloqueos_agenda;

create policy "miembros pueden leer bloqueos de agenda"
  on public.bloqueos_agenda for select
  to authenticated
  using (public.is_centro_member(centro_id));

create policy "miembros pueden escribir bloqueos de agenda"
  on public.bloqueos_agenda for all
  to authenticated
  using (public.is_centro_member(centro_id))
  with check (public.is_centro_member(centro_id));

grant select, insert, update, delete on public.bloqueos_agenda to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.bloqueos_agenda;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
