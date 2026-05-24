begin;

create or replace view public.public_booking_professionals
with (security_invoker = false) as
select
  mc.centro_id,
  mc.profile_id,
  p.nombre,
  p.apellido,
  coalesce(mc.avatar_url, p.avatar_url) as avatar_url,
  mc.especialidad,
  mc.bio,
  mc.descanso_entre_reservas_minutos,
  mc.duracion_sesion_minutos,
  mc.intervalo_reservas_minutos
from public.miembros_centro mc
join public.profiles p on p.id = mc.profile_id
join public.centros c on c.id = mc.centro_id
where mc.activo = true
  and mc.public_visible = true
  and mc.rol::text in ('owner', 'admin', 'profesional')
  and c.activo = true
  and c.public_booking_enabled = true;

alter table public.centros enable row level security;
alter table public.profiles enable row level security;
alter table public.miembros_centro enable row level security;
alter table public.pacientes enable row level security;
alter table public.servicios enable row level security;
alter table public.salas enable row level security;
alter table public.reservas enable row level security;
alter table public.pagos enable row level security;
alter table public.bloqueos_agenda enable row level security;
alter table public.fichas_clinicas enable row level security;
alter table public.evoluciones_sesion enable row level security;
alter table public.recordatorios_reserva enable row level security;
alter table public.configuracion_recordatorios enable row level security;
alter table public.configuracion_recordatorios_profesional enable row level security;
alter table public.reserva_confirmaciones enable row level security;
alter table public.recordatorio_envios enable row level security;
alter table public.subscriptions enable row level security;
alter table public.rate_limit_buckets enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.miembros_centro from anon;
revoke all on table public.pacientes from anon;
revoke all on table public.reservas from anon;
revoke all on table public.pagos from anon;
revoke all on table public.bloqueos_agenda from anon;
revoke all on table public.fichas_clinicas from anon;
revoke all on table public.evoluciones_sesion from anon;
revoke all on table public.recordatorios_reserva from anon;
revoke all on table public.configuracion_recordatorios from anon;
revoke all on table public.configuracion_recordatorios_profesional from anon;
revoke all on table public.reserva_confirmaciones from anon;
revoke all on table public.recordatorio_envios from anon;
revoke all on table public.subscriptions from anon;
revoke all on table public.rate_limit_buckets from anon;
revoke all on table public.salas from anon;

revoke all on table public.public_booking_professionals from public;
revoke all on table public.public_booking_professionals from anon;
revoke all on table public.public_booking_professionals from authenticated;
grant select on table public.public_booking_professionals to anon, authenticated;

commit;
