CREATE TABLE public.vade_mecum_anotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lei_id uuid NOT NULL,
  artigo_id uuid NOT NULL,
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, artigo_id)
);
ALTER TABLE public.vade_mecum_anotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprias anotações" ON public.vade_mecum_anotacoes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuários inserem próprias anotações" ON public.vade_mecum_anotacoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários atualizam próprias anotações" ON public.vade_mecum_anotacoes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários removem próprias anotações" ON public.vade_mecum_anotacoes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_vmec_anot_upd BEFORE UPDATE ON public.vade_mecum_anotacoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_vmec_anot_user_lei ON public.vade_mecum_anotacoes(user_id, lei_id);