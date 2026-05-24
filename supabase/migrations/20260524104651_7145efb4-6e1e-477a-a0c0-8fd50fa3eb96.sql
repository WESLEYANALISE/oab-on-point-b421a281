-- Split estatuto overview into head (lei + primeiros N artigos), tail (resto) e user (favoritos/anotados).
-- Permite primeira pintura instantânea no cliente sem esperar 2k+ artigos.

create or replace function public.get_estatuto_head(_slug text, _limit int default 40)
returns jsonb
language sql
stable
set search_path to 'public'
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
          'relevancia_nota', a.relevancia_nota,
          'ult_alteracao_em', a.ult_alteracao_em,
          'revogado', a.revogado
        )
        order by a.ordem
      )
      from (
        select * from public.vade_mecum_artigos
        where lei_id = l.id
        order by ordem
        limit greatest(_limit, 1)
      ) a
    ), '[]'::jsonb)
  )
  from public.vade_mecum_leis l
  where l.slug = _slug;
$$;

create or replace function public.get_estatuto_tail(_slug text, _offset int default 40)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  select jsonb_build_object(
    'artigos', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'numero', a.numero,
          'texto', a.texto,
          'ordem', a.ordem,
          'relevancia', a.relevancia,
          'relevancia_nota', a.relevancia_nota,
          'ult_alteracao_em', a.ult_alteracao_em,
          'revogado', a.revogado
        )
        order by a.ordem
      )
      from (
        select * from public.vade_mecum_artigos
        where lei_id = l.id
        order by ordem
        offset greatest(_offset, 0)
      ) a
    ), '[]'::jsonb)
  )
  from public.vade_mecum_leis l
  where l.slug = _slug;
$$;

create or replace function public.get_estatuto_user(_slug text, _user_id uuid)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  select jsonb_build_object(
    'favoritos', coalesce((
      select jsonb_agg(f.artigo_id)
      from public.vade_mecum_favoritos f
      where f.lei_id = l.id and f.user_id = _user_id
    ), '[]'::jsonb),
    'anotados', coalesce((
      select jsonb_agg(distinct n.artigo_id)
      from public.vade_mecum_anotacoes n
      where n.lei_id = l.id and n.user_id = _user_id
    ), '[]'::jsonb)
  )
  from public.vade_mecum_leis l
  where l.slug = _slug;
$$;