## Objetivo

Ao clicar em um tema (ex.: Agentes Públicos), abrir uma **trilha de aula** com os capítulos do tema em linha do tempo (igual aos resumos). Cada capítulo vira uma aula com 4 etapas:

1. **Ler** — conteúdo do capítulo (markdown que já existe)
2. **Flashcards** — gerados por IA a partir do capítulo
3. **Questões** — gerados por IA, múltipla escolha estilo OAB
4. **Caderno de erros** — questões erradas do usuário, agrupadas por tema

## Mudanças

### Roteamento
- Trocar o link em `_app.aulas.$materia.tsx` para apontar para `/aulas/$materia/$livroId` (novo).
- Criar `src/routes/_app.aulas.$materia.$livroId.tsx` — timeline dos capítulos (visual igual a `/resumos/$livroId`, mas com header de matéria).
- Criar `src/routes/_app.aulas.$materia.$livroId.$ordem.tsx` — aula do capítulo com tabs **Ler / Flashcards / Questões**.
- Criar `src/routes/_app.caderno-erros.tsx` — lista de questões erradas do usuário.

### Backend (server functions + DB)
- Tabela `aula_flashcards` (cache por capítulo): `resumo_livro_id`, `ordem`, `cards jsonb` (array de `{frente, verso}`), gerado uma vez por IA e reutilizado.
- Tabela `aula_questoes` (cache por capítulo): `resumo_livro_id`, `ordem`, `questoes jsonb` (array `{enunciado, alternativas[5], correta, explicacao}`).
- Tabela `aula_respostas` (por usuário): `user_id`, `resumo_livro_id`, `ordem`, `questao_idx`, `alternativa_escolhida`, `acertou`, `created_at` — alimenta o caderno de erros.
- RLS: cache de cards/questões legível por authenticated; respostas privadas por `user_id`.
- Server fns em `src/lib/aulas-trilha.functions.ts`:
  - `gerarFlashcards({ livroId, ordem })` — chama Gemini com o markdown do capítulo, salva e retorna.
  - `gerarQuestoes({ livroId, ordem })` — idem, 5 questões OAB.
  - `registrarResposta({ livroId, ordem, questaoIdx, alternativa, acertou })`.
  - `listarErros()` — agrupado por matéria/tema para o caderno.

### Frontend
- **Ler**: renderiza o markdown do capítulo (mesmo componente dos resumos).
- **Flashcards**: card com flip, navegação ←/→, contador. Loader na primeira geração.
- **Questões**: cartão por questão, alternativas A–E, ao responder mostra explicação e registra acerto/erro; ao terminar mostra score.
- **Caderno de erros**: lista agrupada por matéria → tema → questão, com link para revisar.

### IA
- Gemini 2.5 Flash via `GEMINI_API_KEY` (já existe), respostas em JSON estrito.

## Diagrama do fluxo

```text
/aulas/constitucional
   └─ tema "Ação Popular"
       └─ /aulas/constitucional/{livroId}        (timeline de capítulos)
           └─ /aulas/constitucional/{livroId}/1  (aula do capítulo 1)
                tabs: Ler | Flashcards | Questões
                      └─ erros vão pro Caderno
```

## Fora de escopo desta entrega
- Edição manual de cards/questões.
- Repetição espaçada (SRS) — primeira versão é navegação simples.
- Exportar caderno em PDF.

## Próximo passo
Confirma o plano? Em caso afirmativo, começo pela migration + server functions e depois as 3 telas.