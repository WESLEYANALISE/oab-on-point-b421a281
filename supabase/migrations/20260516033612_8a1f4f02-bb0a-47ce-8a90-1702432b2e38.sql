CREATE OR REPLACE FUNCTION public.get_biblioteca_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'estudos', (SELECT count(*) FROM public."BIBLIOTECA-ESTUDOS"),
    'classicos', (SELECT count(*) FROM public."BIBLIOTECA-CLASSICOS"),
    'oratoria', (SELECT count(*) FROM public."BIBLIOTECA-ORATORIA"),
    'lideranca', (SELECT count(*) FROM public."BIBLIOTECA-LIDERANÇA"),
    'politica', (SELECT count(*) FROM public."BIBLIOTECA-POLITICA"),
    'fora-da-toga', (SELECT count(*) FROM public."BIBLIOTECA-FORA-DA-TOGA")
  );
$$;

CREATE OR REPLACE FUNCTION public.get_biblioteca_areas(_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(area ORDER BY area), '[]'::jsonb)
  FROM (
    SELECT DISTINCT "Área" AS area FROM public."BIBLIOTECA-ESTUDOS" WHERE _slug = 'estudos' AND "Área" IS NOT NULL
    UNION
    SELECT DISTINCT area FROM public."BIBLIOTECA-FORA-DA-TOGA" WHERE _slug = 'fora-da-toga' AND area IS NOT NULL
    UNION
    SELECT DISTINCT area FROM public."BIBLIOTECA-CLASSICOS" WHERE _slug = 'classicos' AND area IS NOT NULL
    UNION
    SELECT DISTINCT area FROM public."BIBLIOTECA-ORATORIA" WHERE _slug = 'oratoria' AND area IS NOT NULL
    UNION
    SELECT DISTINCT area FROM public."BIBLIOTECA-LIDERANÇA" WHERE _slug = 'lideranca' AND area IS NOT NULL
    UNION
    SELECT DISTINCT area FROM public."BIBLIOTECA-POLITICA" WHERE _slug = 'politica' AND area IS NOT NULL
  ) areas;
$$;

CREATE OR REPLACE FUNCTION public.get_biblioteca_books(_slug text, _area text DEFAULT NULL, _limit integer DEFAULT 60, _offset integer DEFAULT 0)
RETURNS TABLE(id bigint, titulo text, autor text, capa text, area text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  ORDER BY area NULLS LAST, ordem NULLS LAST, id
  LIMIT least(greatest(_limit, 1), 100)
  OFFSET greatest(_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.get_biblioteca_book(_slug text, _id bigint)
RETURNS TABLE(id bigint, titulo text, autor text, capa text, area text, sobre text, link text, download text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (
    SELECT e.id::bigint AS id, e."Tema" AS titulo, NULL::text AS autor, e."Capa-livro" AS capa, e."Área" AS area, e."Sobre" AS sobre, e."Link" AS link, e."Download" AS download
    FROM public."BIBLIOTECA-ESTUDOS" e
    WHERE _slug = 'estudos' AND e.id = _id
    UNION ALL
    SELECT c.id::bigint, c.livro, c.autor, c.imagem, c.area, c.sobre, c.link, c.download
    FROM public."BIBLIOTECA-CLASSICOS" c
    WHERE _slug = 'classicos' AND c.id = _id
    UNION ALL
    SELECT o.id::bigint, o.livro, o.autor, o.imagem, o.area, o.sobre, o.link, o.download
    FROM public."BIBLIOTECA-ORATORIA" o
    WHERE _slug = 'oratoria' AND o.id = _id
    UNION ALL
    SELECT l.id::bigint, l.livro, l.autor, l.imagem, l.area, l.sobre, l.link, l.download
    FROM public."BIBLIOTECA-LIDERANÇA" l
    WHERE _slug = 'lideranca' AND l.id = _id
    UNION ALL
    SELECT p.id::bigint, p.livro, p.autor, p.imagem, p.area, p.sobre, p.link, p.download
    FROM public."BIBLIOTECA-POLITICA" p
    WHERE _slug = 'politica' AND p.id = _id
    UNION ALL
    SELECT f.id::bigint, f.livro, f.autor, f."capa-livro", f.area, f.sobre, f.link, f.download
    FROM public."BIBLIOTECA-FORA-DA-TOGA" f
    WHERE _slug = 'fora-da-toga' AND f.id = _id
  ) book
  LIMIT 1;
$$;

CREATE INDEX IF NOT EXISTS biblioteca_estudos_area_ordem_id_idx ON public."BIBLIOTECA-ESTUDOS" ("Área", "Ordem", id);
CREATE INDEX IF NOT EXISTS biblioteca_fora_area_id_idx ON public."BIBLIOTECA-FORA-DA-TOGA" (area, id);
CREATE INDEX IF NOT EXISTS biblioteca_classicos_area_id_idx ON public."BIBLIOTECA-CLASSICOS" (area, id);
CREATE INDEX IF NOT EXISTS biblioteca_politica_area_id_idx ON public."BIBLIOTECA-POLITICA" (area, id);

GRANT EXECUTE ON FUNCTION public.get_biblioteca_counts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_biblioteca_areas(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_biblioteca_books(text, text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_biblioteca_book(text, bigint) TO anon, authenticated;