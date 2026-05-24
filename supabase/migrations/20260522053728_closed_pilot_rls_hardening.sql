-- Closed productive pilot hardening.
-- Keep public Data API access limited to the minimum public booking surface.

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

-- Historical public-booking migrations granted anon access to direct tables.
-- The portal now reads through server-side loaders and the minimal public view,
-- so anon must not be able to enumerate internal tenant or clinical tables.
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

-- Avoid accidental broad grants through PUBLIC on the booking view when it
-- already exists. Fresh projects create the view in the next migration.
do $$
begin
  if to_regclass('public.public_booking_professionals') is not null then
    revoke all on table public.public_booking_professionals from public;
    revoke all on table public.public_booking_professionals from anon;
    revoke all on table public.public_booking_professionals from authenticated;
    grant select on table public.public_booking_professionals to anon, authenticated;
  end if;
end
$$;
