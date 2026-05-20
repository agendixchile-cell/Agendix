-- Ejecutar una vez en Supabase SQL Editor luego de desplegar la Edge Function.
-- Reemplaza los valores de ejemplo antes de ejecutar.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

do $$
declare
  project_url_secret_id uuid;
  cron_secret_id uuid;
begin
  select id into project_url_secret_id
  from vault.decrypted_secrets
  where name = 'agendix_project_url'
  order by created_at desc
  limit 1;

  if project_url_secret_id is null then
    perform vault.create_secret(
      'https://PROJECT_REF.supabase.co',
      'agendix_project_url'
    );
  else
    perform vault.update_secret(
      project_url_secret_id,
      'https://PROJECT_REF.supabase.co',
      'agendix_project_url'
    );
  end if;

  select id into cron_secret_id
  from vault.decrypted_secrets
  where name = 'agendix_reminders_cron_secret'
  order by created_at desc
  limit 1;

  if cron_secret_id is null then
    perform vault.create_secret(
      'A_LONG_RANDOM_CRON_SECRET',
      'agendix_reminders_cron_secret'
    );
  else
    perform vault.update_secret(
      cron_secret_id,
      'A_LONG_RANDOM_CRON_SECRET',
      'agendix_reminders_cron_secret'
    );
  end if;
end $$;

do $$
begin
  perform cron.unschedule('agendix-send-booking-reminders');
exception
  when undefined_function or undefined_table then
    null;
  when others then
    null;
end $$;

select cron.schedule(
  'agendix-send-booking-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'agendix_project_url'
    ) || '/functions/v1/send-booking-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reminders-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'agendix_reminders_cron_secret'
      )
    ),
    body := jsonb_build_object(
      'batch_size', 25,
      'triggered_at', now()
    )
  ) as request_id;
  $$
);
