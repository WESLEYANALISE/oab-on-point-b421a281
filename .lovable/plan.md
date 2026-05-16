Vou ajustar o pipeline para parar de depender só de marcador “Questão N” e fazer a Gemini trabalhar melhor com o texto bruto real do OCR.

## Diagnóstico confirmado

- O OCR do simulado 46 tem questões que aparecem como número sozinho na linha, por exemplo `1`, e não como `# 1` nem `Questão 1`.
- Por isso o código atual ainda registra: `OCR não contém marcador "Questão" para...`.
- As 25 questões com “Sem matéria” são placeholders `falhou_extracao`; elas entram no Raio-X porque a tela está contando todas as linhas, inclusive falhas. Isso deve ser filtrado.

## Plano de correção

1. **Tornar o recorte do OCR mais robusto**
   - Atualizar o detector de questões para reconhecer também número sozinho no começo da linha: `1`, `2`, `3` etc.
   - Só aceitar esse número como questão quando o trecho seguinte tiver cara de questão objetiva, com alternativas `(A)`, `(B)`, `(C)`, `(D)`.
   - Manter suporte a `# N`, `## N`, `Questão N`, `N.` e `N)`.

2. **Extrair em grupos menores, como você pediu**
   - Reduzir a extração para grupos de **5 questões por chamada** da Gemini.
   - Cada chamada recebe um trecho contínuo do OCR bruto com margem antes/depois, não um texto inventado ou resumido.
   - Se faltar alguma questão, tentar individualmente com uma janela maior do OCR.

3. **Adicionar fallback com Gemini lendo o OCR bruto quando o marcador falhar**
   - Se o detector local não encontrar uma questão, chamar a Gemini só para localizar a questão no texto bruto, retornando âncoras literais do início/fim.
   - Depois disso, usar essas âncoras para recortar o OCR e extrair a questão.
   - A Gemini não vai criar questão; ela vai apenas localizar e formatar o que já está no OCR.

4. **Melhorar a classificação de matéria**
   - Exigir que toda questão extraída tenha uma matéria da lista permitida.
   - Não salvar “Sem matéria” em questão válida.
   - Se a Gemini não conseguir classificar com segurança, fazer uma segunda chamada curta só com o enunciado e alternativas para classificar a matéria.
   - Se ainda assim falhar, a questão continua como `falhou_extracao`, em vez de virar “Sem matéria”.

5. **Corrigir o Raio-X**
   - Alterar `getSimuladoOverview` para ignorar questões com `status='falhou_extracao'` no Raio-X.
   - Assim o aluno não verá “Sem matéria” como matéria cobrada.
   - O total exibido no Raio-X passa a representar apenas questões realmente extraídas.

6. **Reprocessar provas já quebradas**
   - Reusar o botão “Reextrair falhas”, mas agora com o pipeline novo.
   - Para o simulado 46, ele deve tentar recuperar as 25 questões que hoje estão como `falhou_extracao`.
   - Para simulados antigos com o mesmo problema, o mesmo botão poderá ser usado.

## Arquivos a alterar

- `src/lib/simulados-admin.functions.ts`
  - detector de marcadores;
  - extração em grupos de 5;
  - fallback de localização pela Gemini;
  - reforço da classificação de matéria.

- `src/lib/simulados.functions.ts`
  - Raio-X deve excluir `falhou_extracao`.

## Resultado esperado

- Menos mensagens de “OCR não contém marcador”.
- Menos questões perdidas.
- Nenhuma questão inventada.
- Raio-X sem “Sem matéria” indevido.
- Questões extraídas a partir do texto bruto real do Mistral, em grupos menores e com validação literal contra o OCR.