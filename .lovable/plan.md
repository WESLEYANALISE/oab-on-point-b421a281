## Por que está lento

Diagnóstico do `/biblioteca` e `/biblioteca/$slug`:

1. **Payload gigante**: a listagem usa `select("*")`. A tabela `BIBLIOTECA-ESTUDOS` tem 490 livros com o campo `Sobre` enorme (textos longos). Cada clique baixa centenas de KB inúteis — só precisamos de capa, título, autor e link.
2. **Sem preload no hover**: o router não está com `defaultPreload: "intent"`, então a busca só começa **depois** do clique.
3. **Sem cache entre visitas**: `staleTime` padrão é 0 → toda vez que você volta na categoria, refaz a query inteira.
4. **UI vazia enquanto carrega**: só aparece o texto "Carregando…", o que parece travado. Sem skeleton, o usuário sente lentidão extra.
5. **Imagens externas pesadas** (Amazon, Google Books) sem `decoding="async"` e sem priorização — somam ao tempo percebido.

## Plano de otimização

### 1. Router: pré-carregar no hover
`src/router.tsx` — adicionar `defaultPreload: "intent"` e `defaultPreloadDelay: 50`. A query da categoria começa quando o dedo/mouse paira no card, então o clique abre instantâneo.

### 2. Loader + ensureQueryData
`src/routes/_app.biblioteca.$slug.tsx` — mover a busca para um `loader` que chama `queryClient.ensureQueryData(...)`. Usar `useSuspenseQuery` no componente. Resultado: navegação aguarda dados já em cache, sem "flash" de loading.

### 3. Buscar só as colunas necessárias
Trocar `select("*")` por `select("id, <capa>, <titulo>, <autor>, <link>")` dinâmico por categoria. Em Estudos isso reduz o payload em ~95% (remove o `Sobre`, `aula`, `url_capa_gerada`, etc.).

### 4. Cache prolongado
Adicionar `staleTime: 5 * 60_000` (5 min) e `gcTime: 30 * 60_000`. Re-entrar na mesma biblioteca = instantâneo, sem refetch.

### 5. Skeleton grid em vez de "Carregando…"
Renderizar uma grade de placeholders cinza no mesmo layout (3 colunas, `aspect-[2/3]`) durante o fetch. Percepção de velocidade muda completamente.

### 6. Imagens
Adicionar `decoding="async"` em todas as capas; manter `loading="lazy"` (já tem). Para o hub, reduzir count queries com `staleTime` também (5 min).

### 7. Hub (`/biblioteca`)
Mesmo `staleTime` para `biblioteca-counts` e preload já fica garantido pelo passo 1.

### Resultado esperado
- 1º clique: dados começam a chegar no hover → abertura quase instantânea.
- Cliques seguintes: cache servido → 0 ms.
- Payload de Estudos: de ~1.5 MB para ~80 KB.
- UI sempre mostra o esqueleto da grade, nunca uma tela vazia.

### Arquivos a editar
- `src/router.tsx`
- `src/routes/_app.biblioteca.tsx`
- `src/routes/_app.biblioteca.$slug.tsx`

Posso implementar?