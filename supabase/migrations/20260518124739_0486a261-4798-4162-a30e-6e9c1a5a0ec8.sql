UPDATE public.vade_mecum_artigos
SET narracao_url = 'https://ajbzwnzbuukwjaydfqui.supabase.co' || narracao_url
WHERE narracao_url LIKE '/storage/%';