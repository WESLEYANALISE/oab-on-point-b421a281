## Problema

Hoje o fluxo tem 3 modais em sequência:

1. `PreparandoModal` — só spinner enquanto o OCR Mistral roda (10–60s, **sem logs**)
2. `PreviewModal` — confirma contagem
3. `ProgressModal` — finalmente mostra logs ao vivo

Resultado: você clica em "Gerar", a tela fica embaçada com um spinner mudo, e só depois de muito tempo aparece algo. Parece travada.

## Plano

Unificar tudo em **um único `ProgressModal` com logs ao vivo desde o clique em "Gerar"**, eliminando o modal de prévia.

### 1. Backend (`src/lib/simulados-admin.functions.ts`)

- Criar **`iniciarJob(provaNumero)`** — retorna `{ jobId }` imediatamente, sem fazer OCR. Apenas:
  - cria/atualiza linha em `simulados` com `status='gerando'`, `etapa='ocr'`, `logs=[]`
  - registra `provaNumero` no job
- Criar **`executarOcr(jobId)`** — server fn separada chamada pelo cliente:
  - baixa PDFs, chama Mistral OCR (prova + gabarito)
  - **escreve logs incrementais** em `simulados.logs` a cada passo ("Baixando prova...", "OCR prova: 8420 chars", "OCR gabarito: 1240 chars", "Detectadas 80 questões em 6 matérias")
  - ao terminar, grava `total_estimado`, `batches_total`, `etapa='gerando'`
- Manter `processarBatch` e `getJobStatus` como estão (já fazem logs por lote via Gemini).
- Remover `prepararSimulado` e `iniciarGeracao` (não são mais necessários — viram `iniciarJob` + `executarOcr`).

### 2. Frontend (`src/routes/_app.admin.simulados.tsx`)

- **Remover** `PreparandoModal` e `PreviewModal`.
- Botão "Gerar" chama `iniciarJob` → recebe `jobId` → seta `activeJobId` na hora → `ProgressModal` abre imediatamente.
- Dentro do `ProgressModal`:
  - já no `useEffect` inicial, dispara `executarOcr(jobId)` uma vez (com guard `runningRef`)
  - polling de `getJobStatus` a cada 1.5s mostra os logs sendo escritos em tempo real
  - quando `etapa === 'gerando'`, o loop existente de `processarBatch` continua naturalmente
  - header do modal mostra etapa atual: "OCR" / "Gerando questões" / "Concluído"
- Barra de progresso fica indeterminada (animada) durante OCR; vira `feitas/total` quando começam os lotes.

### 3. UX

- Modal aparece em <500ms após clicar "Gerar".
- Primeiro log visível em ~1s ("Baixando PDF da prova...").
- Sem confirmação intermediária — se quiser cancelar, botão "Cancelar geração" continua disponível.

## Arquivos afetados

- `src/lib/simulados-admin.functions.ts` (refatorar fluxo)
- `src/routes/_app.admin.simulados.tsx` (remover 2 modais, simplificar)
