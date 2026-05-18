
# Praticar — Flashcards e Questões por Artigo (Gemini)

## O que vai acontecer ao clicar em "Praticar"

Sobe um card de baixo para cima (bottom-sheet animado) com duas opções grandes:
- **Flashcards** — revisão rápida com flip
- **Questões** — prática estilo OAB (mistura múltipla escolha + V/F)

Se o conteúdo já estiver gerado e salvo, abre na hora. Se não, a Profa. Ana (Gemini) gera enquanto a pessoa vê uma tela de "preparando suas questões…". Uma vez gerado, fica salvo no Supabase e qualquer outra pessoa que entrar naquele artigo abre instantaneamente.

## Quantidade dinâmica (depende do tamanho do artigo)

Calculada a partir do número de caracteres do `texto` do artigo:
- Até ~400 chars → **10 questões** / **20 flashcards**
- 400–900 → **15 questões** / **25 flashcards**
- 900–1800 → **20 questões** / **30 flashcards**
- > 1800 → **30 questões** / **35 flashcards**

## Questões

- Mistura **múltipla escolha (4 alternativas)** e **verdadeiro/falso**, com explicação após responder.
- Ordem cronológica de aprendizado: começa pelo básico (literalidade do artigo), evolui para interpretação, e termina em casos práticos/pegadinhas estilo OAB.
- Tela de prática: progresso (3/20), feedback imediato com cor (verde/vermelho), explicação curta da Profa. Ana, botão "Próxima".
- Ao fim: tela de resultado com acertos, % e botões "Refazer" / "Ver histórico".

## Flashcards

- Frente: pergunta curta.
- Verso (após flip animado 3D): resposta direta.
- **Abaixo do card**: bloco de "Exemplo prático" (só aparece após o flip).
- Botão "Próximo" avança para o próximo card. Contador no topo (5/30).

## Histórico e desempenho

- **Por artigo**: ao abrir Questões, mostra um botão "Histórico" no topo com a última tentativa (data, acertos/total, %) e mini-gráfico de evolução das últimas 5 tentativas.
- **Geral do usuário**: nova seção no Perfil ("Meu desempenho") com gráfico de acertos por matéria/lei e total de questões praticadas.

## Cache compartilhado

- Conteúdo gerado uma vez por artigo fica salvo nas colunas `questoes` e `flashcards` (jsonb) já existentes em `vade_mecum_artigos`. Reuso para todos os usuários.
- Tentativas e histórico são por usuário (novas tabelas).

---

## Detalhes técnicos

### Banco (migration)

Reaproveitar `vade_mecum_artigos.questoes` e `vade_mecum_artigos.flashcards` como cache compartilhado (jsonb com array de itens + metadata `{ gerado_em, modelo, total }`).

Novas tabelas:
- `vade_mecum_pratica_tentativas` — `id, user_id, artigo_id, lei_id, modo ('questoes'|'flashcards'), acertos, total, respostas jsonb, iniciado_em, concluido_em` + RLS `auth.uid() = user_id`.
- (Flashcards usa a tentativa só pra contagem; sem SRS aqui, pra não complicar.)

Índices: `(user_id, artigo_id, concluido_em DESC)` e `(user_id, concluido_em DESC)` para dashboard geral.

### Server functions (`createServerFn`, Gemini direto)

Arquivo `src/lib/artigo-pratica.functions.ts`:
- `gerarQuestoesArtigo({ artigoId })` — se `vade_mecum_artigos.questoes` já tem dados válidos, retorna. Senão, chama Gemini `gemini-2.5-flash` via `GEMINI_API_KEY` com prompt estruturado (JSON schema: array de `{ tipo, enunciado, alternativas?, correta, explicacao, dificuldade }`), salva e retorna.
- `gerarFlashcardsArtigo({ artigoId })` — idem para flashcards (`{ frente, verso, exemplo }`).
- `salvarTentativa({ artigoId, modo, respostas, acertos, total })` — protegida por `requireSupabaseAuth`.
- `getHistoricoArtigo({ artigoId })` e `getDesempenhoGeral()` — leituras protegidas.

Prompts pedem progressão de dificuldade explícita (básico → intermediário → avançado/pegadinha) e contagem dinâmica conforme tamanho do artigo.

### UI (frontend)

Em `src/routes/_app.vade-mecum.estatutos.$slug.tsx`:
- Novo componente `PraticarSheet` (bottom-sheet com `framer-motion`, swipe-down pra fechar) que abre ao clicar no botão "Praticar" do menu inferior.
- Duas rotas/overlays internos:
  - `QuestoesOverlay` — header com botão "Histórico", card de questão, alternativas, feedback, explicação, tela final.
  - `FlashcardsOverlay` — card com flip 3D (CSS `transform-style: preserve-3d` + `rotateY`), exemplo abaixo, botão "Próximo".
- Skeleton/loading "Profa. Ana está preparando…" enquanto gera.
- Toast amigável em caso de erro (rate limit Gemini, etc.).

No Perfil (`src/routes/_app.perfil.tsx` ou equivalente): nova aba/seção "Meu desempenho" com `recharts` (gráfico de barras por matéria + linha de evolução).

### Animações
- Bottom-sheet: `slide-up` + backdrop fade.
- Flip: `rotateY 180deg`, 500ms cubic-bezier.
- Transição entre questões: fade + slide horizontal sutil.

### Design
- Reusa tokens existentes (gold para destaques, dark surface). Sem cores hardcoded.
- Mobile-first (viewport 390px é prioridade — usuário está no mobile).

---

## Fora do escopo desta entrega
- Spaced repetition (SRS) para flashcards.
- Comparar com outros usuários / ranking.
- Edição manual das questões geradas (admin).

Quer que eu siga com essa proposta?
