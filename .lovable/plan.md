## Objetivo

Refatorar `/flashcards-tema` para parecer instantâneo e fluido:
- Sumir com o "Carregando…" em toda a jornada.
- Entrada das listas em cascata (stagger).
- Lista de áreas com ícone por matéria e cards de altura uniforme.
- Eliminar a tela intermediária de capítulos.
- Toggle "Todos / Selecionar" para escolher quais capítulos entram na pilha.
- Transição animada (slide) entre flashcards ao avançar/voltar.

## Fluxo novo

```text
Áreas (cascade)  ─►  Player de flashcards da área (Todos ou capítulos selecionados)
```

Sem o passo intermediário de "livro" e "capítulo". Dentro de cada card do player, mostra a tag do capítulo.

## Mudanças por arquivo

### `src/routes/_app.flashcards-tema.tsx`
- Adicionar `loader` na rota usando `context.queryClient.ensureQueryData` para `listarAreasFlashcardsCurados`. Trocar `useQuery` por `useSuspenseQuery` → sem flash de loading; com preload por intent, a transição vira instantânea.
- Substituir os 3 sub-views (Area/Livro/Capitulo) por dois estados:
  1. **Lista de áreas** (default).
  2. **Player da área** (quando `?area=...`). Remover params `livro` e `capitulo` do `validateSearch`; adicionar `caps` opcional (lista de IDs de capítulo selecionados).
- Remover o componente `Loading` (Loader2 + "Carregando…"). Renderizar diretamente o conteúdo via Suspense da rota (o `pendingComponent` global do router já cobre o primeiro paint).
- Lista de áreas:
  - `motion.ul` com `staggerChildren: 0.04` e itens com `initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}`.
  - Cada item: `MateriaGlyph` (mapear nome da área → slug de matéria via helper `areaToMateriaId`), título da área, contagem, chevron. Altura fixa (ex.: `h-20`) para todos.
- Player da área (novo componente `AreaPlayerView`):
  - Header com nome da área + botão voltar.
  - Toggle `Todos | Selecionar`:
    - "Todos" → usa todos os cards da área.
    - "Selecionar" → abre um `Sheet` (shadcn) listando capítulos como chips/checkbox; salva seleção em `?caps=`.
  - Busca cards via `listarCardsDaArea` (já existe). Filtra no client por `resumo_capitulo_id` se houver seleção.
  - Passa lista filtrada para `FlashcardCuradoViewer` mostrando `capitulo_titulo` como tag dentro do card.

### `src/components/flashcards/FlashcardCuradoViewer.tsx`
- Trocar a animação atual (rotateY no mesmo `motion.div`) por `AnimatePresence mode="wait"` keado em `idx`. Cada card entra deslizando de uma direção e o anterior sai pela oposta (direção depende de avançar/voltar). O flip da resposta continua via rotateY interno.
- Tornar a tag do capítulo mais proeminente no topo do card (badge dourado com `capitulo_titulo`).
- Pequenos polimentos: progress dots com `layoutId`, fade nos botões, leve scale ao trocar.

### Novo helper `src/lib/flashcards-area-icon.ts`
- Função `areaToMateriaId(area: string): string` que normaliza ("Direito Penal" → "penal", "Ética e Estatuto da OAB" → "etica", etc.) para reaproveitar `MateriaGlyph` e suas cores. Fallback: hash simples para escolher um glyph default.

### Performance / ausência de "Carregando…"
- Loader prime cache na rota.
- `useSuspenseQuery` no componente.
- O router já tem `defaultPreload: "intent"` e `defaultPreloadDelay: 0` → ao tocar/passar o dedo no item, a próxima rota já é prefetchada.
- Para a navegação interna por search-param (Áreas → Player), pré-buscar `listarCardsDaArea` no `onMouseEnter`/`onTouchStart` do item da área via `queryClient.prefetchQuery`, de modo que o player abra sem spinner.

## Detalhes técnicos

- Manter `validateSearch` zod-friendly inline; novos params: `area?: string`, `caps?: string` (CSV de UUIDs).
- `Sheet` da seleção: vem de `@/components/ui/sheet` (já existe). Lista capítulos derivados dos próprios cards carregados (sem nova request).
- Animações: usar `framer-motion` (já em uso). Variants reaproveitáveis:
  - `listVariants` com `staggerChildren`.
  - `itemVariants` com `y: 8 → 0`, `opacity: 0 → 1`, `duration: 0.25`.
  - `slideVariants` para o player: `{ enter: dir => ({ x: dir*40, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: dir => ({ x: -dir*40, opacity: 0 }) }`.

## Fora do escopo

- Não mexer no admin (`_app.admin.flashcards.tsx`) nem nas server functions de geração.
- Não alterar layout do header global / bottom nav.
