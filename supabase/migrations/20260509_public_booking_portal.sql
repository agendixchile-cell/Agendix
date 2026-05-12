-- Portal publico de agendamiento
-- Campos preparados para visibilidad publica, modalidad y pagos online futuros.

alter table public.centros
  add column if not exists descripcion text,
  add column if not exists public_booking_enabled boolean not null default true;

alter table public.servicios
  add column if not exists public_visible boolean not null default true,
  add column if not exists modalidad text not null default 'presencial',
  add column if not exists moneda char(3) not null default 'CLP';

alter table public.servicios
  drop constraint if exists servicios_modalidad_check;

alter table public.servicios
  add constraint servicios_modalidad_check
  check (modalidad in ('presencial', 'online', 'ambas'));

alter table public.miembros_centro
  add column if not exists especialidad text,
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists public_visible boolean not null default true;

alter table public.reservas
  add column if not exists origen text not null default 'dashboard',
  add column if not exists modalidad text not null default 'presencial',
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_provider text,
  add column if not exists payment_reference text,
  add column if not exists amount numeric(12, 2),
  add column if not exists currency char(3) not null default 'CLP',
  add column if not exists paid_at timestamptz;

alter table public.reservas
  drop constraint if exists reservas_modalidad_check;

alter table public.reservas
  add constraint reservas_modalidad_check
  check (modalidad in ('presencial', 'online', 'ambas'));

alter table public.reservas
  drop constraint if exists reservas_payment_status_check;

alter table public.reservas
  add constraint reservas_payment_status_check
  check (payment_status in ('not_required', 'pending', 'paid', 'failed', 'refunded'));

alter table public.pagos
  add column if not exists provider text,
  add column if not exists currency char(3) not null default 'CLP',
  add column if not exists payment_reference text,
  add column if not exists paid_at timestamptz;

create index if not exists centros_public_booking_slug_idx
  on public.centros (slug)
  where activo = true and public_booking_enabled = true;

create index if not exists servicios_publicos_centro_idx
  on public.servicios (centro_id, activo, public_visible);

create index if not exists profesionales_publicos_centro_idx
  on public.miembros_centro (centro_id, activo, public_visible, rol);

create index if not exists reservas_public_booking_conflicts_idx
  on public.reservas (centro_id, profesional_id, fecha_inicio, fecha_fin)
  where estado <> 'cancelada';
