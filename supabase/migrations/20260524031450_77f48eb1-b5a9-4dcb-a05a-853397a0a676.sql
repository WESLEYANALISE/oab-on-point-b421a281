CREATE OR REPLACE FUNCTION public.get_estatuto_overview(_slug text, _user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$;