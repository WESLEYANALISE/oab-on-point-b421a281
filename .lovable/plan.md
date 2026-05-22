# Aulas interativas — versão "estudo de verdade"

Hoje cada aula tem 3-6 slides curtos e o quiz só no fim. Vou expandir o conteúdo, adicionar interação real (ligar termos, dicas) e encadear as aulas com uma animação de "próxima aula".

## 1. Novos tipos de slide

Adicionar 3 tipos novos ao CHECK constraint do banco e ao validador Zod:

- **`ligar_termos`** — jogo de associar termo ↔ definição (4-6 pares). O aluno clica no termo e depois na definição correspondente; acertos ficam verdes, erros piscam vermelho e voltam. Só libera "Próximo" quando todos os pares estão corretos.
- **`dicas`** — cartões de "Dicas de prova" (3-5 dicas curtas, cada uma com um ícone e 1-2 frases). Usado perto do fim como "checklist mental" antes do quiz final.
- **`caso_pratico`** — mini-caso: enunciado curto + pergunta-âncora + revelação ("clique para ver a análise") com o raciocínio jurídico.

Os tipos existentes (`capa`, `conceito`, `exemplo`, `esquema`, `comparativo`, `quiz`, `resumo`, `conclusao`, `mapa_mental`) continuam funcionando.

## 2. Geração no Gemini — aulas mais densas

Reescrever o prompt `SYSTEM_SLIDES_MODULO` em `src/routes/api/aulas-interativas-preview.ts` para que **cada aula tenha 9-13 slides** seguindo este roteiro pedagógico:

```text
1. capa             — título + 3-4 objetivos
2. conceito         — definição com texto + destaque
3. exemplo          — exemplo prático aplicado (caso real / questão OAB)
4. comparativo      — quando faz sentido, contrastar correntes/escolas
5. quiz (revisão)   — quiz CURTO no meio da aula, sobre o que viu até aqui
6. conceito         — segundo conceito / aprofundamento
7. caso_pratico     — mini-caso com análise revelável
8. ligar_termos     — 4-6 pares termo ↔ definição da aula
9. esquema          — passo-a-passo ou fluxograma do raciocínio
10. dicas           — 3-5 dicas finais ("cai na OAB", "pegadinha", "decoreba")
11. resumo          — bullets do que vimos
12. quiz (final)    — quiz mais difícil, estilo OAB
13. conclusao       — fecho + frase de transição para a próxima aula
```

Regras adicionais do prompt:
- Cada aula tem **pelo menos 2 quizzes** (um no meio, um no fim), 1 `ligar_termos`, 1 `dicas`, 1 `caso_pratico`.
- Texto dos conceitos passa a ter 2-4 parágrafos (não 1 frase) e usa `**negrito**` markdown nos termos-chave (já renderizado).
- Quizzes devem ser estilo OAB: enunciado com mini-caso + 4 alternativas + explicação que diz **por que** as outras estão erradas.
- Continua proibido inventar — só usa o material extraído.

Também atualizar `fallbackSlides` para gerar essa estrutura completa quando o Gemini falhar.

## 3. Botão "Próxima aula" com animação

No `src/lib/aulas-interativas.functions.ts`, `getAulaCompleta` passa a retornar também `proximaAula` (próxima na mesma ordem do curso) e `aulaAnterior`, calculados via uma consulta ordenada por `(modulo.ordem, aula.ordem)`.

No `SlidePlayer.tsx`:
- Novo prop `proximaAulaHref?: string`.
- No último slide (`conclusao`), o botão "Concluir aula" vira **"Próxima aula →"** quando há próxima; clicar dispara animação de slide-out lateral (framer-motion `x: -100%, opacity: 0` em 400ms) e navega para a próxima aula. Se não houver próxima, mostra "Concluir curso" (volta pro curso) com confete sutil.
- Header da próxima aula entra com `slide-in-right`, reforçando a sensação de "continuidade".

## 4. Renderização dos novos tipos no player

No `src/components/aulas-interativas/SlidePlayer.tsx`:
- `SlideLigarTermos` — duas colunas embaralhadas; estado local de seleção e pares resolvidos; trava o botão "Próximo" do footer até concluir.
- `SlideDicas` — grid de cartões com ícone (`Lightbulb`, `AlertTriangle`, `Target`, `Sparkles`) e texto em markdown.
- `SlideCasoPratico` — enunciado + pergunta + botão "Ver análise" que expande a explicação com animação.

Todos usam o componente `MD` já existente para renderizar markdown nos textos.

## 5. Banco de dados

Migration para:
1. Ampliar o CHECK `aulas_interativas_slides_tipo_check` aceitando `ligar_termos`, `dicas`, `caso_pratico`.
2. Não precisa mudar `conteudo` (jsonb já aceita qualquer shape).

## 6. Refazer as aulas existentes

Não vou regerar automaticamente os cursos antigos — o admin de "Aulas Interativas" já tem o fluxo de **excluir curso → gerar prévia → publicar**. Após o deploy, basta:
1. Excluir o curso "Filosofia do Direito" atual.
2. Clicar "Gerar prévia" e "Publicar" novamente — vai usar o novo prompt automaticamente.

Posso opcionalmente adicionar um botão **"Regerar slides"** numa próxima iteração se quiser, mas isso aumenta o escopo. Confirme se quer já agora.

---

## Resumo técnico

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/...` | Ampliar CHECK de `tipo` |
| `src/lib/aulas-interativas.functions.ts` | Zod aceita novos tipos; `getAulaCompleta` retorna `proximaAula`/`aulaAnterior` |
| `src/routes/api/aulas-interativas-preview.ts` | Novo prompt detalhado + `fallbackSlides` expandido |
| `src/components/aulas-interativas/SlidePlayer.tsx` | Renderizadores para `ligar_termos`, `dicas`, `caso_pratico`; botão "Próxima aula" com animação |
| `src/routes/_app.aulas-interativas.$cursoSlug.$aulaSlug.tsx` | Passa `proximaAulaHref` ao player |

Posso seguir?
