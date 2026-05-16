ALTER TABLE public.simulados ADD COLUMN IF NOT EXISTS ano integer;

UPDATE public.simulados s
SET ano = p.ano
FROM public.provas_oab p
WHERE s.prova_numero = p.numero AND s.ano IS NULL;