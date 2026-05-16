
CREATE OR REPLACE FUNCTION public.get_biblioteca_areas_counts(_slug text)
RETURNS TABLE(area text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT area, count(*)::bigint AS total
  FROM (
    SELECT "Área" AS area FROM public."BIBLIOTECA-ESTUDOS" WHERE _slug = 'estudos' AND "Área" IS NOT NULL
    UNION ALL
    SELECT area FROM public."BIBLIOTECA-FORA-DA-TOGA" WHERE _slug = 'fora-da-toga' AND area IS NOT NULL
    UNION ALL
    SELECT area FROM public."BIBLIOTECA-CLASSICOS" WHERE _slug = 'classicos' AND area IS NOT NULL
    UNION ALL
    SELECT area FROM public."BIBLIOTECA-ORATORIA" WHERE _slug = 'oratoria' AND area IS NOT NULL
    UNION ALL
    SELECT area FROM public."BIBLIOTECA-LIDERANÇA" WHERE _slug = 'lideranca' AND area IS NOT NULL
    UNION ALL
    SELECT area FROM public."BIBLIOTECA-POLITICA" WHERE _slug = 'politica' AND area IS NOT NULL
  ) a
  GROUP BY area
  ORDER BY area;
$$;
