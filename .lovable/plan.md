## Objetivo

Trocar o fluxo atual de 1 botão ("Gerar curso") por um pipeline de 3 etapas explícitas na aba **Materiais de estudo**, cada card mostrando seu estado:

```text
[ Pendente ] → Extrair  →  [ Extraído ] → Gerar prévia → [ Prévia pronta ] → Gerar curso → [ Concluído ]
```

---

## Etapa 1 — Extrair (Mistral OCR)

**Botão "Extrair"** no card do material.

- Nova server route `POST /api/aulas-interativas-extract` (admin-only):
  1. Baixa o PDF do Storage (`storage_bucket` + `storage_path`).
  2. Sobe pro Mistral via `https://api.mistral.ai/v1/ocr` (`mistral-ocr-latest`) usando `MISTRAL_API_KEY` (já existe nos secrets) — extrai texto + imagens página a página, preservando formato (markdown).
  3. Faz upload das imagens extraídas pro bucket `aulas-interativas-imagens` em `extracoes/<arquivoId>/pag-N-img-K.png`.
  4. **Limpeza**: remove blocos que pareçam logo/marca d'água, citação ao professor, nome de cursinho, capa de divulgação (heurística por regex + prompt curto pro Gemini sobre os primeiros/últimos N parágrafos marcando "remover/manter").
  5. Salva resultado em nova tabela `aulas_interativas_extracoes`:
     - `arquivo_drive_id` (FK), `markdown` (texto limpo), `paginas` (jsonb com `{n, texto, imagens:[url]}`), `imagens` (jsonb array de URLs), `tokens_estimados`, `created_at`.
  6. Atualiza `status_ingestao = 'extraido'` no arquivo.

UI: card mostra "Extraindo… página X/Y" via polling do status; ao terminar, libera o botão "Gerar prévia".

## Etapa 2 — Gerar prévia (Gemini, sem salvar curso)

**Botão "Gerar prévia"** aparece quando `status = 'extraido'`.

- Nova server route `POST /api/aulas-interativas-preview`:
  1. Lê `aulas_interativas_extracoes` do arquivo.
  2. Chama Gemini (`gemini-2.5-flash`, via `gemini.server.ts` que já tem fallback de chave) passando o markdown + imagens como contexto, com o mesmo prompt de estruturação que hoje vive em `aulas-interativas-pdf-to-course.ts`.
  3. **NÃO grava em `aulas_interativas_cursos`** — grava em nova tabela `aulas_interativas_previas`:
     - `arquivo_drive_id`, `estrutura` (jsonb: módulos → aulas → slides), `created_at`.
  4. Atualiza `status_ingestao = 'previa_pronta'`.

UI: ao concluir, abre modal de prévia (já existe componente similar) mostrando:
- Lista de módulos → aulas → contagem de slides + tipos.
- Botão "Visualizar aula" usando `SlidePlayer` em modo preview.
- Botão "Regenerar prévia" (refaz etapa 2 com a mesma extração).
- Botão "Gerar curso" (avança pra etapa 3).

## Etapa 3 — Gerar curso (salvar no Supabase)

**Botão "Gerar curso"** dentro do modal de prévia.

- Server route `POST /api/aulas-interativas-publish`:
  1. Lê a prévia mais recente do arquivo.
  2. Faz insert em `aulas_interativas_cursos`, `_modulos`, `_aulas`, `_slides` (transação por etapas, igual fluxo atual).
  3. Vincula `curso_id` no arquivo, status → `concluido`.
  4. Opcional: se houver mapa mental da mesma `subpasta`, sugere vincular automaticamente (mantém botão manual também).

---

## Schema novo

Migração:

```sql
create table aulas_interativas_extracoes (
  id uuid primary key default gen_random_uuid(),
  arquivo_drive_id uuid not null references aulas_interativas_arquivos_drive(id) on delete cascade,
  markdown text not null,
  paginas jsonb not null default '[]',
  imagens jsonb not null default '[]',
  tokens_estimados int,
  created_at timestamptz not null default now()
);

create table aulas_interativas_previas (
  id uuid primary key default gen_random_uuid(),
  arquivo_drive_id uuid not null references aulas_interativas_arquivos_drive(id) on delete cascade,
  estrutura jsonb not null,
  created_at timestamptz not null default now()
);

-- novos status válidos
-- 'pendente' | 'extraindo' | 'extraido' | 'gerando_previa' | 'previa_pronta' | 'publicando' | 'concluido' | 'erro'
```

RLS: admin-only (via `has_role(auth.uid(),'admin')`).

---

## Arquivos tocados

**Novos:**
- `src/routes/api/aulas-interativas-extract.ts` (Mistral OCR + limpeza + upload imagens).
- `src/routes/api/aulas-interativas-preview.ts` (Gemini estrutura → tabela prévias).
- `src/routes/api/aulas-interativas-publish.ts` (prévia → curso oficial).
- `src/lib/mistral-ocr.server.ts` (helper de chamada Mistral com retry).
- Migração SQL (2 tabelas + status novos).

**Editados:**
- `src/lib/aulas-interativas-drive.functions.ts` — adicionar `getExtracao`, `getPrevia`, e expor novo enum de status.
- `src/routes/_app.admin.aulas-interativas.tsx` — card do material vira pipeline visual (3 botões condicionais por status) + modal de prévia.
- Deprecar `aulas-interativas-pdf-to-course.ts` (lógica migra pra preview + publish).

---

## Pontos de atenção

- **Cota Mistral OCR**: PDFs grandes (>50 páginas) podem demorar; rota deve responder rápido com job em background. Plano: rodar síncrono até 60s (Worker limit). Se passar, dividir em batches por intervalo de páginas e gravar parcial em `paginas`.
- **Imagens**: bucket `aulas-interativas-imagens` já existe (público).
- **Limpeza de "professor/cursinho"**: regex + lista negra editável (`logo`, `prof\.?`, `instagram`, `@`, `whatsapp`, etc.) + passe leve do Gemini só nos N primeiros/últimos parágrafos pra não gastar token à toa.
- **Idempotência**: cada etapa apaga o registro anterior do mesmo arquivo antes de inserir (re-extrair / re-gerar prévia funcionam).

---

## Resultado final

Cada card de material mostra claramente em que etapa está e qual o próximo botão. Você revisa a prévia antes de qualquer escrita em `aulas_interativas_cursos`, e só publica quando tiver tudo certo.
