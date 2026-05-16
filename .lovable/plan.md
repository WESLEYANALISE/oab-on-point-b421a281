## Objetivo

Limpar a home no mobile: cabeçalho enxuto com contagem regressiva em destaque, bloco principal para **Estudar / Aulas Interativas**, e abaixo um carrossel **Ferramentas de estudo** (resumos, flashcards, biblioteca, áudio-aulas) no estilo do app de referência.

## Mudanças

### 1. `HomeHero.tsx` — reduzido pela metade
Manter só o essencial no topo. Sem manchete grande, sem parágrafo longo, sem 2 botões CTA.

```
┌──────────────────────────────────────┐
│ 42º EXAME · 1ª FASE                  │
│                                      │
│ 128  09  29        [📅 Calendário] │
│ DIAS HRS MIN                         │
│                                      │
│ ─────────────────────────────        │
│ Domingo, 23 de setembro de 2026      │
└──────────────────────────────────────┘
```

- Pill "42º Exame · 1ª fase" (chip pequeno dourado)
- Countdown grande em destaque (números bem maiores, foco visual principal)
- Botão "Calendário" alinhado à direita do countdown → `/reta-final`
- Linha divisória sutil
- Data por extenso embaixo, discreta
- Padding vertical reduzido: `py-5 md:py-10` (era `py-10 md:py-16`)
- Sem headline "Passe na OAB na risca" e sem parágrafo descritivo no mobile (mantém só o essencial — a marca já está no header)

### 2. Nova seção destacada: **Estudar**
Substitui o carrossel "Estudar" atual por um **card grande único** em destaque para "Aulas Interativas" (o ponto de entrada principal):

```
┌──────────────────────────────────────┐
│ ESTUDAR                              │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ [📚]            AULAS            │ │
│ │             INTERATIVAS          │ │
│ │  Comece de onde parou →          │ │
│ │  Ética · Aula 4 · 62%            │ │
│ │  ████████░░░░░░                  │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

- Card grande full-width com gradient bordô, mais alto (~180px mobile)
- Ícone grande, título "Aulas Interativas" em display
- Funde com o "Continue de onde parou" — mostra progresso da última aula ali dentro
- CTA "Começar a estudar" → `/aulas` (ou `/materias/etica-oab` se já tem progresso)
- Remove o card "Continue de onde parou" separado (vira parte deste)

### 3. Novo carrossel: **Ferramentas de estudo**
Estilo do projeto de referência (`EstudosCarousel`): cards horizontais menores com thumb/cover + ícone + label + sublegenda.

Itens:
1. **Resumos** → `/resumos` — "Direto ao ponto"
2. **Flashcards** → `/flashcards` — "Memorize com SRS"
3. **Biblioteca** → `/biblioteca` *(rota nova, placeholder ComingSoon)* — "PDFs, livros e súmulas"
4. **Áudio-aulas** → `/audioaulas` *(rota nova, placeholder ComingSoon)* — "Estude no fone"

```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  📄     │ │  🃏     │ │  📚     │ │  🎧     │
│         │ │         │ │         │ │         │
│ Resumos │ │ Flash.. │ │ Biblio. │ │ Áudio.. │
│ Direto..│ │ Memori..│ │ PDFs... │ │ Estude..│
└─────────┘ └─────────┘ └─────────┘ └─────────┘
   ←─── scroll horizontal ───→
```

- Cards de ~150px de largura, ~170px de altura
- Topo: bloco colorido (cor por ferramenta) com ícone grande
- Rodapé: nome em bold + subtítulo cinza
- `overflow-x-auto scrollbar-hide snap-x`, padding inicial `px-4`
- Reaproveita o estilo já criado para os cards de estudo

### 4. Remover a seção **Praticar**
A pedido implícito (não foi mencionada na nova organização). Questões e simulados continuam acessíveis pela barra inferior (já tem botão "Questões") e pelo menu lateral. Remove a seção "Praticar" da home para reduzir poluição.

### 5. Reordenação final da home (mobile)

```
1. HomeHero (compacto: countdown + data + calendário)
2. Seção "Estudar" → card grande Aulas Interativas + progresso
3. Carrossel "Ferramentas de estudo" → Resumos / Flashcards / Biblioteca / Áudio-aulas
4. Carrossel "Matérias da OAB" (mantém)
5. Card Assistente IA (mantém)
6. Notícias (mantém)
```

### 6. Rotas placeholder novas
- `src/routes/_app.biblioteca.tsx` → `<ComingSoon>`
- `src/routes/_app.audioaulas.tsx` → `<ComingSoon>`
- Adicionar as duas no `MenuDrawer.tsx` (grupo "Estudar")

## Arquivos tocados

**Editados:**
- `src/components/home/HomeHero.tsx` — versão compacta
- `src/routes/_app.index.tsx` — nova ordem de seções, novo card "Estudar", carrossel "Ferramentas", remove "Praticar"
- `src/components/layout/MenuDrawer.tsx` — adiciona Biblioteca e Áudio-aulas

**Criados:**
- `src/routes/_app.biblioteca.tsx`
- `src/routes/_app.audioaulas.tsx`

## Detalhes técnicos

- Mantém TanStack file routing (`_app.biblioteca.tsx`, `_app.audioaulas.tsx`).
- Reutiliza `CountdownExame` com prop `compact` já existente, mas aumenta o tamanho dos números no hero (variante `hero`) para virarem o foco visual.
- Cards de "Ferramentas" usam mesmas classes do `StudyCardItem` atual mas com layout mais vertical e ícone grande no topo (sem precisar de imagens — só ícone + cor).
- Sem mudança no bottom nav, no MobileHeader nem no DesktopSidebar.
- Nada de assets/imagens novos — tudo com ícones lucide + tokens do design system.
