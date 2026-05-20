
create table public.legis_resenha_dia (
  data_dou date not null,
  edicao_extra boolean not null default false,
  mes_ref text not null,
  fonte_url text not null,
  extraido_em timestamptz not null default now(),
  total_atos int not null default 0,
  primary key (data_dou, edicao_extra)
);
alter table public.legis_resenha_dia enable row level security;
create policy "Leitura pública resenha dia" on public.legis_resenha_dia for select using (true);
create policy "Admin gerencia resenha dia" on public.legis_resenha_dia for all to authenticated
  using (private.has_role((select auth.uid()), 'admin'::app_role))
  with check (private.has_role((select auth.uid()), 'admin'::app_role));

create table public.legis_atos (
  id uuid primary key default gen_random_uuid(),
  data_dou date not null,
  edicao_extra boolean not null default false,
  tipo text not null,
  numero text not null,
  data_assinatura date,
  ementa text not null default '',
  url text not null,
  hash text not null unique,
  texto_importado boolean not null default false,
  vade_mecum_lei_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index legis_atos_data_idx on public.legis_atos (data_dou desc);
alter table public.legis_atos enable row level security;
create policy "Leitura pública atos" on public.legis_atos for select using (true);
create policy "Admin gerencia atos" on public.legis_atos for all to authenticated
  using (private.has_role((select auth.uid()), 'admin'::app_role))
  with check (private.has_role((select auth.uid()), 'admin'::app_role));

create trigger legis_atos_touch before update on public.legis_atos
  for each row execute function public.touch_updated_at();

create table public.legis_sync_runs (
  id uuid primary key default gen_random_uuid(),
  executado_em timestamptz not null default now(),
  gatilho text not null,
  mes_ref text,
  novos int not null default 0,
  atualizados int not null default 0,
  erro text
);
alter table public.legis_sync_runs enable row level security;
create policy "Admin lê runs" on public.legis_sync_runs for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'::app_role));
create policy "Admin gerencia runs" on public.legis_sync_runs for all to authenticated
  using (private.has_role((select auth.uid()), 'admin'::app_role))
  with check (private.has_role((select auth.uid()), 'admin'::app_role));

select cron.schedule('resenha-sync-08', '0 11 * * *', $$
  select net.http_post(
    url := 'https://project--7143ea90-be27-484f-9f3e-f50d2fa31549.lovable.app/api/public/hooks/resenha-sync',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqYnp3bnpidXVrd2pheWRmcXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4OTQxMzIsImV4cCI6MjA5NDQ3MDEzMn0.0_HNBEwCOhqNSoTmrs7NwYWKUJESPFuFNAtzsxQVE5o"}'::jsonb,
    body := '{"gatilho":"cron-08h"}'::jsonb
  );
$$);
select cron.schedule('resenha-sync-17', '0 20 * * *', $$
  select net.http_post(
    url := 'https://project--7143ea90-be27-484f-9f3e-f50d2fa31549.lovable.app/api/public/hooks/resenha-sync',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqYnp3bnpidXVrd2pheWRmcXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4OTQxMzIsImV4cCI6MjA5NDQ3MDEzMn0.0_HNBEwCOhqNSoTmrs7NwYWKUJESPFuFNAtzsxQVE5o"}'::jsonb,
    body := '{"gatilho":"cron-17h"}'::jsonb
  );
$$);
select cron.schedule('resenha-sync-21', '0 0 * * *', $$
  select net.http_post(
    url := 'https://project--7143ea90-be27-484f-9f3e-f50d2fa31549.lovable.app/api/public/hooks/resenha-sync',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqYnp3bnpidXVrd2pheWRmcXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4OTQxMzIsImV4cCI6MjA5NDQ3MDEzMn0.0_HNBEwCOhqNSoTmrs7NwYWKUJESPFuFNAtzsxQVE5o"}'::jsonb,
    body := '{"gatilho":"cron-21h"}'::jsonb
  );
$$);
