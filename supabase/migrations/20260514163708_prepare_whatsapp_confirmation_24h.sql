-- Deja WhatsApp preparado para confirmacion de cita 24 horas antes.
-- Permanece desactivado por defecto hasta configurar credenciales y activarlo
-- desde Centro -> Recordatorios.

alter table public.configuracion_recordatorios
  alter column whatsapp_enabled set default false,
  alter column whatsapp_mode set default 'mock';

insert into public.configuracion_recordatorios (
  centro_id,
  email_enabled,
  whatsapp_enabled,
  email_hours_before,
  whatsapp_hours_before,
  whatsapp_mode
)
select
  id,
  true,
  false,
  48,
  24,
  'mock'
from public.centros
on conflict (centro_id) do update
set
  whatsapp_enabled = false,
  whatsapp_mode = 'mock',
  whatsapp_hours_before = 24,
  updated_at = now();

create or replace function public.ensure_default_reminder_config()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.configuracion_recordatorios (
    centro_id,
    email_enabled,
    whatsapp_enabled,
    email_hours_before,
    whatsapp_hours_before,
    whatsapp_mode
  )
  values (
    new.id,
    true,
    false,
    48,
    24,
    'mock'
  )
  on conflict (centro_id) do nothing;

  return new;
end;
$$;
