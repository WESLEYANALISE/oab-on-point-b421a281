
-- Bucket privado para narrações
insert into storage.buckets (id, name, public)
values ('narracoes', 'narracoes', false)
on conflict (id) do nothing;

-- Tabela de metadados de narração
create table if not exists public.vade_mecum_narracoes (
  id uuid primary key default gen_random_uuid(),
  artigo_id uuid not null unique references public.vade_mecum_artigos(id) on delete cascade,
  lei_id uuid not null references public.vade_mecum_leis(id) on delete cascade,
  audio_path text not null,
  voz text not null default 'Kore',
  texto_narrado text not null,
  duracao_ms integer,
  gerado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vmec_narracoes_lei on public.vade_mecum_narracoes(lei_id);

alter table public.vade_mecum_narracoes enable row level security;

create policy "Admins gerenciam narracoes"
on public.vade_mecum_narracoes for all to authenticated
using (private.has_role(auth.uid(), 'admin'::app_role))
with check (private.has_role(auth.uid(), 'admin'::app_role));

create trigger vmec_narracoes_touch
before update on public.vade_mecum_narracoes
for each row execute function public.touch_updated_at();

-- Políticas do bucket narracoes (admin only)
create policy "Admins leem narracoes"
on storage.objects for select to authenticated
using (bucket_id = 'narracoes' and private.has_role(auth.uid(), 'admin'::app_role));

create policy "Admins inserem narracoes"
on storage.objects for insert to authenticated
with check (bucket_id = 'narracoes' and private.has_role(auth.uid(), 'admin'::app_role));

create policy "Admins atualizam narracoes"
on storage.objects for update to authenticated
using (bucket_id = 'narracoes' and private.has_role(auth.uid(), 'admin'::app_role));

create policy "Admins removem narracoes"
on storage.objects for delete to authenticated
using (bucket_id = 'narracoes' and private.has_role(auth.uid(), 'admin'::app_role));
