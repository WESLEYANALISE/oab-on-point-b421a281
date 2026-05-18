
CREATE TABLE IF NOT EXISTS public.vade_mecum_pratica_tentativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  artigo_id uuid NOT NULL,
  lei_id uuid NOT NULL,
  modo text NOT NULL CHECK (modo IN ('questoes','flashcards')),
  acertos integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  respostas jsonb NOT NULL DEFAULT '[]'::jsonb,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vade_mecum_pratica_tentativas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprias tentativas pratica"
  ON public.vade_mecum_pratica_tentativas FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Usuários criam próprias tentativas pratica"
  ON public.vade_mecum_pratica_tentativas FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários atualizam próprias tentativas pratica"
  ON public.vade_mecum_pratica_tentativas FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pratica_user_artigo
  ON public.vade_mecum_pratica_tentativas (user_id, artigo_id, concluido_em DESC);

CREATE INDEX IF NOT EXISTS idx_pratica_user_concluido
  ON public.vade_mecum_pratica_tentativas (user_id, concluido_em DESC);

CREATE TRIGGER trg_pratica_updated_at
  BEFORE UPDATE ON public.vade_mecum_pratica_tentativas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
