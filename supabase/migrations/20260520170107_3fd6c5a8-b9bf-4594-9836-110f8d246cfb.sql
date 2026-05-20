
-- Colunas para rastrear alterações por artigo
ALTER TABLE public.vade_mecum_artigos
  ADD COLUMN IF NOT EXISTS ult_alteracao_em date,
  ADD COLUMN IF NOT EXISTS alteracoes jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS revogado boolean NOT NULL DEFAULT false;

-- Tabela de relatórios de sincronização
CREATE TABLE IF NOT EXISTS public.vade_mecum_sync_relatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lei_id uuid NOT NULL,
  fonte_url text NOT NULL,
  executado_em timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'ok',
  total_planalto integer NOT NULL DEFAULT 0,
  total_banco integer NOT NULL DEFAULT 0,
  novos jsonb NOT NULL DEFAULT '[]'::jsonb,
  alterados jsonb NOT NULL DEFAULT '[]'::jsonb,
  revogados jsonb NOT NULL DEFAULT '[]'::jsonb,
  resumo_md text,
  erro_msg text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vade_mecum_sync_relatorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins veem relatórios sync"
  ON public.vade_mecum_sync_relatorios
  FOR SELECT TO authenticated
  USING (private.has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins inserem relatórios sync"
  ON public.vade_mecum_sync_relatorios
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_sync_relatorios_lei_data
  ON public.vade_mecum_sync_relatorios (lei_id, executado_em DESC);
