-- Cobros de pacientes
-- Separa pagos de pacientes del billing/suscripciones de Agendix.

create table if not exists public.patient_payments (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null references public.centros(id) on delete cascade,
  patient_id uuid not null references public.pacientes(id) on delete cascade,
  reservation_id uuid null references public.reservas(id) on delete set null,
  service_id uuid null references public.servicios(id) on delete set null,
  professional_id uuid null references public.profiles(id) on delete set null,

  provider text not null default 'mercado_pago',
  provider_payment_id text null,
  provider_preference_id text null,
  provider_external_reference text null,

  amount integer not null,
  currency text not null default 'CLP',
  description text null,

  status text not null default 'draft',

  checkout_url text null,
  paid_at timestamptz null,
  expires_at timestamptz null,

  metadata jsonb null default '{}'::jsonb,

  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint patient_payments_amount_positive check (amount > 0),
  constraint patient_payments_currency_check check (currency in ('CLP')),
  constraint patient_payments_provider_check check (
    provider in ('mercado_pago', 'fintoc', 'manual')
  ),
  constraint patient_payments_status_check check (
    status in (
      'draft',
      'pending',
      'approved',
      'rejected',
      'cancelled',
      'expired',
      'refunded'
    )
  )
);

create table if not exists public.patient_payment_events (
  id uuid primary key default gen_random_uuid(),
  patient_payment_id uuid not null references public.patient_payments(id) on delete cascade,
  provider text not null,
  event_type text not null,
  raw_payload jsonb not null,
  created_at timestamptz not null default now(),

  constraint patient_payment_events_provider_check check (
    provider in ('mercado_pago', 'fintoc', 'manual')
  )
);

create index if not exists patient_payments_organization_id_idx
  on public.patient_payments (organization_id);

create index if not exists patient_payments_patient_id_idx
  on public.patient_payments (patient_id);

create index if not exists patient_payments_reservation_id_idx
  on public.patient_payments (reservation_id);

create index if not exists patient_payments_status_idx
  on public.patient_payments (status);

create index if not exists patient_payments_provider_payment_id_idx
  on public.patient_payments (provider_payment_id);

create index if not exists patient_payments_provider_preference_id_idx
  on public.patient_payments (provider_preference_id);

create index if not exists patient_payments_provider_external_reference_idx
  on public.patient_payments (provider_external_reference);

create index if not exists patient_payment_events_patient_payment_id_idx
  on public.patient_payment_events (patient_payment_id);

create or replace function public.touch_patient_payments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists patient_payments_updated_at on public.patient_payments;
create trigger patient_payments_updated_at
  before update on public.patient_payments
  for each row execute function public.touch_patient_payments_updated_at();

alter table public.patient_payments enable row level security;
alter table public.patient_payment_events enable row level security;

revoke all on table public.patient_payments from anon;
revoke all on table public.patient_payment_events from anon;
grant select, insert, update on table public.patient_payments to authenticated;
grant select on table public.patient_payment_events to authenticated;
grant select, insert, update, delete on table public.patient_payments to service_role;
grant select, insert, update, delete on table public.patient_payment_events to service_role;

drop policy if exists "miembros pueden leer cobros de pacientes" on public.patient_payments;
create policy "miembros pueden leer cobros de pacientes"
  on public.patient_payments for select
  to authenticated
  using (
    exists (
      select 1
      from public.miembros_centro mc
      where mc.centro_id = patient_payments.organization_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
    )
  );

drop policy if exists "miembros pueden crear cobros de pacientes" on public.patient_payments;
create policy "miembros pueden crear cobros de pacientes"
  on public.patient_payments for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.miembros_centro mc
      where mc.centro_id = patient_payments.organization_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
        and mc.rol in ('owner', 'admin', 'profesional', 'recepcion')
    )
  );

drop policy if exists "miembros pueden actualizar cobros de pacientes" on public.patient_payments;
create policy "miembros pueden actualizar cobros de pacientes"
  on public.patient_payments for update
  to authenticated
  using (
    exists (
      select 1
      from public.miembros_centro mc
      where mc.centro_id = patient_payments.organization_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
        and mc.rol in ('owner', 'admin', 'profesional', 'recepcion')
    )
  )
  with check (
    exists (
      select 1
      from public.miembros_centro mc
      where mc.centro_id = patient_payments.organization_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
        and mc.rol in ('owner', 'admin', 'profesional', 'recepcion')
    )
  );

drop policy if exists "miembros pueden leer eventos de cobros" on public.patient_payment_events;
create policy "miembros pueden leer eventos de cobros"
  on public.patient_payment_events for select
  to authenticated
  using (
    exists (
      select 1
      from public.patient_payments pp
      join public.miembros_centro mc on mc.centro_id = pp.organization_id
      where pp.id = patient_payment_events.patient_payment_id
        and mc.profile_id = auth.uid()
        and mc.activo = true
    )
  );

comment on table public.patient_payments is
  'Cobros desde centros/profesionales hacia pacientes. No corresponde al billing de Agendix.';

comment on table public.patient_payment_events is
  'Auditoria de eventos recibidos desde proveedores de pago para cobros de pacientes.';
