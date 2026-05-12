-- Baseline operativo actualizado: lunes a sábado de 09:00 a 19:00.
-- Solo ajusta centros que todavía usan el horario demo anterior.

alter table public.horarios_centro
  alter column fin set default '19:00';

with baseline(dia, activo, inicio, fin) as (
  values
    (1, true, '09:00', '19:00'),
    (2, true, '09:00', '19:00'),
    (3, true, '09:00', '19:00'),
    (4, true, '09:00', '19:00'),
    (5, true, '09:00', '19:00'),
    (6, true, '09:00', '19:00'),
    (7, false, '09:00', '19:00')
)
insert into public.horarios_centro (centro_id, dia, activo, inicio, fin)
select centros.id, baseline.dia, baseline.activo, baseline.inicio, baseline.fin
from public.centros
cross join baseline
on conflict (centro_id, dia) do nothing;

update public.horarios_centro
set
  activo = case when dia between 1 and 6 then true else false end,
  inicio = '09:00',
  fin = '19:00',
  updated_at = now()
where inicio = '09:00'
  and fin = '18:00'
  and (
    (dia between 1 and 5 and activo = true)
    or (dia in (6, 7) and activo = false)
  );
