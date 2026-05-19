CREATE TABLE public.aula_capitulo_aulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resumo_livro_id uuid NOT NULL,
  ordem integer NOT NULL,
  aula jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resumo_livro_id, ordem)
);

ALTER TABLE public.aula_capitulo_aulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública aula capítulo"
ON public.aula_capitulo_aulas FOR SELECT TO public USING (true);

CREATE POLICY "Admins gerenciam aula capítulo"
ON public.aula_capitulo_aulas FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));