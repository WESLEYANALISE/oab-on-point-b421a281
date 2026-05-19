
-- Cache de flashcards gerados por IA, por capítulo de resumo
CREATE TABLE IF NOT EXISTS public.aula_capitulo_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resumo_livro_id uuid NOT NULL,
  ordem integer NOT NULL,
  cards jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resumo_livro_id, ordem)
);
ALTER TABLE public.aula_capitulo_flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública flashcards capítulo" ON public.aula_capitulo_flashcards
  FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam flashcards capítulo" ON public.aula_capitulo_flashcards
  FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));

-- Cache de questões geradas por IA, por capítulo
CREATE TABLE IF NOT EXISTS public.aula_capitulo_questoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resumo_livro_id uuid NOT NULL,
  ordem integer NOT NULL,
  questoes jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resumo_livro_id, ordem)
);
ALTER TABLE public.aula_capitulo_questoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública questões capítulo" ON public.aula_capitulo_questoes
  FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam questões capítulo" ON public.aula_capitulo_questoes
  FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));

-- Respostas do usuário (alimenta o Caderno de Erros)
CREATE TABLE IF NOT EXISTS public.aula_capitulo_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resumo_livro_id uuid NOT NULL,
  ordem integer NOT NULL,
  questao_idx integer NOT NULL,
  alternativa_escolhida text NOT NULL,
  alternativa_correta text NOT NULL,
  acertou boolean NOT NULL,
  enunciado_snapshot text NOT NULL,
  alternativas_snapshot jsonb NOT NULL,
  justificativa_snapshot text,
  materia text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aula_resp_user_idx ON public.aula_capitulo_respostas(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS aula_resp_user_err_idx ON public.aula_capitulo_respostas(user_id) WHERE acertou = false;
ALTER TABLE public.aula_capitulo_respostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários gerenciam próprias respostas aula" ON public.aula_capitulo_respostas
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
