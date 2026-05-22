ALTER TABLE public.aulas_interativas_arquivos_drive
  DROP CONSTRAINT IF EXISTS aulas_interativas_arquivos_drive_status_ingestao_check;

ALTER TABLE public.aulas_interativas_arquivos_drive
  ADD CONSTRAINT aulas_interativas_arquivos_drive_status_ingestao_check
  CHECK (status_ingestao IN (
    'pendente',
    'processando',
    'extraindo',
    'extraido',
    'gerando_previa',
    'previa_pronta',
    'publicando',
    'concluido',
    'erro'
  ));