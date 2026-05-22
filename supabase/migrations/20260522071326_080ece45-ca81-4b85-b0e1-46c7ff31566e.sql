
-- Permitir novos tipos
ALTER TABLE public.aulas_interativas_arquivos_drive
  DROP CONSTRAINT IF EXISTS aulas_interativas_arquivos_drive_tipo_check;
ALTER TABLE public.aulas_interativas_arquivos_drive
  ADD CONSTRAINT aulas_interativas_arquivos_drive_tipo_check
  CHECK (tipo IN ('material','mapa','cronograma','bonus'));

-- 1) Cronogramas (pasta CRONOGRAMAS + PLANO DE ESTUDO)
UPDATE public.aulas_interativas_arquivos_drive
SET tipo='cronograma', subpasta='Cronogramas',
    nome_arquivo='Cronograma 30 dias — Início 17/11/2025.pdf'
WHERE nome_arquivo='Cronograma 30 dias  OBJETIVO  Início em 17.11.2025.pdf';

UPDATE public.aulas_interativas_arquivos_drive
SET tipo='cronograma', subpasta='Cronogramas',
    nome_arquivo='Cronograma 45 dias — Início 03/11/2025.pdf'
WHERE nome_arquivo='Cronograma 45 dias _ OBJETIVO _ Início em 03.11.2025.pdf';

UPDATE public.aulas_interativas_arquivos_drive
SET tipo='cronograma', subpasta='Cronogramas',
    nome_arquivo='Cronograma 60 dias — Início 20/10/2025.pdf'
WHERE nome_arquivo='Cronograma 60 dias _ OBJETIVO _ Início em 20.10.2025.pdf';

UPDATE public.aulas_interativas_arquivos_drive
SET tipo='cronograma', subpasta='Cronogramas',
    nome_arquivo='Cronograma 60 dias — Início 20/10/2025 (Padrão).pdf'
WHERE nome_arquivo='Cronograma 60 dias - OBJETIVO - Início em 20.10.2025 (Padrão).pdf';

UPDATE public.aulas_interativas_arquivos_drive
SET tipo='cronograma', subpasta='Cronogramas',
    nome_arquivo='Cronograma 100 dias — OAB 41º (CEISC gratuito).pdf'
WHERE nome_arquivo='CRONOGRAMA100 DIAS 1º Fase OAB 41º CEISC GRATUITO.pdf';

UPDATE public.aulas_interativas_arquivos_drive
SET tipo='cronograma', subpasta='Cronogramas',
    nome_arquivo='Plano de Estudos 2025.pdf'
WHERE nome_arquivo='PLANO DE ESTUDOS 2025 (3).pdf';

-- 2) Bônus (BÔNUS + MENTORIAS + MARCADORES DE PÁGINA)
UPDATE public.aulas_interativas_arquivos_drive
SET tipo='bonus', subpasta='Bônus',
    nome_arquivo='Bônus — Aprovação na 1ª Fase da OAB em 30 dias.pdf'
WHERE nome_arquivo='552318712-Aprovacao-Na-1-Fase-Da-OAB-Em-30-Dias.pdf';

UPDATE public.aulas_interativas_arquivos_drive
SET tipo='bonus', subpasta='Bônus',
    nome_arquivo='Bônus — E-book Mentorias (45º Exame).pdf'
WHERE nome_arquivo='E-book Mentorias _ 45º Exame.pdf';

UPDATE public.aulas_interativas_arquivos_drive
SET tipo='bonus', subpasta='Bônus',
    nome_arquivo='Bônus — Marcadores de Página 2025.pdf'
WHERE nome_arquivo='marcadores de página 2025.pdf';

-- 3) Normalizar subpastas das matérias (mantém tipo material/mapa existente)
UPDATE public.aulas_interativas_arquivos_drive SET subpasta='Direito Administrativo' WHERE subpasta='DIREITO ADM';
UPDATE public.aulas_interativas_arquivos_drive SET subpasta='Direito Ambiental' WHERE subpasta='DIREITO AMBIENTAL';
UPDATE public.aulas_interativas_arquivos_drive SET subpasta='Direito Civil' WHERE subpasta='DIREITO CIVIL';
UPDATE public.aulas_interativas_arquivos_drive SET subpasta='Direito Constitucional' WHERE subpasta='DIREITO CONSTITUCIONAL';
UPDATE public.aulas_interativas_arquivos_drive SET subpasta='Direito da Criança e do Adolescente' WHERE subpasta='DIREITO DA CRIANÇA';
UPDATE public.aulas_interativas_arquivos_drive SET subpasta='Direito do Consumidor' WHERE subpasta='DIREITO DO CONSUMIDOR';
UPDATE public.aulas_interativas_arquivos_drive SET subpasta='Direito do Trabalho' WHERE subpasta='DIREITO DO TRABALHO';
UPDATE public.aulas_interativas_arquivos_drive SET subpasta='Direito Eleitoral' WHERE subpasta='DIREITO ELEITORAL';
UPDATE public.aulas_interativas_arquivos_drive SET subpasta='Direito Empresarial' WHERE subpasta='DIREITO EMPRESARIAL';
UPDATE public.aulas_interativas_arquivos_drive SET subpasta='Direito Financeiro' WHERE subpasta='DIREITO FINANCEIRO';
UPDATE public.aulas_interativas_arquivos_drive SET subpasta='Direito Internacional' WHERE subpasta='DIREITO INTERNACIONAL';
UPDATE public.aulas_interativas_arquivos_drive SET subpasta='Direito Penal' WHERE subpasta='DIREITO PENAL';
UPDATE public.aulas_interativas_arquivos_drive SET subpasta='Direito Previdenciário' WHERE subpasta='DIREITO PREVIDENCIARIO';
UPDATE public.aulas_interativas_arquivos_drive SET subpasta='Direito Tributário' WHERE subpasta='DIREITO TRIBUTARIO';
UPDATE public.aulas_interativas_arquivos_drive SET subpasta='Direitos Humanos' WHERE subpasta='DIREITOS HUMANOS';
UPDATE public.aulas_interativas_arquivos_drive SET subpasta='Filosofia do Direito' WHERE subpasta='FILOSOFIA DO DIREITO';

-- 4) Renomear nome_arquivo das matérias para padrão "Material — X" / "Mapas Mentais — X"
UPDATE public.aulas_interativas_arquivos_drive
SET nome_arquivo = 'Material — ' || subpasta || '.pdf'
WHERE tipo='material' AND subpasta LIKE 'Direito%' OR subpasta IN ('Direitos Humanos','Filosofia do Direito');

UPDATE public.aulas_interativas_arquivos_drive
SET nome_arquivo = 'Mapas Mentais — ' || subpasta || '.pdf'
WHERE tipo='mapa';
