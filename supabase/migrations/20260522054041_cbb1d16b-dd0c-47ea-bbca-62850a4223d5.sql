-- Cursos
create table public.aulas_interativas_cursos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  slug text not null unique,
  descricao text not null default '',
  capa_url text,
  materia text,
  pdf_origem_url text,
  publicado boolean not null default false,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.aulas_interativas_cursos enable row level security;

create policy "leitura pública cursos publicados"
  on public.aulas_interativas_cursos for select
  using (publicado = true or private.has_role((select auth.uid()), 'admin'::app_role));

create policy "admins gerenciam cursos"
  on public.aulas_interativas_cursos for all
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::app_role))
  with check (private.has_role((select auth.uid()), 'admin'::app_role));

create trigger trg_cursos_updated_at
  before update on public.aulas_interativas_cursos
  for each row execute function public.touch_updated_at();

-- Módulos
create table public.aulas_interativas_modulos (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.aulas_interativas_cursos(id) on delete cascade,
  titulo text not null,
  descricao text not null default '',
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.aulas_interativas_modulos enable row level security;
create index idx_aulas_int_modulos_curso on public.aulas_interativas_modulos(curso_id, ordem);

create policy "leitura pública módulos"
  on public.aulas_interativas_modulos for select using (true);
create policy "admins gerenciam módulos"
  on public.aulas_interativas_modulos for all to authenticated
  using (private.has_role((select auth.uid()), 'admin'::app_role))
  with check (private.has_role((select auth.uid()), 'admin'::app_role));

-- Aulas
create table public.aulas_interativas_aulas (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references public.aulas_interativas_modulos(id) on delete cascade,
  curso_id uuid not null references public.aulas_interativas_cursos(id) on delete cascade,
  titulo text not null,
  slug text not null,
  descricao text not null default '',
  ordem integer not null default 0,
  duracao_min integer not null default 10,
  created_at timestamptz not null default now(),
  unique(curso_id, slug)
);
alter table public.aulas_interativas_aulas enable row level security;
create index idx_aulas_int_aulas_modulo on public.aulas_interativas_aulas(modulo_id, ordem);

create policy "leitura pública aulas"
  on public.aulas_interativas_aulas for select using (true);
create policy "admins gerenciam aulas"
  on public.aulas_interativas_aulas for all to authenticated
  using (private.has_role((select auth.uid()), 'admin'::app_role))
  with check (private.has_role((select auth.uid()), 'admin'::app_role));

-- Slides
create table public.aulas_interativas_slides (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas_interativas_aulas(id) on delete cascade,
  ordem integer not null,
  tipo text not null check (tipo in ('capa','conceito','exemplo','esquema','comparativo','quiz','resumo','conclusao')),
  conteudo jsonb not null default '{}'::jsonb,
  imagem_url text,
  quiz_json jsonb,
  created_at timestamptz not null default now()
);
alter table public.aulas_interativas_slides enable row level security;
create index idx_aulas_int_slides_aula on public.aulas_interativas_slides(aula_id, ordem);

create policy "leitura pública slides"
  on public.aulas_interativas_slides for select using (true);
create policy "admins gerenciam slides"
  on public.aulas_interativas_slides for all to authenticated
  using (private.has_role((select auth.uid()), 'admin'::app_role))
  with check (private.has_role((select auth.uid()), 'admin'::app_role));

-- Progresso
create table public.aulas_interativas_progresso (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  aula_id uuid not null references public.aulas_interativas_aulas(id) on delete cascade,
  curso_id uuid not null references public.aulas_interativas_cursos(id) on delete cascade,
  slide_atual integer not null default 0,
  concluida boolean not null default false,
  atualizado_em timestamptz not null default now(),
  unique(user_id, aula_id)
);
alter table public.aulas_interativas_progresso enable row level security;
create index idx_aulas_int_prog_user on public.aulas_interativas_progresso(user_id, curso_id);

create policy "usuário vê próprio progresso"
  on public.aulas_interativas_progresso for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "usuário insere próprio progresso"
  on public.aulas_interativas_progresso for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "usuário atualiza próprio progresso"
  on public.aulas_interativas_progresso for update to authenticated
  using ((select auth.uid()) = user_id);

-- Buckets
insert into storage.buckets (id, name, public) values
  ('aulas-interativas-pdfs', 'aulas-interativas-pdfs', true),
  ('aulas-interativas-imagens', 'aulas-interativas-imagens', true)
on conflict (id) do nothing;

create policy "leitura pública pdfs aulas int"
  on storage.objects for select using (bucket_id = 'aulas-interativas-pdfs');
create policy "admins escrevem pdfs aulas int"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'aulas-interativas-pdfs' and private.has_role((select auth.uid()), 'admin'::app_role));
create policy "admins atualizam pdfs aulas int"
  on storage.objects for update to authenticated
  using (bucket_id = 'aulas-interativas-pdfs' and private.has_role((select auth.uid()), 'admin'::app_role));
create policy "admins removem pdfs aulas int"
  on storage.objects for delete to authenticated
  using (bucket_id = 'aulas-interativas-pdfs' and private.has_role((select auth.uid()), 'admin'::app_role));

create policy "leitura pública imagens aulas int"
  on storage.objects for select using (bucket_id = 'aulas-interativas-imagens');
create policy "admins escrevem imagens aulas int"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'aulas-interativas-imagens' and private.has_role((select auth.uid()), 'admin'::app_role));
create policy "admins atualizam imagens aulas int"
  on storage.objects for update to authenticated
  using (bucket_id = 'aulas-interativas-imagens' and private.has_role((select auth.uid()), 'admin'::app_role));
create policy "admins removem imagens aulas int"
  on storage.objects for delete to authenticated
  using (bucket_id = 'aulas-interativas-imagens' and private.has_role((select auth.uid()), 'admin'::app_role));