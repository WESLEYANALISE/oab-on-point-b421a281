## Auditoria de cache / performance

Mapeamento atual:

**O que JÁ está bom**
- Router: `defaultPreload: "intent"` + `defaultPreloadDelay: 50` + `defaultPreloadStaleTime: 0` em `src/router.tsx` (preload no hover já funciona).
- `useProfile` e `useIsAdmin` com cache em `localStorage` + `initialData` (acabamos de fazer).
- Biblioteca usa `queryOptions` reutilizáveis com `staleTime`/`gcTime` corretos.
- Imagens das `FaseCard` da home com `width/height/fetchPriority`.
- Notícias/matérias são módulos estáticos (sem rede).
- Várias rotas (provas, simulados, biblioteca) já passam `staleTime` e desligam `refetchOnWindowFocus`.

**O que está faltando / pode melhorar**

1. **Sem defaults globais no `QueryClient`** — `new QueryClient()` sem `defaultOptions`. Toda query que esquecer de declarar `staleTime` cai no default 0 (refetch a cada montagem). Risco real: `SimuladoQueueIndicator`, `SimuladoProgressModal`, alguns useQuery em rotas que não setam tudo.
2. **Cache do React Query NÃO persiste** — recarregar a aba zera tudo (simulados, biblioteca, provas). Mesmo problema que tínhamos com o nome do usuário, só que para todos os dados.
3. **Rotas usam `useQuery` no componente, não `loader` + `ensureQueryData`** — com isso o `preload: "intent"` não consegue pré-buscar dados na navegação (só pré-carrega o chunk JS). Resultado: clicou → renderiza skeleton → faz fetch.
4. **Sem invalidação coordenada** após `salvarResposta`/`finalizarTentativa`, então listas de tentativas e overviews podem ficar com dado velho até bater o `staleTime`.
5. **Sem `placeholderData: keepPreviousData`** em listas paginadas/filtradas (biblioteca quando troca de área pisca em branco).

## Plano

Foco: maximizar cache hit e eliminar refetches/remounts desnecessários, sem mudar regra de negócio.

### 1. `src/router.tsx` — defaults globais + persistência

- Adicionar `defaultOptions.queries`:
  - `staleTime: 60_000` (1 min — padrão saudável)
  - `gcTime: 30 * 60_000`
  - `refetchOnWindowFocus: false`
  - `refetchOnReconnect: false`
  - `retry: 1`
- Instalar `@tanstack/query-sync-storage-persister` + `@tanstack/react-query-persist-client` e ligar `persistQueryClient` no `localStorage` (chave `oab-rq-cache`, `maxAge: 24h`, `buster` com versão do app).
- Excluir da persistência queries com chave começando em `["is-admin"]`, `["profile"]` (já têm cache próprio) e jobs em tempo real (`["simulado-job"]`, `["simulado-queue"]`) via `dehydrateOptions.shouldDehydrateQuery`.

### 2. `src/routes/__root.tsx` — usar `PersistQueryClientProvider`

Trocar `QueryClientProvider` por `PersistQueryClientProvider` recebendo o persister do router context. Mantém o `queryClient` por request (SSR-safe).

### 3. Converter rotas pesadas para `loader` + `ensureQueryData`

Para aproveitar `preload: "intent"` (busca dados ao passar o mouse / tocar):
- `src/routes/_app.simulados.index.tsx` — loader chama `ensureQueryData` da lista de simulados, raio-X e progresso.
- `src/routes/_app.simulados.$slug.index.tsx` — loader pré-carrega overview + histórico + edital.
- `src/routes/_app.provas.index.tsx` e `_app.provas.$numero.tsx` — loader com `ensureQueryData`.
- `src/routes/_app.biblioteca.index.tsx`, `_app.biblioteca.$slug.index.tsx`, `_app.biblioteca.$slug.$bookId.index.tsx` — loader pré-carrega counts/áreas/livro.

Componentes continuam usando `useQuery` com as mesmas `queryOptions` — sem refactor de UI.

### 4. `placeholderData: keepPreviousData` em listas filtradas

- `livrosQueryOptions` em `_app.biblioteca.$slug.index.tsx` quando troca área/sort/paginação.

### 5. Invalidação após mutations

- Em `salvarResposta`/`finalizarTentativa`/`reiniciarTentativa`, invalidar `["simulado-overview", slug]`, `["simulado-historico", slug]`, `["minhas-tentativas"]`, `["progresso-usuario"]`.

### 6. `SimuladoQueueIndicator` / `SimuladoProgressModal`

- Manter `refetchInterval` para polling, mas marcar essas queries para NÃO persistir (no shouldDehydrateQuery) — não faz sentido restaurar status de job antigo.

## O que NÃO muda

- Sem mudanças em RLS, migrations, server functions de negócio.
- Sem mudança de UI/UX.
- Sem mudança em auth, rotas, ou regras de admin.

## Resultado esperado

- Recarregar a aba mantém listas/detalhes instantâneos (vindo do localStorage, revalidando em background).
- Passar o mouse sobre um link já busca os dados — clique fica praticamente instantâneo.
- Trocar de área na biblioteca não pisca em branco.
- Após responder/finalizar simulado, raio-X/progresso/histórico atualizam imediatamente.
