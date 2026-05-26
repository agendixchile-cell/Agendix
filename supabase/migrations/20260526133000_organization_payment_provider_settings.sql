-- Credenciales de proveedores de pago por organización.
-- Estos secretos permiten que los cobros de pacientes liquiden en la cuenta
-- Mercado Pago del centro, no en una cuenta global de Agendix.

create table if not exists public.organization_payment_provider_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.centros(id) on delete cascade,
  provider text not null,
  status text not null default 'active',

  public_key text null,
  access_token text null,
  external_account_id text null,
  account_label text null,
  metadata jsonb not null default '{}'::jsonb,

  created_by uuid null references public.profiles(id) on delete set null,
  updated_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organization_payment_provider_settings_provider_check check (
    provider in ('mercado_pago', 'fintoc', 'manual')
  ),
  constraint organization_payment_provider_settings_status_check check (
    status in ('active', 'disabled')
  ),
  constraint organization_payment_provider_settings_unique unique (
    organization_id,
    provider
  )
);

create index if not exists organization_payment_provider_settings_org_idx
  on public.organization_payment_provider_settings (organization_id);

create index if not exists organization_payment_provider_settings_provider_idx
  on public.organization_payment_provider_settings (provider, status);

create or replace function public.touch_organization_payment_provider_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organization_payment_provider_settings_updated_at
  on public.organization_payment_provider_settings;

create trigger organization_payment_provider_settings_updated_at
  before update on public.organization_payment_provider_settings
  for each row
  execute function public.touch_organization_payment_provider_settings_updated_at();

alter table public.organization_payment_provider_settings enable row level security;

revoke all on table public.organization_payment_provider_settings from anon;
revoke all on table public.organization_payment_provider_settings from authenticated;
grant select, insert, update, delete
  on table public.organization_payment_provider_settings
  to service_role;

comment on table public.organization_payment_provider_settings is
  'Credenciales server-side para que cada centro cobre a sus pacientes con su propia cuenta de proveedor. No corresponde al billing de Agendix.';

comment on column public.organization_payment_provider_settings.access_token is
  'Secreto del proveedor. No se concede acceso a anon/authenticated; solo service_role en backend.';
