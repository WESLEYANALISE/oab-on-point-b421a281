
create table public.assistente_conversas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null default 'Nova conversa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assistente_conversas_user_idx on public.assistente_conversas(user_id, updated_at desc);
alter table public.assistente_conversas enable row level security;
create policy "owner select" on public.assistente_conversas for select using (auth.uid() = user_id);
create policy "owner insert" on public.assistente_conversas for insert with check (auth.uid() = user_id);
create policy "owner update" on public.assistente_conversas for update using (auth.uid() = user_id);
create policy "owner delete" on public.assistente_conversas for delete using (auth.uid() = user_id);

create table public.assistente_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.assistente_conversas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index assistente_mensagens_conversa_idx on public.assistente_mensagens(conversa_id, created_at);
alter table public.assistente_mensagens enable row level security;
create policy "owner select msg" on public.assistente_mensagens for select using (auth.uid() = user_id);
create policy "owner insert msg" on public.assistente_mensagens for insert with check (auth.uid() = user_id);
create policy "owner delete msg" on public.assistente_mensagens for delete using (auth.uid() = user_id);
