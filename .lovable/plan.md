## Visão Geral

Criar duas frentes ligadas pelo mesmo dado:

1. **Aba pública `/resumos`** — usuário navega pelos livros da biblioteca que já têm resumos gerados e lê capítulo por capítulo.
2. **Ferramenta admin `/admin/resumos`** — lista todos os livros da biblioteca, permite gerar uma **prévia do sumário** (você confere e ajusta) e depois disparar a **geração completa** dos resumos didáticos com Mistral (OCR do PDF) + Gemini (estruturação e enriquecimento).

Cada item do sumário vira **um resumo (uma "aula")**. Se houver "Parte I" e "Parte II" do mesmo tema, são mescladas em um único capítulo. Imagens relevantes do PDF são extraídas e exibidas no conteúdo.

---

## Banco de Dados

Hoje algumas tabelas (`BIBLIOTECA-CLASSICOS`, `LIDERANÇA`, `ORATORIA`, `POLITICA`) já têm `resumo_capitulos jsonb`, `analise_status`, etc., e outras (`ESTUDOS`, `FORA-DA-TOGA`) não. Para padronizar sem mexer nas 6 tabelas, criar duas tabelas novas:

**`resumo_livros`** (1 linha por livro)
- `id uuid pk`
- `biblioteca_slug text` (`estudos | classicos | oratoria | lideranca | politica | fora-da-toga`)
- `livro_id bigint` (FK lógica para a tabela da biblioteca correspondente)
- `titulo`, `autor`, `capa`, `area` (snapshot)
- `pdf_url text` (resolvido de `download`/`link`)
- `status text` (`sem_previa | previa_pronta | gerando | concluido | erro`)
- `previa jsonb` (lista ordenada `{ ordem, titulo, partes:[{label, pagina_inicio, pagina_fim}], incluir:boolean }`)
- `erro_msg`, `created_at`, `updated_at`
- Unique `(biblioteca_slug, livro_id)`

**`resumo_capitulos`** (1 linha por capítulo gerado)
- `id uuid pk`
- `resumo_livro_id uuid fk`
- `ordem int`, `titulo text`, `slug text`
- `conteudo_markdown text` (texto didático final)
- `imagens jsonb` (`[{url, legenda, pagina}]`)
- `status text` (`pendente | gerando | ok | erro`)
- `created_at`, `updated_at`

**RLS**
- `resumo_livros` / `resumo_capitulos`: leitura pública (`SELECT true`), escrita restrita a `has_role(auth.uid(),'admin')`.

**Storage**
- Reutilizar bucket `provas-oab` ou criar novo bucket público `resumos-imagens` para as imagens extraídas dos PDFs.

---

## Backend (TanStack server functions)

Novo arquivo `src/lib/resumos-admin.functions.ts` (admin) e `src/lib/resumos.functions.ts` (público).

**Admin (`requireSupabaseAuth` + checagem `admin`):**
- `listarLivrosParaResumo()` — UNION das 6 tabelas da biblioteca + `LEFT JOIN resumo_livros` para mostrar status atual.
- `gerarPreviaResumo({ slug, livro_id })`
  1. Baixa o PDF (campo `download` ou `link`).
  2. Mistral OCR → texto bruto + páginas + imagens.
  3. Gemini com prompt específico: "extraia o sumário; agrupe Parte I/II do mesmo tema; devolva JSON ordenado".
  4. Salva em `resumo_livros.previa`, status `previa_pronta`.
- `atualizarPrevia({ resumo_livro_id, previa })` — admin marca/desmarca capítulos, edita títulos.
- `gerarResumosCompletos({ resumo_livro_id })` — para cada capítulo marcado:
  1. Recorta texto bruto pelas páginas indicadas.
  2. Gemini passo 1: estrutura o conteúdo em markdown.
  3. Gemini passo 2: enriquece em tom de professor (explicação didática, exemplos, destaques).
  4. Extrai imagens das páginas correspondentes (Mistral entrega imagens base64) → upload no Storage → grava `imagens`.
  5. Insere em `resumo_capitulos`.
  Processa em fila/lotes para não estourar timeout (mesmo padrão do `simulado-queue.ts`).
- `regerarCapitulo({ capitulo_id })` — refaz só um.

**Público:**
- `listarLivrosComResumo()` — filtra `resumo_livros.status='concluido'`, agrupa por `biblioteca_slug`/`area`.
- `obterLivroResumo(resumo_livro_id)` — capítulos ordenados.

**Secrets:** já existem `MISTRAL_API_KEY` e `GEMINI_API_KEY`. Reaproveitar.

---

## Frontend

**Rotas novas/alteradas**

- `src/routes/_app.resumos.tsx` — substitui o `ComingSoon` por uma página com:
  - Grid de livros que possuem resumo (capa + título + autor + nº de capítulos).
  - Filtros por biblioteca/área.
- `src/routes/_app.resumos.$livroId.tsx` — leitor: sidebar com sumário (capítulos), conteúdo em markdown, imagens inline, navegação anterior/próximo.
- `src/routes/_app.admin.resumos.tsx` — painel admin:
  - Tabela de livros com status (`sem prévia | prévia pronta | gerando | concluído | erro`).
  - Botão **"Gerar prévia"** por livro.
  - Modal/drawer com a prévia editável (checkbox por item, edição de título, merge manual de partes), botão **"Gerar resumos completos"**.
  - Barra de progresso por livro durante a geração.
  - Botão "Regerar capítulo" dentro do livro já concluído.
- Adicionar card de "Resumos" em `_app.admin.index.tsx`.
- Adicionar link/ícone para `/resumos` na navegação principal (verificar `_app.tsx`/menu existente).

**UI**
- Reaproveitar componentes do projeto (`Card`, `Button`, `Drawer`, `Progress`).
- Renderização markdown: usar `react-markdown` (se já existir) ou adicionar.

---

## Fluxo do admin (resumo)

```text
1. Admin abre /admin/resumos
2. Vê lista de livros da biblioteca (todas as 6 tabelas)
3. Clica "Gerar prévia" em um livro
   -> Mistral OCR + Gemini extrai sumário
   -> Status vira "prévia pronta"
4. Admin abre a prévia, marca/desmarca capítulos, ajusta títulos
5. Admin clica "Gerar resumos completos"
   -> Fila processa capítulo por capítulo
   -> Cada capítulo: texto didático + imagens
6. Status vira "concluído" -> aparece em /resumos para todos
```

---

## Detalhes técnicos

- **OCR e tamanho de PDF**: Mistral OCR endpoint `pixtral`/`mistral-ocr`. Truncar/paginar se PDF for grande. Cachear `ocr_texto` em coluna extra de `resumo_livros` para não reprocessar entre prévia e geração final.
- **Mescla Parte I/II**: heurística no prompt do Gemini + normalização (regex `parte\s+(i|ii|1|2)`).
- **Imagens**: Mistral OCR retorna imagens por página em base64. Filtrar por tamanho mínimo e excluir logos/cabeçalhos repetidos.
- **Timeouts**: processar capítulos em background com mesmo padrão do `simulado-queue.ts` (job table opcional `resumo_jobs` se a fila ficar complexa; na 1ª versão dá pra fazer batch sequencial dentro do server function chamando-se em loop pelo client).
- **Idempotência**: regerar um capítulo deve sobrescrever a linha existente (`upsert` por `(resumo_livro_id, ordem)`).

---

## Entregáveis por etapa

1. Migrations (`resumo_livros`, `resumo_capitulos`, RLS, bucket de imagens).
2. Server functions admin + público.
3. Página admin com prévia editável e geração.
4. Página pública `/resumos` + leitor `/resumos/$id`.
5. Card "Resumos" no admin home + entrada na navegação principal.
