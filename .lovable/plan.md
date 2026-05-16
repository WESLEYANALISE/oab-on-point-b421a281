## Finalizar tratamento de questões especiais e reprocessar exame 44

Concluir os 3 itens pendentes da última rodada.

### 1. Auto-avanço no `praticar` para questões especiais
Arquivo: `src/routes/_app.simulados.$slug.praticar.tsx`
- Quando `status === 'anulada'`: já mostra banner verde "conta como acerto". Adicionar botão grande "Próxima questão" no lugar das alternativas (sem precisar abrir "Ver alternativas") e marcar a resposta como `null` automaticamente no estado de respostas para que o resumo final saiba que foi vista.
- Quando `status === 'falhou_extracao'`: banner âmbar + botão "Pular questão" que avança sem contar.
- Na última questão, o botão vira "Finalizar simulado".

### 2. UI de revisão no `resultado`
Arquivo: `src/routes/_app.simulados.$slug.resultado.$tentativaId.tsx`
- Mostrar badge "Anulada — conta como acerto" (verde) nas questões com `status='anulada'`, sem destacar alternativa correta.
- Mostrar badge "Extração falhou — desconsiderada" (cinza) nas `falhou_extracao`, fora do denominador.
- Ajustar o texto do score: "X de Y questões válidas" quando houver falhas de extração; mostrar Z anuladas contadas como acerto.
- Garantir que o cálculo bate com o que `simulados.functions.ts` já retorna (anulada = +1 acerto, falhou_extracao = excluída do total).

### 3. Reprocessar exame 44, questão #69
Plano operacional (não código):
- Rodar o job de re-extração só do lote 4 (questões 61–80) do exame 44 via `simulados-admin.functions.ts` agora com os logs novos.
- Se o log novo apontar motivo concreto (parse, schema, conteúdo da #69 com formatação atípica), corrigir prompt/parser pontualmente.
- Se Gemini continuar não retornando a #69 após 3 tentativas, deixar o placeholder `falhou_extracao` (já suportado pelo fluxo do item 1 e 2) para que o simulado siga utilizável.

Sem mudanças de schema. Sem nova migration.

### Arquivos a editar
- `src/routes/_app.simulados.$slug.praticar.tsx`
- `src/routes/_app.simulados.$slug.resultado.$tentativaId.tsx`
- Possíveis ajustes pontuais em `src/lib/simulados-admin.functions.ts` se o relog do exame 44 indicar correção de prompt.
