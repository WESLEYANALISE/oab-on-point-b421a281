## Por que existe o delay

Em `src/routes/_app.tsx` o `<Outlet />` está envolto assim:

```tsx
<div key={pathname} className="animate-route-fade">
  <Outlet />
</div>
```

Isso causa dois problemas que somados produzem o atraso visível mesmo quando a URL já mudou:

1. **`key={pathname}` força remount total** da árvore da rota a cada navegação. Quando você volta para `/`, a home não é apenas reexibida — ela é **desmontada e remontada do zero**: todos os `useEffect`, queries, componentes pesados (Hero, CountdownExame, FaseCard com imagens, lista de notícias, ferramentas) precisam ser reconstruídos antes do primeiro pixel aparecer.

2. **`animate-route-fade`** (definida em `src/styles.css:171`) aplica `animation: route-fade 180ms ease-out both` no elemento recém-montado. O `both` mantém o estado inicial (`opacity: 0`) até a animação começar, então o conteúdo da próxima tela fica **invisível por ~180 ms** depois de o URL já ter trocado.

A `_app.admin.tsx` também contribui um pouco porque, ao **entrar** no admin, faz uma verificação async de admin. Mas ao **sair** ela não roda — então a causa do delay descrito (sair de `/admin/simulados` para `/` ou voltar) é o remount + fade acima.

## Plano

Mudanças mínimas, só em UI/presentation:

1. **`src/routes/_app.tsx`** — remover o wrapper `<div key={pathname} className="animate-route-fade">` e deixar o `<Outlet />` direto dentro do `<main>`. TanStack Router já faz o swap eficiente das rotas; sem o `key`, a home (e qualquer página já montada anteriormente em cache de componente) reaparece instantaneamente.

2. **`src/styles.css`** — manter a classe `.animate-route-fade` e o keyframe (podem estar sendo usados em outros lugares de animação leve), mas **não usar mais por padrão na shell de rotas**. Sem custo adicional.

3. **(opcional, mesma direção)** No `_app.admin.simulados.tsx`, o `refetchInterval: 5_000` continua rodando enquanto o admin está aberto, o que é correto — mas garantir que ao desmontar a página de admin o polling pare (já para automaticamente porque o componente desmonta). Nenhuma mudança necessária aqui; mantenho a observação só para registro.

## Resultado esperado

Apertar "Voltar" ou "Início" em `/admin/simulados` (ou em qualquer rota) leva à tela de destino **imediatamente**, sem fade de 180 ms e sem reconstruir a árvore do zero. A navegação passa a parecer nativa.

## O que NÃO muda

- Nenhuma mudança em server functions, queries, layout do admin, autorização, ou lógica de fila.
- Animações específicas de componentes (cards, modais) continuam funcionando — só removemos a animação aplicada globalmente em toda troca de rota.
