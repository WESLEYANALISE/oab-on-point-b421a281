
CREATE TABLE IF NOT EXISTS public.livros_favoritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  livro_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug, livro_id)
);

CREATE INDEX IF NOT EXISTS idx_livros_favoritos_user_slug
  ON public.livros_favoritos(user_id, slug);

ALTER TABLE public.livros_favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprios favoritos"
  ON public.livros_favoritos FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários criam próprios favoritos"
  ON public.livros_favoritos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários removem próprios favoritos"
  ON public.livros_favoritos FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
