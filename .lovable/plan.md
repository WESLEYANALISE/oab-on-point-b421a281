# 1ª Fase OAB — Hub de estudo

Transformar a rota `/_app/oab/primeira-fase` (hoje apenas `ComingSoon`) num hub completo, hierárquico e elegante.

## Estrutura da página

```text
┌──────────────────────────────────────────────┐
│ HERO (gradient-toga)                         │
│ ← Voltar                                     │
│ 1ª FASE OAB                                  │
│ "Frase motivacional do dia"                  │
│                                              │
│ [🔥 12 dias seguidos] [🎯 74% acerto]        │
│ [📚 38% do edital]   [⏱ 22h esta semana]    │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ MEU PLANO DE ESTUDO                          │
│ Escolha duração: [15] [30] [45] [60] [90][365]│
│ Horas por dia:   [— 2h +]   Estudo hoje: 2h  │
│ ▸ Próxima sessão: Direito Civil · 45 min     │
│ [Ver plano completo →]                        │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ TRILHA DE ESTUDO                             │
│                                              │
│ ●═══════════════════ (timeline vertical)     │
│ │                                            │
│ │ ┌────────────────────────────────────┐    │
│ │ │ 🎬 AULAS (card principal grande)   │    │
│ │ │ Videoaulas por matéria · 46º exame │    │
│ │ │ [Continuar de onde parou →]        │    │
│ │ └────────────────────────────────────┘    │
│ │                                            │
│ ● ┌──────────────────┐                       │
│ │ │ 📖 O que estudar │                       │
│ │ └──────────────────┘                       │
│ │                                            │
│ ● ┌──────────────────┐                       │
│ │ │ 🃏 Flashcards    │                       │
│ │ └──────────────────┘                       │
│ │                                            │
│ ● ┌──────────────────┐                       │
│ │ │ ✍ Questões       │                       │
│ │ └──────────────────┘                       │
│ │                                            │
│ ● ┌──────────────────┐                       │
│ │ │ 📕 Caderno erros │                       │
│ │ └──────────────────┘                       │
│ │                                            │
│ ● ┌──────────────────┐                       │
│   │ 🔁 Reforço       │                       │
│   └──────────────────┘                       │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ MEU PROGRESSO          [aba: Matérias|Geral] │
│ Barras de % por matéria do edital            │
│ + Streak chart (últimos 14 dias)             │
└──────────────────────────────────────────────┘
```

## Implementação

**Arquivos novos**
- `src/routes/_app.oab.primeira-fase.tsx` — substitui o `ComingSoon`. Página inteira.
- `src/components/primeira-fase/StatsHero.tsx` — header com streak, % acerto, % edital, horas semanais, frase motivacional rotativa.
- `src/components/primeira-fase/PlanoCard.tsx` — selector de duração (15/30/45/60/90/365 dias) + stepper de horas/dia + preview da próxima sessão.
- `src/components/primeira-fase/TrilhaTimeline.tsx` — timeline vertical com card grande "Aulas" no topo e demais cards em sequência conectados por linha.
- `src/components/primeira-fase/ProgressoTabs.tsx` — alternância "Matérias / Geral" com barras de progresso e mini-chart de streak.
- `src/lib/plano-estudo.ts` — gera distribuição de matérias/dia a partir das 17 matérias do edital (`MATERIAS_OAB_46`), duração e horas/dia. Função pura, sem backend.
- `src/lib/streak.ts` — persistência local (`localStorage`) de dias acessados, último acesso, frase motivacional do dia.
- `src/routes/_app.oab.caderno-erros.tsx` — placeholder funcional (lista de questões erradas, vazio por enquanto).
- `src/routes/_app.oab.reforco.tsx` — placeholder funcional (matérias com menor % de acerto).

**Arquivos editados**
- `src/components/layout/DesktopSidebar.tsx` e `src/components/layout/MenuDrawer.tsx`: opcional, adicionar atalho "1ª Fase" se já não estiver.

## Comportamento das funções

**Streak** (`src/lib/streak.ts`)
- Lê `localStorage["pf_streak"]` no mount: `{ dias: number, ultimoAcesso: ISODate }`.
- Se `ultimoAcesso` é ontem → `dias + 1`. Se é hoje → mantém. Se > 1 dia → reseta para 1.
- Salva e devolve `dias`.

**% acerto** — agrega de `simulado_tentativas` (já existe) via Supabase: soma `acertos / total` das últimas 30 tentativas. Server fn `getStatsPrimeiraFase()` com `requireSupabaseAuth`.

**% edital** — derivado do localStorage de matérias marcadas como "estudadas" (campo novo) ou heurística simples: nº de matérias com pelo menos 1 tentativa / 17.

**Plano de estudo** (`src/lib/plano-estudo.ts`)
- Input: `{ dias: 15|30|45|60|90|365, horasPorDia: number }`.
- Output: array `{ data: Date, materia: Materia, minutos: number, tipo: "aula"|"questoes"|"revisao" }[]`.
- Distribui as 17 matérias proporcionalmente ao peso `questoes.max` no exame.
- Persiste escolha em `localStorage["pf_plano"]` para a próxima sessão sempre aparecer na home.

**Frases motivacionais** — array de 30 frases em `src/lib/motivacao.ts`, seleção determinística por dia do ano.

## Links dos cards da trilha

- Aulas → `/aulas`
- O que estudar → `/oab/o-que-estudar`
- Flashcards → `/flashcards`
- Questões → `/provas` (banco de questões por prova)
- Caderno de erros → `/oab/caderno-erros` (novo)
- Reforço → `/oab/reforco` (novo)

## Estilo

- Paleta: `bg-gradient-toga` para o hero (igual ao top card da home).
- Cards: `border-gold/15`, `bg-card` ou `bg-gradient-to-br` em vinho para o card principal de Aulas.
- Timeline: linha vertical `bg-gold/25` à esquerda com bolinhas douradas `bg-gold` em cada card.
- Numerais tabulares para os stats. Animação leve `hover:-translate-y-0.5` nos cards.
- Mobile-first 390px, com grid `md:grid-cols-2` na timeline a partir do tablet (mantendo Aulas full-width no topo).

## Fora de escopo desta entrega

- Persistência do plano de estudo em Supabase (fica em localStorage por enquanto).
- IA gerando plano dinâmico — distribuição é determinística baseada no peso das matérias.
- Implementação completa do Caderno de erros e Reforço (entram como rotas funcionais com layout pronto, mas listagem real virá depois).
