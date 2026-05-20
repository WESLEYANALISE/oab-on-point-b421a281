## O que vamos construir

Nova entrada **"Atualizações de Leis"** dentro dos *Seus Atalhos OAB* (em `/app`), que abre uma tela tipo **calendário** mostrando, por dia, todos os atos publicados no D.O.U. (Leis, EC, MPs, Decretos, Mensagens de Veto). Os dados vêm da página da **Resenha Diária do Planalto**, raspados automaticamente 3x/dia (08h, 17h, 21h), armazenados no Supabase no mesmo padrão do Vade Mecum (lei + artigos quando aplicável). Hoje rodamos a primeira extração manual para popular o histórico do mês corrente.

## Fluxo

```text
Planalto Resenha (mês corrente)
        │  fetch direto (HTML estático latin-1) → fallback Browserless
        ▼
parser da tabela "Data | Atos Publicados"
        │  → { data_dou, edicao_extra, atos:[{tipo, numero, data_assinatura, ementa, url}] }
        ▼
upsert em legis_resenha_dia + legis_atos (Supabase)
        │
        ▼
calendário em /app/atualizacoes-leis
        │  dia → lista de atos com link p/ Planalto + status
        ▼
(opcional) "Importar texto" por ato → reaproveita pipeline de cf-parser para extrair artigos
```

## Banco (nova migration)

Duas tabelas novas, leitura pública, escrita só admin/service-role:

- **`legis_resenha_dia`**
  - `data_dou date` (PK junto com `edicao_extra`)
  - `edicao_extra boolean default false`
  - `mes_ref text` (`'2026-05'`) — pra saber qual página foi raspada
  - `fonte_url text`
  - `extraido_em timestamptz default now()`
  - `total_atos int default 0`

- **`legis_atos`**
  - `id uuid pk`
  - `data_dou date`, `edicao_extra boolean` (fk lógica para `legis_resenha_dia`)
  - `tipo text` — `lei` | `lei_complementar` | `emenda_constitucional` | `medida_provisoria` | `decreto` | `decreto_lei` | `mensagem_veto` | `outro`
  - `numero text` (ex.: `15.408`, `1.360`, `139`)
  - `data_assinatura date` (extraída de `de 14.5.2026`)
  - `ementa text`
  - `url text` (link Planalto)
  - `hash text unique` — `sha1(tipo|numero|data_assinatura)` p/ deduplicar entre execuções
  - `texto_importado boolean default false` (vira true quando rodarmos extração de artigos)
  - `vade_mecum_lei_id uuid null` (link opcional para `vade_mecum_leis` quando importarmos os artigos)
  - `created_at`, `updated_at`

- **`legis_sync_runs`** (log de execuções do cron)
  - `id`, `executado_em`, `gatilho` (`cron-08h`|`cron-17h`|`cron-21h`|`manual`), `mes_ref`, `novos int`, `atualizados int`, `erro text null`

RLS: SELECT public (calendário é livre p/ usuário logado), INSERT/UPDATE só admin via policy igual à do Vade Mecum.

## Backend

- **`src/lib/resenha-parser.ts`** — puro: recebe HTML do mês, devolve `Array<{ data_dou, edicao_extra, atos[] }>`. Regex:
  - linha de cabeçalho `(\d{1,2}) de (\w+) de (\d{4})( - Edição extra)?`
  - cada ato: `(Lei|Lei Complementar|Emenda Constitucional|Medida Provisória|Decreto|Decreto-Lei|Mensagem de Veto[^]*?) nº ([\d\.]+), de ([\d\.]+)\)? .*? - (.*?)(?=<br>|$)`
- **`src/lib/resenha-sync.functions.ts`** — `executarSyncResenha({ meses?: string[] })`:
  1. resolve meses a raspar (default: mês corrente; manual aceita lista);
  2. baixa cada página `https://www4.planalto.gov.br/.../{mes}-resenha-diaria` (já usando `fetchDirect` que existe em `browserless.server.ts`, com fallback Browserless);
  3. roda parser, faz `upsert` em `legis_resenha_dia` + `legis_atos` (chave `hash`);
  4. registra `legis_sync_runs` com contagem;
  5. retorna resumo `{ novos, atualizados, dias }`.
- **`src/routes/api/public/hooks.resenha-sync.ts`** — POST com `apikey`, chama `executarSyncResenha`. Aceita `{ meses?: ['maio','junho'] }` no body.
- Reutiliza `BROWSERLESS_API_KEY` (já cadastrado) só como fallback.

## Cron (pg_cron)

Três jobs, todos chamando o mesmo hook, fuso `America/Sao_Paulo` (vou usar UTC: 11h, 20h, 00h+1 UTC):

```sql
select cron.schedule('resenha-sync-08', '0 11 * * *', $$ select net.http_post(...) $$);
select cron.schedule('resenha-sync-17', '0 20 * * *', $$ select net.http_post(...) $$);
select cron.schedule('resenha-sync-21', '0 0 * * *',  $$ select net.http_post(...) $$);
```

## Frontend

### 1. Novo atalho em `ATALHOS` (src/routes/_app.app.tsx)
Adiciona item **"Atualizações de Leis"** com ícone `BellRing` apontando para `/atualizacoes-leis`.

### 2. Página `src/routes/_app.atualizacoes-leis.tsx`
Layout mobile-first dentro da identidade existente (toga/gold):

```text
[ Header: Atualizações de Leis ]
[ Mês: maio 2026 ▾ ]   [ ⟳ Sincronizar ]  ← botão admin
[ Calendário grid 7x5 — dias com publicação destacados em gold ]
[ Lista do dia selecionado ]
   • LEI 15.408/2026 — Institui o Julho Neon... [abrir no Planalto ↗]
   • DECRETO 12.974/2026 — Altera o Decreto nº 12.930...
   ...
[ Última sincronização: hoje 14:32 — 0 novos | 3 atualizados ]
```

- `useQuery` em `listResenhaMes({ mes })` (server fn que lê do Supabase).
- Badge "NOVO" em atos com `created_at >= now() - 24h`.
- Filtro por tipo (chips: Leis · EC · MP · Decretos · Vetos).
- Sem autenticação especial — leitura pública (igual notícias).

### 3. Página admin já existente (`/admin`)
Adiciona linha **"Resenha · Sync"** apontando para `/atualizacoes-leis?admin=1` (reaproveita botão Sincronizar com `useServerFn(executarSyncResenha)`).

## Extração manual de hoje

Após aplicar migration + secret, rodo `executarSyncResenha({ meses: ['maio'] })` uma vez pelo painel admin — isso popula todos os dias de maio 2026 já listados na Resenha (a partir de 4/maio). Os crons assumem a partir de amanhã 08h.

## Detalhes técnicos

- **Parser de mês PT-BR**: mapa `{janeiro:1, ..., dezembro:12}` para montar `data_dou`.
- **Tipos**: regex captura prefixo do link; mapeio para enum em texto livre (sem ENUM Postgres pra evitar migrations futuras a cada categoria nova).
- **Hash de dedupe**: `sha1(tipo|numero|data_assinatura)` calculado no parser, garante idempotência entre as 3 execuções diárias.
- **Edições extras**: vira linha separada (`edicao_extra = true`) — o cabeçalho da resenha vem como `"19 de maio de 2026 - Edição extra"`.
- **URLs absolutas**: já vêm do Planalto, salvamos como estão.
- **Fonte do mês**: a página é estática por mês (`maio-resenha-diaria`, `junho-resenha-diaria`...). O job calcula o mês corrente em SP. Em virada de mês, raspamos `mes_atual` + `mes_anterior` por 3 dias para pegar publicações tardias.
- **Botão "Importar texto" por ato (opcional, fase 2)**: reaproveitará `cf-parser`/`cf-sync` para LEIs e ECs, criando registro em `vade_mecum_leis` + `vade_mecum_artigos`. Não entra nesta entrega — esta entrega foca em catalogar e exibir.

## Arquivos a criar/editar

- migration: `legis_resenha_dia`, `legis_atos`, `legis_sync_runs` + RLS + 3 cron jobs
- `src/lib/resenha-parser.ts` (puro)
- `src/lib/resenha-sync.functions.ts` (createServerFn)
- `src/routes/api/public/hooks.resenha-sync.ts`
- `src/routes/_app.atualizacoes-leis.tsx`
- editar `src/routes/_app.app.tsx` (adicionar atalho)
- editar `src/routes/_app.admin.index.tsx` (entrada admin)

## Decisões pra você confirmar

1. **Ícone do atalho**: prefere `BellRing` (notificação), `Gavel` (martelo), ou `ScrollText` (pergaminho)?
2. **Acesso à página**: público (qualquer aluno vê) ou só admin? Sugiro **público** — é informação útil pro aluno.
3. **Importar texto integral dos artigos**: deixo só catalogando agora (link p/ Planalto) e a "importação para Vade Mecum" fica como fase 2 com 1 clique por ato, ok?
