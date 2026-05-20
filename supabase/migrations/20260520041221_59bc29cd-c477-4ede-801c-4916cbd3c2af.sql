
-- =====================================================================
-- Otimização RLS: envolver auth.uid()/has_role em (select ...) e
-- eliminar policies permissivas duplicadas em SELECT.
-- Sem alteração de regras de acesso.
-- =====================================================================

-- ---------- profiles ----------
DROP POLICY IF EXISTS "Usuários veem o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários veem o próprio perfil" ON public.profiles
  FOR SELECT USING ((select auth.uid()) = id);
DROP POLICY IF EXISTS "Usuários atualizam o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários atualizam o próprio perfil" ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id);

-- ---------- user_roles ----------
DROP POLICY IF EXISTS "Usuários veem o próprio papel" ON public.user_roles;
CREATE POLICY "Usuários veem o próprio papel" ON public.user_roles
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Admins gerenciam papéis" ON public.user_roles;
CREATE POLICY "Admins inserem papéis" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins atualizam papéis" ON public.user_roles
  FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins removem papéis" ON public.user_roles
  FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

-- ---------- simulado_tentativas ----------
DROP POLICY IF EXISTS "Usuários veem próprias tentativas" ON public.simulado_tentativas;
CREATE POLICY "Usuários veem próprias tentativas" ON public.simulado_tentativas
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Usuários criam próprias tentativas" ON public.simulado_tentativas;
CREATE POLICY "Usuários criam próprias tentativas" ON public.simulado_tentativas
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Usuários atualizam próprias tentativas" ON public.simulado_tentativas;
CREATE POLICY "Usuários atualizam próprias tentativas" ON public.simulado_tentativas
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

-- ---------- blog_posts ----------
DROP POLICY IF EXISTS "Admins leem todos os posts" ON public.blog_posts; -- duplicado com leitura pública
DROP POLICY IF EXISTS "Admins inserem posts" ON public.blog_posts;
CREATE POLICY "Admins inserem posts" ON public.blog_posts
  FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins atualizam posts" ON public.blog_posts;
CREATE POLICY "Admins atualizam posts" ON public.blog_posts
  FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins removem posts" ON public.blog_posts;
CREATE POLICY "Admins removem posts" ON public.blog_posts
  FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

-- ---------- resumo_livros ----------
DROP POLICY IF EXISTS "Admins gerenciam resumo_livros" ON public.resumo_livros;
CREATE POLICY "Admins inserem resumo_livros" ON public.resumo_livros
  FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins atualizam resumo_livros" ON public.resumo_livros
  FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins removem resumo_livros" ON public.resumo_livros
  FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

-- ---------- resumo_capitulos ----------
DROP POLICY IF EXISTS "Admins gerenciam resumo_capitulos" ON public.resumo_capitulos;
CREATE POLICY "Admins inserem resumo_capitulos" ON public.resumo_capitulos
  FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins atualizam resumo_capitulos" ON public.resumo_capitulos
  FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins removem resumo_capitulos" ON public.resumo_capitulos
  FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

-- ---------- simulados ----------
DROP POLICY IF EXISTS "Admins inserem simulados" ON public.simulados;
CREATE POLICY "Admins inserem simulados" ON public.simulados
  FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins atualizam simulados" ON public.simulados;
CREATE POLICY "Admins atualizam simulados" ON public.simulados
  FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins removem simulados" ON public.simulados;
CREATE POLICY "Admins removem simulados" ON public.simulados
  FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

-- ---------- simulado_questoes ----------
DROP POLICY IF EXISTS "Admins gerenciam questões" ON public.simulado_questoes;
CREATE POLICY "Admins inserem questões" ON public.simulado_questoes
  FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins atualizam questões" ON public.simulado_questoes
  FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins removem questões" ON public.simulado_questoes
  FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

-- ---------- simulado_jobs (sem duplicidade, só wrap) ----------
DROP POLICY IF EXISTS "Admins gerenciam jobs" ON public.simulado_jobs;
CREATE POLICY "Admins gerenciam jobs" ON public.simulado_jobs
  FOR ALL TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));

-- ---------- BIBLIOTECA-* (6 tabelas) ----------
DROP POLICY IF EXISTS "Admins gerenciam biblioteca" ON public."BIBLIOTECA-ESTUDOS";
CREATE POLICY "Admins inserem biblioteca" ON public."BIBLIOTECA-ESTUDOS" FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins atualizam biblioteca" ON public."BIBLIOTECA-ESTUDOS" FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins removem biblioteca" ON public."BIBLIOTECA-ESTUDOS" FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins gerenciam biblioteca" ON public."BIBLIOTECA-CLASSICOS";
CREATE POLICY "Admins inserem biblioteca" ON public."BIBLIOTECA-CLASSICOS" FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins atualizam biblioteca" ON public."BIBLIOTECA-CLASSICOS" FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins removem biblioteca" ON public."BIBLIOTECA-CLASSICOS" FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins gerenciam biblioteca" ON public."BIBLIOTECA-ORATORIA";
CREATE POLICY "Admins inserem biblioteca" ON public."BIBLIOTECA-ORATORIA" FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins atualizam biblioteca" ON public."BIBLIOTECA-ORATORIA" FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins removem biblioteca" ON public."BIBLIOTECA-ORATORIA" FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins gerenciam biblioteca" ON public."BIBLIOTECA-LIDERANÇA";
CREATE POLICY "Admins inserem biblioteca" ON public."BIBLIOTECA-LIDERANÇA" FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins atualizam biblioteca" ON public."BIBLIOTECA-LIDERANÇA" FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins removem biblioteca" ON public."BIBLIOTECA-LIDERANÇA" FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins gerenciam biblioteca" ON public."BIBLIOTECA-POLITICA";
CREATE POLICY "Admins inserem biblioteca" ON public."BIBLIOTECA-POLITICA" FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins atualizam biblioteca" ON public."BIBLIOTECA-POLITICA" FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins removem biblioteca" ON public."BIBLIOTECA-POLITICA" FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins gerenciam biblioteca" ON public."BIBLIOTECA-FORA-DA-TOGA";
CREATE POLICY "Admins inserem biblioteca" ON public."BIBLIOTECA-FORA-DA-TOGA" FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins atualizam biblioteca" ON public."BIBLIOTECA-FORA-DA-TOGA" FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins removem biblioteca" ON public."BIBLIOTECA-FORA-DA-TOGA" FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

-- ---------- aula_capitulo_aulas ----------
DROP POLICY IF EXISTS "Admins gerenciam aula capítulo" ON public.aula_capitulo_aulas;
CREATE POLICY "Admins inserem aula capítulo" ON public.aula_capitulo_aulas FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins atualizam aula capítulo" ON public.aula_capitulo_aulas FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins removem aula capítulo" ON public.aula_capitulo_aulas FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

-- ---------- aula_capitulo_flashcards ----------
DROP POLICY IF EXISTS "Admins gerenciam flashcards capítulo" ON public.aula_capitulo_flashcards;
CREATE POLICY "Admins inserem flashcards capítulo" ON public.aula_capitulo_flashcards FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins atualizam flashcards capítulo" ON public.aula_capitulo_flashcards FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins removem flashcards capítulo" ON public.aula_capitulo_flashcards FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

-- ---------- aula_capitulo_questoes ----------
DROP POLICY IF EXISTS "Admins gerenciam questões capítulo" ON public.aula_capitulo_questoes;
CREATE POLICY "Admins inserem questões capítulo" ON public.aula_capitulo_questoes FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins atualizam questões capítulo" ON public.aula_capitulo_questoes FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins removem questões capítulo" ON public.aula_capitulo_questoes FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

-- ---------- aula_capitulo_respostas ----------
DROP POLICY IF EXISTS "Usuários gerenciam próprias respostas aula" ON public.aula_capitulo_respostas;
CREATE POLICY "Usuários gerenciam próprias respostas aula" ON public.aula_capitulo_respostas
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- ---------- aulas_progresso ----------
DROP POLICY IF EXISTS "Usuários veem próprio progresso de aulas" ON public.aulas_progresso;
CREATE POLICY "Usuários veem próprio progresso de aulas" ON public.aulas_progresso
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Usuários inserem próprio progresso de aulas" ON public.aulas_progresso;
CREATE POLICY "Usuários inserem próprio progresso de aulas" ON public.aulas_progresso
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Usuários atualizam próprio progresso de aulas" ON public.aulas_progresso;
CREATE POLICY "Usuários atualizam próprio progresso de aulas" ON public.aulas_progresso
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

-- ---------- aulas_questoes_geradas ----------
DROP POLICY IF EXISTS "Admins gerenciam questões geradas" ON public.aulas_questoes_geradas;
CREATE POLICY "Admins inserem questões geradas" ON public.aulas_questoes_geradas FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins atualizam questões geradas" ON public.aulas_questoes_geradas FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins removem questões geradas" ON public.aulas_questoes_geradas FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

-- ---------- aulas_tentativas ----------
DROP POLICY IF EXISTS "Usuários veem próprias tentativas de aulas" ON public.aulas_tentativas;
CREATE POLICY "Usuários veem próprias tentativas de aulas" ON public.aulas_tentativas
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Usuários inserem próprias tentativas de aulas" ON public.aulas_tentativas;
CREATE POLICY "Usuários inserem próprias tentativas de aulas" ON public.aulas_tentativas
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Usuários atualizam próprias tentativas de aulas" ON public.aulas_tentativas;
CREATE POLICY "Usuários atualizam próprias tentativas de aulas" ON public.aulas_tentativas
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

-- ---------- erros_questao ----------
DROP POLICY IF EXISTS "Usuários gerenciam próprios erros" ON public.erros_questao;
CREATE POLICY "Usuários gerenciam próprios erros" ON public.erros_questao
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- ---------- flashcard_revisoes ----------
DROP POLICY IF EXISTS "Usuários veem próprias revisões" ON public.flashcard_revisoes;
CREATE POLICY "Usuários veem próprias revisões" ON public.flashcard_revisoes
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Usuários inserem próprias revisões" ON public.flashcard_revisoes;
CREATE POLICY "Usuários inserem próprias revisões" ON public.flashcard_revisoes
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- ---------- flashcards ----------
DROP POLICY IF EXISTS "Usuários gerenciam próprios flashcards" ON public.flashcards;
CREATE POLICY "Usuários gerenciam próprios flashcards" ON public.flashcards
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- ---------- livros_favoritos ----------
DROP POLICY IF EXISTS "Usuários veem próprios favoritos" ON public.livros_favoritos;
CREATE POLICY "Usuários veem próprios favoritos" ON public.livros_favoritos
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Usuários criam próprios favoritos" ON public.livros_favoritos;
CREATE POLICY "Usuários criam próprios favoritos" ON public.livros_favoritos
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Usuários removem próprios favoritos" ON public.livros_favoritos;
CREATE POLICY "Usuários removem próprios favoritos" ON public.livros_favoritos
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ---------- vade_mecum_anotacoes ----------
DROP POLICY IF EXISTS "Usuários veem próprias anotações" ON public.vade_mecum_anotacoes;
CREATE POLICY "Usuários veem próprias anotações" ON public.vade_mecum_anotacoes
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Usuários inserem próprias anotações" ON public.vade_mecum_anotacoes;
CREATE POLICY "Usuários inserem próprias anotações" ON public.vade_mecum_anotacoes
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Usuários atualizam próprias anotações" ON public.vade_mecum_anotacoes;
CREATE POLICY "Usuários atualizam próprias anotações" ON public.vade_mecum_anotacoes
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Usuários removem próprias anotações" ON public.vade_mecum_anotacoes;
CREATE POLICY "Usuários removem próprias anotações" ON public.vade_mecum_anotacoes
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ---------- vade_mecum_artigos ----------
DROP POLICY IF EXISTS "Admins gerenciam artigos" ON public.vade_mecum_artigos;
CREATE POLICY "Admins inserem artigos" ON public.vade_mecum_artigos FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins atualizam artigos" ON public.vade_mecum_artigos FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins removem artigos" ON public.vade_mecum_artigos FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

-- ---------- vade_mecum_favoritos ----------
DROP POLICY IF EXISTS "Usuários veem próprios favoritos de artigo" ON public.vade_mecum_favoritos;
CREATE POLICY "Usuários veem próprios favoritos de artigo" ON public.vade_mecum_favoritos
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Usuários inserem próprios favoritos de artigo" ON public.vade_mecum_favoritos;
CREATE POLICY "Usuários inserem próprios favoritos de artigo" ON public.vade_mecum_favoritos
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Usuários removem próprios favoritos de artigo" ON public.vade_mecum_favoritos;
CREATE POLICY "Usuários removem próprios favoritos de artigo" ON public.vade_mecum_favoritos
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ---------- vade_mecum_leis ----------
DROP POLICY IF EXISTS "Admins gerenciam leis" ON public.vade_mecum_leis;
CREATE POLICY "Admins inserem leis" ON public.vade_mecum_leis FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins atualizam leis" ON public.vade_mecum_leis FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins removem leis" ON public.vade_mecum_leis FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

-- ---------- vade_mecum_narracoes ----------
DROP POLICY IF EXISTS "Admins gerenciam narracoes" ON public.vade_mecum_narracoes;
CREATE POLICY "Admins inserem narracoes" ON public.vade_mecum_narracoes FOR INSERT TO authenticated WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins atualizam narracoes" ON public.vade_mecum_narracoes FOR UPDATE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins removem narracoes" ON public.vade_mecum_narracoes FOR DELETE TO authenticated USING (private.has_role((select auth.uid()), 'admin'::app_role));

-- ---------- vade_mecum_pratica_tentativas ----------
DROP POLICY IF EXISTS "Usuários veem próprias tentativas pratica" ON public.vade_mecum_pratica_tentativas;
CREATE POLICY "Usuários veem próprias tentativas pratica" ON public.vade_mecum_pratica_tentativas
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Usuários criam próprias tentativas pratica" ON public.vade_mecum_pratica_tentativas;
CREATE POLICY "Usuários criam próprias tentativas pratica" ON public.vade_mecum_pratica_tentativas
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Usuários atualizam próprias tentativas pratica" ON public.vade_mecum_pratica_tentativas;
CREATE POLICY "Usuários atualizam próprias tentativas pratica" ON public.vade_mecum_pratica_tentativas
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
