## Diagnóstico — por que o sync está quebrando

O erro vindo do servidor é:

```
Browserless falhou após retries :: 400 Bad Request :: POST Body validation failed: "waitFor" is not allowed
```

Isso vem de `src/lib/browserless.server.ts`, função `fetchRendered()`. Hoje o corpo enviado para o `/content` é:

```json
{ "url": "...", "gotoOptions": { "waitUntil": "...", "timeout": 45000 }, "waitFor": 4000 }
```

A documentação atual do Browserless (REST `/content`, v2) confirma:

- O campo **`waitFor` não existe mais** no schema do `/content`. Por isso o serviço responde **400 Bad Request — "waitFor" is not allowed**, antes mesmo de abrir o Chrome. Como o erro é 4xx, nosso loop de retries aborta corretamente — mas todas as 3 estratégias mandam `waitFor`, então todas falham.
- O substituto oficial é **`waitForTimeout: <ms>`** (number, top-level), documentado em "Request Configuration → waitForTimeout".
- Outras opções de espera modernas: `waitForSelector`, `waitForFunction`, `waitForEvent` — todas top-level, não dentro de `gotoOptions`.
- O endpoint atual recomendado é **`https://production-sfo.browserless.io/content`** (o domínio antigo `chrome.browserless.io` ainda costuma responder, mas a doc nova usa `production-sfo`).
- `gotoOptions.waitUntil` continua válido (`domcontentloaded`, `load`, `networkidle0`, `networkidle2`) e `gotoOptions.timeout` também.
- Para casos onde o Planalto ainda detecta automação, existe o endpoint **`/unblock`** (com `content: true`) feito para passar por proteções tipo Datadome/challenges JS — é o caminho oficial quando o `/content` volta vazio/bloqueado.

Conclusão: o sync não é um problema de rede nem de bot detection desta vez — é incompatibilidade de schema. Trocar `waitFor` por `waitForTimeout` desbloqueia as 3 tentativas.

## Plano de correção

Escopo: somente `src/lib/browserless.server.ts`. Nada de UI, nada de banco.

1. **Atualizar endpoint** para `https://production-sfo.browserless.io/content?token=...` (alinhado à doc v2).
2. **Reescrever `fetchRendered()`** com o schema correto:
   - Tentativa 1 (leve): `{ gotoOptions: { waitUntil: "domcontentloaded", timeout: 45000 }, waitForTimeout: 4000 }`
   - Tentativa 2 (robusta): `{ gotoOptions: { waitUntil: "load", timeout: 60000 }, waitForTimeout: 6000 }`
   - Tentativa 3 (resiliente a frame detach): `{ gotoOptions: { waitUntil: "networkidle2", timeout: 60000 }, waitForTimeout: 3000 }`
   - Manter o break em 4xx (não adianta retentar) e capturar `lastErr` com status + corpo truncado.
3. **Fallback opcional para `/unblock`**: se as 3 tentativas do `/content` retornarem HTML que `isBotChallenge()` ainda considera bloqueado, fazer uma última tentativa em `https://production-sfo.browserless.io/unblock?token=...` com `{ url, browserWSEndpoint: false, cookies: false, content: true, ttl: 0 }`. Esse endpoint é o caminho oficial recomendado pela Browserless quando o `/content` é barrado por proteção JS — útil para o Planalto, que justamente roda challenge `bobcmn`/`TSPD`.
4. **Não mexer** em `fetchDirect()`, na lógica de `isBotChallenge()`, nem nos handlers de sync — eles continuam corretos; só dependem de `fetchRendered()` voltar a funcionar.

## Validação

- Abrir `/atualizacoes-leis` como admin, clicar **Sincronizar** para Maio/2026.
- Esperado: o toast deixa de mostrar `"waitFor" is not allowed` e passa a mostrar `Sincronizado: X novos, Y atualizados`, mesmo que `X = 0` em dias sem publicação.
- Em caso de novo erro, ele virá com mensagem diferente (timeout, 5xx, challenge persistente), o que já será informativo para o próximo passo.

## Detalhes técnicos (referência)

- Doc oficial: `https://docs.browserless.io/rest-apis/content` e `…/request-configuration` confirmam que `waitForTimeout` (number, top-level, ms) é a forma suportada. `waitFor` é legado e rejeitado pela validação Joi do servidor.
- `gotoOptions` aceita `{ waitUntil, timeout, referer }`. Não aceita `waitFor` aninhado.
- Endpoint `/unblock` aceita `{ url, content: true, ... }` e responde JSON com o HTML em `content` (não `text/html` cru) — então, se for usado, o parser precisa ler `await res.json()` e extrair `.content`.
