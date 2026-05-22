## Visão geral

Criar um sistema de **flashcards públicos curados pelo admin**, gerados via IA a partir dos resumos (capítulo a capítulo) que já existem no app. Hoje a tabela `flashcards` é pessoal (1 por usuário). Vamos adicionar uma camada nova de cards globais, navegáveis por **Área → Livro → Capítulo**, com card flip, explicação didática e exemplo prático.

---

## 1. Banco (migração nova)

Tabela `flashcards_curados`:
- `id`, `resumo_livro_id`, `resumo_capitulo_id`, `ordem`
- `frente` (pergunta curta)
- `verso` (resposta direta)
- `explicacao` (parágrafo didático, tom acolhedor)
- `exemplo` (caso prático / "imagine que…")
- `dica` (mnemônico opcional)
- `area`, `materia`, `livro_titulo` (desnormalizado p/ listagem rápida)
- `created_at`, `updated_at`

Tabela `flashcards_curados_jobs` (controle de geração, igual padrão de `simulado_jobs`):
- `id`, `resumo_livro_id`, `status` (pendente/gerando/concluido/erro), `total_capitulos`, `capitulos_gerados`, `erro_msg`, `gerado_por`, timestamps

RLS:
- `flashcards_curados`: leitura pública, escrita só admin
- `flashcards_curados_jobs`: tudo só admin

Índices em `(area)`, `(resumo_livro_id, ordem)` e `(resumo_capitulo_id)`.

---

## 2. Geração via Gemini (server functions)

Arquivo novo `src/lib/flashcards-curados.functions.ts`:

- `gerarFlashcardsCapitulo({ resumo_capitulo_id })` — lê o markdown do capítulo, calcula tamanho, chama Gemini (`gemini-2.5-flash`, JSON mode) pedindo entre **5 e 35 cards** proporcional ao texto (regra: ~1 card a cada 250 palavras, mín 5, máx 35). Apaga cards antigos do capítulo e insere os novos.
- `gerarFlashcardsLivro({ resumo_livro_id })` — itera por todos os capítulos com `status='ok'` e dispara um por vez, atualizando o job.
- `listarLivrosParaFlashcards()` — admin: livros com resumo concluído + status do job de flashcards.
- `apagarFlashcardsLivro({ resumo_livro_id })`.

Prompt da IA (system):
> Você é uma professora querida que cria flashcards para a OAB. Para cada card retorne `frente` (pergunta direta), `verso` (resposta curta), `explicacao` (2–4 frases acolhedoras explicando o porquê), `exemplo` (situação prática "imagine que…") e `dica` (mnemônico opcional). Cards atômicos, sem repetição. JSON: `[{frente,verso,explicacao,exemplo,dica}]`.

Para listagem pública (sem auth):
- `listarAreasFlashcards()` — agrega `area` + contagem
- `listarLivrosArea({ area })`
- `listarCapitulosLivro({ resumo_livro_id })`
- `listarCardsCapitulo({ resumo_capitulo_id })`

---

## 3. UI Admin

Nova rota `src/routes/_app.admin.flashcards.tsx` no padrão visual de `_app.admin.resumos.tsx`:
- Lista por área → livro
- Para cada livro: status do job, botão **"Gerar flashcards"**, **"Regerar"**, **"Excluir"**
- Botão "Gerar todos da área" e "Gerar tudo" (igual fila de resumos, reusando o mesmo padrão de `resumo-queue`, em arquivo novo `flashcards-queue.ts`)
- Driver/Indicador em `src/components/admin/FlashcardsQueueDriver.tsx` + `FlashcardsQueueIndicator.tsx`, montados no `AdminQueueOverlays`

Novo card no menu `src/routes/_app.admin.index.tsx`:
- Ícone `Layers` / `Brain` → `/admin/flashcards` — "Gerar flashcards dos resumos"

---

## 4. UI Pública (PP Live)

Nova rota `src/routes/_app.flashcards-tema.tsx` (lista de áreas + livros + capítulos) usando o mesmo dataset. Renomeio mínimo: a rota atual `/flashcards` (FSRS pessoal) continua funcionando — vamos adicionar uma **aba** ou um seletor no topo da página `/flashcards`:
- **"Por tema"** (novo, default) — explora os cards curados por área/livro/capítulo, com card flip animado mostrando verso + explicação + exemplo + dica
- **"Minha revisão"** (existente, FSRS) — fluxo atual de revisão pessoal

Componente `FlashcardCurado.tsx`:
- Frente: pergunta grande, hint "tocar para virar"
- Verso (flip 3D): resposta em destaque + **Explicação** (parágrafo) + **Exemplo** (box destacado) + **Dica** (se houver)
- Botões: "Salvar na minha revisão" (cria cópia em `flashcards` pessoais c/ `fonte_tipo='resumo'`, `fonte_id=<capitulo_id>`), "Próximo", "Anterior"

Hub na home `src/routes/_app.app.tsx`:
- Nova seção **"Flashcards por tema"** abaixo de Atalhos (antes do Blog), carrossel horizontal das áreas com contagem de cards — link direto para `/flashcards?tema=<area>`

---

## 5. Detalhes técnicos

- IA: Gemini direto via `geminiGenerateContent` (regra do projeto — proibido Lovable AI Gateway)
- Modelo: `gemini-2.5-flash` (melhor qualidade para didática) com `responseMimeType: application/json`
- Streaming não necessário — geração em lote por capítulo
- Idempotência: regerar apaga e recria o conjunto do capítulo
- Animação flip: CSS 3D `transform: rotateY(180deg)` + `backface-visibility: hidden`
- Limite de tokens: capítulos grandes truncados em 12k chars no prompt

---

## Arquivos a criar/editar

**Novos:**
- migração (tabelas + RLS + índices)
- `src/lib/flashcards-curados.functions.ts`
- `src/lib/flashcards-queue.ts`
- `src/routes/_app.admin.flashcards.tsx`
- `src/components/admin/FlashcardsQueueDriver.tsx`
- `src/components/admin/FlashcardsQueueIndicator.tsx`
- `src/components/flashcards/FlashcardCurado.tsx`
- `src/components/flashcards/TemaExplorer.tsx`

**Editar:**
- `src/routes/_app.admin.index.tsx` — novo card "Flashcards"
- `src/routes/_app.flashcards.tsx` — adicionar abas Por tema / Minha revisão
- `src/routes/_app.app.tsx` — seção "Flashcards por tema" na home
- `src/components/admin/AdminQueueOverlays.tsx` — montar driver/indicator