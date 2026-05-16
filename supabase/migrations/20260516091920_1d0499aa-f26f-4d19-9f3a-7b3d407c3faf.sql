
-- 1. Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Função has_role (SECURITY DEFINER, evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 4. Policies user_roles
CREATE POLICY "Usuários veem o próprio papel" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins gerenciam papéis" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Seed do admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('e7261bf5-7fe6-4666-aacc-ea890c073a98', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. Tabela simulados
CREATE TABLE public.simulados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prova_numero INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  total_questoes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'gerando' CHECK (status IN ('gerando','pronto','erro')),
  erro_msg TEXT,
  gerado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.simulados ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_simulados_prova ON public.simulados(prova_numero);

CREATE POLICY "Autenticados leem simulados" ON public.simulados
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins inserem simulados" ON public.simulados
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins atualizam simulados" ON public.simulados
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins removem simulados" ON public.simulados
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. Tabela simulado_questoes
CREATE TABLE public.simulado_questoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulado_id UUID NOT NULL REFERENCES public.simulados(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  enunciado TEXT NOT NULL,
  materia TEXT,
  alternativas JSONB NOT NULL,
  resposta_correta TEXT NOT NULL CHECK (resposta_correta IN ('A','B','C','D')),
  justificativa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (simulado_id, numero)
);
ALTER TABLE public.simulado_questoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_questoes_simulado ON public.simulado_questoes(simulado_id);

CREATE POLICY "Autenticados leem questões" ON public.simulado_questoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam questões" ON public.simulado_questoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. Tabela simulado_tentativas
CREATE TABLE public.simulado_tentativas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  simulado_id UUID NOT NULL REFERENCES public.simulados(id) ON DELETE CASCADE,
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em TIMESTAMPTZ,
  respostas JSONB NOT NULL DEFAULT '{}'::jsonb,
  acertos INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  por_materia JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.simulado_tentativas ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tentativas_user ON public.simulado_tentativas(user_id);
CREATE INDEX idx_tentativas_simulado ON public.simulado_tentativas(simulado_id);

CREATE POLICY "Usuários veem próprias tentativas" ON public.simulado_tentativas
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuários criam próprias tentativas" ON public.simulado_tentativas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários atualizam próprias tentativas" ON public.simulado_tentativas
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 9. Triggers updated_at
CREATE TRIGGER trg_simulados_updated BEFORE UPDATE ON public.simulados
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_tentativas_updated BEFORE UPDATE ON public.simulado_tentativas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
