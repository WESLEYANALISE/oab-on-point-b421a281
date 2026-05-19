# Plano de melhoria geral do OAB na Risca

Diagnóstico rápido após varredura do código:

- **Bundle gordo**: `framer-motion` (~50kb), `recharts`, `jspdf`, `embla-carousel`, todos os `@radix-ui/*` (>25 pacotes) carregados sem code-splitting estratégico. `lucide-react` importado solto em vários pontos (ok com tree-shake, mas precisa garantir).
- **Rota gigante**: `_app.vade-mecum.estatutos.$slug.tsx` com **2.104 linhas e 25 `useState`** num único arquivo — playlist, narração, anotações, foco, chat, tudo junto. Re-render pesado a cada play/pause do áudio.
- **Imagens**: `<img>` puro em capas de biblioteca, avatares e cards — sem `loading="lazy"`, sem `width/height` (CLS), sem `fetchpriority` no LCP, sem WebP/AVIF.
- **Queries**: já há TanStack Query com `staleTime` 5min global (bom), mas várias rotas usam `supabase.from(...)` direto no client em vez de `createServerFn` + `ensureQueryData` no loader (perde SSR e prefetch).
- **Animações**: existem keyframes bonitos (shimmer, sheen, pulse), mas faltam **transições de rota** consistentes, skeletons unificados, e micro-interações nos toques (mobile-first).
- **Mobile UX**: viewport 390x844 é alvo principal, mas faltam `active:scale`, `:active` feedback nos cards, safe areas em mais locais, e `BottomNav` só aparece em `/app` (poderia ser persistente nas rotas principais).
- **Arquitetura**: `_app.vade-mecum.estatutos.$slug.tsx` precisa quebrar em 5-6 componentes. Mistura de lógica de dados, UI e estado de player no mesmo arquivo.

---

## Fase única — execução em um ciclo

### 1. Performance de bundle e carregamento

- **Code-split agressivo nas rotas pesadas**: usar `.lazy.tsx` para `_app.vade-mecum.estatutos.$slug`, `_app.simulados.$slug.praticar`, `_app.admin.*`, `_app.resumos.capitulo.*`. Loader/`validateSearch` ficam no arquivo crítico, componente no lazy.
- **Lazy import de libs pesadas**: `jspdf`, `recharts`, `framer-motion` (onde for opcional) via `React.lazy` ou `import()` dinâmico só nos pontos que usam. Hoje `framer-motion` está em 4 arquivos — manter só onde compensa, trocar restante por CSS `@keyframes` (já temos vários).
- **Prefetch inteligente**: `defaultPreload: "intent"` + `defaultPreloadDelay: 0` já está. Adicionar `defaultPreloadStaleTime: 0` para deixar Query mandar.
- **Imagens**:
  - Adicionar `loading="lazy"`, `decoding="async"`, `width`/`height` explícitos em todas as `<img>` (capas de biblioteca, blog, avatares).
  - LCP de cada rota com `fetchpriority="high"` + preload via `head()` da rota.
  - Componente `<SmartImage>` central que aplica isso e fallback de skeleton.
- **Queries → loaders**: migrar `supabase.from(...)` espalhado para `createServerFn` + `ensureQueryData` nos loaders das rotas mais visitadas (`vade-mecum`, `materias`, `noticias`, `blog`). Ganho real de SSR + 0ms de skeleton.
- **React 19**: ativar `useTransition` nas trocas de filtro/aba pesadas (tabs do vade-mecum, filtros de biblioteca).

### 2. Animações e fluidez (intensidade 3 — equilibrado)

- **Transição de rota global**: aplicar `animate-route-fade` (já existe) no `<Outlet />` via key do pathname — fade de 180ms em toda navegação.
- **Skeletons unificados**: hoje quase tudo mostra spinner. Criar `<SkeletonCard>`, `<SkeletonRow>`, `<SkeletonArtigo>` reutilizáveis que respeitam o layout final (zero CLS).
- **Micro-interações** sem exagero:
  - Cards e botões: `active:scale-[0.98]` + `transition-transform duration-150` (feedback tátil mobile).
  - Links da `BottomNav`: ripple sutil dourado ao tocar.
  - Chips de filtro: slide horizontal suave ao trocar seleção.
  - Hover gold nos cards principais (desktop).
- **Sheet / Drawer**: animar com `vaul` (já instalado) o `PlaylistSheet` com snap points para sensação de app nativo.
- **Reduce motion**: já respeitado em `styles.css` — manter ao adicionar novas animações.

### 3. Responsividade e mobile UX

- **Touch targets**: revisar para 44x44 mínimo em chips, ícones de header, botões de áudio.
- **Safe areas**: `pb-[env(safe-area-inset-bottom)]` em todos os players fixos (já tem no `BottomNav`, falta no `PlaylistPlayer` quando fixo).
- **Header mobile**: adicionar `backdrop-blur` + sombra ao scroll (já parcial).
- **Vade-mecum**: barra de leitura (progresso do artigo) no topo durante scroll longo.
- **Gestos**: swipe horizontal entre artigos consecutivos no estatuto (usar `framer-motion` `drag="x"` só nessa tela — vale o peso).
- **Tipografia fluida**: `clamp()` nos títulos das telas principais para escalar entre 320px e 1280px sem quebra.
- **Tabela responsiva**: `markdown-body table` ganha `overflow-x-auto` wrapper.

### 4. Arquitetura e qualidade de código

- **Refatorar `_app.vade-mecum.estatutos.$slug.tsx`** (2.104 linhas → ~400):
  - `src/components/vade-mecum/NarracaoButton.tsx` (botão dourado pulsante)
  - `src/components/vade-mecum/PlaylistSheet.tsx` + `PlaylistPlayer.tsx`
  - `src/components/vade-mecum/ArtigoCard.tsx`
  - `src/components/vade-mecum/EstatutoHeader.tsx`
  - `src/hooks/use-audio-player.ts` (encapsula `cur`, `dur`, `seek`, `play`, `ended`, auto-next)
  - `src/hooks/use-narracao-queue.ts` (segmentação 1min, fila de áudios)
- **Tipagem estrita**: rodar `tsc --noEmit` e corrigir `any` implícito em hooks de áudio e supabase queries.
- **Hooks reutilizáveis**: `useDebounce`, `useIntersection` (para lazy-load de listas), `useMediaQuery` (já tem `use-mobile`, ampliar).
- **Memoização**: `React.memo` em cards de lista (PostCard, MateriaCard, NoticiaCard, ArtigoCard) + `useCallback` nos handlers passados.
- **Erros**: garantir `errorComponent` + `notFoundComponent` em todas as rotas com loader.

### 5. SEO e polish

- `head()` específico em cada rota pública (login, signup, blog/$slug, vade-mecum/$slug) com `og:title`, `og:description`, `og:image` próprios.
- JSON-LD em `blog/$slug` (Article schema) e `vade-mecum/estatutos/$slug` (LegalDocument).
- Manifest + ícones revisados para PWA-like (já tem manifest).

### 6. Verificação

- `vite build` para confirmar zero erros.
- Lighthouse mobile na home + vade-mecum (meta: Performance > 90, CLS < 0.05).
- Teste manual nas rotas principais a 390x844.

---

## Detalhes técnicos

**Arquivos a criar**:
```
src/components/vade-mecum/NarracaoButton.tsx
src/components/vade-mecum/PlaylistSheet.tsx
src/components/vade-mecum/PlaylistPlayer.tsx
src/components/vade-mecum/ArtigoCard.tsx
src/components/vade-mecum/EstatutoHeader.tsx
src/components/shared/SmartImage.tsx
src/components/shared/SkeletonCard.tsx
src/hooks/use-audio-player.ts
src/hooks/use-narracao-queue.ts
src/hooks/use-debounce.ts
src/hooks/use-intersection.ts
```

**Arquivos a modificar (principais)**:
```
src/routes/_app.vade-mecum.estatutos.$slug.tsx  (2104 → ~400 linhas)
src/routes/_app.vade-mecum.estatutos.$slug.lazy.tsx  (novo: split do componente)
src/router.tsx  (defaultPreloadStaleTime: 0)
src/routes/_app.tsx  (route fade no Outlet)
src/styles.css  (utilities mobile feedback + fluid type)
src/components/blog/PostCard.tsx, MateriaCard.tsx, NoticiaCard.tsx  (memo + SmartImage)
src/components/layout/MobileHeader.tsx  (scroll shadow)
src/routes/__root.tsx  (preconnect supabase storage + meta padrão)
```

**Estimativa**: ~25 arquivos tocados, ~12 novos, ~8 refatorados, ~5 ajustes pontuais. Tudo em uma execução conforme pedido.

**Não toco em**: lógica de IA (Gemini direto continua como na memória), schema do Supabase, autenticação, RLS, sistema de pagamentos.

Posso prosseguir e executar o plano inteiro?
