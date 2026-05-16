## Objetivo
Tornar a geração de simulados confiável: detectar com precisão **quantas questões existem na prova** e **extrair o gabarito oficial** primeiro, depois extrair todas as questões garantindo que cada uma tenha a resposta correta vinda do gabarito.

## Problema atual
- A contagem de questões usa um regex fraco que falha quando o OCR formata diferente, e cai num fallback de `80`.
- O Gemini extrai questões + resposta no mesmo passo. Se ele "achar" uma resposta sem confirmar no gabarito, salva errado.
- Se um lote retornar menos que o esperado, hoje há retry — mas se o `total_estimado` estiver errado, nunca alcança o real.

## Nova estrutura do fluxo

```
iniciarJob (instantâneo)
   └─> executarOcr (Mistral PDF prova + gabarito)
         └─> analisarProva (NOVO — Gemini)
               ├─ conta números reais de questões na prova
               └─ extrai mapa {numero -> letra} do gabarito oficial
         └─> processarBatch (loop, com gabarito já em mãos)
               └─ extrai enunciado + alternativas
               └─ injeta resposta_correta vinda do mapa do gabarito
         └─> validarFinal (NOVO)
               └─ checa se todas as N questões foram salvas; se faltar, refaz só as faltantes
```

### 1. Etapa nova: `analisarProva`
- Roda **uma vez**, depois do OCR, antes de qualquer batch.
- Chama o Gemini com prompt focado **só em duas coisas**:
  1. `total_questoes`: número total real (lendo o texto OCR completo).
  2. `gabarito`: array `[{ numero, letra }]` extraído do texto do gabarito.
- Salva em `simulado_jobs`:
  - `total_estimado` ← `total_questoes` (passa a ser real, não estimativa).
  - novo campo `gabarito_oficial jsonb` ← `{ "1": "A", "2": "C", ... }`.
- Loga: `"Prova tem X questões. Gabarito com Y respostas extraído."`
- Se `X !== Y`, loga aviso mas segue (gabarito ainda pode ter falhas pontuais).

### 2. Mudança em `processarBatch`
- Recebe o mapa do gabarito do job e injeta a `resposta_correta` correta **após** o Gemini extrair enunciado/alternativas.
- Prompt do Gemini fica mais simples: pede só enunciado, alternativas e matéria — **não pede mais resposta**.
- Se uma questão extraída não tem entrada no gabarito, descarta e marca para retry.
- Retry continua existindo (3 tentativas pedindo números específicos).

### 3. Etapa nova: `validarFinal`
- Roda automaticamente após o último batch.
- Conta `simulado_questoes` no banco vs `total_estimado`.
- Se faltarem, dispara um lote extra direcionado aos números ausentes.
- Só marca `status = "pronto"` quando `count === total_estimado`.
- Se após 3 tentativas ainda faltar, marca pronto com aviso no log: `"Pronto com X de Y questões — Z não puderam ser extraídas: [lista]"`.

### 4. Mudança no UI (`ProgressModal`)
- Adicionar uma fase visual antes dos lotes: **"Analisando prova e gabarito…"** (shimmer).
- Mostrar no header: `"68 / 80 questões — 12 faltando, refazendo…"` quando estiver em revalidação.

## Mudança de banco

Adicionar coluna em `simulado_jobs`:
- `gabarito_oficial jsonb DEFAULT '{}'::jsonb` — mapa `{ "1": "A", "2": "C", ... }`.

## Arquivos afetados

- `supabase/migrations/...` — nova coluna `gabarito_oficial`.
- `src/lib/simulados-admin.functions.ts`:
  - nova server-fn `analisarProva`.
  - `executarOcr` para de chutar total; só faz OCR e dispara `analisarProva`.
  - `processarBatch` usa o gabarito do job em vez de pedir resposta ao Gemini.
  - nova server-fn `validarFinal`.
- `src/routes/_app.admin.simulados.tsx` (`ProgressModal`):
  - orquestra `iniciarJob → executarOcr → analisarProva → loop processarBatch → validarFinal`.
  - mostra fase de análise e estado de revalidação.

## Pontos a confirmar
1. Se faltar 1–2 questões mesmo após retries, **marcar como pronto com aviso** ou **bloquear o simulado como `erro`**?
2. Quer botão "Tentar de novo as faltantes" no card admin do simulado quando ficar incompleto?