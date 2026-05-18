# Acelerar navegação (Início, Vade-Mecum, Simulados)

## Diagnóstico

Hoje as rotas Início (`/app`), Vade-Mecum (`/vade-mecum/estatutos/$slug`) e Simulados (`/simulados/$slug`) demoram porque:

1. **Nenhuma rota tem `loader`.** Todos os dados são buscados em `useQuery` dentro do componente. Isso anula o `defaultPreload: "intent"` configurado no router: tocar no link não pré-busca nada — a request só sai depois do clique, no `mount`.
2. **Bundles enormes carregados de uma vez.** `_app.vade-mecum.estatutos.$slug.tsx` tem 1564 linhas e arrasta `react-markdown`, `remark-gfm`, `jspdf` (PDF), `PraticarPanel` (546 linhas), Sheet, etc. Tudo isso baixa antes da tela aparecer, mesmo quem só quer ler um artigo.
3. **Drivers globais sempre montados.** `SimuladoQueueDriver` e `ResumoQueueDriver` vivem em `_app.tsx` e disparam server functions / polling em toda navegação, mesmo para usuários não-admin sem fila ativa.
4. **`/app` refaz a query do blog** ao voltar (nada pré-aquece o cache na primeira visita).

## O que vamos mudar

### 1. Prefetch de dados via `loader` (ganho maior)

Adicionar `loader` que usa `context.queryClient.ensureQueryData` nas três rotas críticas — combinado com `defaultPreload: "intent"` e `defaultPreloadDelay: 0` já existentes, os dados começam a ser buscados no toque, antes do clique resolver.

- `/_app/app` → prefetch `listBlogPosts({ limit: 8 })`.
- `/_app/vade-mecum/estatutos/$slug` → prefetch a lista de artigos do estatuto (query principal hoje feita dentro do componente).
- `/_app/simulados/$slug` → prefetch `getSimuladoOverview` + `listMinhasTentativas`.

Os componentes continuam usando `useQuery` com a mesma `queryKey` — pegam direto do cache, sem flicker.

### 2. Code-split nas rotas pesadas

No `_app.vade-mecum.estatutos.$slug.tsx`:
- `PraticarPanel` via `lazy()` + `<Suspense>` (só carrega quando o usuário abre Praticar).
- `chat-pdf` (jspdf, ~200KB) carregado dinâmico dentro do handler do botão PDF, não no topo do arquivo.
- `react-markdown` + `remark-gfm` extraídos para um componente lazy `<MarkdownRender>`.

No `_app.simulados.$slug.index.tsx`: mover os blocos pesados (edital, raio-x) para `lazy()` acionados por aba.

### 3. Drivers globais só quando precisam

`SimuladoQueueDriver` e `ResumoQueueDriver` em `_app.tsx`:
- Não montar para usuários sem permissão (`useIsAdmin === false`).
- Não iniciar polling enquanto `state.queue.length === 0` e não há job ativo no `localStorage`.

### 4. Ajustes finos

- `staleTime` do blog na home: 10 min (muda raramente).
- `HomeTopCard`: já usa `readCachedProfileOptimistic`; garantir que a saudação renderize sem aguardar `useProfile`.
- Bottom-nav: `<Link>` para `/app` com `preload="intent"` (já é o default, só confirmar não desativado).

## Como vou verificar

- Build sem erros + `bun add` não necessário.
- Abrir devtools de network no preview e confirmar:
  - tocar no botão Início no rodapé dispara `listBlogPosts` ANTES do clique;
  - navegar para um estatuto baixa um chunk menor (sem jspdf no chunk inicial);
  - drivers de simulado/resumo não disparam nenhuma request para usuário comum.

## Detalhes técnicos

Padrão do loader (TanStack Start):

```ts
export const Route = createFileRoute("/_app/app")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["blog", "home-carousel"],
      queryFn: () => listBlogPosts({ data: { limit: 8 } }),
      staleTime: 10 * 60_000,
    }),
  component: AreaOABPage,
  head: () => ({ /* ... */ }),
});
```

Lazy de panel:

```tsx
const PraticarPanel = lazy(() =>
  import("@/components/vade-mecum/PraticarPanel").then(m => ({ default: m.PraticarPanel }))
);
```

Lazy de PDF dentro do handler (não no topo):

```ts
const onExportPdf = async () => {
  const { exportarConversaPDF } = await import("@/lib/chat-pdf");
  await exportarConversaPDF(mensagens);
};
```

Guard nos drivers:

```tsx
const { data: isAdmin } = useIsAdmin();
const state = useSimuladoQueue();
if (!isAdmin && state.queue.length === 0 && !state.activeJobId) return null;
```

## Fora de escopo

- Não vou mexer no streaming do chat da Profa. Ana (já feito).
- Não vou alterar layout/visual nem fluxo de telas — só performance de carregamento.
