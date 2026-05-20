-- Mantiene WhatsApp preparado pero desactivado hasta configurar credenciales.
-- Corrige proyectos donde la migracion 20260514163708 ya quedo aplicada
-- con defaults live antes del ajuste de producto.

alter table public.configuracion_recordatorios
  alter column whatsapp_enabled set default false,
  alter column whatsapp_mode set default 'mock';

update public.configuracion_recordatorios
set
  whatsapp_enabled = false,
  whatsapp_mode = 'mock',
  updated_at = now()
where whatsapp_enabled = true
  or whatsapp_mode <> 'mock';

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
    24,
    24,
    'mock'
  )
  on conflict (centro_id) do nothing;

  return new;
end;
$$;
