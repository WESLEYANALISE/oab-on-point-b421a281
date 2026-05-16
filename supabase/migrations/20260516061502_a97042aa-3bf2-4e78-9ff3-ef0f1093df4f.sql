
-- Restringir listagem do bucket avatars: leitura individual por path continua pública,
-- mas listagem do bucket inteiro deixa de ser permitida.
DROP POLICY IF EXISTS "Avatares são públicos" ON storage.objects;
CREATE POLICY "Avatares têm leitura por path"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Revogar EXECUTE público nas funções SECURITY DEFINER novas
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
