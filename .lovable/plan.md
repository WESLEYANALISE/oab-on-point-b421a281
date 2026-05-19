## O que muda

Hoje a aba **Ler** apenas mostra o resumo do capítulo (que já existe na seção de Resumos). Vamos transformar essa aba em uma **AULA estruturada e didática**, dividida em **partes**, com tom de professor (amigável + técnico), saudações, exemplos práticos e explicação passo a passo. A navegação também muda: a trilha (Ler · Flashcards · Questões · Erros · Simulado) vai para o **rodapé**, e o topo passa a mostrar **em qual parte da aula** o aluno está.

---

## 1. Geração da aula pela IA (nova server function)

Criar `gerarAulaCapitulo` em `src/lib/aulas-trilha.functions.ts`, no mesmo padrão de `obterFlashcardsCapitulo` (cache em tabela própria, Gemini 2.5 Flash, JSON estrito).

- **Entrada**: `resumo_livro_id`, `ordem`.
- **Base**: usa `resumo_capitulos.conteudo_markdown` como matéria-prima — **não** retorna o resumo cru.
- **Saída (JSON)**:
  ```
  {
    "introducao": "saudação + por que essa aula importa (2-4 frases)",
    "partes": [
      {
        "titulo": "Nome curto da parte",
        "resumo_curto": "1 frase do que será visto",
        "conteudo_markdown": "explicação tim-tim por tim-tim, com fundamento legal",
        "exemplo_pratico": "caso concreto estilo OAB (2-4 frases)",
        "pontos_chave": ["bullet 1", "bullet 2", "bullet 3"]
      }
    ],
    "fechamento": "resumo final + gancho para flashcards"
  }
  ```
- **Quantidade**: 3 a 6 partes (a IA decide pelo tamanho do capítulo).
- **Tom no system prompt**: professor brasileiro de OAB, amigável mas técnico, usa "você", começa cumprimentando, explica como se estivesse em sala, dá exemplos práticos, cita fundamento legal quando pertinente. Sem markdown decorativo desnecessário.
- **Cache**: nova tabela `aula_capitulo_aulas` com colunas `resumo_livro_id`, `ordem`, `aula` (jsonb), índice único `(resumo_livro_id, ordem)`. Migration separada (vou pedir confirmação antes de aplicar).

## 2. Novo layout da rota `/_app/aulas/$materia/$livroId/$ordem`

### Topo (header da aula)
Quando a etapa ativa é **Ler**, o header passa a mostrar:
- Linha 1: matéria · "Aula X de N" (igual hoje)
- Linha 2: título do capítulo (menor, 1 linha)
- Linha 3: **mini-stepper horizontal das PARTES da aula** (bolinhas numeradas + título curto da parte ativa), com a parte atual destacada em dourado, igual ao estilo do stepper atual mas adaptado.

Nas outras etapas (Flashcards/Questões/Erros/Simulado), o topo mostra apenas a etapa ativa ("Flashcards · 3 de 10" etc.), sem o stepper de partes.

### Conteúdo central — aba "Ler" reformulada
- **Parte 0**: tela de introdução (saudação + "vamos começar").
- **Parte 1..N**: cada parte renderiza:
  - Título da parte
  - Conteúdo em markdown (explicação detalhada)
  - Botão **"Ver exemplo prático"** que revela o `exemplo_pratico` com animação suave
  - Card de **pontos-chave** no final
  - Botões **Anterior** / **Próxima parte** (na última parte vira "Concluir leitura → Flashcards")
- Transição entre partes com fade/slide suave.
- Estados de loading (gerando aula) e erro (com retry) reaproveitando padrão dos flashcards.

### Rodapé (NOVO menu de etapas)
A trilha **Ler · Flashcards · Questões · Erros · Simulado** que hoje fica no topo desce para uma **barra fixa no rodapé**, substituindo a barra atual de "Aula anterior · Trilha · Próx. aula". Visual:
- Pílula com 5 ícones + label curto, etapa ativa em dourado, etapas concluídas com check, próxima etapa com leve pulso (mantém a estética atual do stepper, só migrada para baixo).
- Tap em qualquer etapa troca a aba.
- A navegação entre capítulos (anterior/próxima aula) é movida para um botão discreto no header (ao lado do título) ou aparece só na última etapa concluída — proponho: **botão "Próxima aula"** aparece automaticamente no rodapé quando a etapa Simulado é concluída; navegação manual entre capítulos vai para um menu no header ("⋯ Trilha do livro").

## 3. Arquivos afetados

- `src/lib/aulas-trilha.functions.ts` — adicionar `gerarAulaCapitulo`.
- `src/routes/_app.aulas.$materia.$livroId.$ordem.tsx` — reescrever layout:
  - Novo componente `AulaLerView` (substitui o bloco atual de ReactMarkdown direto)
  - Novo `PartesStepper` no header (visível só na etapa Ler)
  - Novo `EtapasFooter` no rodapé (substitui o Stepper de topo + a barra de navegação entre capítulos)
- `src/styles.css` — pequenas animações: slide entre partes, pulse do dot da etapa próxima.
- **Migration**: criar `aula_capitulo_aulas` (jsonb + unique index).

## 4. Detalhes técnicos

- A aula é gerada **sob demanda** quando o usuário entra na etapa "Ler" (mesma estratégia dos flashcards/questões). Primeira vez ~5-10s, depois cache instantâneo.
- Mantemos o modelo `gemini-2.5-flash` (regra do projeto em `mem://constraints/ai-provider-gemini.md`).
- Não mexemos em flashcards, questões, erros e simulado (já estão bons).
- O conteúdo do resumo bruto deixa de aparecer aqui — quem quiser ler o resumo cru continua tendo a rota de Resumos.
