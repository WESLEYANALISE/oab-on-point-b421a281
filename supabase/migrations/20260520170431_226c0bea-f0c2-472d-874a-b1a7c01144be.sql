
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove agendamento anterior se existir (idempotente)
DO $$
BEGIN
  PERFORM cron.unschedule('cf-sync-weekly');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'cf-sync-weekly',
  '0 3 * * 0',
  $cron$
  SELECT net.http_post(
    url := 'https://project--7143ea90-be27-484f-9f3e-f50d2fa31549.lovable.app/api/public/hooks/cf-sync',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqYnp3bnpidXVrd2pheWRmcXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4OTQxMzIsImV4cCI6MjA5NDQ3MDEzMn0.0_HNBEwCOhqNSoTmrs7NwYWKUJESPFuFNAtzsxQVE5o"}'::jsonb,
    body := '{}'::jsonb
  );
  $cron$
);
