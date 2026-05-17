
# Auditoria completa — OAB na Risca

Analisei rotas, server functions, RLS, índices, linter Supabase, layout, CSS e cache. Encontrei **~30 melhorias reais**. Em vez de um PR gigante, divido em **5 fases** independentes — você aprova a fase 1 e seguimos, ou aprova tudo de uma vez.

---

## Diagnóstico — o que está bom e o que dói

**Já está bem feito:**
- TanStack Start corretamente configurado (`createServerFn`, `requireSupabaseAuth`, `attachSupabaseAuth`).
- RLS habilitado em todas as tabelas; `has_role` via `SECURITY DEFINER` correto.
- React Query + persister em localStorage funcionando.
- `defaultPreload: "intent"` ligado.
- Imagens do home com `loading=eager` + `fetchPriority=high` no LCP.

**Onde dói (priorizado):**

| # | Categoria | Problema | Impacto |
|---|-----------|----------|---------|
| 1 | Supabase | 4 buckets públicos permitem `LIST` de todos os arquivos | Segurança ALTA |
| 2 | Supabase | Senha vazada (HaveIBeenPwned) desativado no Auth | Segurança ALTA |
| 3 | Supabase | `listBlogCategorias` puxa TODOS os posts pra contar — devia ser `GROUP BY` no SQL | Perf ALTA |
| 4 | Supabase | Faltam índices compostos (`blog_posts(publicado, publicado_em)`, `simulado_tentativas(user_id, simulado_id, concluido_em)`) | Perf MED |
| 5 | Supabase | 6 funções `SECURITY DEFINER` executáveis por anon/authenticated sem necessidade | Segurança MED |
| 6 | Cache | `defaultPreloadStaleTime: 0` zera o preload-cache do router → preload roda mas refaz fetch | Perf ALTA |
| 7 | Cache | `staleTime` global de 60s é curto para listas estáticas (blog, biblioteca, provas) | Perf MED |
| 8 | Cache | Persister grava **todas** queries no localStorage, inclusive markdown de capítulos (KB grandes) | Perf MED |
| 9 | CSS | `@import url(fonts.googleapis)` bloqueia render; falta `preconnect` | LCP -200ms |
| 10 | CSS | `countdown-shimmer` roda infinito com `mix-blend-mode: screen` (repaint constante na home) | Perf MED |
| 11 | A11y | Sem `prefers-reduced-motion` em nenhum lugar | A11y |
| 12 | A11y | Botões "Buscar"/"Notificações" do header são stubs sem ação nem rota | UX |
| 13 | A11y | Sem skip-link, foco visível inconsistente | A11y |
| 14 | A11y | Contraste de `/60` e `/65` sobre bordô abaixo de WCAG AA em alguns trechos | A11y |
| 15 | Roteamento | Guard de auth e onboarding via `useEffect`+`navigate` (flicker) — deveria ser `beforeLoad` no layout | UX |
| 16 | Roteamento | `og:image` definido no root sobrescreve leaf routes (warning da própria doc TanStack) | SEO |
| 17 | Fluidez | `transition-all` em muitos cards (transiciona layout, filter, etc., não só transform) | Perf MED |
| 18 | Fluidez | PWA sem service worker → não funciona offline, sem "instalar app" decente | UX nativo |
| 19 | Mobile | Falta `touch-action: manipulation` global (delay de 300ms em alguns devices antigos é raro hoje, mas ajuda em scroll) + `overscroll-behavior` no main | Fluidez |
| 20 | Mobile | `viewport` sem `viewport-fit=cover` → safe-area-inset-bottom não aplica corretamente em iOS | Layout |
| 21 | Imagens | Capas do blog/biblioteca servidas direto do Supabase Storage sem `width=` (Supabase Image Transform) — mobile recebe imagem cheia | Perf ALTA |
| 22 | Código | `simulados-admin.functions.ts` com 1209 linhas, `_app.simulados.$slug.index.tsx` com 855 — difícil manter | DX |
| 23 | Código | `RootComponent` recria `persister` a cada render (sem `useMemo`) | Perf baixa |
| 24 | Código | `_app.index.tsx` usa `getNoticias()` síncrono local mas o resto puxa do Supabase — duas fontes | DX |
| 25 | SEO | 80% das rotas sem `head()` próprio (title, description, og:*) | SEO |
| 26 | Realtime | Sem listener `onAuthStateChange` no `__root.tsx` invalidando queries (existe no `AuthProvider` mas não invalida queries) — risco de mostrar dados do usuário anterior | Bug latente |
| 27 | A11y | `aria-current="page"` ausente nos itens ativos do sidebar/bottom-nav | A11y |
| 28 | Erros | `errorComponent` único no root — rotas com loader não têm fallback próprio | UX |
| 29 | DX | Falta um `loader` nas rotas estáticas (blog, provas, biblioteca) — tudo é client-fetched | Perf MED |
| 30 | Segurança | Tabelas `BIBLIOTECA-*` sem políticas de INSERT/UPDATE/DELETE para admin — painel admin não funciona se for criado | Bug latente |

---

## Fase 1 — Supabase: segurança + performance do banco (alto impacto, baixo risco visual)

**Migração SQL única:**

1. Criar índices compostos faltantes:
   - `blog_posts(publicado, publicado_em DESC)` (substitui os dois separados, otimiza a query da listagem).
   - `simulado_tentativas(user_id, simulado_id, concluido_em)` (otimiza a query do `getSimuladoCompleto`).
   - `simulado_tentativas(user_id, concluido_em DESC)` (histórico).
2. Criar RPC `get_blog_categorias_counts()` que faz `SELECT categoria, count(*) … GROUP BY` (substitui o aggregate no JS).
3. `REVOKE EXECUTE … FROM anon, authenticated` nas SECURITY DEFINER que não precisam ser públicas (manter só `has_role` e as `get_biblioteca_*` chamadas pelo backend via service-role).
4. Adicionar políticas RLS `INSERT/UPDATE/DELETE` para admins nas tabelas `BIBLIOTECA-*` (preparando painel admin).
5. Restringir listagem dos buckets públicos (`avatars`, `blog-capas`, `provas-oab`, `resumos-imagens`, `resumos-pdfs`): manter SELECT individual por nome, remover `LIST`.

**Código:**
- Refatorar `listBlogCategorias` pra chamar a RPC.
- Reescrever cliente Supabase do `client.ts` removendo o `Proxy` quente (ele cria custo em cada `supabase.x`) — usa lazy init via função simples.

**Setup manual no painel Supabase** (vou linkar): habilitar **Leaked Password Protection** no Auth.

---

## Fase 2 — Cache, preload e bundle (sensação de "app nativo")

1. `router.tsx`: subir `defaultPreloadStaleTime` para 30s, manter React Query como fonte de verdade.
2. `router.tsx`: `staleTime` global 5 min, `gcTime` 1h. Queries voláteis (perfil, jobs) declaram `staleTime` próprio.
3. Persister: whitelist explícita por prefixo (`blog`, `biblioteca`, `provas`, `noticias`) em vez de blacklist; ignora queries > 50 KB (capítulos).
4. `__root.tsx`: adicionar `preconnect` + `dns-prefetch` para `fonts.googleapis.com` e `fonts.gstatic.com`; mover `@import url(...)` do `styles.css` para `<link rel="stylesheet">` no `head()`.
5. `__root.tsx`: adicionar listener `onAuthStateChange` invalidando todas as queries (defesa contra leak entre usuários).
6. `_app.tsx`: trocar `useEffect` de auth/onboarding por `beforeLoad` em layout `_authenticated` — elimina o flicker.
7. Remover `og:image` do root e mover para cada rota relevante.

---

## Fase 3 — Fluidez visual + acessibilidade

1. CSS global:
   - `html { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }`
   - `body { overscroll-behavior-y: contain; }`
   - `@media (prefers-reduced-motion: reduce)` desliga `countdown-shimmer`, `chapter-sheen`, `animate-*`.
   - Foco visível padrão (`:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }`).
2. Trocar `transition-all` por `transition-[transform,background-color,border-color]` nos cards principais (atalhos, ferramentas, blog, biblioteca).
3. Adicionar `aria-current="page"` no `DesktopSidebar`/`BottomNav` ativos.
4. Skip-link "Pular para o conteúdo" no `_app.tsx`.
5. Aumentar contraste em rótulos secundários (`/60` → `/75` sobre bordô).
6. Remover botões fantasma (Buscar/Notificações no `MobileHeader`) ou ligar a rotas reais.
7. `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.

---

## Fase 4 — Imagens responsivas (alívio enorme em mobile)

1. Helper `supabaseImage(url, { w, q })` que devolve `…/storage/v1/render/image/public/<bucket>/<path>?width=W&quality=Q&resize=cover` (Supabase Image Transformations).
2. Usar nos componentes: `PostCard`, `PostRow`, `FeaturedPost`, capas de biblioteca, avatar. `srcset` para `1x/2x` em mobile.
3. Adicionar `width`/`height` em todas as `<img>` para zero CLS.

---

## Fase 5 — PWA + estrutura (opcional, alto valor)

1. `manifest.webmanifest`: ícones 192/512 + maskable, `display: standalone`, `theme_color`, `background_color`, `start_url`.
2. Service worker mínimo (Workbox via Vite plugin) com cache de imagens (`stale-while-revalidate`) e fallback offline da home.
3. Quebrar `simulados-admin.functions.ts` (1209 L) em `simulados-admin.{ocr,prompt,upload,queue}.functions.ts`.
4. Quebrar `_app.simulados.$slug.index.tsx` (855 L) em componentes (`SimuladoHeader`, `MateriasResumo`, `EstatisticasUsuario`, `ListaQuestoes`).
5. Adicionar `head()` por rota nas 40+ rotas sem SEO próprio (script gera template, ajusto manual nas principais).

---

## Como prefere prosseguir?

- **A)** Executo as 5 fases em sequência (cada fase = 1 deploy verificável).
- **B)** Foco só em **Fase 1 + 2 + 3** (segurança Supabase + cache + a11y/fluidez) — o que mais "transforma" o app.
- **C)** Faço só uma fase específica primeiro (você diz qual).

Se não responder, sigo com a opção **B**.

