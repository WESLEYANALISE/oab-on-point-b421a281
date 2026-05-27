## Problema

A geração de slides hoje **não chama o LLM para os slides** — só para o esqueleto (módulos/aulas). Os slides em si são montados por um builder determinístico (`buildLongSlides`) que extrai frases do PDF e usa palavras soltas como "termos". Isso causa exatamente o que aparece nos prints:

- Pares termo↔definição com palavras avulsas ("Filosofia", "Mudanca", "Grega") e definições truncadas/vazias → 2 caixas em branco no slide 8/17.
- Conteúdo "Base conceitual" sem explicação real, só um trecho recortado do PDF.
- Quizzes genéricos (sempre o mesmo padrão "Sobre X, qual afirmação é correta?").
- Botão **Próximo** trava no slide de Ligar termos: `SlideLigarTermos` exige `acertados.size === paresValidos.length` para destravar, mas como há definições vazias, é impossível acertar tudo.

## O que vou fazer

### 1. Gerar slides com o Gemini (em vez do builder determinístico)

No `src/routes/api/aulas-interativas-preview.ts`, no Pass 2 (loop por aula), trocar `buildLongSlides(aul, trechos)` por uma **chamada `callGeminiJson` por aula**, com um system prompt novo que:

- Receba `titulo`, `descricao`, `escopo` da aula + `trechos` extraídos do PDF.
- Devolva **17 slides completos** no schema que o `SlidePlayer` já espera (`capa`, `conceito`, `esquema`, `exemplo`, `quiz`, `comparativo`, `ligar_termos`, `caso_pratico`, `mapa_mental`, `dicas`, `resumo`, `conclusao`).
- Para cada slide, exigir:
  - `conceito`/`exemplo`/`resumo`/`conclusao`: `texto` com **2–4 parágrafos didáticos** (explicação passo a passo, tom de aula falada — "vamos entender…", "perceba que…"), `bullets` opcional, `destaque` curto.
  - `ligar_termos`: **exatamente 5 pares válidos**, `termo` curto (1–3 palavras com sentido jurídico real, não palavra solta) e `definicao` em 1 frase completa (80–160 caracteres). Schema rejeita pares com campos vazios.
  - `caso_pratico`: `enunciado` com situação concreta (3–6 frases), `pergunta` objetiva, `analise` com raciocínio fato → norma → consequência.
  - `quiz`: `pergunta` específica do tema da aula (não template), 4 alternativas plausíveis, `explicacao` comentando A/B/C/D.
  - `mapa_mental`: 4 `ramos` com `titulo` real e `descricao`.
  - `dicas`: 4 dicas com `tipo` variado (`dica`/`atencao`/`alvo`/`estrela`).
- `maxOutputTokens: 16_000`, `temperature: 0.5`, `responseMimeType: "application/json"`.
- Validar resultado com Zod; se inválido OU se algum slide obrigatório estiver faltando, fazer **1 retry** e só então cair no `buildLongSlides` como fallback.

Manter o stream SSE intacto (eventos `progress` por aula). Cada aula vira uma chamada Gemini independente (resiliência + paralelismo natural do loop já existente).

### 2. Reforçar a validação dos pares (anti-caixa vazia)

Em `SlideLigarTermos` (`src/components/aulas-interativas/SlidePlayer.tsx`):

- Filtro mais estrito: `termo.trim().length >= 2 && definicao.trim().length >= 10`.
- Se sobrar **menos de 3 pares válidos**, renderizar mensagem "Atividade indisponível" **e chamar `onConcluir()` no mount** — isso destrava o botão Próximo automaticamente, eliminando o bug do botão preso.

### 3. Limpeza do fallback determinístico

Em `src/lib/aulas-interativas-long-slides.ts` e na cópia dentro de `aulas-interativas-preview.ts` (`buildLocalSlides`), o `buildPares` passa a só devolver pares cujo `termo` tenha 2+ palavras E `definicao` 60+ caracteres — se não atingir, devolve array vazio (o slide `ligar_termos` é então pulado pela validação acima). Evita o fallback ruim virar produção.

### 4. QA

- Reprocessar a aula "1.1. Introdução à Filosofia Grega do Direito" pela tela de admin (`/admin/aulas-interativas`) e percorrer os 17 slides no preview confirmando:
  - Conteúdo denso e didático em `conceito`/`exemplo`.
  - 5 pares válidos no `ligar_termos`, sem caixa vazia.
  - Botão Próximo funciona após completar (ou pula se inválido).
  - Quiz com pergunta específica do tema, não genérica.

## Detalhes técnicos

- **Modelo**: `gemini-2.5-flash` direto via `geminiGenerateContent` (já é o padrão do projeto, conforme memória `mem://constraints/ai-provider-gemini.md`).
- **Sem mudanças de schema** no Supabase — o JSON dos slides já é livre em `aulas_interativas_previas.estrutura`.
- **Sem mudanças** no fluxo de "ingestão" (que move da prévia para `aulas_interativas_aulas` / `aulas_interativas_slides`) — ele já copia o JSON tal como vem.
- Tempo por aula: ~15–30 s. Para 9 aulas, o stream já mostra progresso aula a aula, então a UX continua a mesma.

## Fora de escopo

- Não vou mexer no design dos slides nem no layout do `SlidePlayer` além do filtro do `ligar_termos`.
- Não vou refazer a tela de listagem `/aulas-interativas` (a estrutura "lista + capa" da primeira screenshot já está correta).
