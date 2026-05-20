-- Permite que cada profesional defina un descanso implicito entre reservas.
-- La reserva conserva su duracion real; este valor solo bloquea agenda
-- para evitar que el siguiente paciente quede pegado a la sesion anterior.

alter table public.miembros_centro
  add column if not exists descanso_entre_reservas_minutos integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'miembros_centro_descanso_entre_reservas_range'
  ) then
    alter table public.miembros_centro
      add constraint miembros_centro_descanso_entre_reservas_range
      check (
        descanso_entre_reservas_minutos >= 0
        and descanso_entre_reservas_minutos <= 240
      );
  end if;
end $$;
