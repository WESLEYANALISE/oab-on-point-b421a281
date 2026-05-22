CREATE TABLE IF NOT EXISTS public.oab_metas (
  user_id uuid PRIMARY KEY,
  data_prova date,
  meta_semanal_questoes integer NOT NULL DEFAULT 100,
  meta_semanal_minutos integer NOT NULL DEFAULT 300,
  meta_semanal_aulas integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oab_metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem suas metas"
  ON public.oab_metas FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Usuários inserem suas metas"
  ON public.oab_metas FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Usuários atualizam suas metas"
  ON public.oab_metas FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE TRIGGER oab_metas_touch_updated_at
  BEFORE UPDATE ON public.oab_metas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();