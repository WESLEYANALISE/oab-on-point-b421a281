CREATE OR REPLACE FUNCTION public.get_biblioteca_books(_slug text, _area text DEFAULT NULL::text, _limit integer DEFAULT 60, _offset integer DEFAULT 0, _sort text DEFAULT 'cronologica')
 RETURNS TABLE(id bigint, titulo text, autor text, capa text, area text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT id, titulo, autor, capa, area FROM (
    SELECT e.id::bigint AS id, e."Tema" AS titulo, NULL::text AS autor, e."Capa-livro" AS capa, e."Área" AS area, COALESCE(e."Ordem", e.id::integer) AS ordem
    FROM public."BIBLIOTECA-ESTUDOS" e
    WHERE _slug = 'estudos' AND (_area IS NULL OR e."Área" = _area)
    UNION ALL
    SELECT c.id::bigint, c.livro, c.autor, c.imagem, c.area, c.id::integer
    FROM public."BIBLIOTECA-CLASSICOS" c
    WHERE _slug = 'classicos' AND (_area IS NULL OR c.area = _area)
    UNION ALL
    SELECT o.id::bigint, o.livro, o.autor, o.imagem, o.area, o.id::integer
    FROM public."BIBLIOTECA-ORATORIA" o
    WHERE _slug = 'oratoria' AND (_area IS NULL OR o.area = _area)
    UNION ALL
    SELECT l.id::bigint, l.livro, l.autor, l.imagem, l.area, l.id::integer
    FROM public."BIBLIOTECA-LIDERANÇA" l
    WHERE _slug = 'lideranca' AND (_area IS NULL OR l.area = _area)
    UNION ALL
    SELECT p.id::bigint, p.livro, p.autor, p.imagem, p.area, p.id::integer
    FROM public."BIBLIOTECA-POLITICA" p
    WHERE _slug = 'politica' AND (_area IS NULL OR p.area = _area)
    UNION ALL
    SELECT f.id::bigint, f.livro, f.autor, f."capa-livro", f.area, f.id::integer
    FROM public."BIBLIOTECA-FORA-DA-TOGA" f
    WHERE _slug = 'fora-da-toga' AND (_area IS NULL OR f.area = _area)
  ) books
  ORDER BY
    CASE WHEN _sort = 'alfabetica' THEN NULL ELSE area END NULLS LAST,
    CASE WHEN _sort = 'alfabetica' THEN NULL ELSE ordem END NULLS LAST,
    CASE WHEN _sort = 'alfabetica' THEN titulo END NULLS LAST,
    id
  LIMIT least(greatest(_limit, 1), 100)
  OFFSET greatest(_offset, 0);
$function$;