## Diagnóstico

### 1) "Verificando acesso…" insistente em /admin
`src/routes/_app.admin.tsx` mostra a tela de "Verificando acesso…" enquanto `useAuth().loading` **ou** `useIsAdmin().isLoading` for `true`. Como `useIsAdmin` chama o Supabase a cada montagem nova do layout (e `_app.admin.tsx` é remontado em cada navegação para `/admin/*`), toda vez que você entra/sai da seção o `isLoading` volta a `true` por ~300 ms antes do cache responder. Resultado: a página pisca o "Verificando acesso…" mesmo já logado.

### 2) Exame 44 — só 79/80 questões
Os logs do job `b363b59d…` mostram:
- Total detectado: 80 questões, gabarito com 80 letras (#69 = "A").
- A questão que faltou foi **a #69** (não a 80). O Gemini extraiu 1–68 e 70–80 normalmente, mas no lote 4 (questões 61–80) ele devolveu só 19. Foram feitas **3 retentativas no lote + 3 validações finais** pedindo especificamente a #69 — em todas o Gemini "não retornou questões válidas".
- O log atual diz apenas `Validação X: Gemini não retornou questões válidas.` Não captura o motivo (texto bruto, erro de parse, schema rejeitado, etc.), então o admin não consegue saber **por que** falhou.

Causa provável: a questão #69 do 44º EXAME tem formato que confunde o parser (tabela, imagem, ou enunciado muito longo perto do recorte do prompt). Sem capturar o output bruto do Gemini, não dá pra confirmar.

### 3) Alternativas anuladas no gabarito
Hoje o gabarito é forçado a ser apenas `"A"|"B"|"C"|"D"` (linha 287 de `simulados-admin.functions.ts`), e quando o gabarito oficial diz "Anulada" o prompt instrui o Gemini a **chutar a primeira letra ou "A" como fallback** (linha 261). Isso é silenciosamente incorreto: o usuário responde, ganha/perde ponto numa questão que oficialmente foi anulada.

Padrão correto da OAB: questão anulada **conta como acerto para todos**, independentemente do que o candidato marcou. O simulado precisa mostrar isso na hora de responder e no resultado.

---

## Plano

### A) Acesso admin sem flicker

1. **`src/hooks/use-admin.ts`** — usar `initialData` lido de `localStorage` (`oab:is-admin`). Persistir o resultado após cada fetch. Aumentar `staleTime` para o ciclo de vida da sessão (`Infinity`) e usar `refetchOnMount: false`. Assim, a partir da 2ª visita, `isLoading` nunca mais é `true`.

2. **`src/routes/_app.admin.tsx`** — não bloquear o layout enquanto o cache mostra `isAdmin === true`. Só renderizar "Verificando acesso…" quando **ainda não houver resposta nem cache** (`isAdmin === undefined && isLoading`). Quando o cache já diz `true`, renderiza `<Outlet/>` direto e a query revalida em background. Quando o cache diz `false`, redireciona imediatamente.

### B) Diagnóstico real da extração

1. **`src/lib/simulados-admin.functions.ts` — `extrairQuestoes` / `geminiExtractJson`**
   - Quando uma retentativa falha, logar:
     - `tamanho_resposta` (chars retornados pelo Gemini)
     - `motivo`: "parse JSON falhou", "schema rejeitou (faltou alternativa X)", "Gemini retornou questão #N em vez de #X", "OCR não contém marcador 'Questão N'"
     - Os primeiros 250 chars do que o Gemini devolveu (para o log)
   - Antes da 1ª tentativa de uma questão faltante, verificar se o marcador `Questão N` aparece no OCR e logar "OCR não contém marcador da questão N" quando for o caso (problema na fonte, não no Gemini).

2. **Fallback: marcar como "extração falhou"** — depois das 3 validações finais, inserir um placeholder na tabela `simulado_questoes` para cada questão faltante:
   - `enunciado`: "Não foi possível extrair esta questão automaticamente."
   - `alternativas`: vazias
   - `resposta_correta`: `null`
   - Nova coluna `status` = `'falhou_extracao'`
   Assim o `total_questoes` final bate, o usuário vê claramente a questão que falhou, e o admin pode reextrair manualmente depois.

### C) Suporte a alternativas anuladas

1. **Migração** (`simulado_questoes`):
   - Adicionar coluna `status text not null default 'ok'` com valores `'ok' | 'anulada' | 'falhou_extracao'`.
   - Adicionar coluna `nota_oficial text null` para guardar o texto bruto do gabarito ("Anulada", "Alternativa B (Anulada)", etc.).
   - `resposta_correta` continua sendo letra ou `null`.

2. **Parsing do gabarito** (`analisarProva`):
   - Trocar o prompt para retornar `{ numero, letra, anulada, observacao }` em vez de só `letra`. Quando o gabarito oficial diz "Anulada", "ANULADA", "Recurso deferido", etc., setar `anulada: true` e deixar `letra` como `null` (ou guardar a letra original como referência).
   - Validador aceita `letra ∈ A..D | null`. Se anulada e há letra "original", manter como `nota_oficial`.
   - Guardar como objeto: `gabarito_oficial[numero] = { letra, anulada, nota }`.
   - **Não fazer fallback para "A"** quando anulada.

3. **Insert das questões** (`processarBatch` / `validarFinal`):
   - `resposta_correta = anulada ? null : letra`
   - `status = anulada ? 'anulada' : 'ok'`
   - `nota_oficial = nota`

4. **UI ao responder** (`_app.simulados.$slug.praticar.tsx`):
   - Quando `status === 'anulada'`: mostrar um badge "Questão anulada" no topo da questão, desabilitar as alternativas, exibir mensagem "Esta questão foi anulada pela banca. Ela é considerada correta para todos os candidatos." e um botão "Próxima". Não salvar resposta (ou salvar `null` com flag).
   - Quando `status === 'falhou_extracao'`: badge "Extração falhou — pular", botão "Próxima", não conta.

5. **UI no resultado** (`_app.simulados.$slug.resultado.$tentativaId.tsx`):
   - Questões com `status='anulada'` contam como acerto automático (somar ao acerto total).
   - Questões com `status='falhou_extracao'` são descontadas do denominador (mostra "75 de 78 + 2 anuladas + 1 falhou").
   - Na revisão por questão: badge "Anulada — conta como acerto" em verde.

---

## Arquivos afetados

- editado: `src/hooks/use-admin.ts` (cache em localStorage)
- editado: `src/routes/_app.admin.tsx` (não bloquear quando há cache positivo)
- editado: `src/lib/simulados-admin.functions.ts` (logs detalhados de extração, parsing de "anulada", placeholders para falhas)
- editado: `src/routes/_app.simulados.$slug.praticar.tsx` (UI para anulada / falhou_extracao)
- editado: `src/routes/_app.simulados.$slug.resultado.$tentativaId.tsx` (contagem ajustada)
- migração: nova coluna `status` e `nota_oficial` em `simulado_questoes`

## Pontos de confirmação

1. Faz sentido **anular = acerto automático** (regra OAB) ou prefere "anulada = pulada/não conta"?
2. Para questões com extração falhada, prefere placeholder visível no simulado (proposta acima) ou ocultá-las completamente e ajustar o total?
