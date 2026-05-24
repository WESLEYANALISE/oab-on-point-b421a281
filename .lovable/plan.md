## Objetivo

Fazer o `/vade-mecum/$slug` (ex.: Código Civil) abrir **instantaneamente**: cabeçalho (brasão + título + ações) e os primeiros 20 artigos aparecem de imediato, e o resto da lei carrega em segundo plano sem o usuário perceber.

## Problemas hoje

1. `useQuery` em `_app.vade-mecum.estatutos.$slug.tsx` tem `queryKey: [..., userId]`. Como `userId` começa `null` e muda quando `supabase.auth.getUser()` resolve, a query refaz e o "carregamento" pisca duas vezes.
2. Uma única RPC `get_estatuto_overview` traz **2.388 artigos do CC + favoritos + anotações** num só payload — bloqueia o primeiro pixel até o JSON inteiro chegar.
3. Não há `loader` na rota: o `defaultPreload: "intent"` do router toca em quem? Nada é "ensure-cached" no hover/touch do card de Códigos, então a entrada começa do zero.
4. O cabeçalho (brasão, "CÓDIGO CIVIL", "Ver no Planalto") depende de `data?.lei`, embora título/URL já existam em `getEstatuto(slug)` / `ESTATUTOS_DESTAQUE` (síncrono, sem rede).

## Plano

### 1. Separar a RPC em duas fases — "head" rápido + "tail" em background

Nova migration Supabase:

- **`get_estatuto_head(_slug text, _limit int default 40)`** retorna `{ lei, artigos: <primeiros N por ordem> }`. Payload pequeno → resposta em poucos ms.
- **`get_estatuto_tail(_slug text, _offset int)`** retorna `{ artigos: <do offset em diante> }`.
- **`get_estatuto_user(_slug text, _user_id uuid)`** retorna só `{ favoritos, anotados }`.

A RPC atual `get_estatuto_overview` continua existindo (compat), mas a página passa a usar as três novas.

### 2. Refatorar `_app.vade-mecum.estatutos.$slug.tsx`

- **Query 1 — head** (`["vade-mecum","estatuto-head",slug]`, sem `userId`, `staleTime` 1h, `gcTime` 24h). Resolve rapidíssimo e já popula `lei` + 40 artigos.
- **Query 2 — tail** (`["vade-mecum","estatuto-tail",slug]`, `enabled: !!headData && headData.lei.total_artigos > 40`). Roda **em paralelo / depois** do head; quando chega, faz `setArtigos(prev => [...head, ...tail])` via `useMemo` combinando os dois caches.
- **Query 3 — user** (`["vade-mecum","estatuto-user",slug,userId]`, `enabled: !!userId`). Favoritos/anotações entram sem segurar a renderização.
- Tipagem: `artigos = useMemo(() => [...head, ...(tail ?? [])], [head, tail])`. Toda lógica downstream (`apenasArtigos`, árvore, virtualizer) já consome esse array, então só passa a crescer.
- O cabeçalho deixa de depender de `data?.lei`: usa `meta` (`getEstatuto(slug)`) para nome/brasão/Planalto e só sobrescreve quando `headData.lei` chega. Resultado: brasão + título aparecem **no primeiro frame**, sem placeholder.
- Remover o skeleton de tela cheia atual; deixar só um shimmer discreto **abaixo dos 20 primeiros artigos** enquanto o tail carrega (sinaliza "tem mais vindo" sem travar).

### 3. Loader + preload (entrada instantânea via cache)

- Adicionar `loader` à rota que chama `queryClient.ensureQueryData` da **query head** (`get_estatuto_head`). Como `defaultPreload: "intent"` + `defaultPreloadDelay: 0` já está ligado no router, ao tocar/passar pelo card em `/vade-mecum/codigos` o head já vai estar quentinho no cache → navegação sem flash.
- Em `_app.vade-mecum.codigos.index.tsx`: ao montar, disparar `router.preloadRoute({ to: "/vade-mecum/$slug", params: { slug } })` para os 3–5 códigos mais acessados (CC, CP, CPC, CLT, CDC) em `requestIdleCallback`, para ficarem prontos antes mesmo do toque.

### 4. Animação de cascata nos primeiros artigos

- Os 20 primeiros itens recebem `animate-fade-in` com `animation-delay = Math.min(idx, 12) * 25ms`. Itens que entram depois (tail) aparecem sem delay para não atrasar nada.

## Arquivos afetados

- `supabase/migrations/*` — novas RPCs `get_estatuto_head`, `get_estatuto_tail`, `get_estatuto_user`.
- `src/integrations/supabase/types.ts` — tipagem das novas RPCs (regenerado).
- `src/routes/_app.vade-mecum.estatutos.$slug.tsx` — divisão em 3 queries, header síncrono via `meta`, cascata, loader.
- `src/routes/_app.vade-mecum.codigos.index.tsx` — preload em idle dos códigos top.

## Fora de escopo

- Detalhe do artigo (sheet), playlist, anotações, IA — sem mudanças.
- Outros caminhos (`/vade-mecum/cf`, `/vade-mecum/estatutos/...`) herdam automaticamente porque usam o mesmo componente, mas não exigem ajustes extras.
