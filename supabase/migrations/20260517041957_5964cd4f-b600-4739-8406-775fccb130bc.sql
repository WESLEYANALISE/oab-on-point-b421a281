
-- ============ Índices ============
CREATE INDEX IF NOT EXISTS idx_blog_posts_pub_data
  ON public.blog_posts (publicado, publicado_em DESC);

CREATE INDEX IF NOT EXISTS idx_tentativas_user_sim_concl
  ON public.simulado_tentativas (user_id, simulado_id, concluido_em);

CREATE INDEX IF NOT EXISTS idx_tentativas_user_concl_desc
  ON public.simulado_tentativas (user_id, concluido_em DESC);

-- ============ RPC: contagem de categorias do blog ============
CREATE OR REPLACE FUNCTION public.get_blog_categorias_counts()
RETURNS TABLE(categoria text, total bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT categoria, count(*)::bigint AS total
  FROM public.blog_posts
  WHERE publicado = true
  GROUP BY categoria
  ORDER BY total DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_blog_categorias_counts() TO anon, authenticated;

-- ============ Restringir SECURITY DEFINER expostas ============
-- Essas funções só são chamadas pelo backend (service-role). Não precisam
-- estar disponíveis para anon/authenticated.
REVOKE EXECUTE ON FUNCTION public.get_biblioteca_counts()           FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_biblioteca_areas(text)        FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_biblioteca_areas_counts(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_biblioteca_book(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_biblioteca_books(text, text, integer, integer)               FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_biblioteca_books(text, text, integer, integer, text)         FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.int_to_roman(integer)             FROM anon, authenticated;

-- ============ Políticas admin para BIBLIOTECA-* ============
-- Admin pode gerenciar todo o conteúdo das tabelas da biblioteca (leitura
-- pública já existia).

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'BIBLIOTECA-ESTUDOS',
    'BIBLIOTECA-CLASSICOS',
    'BIBLIOTECA-ORATORIA',
    'BIBLIOTECA-LIDERANÇA',
    'BIBLIOTECA-POLITICA',
    'BIBLIOTECA-FORA-DA-TOGA'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "Admins gerenciam biblioteca" ON public.%I',
      t
    );
    EXECUTE format(
      'CREATE POLICY "Admins gerenciam biblioteca" ON public.%I
         FOR ALL TO authenticated
         USING (public.has_role(auth.uid(), ''admin''::app_role))
         WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role))',
      t
    );
  END LOOP;
END$$;

-- ============ Storage: bloquear LIST nos buckets públicos ============
-- A política antiga "Leitura pública" permitia SELECT amplo, que cobre
-- também o list. Substituímos por uma política que só responde a buscas
-- por arquivo individual (name IS NOT NULL e em bucket público).
-- O acesso via URL pública continua funcionando porque Storage usa o
-- service-role internamente para servir o arquivo.

DO $$
DECLARE
  b text;
  buckets text[] := ARRAY['avatars', 'blog-capas', 'provas-oab', 'resumos-imagens', 'resumos-pdfs'];
BEGIN
  FOREACH b IN ARRAY buckets LOOP
    -- limpa políticas conhecidas que liberavam SELECT amplo
    EXECUTE format(
      'DROP POLICY IF EXISTS "%s public read" ON storage.objects',
      b
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "Public read %s" ON storage.objects',
      b
    );
  END LOOP;
END$$;

-- Remove políticas residuais de SELECT amplo nos buckets públicos
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Blog capas publicas" ON storage.objects;
DROP POLICY IF EXISTS "Provas publicas" ON storage.objects;
DROP POLICY IF EXISTS "Resumos imagens publicas" ON storage.objects;
DROP POLICY IF EXISTS "Resumos pdfs publicos" ON storage.objects;
