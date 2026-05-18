## Causa raiz

Identifiquei o erro real nos logs:

```
TypeError: object is not iterable (cannot read property Symbol(Symbol.iterator))
  at new Set (<anonymous>)
  at _app.vade-mecum.estatutos._slug ... useMemo
```

O que aconteceu:

1. Em uma versão anterior, a query `["vade-mecum", "favoritos", ...]` retornava um `Set<string>` direto do `queryFn`.
2. Adicionamos persistência em `localStorage` (`PersistQueryClientProvider` com whitelist incluindo `vade-mecum`).
3. `JSON.stringify(new Set())` vira `{}` — então o cache no `localStorage` (`oab-rq-cache`) ficou salvo como objeto vazio.
4. Na rodada passada eu mudei o `queryFn` para retornar um array e derivar o `Set` via `useMemo(() => new Set(favoritosIds ?? []), ...)`. Mas, ao montar, o `PersistQueryClientProvider` re-hidrata o cache antigo (`{}`) ANTES do `queryFn` rodar, então `favoritosIds` chega como `{}` (objeto) — e `new Set({})` explode, derrubando a página inteira no `errorComponent` ("Esta página não carregou").

Isso é por usuário/navegador: quem nunca abriu antes não sente, quem já abriu fica preso no erro até limpar storage.

## Correção

Duas mudanças, ambas pequenas e cirúrgicas, só em `src/routes/`:

1. **Invalidar o cache persistido velho** — `src/routes/__root.tsx`:
   - Bumpar `CACHE_BUSTER` de `"oab-v2"` para `"oab-v3"`. O `PersistQueryClientProvider` descarta automaticamente qualquer cache salvo com buster antigo, então o `{}` quebrado some no próximo load para todos os usuários afetados.

2. **Blindar contra cache malformado no futuro** — `src/routes/_app.vade-mecum.estatutos.$slug.tsx`:
   - Trocar `new Set<string>(favoritosIds ?? [])` por uma versão defensiva: só itera se `Array.isArray(favoritosIds)`, senão usa `[]`. Assim, mesmo que algum dia volte a chegar um objeto do storage, a página não cai.

Sem mudanças de schema, sem mudanças de UI, sem mexer em business logic. Comportamento idêntico para o usuário, exceto que a página volta a abrir.

## Detalhes técnicos

```ts
// src/routes/__root.tsx
const CACHE_BUSTER = "oab-v3"; // era "oab-v2"
```

```tsx
// src/routes/_app.vade-mecum.estatutos.$slug.tsx
const favoritos = useMemo(
  () => new Set<string>(Array.isArray(favoritosIds) ? favoritosIds : []),
  [favoritosIds],
);
```

Após aplicar, peço para você dar refresh — o buster novo vai limpar o cache quebrado automaticamente.
