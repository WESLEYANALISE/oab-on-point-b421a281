## Causa raiz da invenção

O OCR do Mistral está OK (cada prova gera ~105.000 caracteres de texto). O problema está em `src/lib/simulados-admin.functions.ts`, função `extrairQuestoes()`:

```ts
${ocrProva.slice(0, 90000)}   // ← linha 412
```

O texto é **truncado em 90.000 caracteres** antes de ser enviado ao Gemini. As questões 68–80 das provas ficam fora do trecho enviado. O prompt pede "extraia as questões 68 a 80" mas o documento que chega ao Gemini não as contém — então o Gemini **alucina** enunciados padronizados ("Município Beta… IPVA…", "sociedade empresária Theta Ltda…") em vez de retornar vazio.

Confirmações no banco:
- Todas as 7 provas têm OCR > 100k chars (não cabe nos 90k).
- 100% das questões inventadas estão na faixa 60–80 de cada prova.
- Hoje as 80 questões estão marcadas `status='ok'` (não dá pra distinguir verdadeiras de inventadas pela coluna status).

## Correções no pipeline (nunca mais inventar)

### 1) Eliminar o truncamento — enviar só a janela certa
Em `extrairQuestoes()`, antes de chamar o Gemini:
- localizar no `ocrProva` as posições dos marcadores `Questão <n>` para cada número do lote;
- recortar a janela `[inicio-200 .. fim+200]` do OCR original;
- se a janela passar de 90k, dividir o lote em sub-lotes menores (re-chamar `geminiExtractJson` para cada metade) em vez de truncar.

Assim o Gemini sempre recebe **o texto literal** das questões pedidas.

### 2) Reforçar o prompt anti-alucinação
Trocar o `user` prompt de `extrairQuestoes` por:

> "Extraia apenas questões que aparecem LITERALMENTE no texto abaixo. Se uma questão pedida não estiver presente, OMITA-A do JSON (não invente, não reformule, não complete). Copie enunciado e alternativas como aparecem no documento."

E no `system`: "É proibido criar conteúdo. Toda questão retornada deve poder ser encontrada palavra por palavra no texto fornecido."

### 3) Validador anti-invenção (server-side)
Após o Gemini responder, antes de inserir em `simulado_questoes`:
- Tomar os primeiros 60 caracteres significativos do `enunciado` retornado.
- Procurar no `ocrProva` original (sem truncar).
- Se não encontrar (normalizando espaços/acentos), descartar a questão e logar `"invenção descartada na Q<n>"`.

Isso transforma o sistema em fail-safe: questão inventada nunca chega ao banco.

### 4) Validar distribuição final do edital OAB
Em `validarFinal`, antes de marcar etapa `pronto`, conferir:
- Ética ≥ 7 e ≤ 9
- Filosofia do Direito ≥ 1 e ≤ 3
- Total `ok` ≥ 70 de 80

Se reprovar, marcar etapa `erro` com mensagem clara em vez de finalizar.

## Limpeza dos simulados já existentes

### 5) Detectar e marcar as questões inventadas atuais
Criar uma server function admin `marcarInventadas(prova_numero)` que:
1. Lê `simulado_jobs.ocr_prova` da prova.
2. Para cada questão `status='ok'`, testa se um trecho do enunciado aparece no OCR original (mesma checagem do passo 3).
3. As que falharem viram `status='falhou_extracao'` com `enunciado='Esta questão precisa ser reextraída.'` e `materia=null`.

Roda uma vez por prova (40 a 46). Resultado esperado: 50–80 questões reclassificadas no total.

### 6) Reprocessar os números marcados
Adicionar botão admin "Reextrair faltantes desta prova" que chama o pipeline novo (passos 1–4) apenas para os números cujo `status != 'ok'`. As corretas que já existem ficam intocadas.

### 7) Excluir do raio-X tudo que não for `status='ok'`
Em `ExamesTab` e na agregação por matéria do raio-X, filtrar `status = 'ok'`. Enquanto as provas não forem reextraídas, o raio-X mostra menos questões mas só as verdadeiras — o ranking de Ética vs Tributário volta ao normal automaticamente.

## Ordem de execução proposta

1. Aplicar as 4 correções no pipeline (`extrairQuestoes`, prompt, validador, validação final).
2. Adicionar filtro `status='ok'` no raio-X.
3. Rodar `marcarInventadas` nas 7 provas (40–46).
4. Você revisa o admin e dispara "Reextrair faltantes" prova por prova.

## O que preciso confirmar

1. Posso adicionar a server function `marcarInventadas` e o botão admin de re-extração, ou prefere que eu rode tudo automaticamente pelas 7 provas?
2. Mantenho a coluna `status` atual (`ok` / `falhou_extracao` / `anulada`) ou crio um novo valor `inventada` para diferenciar as detectadas agora das que falharam por OCR?
