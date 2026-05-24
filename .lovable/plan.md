## Objetivo

Conferir o Código Civil (Lei 10.406/2002) contra o texto consolidado no Planalto, registrar todas as alterações de **2020 em diante** e adicionar o **link permanente do Planalto em cada um dos 2.388 artigos**. Expor isso no app com um **badge "Atualizado em AAAA"** no card e uma **nova aba "Alterações"** dentro do modal do artigo.

## O que existe hoje

- Tabela `vade_mecum_artigos` já tem `ult_alteracao_em` (date) e `alteracoes` (jsonb), mas **todos os 2.388 artigos do CC estão zerados** nesses campos.
- Não existe coluna de URL/Planalto por artigo.
- A UI do artigo (`_app.vade-mecum.estatutos.$slug.tsx`) tem abas Artigo / Explicação / Exemplo / Termos — sem aba de alterações nem badge de atualização.

## Passos

### 1. Migração de banco
Adicionar uma coluna nova em `vade_mecum_artigos`:
- `planalto_url text` — link permanente para o artigo no Planalto (ex.: `https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm#art1`).

`ult_alteracao_em` e `alteracoes` continuam como estão (jsonb já preparado para a lista).

### 2. Script de sincronia com o Planalto (one-off, server-side)
Script TypeScript executado uma vez (via `code--exec` com `bun`) que:

a. Baixa o texto compilado oficial:
   `https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm`

b. Faz parse do HTML procurando, para cada artigo:
   - âncora do artigo (`<a name="art1">`, `art1A`, etc.) → monta `planalto_url`.
   - blocos de marcação `(Redação dada pela Lei nº X, de AAAA)`, `(Incluído pela Lei nº X)`, `(Vide Lei...)`, `(Vigência)`, `(Revogado pela Lei...)` que aparecem logo após o caput / parágrafo / inciso.

c. Filtra altera­ções com **ano ≥ 2020** e monta, por artigo:
   ```json
   "alteracoes": [
     {
       "tipo": "redacao" | "inclusao" | "revogacao" | "vigencia",
       "lei": "Lei nº 14.382",
       "data": "2022-06-27",
       "url": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/L14382.htm",
       "escopo": "caput" | "§ 1º" | "inciso II" | ...
     }
   ]
   ```
   e define `ult_alteracao_em` = data mais recente do array, `revogado` = true se houver alteração de revogação total.

d. Para os 2.388 artigos: grava `planalto_url` (mesmo nos não alterados).
   Para os alterados desde 2020: grava `alteracoes` + `ult_alteracao_em` (+ `revogado` quando aplicável).

e. Imprime um **relatório no terminal**: total alterado desde 2020, lista das leis alteradoras (ex.: Lei 14.010/2020 RJET, Lei 14.382/2022 SERP, Lei 14.451/2022 idade nupcial, Lei 14.711/2023 garantias, Lei 14.879/2024 foro de eleição etc.), e quantos artigos ficaram sem link (deve ser 0).

Persistência via `INSERT ... ON CONFLICT (id) DO UPDATE` ou `UPDATE` direto pelo `SERVICE_ROLE_KEY`. O script é descartável — fica em `scripts/sync-cc-planalto.ts` para poder ser re-rodado quando o Planalto for atualizado.

### 3. UI — `_app.vade-mecum.estatutos.$slug.tsx`

a. **Card do artigo (lista)**: quando `ult_alteracao_em >= 2020-01-01`, mostrar um pequeno chip âmbar `Atualizado em 2024` ao lado do número do artigo. Quando `revogado=true`, chip vermelho `Revogado`.

b. **Modal do artigo**: adicionar uma 5ª aba **"Alterações"** (visível só quando `alteracoes?.length > 0`). Conteúdo:
   - Lista cronológica reversa: cada item com tipo (Redação dada / Incluído / Revogado), nome da lei, data formatada (dd/mm/aaaa), escopo afetado e botão "Ver no Planalto" → abre `url` em nova aba.
   - No topo da aba, um botão secundário "Abrir artigo no Planalto" usando `planalto_url`.

c. **Ícone "olho"** já presente no header do modal: linkar para `planalto_url` quando existir (atalho rápido).

### 4. Tipos
Após a migração rodar, regenerar `src/integrations/supabase/types.ts` (automático) — não editar à mão.

## Fora de escopo

- Outros códigos (CP, CPC, CPP, CDC, CLT...) — fica para depois, com o mesmo script parametrizado.
- Alterações anteriores a 2020.
- Importação de texto novo de artigos (só metadados de alteração + link).
- Página administrativa para disparar a sync — fica como script manual por enquanto.

## Detalhes técnicos

- Scraping com `fetch` nativo (Planalto serve HTML estático, sem necessidade de Firecrawl/Browserless).
- Parser com `cheerio` (já no projeto? verificar; se não, `bun add cheerio` no momento da execução).
- Regex de detecção, ex.:
  `\(Redação dada pela (Lei|Lei Complementar|Emenda Constitucional)[^)]*?de\s+(\d{1,2}\s+de\s+\w+\s+de\s+)?(\d{4})[^)]*\)`
- Datas normalizadas para `YYYY-MM-DD` (quando só houver ano, usar `AAAA-01-01` e marcar `data_aproximada=true` no JSON).
- O `planalto_url` usa o documento **compilado** (`l10406compilada.htm`), não a versão original, pra refletir o texto vigente.
