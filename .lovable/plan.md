# Aulas OAB 1ª Fase — Plano de implementação

Sistema de estudo guiado, fiel ao print enviado: o usuário escolhe a matéria, depois o módulo, depois um subtema, e percorre uma trilha linear de 8 passos com bloqueio progressivo. Cada passo gera dados (erros, flashcards, tentativas) que alimentam o próximo.

## Decisões (tomadas com base nos defaults sensatos do projeto)

- **Origem dos módulos/subtemas:** mapa estático em TypeScript (`src/data/aulas-oab.ts`) derivado do `MATERIAS_OAB_46` e do edital. Cada subtema referencia um `resumo_capitulo` existente (via `livro_slug` + `ordem`). Vantagem: zero latência, fácil de evoluir, sem dependência de IA para a estrutura. Pode virar tabela depois.
- **Questões (Rodada 1, 2 e Simulado):** **híbrido**. Primeiro filtra `simulado_questoes` por `materia` (já existe). Se faltar para fechar a meta (8/12/20), Gemini gera questões inéditas específicas do subtema e salva em uma nova tabela `aulas_questoes_geradas` para reuso.
- **Aula explicativa (passo 1):** usa o `resumo_capitulos.conteudo_markdown` já gerado + 3 botões de IA sob demanda (streaming Gemini): "Explicar melhor", "Exemplo prático", "Linguagem simples". Aproveita `gemini.server.ts`.
- **Flashcards:** gerados sob demanda na primeira vez que o usuário chega ao passo 2, salvos em `flashcards` com `fonte_tipo='aula_subtema'` e `fonte_id=<subtema_slug>`. Revisão usa FSRS já implementado.
- **Caderno de erros:** usa `erros_questao` filtrando por `materia` e por um novo campo `aula_subtema_slug` (nullable, adicionado por migration).

## Fluxo do usuário

```text
/aulas                              → grid das 17 matérias (igual cards de matéria atuais)
/aulas/$materia                     → lista de módulos da matéria (print 1)
/aulas/$materia/$modulo             → lista de subtemas do módulo (print 2)
/aulas/$materia/$modulo/$subtema    → trilha vertical de 8 passos (print 3/4)
  passo=1 → Ler o resumo (resumo + IA)
  passo=2 → Revisar com flashcards
  passo=3 → Questões Rodada 1
  passo=4 → Caderno de Erros Rodada 1
  passo=5 → Questões Rodada 2 (só as erradas)
  passo=6 → Simulado do Subtema
  passo=7 → Caderno de Erros do Simulado
  passo=8 → Feedback do Subtema
```

Cada passo só desbloqueia quando o anterior está "concluído" (registro em `aulas_progresso`).

## Arquitetura técnica

### 1. Dados estáticos

`src/data/aulas-oab.ts`:
```text
type Subtema  = { slug, titulo, resumoLivroSlug, capituloOrdem, nivel }
type Modulo   = { slug, titulo, nivel: 'iniciante'|'intermediario'|'avancado', subtemas: Subtema[] }
type MateriaAula = { materiaId, modulos: Modulo[] }
```
Construído manualmente a partir do edital, com referência ao livro de resumo correspondente já no banco (`resumo_livros.biblioteca_slug + livro_id`). Começamos com 3 matérias-piloto (Constitucional, Administrativo, Civil) e expandimos.

### 2. Banco de dados (1 migration)

Novas tabelas, todas com RLS:
- `aulas_progresso` (user_id, subtema_slug, passo_atual, passos_concluidos jsonb, atualizado_em) — escopo por usuário.
- `aulas_questoes_geradas` (id, subtema_slug, enunciado, alternativas jsonb, resposta_correta, justificativa, tipo: 'rodada'|'simulado', created_at) — leitura pública, escrita só por server fn admin.
- `aulas_tentativas` (id, user_id, subtema_slug, passo: 'rodada1'|'rodada2'|'simulado', respostas jsonb, acertos, total, concluido_em) — escopo por usuário.
- Coluna nova em `erros_questao`: `aula_subtema_slug text NULL`.

### 3. Server functions (Gemini direto, conforme memória do projeto)

`src/lib/aulas.functions.ts`:
- `getSubtemaConteudo({ subtemaSlug })` → resumo do capítulo + status de progresso.
- `explicarAula({ subtemaSlug, modo: 'melhor'|'exemplo'|'simples', trecho? })` → streaming Gemini.
- `gerarFlashcardsSubtema({ subtemaSlug })` → gera 10 cards via Gemini, insere em `flashcards`. Idempotente.
- `montarRodadaQuestoes({ subtemaSlug, alvo: 8 })` → busca em `simulado_questoes` por matéria; se faltar, dispara `gerarQuestoesIA` para completar.
- `gerarQuestoesIA({ subtemaSlug, quantidade, tipo })` → Gemini gera questões 4-alternativas no formato OAB, salva em `aulas_questoes_geradas`.
- `responderQuestao({ tentativaId, questaoId, alternativa })` → grava resposta, se errar insere em `erros_questao` com `aula_subtema_slug`.
- `concluirPasso({ subtemaSlug, passo })` → avança `aulas_progresso`.
- `getFeedbackSubtema({ subtemaSlug })` → agrega tudo (acerto rodada 1, 2, simulado, tempo gasto, pontos fracos) + parágrafo motivacional via Gemini.

### 4. Rotas (TanStack)

- `src/routes/_app.aulas.tsx` (substitui ComingSoon) — grid de matérias.
- `src/routes/_app.aulas.$materia.tsx` — hero da matéria + módulos (visual do print 1).
- `src/routes/_app.aulas.$materia.$modulo.tsx` — header com badge nível + lista de subtemas com progresso ring (print 2).
- `src/routes/_app.aulas.$materia.$modulo.$subtema.tsx` — trilha vertical de 8 passos com timeline (visual do print 3/4).
- `src/routes/_app.aulas.$materia.$modulo.$subtema.passo.$passo.tsx` — tela do passo ativo (resumo, flashcards, questões, etc.).

Todas com `head()` (SEO), `errorComponent` e `notFoundComponent`.

### 5. Componentes novos

`src/components/aulas/`:
- `ModuloCard.tsx` — card roxo com gradiente do print 1.
- `SubtemaCard.tsx` — círculo numerado + barra de progresso vermelha.
- `TrilhaPasso.tsx` — item da timeline com estados: ativo (vermelho), concluído (verde), bloqueado (cinza+cadeado).
- `passos/PassoResumo.tsx` — markdown + dock IA flutuante (3 ações).
- `passos/PassoFlashcards.tsx` — reuso do componente de revisão SRS já existente.
- `passos/PassoQuestoes.tsx` — UI de questão única com feedback inline (compartilhado entre rodada1/2/simulado).
- `passos/PassoCadernoErros.tsx` — lista de erros com explicação contextual via IA por questão.
- `passos/PassoFeedback.tsx` — gráfico de evolução + recomendação.

### 6. Integração com home

Atualizar `/oab/primeira-fase`: o card "Aulas" no `TrilhaTimeline` já aponta para `/aulas` — mantém. Acrescenta atalho rápido "Continuar de onde parou" lendo a última entrada de `aulas_progresso`.

## Entrega faseada (mesmo cycle, ordem de execução)

1. Migration + tipos Supabase.
2. `src/data/aulas-oab.ts` com 3 matérias piloto (Constitucional, Administrativo, Civil) cobrindo ~9 módulos e ~30 subtemas.
3. Server functions + integração Gemini.
4. Rotas + componentes na ordem do fluxo (matéria → módulo → subtema → passos).
5. Bloqueio progressivo, persistência de progresso, caderno de erros, feedback final.
6. Polimento visual fiel aos prints (roxo do gradiente nos módulos, círculos numerados nos subtemas, timeline vermelha nos passos).

## Notas

- Reaproveitamento máximo: `flashcards` + FSRS, `erros_questao`, `simulado_questoes`, `resumo_capitulos`, `gemini.server.ts`, `SmartImage`, `SkeletonCard`.
- Sem Lovable AI Gateway — só Gemini direto (`GEMINI_API_KEY`), conforme memória.
- Streaming via SSE no `explicarAula` para sensação de "professor explicando".
- Após o piloto de 3 matérias, expandir o dataset estático é trabalho de conteúdo, não de código.
