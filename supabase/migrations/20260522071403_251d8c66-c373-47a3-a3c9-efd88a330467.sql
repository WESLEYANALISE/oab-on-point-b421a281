
UPDATE public.aulas_interativas_arquivos_drive
SET tipo='cronograma', subpasta='Cronogramas',
    nome_arquivo='Cronograma 30 dias — Início 17/11/2025.pdf'
WHERE tipo='material' AND subpasta='CRONOGRAMAS' AND nome_arquivo ILIKE 'Cronograma 30 dias%';
