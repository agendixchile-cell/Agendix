-- Avoid a security-definer public booking view. Supabase flags definer views in
-- exposed schemas because they can bypass RLS on the underlying tables.

alter view public.public_booking_professionals
  set (security_invoker = true);

revoke all on table public.profiles from anon;
revoke all on table public.miembros_centro from anon;

-- Keep the view predicate and its underlying RLS predicates aligned. The view
-- exposes visible owners as bookable professionals, so the public policies must
-- allow the same role set when security_invoker is enabled.
drop policy if exists "publico puede leer profesionales visibles"
  on public.miembros_centro;

create policy "publico puede leer profesionales visibles"
  on public.miembros_centro for select
  to anon
  using (
    activo = true
    and public_visible = true
    and rol in ('owner', 'admin', 'profesional')
    and exists (
      select 1
      from public.centros c
      where c.id = miembros_centro.centro_id
        and c.activo = true
        and c.public_booking_enabled = true
    )
  );

drop policy if exists "publico puede leer perfiles visibles"
  on public.profiles;

create policy "publico puede leer perfiles visibles"
  on public.profiles for select
  to anon
  using (
    exists (
      select 1
      from public.miembros_centro mc
      join public.centros c on c.id = mc.centro_id
      where mc.profile_id = profiles.id
        and mc.activo = true
        and mc.public_visible = true
        and mc.rol in ('owner', 'admin', 'profesional')
        and c.activo = true
        and c.public_booking_enabled = true
    )
  );

-- Column grants are intentionally narrow. Anon can only reach the columns
-- required by the public booking view, never private contact or internal notes.
grant select (
  id,
  nombre,
  apellido,
  avatar_url
) on table public.profiles to anon;

grant select (
  centro_id,
  profile_id,
  activo,
  public_visible,
  rol,
  avatar_url,
  especialidad,
  bio,
  descanso_entre_reservas_minutos,
  duracion_sesion_minutos,
  intervalo_reservas_minutos
) on table public.miembros_centro to anon;

grant select on table public.public_booking_professionals to anon, authenticated;
