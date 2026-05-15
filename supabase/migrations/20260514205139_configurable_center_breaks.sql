alter table public.horarios_centro
  add column if not exists descanso_activo boolean not null default false,
  add column if not exists descanso_inicio varchar(5) not null default '13:00',
  add column if not exists descanso_fin varchar(5) not null default '14:00';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'horarios_centro_descanso_time_format'
  ) then
    alter table public.horarios_centro
      add constraint horarios_centro_descanso_time_format
      check (
        descanso_inicio ~ '^\d{2}:\d{2}$'
        and descanso_fin ~ '^\d{2}:\d{2}$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'horarios_centro_descanso_range'
  ) then
    alter table public.horarios_centro
      add constraint horarios_centro_descanso_range
      check (
        not descanso_activo
        or (
          activo
          and descanso_fin > descanso_inicio
          and descanso_inicio >= inicio
          and descanso_fin <= fin
        )
      );
  end if;
end $$;
