-- Base schema for a fresh Agendix Supabase project.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'rol_centro') then
    create type public.rol_centro as enum ('admin', 'profesional', 'recepcion');
  end if;

  if not exists (select 1 from pg_type where typname = 'estado_reserva') then
    create type public.estado_reserva as enum ('pendiente', 'confirmada', 'cancelada', 'completada');
  end if;

  if not exists (select 1 from pg_type where typname = 'estado_pago') then
    create type public.estado_pago as enum ('pendiente', 'pagado', 'reembolsado');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.centros (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  rut text,
  direccion text,
  telefono text,
  email text,
  logo_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key,
  email text not null unique,
  nombre text not null,
  apellido text,
  telefono text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.miembros_centro (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centros(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  rol public.rol_centro not null default 'recepcion',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint miembros_centro_centro_profile_unique unique (centro_id, profile_id)
);

create table if not exists public.salas (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centros(id) on delete cascade,
  nombre text not null,
  descripcion text,
  capacidad integer,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.servicios (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centros(id) on delete cascade,
  nombre text not null,
  descripcion text,
  duracion_minutos integer not null check (duracion_minutos > 0),
  precio numeric(12, 2),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pacientes (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centros(id) on delete cascade,
  nombre text not null,
  apellido text,
  rut text,
  email text,
  telefono text,
  fecha_nacimiento date,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centros(id) on delete cascade,
  sala_id uuid not null references public.salas(id) on delete restrict,
  profesional_id uuid not null references public.profiles(id) on delete restrict,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  servicio_id uuid not null references public.servicios(id) on delete restrict,
  fecha_inicio timestamptz not null,
  fecha_fin timestamptz not null,
  estado public.estado_reserva not null default 'pendiente',
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservas_fecha_fin_after_inicio check (fecha_fin > fecha_inicio)
);

create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  monto numeric(12, 2) not null,
  estado public.estado_pago not null default 'pendiente',
  metodo_pago text,
  referencia text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists miembros_centro_profile_idx
  on public.miembros_centro (profile_id, activo);

create index if not exists salas_centro_idx
  on public.salas (centro_id, activa);

create index if not exists servicios_centro_idx
  on public.servicios (centro_id, activo);

create index if not exists pacientes_centro_idx
  on public.pacientes (centro_id);

create unique index if not exists pacientes_centro_rut_unique
  on public.pacientes (centro_id, rut)
  where rut is not null;

create index if not exists reservas_centro_fecha_idx
  on public.reservas (centro_id, fecha_inicio);

create index if not exists reservas_profesional_fecha_idx
  on public.reservas (profesional_id, fecha_inicio, fecha_fin);

create index if not exists reservas_sala_fecha_idx
  on public.reservas (sala_id, fecha_inicio, fecha_fin);

create index if not exists pagos_reserva_idx
  on public.pagos (reserva_id);

create or replace function public.is_centro_member(target_centro_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.miembros_centro mc
    where mc.centro_id = target_centro_id
      and mc.profile_id = auth.uid()
      and mc.activo = true
  );
$$;

create or replace function public.is_centro_admin(target_centro_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.miembros_centro mc
    where mc.centro_id = target_centro_id
      and mc.profile_id = auth.uid()
      and mc.rol = 'admin'
      and mc.activo = true
  );
$$;

create or replace function public.centro_has_members(target_centro_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.miembros_centro mc
    where mc.centro_id = target_centro_id
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nombre)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), split_part(coalesce(new.email, 'Usuario'), '@', 1), 'Usuario')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    nombre = coalesce(nullif(public.profiles.nombre, ''), excluded.nombre),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger centros_updated_at
  before update on public.centros
  for each row execute function public.set_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger miembros_centro_updated_at
  before update on public.miembros_centro
  for each row execute function public.set_updated_at();

create trigger salas_updated_at
  before update on public.salas
  for each row execute function public.set_updated_at();

create trigger servicios_updated_at
  before update on public.servicios
  for each row execute function public.set_updated_at();

create trigger pacientes_updated_at
  before update on public.pacientes
  for each row execute function public.set_updated_at();

create trigger reservas_updated_at
  before update on public.reservas
  for each row execute function public.set_updated_at();

create trigger pagos_updated_at
  before update on public.pagos
  for each row execute function public.set_updated_at();

alter table public.centros enable row level security;
alter table public.profiles enable row level security;
alter table public.miembros_centro enable row level security;
alter table public.salas enable row level security;
alter table public.servicios enable row level security;
alter table public.pacientes enable row level security;
alter table public.reservas enable row level security;
alter table public.pagos enable row level security;

create policy "usuarios pueden crear centros"
  on public.centros for insert
  to authenticated
  with check (true);

create policy "miembros pueden leer centros"
  on public.centros for select
  to authenticated
  using (public.is_centro_member(id));

create policy "admins pueden actualizar centros"
  on public.centros for update
  to authenticated
  using (public.is_centro_admin(id))
  with check (public.is_centro_admin(id));

create policy "autenticados pueden leer perfiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "autenticados pueden crear perfiles"
  on public.profiles for insert
  to authenticated
  with check (true);

create policy "usuarios y admins pueden actualizar perfiles"
  on public.profiles for update
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.miembros_centro target
      where target.profile_id = profiles.id
        and public.is_centro_admin(target.centro_id)
    )
    or exists (
      select 1
      from public.miembros_centro admin_membership
      where admin_membership.profile_id = auth.uid()
        and admin_membership.rol = 'admin'
        and admin_membership.activo = true
    )
  )
  with check (true);

create policy "miembros pueden leer miembros del centro"
  on public.miembros_centro for select
  to authenticated
  using (public.is_centro_member(centro_id));

create policy "admins o primer miembro pueden crear miembros"
  on public.miembros_centro for insert
  to authenticated
  with check (
    public.is_centro_admin(centro_id)
    or (
      profile_id = auth.uid()
      and rol = 'admin'
      and not public.centro_has_members(centro_id)
    )
  );

create policy "admins pueden actualizar miembros"
  on public.miembros_centro for update
  to authenticated
  using (public.is_centro_admin(centro_id))
  with check (public.is_centro_admin(centro_id));

create policy "admins pueden eliminar miembros"
  on public.miembros_centro for delete
  to authenticated
  using (public.is_centro_admin(centro_id));

create policy "miembros pueden leer salas"
  on public.salas for select
  to authenticated
  using (public.is_centro_member(centro_id));

create policy "admins pueden escribir salas"
  on public.salas for all
  to authenticated
  using (public.is_centro_admin(centro_id))
  with check (public.is_centro_admin(centro_id));

create policy "miembros pueden leer servicios"
  on public.servicios for select
  to authenticated
  using (public.is_centro_member(centro_id));

create policy "admins pueden escribir servicios"
  on public.servicios for all
  to authenticated
  using (public.is_centro_admin(centro_id))
  with check (public.is_centro_admin(centro_id));

create policy "miembros pueden leer pacientes"
  on public.pacientes for select
  to authenticated
  using (public.is_centro_member(centro_id));

create policy "miembros pueden escribir pacientes"
  on public.pacientes for all
  to authenticated
  using (public.is_centro_member(centro_id))
  with check (public.is_centro_member(centro_id));

create policy "miembros pueden leer reservas"
  on public.reservas for select
  to authenticated
  using (public.is_centro_member(centro_id));

create policy "miembros pueden escribir reservas"
  on public.reservas for all
  to authenticated
  using (public.is_centro_member(centro_id))
  with check (public.is_centro_member(centro_id));

create policy "miembros pueden leer pagos"
  on public.pagos for select
  to authenticated
  using (
    exists (
      select 1
      from public.reservas r
      where r.id = pagos.reserva_id
        and public.is_centro_member(r.centro_id)
    )
  );

create policy "miembros pueden crear pagos"
  on public.pagos for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.reservas r
      where r.id = pagos.reserva_id
        and public.is_centro_member(r.centro_id)
    )
  );

grant usage on schema public to anon, authenticated;
grant usage on type public.rol_centro to authenticated;
grant usage on type public.estado_reserva to authenticated;
grant usage on type public.estado_pago to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.is_centro_member(uuid) to authenticated;
grant execute on function public.is_centro_admin(uuid) to authenticated;
grant execute on function public.centro_has_members(uuid) to authenticated;
