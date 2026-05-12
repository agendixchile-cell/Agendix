-- Tabla de horarios operativos por día de semana para cada centro.
-- dia: 1=lunes … 7=domingo (ISO weekday).
-- Unique constraint on (centro_id, dia) — un horario por día por centro.

create table if not exists public.horarios_centro (
  id          uuid primary key default gen_random_uuid(),
  centro_id   uuid not null references public.centros(id) on delete cascade,
  dia         smallint not null check (dia between 1 and 7),
  activo      boolean not null default false,
  inicio      varchar(5) not null default '09:00' check (inicio ~ '^\d{2}:\d{2}$'),
  fin         varchar(5) not null default '19:00' check (fin ~ '^\d{2}:\d{2}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint horarios_centro_centro_dia_unique unique (centro_id, dia),
  constraint horarios_centro_fin_after_inicio check (fin > inicio or not activo)
);

-- RLS
alter table public.horarios_centro enable row level security;

-- Miembros del centro pueden leer los horarios de su centro
create policy "miembros pueden leer horarios"
  on public.horarios_centro for select
  using (
    exists (
      select 1 from public.miembros_centro mc
      where mc.centro_id = horarios_centro.centro_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
    )
  );

-- Solo admins pueden insertar/actualizar/eliminar horarios
create policy "admin puede escribir horarios"
  on public.horarios_centro for all
  using (
    exists (
      select 1 from public.miembros_centro mc
      where mc.centro_id = horarios_centro.centro_id
        and mc.profile_id = auth.uid()
        and mc.rol = 'admin'
        and mc.activo = true
    )
  );

-- Trigger para actualizar updated_at automáticamente
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger horarios_centro_updated_at
  before update on public.horarios_centro
  for each row execute function public.set_updated_at();
