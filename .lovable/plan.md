
# Auditoria de Performance — Rota a Rota + Plano de Fixes

Stack confirmada: TanStack Start + React 19, react-query v5 com `PersistQueryClientProvider` (localStorage), Supabase (não Firebase). Já existe boa base: `defaultPreload: "intent"`, `defaultPreloadDelay: 0`, persistência por whitelist, 24h cache, skip de `TOKEN_REFRESHED`. Os gargalos são pontuais e bem identificáveis.

## 1. Diagnóstico — o que está pesando

### 1.1 Vade Mecum / Estatutos (`_app.vade-mecum.estatutos.$slug.tsx`, 1622 linhas)
- **Maior ofensor de payload do app inteiro.** Tabela `vade_mecum_artigos` tem 20.840 linhas / 21 MB; a query baixa até **2000 artigos por estatuto** com `texto` completo numa única call (Código Civil tem ~2046 artigos). É download de megabytes em 3G + parse JSON + render de listão de 2000 itens.
- Arquivo único de 1622 linhas mistura página, overlays, painéis derivados e lógica de árvore. Re-renderiza tudo a cada `setQuery`, `setAba`, `setArtigoId`.
- 3 useQuery encadeadas (estatuto → favoritos → anotações) dependentes do `userId`; o `userId` vem de `supabase.auth.getUser()` no `useEffect` (não do `useAuth`), atrasando os dois últimos por +1 RTT.
- Sem virtualização da lista de artigos — render direto de 2k DOM nodes.
- 8 `useMemo` mas sem `React.memo` nos itens da lista; toda digitação no campo de busca re-renderiza todos os artigos.

### 1.2 React-Query — bom no router, fraco nos consumidores
- `router.tsx` ok. `__root.tsx` tem persist + whitelist por prefixo ✓.
- **Mas nenhuma rota usa `loader` com `queryClient.ensureQueryData`**. Loaders existem só em 11 arquivos, e nenhum hidrata o cache do React-Query. Resultado: o preload do TanStack Router (intent) faz o componente montar antes da query começar → na prática o "preload" só economiza o bundle, não a query.
- `staleTime` está bem definido (vade-mecum 1h, biblioteca 30min etc.), mas algumas rotas têm múltiplas `useQuery` que poderiam virar uma única RPC.

### 1.3 Simulados (`_app.simulados.$slug.index.tsx` 855 linhas, `simulados.functions.ts` 715)
- 5+ queries separadas: simulado, questões, tentativa em andamento, contagem, lista de tentativas anteriores. Cada uma é um round-trip Supabase. Dá pra colapsar em 1 RPC `get_simulado_overview(simulado_id, user_id)`.
- `simulado_questoes` ordenado por `numero` mas índice é `(simulado_id, numero)` único — ok.
- `simulado_tentativas.respostas jsonb` é carregado inteiro toda vez que se calcula progresso, mesmo quando só precisa do `count`. 

### 1.4 Biblioteca (`_app.biblioteca.$slug.index.tsx`)
- Usa as RPCs `get_biblioteca_books` / `get_biblioteca_areas_counts` — ok. Mas o RPC faz `UNION ALL` em 6 tabelas mesmo quando o slug é uma só → planejador é eficiente, mas a função poderia fazer dispatch por slug. Ganho marginal.
- 6 tabelas `BIBLIOTECA-*` com schema repetido é dívida de modelo (impacta admin, agregações, manutenção).

### 1.5 Resumos / Capítulos
- `resumos.capitulo.$livroId.$ordem.tsx` carrega `conteudo_markdown` inteiro de cada capítulo. ✓ tem `prefetchQuery` do próximo capítulo (achei `prefetchQuery` em vários arquivos) — bom.
- `resumo_capitulos.imagens jsonb` e `conteudo_markdown` text podem chegar a centenas de KB. Sem `staleTime` agressivo no capítulo individual (1h ✓).

### 1.6 Bundle e lazy-loading
- Só **3 rotas** usam `lazy(() => import())`. `framer-motion`, `recharts`, `react-markdown` + `remark-gfm`, `jspdf`, `embla-carousel`, `vaul`, `cmdk`, `react-day-picker`, `react-resizable-panels`, `input-otp`, 20+ `@radix-ui/*` entram no bundle principal de quem não usa.
- `jspdf` (PDF) e `recharts` (gráficos) provavelmente são usados em <5 rotas mas vão no bundle base.
- `lucide-react` import nominal está ok (tree-shake), mas o arquivo vade-mecum importa **35 ícones de uma vez** num componente que renderiza só uma fração de cada vez.

### 1.7 Imagens
- 0 `<img loading="lazy">` em todo o `src` (15 arquivos com img, 2 com `loading=`). Capas de livros, brasão, avatars carregam eagerly. Em mobile 4G isso é metade do LCP.
- Capas vêm do Supabase Storage sem `?width=` / transform. Mesma capa em listagem (thumb) e detalhe (hero) é a mesma imagem.

### 1.8 Auth / Onboarding
- `useAuth` busca sessão + roda useQuery em paralelo, ok. Mas `__root.tsx` tem `AuthCacheBridge` que invalida com `predicate` complexo a cada SIGNED_IN — funcional mas re-roda a função pra cada query.
- `supabase.auth.getUser()` é chamado em vários componentes em vez de consumir do `useAuth` (vade-mecum, anotações). Cada chamada é 1 request potencial pra `/auth/v1/user` se o token não estiver fresco.

### 1.9 Banco / RLS
- Índices: boa cobertura (`flashcards`, `tentativas`, `artigos`). Faltam algumas combinações usadas:
  - `vade_mecum_artigos (lei_id, ordem)` ✓ existe.
  - `blog_posts (slug)` ✓ unique key.
- RLS está limpo, sem padrões recursivos. `has_role` está `STABLE SECURITY DEFINER` ✓.
- `vade_mecum_artigos` 21 MB. Vale considerar **coluna gerada** para `texto_lower tsvector` se quiser busca server-side (hoje busca é client-side, daí o motivo de baixar 2k linhas).
- Não há materialized views nem cache server-side de listagens públicas (estatuto inteiro).

### 1.10 SSR / Edge
- `__root.tsx` faz preconnect pro Supabase ✓, preconnect Google Fonts ✓.
- Manifest + favicon.svg ✓.
- Falta `<link rel="preload">` pras fontes auto-hospedadas (estão no Google Fonts CDN, ok mas custo de DNS+TLS+1 RTT em cold start).

---

## 2. Plano de fixes priorizado

Ordem por impacto/esforço. Cada item é independente; podemos parar em qualquer ponto.

### TIER 1 — ganhos grandes, mexida cirúrgica

**1.1 Vade Mecum: paginar listagem + virtualizar**
- Trocar `select(... texto ...).limit(2000)` por 2 queries:
  - `select id, numero, ordem, relevancia` (todos, leve, ~200 KB)
  - `select id, texto` lazy por janela visível (virtualização) ou só ao abrir o artigo.
- Adicionar `react-virtuoso` (ou simples virtualization manual) na lista.
- **Resultado esperado:** payload inicial 2-3 MB → 150-250 KB; TTI cai >50% em mobile.

**1.2 RPC `get_estatuto_overview(slug, user_id)`**
- Uma única chamada retorna: dados da lei + lista enxuta de artigos + ids favoritos + ids anotados. Cortar 3 RTTs em 1.
- Server-side a função filtra por `lei_id` + faz LEFT JOIN nos favoritos/anotações do usuário.

**1.3 Hidratar React-Query no `loader`**
- Padronizar nas rotas pesadas (vade-mecum, simulados, biblioteca, resumos):
  ```ts
  loader: ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(estatutoQueryOptions(params.slug))
  ```
- `defaultPreload: "intent"` + `ensureQueryData` = dados começam a baixar no hover/toque, não na montagem.
- **Cuidado:** loader é isomórfico; queries que dependem de `userId` ficam fora do loader (component-only).

**1.4 Lazy-load de libs pesadas**
- `recharts`, `jspdf`, `react-day-picker`, `embla-carousel`, `react-markdown` (no painel de chat) — `lazy(() => import(...))` nas rotas que usam.
- `framer-motion`: já é usado em muitos lugares, manter; mas trocar imports `motion` por `m` + `LazyMotion` no root reduz ~20 KB.

**1.5 Imagens com `loading="lazy"` + `decoding="async"` + `width/height`**
- Pass global em listas de capas (biblioteca, blog, resumos).
- Para Supabase Storage, usar query string de transformação: `?width=160&quality=70` em thumbs.
- Define width/height explícito → mata CLS e melhora INP.

### TIER 2 — ganhos médios

**2.1 Simulados: 1 RPC `get_simulado_overview`**
- Colapsa 5 queries em 1. Devolve simulado + total_questoes + tentativa em andamento (id + concluido_em + count de respostas, sem `respostas` inteiro) + última tentativa concluída.

**2.2 Consumir `useAuth().userId` em todo lugar**
- Remover `supabase.auth.getUser()` espalhado em componentes (vade-mecum, AnotacoesPanel, PraticarPanel). Uma fonte de verdade.

**2.3 Quebrar `_app.vade-mecum.estatutos.$slug.tsx` (1622 linhas) em sub-componentes memoizados**
- `<ArtigoListItem>` com `React.memo` + comparador raso. Digitação na busca para de re-renderizar 2000 nodes.
- Sub-arquivos: `EstatutoHeader`, `EstatutoChips`, `EstatutoLista`, `EstatutoArvore`.

**2.4 Persist cache: incluir mais prefixos seguros**
- Adicionar `["vade-mecum","favoritos"]` e `["vade-mecum","anotacoes-ids"]` (são pequenos, melhoram o "instantâneo" entre sessões). Continuar excluindo `pratica-questoes` (jsonb grande).

**2.5 Índices faltantes**
- `vade_mecum_anotacoes (artigo_id)` simples — usado em joins futuros.
- `blog_posts (publicado, publicado_em DESC)` ✓ já existe.
- `simulado_tentativas (user_id, simulado_id, concluido_em DESC) WHERE concluido_em IS NOT NULL` — partial index para "última tentativa concluída".

### TIER 3 — ganhos menores / qualidade de vida

**3.1 Self-host das 2 fontes (Plus Jakarta Sans, Inter)** com `preload` — corta DNS+TLS do Google Fonts no LCP.
**3.2 `LazyMotion` + `domAnimation` do framer** no root.
**3.3 Limpar índice duplicado** `idx_blog_posts_categoria` + `idx_blog_posts_pub_data` + `idx_blog_posts_publicado_em` (dois últimos são o mesmo) — dropar 1.
**3.4 Materialized view** `mv_biblioteca_books_unified` que pré-faz o UNION das 6 tabelas, com `REFRESH` por trigger. Tira o UNION em runtime.
**3.5 Service worker / PWA** — manifest já existe; ativar SW pra cachear assets estáticos e HTML.

---

## 3. Migrations propostas

```sql
-- 1) RPC consolidada do estatuto
create or replace function public.get_estatuto_overview(_slug text, _user_id uuid default null)
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'lei', to_jsonb(l.*),
    'artigos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'numero', a.numero, 'ordem', a.ordem,
        'relevancia', a.relevancia, 'relevancia_nota', a.relevancia_nota
      ) order by a.ordem)
      from vade_mecum_artigos a where a.lei_id = l.id
    ), '[]'::jsonb),
    'favoritos', coalesce((
      select jsonb_agg(f.artigo_id) from vade_mecum_favoritos f
      where f.lei_id = l.id and f.user_id = _user_id
    ), '[]'::jsonb),
    'anotados', coalesce((
      select jsonb_agg(distinct n.artigo_id) from vade_mecum_anotacoes n
      where n.lei_id = l.id and n.user_id = _user_id
    ), '[]'::jsonb)
  ) from vade_mecum_leis l where l.slug = _slug;
$$;

-- 2) Endpoint pra texto de um artigo (lazy)
create or replace function public.get_artigo_full(_id uuid)
returns vade_mecum_artigos language sql stable as $$
  select * from vade_mecum_artigos where id = _id;
$$;

-- 3) Limpar índices duplicados
drop index if exists public.idx_blog_posts_pub_data;

-- 4) Partial index pra "tentativa em andamento"
create index if not exists idx_tentativas_user_em_andamento
  on public.simulado_tentativas (user_id, simulado_id, iniciado_em desc)
  where concluido_em is null;

-- 5) Index pra anotações por artigo
create index if not exists idx_vmec_anot_artigo on public.vade_mecum_anotacoes (artigo_id);
```

---

## 4. Ordem de execução sugerida

1. **Migrations** (1 commit): RPC `get_estatuto_overview`, `get_artigo_full`, índices.
2. **Vade Mecum**: trocar a query gorda pela RPC, lazy-fetch do texto ao abrir, virtualização.
3. **Lazy-load** de recharts/jspdf/day-picker nas rotas que usam.
4. **Imagens** `loading="lazy"` + `width/height` globais.
5. **`ensureQueryData` em loaders** das rotas pesadas.
6. **Simulados**: RPC consolidada + ajuste do componente.
7. **Refator** do arquivo vade-mecum em sub-componentes memoizados.
8. **TIER 3** conforme tempo.

Esperado ao final do Tier 1+2: tempo até interagir na vade-mecum/estatutos cair de ~3-5 s pra <800 ms em 4G, bundle inicial -200 a -350 KB gzip, menos jank na digitação de busca.

Quer que eu comece pelo Tier 1 (migrations + vade-mecum + lazy-load + imagens)? Ou prefere atacar uma área específica primeiro (ex: só simulados, só bundle)?
