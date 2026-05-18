
-- Vade Mecum: estrutura consolidada
CREATE TABLE public.vade_mecum_leis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  nome_curto text,
  categoria text NOT NULL CHECK (categoria IN ('codigo','estatuto','lei','sumula')),
  ordem integer NOT NULL DEFAULT 0,
  total_artigos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vade_mecum_leis_categoria ON public.vade_mecum_leis(categoria, ordem);

CREATE TABLE public.vade_mecum_artigos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lei_id uuid NOT NULL REFERENCES public.vade_mecum_leis(id) ON DELETE CASCADE,
  numero text,
  texto text NOT NULL,
  narracao_url text,
  comentario text,
  aula text,
  explicacao_tecnico text,
  explicacao_resumido text,
  explicacao_simples_menor16 text,
  explicacao_simples_maior16 text,
  exemplo text,
  termos jsonb,
  termos_aprofundados jsonb DEFAULT '{}'::jsonb,
  flashcards jsonb,
  questoes jsonb,
  data_aprovacao text,
  ordem integer NOT NULL DEFAULT 0,
  source_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vade_mecum_artigos_lei ON public.vade_mecum_artigos(lei_id, ordem);
CREATE INDEX idx_vade_mecum_artigos_numero ON public.vade_mecum_artigos(lei_id, numero);

ALTER TABLE public.vade_mecum_leis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vade_mecum_artigos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública leis" ON public.vade_mecum_leis FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam leis" ON public.vade_mecum_leis FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Leitura pública artigos" ON public.vade_mecum_artigos FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam artigos" ON public.vade_mecum_artigos FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_vade_mecum_leis_updated BEFORE UPDATE ON public.vade_mecum_leis
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_vade_mecum_artigos_updated BEFORE UPDATE ON public.vade_mecum_artigos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
