-- 1) RPC consolidada do estatuto (lista leve, sem texto completo)
create or replace function public.get_estatuto_overview(_slug text, _user_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'lei', to_jsonb(l.*),
    'artigos', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'numero', a.numero,
          'texto', a.texto,
          'ordem', a.ordem,
          'relevancia', a.relevancia,
          'relevancia_nota', a.relevancia_nota
        )
        order by a.ordem
      )
      from public.vade_mecum_artigos a
      where a.lei_id = l.id
    ), '[]'::jsonb),
    'favoritos', coalesce((
      select jsonb_agg(f.artigo_id)
      from public.vade_mecum_favoritos f
      where f.lei_id = l.id and _user_id is not null and f.user_id = _user_id
    ), '[]'::jsonb),
    'anotados', coalesce((
      select jsonb_agg(distinct n.artigo_id)
      from public.vade_mecum_anotacoes n
      where n.lei_id = l.id and _user_id is not null and n.user_id = _user_id
    ), '[]'::jsonb)
  )
  from public.vade_mecum_leis l
  where l.slug = _slug;
$$;

-- 2) Artigo completo, on-demand
create or replace function public.get_artigo_full(_id uuid)
returns setof public.vade_mecum_artigos
language sql
stable
security definer
set search_path = public
as $$
  select * from public.vade_mecum_artigos where id = _id limit 1;
$$;

-- 3) Limpar índice duplicado do blog (idx_blog_posts_pub_data == idx_blog_posts_publicado_em)
drop index if exists public.idx_blog_posts_pub_data;

-- 4) Partial index pra "tentativa em andamento" — query muito frequente
create index if not exists idx_tentativas_user_em_andamento
  on public.simulado_tentativas (user_id, simulado_id, iniciado_em desc)
  where concluido_em is null;

-- 5) Index pra anotações por artigo (lookup rápido inverso)
create index if not exists idx_vmec_anot_artigo
  on public.vade_mecum_anotacoes (artigo_id);