
CREATE TABLE IF NOT EXISTS public.simulado_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prova_numero integer NOT NULL,
  simulado_id uuid,
  etapa text NOT NULL DEFAULT 'preview',
  ocr_prova text,
  ocr_gabarito text,
  total_estimado integer NOT NULL DEFAULT 0,
  materias_detectadas jsonb NOT NULL DEFAULT '[]'::jsonb,
  batch_atual integer NOT NULL DEFAULT 0,
  batches_total integer NOT NULL DEFAULT 0,
  questoes_processadas integer NOT NULL DEFAULT 0,
  logs jsonb NOT NULL DEFAULT '[]'::jsonb,
  iniciado_em timestamptz,
  concluido_em timestamptz,
  erro_msg text,
  gerado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.simulado_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam jobs"
  ON public.simulado_jobs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER simulado_jobs_updated
  BEFORE UPDATE ON public.simulado_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_simulado_jobs_prova ON public.simulado_jobs(prova_numero);
CREATE INDEX IF NOT EXISTS idx_simulado_jobs_etapa ON public.simulado_jobs(etapa);

-- Limpa o simulado órfão da prova 46
DELETE FROM public.simulado_questoes WHERE simulado_id IN (
  SELECT id FROM public.simulados WHERE prova_numero = 46 AND status = 'gerando'
);
DELETE FROM public.simulados WHERE prova_numero = 46 AND status = 'gerando';
