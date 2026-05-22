
-- Tabelas para pipeline em 3 etapas (extrair / prévia / publicar)

create table if not exists public.aulas_interativas_extracoes (
  id uuid primary key default gen_random_uuid(),
  arquivo_drive_id uuid not null references public.aulas_interativas_arquivos_drive(id) on delete cascade,
  markdown text not null default '',
  paginas jsonb not null default '[]'::jsonb,
  imagens jsonb not null default '[]'::jsonb,
  paginas_total int,
  modelo text,
  created_at timestamptz not null default now()
);

create index if not exists aulas_interativas_extracoes_arquivo_idx
  on public.aulas_interativas_extracoes(arquivo_drive_id, created_at desc);

alter table public.aulas_interativas_extracoes enable row level security;

create policy "admins gerenciam extracoes"
  on public.aulas_interativas_extracoes
  for all
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::app_role))
  with check (private.has_role((select auth.uid()), 'admin'::app_role));

create policy "leitura pública extracoes"
  on public.aulas_interativas_extracoes
  for select
  to public
  using (true);

create table if not exists public.aulas_interativas_previas (
  id uuid primary key default gen_random_uuid(),
  arquivo_drive_id uuid not null references public.aulas_interativas_arquivos_drive(id) on delete cascade,
  estrutura jsonb not null default '{"modulos":[]}'::jsonb,
  titulo_sugerido text,
  materia_sugerida text,
  created_at timestamptz not null default now()
);

create index if not exists aulas_interativas_previas_arquivo_idx
  on public.aulas_interativas_previas(arquivo_drive_id, created_at desc);

alter table public.aulas_interativas_previas enable row level security;

create policy "admins gerenciam previas"
  on public.aulas_interativas_previas
  for all
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::app_role))
  with check (private.has_role((select auth.uid()), 'admin'::app_role));

create policy "leitura pública previas"
  on public.aulas_interativas_previas
  for select
  to public
  using (true);
