## Ajustes na Biblioteca

### 1. Botão de voltar no cabeçalho
- Em `_app.biblioteca.$slug.index.tsx`, adicionar botão de voltar (chevron/arrow) à esquerda do título no header sticky, chamando `goBack()` (que já existe e cobre "voltar de área → lista de áreas" e "voltar para /biblioteca").
- No hub `_app.biblioteca.index.tsx` o `MobileHeader` global já cuida do voltar — manter como está.

### 2. Animação em cascata ao entrar (sem skeleton de carregando)
- No hub (`_app.biblioteca.index.tsx`):
  - Card destaque "Biblioteca de Estudos" e cada card das "Outras bibliotecas" entram com `animate-fade-in` + `animation-delay` escalonado (ex.: 40ms por item, começando em 60ms).
- Na lista de áreas / livros (`_app.biblioteca.$slug.index.tsx`):
  - Remover o bloco de skeleton `animate-pulse` (áreas e livros) — renderizar direto a lista quando chegar; enquanto isso, nada (a navegação fica instantânea graças ao prefetch existente nos loaders).
  - Cada `<li>` de área e de livro recebe `animate-fade-in` com `animation-delay` baseado no índice (cap em ~12 itens para não atrasar o resto: `Math.min(idx, 12) * 30ms`).
- Reaproveitar os keyframes `fade-in` / `scale-in` já existentes em `styles.css` (sem nova dependência).

### 3. Micro-interações mais fluidas em botões e badges
- Toggle de visualização (Ordem de estudo / A–Z / Favoritos): adicionar `transition-all duration-200`, `active:scale-95`, ícone com leve `scale` quando ativo, e um sublinhado/glow no item ativo.
- Botão de favorito (coração): suavizar com `transition-transform duration-200`, `active:scale-90`, e quando favoritado animar com `animate-scale-in` no ícone.
- Botão "Carregar mais": `hover:-translate-y-0.5 active:scale-[0.98] transition-all`.
- Botão de voltar novo: estilo consistente com `MobileHeader` (pill `bg-muted/70 border`, `tap-feedback`).
- Cards de área: já têm `active:scale-[0.98]`; adicionar `hover:-translate-y-0.5` e leve glow `shadow-primary/10` no hover.

### Arquivos afetados
- `src/routes/_app.biblioteca.index.tsx` — stagger nos cards.
- `src/routes/_app.biblioteca.$slug.index.tsx` — botão voltar, remover skeletons, stagger nos itens, polir toggle/favorito/carregar mais.

### Fora de escopo
- Página de detalhe do livro (`$bookId/index`) e leitor — não foram citados.
- Mudanças de dados, queries ou rotas.
