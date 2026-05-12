-- Ejecutar una vez en Supabase SQL Editor luego de desplegar la Edge Function.
-- Reemplaza los valores de ejemplo antes de ejecutar.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

select vault.create_secret(
  'https://PROJECT_REF.supabase.co',
  'agendix_project_url'
);

select vault.create_secret(
  'SUPABASE_ANON_KEY',
  'agendix_anon_key'
);

select vault.create_secret(
  'A_LONG_RANDOM_CRON_SECRET',
  'agendix_reminders_cron_secret'
);

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
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'agendix_anon_key'
      ),
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
