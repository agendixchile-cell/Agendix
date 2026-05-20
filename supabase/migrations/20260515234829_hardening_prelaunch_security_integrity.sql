-- Hardening pre-lanzamiento:
-- 1) Restringe datos clinicos por rol real.
-- 2) Crea una RPC transaccional para crear reservas sin carreras concurrentes.

-- La regla clinica del MVP:
-- - admin del centro: puede ver y administrar todas las fichas/evoluciones del centro.
-- - profesional: solo accede a fichas de pacientes que tienen reservas propias
--   no canceladas, y solo a evoluciones propias.
-- - recepcion: no accede al contenido clinico.

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

drop policy if exists "miembros clinicos pueden leer fichas"
  on public.fichas_clinicas;
drop policy if exists "miembros clinicos pueden escribir fichas"
  on public.fichas_clinicas;
drop policy if exists "admins pueden leer fichas clinicas"
  on public.fichas_clinicas;
drop policy if exists "profesionales pueden leer fichas vinculadas"
  on public.fichas_clinicas;
drop policy if exists "admins pueden administrar fichas clinicas"
  on public.fichas_clinicas;
drop policy if exists "profesionales pueden administrar fichas vinculadas"
  on public.fichas_clinicas;

create policy "admins pueden leer fichas clinicas"
  on public.fichas_clinicas for select
  to authenticated
  using (public.is_centro_admin(centro_id));

create policy "profesionales pueden leer fichas vinculadas"
  on public.fichas_clinicas for select
  to authenticated
  using (
    exists (
      select 1
      from public.miembros_centro mc
      where mc.centro_id = fichas_clinicas.centro_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
        and mc.rol = 'profesional'
    )
    and exists (
      select 1
      from public.reservas r
      where r.centro_id = fichas_clinicas.centro_id
        and r.paciente_id = fichas_clinicas.paciente_id
        and r.profesional_id = auth.uid()
        and r.estado <> 'cancelled'
    )
  );

create policy "admins pueden administrar fichas clinicas"
  on public.fichas_clinicas for all
  to authenticated
  using (public.is_centro_admin(centro_id))
  with check (public.is_centro_admin(centro_id));

create policy "profesionales pueden administrar fichas vinculadas"
  on public.fichas_clinicas for all
  to authenticated
  using (
    exists (
      select 1
      from public.miembros_centro mc
      where mc.centro_id = fichas_clinicas.centro_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
        and mc.rol = 'profesional'
    )
    and exists (
      select 1
      from public.reservas r
      where r.centro_id = fichas_clinicas.centro_id
        and r.paciente_id = fichas_clinicas.paciente_id
        and r.profesional_id = auth.uid()
        and r.estado <> 'cancelled'
    )
  )
  with check (
    exists (
      select 1
      from public.miembros_centro mc
      where mc.centro_id = fichas_clinicas.centro_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
        and mc.rol = 'profesional'
    )
    and exists (
      select 1
      from public.reservas r
      where r.centro_id = fichas_clinicas.centro_id
        and r.paciente_id = fichas_clinicas.paciente_id
        and r.profesional_id = auth.uid()
        and r.estado <> 'cancelled'
    )
  );

drop policy if exists "miembros clinicos pueden leer evoluciones"
  on public.evoluciones_sesion;
drop policy if exists "profesionales pueden escribir sus evoluciones"
  on public.evoluciones_sesion;
drop policy if exists "admins pueden leer evoluciones clinicas"
  on public.evoluciones_sesion;
drop policy if exists "profesionales pueden leer evoluciones propias"
  on public.evoluciones_sesion;
drop policy if exists "admins pueden administrar evoluciones clinicas"
  on public.evoluciones_sesion;
drop policy if exists "profesionales pueden administrar evoluciones propias"
  on public.evoluciones_sesion;

create policy "admins pueden leer evoluciones clinicas"
  on public.evoluciones_sesion for select
  to authenticated
  using (public.is_centro_admin(centro_id));

create policy "profesionales pueden leer evoluciones propias"
  on public.evoluciones_sesion for select
  to authenticated
  using (
    profesional_id = auth.uid()
    and exists (
      select 1
      from public.miembros_centro mc
      where mc.centro_id = evoluciones_sesion.centro_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
        and mc.rol = 'profesional'
    )
  );

create policy "admins pueden administrar evoluciones clinicas"
  on public.evoluciones_sesion for all
  to authenticated
  using (public.is_centro_admin(centro_id))
  with check (public.is_centro_admin(centro_id));

create policy "profesionales pueden administrar evoluciones propias"
  on public.evoluciones_sesion for all
  to authenticated
  using (
    profesional_id = auth.uid()
    and exists (
      select 1
      from public.miembros_centro mc
      where mc.centro_id = evoluciones_sesion.centro_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
        and mc.rol = 'profesional'
    )
  )
  with check (
    profesional_id = auth.uid()
    and exists (
      select 1
      from public.miembros_centro mc
      where mc.centro_id = evoluciones_sesion.centro_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
        and mc.rol = 'profesional'
      )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservas_no_solapan_por_profesional'
      and conrelid = 'public.reservas'::regclass
  ) then
    alter table public.reservas
      add constraint reservas_no_solapan_por_profesional
      exclude using gist (
        centro_id with =,
        profesional_id with =,
        tstzrange(fecha_inicio, fecha_fin, '[)') with &&
      )
      where (estado <> 'cancelled');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservas_no_solapan_por_sala'
      and conrelid = 'public.reservas'::regclass
  ) then
    alter table public.reservas
      add constraint reservas_no_solapan_por_sala
      exclude using gist (
        centro_id with =,
        sala_id with =,
        tstzrange(fecha_inicio, fecha_fin, '[)') with &&
      )
      where (estado <> 'cancelled');
  end if;
end $$;

comment on constraint reservas_no_solapan_por_profesional on public.reservas is
  'Barrera de integridad: impide dos reservas activas solapadas para el mismo profesional.';

comment on constraint reservas_no_solapan_por_sala on public.reservas is
  'Barrera de integridad: impide dos reservas activas solapadas para la misma sala.';

create or replace function public.create_reserva_atomic(
  p_centro_id uuid,
  p_profesional_id uuid,
  p_paciente_id uuid,
  p_servicio_id uuid,
  p_fecha_inicio timestamptz,
  p_sala_id uuid default null,
  p_estado public.estado_reserva default 'pending',
  p_notas text default null,
  p_origen text default 'dashboard',
  p_modalidad text default 'presencial',
  p_payment_status text default 'pending',
  p_amount numeric default null,
  p_currency char(3) default 'CLP'
)
returns table (
  ok boolean,
  code text,
  message text,
  reserva_id uuid,
  sala_id uuid,
  fecha_inicio timestamptz,
  fecha_fin timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_duracion_minutos integer;
  v_fecha_fin timestamptz;
  v_break_minutos integer := 0;
  v_break interval := interval '0 minutes';
  v_dia integer;
  v_horario_activo boolean;
  v_horario_inicio time;
  v_horario_fin time;
  v_descanso_activo boolean;
  v_descanso_inicio time;
  v_descanso_fin time;
  v_start_time time;
  v_end_time time;
  v_sala_id uuid;
  v_reserva_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_centro_id::text, 0));

  select s.duracion_minutos
    into v_duracion_minutos
  from public.servicios s
  where s.id = p_servicio_id
    and s.centro_id = p_centro_id
    and s.activo = true;

  if v_duracion_minutos is null then
    return query select false, 'servicio_no_disponible', 'Selecciona un servicio activo del centro.', null::uuid, null::uuid, p_fecha_inicio, null::timestamptz;
    return;
  end if;

  select coalesce(mc.descanso_entre_reservas_minutos, 0)
    into v_break_minutos
  from public.miembros_centro mc
  where mc.centro_id = p_centro_id
    and mc.profile_id = p_profesional_id
    and mc.activo = true
    and mc.rol in ('admin', 'profesional');

  if v_break_minutos is null then
    return query select false, 'profesional_no_disponible', 'Selecciona un profesional activo del centro.', null::uuid, null::uuid, p_fecha_inicio, null::timestamptz;
    return;
  end if;

  if not exists (
    select 1
    from public.pacientes p
    where p.id = p_paciente_id
      and p.centro_id = p_centro_id
  ) then
    return query select false, 'paciente_no_disponible', 'No encontramos el paciente seleccionado.', null::uuid, null::uuid, p_fecha_inicio, null::timestamptz;
    return;
  end if;

  if p_fecha_inicio <= now() then
    return query select false, 'horario_pasado', 'Selecciona un horario futuro.', null::uuid, null::uuid, p_fecha_inicio, null::timestamptz;
    return;
  end if;

  v_fecha_fin := p_fecha_inicio + make_interval(mins => v_duracion_minutos);
  v_break := make_interval(mins => greatest(v_break_minutos, 0));
  v_dia := extract(isodow from p_fecha_inicio at time zone 'America/Santiago')::integer;
  v_start_time := (p_fecha_inicio at time zone 'America/Santiago')::time;
  v_end_time := (v_fecha_fin at time zone 'America/Santiago')::time;

  select h.activo, h.inicio::time, h.fin::time, h.descanso_activo, h.descanso_inicio::time, h.descanso_fin::time
    into v_horario_activo, v_horario_inicio, v_horario_fin, v_descanso_activo, v_descanso_inicio, v_descanso_fin
  from public.horarios_centro h
  where h.centro_id = p_centro_id
    and h.dia = v_dia;

  if v_horario_activo is null then
    v_horario_activo := v_dia <= 6;
    v_horario_inicio := time '09:00';
    v_horario_fin := time '19:00';
    v_descanso_activo := false;
    v_descanso_inicio := time '13:00';
    v_descanso_fin := time '14:00';
  end if;

  if not v_horario_activo
    or v_start_time < v_horario_inicio
    or v_end_time > v_horario_fin then
    return query select false, 'fuera_de_horario', 'Ese horario esta fuera del horario de atencion.', null::uuid, null::uuid, p_fecha_inicio, v_fecha_fin;
    return;
  end if;

  if v_descanso_activo
    and v_start_time < v_descanso_fin
    and v_end_time > v_descanso_inicio then
    return query select false, 'descanso_centro', 'Ese horario coincide con el descanso del centro.', null::uuid, null::uuid, p_fecha_inicio, v_fecha_fin;
    return;
  end if;

  if exists (
    select 1
    from public.bloqueos_agenda b
    where b.centro_id = p_centro_id
      and b.fecha_inicio < v_fecha_fin
      and b.fecha_fin > p_fecha_inicio
      and (b.profesional_id is null or b.profesional_id = p_profesional_id)
  ) then
    return query select false, 'horario_bloqueado', 'Ese horario esta bloqueado. Elige otra hora.', null::uuid, null::uuid, p_fecha_inicio, v_fecha_fin;
    return;
  end if;

  if exists (
    select 1
    from public.reservas r
    where r.centro_id = p_centro_id
      and r.profesional_id = p_profesional_id
      and r.estado <> 'cancelled'
      and r.fecha_inicio < v_fecha_fin + v_break
      and r.fecha_fin > p_fecha_inicio - v_break
  ) then
    return query select false, 'conflicto_profesional', 'El profesional ya tiene una reserva en ese horario.', null::uuid, null::uuid, p_fecha_inicio, v_fecha_fin;
    return;
  end if;

  if p_sala_id is not null then
    select s.id
      into v_sala_id
    from public.salas s
    where s.id = p_sala_id
      and s.centro_id = p_centro_id
      and s.activa = true;

    if v_sala_id is null then
      return query select false, 'sala_no_disponible', 'Selecciona una sala activa del centro.', null::uuid, null::uuid, p_fecha_inicio, v_fecha_fin;
      return;
    end if;

    if exists (
      select 1
      from public.reservas r
      where r.centro_id = p_centro_id
        and r.sala_id = v_sala_id
        and r.estado <> 'cancelled'
        and r.fecha_inicio < v_fecha_fin
        and r.fecha_fin > p_fecha_inicio
    ) then
      return query select false, 'conflicto_sala', 'La sala ya tiene una reserva en ese horario.', null::uuid, v_sala_id, p_fecha_inicio, v_fecha_fin;
      return;
    end if;
  else
    select s.id
      into v_sala_id
    from public.salas s
    where s.centro_id = p_centro_id
      and s.activa = true
      and not exists (
        select 1
        from public.reservas r
        where r.centro_id = p_centro_id
          and r.sala_id = s.id
          and r.estado <> 'cancelled'
          and r.fecha_inicio < v_fecha_fin
          and r.fecha_fin > p_fecha_inicio
      )
    order by s.created_at asc
    limit 1;

    if v_sala_id is null
      and not exists (
        select 1
        from public.salas s
        where s.centro_id = p_centro_id
          and s.activa = true
      ) then
      insert into public.salas (centro_id, nombre, descripcion, capacidad, activa)
      values (p_centro_id, 'Consulta general', 'Espacio base para reservas online', 1, true)
      returning id into v_sala_id;
    end if;

    if v_sala_id is null then
      return query select false, 'sin_sala_disponible', 'Ese horario ya no esta disponible. Elige otra hora.', null::uuid, null::uuid, p_fecha_inicio, v_fecha_fin;
      return;
    end if;
  end if;

  insert into public.reservas (
    centro_id,
    sala_id,
    profesional_id,
    paciente_id,
    servicio_id,
    fecha_inicio,
    fecha_fin,
    estado,
    estado_asistencia,
    notas,
    origen,
    modalidad,
    payment_status,
    amount,
    currency
  )
  values (
    p_centro_id,
    v_sala_id,
    p_profesional_id,
    p_paciente_id,
    p_servicio_id,
    p_fecha_inicio,
    v_fecha_fin,
    p_estado,
    'sin_marcar',
    p_notas,
    p_origen,
    p_modalidad,
    p_payment_status,
    p_amount,
    p_currency
  )
  returning id into v_reserva_id;

  return query select true, 'created', 'Reserva creada correctamente.', v_reserva_id, v_sala_id, p_fecha_inicio, v_fecha_fin;
end;
$$;

comment on function public.create_reserva_atomic(
  uuid,
  uuid,
  uuid,
  uuid,
  timestamptz,
  uuid,
  public.estado_reserva,
  text,
  text,
  text,
  text,
  numeric,
  char
) is
  'Crea reservas de forma atomica usando advisory lock por centro; valida horario, bloqueos, sala, profesional y descanso entre reservas.';

revoke all on function public.create_reserva_atomic(
  uuid,
  uuid,
  uuid,
  uuid,
  timestamptz,
  uuid,
  public.estado_reserva,
  text,
  text,
  text,
  text,
  numeric,
  char
) from public;

grant execute on function public.create_reserva_atomic(
  uuid,
  uuid,
  uuid,
  uuid,
  timestamptz,
  uuid,
  public.estado_reserva,
  text,
  text,
  text,
  text,
  numeric,
  char
) to authenticated, service_role;
