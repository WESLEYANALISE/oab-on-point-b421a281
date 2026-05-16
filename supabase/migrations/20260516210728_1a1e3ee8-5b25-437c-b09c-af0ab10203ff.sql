
-- Tabela principal: 1 linha por livro
CREATE TABLE public.resumo_livros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biblioteca_slug text NOT NULL,
  livro_id bigint NOT NULL,
  titulo text NOT NULL,
  autor text,
  capa text,
  area text,
  pdf_url text,
  status text NOT NULL DEFAULT 'sem_previa',
  previa jsonb NOT NULL DEFAULT '[]'::jsonb,
  ocr_texto text,
  ocr_paginas jsonb,
  total_capitulos integer NOT NULL DEFAULT 0,
  capitulos_gerados integer NOT NULL DEFAULT 0,
  erro_msg text,
  gerado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (biblioteca_slug, livro_id)
);

ALTER TABLE public.resumo_livros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de resumos"
  ON public.resumo_livros FOR SELECT
  USING (true);

CREATE POLICY "Admins gerenciam resumo_livros"
  ON public.resumo_livros FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_resumo_livros_slug_status ON public.resumo_livros (biblioteca_slug, status);

CREATE TRIGGER trg_resumo_livros_updated_at
  BEFORE UPDATE ON public.resumo_livros
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Capítulos gerados
CREATE TABLE public.resumo_capitulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resumo_livro_id uuid NOT NULL REFERENCES public.resumo_livros(id) ON DELETE CASCADE,
  ordem integer NOT NULL,
  titulo text NOT NULL,
  slug text NOT NULL,
  conteudo_markdown text,
  imagens jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pendente',
  erro_msg text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resumo_livro_id, ordem)
);

ALTER TABLE public.resumo_capitulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de capítulos"
  ON public.resumo_capitulos FOR SELECT
  USING (true);

CREATE POLICY "Admins gerenciam resumo_capitulos"
  ON public.resumo_capitulos FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_resumo_capitulos_livro ON public.resumo_capitulos (resumo_livro_id, ordem);

CREATE TRIGGER trg_resumo_capitulos_updated_at
  BEFORE UPDATE ON public.resumo_capitulos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Bucket público para imagens extraídas
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumos-imagens', 'resumos-imagens', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Leitura pública resumos-imagens"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resumos-imagens');

CREATE POLICY "Admins fazem upload em resumos-imagens"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resumos-imagens' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins atualizam resumos-imagens"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'resumos-imagens' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins removem resumos-imagens"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'resumos-imagens' AND has_role(auth.uid(), 'admin'::app_role));
