
-- Tabela de posts do blog
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  titulo text NOT NULL,
  subtitulo text,
  categoria text NOT NULL DEFAULT 'Estratégia',
  tempo_leitura_min integer NOT NULL DEFAULT 5,
  capa_url text,
  resumo text NOT NULL DEFAULT '',
  conteudo_md text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  publicado boolean NOT NULL DEFAULT false,
  publicado_em timestamptz,
  autor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_posts_publicado_em ON public.blog_posts (publicado, publicado_em DESC);
CREATE INDEX idx_blog_posts_categoria ON public.blog_posts (categoria);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de posts publicados"
ON public.blog_posts FOR SELECT
USING (publicado = true);

CREATE POLICY "Admins leem todos os posts"
ON public.blog_posts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins inserem posts"
ON public.blog_posts FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins atualizam posts"
ON public.blog_posts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins removem posts"
ON public.blog_posts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Bucket público de capas
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-capas', 'blog-capas', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Capas blog leitura pública"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-capas');

CREATE POLICY "Admins gerenciam capas blog (insert)"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'blog-capas' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins gerenciam capas blog (update)"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'blog-capas' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins gerenciam capas blog (delete)"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'blog-capas' AND public.has_role(auth.uid(), 'admin'));
