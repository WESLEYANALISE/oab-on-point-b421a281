
-- Relevância em artigos
ALTER TABLE public.vade_mecum_artigos
  ADD COLUMN IF NOT EXISTS relevancia text
    CHECK (relevancia IN ('muito_alta','alta','media')),
  ADD COLUMN IF NOT EXISTS relevancia_nota text,
  ADD COLUMN IF NOT EXISTS relevancia_fontes jsonb;

CREATE INDEX IF NOT EXISTS idx_artigos_relevancia
  ON public.vade_mecum_artigos (lei_id, relevancia)
  WHERE relevancia IS NOT NULL;

-- Favoritos de artigos
CREATE TABLE IF NOT EXISTS public.vade_mecum_favoritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  artigo_id uuid NOT NULL REFERENCES public.vade_mecum_artigos(id) ON DELETE CASCADE,
  lei_id uuid NOT NULL REFERENCES public.vade_mecum_leis(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, artigo_id)
);

ALTER TABLE public.vade_mecum_favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprios favoritos de artigo"
  ON public.vade_mecum_favoritos FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Usuários inserem próprios favoritos de artigo"
  ON public.vade_mecum_favoritos FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários removem próprios favoritos de artigo"
  ON public.vade_mecum_favoritos FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_favoritos_user_lei
  ON public.vade_mecum_favoritos (user_id, lei_id);
