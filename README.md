# OAB OEN Point

Plataforma de estudos para concursos da OAB e da magistratura: Vade Mecum
interativo, simulados, biblioteca curada, atualizações legislativas (DOU /
Planalto) e blog editorial.

## Stack

- **Frontend**: React 19 + [TanStack Start](https://tanstack.com/start) (SSR) + Vite 7
- **Estilo**: Tailwind v4 + tokens em `src/styles.css` (oklch)
- **Backend**: Cloudflare Worker (server functions / server routes)
- **Banco**: Supabase Postgres com RLS obrigatória
- **IA**: Google Gemini API direto (sem gateways)
- **Observabilidade**: Sentry + logger estruturado (`src/lib/logger.ts`)

## Scripts

```bash
bun install
bun run dev       # dev server em http://localhost:3000
bun run lint
bun run build
bunx vitest run
```

## Variáveis de ambiente

Veja `.env.example`. Variáveis `VITE_*` são públicas (vão no bundle).
Secrets do servidor vivem no painel da plataforma (Supabase / Lovable).

## Estrutura

```
src/
  routes/          # file-based routing (TanStack)
    api/public/    # endpoints públicos (sitemap, health, webhooks)
  components/      # UI reutilizável
  lib/             # server fns (*.functions.ts) e utilitários
  integrations/    # Supabase clients (auth-middleware, client, client.server)
  schemas/         # Zod schemas compartilhados
public/            # assets estáticos servidos como /
supabase/          # migrations
```

## Segurança

- Veja `SECURITY.md` para reportar vulnerabilidades.
- RLS é a primeira linha; server fns com `requireSupabaseAuth` são o gate principal.
- Service role só em `src/integrations/supabase/client.server.ts`.

## Contribuir

Veja `CONTRIBUTING.md`. Código sob licença proprietária (ver `LICENSE`).
