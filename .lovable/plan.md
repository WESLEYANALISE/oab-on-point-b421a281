## Objetivo

Permitir gerar vários simulados em fila no /admin/simulados, executando um após o outro automaticamente, em segundo plano — você pode sair da tela, navegar pelo app e voltar; o progresso continua visível em tempo real.

## Como vai funcionar

1. **Seleção em fila**: na lista de provas, ao lado de cada botão "Gerar" aparece um checkbox. No topo da página, dois novos botões:
   - "Selecionar todas pendentes" (marca todas que têm PDF e ainda não estão prontas)
   - "Gerar X em fila" (inicia a fila com as selecionadas)

2. **Execução sequencial em background**: a fila roda em um *driver global* montado no layout `_app` (não no modal). Ele:
   - Pega o próximo número da fila
   - Chama `iniciarJob` → executa OCR → análise → loop de batches → validação (mesma sequência atual)
   - Quando termina (sucesso ou erro), passa para o próximo automaticamente
   - Não depende da página /admin/simulados estar aberta

3. **Persistência entre navegações e reloads**:
   - A fila (lista de números pendentes + jobId ativo) fica em `localStorage`
   - Ao recarregar o app, o driver lê o storage, consulta `getJobStatus` do job ativo e retoma de onde parou (continua o loop de batches ou avança para o próximo da fila se já terminou)

4. **Indicador global flutuante**: um mini-card fixo no canto inferior (visível em qualquer rota enquanto há fila ativa) mostrando:
   - "Gerando 2 de 5 · Prova XX"
   - Barra de progresso da prova atual (mesma lógica do modal: lote N/M ou questões feitas/total)
   - Botão para expandir → abre o modal completo com logs ao vivo
   - Botão para cancelar a prova atual (mantém o resto da fila) ou cancelar tudo

5. **Na página /admin/simulados**: cada linha mostra o status real-time ("Na fila · posição 3", "Gerando…", "Pronto", "Erro"). O modal existente continua funcionando para inspeção detalhada quando expandido pelo mini-card ou clicando numa linha que está gerando.

## Detalhes técnicos

**Novo arquivo** `src/lib/simulado-queue.ts` — store baseado em `zustand` (já no projeto? se não, usar um contexto + `useSyncExternalStore`) que mantém:
```ts
{
  fila: number[],              // provaNumeros pendentes
  atual: { provaNumero, jobId } | null,
  historico: Array<{ provaNumero, status, jobId }>
}
```
Persistido via `localStorage` com chave `oab:sim-queue`.

**Novo componente** `src/components/admin/SimuladoQueueDriver.tsx`:
- Montado uma única vez no `_app.tsx` (dentro do layout autenticado)
- Usa `useServerFn` para `iniciarJob`, `executarOcr`, `analisarProva`, `processarBatch`, `validarFinal`, `getJobStatus`
- `useEffect` que observa o store: se `atual === null` e `fila.length > 0`, inicia o próximo
- Reproduz a máquina de estados que hoje está dentro do `ProgressModal` (OCR → analisar → batches → validar), mas escutando `getJobStatus` via polling com `setInterval` (não React Query, para não depender de uma rota montada)
- Apenas dispara para usuários admin (checa `useAuth` + `is_admin` ou similar)

**Novo componente** `src/components/admin/SimuladoQueueIndicator.tsx`:
- Mini-card flutuante (canto inferior direito, acima do bottom nav mobile)
- Lê do store; aparece quando `atual !== null || fila.length > 0`
- Expande para abrir o `ProgressModal` reusado (refatorado para receber `jobId` de fora)

**Refator** `_app.admin.simulados.tsx`:
- Remove a auto-execução do modal (a lógica vai para o Driver)
- O modal vira "viewer" passivo de `getJobStatus` + logs
- Adiciona checkboxes, botão "Gerar em fila", e o estado por linha sai do store

**Refator mínimo** `_app.tsx`: monta `<SimuladoQueueDriver />` e `<SimuladoQueueIndicator />` uma vez.

## Limites honestos

- Se você **fechar a aba** ou perder internet, a fila pausa (o driver é client-side). Ao reabrir, ela retoma sozinha lendo `localStorage` + `getJobStatus`.
- Para execução 100% server-side independente do browser, seria preciso introduzir um worker agendado (Inngest/pg_cron) — fora do escopo desta entrega, mas posso propor depois se quiser.

## Arquivos afetados

- novo: `src/lib/simulado-queue.ts`
- novo: `src/components/admin/SimuladoQueueDriver.tsx`
- novo: `src/components/admin/SimuladoQueueIndicator.tsx`
- editado: `src/routes/_app.admin.simulados.tsx` (checkboxes, fila, remove driver local)
- editado: `src/routes/_app.tsx` (monta driver + indicador)
