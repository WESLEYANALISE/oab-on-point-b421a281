## Problema

Hoje, ao navegar entre `/resumos/$livroId` e `/resumos/capitulo/$livroId/$ordem` (e ao voltar), a tela mostra "Carregando…" toda vez. Causas:

1. As duas rotas usam `useQuery` com `staleTime: 60_000`, mas **sem `loader` + prefetch**. O fetch só começa quando o componente monta.
2. Cada rota mostra um spinner de tela inteira enquanto `isPending` for `true` — então toda navegação "pisca" mesmo quando o dado já está em cache (na verdade não está, porque nada prefetcha).
3. Os `<Link>` para capítulos não disparam preload de dados (só de código), porque a rota destino não tem `loader`.
4. Ao voltar para a lista, a query é refetch porque outras rotas podem ter invalidado o cache do livro.

## Objetivo

Abrir resumo do livro e cada capítulo de forma **instantânea e fluida**, sem spinner de tela cheia, reusando o mesmo cache para o livro inteiro (lista de capítulos vem junto com o livro — uma query só serve as duas rotas).

## Mudanças

### 1. `src/lib/resumos.functions.ts`
Sem mudança de schema. Apenas extrair um `resumoLivroQueryOptions(livroId)` reutilizável (novo arquivo `src/lib/resumos-queries.ts` ou exportar do mesmo módulo de rota). Define:

```ts
queryOptions({
  queryKey: ["resumo-livro", livroId],
  queryFn: () => obterLivroResumo({ data: { resumo_livro_id: livroId } }),
  staleTime: 10 * 60_000,   // 10 min: resumo muda raramente
  gcTime: 60 * 60_000,
})
```

### 2. `src/routes/_app.resumos.$livroId.tsx`
- Adicionar `loader: ({ context, params }) => context.queryClient.ensureQueryData(resumoLivroQueryOptions(params.livroId))`.
- Trocar `useQuery(...).isPending` por `useSuspenseQuery(resumoLivroQueryOptions(livroId))` **ou** manter `useQuery` e simplesmente remover o early-return de spinner — como o loader garante cache, `data` já estará pronto no primeiro render.
- Remover o bloco `if (isPending || !data) return <Loader2/>…`.
- Manter `defaultPreload: "intent"` (já está no router) — agora com loader, preload no hover/touch também prefetcha os dados.

### 3. `src/routes/_app.resumos.capitulo.$livroId.$ordem.tsx`
- Mesma queryKey `["resumo-livro", livroId]` já é usada (linha 33), então a navegação lista→capítulo reusa cache imediatamente.
- Adicionar `loader: ({ context, params }) => context.queryClient.ensureQueryData(resumoLivroQueryOptions(params.livroId))`.
- Remover o early-return com `Loader2` (linhas 128–136). Como o loader popula cache, `data` está disponível no primeiro render; o `if (!atual)` continua para o caso de ordem inválida.
- Trocar para `useSuspenseQuery` (opcional, mas mais limpo) — ou continuar com `useQuery` confiando no cache do loader.
- Navegação entre capítulos (anterior/próximo) já é instantânea porque mesma queryKey — só remover o spinner garante isso.

### 4. Router (`src/router.tsx`)
Sem mudanças. `defaultPreload: "intent"` e `defaultPreloadStaleTime: 30_000` já estão configurados.

## Resultado

- Entrar em `/resumos/$livroId`: render imediato (loader preenche cache, sem spinner).
- Clicar num capítulo: render instantâneo, sem spinner (mesma queryKey já em cache).
- Voltar para a lista: instantâneo (cache fresh por 10min).
- Pré-cache acontece no hover/touch dos `<Link>` graças ao `defaultPreload: "intent"` + loaders.

Sem mudança de design, sem mudança de comportamento de negócio — só performance percebida.