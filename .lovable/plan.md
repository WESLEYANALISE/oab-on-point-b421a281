## Objetivo

Trocar o atalho "Questões" por "**Provas OAB**" e criar uma nova área onde o usuário acessa, de todos os exames já realizados, três PDFs: **Prova**, **Gabarito** e **Edital** — com os arquivos catalogados no Supabase.

## O que descobri no site da OAB

Fui em `examedeordem.oab.org.br/EditaisProvas` e mapeei todos os exames disponíveis no dropdown oficial:

- **46 exames no total** (do "Exame de Ordem Unificado 2010.2" até o "46º Exame de Ordem Unificado")
- Cada exame tem uma página própria com uma lista de "Arquivos" contendo:
  - Edital de abertura
  - Prova da 1ª fase (objetiva) + gabarito
  - Prova da 2ª fase (prático-profissional, por área: Civil, Penal, Trabalho, Tributário, Constitucional, Administrativo, Empresarial) + espelhos/gabaritos
  - Comunicados, retificações, resultados

Como cada exame tem dezenas de PDFs (1ª fase + várias áreas da 2ª fase), proponho começar com os 3 principais por exame e por área da 2ª fase (decisão sua abaixo).

## Mudanças

### 1. Trocar o atalho na home
- `src/data/atalhos.ts`: substituir o item `questoes` por `provas` → label "**Provas OAB**", descrição "Edital, prova e gabarito", ícone `FileText`, rota `/provas`.
- `src/routes/_app.index.tsx`: atualizar a lista usada na barra inferior também (item `Questões` → `Provas`).

### 2. Nova tabela no Supabase

Migration criando `provas_oab` (leitura pública, sem escrita pelo cliente):

| coluna | tipo | descrição |
|---|---|---|
| `id` | bigint pk | |
| `numero` | int | 1 a 46 (ordem cronológica) |
| `titulo` | text | ex. "45º Exame de Ordem Unificado" |
| `ano` | int | |
| `edital_url` | text | PDF do edital |
| `prova_1fase_url` | text | PDF da prova objetiva |
| `gabarito_1fase_url` | text | PDF do gabarito definitivo da 1ª fase |
| `provas_2fase` | jsonb | `[{ area, prova_url, espelho_url }]` por área |
| `oab_source_url` | text | link da página oficial do exame |

RLS: `SELECT` público; sem insert/update/delete pelo cliente.

### 3. Server function de scraping (popular o banco)

`src/lib/provas-oab.functions.ts` com `seedProvasOab` (admin-only, chamada manualmente por você uma vez):

1. Busca o HTML de `https://examedeordem.oab.org.br/EditaisProvas?NumeroExame=0` para pegar os 46 `option value` do dropdown.
2. Para cada um, faz fetch de `?NumeroExame={value}`, extrai os links de PDF da lista "Arquivos" e classifica por tipo (edital / prova 1ª / gabarito 1ª / prova 2ª por área / espelho).
3. Usa `supabaseAdmin` para `upsert` em `provas_oab`.

Execução: você roda uma vez via um botão "Atualizar catálogo" escondido (ou via `invoke-server-function`). Como a OAB lança um exame por vez, depois é só rodar de novo quando sair um exame novo.

### 4. Telas

- **`src/routes/_app/provas.tsx`** — Listagem dos 46 exames em grid (cards com número e ano), ordenados do mais recente para o mais antigo. Busca via `useQuery` no Supabase.
- **`src/routes/_app/provas.$numero.tsx`** — Detalhe do exame escolhido:
  - Bloco "1ª Fase": botões de download para **Edital**, **Prova** e **Gabarito**.
  - Bloco "2ª Fase": lista por área (Civil, Penal, Trabalho, etc.) com **Prova** e **Espelho** de cada uma.
  - Cada botão abre o PDF oficial da OAB em nova aba (`target="_blank" rel="noopener"`).

Visual seguindo o resto do app (mesmos tokens, cor `gold`, mesmo padrão dos cards de "Atalhos").

## Decisão necessária antes de implementar

A 2ª fase tem **7 áreas por exame** × 46 exames = muitos PDFs. Como você quer que eu trate?

- **(A) Só 1ª fase**: edital + prova + gabarito da objetiva (mais simples, 3 PDFs por exame).
- **(B) 1ª e 2ª fase completas**: tudo (edital, 1ª fase + 2ª fase por área) — recomendado, é o que existe oficialmente.
- **(C) 1ª fase + apenas uma área da 2ª fase escolhida pelo usuário** no onboarding.

Me responde A, B ou C e eu sigo.

## Detalhes técnicos

- Scraping feito em server function com `fetch` + regex/`cheerio` no HTML (a página é server-rendered, sem JS).
- Sem armazenar os PDFs no Storage por enquanto — apontamos para a URL oficial da OAB (sempre atualizada, sem custo de storage). Se um dia a OAB tirar do ar, dá pra migrar para o bucket `avatars`/novo bucket.
- `useProfile` e demais hooks não são tocados.