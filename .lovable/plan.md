## Ajuste

Você tem razão — só **3 PDFs por exame** (edital + prova 1ª fase + gabarito 1ª fase). Isso dá **46 × 3 = 138 PDFs**, algo entre **200–400 MB no total**. Cabe tranquilo no Free do Supabase (1 GB) e sem Lovable Cloud — tudo no Supabase que o projeto já usa.

A parte de 2ª fase eu **removo** das telas e da tabela (você não pediu, e simplifica tudo).

## O que vou fazer

### 1. Bucket no Supabase Storage
- Bucket público `provas-oab` (somente leitura pública).
- Estrutura: `provas-oab/{numero}/edital.pdf`, `prova.pdf`, `gabarito.pdf`.
- RLS: SELECT público; escrita só via service role.

### 2. Simplificar a tabela `provas_oab`
Migration pra dropar `provas_2fase` e `outros_arquivos` (não vamos usar). Mantém: `numero`, `titulo`, `ano`, `oab_exame_id`, `oab_source_url`, `edital_url`, `prova_1fase_url`, `gabarito_1fase_url`.

### 3. `seedProvasOab` passa a baixar + subir
A server function (já protegida por `SEED_PROVAS_TOKEN`):
1. Faz scrape do site da OAB pra achar os 3 PDFs de cada exame.
2. Baixa cada PDF com `fetch`.
3. Sobe pro bucket via `supabaseAdmin.storage.from('provas-oab').upload(..., { contentType: 'application/pdf', upsert: true })`.
4. Grava a `publicUrl` do Supabase nas colunas da tabela (não mais o link da OAB).
5. 200ms de delay entre downloads pra não estressar o site.

Aceita parâmetro opcional `apenasNumero` pra reprocessar um exame específico quando sair retificação ou um exame novo.

### 4. Telas
- `/provas/$numero` — remove o bloco "2ª Fase" e o bloco "Outros documentos". Fica só **Edital / Prova / Gabarito**, apontando pros PDFs do Supabase.
- `/provas` — sem mudança.

### 5. Execução
Quando aprovar:
1. Crio a migration (bucket + policies + drop das colunas).
2. Edito `src/lib/provas-oab.functions.ts`.
3. Edito `src/routes/_app.provas.$numero.tsx` pra tirar a 2ª fase.
4. Você manda "rodar o seed" e eu invoco a função (3–5 min pra processar os 138 PDFs).

Pode seguir?
