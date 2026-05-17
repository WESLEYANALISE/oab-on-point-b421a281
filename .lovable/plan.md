## Diagnóstico

Olhando o histórico no card (vários itens marcados com `×`):

- `ResumoQueueDriver` chama `resumoQueue.finishAtual("erro", msg)` quando dá qualquer erro (timeout do Gemini, 503, "sem capítulos", limite de iterações).
- `finishAtual` apenas move o item pro histórico — **não devolve à fila**. Por isso eles ficam parados como erro permanente, mesmo quando o erro é transitório (timeout/rate-limit).
- O toast informa o erro mas não mostra quantos itens ainda faltam, então não dá pra acompanhar o progresso global.

## O que vou mudar

Tudo no frontend (driver + store + indicator). Sem mexer nas server functions.

### 1. `src/lib/resumo-queue.ts`
- Adicionar campo opcional `attempts?: number` em `PreviaJob` e `CapitulosJob` (default 0).
- Novo método `resumoQueue.retryAtual(erro: string, maxAttempts = 3)`:
  - Se `(atual.attempts ?? 0) + 1 < maxAttempts` → re-enfileira o item **no fim da fila** com `attempts` incrementado, limpa `atual`, e grava no histórico um registro `status: "erro"` com sufixo `"(reenfileirado, tentativa N/3)"` pra ficar visível.
  - Caso contrário → comporta-se como `finishAtual("erro", erro)` atual (desiste).
- Persistência continua igual (já é JSON).

### 2. `src/components/admin/ResumoQueueDriver.tsx`
- No `catch` do efeito que dirige o item atual, trocar `resumoQueue.finishAtual("erro", msg)` por `resumoQueue.retryAtual(msg, 3)`.
- Mesma troca nos dois caminhos de erro determinístico que hoje finalizam como erro mas podem ser transitórios:
  - `"sem capítulos"` (prévia retornou 0) — também re-tenta até 3x, pois às vezes o OCR/Gemini devolve sumário vazio em uma corrida ruim.
  - `"limite de iterações"` no loop de capítulos — re-enfileira pra continuar de onde parou (o próximo `gerarProximoCapitulo` retoma do ponto correto via banco).
- Após `retryAtual`, o `toast.error` passa a mostrar: `"<titulo>: <msg> · tentativa N/3 — voltou pra fila (X restantes)"`, usando `state.fila.length + 1`.
- Quando um item é concluído com sucesso, mostrar toast `"✓ <titulo> · X restantes na fila"` (hoje só diz "Resumo concluído"). Idem para prévia.

### 3. `src/components/admin/ResumoQueueIndicator.tsx`
- Já mostra `totalRestante`. Adicionar uma linha pequena no histórico que diferencia:
  - `reenfileirado` (erro temporário, vai tentar de novo) — ícone `RotateCcw` âmbar
  - `erro` final (esgotou 3 tentativas) — ícone vermelho atual
  - Para isso, basta usar o `erro` string do registro: se contém `"reenfileirado"`, renderiza com cor âmbar e ícone diferente.
- Mostrar contador "Reenfileirados (1h)" ao lado de "Concluídos (1h)" / "Erros (1h)" pra dar visibilidade de quanto está sendo re-tentado.

## Notas técnicas

- `attempts` fica no item da fila, então sobrevive a reload (já está no localStorage).
- A retomada de capítulos é segura porque `gerarProximoCapitulo` consulta o banco pra saber o próximo capítulo pendente — nunca duplica.
- Para prévia, re-tentativa apenas re-executa OCR + sumário; se já tinha gerado um `resumo_livro_id`, a server function faz upsert (verifiquei o fluxo anterior). Sem efeito colateral além de chamar Mistral de novo.
- Cap de 3 tentativas evita loop infinito quando o livro tem problema real (PDF corrompido, link do Drive privado etc.).

## Fora de escopo

- Backoff entre re-tentativas (a fila já tem outros itens entre, e Gemini/Mistral já têm retry interno por chamada).
- Mudar server functions (Gemini já tem retry 5x com backoff, Mistral 6x).