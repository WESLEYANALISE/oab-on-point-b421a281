
## Visão geral

Nova feature "Aulas Interativas": o admin envia um PDF (como o do Prof. Nidal Ahmad, 227 págs.), o sistema extrai texto + imagens, a IA (Gemini, conforme regra do projeto) organiza em **Curso → Módulos → Aulas → Slides** seguindo o sumário, e o aluno percorre cada aula em formato slide-a-slide com quiz inline e barra de progresso.

## Estimativa para o PDF enviado

O sumário do PDF tem 3 níveis (`1.`, `1.1.`, `1.1.1.`, `1.1.1.1.`) ao longo de 227 páginas. Proposta de granularidade:

- **1 Curso** = 1 PDF ("Direito Penal — Prof. Nidal Ahmad")
- **1 Módulo** = capítulo top-level (`1. Da aplicação da Lei Penal`, `2. Crimes omissivos…`, etc.) → ~10–14 módulos
- **1 Aula** = subseção `1.1`, `1.2`… (ex.: "Lei penal no tempo", "Lei penal no espaço") → ~5 aulas por módulo
- **Slides por aula** = cada item `1.1.1.x` vira 1–3 slides (conceito → exemplo → esquema/imagem → mini-quiz)

**Total estimado: ~60–80 aulas, ~600–900 slides, ~25–35h de estudo**. Quem confirma o número final é a IA na primeira ingestão (mostramos preview antes de publicar).

## Formato da aula interativa (player)

Cada aula é uma sequência de slides tipados:

1. **Capa** — título da aula + objetivos ("ao final você saberá…")
2. **Conceito** — texto curto (máx. ~150 palavras) + destaque do dispositivo legal
3. **Exemplo** — caso prático extraído do PDF
4. **Esquema/Imagem** — quando o PDF traz imagem ("Para todos verem: esquema"), ela vira slide visual
5. **Comparativo** — tabelas (ex.: abolitio criminis × novatio in mellius)
6. **Quiz rápido** — 1 pergunta múltipla escolha a cada 3–4 slides (gerada pela IA com base no conteúdo)
7. **Resumo final** — bullets do que foi visto
8. **Conclusão** — botão "Concluir aula" que marca progresso e leva à próxima

Interações:
- Setas ← → / swipe mobile / teclado
- Barra de progresso no topo (slide atual / total)
- Botão "marcar como lida" salva progresso por slide
- Quiz inline com feedback imediato e explicação
- Botão "perguntar à Profa. Ana" leva ao chat do `/assistente` com contexto do slide

## Painel admin (gerar aulas)

Nova rota `/admin/aulas-interativas` com fluxo:

1. **Upload do PDF** (drag & drop, até ~50MB) → vai pro bucket `aulas-interativas-pdfs`
2. **Extração** (server fn): usa `pdftotext -layout` para texto e `pdfimages` para imagens; só as imagens grandes (>200px) são mantidas e enviadas pro bucket `aulas-interativas-imagens`
3. **Estruturação por IA** (Gemini 2.5 Flash, chamada direta — conforme `mem://constraints/ai-provider-gemini.md`): recebe o texto completo + lista de imagens com página; devolve JSON `{ curso, modulos[{ titulo, aulas[{ titulo, slides[{ tipo, conteudo, imagem_ref?, quiz? }] }] }] }`. PDFs grandes são processados em chunks por capítulo top-level.
4. **Preview** — admin vê árvore com contadores e pode editar título de módulo/aula, reordenar, regerar slide específico, ou excluir slides ruins
5. **Publicar** — grava no banco e fica disponível pros alunos

## Acesso do aluno

- Novo card "Aulas Interativas" no grid de atalhos do `/inicio` (acrescentado em `src/data/atalhos.ts`, ícone `PlayCircle`, gradiente próprio)
- Nova rota `/aulas-interativas` lista cursos publicados → entrar abre tela do curso com lista de módulos/aulas e % concluído
- Rota `/aulas-interativas/$cursoSlug/$aulaId` é o player de slides

## Detalhes técnicos

**Banco (migração nova):**
- `aulas_interativas_cursos` (titulo, slug, descricao, capa_url, materia, publicado)
- `aulas_interativas_modulos` (curso_id, titulo, ordem)
- `aulas_interativas_aulas` (modulo_id, titulo, slug, descricao, ordem, duracao_min)
- `aulas_interativas_slides` (aula_id, ordem, tipo `'capa'|'conceito'|'exemplo'|'esquema'|'comparativo'|'quiz'|'resumo'|'conclusao'`, conteudo jsonb, imagem_url, quiz_json)
- `aulas_interativas_progresso` (user_id, aula_id, slide_atual, concluida, atualizado_em)
- RLS: cursos publicados leitura pública; mutação só para `has_role(uid,'admin')`; progresso scoped por `auth.uid()`

**Storage (2 buckets públicos):** `aulas-interativas-pdfs`, `aulas-interativas-imagens`.

**Server functions** (`src/lib/aulas-interativas.functions.ts` + `.server.ts`):
- `listarCursos`, `getCurso(slug)`, `getAula(id)` — leitura pública
- `salvarProgresso({ aulaId, slide, concluida })` — autenticada
- `[admin] ingerirPdf({ pdfUrl })` — extrai texto/imagens, chama Gemini em chunks, devolve preview JSON (sem persistir)
- `[admin] publicarCurso(estrutura)` — grava tudo em transação
- `[admin] regenerarSlide({ slideId })`, `editarSlide`, `excluirSlide`, `reordenar`

**Extração PDF no servidor:** usar `pdfjs-dist` (puro JS, roda no Worker) para texto e `pdfjs-dist` + canvas/`unpdf` para extrair imagens; alternativa robusta é fazer o parsing client-side no admin (browser tem `pdf.js` nativo) e enviar JSON+imagens já prontos pro server. **Decisão recomendada: parsing no browser do admin** (evita limites do Worker com PDFs de 40MB) e o server só recebe o pacote estruturado + faz as chamadas Gemini.

**IA (Gemini direto):** reaproveita `src/lib/gemini.server.ts` (já existente, com fallback de chaves). Prompt do system pede JSON estrito + cita o objetivo de granularidade (1 sub-tópico = 1–3 slides). Modelo: `gemini-2.5-flash` para estruturação em massa; `gemini-2.5-pro` opcional para regenerar 1 slide específico.

**Rotas novas:**
- `src/routes/_app.aulas-interativas.index.tsx` (catálogo)
- `src/routes/_app.aulas-interativas.$cursoSlug.tsx` (sumário do curso)
- `src/routes/_app.aulas-interativas.$cursoSlug.$aulaId.tsx` (player)
- `src/routes/_app.admin.aulas-interativas.tsx` (lista + upload + preview)

**Componentes novos:**
- `SlidePlayer` (navegação, swipe, progresso, atalhos teclado)
- `SlideRenderer` (switch por `tipo`)
- `QuizInline` (pergunta + feedback)
- `AulaCard`, `ModuloAccordion`, `CursoHero`
- Admin: `PdfUploader`, `EstruturaPreview`, `SlideEditor`

## O que NÃO entra neste plano

- Geração de áudio/narração dos slides (pode virar v2)
- Exportar aula como PDF
- Compartilhar progresso socialmente
- Editor visual WYSIWYG de slides (admin edita só texto/quiz)

## Perguntas rápidas antes de implementar

1. **Quem pode acessar?** Todos os usuários logados, ou só plano pago? (Assumo: todos logados, igual ao `/assistente`.)
2. **Onde fica o atalho no `/inicio`?** Adiciono como 9º card no grid de atalhos ou substituo algum existente? (Assumo: adiciono novo.)
3. **Posso já rodar a 1ª ingestão deste PDF do Nidal Ahmad** assim que o admin estiver pronto, para você ver o resultado real?
