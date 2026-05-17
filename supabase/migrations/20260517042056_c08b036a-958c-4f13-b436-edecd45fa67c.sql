
-- Remove SELECT/INSERT/UPDATE amplas nos buckets públicos.
-- Acesso por URL pública continua funcionando porque o bucket está marcado como public=true
-- (Storage serve o arquivo individual pelo CDN sem consultar RLS).
DROP POLICY IF EXISTS "Capas blog leitura pública"        ON storage.objects;
DROP POLICY IF EXISTS "Leitura pública resumos-imagens"   ON storage.objects;
DROP POLICY IF EXISTS "Service writes resumos-pdfs"       ON storage.objects;
DROP POLICY IF EXISTS "Service updates resumos-pdfs"      ON storage.objects;

-- Função interna não precisa ser executável por anon/authenticated
REVOKE EXECUTE ON FUNCTION public.get_biblioteca_areas_counts(text) FROM anon, authenticated;
