## Diagnóstico da falha (Prova 46)

O registro do simulado 46 está em `status: 'gerando'` com `erro_msg: null`. Isso significa que o `try/catch` **nunca rodou o catch** — ou seja, o Worker foi morto pelo limite de tempo da Cloudflare antes do Mistral responder. A combinação OCR (prova + gabarito) + chat completion num único request, em PDFs grandes, estoura o tempo do edge runtime. Sem retorno, o front mostra "falha" e o registro fica zumbi.

A correção exige quebrar o fluxo em **etapas curtas, persistidas em DB, com polling do client** — que é exatamente o que o usuário pediu (prévia → confirmar → logs em tempo real).

---

## Arquitetura proposta

Fluxo em 3 etapas, cada uma um server fn curto (cabe no limite do Worker), com progresso salvo no DB:

```text
[Admin clica Gerar]
   │
   ▼
1) prepararSimulado(provaNumero)
   • OCR dos 2 PDFs via Mistral
   • Extrai contagem de questões + matérias detectadas (regex no markdown)
   • Salva job em 'simulado_jobs' com etapa=preview, ocr_prova, ocr_gabarito, total_estimado
   • Retorna prévia → modal de confirmação
   │
   ▼
[Admin confirma a prévia]
   │
   ▼
2) iniciarGeracao(jobId)
   • Marca etapa=gerando, batches=N (ex.: 8 batches de ~10 questões)
   • Retorna imediatamente — UI começa a polar
   │
   ▼
3) processarBatch(jobId, batchIndex)  ← chamado em loop pelo CLIENT
   • Pega slice do OCR, chama Mistral chat só pra esse intervalo
   • Insere questões no DB, append log, atualiza progresso/ETA
   • Retorna { proximo: batchIndex+1 | null }
   │
   ▼
[Quando proximo=null → status=pronto]
```

Cada batch dura ~5–15s (dentro do limite do Worker). O client faz `useQuery` polando `getJobStatus(jobId)` a cada 1.5s pra renderizar logs e barra de progresso ao vivo.

---

## Mudanças

### Banco
- Nova tabela `simulado_jobs`: `id`, `simulado_id`, `prova_numero`, `etapa` ('preview'|'gerando'|'pronto'|'erro'), `ocr_prova` (text), `ocr_gabarito` (text), `total_estimado`, `materias_detectadas` (jsonb), `batch_atual`, `batches_total`, `questoes_processadas`, `logs` (jsonb array de `{ts, nivel, msg}`), `iniciado_em`, `concluido_em`, `erro_msg`, `gerado_por`. RLS: admin gerencia.
- Limpar o registro órfão `prova_numero=46, status='gerando'`.

### Server functions (`src/lib/simulados-admin.functions.ts`)
- `prepararSimulado({ provaNumero })` — OCR + contagem + cria job preview.
- `iniciarGeracao({ jobId })` — cria registro em `simulados`, marca job como `gerando`.
- `processarBatch({ jobId, batchIndex })` — processa um intervalo de questões, append log/progresso.
- `getJobStatus({ jobId })` — leitura leve pro polling.
- `cancelarJob({ jobId })` — limpa job + simulado parcial.

### UI Admin (`src/routes/_app.admin.simulados.tsx`)
- Botão **Gerar** abre modal com loading "Lendo PDFs…" → chama `prepararSimulado`.
- Mostra **prévia**: nº de questões detectadas, matérias previstas, tempo estimado, botões **Confirmar** / **Cancelar**.
- Ao confirmar: chama `iniciarGeracao` e dispara loop client-side `processarBatch` até `proximo=null`, com `useQuery` polando `getJobStatus`.
- Painel de logs ao vivo (lista rolável de mensagens) + barra de progresso + contador "X / Y questões" + ETA calculado pela média de tempo dos batches anteriores.

### Esconder BottomNav fora da home
Em `src/routes/_app.tsx`, trocar `{!isBiblioteca && <BottomNav />}` por exibição apenas em `/inicio` (ou raiz `/`). Ajustar também `pb-20` pra só aplicar quando o nav está visível. Confirmar qual é a rota de "Início" (provavelmente `/inicio`).

---

## Pergunta pra confirmar antes de implementar

A rota da home é `/inicio` mesmo? E quando o usuário estiver dentro de "Matérias", "Provas", "Menu" (que também são botões do nav inferior), o nav deve sumir também — confirmando: **só aparece na home, em todas as outras telas some**?
