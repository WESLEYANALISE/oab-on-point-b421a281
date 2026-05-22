# Contribuindo

## Fluxo

1. Abra uma issue descrevendo a mudança antes de PR grandes.
2. Crie branch `feat/...`, `fix/...`, `refactor/...`, `docs/...` ou `chore/...`.
3. Commits no formato [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(atualizacoes): adiciona filtro por estado`
   - `fix(vade-mecum): corrige scroll do índice no mobile`
4. Abra PR contra `main` usando o template.

## Local

```bash
bun install
bun run dev        # http://localhost:3000
bun run lint
bun run build
bunx vitest run
```

## Estilo

- TypeScript estrito, sem `any` em código novo.
- Componentes em `src/components/`, hooks em `src/hooks/`, server fns em `src/lib/*.functions.ts`.
- Use tokens de design do `src/styles.css`. Não use cores hardcoded.
- Strings de UI passam por `t("chave", "fallback PT-BR")` (ver `src/lib/i18n.ts`).
