## Fase 3 — Polimento (sem pré-geração de IA)

Vou fazer os 4 itens de polimento agora. O item 1 (pré-geração de IA em background) fica para depois, como você pediu.

### 1. Sentry — monitoramento de erros (~30min)
- Instalar `@sentry/react` e `@sentry/tanstackstart-react`.
- Inicializar no `src/start.ts` (server) e no client entry, lendo `SENTRY_DSN` de env.
- Configurar:
  - `tracesSampleRate: 0.1` (10% de transações, suficiente para Web Vitals)
  - `replaysOnErrorSampleRate: 1.0` (gravação de sessão só quando há erro)
  - Filtrar erros de extensões de browser e ResizeObserver (ruído).
- Adicionar `ErrorBoundary` global no `__root.tsx` que reporta pro Sentry.
- **Precisa do secret `SENTRY_DSN`** — vou pedir quando começar.

### 2. Listas mais leves (biblioteca e blog) (~30min)
- Auditar as queries de listagem que ainda trazem campos pesados:
  - `blog_posts` na home/listagem → trocar `select("*")` por `select("id,titulo,slug,categoria,capa,resumo,publicado_em")` (deixa o `conteudo` de fora, que pode ter 50–100KB por post).
  - Qualquer outra listagem que esteja puxando colunas grandes sem necessidade.
- Manter `select("*")` apenas em telas de detalhe (uma linha só).

### 3. Capas da biblioteca em AVIF/WebP (~45min)
- As capas vêm do Supabase Storage como JPG/PNG. Não dá pra usar `vite-imagetools` (são URLs dinâmicas, não bundle).
- Solução: criar um helper `getCoverUrl(url, { width, format })` que usa o **Supabase Image Transformation** (já incluso no plano), gerando URLs com `?width=300&format=webp&quality=80`.
- Aplicar em todos os `<img>` de capa (biblioteca, "continuar lendo", resumos).
- Adicionar `loading="lazy"` e `decoding="async"` onde ainda não tem.
- Ganho esperado: ~60–70% menos bytes por capa, LCP melhor em listagens.

### 4. Cache offline melhor (PWA) (~45min)
- Hoje o `manifest.webmanifest` está OK, mas não há service worker — o app não funciona offline.
- Adicionar `vite-plugin-pwa` com configuração **segura para o preview do Lovable**:
  - `devOptions.enabled: false` (SW só em produção).
  - Guard no registro: não registrar dentro de iframe nem em hosts `lovableproject.com` / `id-preview--`.
  - `NetworkFirst` para HTML (não trava em build antigo).
  - `CacheFirst` com expiração de 30 dias para: fontes, ícones, capas do Storage.
  - `navigateFallbackDenylist: [/^\/api/, /^\/~oauth/]`.
- Resultado: estudante no metrô abre o app e continua de onde parou (rotas já visitadas + capas).
- **Aviso:** offline só funciona no site publicado, não no preview do editor.

### Ordem de execução
1. Listas mais leves (rápido, ganho imediato)
2. Capas AVIF/WebP (rápido, visível)
3. Sentry (precisa do DSN)
4. PWA offline (mais delicado, deixo por último para isolar se algo quebrar)

### Métricas-alvo após esta fase
- Listagem do blog: ~80% menos bytes transferidos
- Listagem da biblioteca: LCP -300ms em mobile
- 100% dos erros em produção visíveis no Sentry
- App utilizável offline para conteúdo já visitado

Posso começar?
