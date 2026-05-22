INSERT INTO public.aulas_interativas_arquivos_drive
  (nome_arquivo, subpasta, tipo, storage_bucket, storage_path, pdf_url, bytes, status_ingestao)
VALUES
  ('Material — Ética.pdf', 'Ética Profissional', 'material', 'aulas-interativas-pdfs',
   'drive-import/etica/material-etica-exame-45.pdf',
   'https://ajbzwnzbuukwjaydfqui.supabase.co/storage/v1/object/public/aulas-interativas-pdfs/drive-import/etica/material-etica-exame-45.pdf',
   2015503, 'pendente'),
  ('Mapas Mentais — Ética.pdf', 'Ética Profissional', 'mapa', 'aulas-interativas-mapas',
   'drive-import/etica/mapas-mentais-etica-exame-45.pdf',
   'https://ajbzwnzbuukwjaydfqui.supabase.co/storage/v1/object/public/aulas-interativas-mapas/drive-import/etica/mapas-mentais-etica-exame-45.pdf',
   1338414, 'pendente');