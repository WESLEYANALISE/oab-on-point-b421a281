## Mudança de estratégia

Em vez de comparar texto integral artigo-a-artigo (lento e barulhento), vamos usar como "carimbo de alteração" os parênteses que o Planalto coloca embaixo de cada dispositivo:

- `(Redação dada pela Emenda Constitucional nº 132, de 2023)`
- `(Incluído pela Emenda Constitucional nº 19, de 1998)`
- `(Revogado pela Emenda Constitucional nº 45, de 2004)`
- `(Vide ADIN nº ...)` ← ignorar, não é alteração de texto.

A presença/ausência desses marcadores, e a **data mais recente** entre eles por artigo, dá um sinal preciso e barato de "esse artigo mudou". Comparando contra um snapshot anterior do mesmo artigo, sabemos exatamente o que foi alterado/incluído/revogado desde a última checagem.

## Por que Browserless

A página da Constituição no Planalto é HTML antigo (latin-1, tabelas aninhadas, sem JS), então `fetch` simples funciona — **não precisaria** de Browserless **para a CF**. Mas para padronizar e cobrir outras leis (CTB, CLT, etc. que às vezes carregam por JS, redirecionam ou bloqueiam por User-Agent), Browserless é a escolha certa: roda Chrome headless e devolve HTML renderizado e estável.

Usaremos via REST:
- `POST https://chrome.browserless.io/content?token=$BROWSERLESS_API_KEY` com `{ url, gotoOptions: { waitUntil: 'networkidle0' } }` → devolve HTML pronto.
- Cota controlada por `BROWSERLESS_API_KEY` (a registrar como secret).

## Estrutura da solução

```text
Browserless (POST /content)
        │  HTML renderizado
        ▼
parser de marcadores de alteração
        │  por artigo: { numero, ult_alteracao_em, fontes[], status: ativo|revogado }
        ▼
diff contra snapshot anterior salvo no Supabase
        │
        ▼
relatório em vade_mecum_sync_relatorios + atualização incremental
```

### 1. Migration (banco)
Tabelas/colunas novas:
- `vade_mecum_artigos.ult_alteracao_em date` (data extraída do parêntese mais recente).
- `vade_mecum_artigos.alteracoes jsonb` (lista: `[{ tipo: 'redacao'|'inclusao'|'revogacao', norma: 'EC 132', data: '2023-12-20' }]`).
- `vade_mecum_artigos.revogado boolean default false`.
- `vade_mecum_sync_relatorios` (id, lei_id, fonte_url, executado_em, status, novos jsonb, alterados jsonb, revogados jsonb, resumo_md).
- RLS: leitura admin; escrita só via service role.

### 2. Server-side
- **`src/lib/browserless.server.ts`** — helper `fetchRendered(url)` que chama Browserless e retorna o HTML cru. Lê `process.env.BROWSERLESS_API_KEY`. Lança erro claro se ausente.
- **`src/lib/cf-parser.ts`** (puro, testável) —
  - corta o documento em "Principal" e "ADCT" pelo marcador `ATO DAS DISPOSIÇÕES…`;
  - encontra cada bloco de artigo via regex `Art\.\s*(\d+[ºo°]?(?:-[A-Z])?)`;
  - dentro do bloco, captura os trechos `(\(.*?(Redação|Incluíd|Revogad|Acrescentad).*?(\d{4})\))` e extrai `{ tipo, norma, data }`;
  - retorna `Map<numero, { texto, alteracoes[], ult_alteracao_em, revogado }>`.
- **`src/lib/cf-sync.functions.ts`** — `executarSyncCF()`:
  1. baixa via Browserless;
  2. roda parser;
  3. busca `vade_mecum_artigos` da CF com colunas `numero, ult_alteracao_em, alteracoes, revogado`;
  4. classifica cada artigo em: `igual`, `alterado` (ult_alteracao_em diferente), `novo` (não existia no banco), `revogado_novo` (passou a estar revogado);
  5. grava relatório; atualiza apenas os campos novos (`ult_alteracao_em`, `alteracoes`, `revogado`) — **não toca em `texto`** para preservar narrações/comentários até aprovação manual.
- **`src/routes/api/public/hooks/cf-sync.ts`** — rota POST chamada pelo cron, com verificação `apikey` (padrão do projeto). Internamente chama `executarSyncCF`.

### 3. Cron (`pg_cron` + `pg_net`)
Agendamento semanal (domingo 03:00):
```sql
select cron.schedule('cf-sync-weekly','0 3 * * 0', $$
  select net.http_post(
    url:='https://project--7143ea90-be27-484f-9f3e-f50d2fa31549.lovable.app/api/public/hooks/cf-sync',
    headers:='{"Content-Type":"application/json","apikey":"<ANON>"}'::jsonb,
    body:='{}'::jsonb) $$);
```

### 4. Tela admin
Nova entrada em `/admin` → **Vade Mecum · Sync**:
- botão "Rodar agora" (chama `executarSyncCF`);
- lista de relatórios com badge (✓ nada novo / ⚠ N artigos alterados / 🆕 N novos / ⛔ N revogados);
- ao abrir um relatório: tabela com `numero | status | norma | data` e botão **"Reimportar texto deste artigo"** (só aí roda comparação de texto completo, focada, e atualiza `texto`/`texto_hash`).

### 5. Secret necessário
- `BROWSERLESS_API_KEY` — você pega em https://www.browserless.io (plano free tem cota suficiente para rodar 1x/semana). Depois eu peço pra você adicionar via o tool de secrets.

## Escopo desta entrega
Só CF (principal + ADCT). Mesmo motor depois é parametrizado por `vade_mecum_leis.fonte_url` para cobrir o restante.

## O que você decide antes de eu implementar
1. **Browserless** — confirma que vai criar a conta e me passar a `BROWSERLESS_API_KEY`? (ou prefere começar com `fetch` direto e Browserless só depois?)
2. **Periodicidade** do cron — semanal (sugerido) ou diário?
3. **Notificação** quando o relatório acusar mudança — só dentro de `/admin` (sugerido) ou também e-mail/WhatsApp?
