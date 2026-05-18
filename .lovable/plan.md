## Diagnóstico

Quatro causas reais de lentidão ao clicar em qualquer função (Vade Mecum, Biblioteca, etc.):

1. **Invalidação global em todo refresh de token.** `src/routes/__root.tsx` invalida *todas* as queries em `TOKEN_REFRESHED` (acontece a cada ~1h em segundo plano e também ao trocar de aba). Resultado: listas que pareciam prontas voltam a buscar do zero, dando a sensação de "tudo lento de novo".
2. **Vade Mecum sem cache persistente nem prefetch.** Cada estatuto faz `select … limit 2000` em `vade_mecum_artigos` toda vez que abre. Como a lista de estatutos e o conteúdo dos artigos quase não muda, dá pra servir instantâneo do cache.
3. **Preload de rota fraco.** `defaultPreload: "intent"` só prefetcha em hover (no mobile, hover não existe). A rota só começa a carregar depois do toque.
4. **Bundles grandes em rotas pesadas.** `_app.vade-mecum.estatutos.$slug.tsx` tem 1.123 linhas e importa tudo no topo (28 ícones, sheet, etc.). O JS é baixado e parseado só ao clicar pela primeira vez.

## O que vou mudar

### 1. Auth bridge mais cirúrgico (`src/routes/__root.tsx`)
- Em `TOKEN_REFRESHED`: **não invalidar nada** (o token novo já é usado nas próximas requisições).
- Em `SIGNED_IN` / `SIGNED_OUT`: invalidar só queries de usuário (`profile`, favoritos, anotações, progresso), preservando o cache de conteúdo público (estatutos, biblioteca, blog).
- Em `SIGNED_OUT`: `queryClient.clear()` pra não vazar dado entre contas.

### 2. Router mais agressivo no preload (`src/router.tsx`)
- `defaultPreload: "intent"` + ativar `defaultPreloadDelay: 0`.
- Adicionar `defaultViewTransition` desligado pra evitar overhead.
- Manter `defaultPreloadStaleTime: 0` quando for usar React Query, mas como hoje a maioria das rotas não usa loader, subir o `staleTime` global do QueryClient pros conteúdos estáveis (já está em 5min — ok).

### 3. Cache persistente do Vade Mecum
- Em `__root.tsx`, adicionar à whitelist `PERSISTED_PREFIXES`: `"vade-mecum"`.
- Aumentar `MAX_PERSISTED_BYTES` pra 300 KB (um estatuto grande cabe; CF/LF cabem em ~150 KB gzipados no localStorage).
- Em `_app.vade-mecum.estatutos.$slug.tsx` e `…estatutos.index.tsx`: adicionar `staleTime: 30 * 60_000` e `gcTime: 24h` nas queries de `vade_mecum_leis` / `vade_mecum_artigos`. Assim: 1ª vez busca, depois abre instantâneo (do localStorage).

### 4. Pedir só o necessário do Supabase
- Na lista do estatuto, trocar `select("id, numero, texto, ordem, relevancia, relevancia_nota")` por `select("id, numero, ordem, relevancia")` (texto é grande e só precisa quando o artigo é aberto). O texto vem sob demanda numa query separada `["vade-mecum", "artigo", id]` quando o sheet abre.
- Resultado esperado: payload do estatuto cai de ~1–3 MB pra ~50–150 KB.

### 5. Quebrar o bundle do estatuto
- Mover o `ArtigoSheet` (e tudo que só aparece quando se abre um artigo: termos, narração, anotações) pra `src/components/vade-mecum/ArtigoSheet.tsx` e importar com `lazy()` / `React.lazy`.
- Idem para os componentes do menu rodapé que abrem sub-sheets (anotações, perguntar, narração).
- A página em si fica leve e o JS pesado só baixa quando o usuário abre um artigo.

### 6. Pequenos ajustes paralelos
- Remover o `export const RetaFinalPage` solto em `_app.reta-final.tsx` (o warning do console diz que ele quebra code-splitting).
- Em `src/routes/_app.tsx`: usar `prefetch` (hover/touchstart) nos atalhos da home com `<Link preload="intent">` (já é default, confirmar) e garantir que `defaultPreloadDelay: 0` esteja honrado.

## Resultado esperado

- Voltar para uma rota já visitada (Vade Mecum, Estatutos, Biblioteca) → instantâneo, sem spinner.
- Abrir um estatuto pela 1ª vez → carrega só a lista enxuta (rápido); abrir um artigo carrega o texto sob demanda.
- Token refresh em background não causa mais "tela piscando" / refetch geral.

## Detalhes técnicos

- Arquivos editados:
  - `src/routes/__root.tsx` — auth bridge + persisted prefixes + byte cap.
  - `src/router.tsx` — `defaultPreloadDelay: 0`.
  - `src/routes/_app.vade-mecum.estatutos.$slug.tsx` — split, query enxuta, staleTime.
  - `src/routes/_app.vade-mecum.estatutos.index.tsx` — staleTime.
  - `src/routes/_app.reta-final.tsx` — remover export nomeado extra.
  - Novo: `src/components/vade-mecum/ArtigoSheet.tsx` (e talvez `MenuRodape.tsx`).
- Sem mudanças no Supabase (schema / RLS). Só a forma como o front consulta.
- Sem mudança visual.
