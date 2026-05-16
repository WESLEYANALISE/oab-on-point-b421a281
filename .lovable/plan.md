## Objetivo

1. Reorganizar `/admin/resumos` em **navegação por área** (lista → detalhe), em vez de mostrar todas as áreas empilhadas com chips no topo.
2. Tornar o card de cada livro **mobile-first**, garantindo que o botão "Gerar prévia" sempre apareça (hoje fica cortado fora da tela no 390px).
3. Passar uma **revisão de responsividade no app inteiro** focada nos pontos onde o conteúdo encosta na borda ou some no mobile.

---

## 1. Tela `/admin/resumos` — navegação por área

**Estado atual:** chips de área no topo + todas as áreas listadas verticalmente.

**Novo fluxo:**

```text
[ /admin/resumos ]                  ← lista de áreas
  Direito Civil          56  >
  Direito Constitucional 38  >
  Direito Penal          42  >
  ...

  ↓ clicar em uma área

[ /admin/resumos?area=Direito+Civil ]  ← livros da área
  ← Voltar para áreas
  Busca por título
  [card livro 1]
  [card livro 2]
  ...
```

- Tudo na mesma rota usando estado local (`area` selecionada). Sem criar arquivo de rota novo.
- Header da tela de detalhe mostra o nome da área + botão "voltar".
- Busca por título só aparece dentro da área (procurar em 838 livros sem filtro não faz sentido).
- Lista de áreas: cards verticais grandes, fáceis de tocar no mobile, com contagem de livros e indicador de progresso (`X com resumo / Y total`).

---

## 2. Card do livro responsivo

**Problema atual:** linha em flex horizontal com capa + título + ações empilha tudo na mesma row → no 390px o botão "Gerar prévia" sai da tela.

**Layout novo:**

```text
Mobile (< 640px):
┌──────────────────────────────┐
│ [capa]  Título do livro      │
│         status · 0/0 cap.    │
│ ──────────────────────────── │
│ [   Gerar prévia        ]    │  ← botão full-width
│ [refazer] [excluir]          │
└──────────────────────────────┘

Desktop (≥ 640px): igual hoje, tudo na mesma linha.
```

- Ações descem para uma segunda linha no mobile, ocupando largura total.
- Botão principal vira `w-full` em telas pequenas.
- Texto de erro com `break-words` em vez de `truncate` para o admin ver a mensagem.

---

## 3. Revisão de responsividade do app

Varrer e ajustar os pontos críticos em mobile (390px), sem mexer em desktop:

- **`/admin/resumos`** (este redesign).
- **`AdminLayout` / `_app.admin.tsx`** — padding lateral consistente, mensagem de "acesso negado" centralizada.
- **`MobileHeader` + páginas com header próprio** (Voltar / Início) — garantir que não sobreponham conteúdo.
- **`/admin/simulados`** — mesmo padrão de botões e tabela longa que pode estourar.
- **`/oab/o-que-estudar`** — barras de progresso, busca e cards expansíveis no 390px.
- **`/resumos` (público)** e **`/resumos/$livroId`** — grade de cards e sidebar de capítulos viram drawer no mobile.
- **`/biblioteca/$slug`** — grids que devem cair pra 2 colunas em <400px.
- **`HomeGreeting` / `HomeHero`** — saudação não pode ficar maior que a viewport.

Critério aceito: nenhuma página tem scroll horizontal no 390px, nenhum botão de ação primária fica fora da tela ou cortado, todo texto longo quebra (break-words) em vez de empurrar layout.

---

## Detalhes técnicos

- Arquivo principal: `src/routes/_app.admin.resumos.tsx`.
  - Trocar `chips de área` + lista única por dois "modos" (lista de áreas / livros da área) controlados por `useState`.
  - Card vira `flex-col sm:flex-row` com ações em `flex-wrap`.
- Backend: **nenhuma mudança**. `listarLivrosParaResumo` já devolve `area`; a agregação por área é feita no client.
- Hidratação: corrigir o mismatch SSR atual do `AdminLayout` (acesso negado vs. conteúdo) — provavelmente `useAdmin` retornando valor diferente entre server e client. Vou inspecionar e padronizar.
- Sem nova migração, sem novo route, sem novo secret.