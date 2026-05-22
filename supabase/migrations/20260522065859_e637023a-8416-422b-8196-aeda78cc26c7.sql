-- Tabela de arquivos importados do Drive
CREATE TABLE public.aulas_interativas_arquivos_drive (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_arquivo TEXT NOT NULL,
  subpasta TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL CHECK (tipo IN ('material', 'mapa')),
  storage_bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  bytes BIGINT NOT NULL DEFAULT 0,
  aula_sugerida_slug TEXT,
  curso_id UUID,
  aula_id UUID,
  status_ingestao TEXT NOT NULL DEFAULT 'pendente' CHECK (status_ingestao IN ('pendente','em_andamento','concluida','erro','ignorado')),
  erro_msg TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (storage_bucket, storage_path)
);

ALTER TABLE public.aulas_interativas_arquivos_drive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública arquivos drive"
  ON public.aulas_interativas_arquivos_drive FOR SELECT
  USING (true);

CREATE POLICY "Admins inserem arquivos drive"
  ON public.aulas_interativas_arquivos_drive FOR INSERT TO authenticated
  WITH CHECK (private.has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins atualizam arquivos drive"
  ON public.aulas_interativas_arquivos_drive FOR UPDATE TO authenticated
  USING (private.has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (private.has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins removem arquivos drive"
  ON public.aulas_interativas_arquivos_drive FOR DELETE TO authenticated
  USING (private.has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE TRIGGER trg_arquivos_drive_updated_at
  BEFORE UPDATE ON public.aulas_interativas_arquivos_drive
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_arquivos_drive_tipo_status ON public.aulas_interativas_arquivos_drive (tipo, status_ingestao);
CREATE INDEX idx_arquivos_drive_subpasta ON public.aulas_interativas_arquivos_drive (subpasta);

-- Bucket para mapas mentais
INSERT INTO storage.buckets (id, name, public)
VALUES ('aulas-interativas-mapas', 'aulas-interativas-mapas', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Mapas mentais leitura pública"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'aulas-interativas-mapas');

CREATE POLICY "Admins fazem upload de mapas mentais"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'aulas-interativas-mapas' AND private.has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins atualizam mapas mentais"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'aulas-interativas-mapas' AND private.has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins removem mapas mentais"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'aulas-interativas-mapas' AND private.has_role((SELECT auth.uid()), 'admin'::app_role));