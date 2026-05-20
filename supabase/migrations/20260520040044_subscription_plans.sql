-- Commercial plan architecture for Agendix.
-- The existing centros table is the organization/account boundary.

alter type public.rol_centro add value if not exists 'owner';

alter table public.centros
  add column if not exists owner_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists plan_id text not null default 'individual',
  add column if not exists subscription_status text not null default 'trial',
  add column if not exists extra_professionals_count integer not null default 0;

alter table public.centros
  drop constraint if exists centros_plan_id_check;

alter table public.centros
  add constraint centros_plan_id_check
  check (plan_id in ('individual', 'center', 'center_pro', 'enterprise'));

alter table public.centros
  drop constraint if exists centros_subscription_status_check;

alter table public.centros
  add constraint centros_subscription_status_check
  check (subscription_status in ('trial', 'active', 'cancelled', 'past_due', 'pending'));

alter table public.centros
  drop constraint if exists centros_extra_professionals_count_check;

alter table public.centros
  add constraint centros_extra_professionals_count_check
  check (extra_professionals_count >= 0);

alter table public.pacientes
  add column if not exists activo boolean not null default true;

alter table public.reservas
  add column if not exists meeting_provider text,
  add column if not exists meeting_url text,
  add column if not exists auto_generated_meeting boolean not null default false;

alter table public.reservas
  drop constraint if exists reservas_meeting_provider_check;

alter table public.reservas
  add constraint reservas_meeting_provider_check
  check (
    meeting_provider is null
    or meeting_provider in ('zoom', 'google_meet', 'other')
  );

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.centros(id) on delete cascade,
  plan_id text not null,
  status text not null default 'trial',
  billing_provider text,
  billing_customer_id text,
  billing_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_plan_id_check
    check (plan_id in ('individual', 'center', 'center_pro', 'enterprise')),
  constraint subscriptions_status_check
    check (status in ('trial', 'active', 'cancelled', 'past_due', 'pending')),
  constraint subscriptions_billing_provider_check
    check (
      billing_provider is null
      or billing_provider in ('stripe', 'mercado_pago', 'manual', 'other')
    )
);

create unique index if not exists subscriptions_provider_subscription_unique
  on public.subscriptions (billing_provider, billing_subscription_id)
  where billing_provider is not null and billing_subscription_id is not null;

create index if not exists subscriptions_organization_idx
  on public.subscriptions (organization_id, status, created_at desc);

create index if not exists centros_plan_idx
  on public.centros (plan_id, subscription_status);

create index if not exists pacientes_centro_activo_idx
  on public.pacientes (centro_id, activo);

create index if not exists reservas_meeting_provider_idx
  on public.reservas (centro_id, meeting_provider)
  where meeting_provider is not null;

drop trigger if exists subscriptions_updated_at on public.subscriptions;

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Infer a starting plan for existing organizations so current teams are not
-- accidentally blocked by the Individual default after this migration.
with professional_counts as (
  select
    centro_id,
    count(*) filter (
      where activo = true and rol::text in ('owner', 'admin', 'profesional')
    ) as active_professionals
  from public.miembros_centro
  group by centro_id
)
update public.centros c
set plan_id = case
  when coalesce(pc.active_professionals, 0) <= 1 then 'individual'
  when pc.active_professionals <= 5 then 'center'
  when pc.active_professionals <= 15 then 'center_pro'
  else 'enterprise'
end
from professional_counts pc
where pc.centro_id = c.id
  and c.plan_id = 'individual';

update public.centros c
set owner_user_id = owner_member.profile_id
from lateral (
  select mc.profile_id
  from public.miembros_centro mc
  where mc.centro_id = c.id
  order by
    case
      when mc.rol::text = 'owner' then 0
      when mc.rol::text = 'admin' then 1
      else 2
    end,
    mc.created_at asc
  limit 1
) owner_member
where c.owner_user_id is null;

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
      and mc.rol::text in ('owner', 'admin')
      and mc.activo = true
  );
$$;

create or replace function public.is_centro_owner(target_centro_id uuid)
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
      and mc.rol::text = 'owner'
      and mc.activo = true
  );
$$;

create or replace function public.plan_professional_limit(
  target_plan_id text,
  extras integer default 0
)
returns integer
language sql
stable
as $$
  select case coalesce(target_plan_id, 'individual')
    when 'individual' then 1
    when 'center' then 5 + greatest(coalesce(extras, 0), 0)
    when 'center_pro' then 15 + greatest(coalesce(extras, 0), 0)
    when 'enterprise' then null
    else 1
  end;
$$;

create or replace function public.plan_active_patient_limit(target_plan_id text)
returns integer
language sql
stable
as $$
  select case coalesce(target_plan_id, 'individual')
    when 'individual' then 50
    else null
  end;
$$;

create or replace function public.enforce_professional_plan_limit()
returns trigger
language plpgsql
as $$
declare
  target_plan_id text;
  target_extras integer;
  max_professionals integer;
  active_professionals integer;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.activo is distinct from true
    or new.rol::text not in ('owner', 'admin', 'profesional') then
    return new;
  end if;

  select c.plan_id, c.extra_professionals_count
    into target_plan_id, target_extras
  from public.centros c
  where c.id = new.centro_id;

  max_professionals := public.plan_professional_limit(
    target_plan_id,
    target_extras
  );

  if max_professionals is null then
    return new;
  end if;

  select count(*)
    into active_professionals
  from public.miembros_centro mc
  where mc.centro_id = new.centro_id
    and mc.activo = true
    and mc.rol::text in ('owner', 'admin', 'profesional')
    and (tg_op = 'INSERT' or mc.id <> new.id);

  if active_professionals + 1 > max_professionals then
    raise exception 'plan_professional_limit_exceeded'
      using
        errcode = 'P0001',
        detail = format(
          'Plan %s allows %s active professionals.',
          target_plan_id,
          max_professionals
        ),
        hint = 'Upgrade the plan or increase extra_professionals_count.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_active_patient_plan_limit()
returns trigger
language plpgsql
as $$
declare
  target_plan_id text;
  max_patients integer;
  active_patients integer;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.activo is distinct from true then
    return new;
  end if;

  select c.plan_id
    into target_plan_id
  from public.centros c
  where c.id = new.centro_id;

  max_patients := public.plan_active_patient_limit(target_plan_id);

  if max_patients is null then
    return new;
  end if;

  select count(*)
    into active_patients
  from public.pacientes p
  where p.centro_id = new.centro_id
    and p.activo = true
    and (tg_op = 'INSERT' or p.id <> new.id);

  if active_patients + 1 > max_patients then
    raise exception 'plan_active_patient_limit_exceeded'
      using
        errcode = 'P0001',
        detail = format(
          'Plan %s allows %s active patients.',
          target_plan_id,
          max_patients
        ),
        hint = 'Upgrade the plan or archive/inactivate a patient.';
  end if;

  return new;
end;
$$;

drop trigger if exists miembros_centro_plan_limit on public.miembros_centro;

create trigger miembros_centro_plan_limit
  before insert or update of rol, activo, centro_id
  on public.miembros_centro
  for each row execute function public.enforce_professional_plan_limit();

drop trigger if exists pacientes_active_plan_limit on public.pacientes;

create trigger pacientes_active_plan_limit
  before insert or update of activo, centro_id
  on public.pacientes
  for each row execute function public.enforce_active_patient_plan_limit();

alter table public.subscriptions enable row level security;

drop policy if exists "miembros pueden leer subscriptions"
  on public.subscriptions;

create policy "miembros pueden leer subscriptions"
  on public.subscriptions for select
  to authenticated
  using (public.is_centro_member(organization_id));

drop policy if exists "owners pueden administrar subscriptions"
  on public.subscriptions;

create policy "owners pueden administrar subscriptions"
  on public.subscriptions for all
  to authenticated
  using (public.is_centro_owner(organization_id))
  with check (public.is_centro_owner(organization_id));

grant usage on type public.rol_centro to authenticated, service_role;
grant select, insert, update, delete on table public.subscriptions to authenticated;
grant select, insert, update, delete on table public.subscriptions to service_role;
grant execute on function public.is_centro_owner(uuid) to authenticated;
grant execute on function public.plan_professional_limit(text, integer) to authenticated;
grant execute on function public.plan_active_patient_limit(text) to authenticated;

comment on column public.centros.plan_id is
  'Commercial plan id: individual, center, center_pro, enterprise.';

comment on column public.centros.subscription_status is
  'Subscription lifecycle status mirrored from the billing provider when available.';

comment on column public.centros.extra_professionals_count is
  'Paid or manually enabled professional seats above the base plan limit.';

comment on column public.pacientes.activo is
  'Active patient flag used for plan limits; inactive patients are archived operationally.';

comment on column public.reservas.meeting_provider is
  'Manual or future automatic meeting provider for telemedicine links.';

comment on column public.reservas.meeting_url is
  'Zoom, Google Meet, or compatible meeting URL saved on the reservation.';

comment on column public.reservas.auto_generated_meeting is
  'True when a future provider integration generated the meeting link automatically.';
