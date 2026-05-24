-- Expose only public booking profile fields to anon clients.
-- The app portal should use server-side service_role access for table joins.

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
  and mc.rol in ('owner', 'admin', 'profesional')
  and c.activo = true
  and c.public_booking_enabled = true;

revoke select on public.profiles from anon;
revoke select on public.miembros_centro from anon;
grant select on public.public_booking_professionals to anon;
