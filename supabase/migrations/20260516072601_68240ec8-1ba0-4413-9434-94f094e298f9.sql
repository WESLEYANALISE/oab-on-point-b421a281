-- Bucket público para PDFs das provas da OAB
INSERT INTO storage.buckets (id, name, public)
VALUES ('provas-oab', 'provas-oab', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Leitura pública dos PDFs
DROP POLICY IF EXISTS "Leitura pública provas-oab" ON storage.objects;
CREATE POLICY "Leitura pública provas-oab"
ON storage.objects FOR SELECT
USING (bucket_id = 'provas-oab');

-- Simplifica a tabela: remove 2ª fase e outros arquivos
ALTER TABLE public.provas_oab DROP COLUMN IF EXISTS provas_2fase;
ALTER TABLE public.provas_oab DROP COLUMN IF EXISTS outros_arquivos;