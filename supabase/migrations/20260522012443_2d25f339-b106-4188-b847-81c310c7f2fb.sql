
create table public.flashcards_curados (
  id uuid primary key default gen_random_uuid(),
  resumo_livro_id uuid not null,
  resumo_capitulo_id uuid not null,
  ordem integer not null default 0,
  frente text not null,
  verso text not null,
  explicacao text,
  exemplo text,
  dica text,
  area text,
  materia text,
  livro_titulo text,
  capitulo_titulo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_fc_curados_area on public.flashcards_curados (area);
create index idx_fc_curados_livro_ordem on public.flashcards_curados (resumo_livro_id, ordem);
create index idx_fc_curados_capitulo on public.flashcards_curados (resumo_capitulo_id);

alter table public.flashcards_curados enable row level security;

create policy "Leitura pública flashcards curados"
  on public.flashcards_curados for select
  to public using (true);

create policy "Admins inserem flashcards curados"
  on public.flashcards_curados for insert
  to authenticated
  with check (private.has_role((select auth.uid()), 'admin'::app_role));

create policy "Admins atualizam flashcards curados"
  on public.flashcards_curados for update
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::app_role))
  with check (private.has_role((select auth.uid()), 'admin'::app_role));

create policy "Admins removem flashcards curados"
  on public.flashcards_curados for delete
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::app_role));

create trigger trg_fc_curados_touch
  before update on public.flashcards_curados
  for each row execute function public.touch_updated_at();

create table public.flashcards_curados_jobs (
  id uuid primary key default gen_random_uuid(),
  resumo_livro_id uuid not null unique,
  status text not null default 'pendente',
  total_capitulos integer not null default 0,
  capitulos_gerados integer not null default 0,
  total_cards integer not null default 0,
  erro_msg text,
  gerado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.flashcards_curados_jobs enable row level security;

create policy "Admins gerenciam jobs de flashcards"
  on public.flashcards_curados_jobs for all
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::app_role))
  with check (private.has_role((select auth.uid()), 'admin'::app_role));

create policy "Leitura pública jobs flashcards"
  on public.flashcards_curados_jobs for select
  to public using (true);

create trigger trg_fc_jobs_touch
  before update on public.flashcards_curados_jobs
  for each row execute function public.touch_updated_at();
