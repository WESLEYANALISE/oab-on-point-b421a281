## Problema

O botão "Voltar" do cabeçalho mobile usa `router.history.back()`. Isso faz o navegador refazer a navegação anterior do zero — re-executa loaders, mostra estados de carregamento e, em algumas rotas, exibe brevemente a lista de rotas/menu antes de renderizar o destino. A sensação é lenta.

## Solução

Substituir o `history.back()` por uma navegação direta para o "pai lógico" da rota atual, com preload agressivo. Assim o destino já está em cache e a troca é instantânea.

### 1. Mapa de rotas-pai

Criar `src/lib/voltar.ts` com uma função `resolverVoltar(pathname)` que retorna o destino correto:

```text
/resumos/capitulo/:livroId/:ordem  → /resumos/:livroId
/resumos/:livroId                  → /resumos
/resumos                           → /
/simulados/...                     → /simulados  (e assim por diante)
qualquer outra                     → /
```

Implementada com regex simples sobre o `pathname`, sem depender do histórico do navegador.

### 2. MobileHeader

Em `src/components/layout/MobileHeader.tsx`:

- Trocar o `<button onClick={history.back}>` por um `<Link to={destino}>` (renderiza como `<a>` real, suporta cmd+click, fica acessível).
- O `destino` vem de `resolverVoltar(pathname)`.
- Adicionar `preload="intent"` para que o destino seja pré-buscado já no hover/touchstart — quando o usuário solta o dedo, a navegação é imediata.
- Manter o visual atual (pill + ícone + "Voltar").

### 3. Preload global mais agressivo

Em `src/router.tsx`, garantir:

- `defaultPreload: "intent"` (se ainda não estiver).
- `defaultPreloadDelay: 0` para disparar o preload assim que o dedo toca o botão.
- `defaultPendingMs` alto (ex.: 1500) para evitar o flash de "carregando" durante navegações curtas — se o loader resolver rápido, o usuário nunca vê estado intermediário.

### 4. Voltar do capítulo

No `_app.resumos.capitulo.$livroId.$ordem.tsx` o cabeçalho já é o `MobileHeader` global, então a correção acima cobre o caso da tela do print. Nada a mudar no arquivo da rota.

## Resultado esperado

- Toque em "Voltar" no capítulo → vai direto para `/resumos/:livroId` sem flash, com a lista já cacheada por preload.
- Toque em "Voltar" na lista do livro → vai direto para `/resumos`.
- Sem mais dependência do histórico do navegador (que era a causa da lentidão e do "pisca-pisca" de rotas).

## Arquivos afetados

- `src/lib/voltar.ts` (novo)
- `src/components/layout/MobileHeader.tsx` (editar onClick → Link com preload)
- `src/router.tsx` (ajustar defaults de preload/pending, se necessário)