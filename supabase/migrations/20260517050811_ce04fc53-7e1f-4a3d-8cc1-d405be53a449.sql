-- Move role checks used by RLS into a non-exposed schema to avoid exposing a SECURITY DEFINER function through the public API.
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Keep the old public function unavailable through the API.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- user_roles policies
DROP POLICY IF EXISTS "Admins gerenciam papéis" ON public.user_roles;
CREATE POLICY "Admins gerenciam papéis"
ON public.user_roles
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- blog_posts policies
DROP POLICY IF EXISTS "Admins leem todos os posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins inserem posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins atualizam posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins removem posts" ON public.blog_posts;
CREATE POLICY "Admins leem todos os posts" ON public.blog_posts
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins inserem posts" ON public.blog_posts
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins atualizam posts" ON public.blog_posts
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins removem posts" ON public.blog_posts
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- resumo policies
DROP POLICY IF EXISTS "Admins gerenciam resumo_livros" ON public.resumo_livros;
CREATE POLICY "Admins gerenciam resumo_livros" ON public.resumo_livros
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins gerenciam resumo_capitulos" ON public.resumo_capitulos;
CREATE POLICY "Admins gerenciam resumo_capitulos" ON public.resumo_capitulos
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- simulados policies
DROP POLICY IF EXISTS "Admins inserem simulados" ON public.simulados;
DROP POLICY IF EXISTS "Admins atualizam simulados" ON public.simulados;
DROP POLICY IF EXISTS "Admins removem simulados" ON public.simulados;
CREATE POLICY "Admins inserem simulados" ON public.simulados
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins atualizam simulados" ON public.simulados
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins removem simulados" ON public.simulados
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins gerenciam questões" ON public.simulado_questoes;
CREATE POLICY "Admins gerenciam questões" ON public.simulado_questoes
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins gerenciam jobs" ON public.simulado_jobs;
CREATE POLICY "Admins gerenciam jobs" ON public.simulado_jobs
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- biblioteca policies
DROP POLICY IF EXISTS "Admins gerenciam biblioteca" ON public."BIBLIOTECA-ESTUDOS";
CREATE POLICY "Admins gerenciam biblioteca" ON public."BIBLIOTECA-ESTUDOS"
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins gerenciam biblioteca" ON public."BIBLIOTECA-CLASSICOS";
CREATE POLICY "Admins gerenciam biblioteca" ON public."BIBLIOTECA-CLASSICOS"
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins gerenciam biblioteca" ON public."BIBLIOTECA-ORATORIA";
CREATE POLICY "Admins gerenciam biblioteca" ON public."BIBLIOTECA-ORATORIA"
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins gerenciam biblioteca" ON public."BIBLIOTECA-LIDERANÇA";
CREATE POLICY "Admins gerenciam biblioteca" ON public."BIBLIOTECA-LIDERANÇA"
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins gerenciam biblioteca" ON public."BIBLIOTECA-POLITICA";
CREATE POLICY "Admins gerenciam biblioteca" ON public."BIBLIOTECA-POLITICA"
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins gerenciam biblioteca" ON public."BIBLIOTECA-FORA-DA-TOGA";
CREATE POLICY "Admins gerenciam biblioteca" ON public."BIBLIOTECA-FORA-DA-TOGA"
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));