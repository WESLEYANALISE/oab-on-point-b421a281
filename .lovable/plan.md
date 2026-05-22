## 1. Erro do Ética Profissional — JSON truncado (`Expected ',' or '}' at position 85718`)

**O que está acontecendo:** o Gemini está sendo obrigado a devolver TODA a estrutura do curso (módulos + aulas + slides + quizzes) em uma única resposta JSON. Para o Ética (texto longo) a saída ultrapassa o teto de `maxOutputTokens: 32000` e o JSON é cortado no meio de uma string → `JSON.parse` falha exatamente no caractere onde a resposta acabou.

**Correção (em `src/routes/api/aulas-interativas-preview.ts`):** trocar a chamada única do Gemini por **geração em 2 passes**, mantendo o mesmo endpoint SSE:

1. **Pass 1 — "esqueleto":** pede ao Gemini só `titulo_sugerido`, `materia_sugerida` e a lista de módulos com `{titulo, descricao, aulas:[{titulo, descricao, duracao_min}]}` (sem slides). Resposta pequena, cabe folgada nos 32k tokens.
2. **Pass 2 — "slides por aula":** para cada aula do esqueleto, faz uma chamada separada pedindo só os slides daquela aula (3-10 slides + 1 quiz). Cada resposta fica em algumas centenas de tokens, eliminando o risco de truncamento.
3. O servidor monta a estrutura final juntando esqueleto + slides e salva normalmente em `aulas_interativas_previas`.

**Eventos SSE atualizados:**
- `start` — começou
- `progress` — agora envia `{fase: "esqueleto"|"slides", aula: N, total: M, chars}` para a UI mostrar `Gemini gerando aulas… 7/15`
- `done` — estrutura final
- `error` — mensagem

**Fallback de robustez:** se mesmo assim algum parse falhar, tenta reparar o JSON cortando até a última chave `}` válida antes de descartar.

## 2. Erro do Filosofia do Direito — "Stream encerrou sem resposta final"

**O que está acontecendo:** o servidor emitiu `error` (provavelmente o mesmo `JSON.parse` falhando), mas o Cloudflare cortou o stream antes do evento chegar ao navegador. O cliente vê o stream terminar sem `done` nem `error` e mostra a mensagem genérica.

**Correção:**
- Como o pass 2 acima faz cada chamada ficar curta, o problema deixa de acontecer na prática.
- Além disso, sempre que o handler entra em `catch`, **gravar `erro_msg` no banco antes de tentar enviar o evento** (já existe esse update, vou garantir que vem ANTES do `send("error", …)` e do `controller.close()`).
- No cliente (`rodarPrevia` em `src/routes/_app.admin.aulas-interativas.tsx`): quando o stream encerra sem `done`/`error`, fazer **um GET na extração/arquivo** (`obterPreviaArquivo` + status do arquivo) para ler o `erro_msg` real e mostrar para o usuário em vez de "Stream encerrou sem resposta final".

## 3. Selecionar/apagar imagens individuais da prévia

Hoje a tira de miniaturas é só visualização. Vou transformar cada miniatura em **selecionável** (clique marca/desmarca), e adicionar um botão **"Apagar selecionadas"** que só aparece quando há algo marcado.

**Front (`src/routes/_app.admin.aulas-interativas.tsx`, bloco `{temExtracao && …}` por volta da linha 539):**
- Cada thumbnail vira um `<button>` com um checkbox sobreposto. Estado local `selecionadas: Set<string>` por arquivo.
- Mostra todas as imagens (não só 8), com scroll horizontal se passarem da largura.
- Botão "Abrir" continua disponível com um ícone pequeno por cima da miniatura (link target=_blank).
- Quando há ≥1 selecionada: aparece `Apagar N selecionada(s)` ao lado do botão "Apagar extração", e um `Selecionar todas` / `Limpar seleção`.

**Back (novo server fn em `src/lib/aulas-interativas-drive.functions.ts`):**
- `apagarImagensExtracao({ arquivoDriveId, urls: string[] })`:
  1. Lê o registro mais recente em `aulas_interativas_extracoes` (`id`, `imagens`, `paginas`, `markdown`).
  2. Remove as URLs marcadas do array `imagens`.
  3. Para cada URL apagada, remove a referência `![…](URL)` do `markdown` (substitui pela string vazia ou por `[imagem removida]`).
  4. Para cada página em `paginas`, se houver `imagens: string[]`, filtra as URLs apagadas.
  5. Faz `update` na linha de extração com `imagens`, `markdown` e `paginas` atualizados.
  6. Tenta apagar os arquivos do bucket de storage (`storage.from(bucket).remove(paths)`) — extrai o `path` da URL pública. Se a remoção física falhar, ignora silenciosamente (a URL já não está mais referenciada).
  7. **Invalida a prévia existente** (`delete from aulas_interativas_previas where arquivo_drive_id = …`) e volta o `status_ingestao` para `extraido`, porque a estrutura anterior pode citar imagens que não existem mais.

**UI após apagar:** toast "N imagens removidas. Gere a prévia novamente.", `invalidateQueries` em extração + prévia + lista.

## Resumo do que muda

| Arquivo | Mudança |
|---|---|
| `src/routes/api/aulas-interativas-preview.ts` | Reescrita para geração em 2 passes (esqueleto + slides por aula), eventos `progress` com fase, gravar `erro_msg` antes do `send("error")` |
| `src/lib/aulas-interativas-drive.functions.ts` | Novo `apagarImagensExtracao` |
| `src/routes/_app.admin.aulas-interativas.tsx` | Miniaturas selecionáveis + botão "Apagar selecionadas"; progresso da prévia mostra `fase/aula`; fallback que lê `erro_msg` quando o stream cai |

Sem alterações de schema do banco — `imagens`, `paginas` e `markdown` já existem em `aulas_interativas_extracoes`.