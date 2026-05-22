## O que vai mudar

Hoje o pipeline quebra em dois lugares:
1. **Extração**: `pdfjs-dist` no browser só lê texto nativo. Se o PDF for escaneado (caso comum em material da OAB), volta vazio e o Gemini recebe lixo.
2. **Origem**: o admin só aceita 1 PDF de cada vez via upload manual. Você quer importar uma pasta inteira do Drive de uma vez, separando material de estudo dos mapas mentais.

A solução tem 4 partes.

---

## 1. Importador da pasta do Drive (one-shot, server-side aqui no sandbox)

A pasta `1bXuakoB1g3wjRLPzg66gS9Zh609xdDEZ` é compartilhada publicamente. Vou rodar aqui no sandbox:

- `pip install gdown` → baixa recursivamente a pasta inteira preservando a estrutura de subpastas (`gdown --folder <url>`).
- Script Python percorre o diretório local e, para cada PDF:
  - Lê o nome da subpasta. Se contiver `mapa`, `mental`, `esquema`, `mindmap` (case-insensitive, sem acento) → classifica como `mapa_mental`. Senão → `material_estudo`.
  - Faz upload para o Supabase Storage:
    - Material → `aulas-interativas-pdfs/drive-import/<subpasta>/<arquivo>.pdf`
    - Mapa → `aulas-interativas-mapas/<subpasta>/<arquivo>.pdf`
  - Insere uma linha em uma nova tabela `aulas_interativas_arquivos_drive` com: `nome_arquivo`, `subpasta`, `tipo` (`material`|`mapa`), `storage_path`, `bytes`, `pdf_url` público, `aula_sugerida` (slug derivado da subpasta), `status_ingestao` (`pendente`).

Esse passo é **manual/disparado** — não é uma rota da aplicação. A vantagem: a pasta inteira fica versionada no Storage e indexada no banco, e você nunca mais depende do Drive.

```text
/sandbox/drive-dump/
├── 1. Constitucional/
│   ├── Nidal Ahmad - Direito Constitucional.pdf  → material
│   └── mapa-mental-controle-constitucionalidade.pdf → mapa
├── 2. Penal/
│   └── ...
└── Mapas Mentais Gerais/  → tudo aqui vira mapa
```

## 2. Nova tabela e bucket

**Tabela `aulas_interativas_arquivos_drive`** (admin-only):
- `id`, `nome_arquivo`, `subpasta`, `tipo` (`material`/`mapa`), `storage_bucket`, `storage_path`, `pdf_url`, `bytes`, `aula_sugerida_slug`, `curso_id` (FK opcional após ingestão), `status_ingestao` (`pendente`/`em_andamento`/`concluida`/`erro`), `erro_msg`, `created_at`.

**Bucket novo `aulas-interativas-mapas`** (público, para PDFs/imagens de mapas mentais).

RLS: leitura pública dos mapas (igual aulas), escrita só admin.

## 3. Extração robusta de PDFs (corrige o erro atual)

Refatorar `src/lib/aulas-interativas-pdf.client.ts`:

1. Tenta extração nativa via `pdfjs-dist` (já existe).
2. **Checa qualidade**: se o texto < 500 chars OU < 100 letras → marca como `ocr-needed`.
3. Quando OCR é necessário, NÃO faz no browser. Envia o PDF (base64) para uma nova server route `/api/aulas-interativas-ocr` que chama `gemini-2.5-flash` com `inline_data: { mime_type: "application/pdf", data: base64 }` e prompt "Extract all text preserving page structure". Gemini Flash aceita PDF nativo até ~20MB.
4. Devolve o texto OCR ao client, que segue o fluxo normal de chunking por capítulo.

Isso resolve o "erro na hora de extrair" que você está vendo. Atende à memória do projeto (Gemini direto, sem gateway).

## 4. Admin reformulado + mapas mentais nas aulas

`src/routes/_app.admin.aulas-interativas.tsx` ganha 3 abas:

- **Aba "Importados do Drive"**: lista os PDFs da nova tabela. Cada material tem botão "Gerar curso" (dispara o pipeline existente de chunks → módulos → publicar, agora com OCR automático quando preciso). Mostra status por linha.
- **Aba "Upload manual"**: o fluxo atual (drag-and-drop de um PDF), preservado.
- **Aba "Mapas mentais"**: lista os PDFs classificados como mapa, com input pra vincular a uma `aula_id` existente. Ao salvar, insere um slide do tipo `mapa_mental` (novo tipo) no fim daquela aula, com `imagem_url` apontando pro PDF/render.

`SlidePlayer.tsx` ganha o tipo `mapa_mental`: renderiza em tela cheia com `<embed>` para PDF (ou `<img>` se for convertido pra PNG) + botão "Abrir em nova aba". Aluno vê o mapa como último slide antes do quiz final.

## 5. Pré-visualização (atende ao pedido anterior)

A aba "Importados do Drive" já mostra antes de publicar:
- Estrutura proposta (módulos, aulas, contagem de slides).
- Botão "Pré-visualizar aula" abre modal com `SlidePlayer` real.
- Só depois de revisar você clica em "Publicar".

---

## Detalhes técnicos

```text
sandbox script (one-shot)
└─→ gdown --folder <url> ./drive-dump/
    └─→ python upload.py
        ├─→ Supabase Storage (aulas-interativas-pdfs / aulas-interativas-mapas)
        └─→ INSERT INTO aulas_interativas_arquivos_drive

app (TanStack Start)
├─ src/routes/api/aulas-interativas-ocr.ts (NOVO)
│   └─ POST { pdfBase64 } → Gemini Vision → { texto }
├─ src/lib/aulas-interativas-pdf.client.ts (REFATORADO)
│   └─ nativa → checa qualidade → fallback OCR via /api/aulas-interativas-ocr
├─ src/lib/aulas-interativas.functions.ts (+ funções)
│   ├─ listarArquivosDrive() / vincularMapaAAula()
│   └─ tipo slide 'mapa_mental' adicionado ao schema
├─ src/components/aulas-interativas/SlidePlayer.tsx (+ case mapa_mental)
└─ src/routes/_app.admin.aulas-interativas.tsx (REORG em 3 abas)
```

**Migração SQL**: cria `aulas_interativas_arquivos_drive` + bucket `aulas-interativas-mapas` + adiciona `'mapa_mental'` aos tipos válidos de slide (hoje é texto livre, então é só atualizar a validação Zod no servidor).

**Limites**: Gemini Flash aceita PDF até ~20MB inline. Se algum PDF do Drive for maior, o script divide em chunks de páginas antes do OCR (pdfjs-dist server-side via `pdf-lib`).

---

## Arquivos tocados

- **Novo**: `src/routes/api/aulas-interativas-ocr.ts`, migração SQL.
- **Editado**: `src/lib/aulas-interativas-pdf.client.ts`, `src/lib/aulas-interativas.functions.ts`, `src/components/aulas-interativas/SlidePlayer.tsx`, `src/routes/_app.admin.aulas-interativas.tsx`.
- **Script one-shot** (rodado aqui, não vai pro repo): baixa Drive + popula Storage + tabela.

## Resultado

- O erro de extração some (OCR cobre PDFs escaneados).
- A pasta inteira do Drive entra de uma vez, organizada e classificada.
- Você gera cursos com 1 clique a partir dos materiais importados, com prévia antes de publicar.
- Mapas mentais aparecem dentro das aulas correspondentes, exatamente como pediu.
