ALTER TABLE public.simulado_questoes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS nota_oficial text;

ALTER TABLE public.simulado_questoes
  ALTER COLUMN resposta_correta DROP NOT NULL;

ALTER TABLE public.simulado_questoes
  DROP CONSTRAINT IF EXISTS simulado_questoes_status_check;

ALTER TABLE public.simulado_questoes
  ADD CONSTRAINT simulado_questoes_status_check
  CHECK (status IN ('ok','anulada','falhou_extracao'));