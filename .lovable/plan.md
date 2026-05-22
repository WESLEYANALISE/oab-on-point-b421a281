# Aulas longas (15–20 slides) com todos os formatos interativos

## Diagnóstico
A aula "Sociedade de Advogados e Mandato" mostra apenas 4 slides porque foi gerada por uma versão antiga do gerador (antes do refactor recente). Hoje o `buildLocalSlides` produz 10 slides, mas você pediu 15–20 com mais variedade (quiz, ligar termos, comparativo, esquema, mapa mental, caso prático, dicas, etc.).

Além disso, os tipos `comparativo`, `esquema` e `mapa_mental` (já suportados pelo `SlidePlayer`) não estão sendo gerados — por isso "sumiu" a opção de ligar termos e tudo mais que você pediu.

## O que vou alterar

### 1) `src/routes/api/aulas-interativas-preview.ts` — reescrever `buildLocalSlides`
Gerar de 16 a 19 slides por aula, sempre na seguinte ordem (intercalando teoria → prática → checagem):

```
01 capa
02 conceito (base teórica)
03 esquema (bullets-chave do tema)
04 exemplo (aplicação 1)
05 quiz 1 (cobre o conceito base)
06 conceito (aprofundamento / regra detalhada)
07 comparativo (2 colunas: regra x exceção / faz x não faz)
08 ligar_termos (5 pares termo↔definição extraídos do material)
09 caso_pratico (enunciado curto + pergunta + análise)
10 quiz 2 (cobre a aplicação prática)
11 mapa_mental (nó central + 4 ramos)
12 dicas (3–4 dicas com tipos dica/atencao/alvo/estrela)
13 exemplo (aplicação 2, outro ângulo)
14 quiz 3 (pegadinha clássica de OAB)
15 resumo (5–7 bullets do que viu)
16 quiz 4 final (questão integradora estilo OAB)
17 conclusao (fechamento + chamada pra próxima aula)
```

Regras de conteúdo:
- Frases extraídas do material via `pickSentences` (já existe), com fallback no `escopo` da aula.
- Quizzes diferentes entre si, sempre 4 alternativas (A–D), com `explicacao` justificando a correta e por que B/C/D estão erradas.
- `ligar_termos`: pegar 5 tokens relevantes via `extractTokens` e parear com definições derivadas de sentenças do material.
- `comparativo`: 2 colunas com 3 bullets cada (ex.: "Permitido" x "Vedado", ou "Regra geral" x "Exceções").
- `mapa_mental`: nó central = título da aula; 4 ramos = principais subtemas (derivados do escopo + tokens).
- `esquema`: 4–6 bullets curtos.
- `dicas`: 4 itens variando `tipo` entre `dica`, `atencao`, `alvo`, `estrela`.
- `conclusao`: 2 frases + 1 bullet "próximo passo".

### 2) Sem mudança de schema
Todos os tipos já estão no enum aceito pelo `SlideInput` em `src/lib/aulas-interativas.functions.ts` e renderizados em `src/components/aulas-interativas/SlidePlayer.tsx`. Nada a mudar lá.

### 3) Importante para você
A aula que você está vendo agora (`Sociedade de Advogados e Mandato`) foi salva no banco com 4 slides pela versão antiga. Para ela ganhar os 15–20 slides novos, você precisa:
1. Voltar em **Admin → Aulas Interativas**.
2. Clicar em **Gerar prévia** novamente no arquivo do curso (Ética Profissional).
3. **Publicar** de novo — isso apaga e recria os slides no banco.

Aulas geradas depois dessa alteração já virão com o formato completo automaticamente.

## Detalhe técnico
- Mantém geração 100% local (sem chamadas extras ao Gemini), então não há risco de timeout como nos erros anteriores.
- Cada slide continua tendo `{ ordem, tipo, conteudo, imagem_url: null, quiz_json }` — compatível com o insert atual em `aulas_interativas_slides`.
- `extractTokens` e `pickSentences` já existem; vou só adicionar dois helpers internos: `buildPares()` e `buildRamosMapa()` dentro do mesmo arquivo.
