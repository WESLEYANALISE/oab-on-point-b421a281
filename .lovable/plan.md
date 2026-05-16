## Objetivo

Refazer `src/routes/_app.index.tsx` (rota `/`) com o layout exato da "Área OAB" mostrado nos prints e descrito no MD: countdown, Fases do Exame, Atalhos, Notícias e Ferramentas de estudo. Paleta vinho/dourado já existente. Mobile-first (390×844).

## Estrutura da página (`_app.index.tsx`)

```
Header compacto (ÁREA OAB + Buscar)
  ↓
CountdownHero (46º EOU · Calendário · DIAS HRS MIN · data por extenso)
  ↓
SectionHeader "Fases do Exame"
  Grid 2 col: card 1ª Fase + card 2ª Fase (capas geradas, badge OAB, CTA dourado)
  ↓
SectionHeader "Seus Atalhos OAB"
  Grid 4 col: Biblioteca · Simulados · Questões · Videoaulas
  ↓
SectionHeader "Notícias da OAB" + pílula "Ver todas"
  Carrossel embla horizontal com getNoticias() existente
  ↓
SectionHeader "Ferramentas de estudo"
  Grid 2 col x 4 linhas: 1ª Fase · 2ª Fase · O que estudar · Calendário OAB ·
                          Cronograma · Flashcards · Peça-modelo
```

## Capas (gerar com IA)

- `src/assets/oab-primeira-fase-cover.webp` — alvo dourado com flechas, livros jurídicos ao fundo, tom vinho escuro, cinematográfico.
- `src/assets/oab-segunda-fase-cover.webp` — advogado jovem de terno escrevendo numa peça, mesa de madeira, luz quente.
- Proporção 3:4, importadas como ES module, `loading="eager"` no LCP.

## Rotas placeholder "Em breve"

Criar arquivos novos enxutos (cada um com `head()` próprio e card centralizado "Em breve · voltar"):

- `src/routes/_app.oab.primeira-fase.tsx` → `/oab/primeira-fase`
- `src/routes/_app.oab.segunda-fase.tsx` → `/oab/segunda-fase`
- `src/routes/_app.oab.o-que-estudar.tsx` → `/oab/o-que-estudar`
- `src/routes/_app.oab.calendario.tsx` → `/oab/calendario`
- `src/routes/_app.oab.cronograma.tsx` → `/oab/cronograma`
- `src/routes/_app.oab.peca-modelo.tsx` → `/oab/peca-modelo`

Componente único reutilizado `EmBrevePage({ titulo, descricao })` em `src/components/oab/EmBrevePage.tsx`.

Atalhos do "Seus Atalhos OAB" reaproveitam rotas já existentes:
- Biblioteca → `/biblioteca`
- Simulados → `/simulados`
- Questões → `/questoes`
- Videoaulas → `/aulas`

Flashcards no grid de ferramentas → `/flashcards` (já existe).

## Componentes novos

- `src/components/oab/OABHeader.tsx` — header compacto com Voltar (oculto na home), título ÁREA OAB + Gavel, botão Buscar (dispara evento `open-pesquisar-sheet`, mesmo padrão atual).
- `src/components/oab/OABCountdownHero.tsx` — refatora o `CountdownExame` atual para o visual exato do print (badge dourado "46º EOU", botão Calendário, 3 blocos grandes DIAS/HRS/MIN, divisor, linha com data por extenso). Mantém o lazy init que já corrigimos.
- `src/components/oab/OABFasesGrid.tsx` — 2 cards 3:4 com capa, badge "OAB", gradiente preto na base, CTA circular dourado.
- `src/components/oab/OABAtalhosGrid.tsx` — 4 botões quadrados, gradiente vinho, ícone num quadrado dourado.
- `src/components/oab/OABNoticiasSection.tsx` — usa `getNoticias()` atual + embla carousel, badge fonte azul, badge data inferior.
- `src/components/oab/OABFerramentasGrid.tsx` — 2 col, ícone + título + subtítulo.

Todos consumindo tokens semânticos de `src/styles.css` (vinho `--background`, `--primary`, `--gold`, `--gold-foreground`, `--font-display`). Sem cores hardcoded.

## Arquivos editados

- `src/routes/_app.index.tsx` — substituído pelo novo layout (remove cards "Aulas Interativas", "Plano de Estudo", "Ferramentas de estudo" antigos).
- `src/styles.css` — adicionar 1–2 tokens se faltarem (`--vinho-card`, `--gold-soft`). Fonte Playfair Display garantida via `@import`.

## O que NÃO entra (conforme respostas)

- Sem cron / edge function / tabela `noticias_oab_cache` — Notícias usam dados já existentes do app.
- Sem nova lógica de Supabase além do que já existe.
- Sem tabela `oab_calendario` — countdown usa a data do próximo exame já configurada no `CountdownExame` (constante existente).

## Verificação

Após implementar: abrir o preview no viewport 390×844, comparar cada seção contra `image-19.png` e `image-20.png`, ajustar espaçamentos/raio/sombras até bater. Conferir build limpo (sem imports quebrados nas novas rotas).
