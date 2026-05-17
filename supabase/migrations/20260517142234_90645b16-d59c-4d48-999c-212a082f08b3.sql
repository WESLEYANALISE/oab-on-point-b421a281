
-- Caderno de erros: registra cada questão errada para revisão dirigida
CREATE TABLE public.erros_questao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  questao_id uuid NOT NULL,
  simulado_id uuid NOT NULL,
  tentativa_id uuid NOT NULL,
  numero integer NOT NULL,
  materia text,
  alternativa_marcada text,
  resposta_correta text NOT NULL,
  flashcard_id uuid,
  revisado_em timestamptz,
  tentativa_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.erros_questao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam próprios erros"
  ON public.erros_questao FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_erros_user_data ON public.erros_questao (user_id, tentativa_em DESC);
CREATE INDEX idx_erros_user_materia ON public.erros_questao (user_id, materia);
CREATE UNIQUE INDEX idx_erros_user_tentativa_questao ON public.erros_questao (user_id, tentativa_id, questao_id);
