## O que o auditor está dizendo

O linter do Supabase encontrou **73 avisos**, todos da categoria **PERFORMANCE** (nenhum problema de segurança). São dois tipos:

### 1. `auth_rls_initplan` — 55 avisos
As políticas RLS chamam `auth.uid()` / `auth.role()` diretamente. O Postgres re-executa essa função **uma vez para cada linha** verificada. Em tabelas grandes (vade_mecum_artigos, blog_posts, etc.) isso fica lento.

**Correção:** envolver em subquery — `(select auth.uid())` — para o Postgres avaliar **uma vez por query** e reutilizar o resultado. Mesma semântica, mesma segurança, muito mais rápido em escala.

### 2. `multiple_permissive_policies` — 18 avisos
Várias tabelas têm **duas políticas permissivas** para SELECT no mesmo papel (`authenticated`): uma de "Leitura pública" + uma de "Admins gerenciam tudo". O Postgres precisa avaliar as duas em cada linha, mesmo que a pública já libere tudo.

**Correção:** como admin já é coberto pela leitura pública no SELECT, basta **restringir a policy de admin para INSERT/UPDATE/DELETE** (em vez de ALL), eliminando a sobreposição em SELECT.

---

## Plano

Uma única migration SQL que reescreve as policies afetadas. Sem mudanças no código frontend/backend — o comportamento (quem pode ler/escrever o quê) fica idêntico.

### Etapa 1 — Reescrever 55 policies para usar `(select auth.<fn>())`

Tabelas afetadas: `profiles`, `user_roles`, `simulado_tentativas`, `simulados`, `simulado_questoes`, `simulado_jobs`, `blog_posts`, `resumo_livros`, `resumo_capitulos`, `vade_mecum_leis`, `vade_mecum_artigos`, `vade_mecum_narracoes`, `vade_mecum_favoritos`, `vade_mecum_anotacoes`, `aula_capitulo_aulas`, `aula_capitulo_flashcards`, `aula_capitulo_questoes`, `aulas_questoes_geradas`, todas as `BIBLIOTECA-*`.

Padrão da reescrita:
```sql
-- antes
USING (auth.uid() = user_id)
-- depois
USING ((select auth.uid()) = user_id)

-- antes
USING (has_role(auth.uid(), 'admin'))
-- depois
USING (has_role((select auth.uid()), 'admin'))
```

### Etapa 2 — Eliminar policies permissivas duplicadas em SELECT

Para cada uma das 18 tabelas com duplicidade, trocar a policy `Admins gerenciam X` (que usa `FOR ALL`) por **três policies separadas** restritas a `INSERT`, `UPDATE` e `DELETE`. Assim a "Leitura pública" continua sendo a única policy de SELECT.

```sql
-- antes (cobre SELECT também → duplicidade)
CREATE POLICY "Admins gerenciam X" ON public.X
  FOR ALL USING (has_role((select auth.uid()),'admin'));

-- depois (não cobre mais SELECT)
CREATE POLICY "Admins inserem X"   ON public.X FOR INSERT WITH CHECK (has_role((select auth.uid()),'admin'));
CREATE POLICY "Admins atualizam X" ON public.X FOR UPDATE USING     (has_role((select auth.uid()),'admin'));
CREATE POLICY "Admins removem X"   ON public.X FOR DELETE USING     (has_role((select auth.uid()),'admin'));
```

### Etapa 3 — Rodar o linter de novo
Esperado: zero avisos de `auth_rls_initplan` e `multiple_permissive_policies`.

---

## Detalhes técnicos

- Nenhuma alteração de schema, dados ou regra de acesso — apenas reescrita das expressões das policies.
- Migration roda como `DROP POLICY ... ; CREATE POLICY ...` dentro de uma transação. Se algo falhar, faz rollback automático.
- O arquivo `src/integrations/supabase/types.ts` **não** muda (não há alteração de colunas).
- Não exige nada do frontend.

## Ganhos esperados

- Consultas em tabelas grandes (`vade_mecum_artigos` ~ milhares de linhas, `blog_posts`, `simulado_questoes`) ficam significativamente mais rápidas, principalmente em `SELECT` com filtros amplos.
- Menor uso de CPU no Postgres → menos chance de hit no plano gratuito do Supabase.

Se aprovar, eu gero a migration completa em build mode.