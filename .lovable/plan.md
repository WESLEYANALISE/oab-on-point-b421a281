## O que existe hoje

Em `src/routes/_app.tsx` (linha 55) já há um wrapper com `animate-route-fade` aplicado por `key={pathname}`, mas a animação no CSS é só um **fade de opacidade** de 180ms (`src/styles.css` linhas 195–199). Sem deslocamento, sem direção — por isso parece que "não tem animação".

## Objetivo

Quando o usuário navegar entre telas no app, a página nova deve **deslizar da direita pra esquerda** (entrando) com leve fade, no estilo das transições nativas de iOS/Android. Aplicar a todas as rotas filhas de `_app`.

## Mudanças

### 1. Nova keyframe no `src/styles.css`

Substituir a keyframe `route-fade` por uma slide + fade combinados:

```css
@keyframes route-slide-in {
  from { opacity: 0; transform: translate3d(24px, 0, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
.animate-route-slide {
  animation: route-slide-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .animate-route-slide { animation: none; }
}
```

- `cubic-bezier(0.22, 1, 0.36, 1)` é uma "ease-out-expo" — começa rápido e desacelera, sensação fluida.
- `translate3d` força aceleração GPU.
- Respeita `prefers-reduced-motion`.

A keyframe antiga `route-fade` pode ser mantida (outras partes do app talvez usem fade) ou removida — vou manter pra evitar regressão.

### 2. Trocar a classe em `_app.tsx`

Linha 55:

```tsx
<div key={pathname} className="mx-auto w-full max-w-[1120px] animate-route-slide">
  <Outlet />
</div>
```

O `key={pathname}` já existe e força React a desmontar/montar o wrapper a cada mudança de rota, disparando a animação de entrada.

### 3. Garantir que o container não corte a animação

`main` já tem `overflow-x-hidden` (linha 54) — isso evita scroll horizontal durante o slide. Mantém.

## Por que não usar AnimatePresence/framer-motion

Para transições com **exit** (saída deslizando pra esquerda enquanto a nova entra pela direita) seria preciso `AnimatePresence mode="wait"` controlando o `Outlet`, o que adiciona complexidade (precisa do `location.pathname` como key, exige `motion.div` cobrindo o Outlet, e em SSR pode causar flicker). O slide-in puro em CSS já entrega a sensação fluida pedida com zero custo e sem risco.

## Arquivos afetados

- `src/styles.css` — adicionar `route-slide-in` + classe `.animate-route-slide`.
- `src/routes/_app.tsx` — trocar `animate-route-fade` por `animate-route-slide`.

Nada mais.