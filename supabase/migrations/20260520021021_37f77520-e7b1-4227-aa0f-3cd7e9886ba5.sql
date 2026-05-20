CREATE INDEX IF NOT EXISTS idx_vade_mecum_artigos_texto_tsv
  ON public.vade_mecum_artigos
  USING gin (to_tsvector('portuguese', coalesce(texto,'') || ' ' || coalesce(numero,'')));