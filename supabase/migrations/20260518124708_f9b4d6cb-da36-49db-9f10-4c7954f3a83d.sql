-- 1) Bucket público de leitura
UPDATE storage.buckets SET public = true WHERE id = 'narracoes';

-- Policy pública de leitura no bucket narracoes (idempotente)
DROP POLICY IF EXISTS "Narracoes publicly readable" ON storage.objects;
CREATE POLICY "Narracoes publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'narracoes');

-- 2) Usuários autenticados podem ler metadados de narração
DROP POLICY IF EXISTS "Autenticados leem narracoes" ON public.vade_mecum_narracoes;
CREATE POLICY "Autenticados leem narracoes"
ON public.vade_mecum_narracoes FOR SELECT
TO authenticated
USING (true);

-- 3) Backfill: preenche narracao_url nos artigos que já têm narração
UPDATE public.vade_mecum_artigos a
SET narracao_url = concat(
  current_setting('app.settings.supabase_url', true),
  '/storage/v1/object/public/narracoes/',
  n.audio_path
)
FROM public.vade_mecum_narracoes n
WHERE n.artigo_id = a.id
  AND a.narracao_url IS DISTINCT FROM concat(
    current_setting('app.settings.supabase_url', true),
    '/storage/v1/object/public/narracoes/',
    n.audio_path
  );