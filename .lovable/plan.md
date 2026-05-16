## Diagnóstico

Confirmei no banco e nos logs do job: **todas as 80 questões dos simulados 45 e 46 estão marcadas como `falhou_extracao`** (por isso o "Raio-X" mostra "Sem matéria 80 · 100%" e na prática a questão aparece como "não disponível"). Os simulados 40–44 nem têm mais linhas em `simulados`.

### Causa raiz

O Mistral OCR não escreve "Questão 1", "Questão 2"… nos PDFs novos. Ele usa cabeçalhos Markdown:

```text
# 1
Os irmãos, Matilde, advogada…

# 2
Helena concluiu seu mestrado…
```

Mas o pipeline novo (após o ajuste anti-alucinação) só procura por marcadores que casem com a regex:

```ts
/quest[ãa]o\s*(\d{1,3})\b/gi   // src/lib/simulados-admin.functions.ts:395
```

Resultado: `indexQuestionPositions` devolve mapa vazio → `sliceOcrForRange` devolve trecho vazio → todas as questões são reportadas como "OCR não contém marcador 'Questão' para: 1, 2, 3…" (exatamente o que está no log do job) → nada é extraído → todas viram placeholder `falhou_extracao`.

Os jobs antigos (10:35 do 45, 19:45 do 46) ainda funcionavam porque mandavam o OCR inteiro para o Gemini sem janelas — depois do fix anti-invenção essa rota deixou de existir.

## Correção

### 1. Reconhecer todos os marcadores de questão no OCR (src/lib/simulados-admin.functions.ts)

Reescrever `indexQuestionPositions` para detectar, **no começo da linha**:

- `# N`, `## N`, `### N` (formato real do Mistral)
- `Questão N` / `QUESTÃO N`
- `N.` ou `N)` seguidos de espaço (fallback prudente)

Ignorar matches dentro de "Lei nº 12", "Art. 5", "ADI 3.510" etc. usando a âncora de início de linha (`^` com `/m`) e exigindo que o número esteja em 1–80 e em sequência crescente quando possível.

### 2. Reextrair os simulados quebrados

Adicionar uma server function `reextrairFalhas(provaNumero)` (gêmea da `auditarEReextrair` que já existe) que:

- carrega o último job `pronto` com `ocr_prova` salvo;
- pega da tabela `simulado_questoes` todos os `numero` com `status='falhou_extracao'`;
- apaga esses placeholders;
- chama `extrairQuestoes` (agora com o índice corrigido) para esse mesmo conjunto;
- reinsere com `status='ok'` (ou `anulada` quando o gabarito marca), ou recria placeholder se mesmo assim falhar;
- recalcula `simulados.total_questoes`.

### 3. Botão "Reextrair falhas" no admin

Em `src/routes/_app.admin.simulados.tsx`, ao lado do botão "Auditar" já existente, adicionar **"Reextrair falhas"** (ícone `RefreshCw`) que dispara a função acima. Mostrar toast com `{reextraidas, restantes}`.

Sem mudança de UI no app do aluno — a tela de simulado já trata `status='falhou_extracao'` corretamente; assim que as questões voltarem como `ok`, o Raio-X passa a mostrar matérias reais e a prática mostra o enunciado.

### 4. Fluxo para o usuário

1. Implemento a correção.
2. Você vai em `/admin/simulados` e clica em **"Reextrair falhas"** nos simulados 45 e 46.
3. Em ~1–2 min as 80 questões reais voltam, o Raio-X é recalculado automaticamente e a prática volta a abrir.

## Arquivos tocados

- `src/lib/simulados-admin.functions.ts` — `indexQuestionPositions` + nova `reextrairFalhas`.
- `src/routes/_app.admin.simulados.tsx` — botão "Reextrair falhas".
