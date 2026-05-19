
-- 1) aulas_progresso
CREATE TABLE public.aulas_progresso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subtema_slug text NOT NULL,
  passo_atual int NOT NULL DEFAULT 1,
  passos_concluidos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, subtema_slug)
);
CREATE INDEX idx_aulas_progresso_user ON public.aulas_progresso(user_id);
ALTER TABLE public.aulas_progresso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprio progresso de aulas"
  ON public.aulas_progresso FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Usuários inserem próprio progresso de aulas"
  ON public.aulas_progresso FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários atualizam próprio progresso de aulas"
  ON public.aulas_progresso FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_aulas_progresso_updated
  BEFORE UPDATE ON public.aulas_progresso
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) aulas_questoes_geradas
CREATE TABLE public.aulas_questoes_geradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subtema_slug text NOT NULL,
  materia text,
  tipo text NOT NULL DEFAULT 'rodada',  -- 'rodada' | 'simulado'
  enunciado text NOT NULL,
  alternativas jsonb NOT NULL,           -- [{letra:'A', texto:'...'}, ...]
  resposta_correta text NOT NULL,        -- 'A' | 'B' | 'C' | 'D'
  justificativa text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_aulas_qg_subtema ON public.aulas_questoes_geradas(subtema_slug, tipo);
ALTER TABLE public.aulas_questoes_geradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de questões geradas"
  ON public.aulas_questoes_geradas FOR SELECT TO public USING (true);
CREATE POLICY "Admins gerenciam questões geradas"
  ON public.aulas_questoes_geradas FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- 3) aulas_tentativas
CREATE TABLE public.aulas_tentativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subtema_slug text NOT NULL,
  passo text NOT NULL,  -- 'rodada1' | 'rodada2' | 'simulado'
  respostas jsonb NOT NULL DEFAULT '[]'::jsonb,
  acertos int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 0,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_aulas_tentativas_user ON public.aulas_tentativas(user_id, subtema_slug);
ALTER TABLE public.aulas_tentativas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprias tentativas de aulas"
  ON public.aulas_tentativas FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Usuários inserem próprias tentativas de aulas"
  ON public.aulas_tentativas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários atualizam próprias tentativas de aulas"
  ON public.aulas_tentativas FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_aulas_tentativas_updated
  BEFORE UPDATE ON public.aulas_tentativas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4) erros_questao: vínculo opcional com subtema da aula
ALTER TABLE public.erros_questao
  ADD COLUMN IF NOT EXISTS aula_subtema_slug text;
CREATE INDEX IF NOT EXISTS idx_erros_questao_aula_subtema
  ON public.erros_questao(aula_subtema_slug);
