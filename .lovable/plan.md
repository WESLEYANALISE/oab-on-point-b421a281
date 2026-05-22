## Diagnóstico

A URL muda na hora, mas o conteúdo demora porque **duas coisas estão quebradas ao mesmo tempo**:

### 1. Preload do TanStack Router está crashando (causa raiz)

No console do preview aparece, toda vez que o usuário aponta/toca em um link:

```
TypeError: Cannot read properties of undefined (reading '_nonReactive')
  at loadRouteMatch (@tanstack/router-core)
  at RouterCore.preloadRoute
```

Isso é um **mismatch de versão** dentro do TanStack:

| Pacote | Versão |
|---|---|
| `@tanstack/react-router` | **1.168.25** |
| `@tanstack/react-start` | 1.167.50 |
| `@tanstack/router-plugin` | 1.167.28 |

O `react-router` 1.168 fala com um `router-core` novo que expõe `_nonReactive` em cada match; o resto do ecossistema ainda está em 1.167 e carrega um core antigo que não tem esse campo. Resultado: **toda chamada `preloadRoute` joga uma exception silenciosa**.

Como o router está configurado com `defaultPreload: "intent"` + `defaultPreloadDelay: 0` justamente para deixar a navegação "instantânea" no mobile, quando o preload morre **nenhum chunk é baixado antes do clique**. No clique:

1. URL muda (client-side routing é síncrono).
2. O chunk JS da rota destino ainda nem começou a baixar.
3. A página antiga fica na tela até o chunk chegar + loader/queries rodarem.

Por isso a sensação é "rota troca, conteúdo demora".

### 2. Não existe `defaultPendingComponent`

Mesmo se um dia o preload falhar (rede ruim, primeira visita), o router não tem componente de "pending" global. Enquanto o chunk/loader não chegam, o TanStack mantém a tela antiga renderizada — sem skeleton, sem spinner, sem nada. Isso amplifica a percepção de travamento.

`defaultPendingMs: 80` + `defaultPendingMinMs: 200` já estão configurados em `src/router.tsx`, mas só funcionam se houver um `defaultPendingComponent`.

---

## Plano de correção

### Passo 1 — Alinhar versões do TanStack

Subir todos os pacotes do TanStack Router/Start para a mesma minor (1.168.x) para o `router-core` voltar a ter a forma esperada:

- `@tanstack/react-router` → manter 1.168.x
- `@tanstack/react-start` → bump para 1.168.x
- `@tanstack/router-plugin` → bump para 1.168.x
- `@tanstack/zod-adapter` → bump para 1.168.x

Comando: `bun add @tanstack/react-router@latest @tanstack/react-start@latest @tanstack/router-plugin@latest @tanstack/zod-adapter@latest`

Validação: abrir Início, passar o mouse/dedo nos atalhos, verificar que o erro `_nonReactive` sumiu do console e que requisições de chunks `_app.*.tsx` aparecem na aba Network **antes** do clique.

### Passo 2 — Adicionar `defaultPendingComponent` no router

Em `src/router.tsx`, registrar um skeleton leve (reaproveitando `src/components/shared/SkeletonCard.tsx` ou um placeholder simples com a paleta gold/primary). Assim, mesmo em cenário pessimista (chunk frio, conexão lenta), o usuário vê feedback visual em ~80ms em vez da página antiga "congelada".

```text
defaultPendingComponent: () => (
  <div className="px-4 py-6 space-y-3">
    <div className="h-7 w-40 rounded-md bg-muted animate-pulse" />
    <div className="h-32 w-full rounded-2xl bg-muted animate-pulse" />
    <div className="grid grid-cols-2 gap-3">
      <div className="h-24 rounded-2xl bg-muted animate-pulse" />
      <div className="h-24 rounded-2xl bg-muted animate-pulse" />
    </div>
  </div>
)
```

### Passo 3 — Garantir preload agressivo nos atalhos da Home (opcional, mas recomendado)

Os 8 `<Link>` de atalhos em `_app.inicio.tsx` herdam `preload: "intent"` do router. Após o passo 1, isso volta a funcionar. Se ainda quisermos blindar, dá para forçar `preload="viewport"` nesse grid específico — assim que aparecem na tela, os chunks já começam a baixar, e o clique vira navegação instantânea.

---

## Resumo técnico

| O que | Por quê |
|---|---|
| Subir `react-start`, `router-plugin`, `zod-adapter` para 1.168.x | Acabar com o crash `_nonReactive` no `preloadRoute` |
| Adicionar `defaultPendingComponent` | Feedback visual imediato quando o chunk não está pré-carregado |
| (Opcional) `preload="viewport"` nos atalhos da Home | Pré-carregar as 8 rotas mais clicadas assim que a Home renderizar |

Sem o Passo 1, o Passo 2 só esconde o sintoma. Sem o Passo 2, qualquer falha futura de preload volta a parecer travamento. Os dois juntos resolvem a queixa.
