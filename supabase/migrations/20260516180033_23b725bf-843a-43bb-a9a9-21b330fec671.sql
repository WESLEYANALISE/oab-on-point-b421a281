create table if not exists public.provas_oab_edital_resumo (
  prova_numero integer primary key,
  conteudo jsonb not null,
  gerado_em timestamptz not null default now()
);
alter table public.provas_oab_edital_resumo enable row level security;
create policy "Leitura pública do resumo de edital"
  on public.provas_oab_edital_resumo for select using (true);