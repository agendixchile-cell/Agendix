-- Public read policies for the booking portal.

create policy "publico puede leer centros activos"
  on public.centros for select
  to anon
  using (activo = true and public_booking_enabled = true);

create policy "publico puede leer servicios visibles"
  on public.servicios for select
  to anon
  using (
    activo = true
    and public_visible = true
    and exists (
      select 1
      from public.centros c
      where c.id = servicios.centro_id
        and c.activo = true
        and c.public_booking_enabled = true
    )
  );

create policy "publico puede leer profesionales visibles"
  on public.miembros_centro for select
  to anon
  using (
    activo = true
    and public_visible = true
    and rol in ('admin', 'profesional')
    and exists (
      select 1
      from public.centros c
      where c.id = miembros_centro.centro_id
        and c.activo = true
        and c.public_booking_enabled = true
    )
  );

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
        and mc.rol in ('admin', 'profesional')
        and c.activo = true
        and c.public_booking_enabled = true
    )
  );

create policy "publico puede leer horarios de centros activos"
  on public.horarios_centro for select
  to anon
  using (
    exists (
      select 1
      from public.centros c
      where c.id = horarios_centro.centro_id
        and c.activo = true
        and c.public_booking_enabled = true
    )
  );

create policy "publico puede leer salas activas"
  on public.salas for select
  to anon
  using (
    activa = true
    and exists (
      select 1
      from public.centros c
      where c.id = salas.centro_id
        and c.activo = true
        and c.public_booking_enabled = true
    )
  );

grant select on public.centros to anon;
grant select on public.servicios to anon;
grant select on public.miembros_centro to anon;
grant select on public.profiles to anon;
grant select on public.horarios_centro to anon;
grant select on public.salas to anon;
