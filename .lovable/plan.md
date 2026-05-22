
# Plano de implementação — Blocos 1, 2, 8, 9, 10, 11, 12, 14, 15

Escopo grande. Vou organizar em **fases entregáveis** (cada fase é um PR/commit independente que já deixa o app melhor). Posso fazer tudo de uma vez, mas o ideal é confirmar fase por fase pra você revisar.

---

## FASE A — Segurança (Bloco 1)

### A1. Migration Supabase
- Revogar `EXECUTE` de `anon` e `authenticated` nas funções `SECURITY DEFINER` que não devem ser públicas. Vou listar uma a uma (`has_role`, `get_biblioteca_areas_counts`, `rls_auto_enable`, `handle_new_user`, `touch_updated_at`) e decidir caso a caso — internas ficam `REVOKE ALL`; as que o frontend chama via RPC mantêm `EXECUTE TO authenticated` apenas.
- Adicionar `SET search_path = public, pg_temp` onde faltar.

### A2. Painel Supabase (instruções pro usuário)
- Ativar **Leaked Password Protection** (Auth → Policies). Não dá pra fazer por código — vou deixar o link clicável.
- Revisar rate limits de Auth.

### A3. Headers de segurança
- Adicionar middleware em `src/start.ts` setando: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Content-Security-Policy` (modo report-only inicialmente pra não quebrar nada).
- `X-Frame-Options: DENY` exceto rotas que precisam de embed.

### A4. Server functions
- Varrer todas as `*.functions.ts` que mexem com dados de usuário e garantir uso de `requireSupabaseAuth` (não confiar em `userId` vindo do client).
- Adicionar validação Zod em todos os `inputValidator`.

---

## FASE B — Observabilidade (Bloco 2)

- **Sentry nas server functions**: criar middleware global em `src/start.ts` que envolve cada serverFn em `Sentry.startSpan` e captura exceções com `Sentry.captureException`.
- **Upload de sourcemaps** no build (`@sentry/vite-plugin`).
- **Health check**: `src/routes/api/public/health.ts` retornando `{ db, gemini, time }` (checa DB com `select 1`, ping rápido no Gemini).
- **Logger estruturado** (`src/lib/logger.ts`) usando `pino` (compatível com Worker) com `job_id`/`request_id` correlacionável. Substituir `console.log` dos jobs (sync DOU, narrações, simulados).

---

## FASE C — SEO & share (Bloco 8)

- **Sitemap dinâmico**: `src/routes/api/public/sitemap[.]xml.ts` lendo blog/biblioteca/vade-mecum/atualizacoes-leis.
- **robots.txt** explícito em `public/robots.txt` apontando pro sitemap.
- **JSON-LD**: helpers em `src/lib/jsonld.ts` (`Article`, `Course`, `BreadcrumbList`, `Organization`) usados nas rotas relevantes.
- **OG images dinâmicas**: rota `src/routes/api/public/og/$slug.ts` usando `satori` + `@resvg/resvg-wasm` (edge-friendly). Cache HTTP de 1 dia.
- **Canonical**: helper `canonical()` injetado em `head()` de cada rota crawlável.
- Auditar metadados de cada rota top-level (`title`, `description`, `og:*`) — várias rotas estão herdando só o root.

---

## FASE D — Performance (Bloco 9)

- **Preload de rotas**: `defaultPreload: "intent"` no router (verificar e ativar).
- **Bundle analyzer**: `rollup-plugin-visualizer` no build com saída em `dist/stats.html`.
- **Lighthouse CI**: workflow GitHub Actions (`treosh/lighthouse-ci-action`) rodando em PR contra preview Lovable, com budgets básicos.
- **Image transforms**: helper `supabaseImg(url, {w,h,q})` usando `/render/image/public/...` e substituir usos diretos onde aplica.
- **Lazy-load** componentes pesados (`recharts`, `embla`, `framer-motion` em telas específicas) via `React.lazy`/`@tanstack/react-router` lazy splitting onde já não tem.
- Auditar e remover dependências não usadas (`depcheck`).

---

## FASE E — DevOps & qualidade (Bloco 10)

- **GitHub Actions**:
  - `.github/workflows/ci.yml` — lint + typecheck + build em PR e push.
  - `.github/workflows/lighthouse.yml` — Lighthouse CI.
  - `.github/workflows/codeql.yml` — análise de segurança estática.
- **Renovate**: `.github/renovate.json` com agrupamento por ecossistema (radix, tanstack, supabase, react).
- **Husky + lint-staged**: pre-commit roda `prettier --write` e `eslint --fix` nos arquivos alterados; pre-push roda `tsc --noEmit`.
- **Vitest setup**: `vitest.config.ts`, `src/test/setup.ts`. Testes iniciais (mínimo 1 por util):
  - `srs.test.ts`, `cf-parser.test.ts`, `resenha-parser.test.ts`, `atualizacoes-filtros.test.ts`, `whatsapp-markdown.test.ts`, `titulo.test.ts`.
- **Playwright smoke**: `e2e/smoke.spec.ts` — abre `/`, faz login com usuário de teste (variável), navega `/inicio`, `/atualizacoes-leis`, `/vade-mecum`.
- **Commitlint + conventional-changelog** (opcional, marco se topar).

---

## FASE F — Acessibilidade (Bloco 11)

- Skip-link em `__root.tsx` ("Pular para conteúdo").
- `<main id="main">` em todas as layouts.
- Auditoria com `@axe-core/playwright` no smoke E2E.
- Revisar contraste do tema dourado/marrom (`src/styles.css`) com `oklch` — ajustar tokens se falhar AA.
- Respeitar `prefers-reduced-motion` em todas as animações framer-motion (helper `useReducedMotion()` aplicado nos componentes do hero/transições).
- `aria-label` em ícones sem texto (FAB de filtro, botões de share, etc.).
- Verificar foco visível em todos os botões (ring custom já existe — confirmar consistência).

---

## FASE G — i18n base (Bloco 12)

- Instalar `@lingui/core` + `@lingui/react` + `@lingui/macro` + `@lingui/vite-plugin` (mais leve que react-intl, bom suporte SSR).
- Locale default `pt-BR`, estrutura pronta pra `en` e `es` mesmo vazias.
- Wrapper `<I18nProvider>` no `__root.tsx`.
- Helper `t\`...\`` adotado primeiro nas strings novas; varredura completa fica como tech-debt rastreado por TODO.
- Detectar locale via `Accept-Language` na primeira request (cookie `locale`).

---

## FASE H — Padrões de código (Bloco 14)

- **`src/schemas/`**: centralizar Zod schemas reutilizados (atualizações, simulados, perfil, vade-mecum).
- **Tipagem estrita**: rodar `tsc --noEmit --strict` em modo "no implicit any" e corrigir `any` em payloads de `*.functions.ts` (a varrer: `gemini.server.ts`, `resenha-sync.functions.ts`, jobs).
- **`react-error-boundary`** + Sentry: substituir error boundaries ad-hoc por um único `<AppErrorBoundary>` reutilizável; aplicar nas seções críticas (chat, leitor, simulado).
- **ESLint reforçado**: regras adicionais `@typescript-eslint/no-floating-promises`, `no-misused-promises`, `consistent-type-imports`, `import/order`, `react-hooks/exhaustive-deps` (já tem, garantir error não warn).

---

## FASE I — Padrões de repositório (Bloco 15)

Criar/atualizar:
- `README.md` — overview, stack, screenshots (placeholders), scripts, link da Lovable.
- `LICENSE` — proprietário (All rights reserved) ou MIT? **(quero confirmar com você)**.
- `SECURITY.md` — canal de report (email/URL).
- `CONTRIBUTING.md` — fluxo de PR, commit style.
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1.
- `.github/ISSUE_TEMPLATE/bug_report.yml`, `feature_request.yml`.
- `.github/PULL_REQUEST_TEMPLATE.md`.
- `.env.example` — listar todas as VITE_* e nomes das secrets server-side (só nomes, sem valores).
- `.editorconfig`.

---

## Detalhes técnicos importantes

- **Tudo no stack atual**: TanStack Start + Cloudflare Worker + Supabase. Sem Node-only packages no server (já validei sharp/pino — pino tem build edge).
- **Gemini direto**: mantém regra da memória (sem Lovable AI Gateway).
- **Sem mudar funcionalidades de usuário**: nenhuma feature nova é adicionada; só infra, qualidade e SEO.

## Riscos / pontos de atenção

1. **CSP** pode quebrar embeds (YouTube nas aulas, iframes do Planalto). Começar report-only e ir apertando.
2. **`REVOKE EXECUTE`** em função usada por RPC do client quebra a tela. Vou auditar usos antes de revogar.
3. **Lingui** adiciona ~15 KB e exige `babel-plugin-macros` ou plugin Vite — vou usar plugin Vite (sem ejetar babel).
4. **GitHub Actions** rodar `build` precisa das `VITE_SUPABASE_*` como secrets do repo. Vou documentar no README.
5. **Playwright** em CI precisa de runner com browsers — `microsoft/playwright-github-action` resolve.

## Perguntas pra você antes de começar

1. **LICENSE**: proprietário ("All rights reserved") ou aberto (MIT)?
2. **SECURITY.md**: qual e-mail/canal pra report de vulnerabilidade?
3. Quer que eu rode **tudo de uma vez** (vai dar muitos arquivos num único commit) ou **fase por fase** com sua aprovação no meio?
4. **i18n (Fase G)** — só estrutura agora, mantendo PT-BR como única língua ativa, certo? Não vou traduzir nada de UI existente.

Me responde essas 4 e eu começo pela Fase A.
