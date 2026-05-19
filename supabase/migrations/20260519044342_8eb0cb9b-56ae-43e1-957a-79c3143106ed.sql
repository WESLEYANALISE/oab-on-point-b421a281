CREATE TABLE public.aula_capitulo_simulado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resumo_livro_id uuid NOT NULL,
  ordem integer NOT NULL,
  questoes jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resumo_livro_id, ordem)
);
ALTER TABLE public.aula_capitulo_simulado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Simulado é legível para autenticados"
ON public.aula_capitulo_simulado FOR SELECT TO authenticated USING (true);