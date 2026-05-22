## Diagnóstico do erro

`Ingest falhou: upstream request timeout` é o limite de tempo do Cloudflare Worker (~30s por request). O endpoint atual `/api/aulas-interativas-ingest` recebe TODOS os chunks do PDF (no caso do Nidal Ahmad, ~10–14 capítulos) e chama o Gemini em loop dentro de UMA única request. Cada chamada ao `gemini-2.5-flash` com 25–150k chars demora 8–25s, então a soma estoura o limite do Worker e a Cloudflare devolve `upstream request timeout` antes mesmo do segundo chunk terminar.

Não é bug do Gemini nem das chaves — é arquitetura: precisa virar 1 chunk = 1 request.

## O que vai mudar

### 1. Backend (`src/routes/api/aulas-interativas-ingest.ts`)
- Aceitar **apenas 1 chunk por chamada** (`{ tituloCurso, modulo, texto }`).
- Devolver `{ modulo: { titulo, descricao, aulas: [...] } }`.
- Mantém retry/fallback de chave já existente em `gemini.server.ts`.
- Cada request termina em ~10–20s → bem dentro do limite do Worker.

### 2. Frontend admin (`src/routes/_app.admin.aulas-interativas.tsx`)
- Após ler o PDF, fazer **um fetch por chunk em sequência** (sem paralelismo, pra não estourar rate-limit Gemini).
- Mostrar progresso vivo: "Processando capítulo 3/12 — Lei penal no tempo…".
- A cada módulo que volta, **acrescentar ao preview** em tempo real (`setEstrutura(prev => ...)`) — o usuário já vê a estrutura crescendo, com aulas e contagem de slides, ANTES de tudo terminar.
- Se um chunk falhar, mostrar toast e continuar com os próximos (não aborta tudo).

### 3. Prévia rica antes de publicar
A seção "Preview da estrutura" hoje só lista títulos. Vai ganhar:
- **Expandir aula** → mostra a lista de slides com tipo (capa, conceito, quiz…) e título de cada slide.
- **Pré-visualizar slide** → modal com o `SlidePlayer` renderizando aquele slide específico, exatamente como o aluno vai ver.
- Estatísticas no topo: total de módulos / aulas / slides / quizzes / duração estimada.
- Botões "Salvar rascunho" e "Publicar agora" continuam, mas agora a decisão é informada.

### 4. Sem mudanças em
- Schema do banco, RLS, rotas do aluno, `SlidePlayer`, função `publicarCurso`. Só o pipeline de ingestão e a UI de preview.

## Arquivos tocados
- `src/routes/api/aulas-interativas-ingest.ts` — refatorado para 1 chunk/request.
- `src/routes/_app.admin.aulas-interativas.tsx` — loop client-side + preview progressivo + modal de preview de slide.

## Resultado esperado
- Fim do `upstream request timeout`.
- Usuário vê módulos aparecendo um a um conforme a IA processa, com prévia detalhada e player real antes de publicar.
