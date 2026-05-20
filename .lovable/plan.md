## Diagnóstico — o que encontrei no app

Investiguei 66 rotas, 30k linhas de código, dependências, padrões de cache, SSR e assets. Abaixo o que mais pesa hoje e o que dá pra otimizar, em ordem de impacto.

### 🔴 Alto impacto (perceptível pelo usuário)

| # | Problema | Evidência | Ganho estimado |
|---|---|---|---|
| 1 | **PWA quebrada** — `manifest.webmanifest` só tem 1 ícone `.ico`, sem `192/512.png`, sem service worker, sem cache offline | `public/manifest.webmanifest` | Instalação no celular passa a funcionar; conteúdo já lido fica offline |
| 2 | **Sem prerender de rotas estáticas** (landing, /blog, /biblioteca, /provas, /vade-mecum) | Todas SSR a cada request | TanStack reporta **5× throughput** + LCP 200-400ms menor |
| 3 | **`jspdf` (~250KB gzip) carregado eager** em `pdf-resumo.ts` / `chat-pdf.ts` | `rg jspdf` | -250KB no bundle inicial; só carrega ao clicar "exportar" |
| 4 | **`framer-motion` (~60KB) na landing** carregado pra usuário logado que vai ser redirecionado pra `/app` | `routes/index.tsx` | Redirect server-side antes de baixar o JS |
| 5 | **Arquivos monstro** — `_app.vade-mecum.estatutos.$slug.tsx` (2.104 linhas), `_app.aulas.$materia.$livroId.$ordem.tsx` (1.287), `_app.simulados.$slug.index.tsx` (855) | `wc -l` | Code-split por etapa (`Ler`/`Flashcards`/`Questões`/`Simulado`) — -40% no chunk inicial da página de aula |
| 6 | **15 rotas sem `head:`** = sem `<title>`, sem OG, sem indexação correta | Aulas, biblioteca/slug, resumos capítulo, admin | SEO + CTR melhor; compartilhamento no WhatsApp/Insta fica decente |

### 🟡 Médio impacto

| # | Problema | Solução |
|---|---|---|
| 7 | **`select("*")` em 11 funções** trazendo `conteudo_markdown` enorme só pra listar | Trocar por colunas explícitas em `simulados.functions.ts`, `flashcards.functions.ts`, `caderno-erros.functions.ts`, `provas.$numero.tsx` |
| 8 | **Hero `.jpg` 1280×1600** sem AVIF nem srcset responsive | `vite-imagetools` → AVIF + WebP + 3 tamanhos (~70% menor) |
| 9 | **Sem virtualização** nas listas longas (estatutos com 2k+ artigos, biblioteca com 250+ livros) | `@tanstack/react-virtual` |
| 10 | **`react-markdown` + `remark-gfm` + `remark-breaks`** importados eager em 5 rotas | Componente `MarkdownView` único + lazy quando off-screen |
| 11 | **Sem observabilidade** — erros de produção viram screenshot do usuário | Sentry (parceiro oficial TanStack) — free tier |
| 12 | **`PersistQueryClient`** permite até 7 prefixos × 400KB = ~3MB no localStorage, pode estourar cota | Reduzir `MAX_PERSISTED_BYTES` ou mover pra IndexedDB (`idb-keyval`) |

### 🟢 Baixo impacto / polimento

- Pré-gerar aula/flashcards/questões/simulado em background quando admin termina um resumo (hoje cada capítulo gera sob demanda, primeira visita do aluno espera 6-12s).
- Headers de cache HTTP nos assets do Storage (`Cache-Control: public, max-age=31536000, immutable`).
- `defaultPreloadDelay: 0` no router está agressivo em 3G — considerar 50ms no mobile.

---

## Repos / padrões de referência (alta performance)

| Repo / artigo | Por que importa pra nós |
|---|---|
| [TanStack blog — 5× SSR throughput](https://tanstack.com/blog/tanstack-start-5x-ssr-throughput) | Já temos TanStack Start; aplicar padrões de prerender + cache headers |
| [`vite-pwa/vite-plugin-pwa`](https://github.com/vite-pwa/vite-plugin-pwa) | Gera SW + manifest + ícones automaticamente, padrão da comunidade Vite |
| [`vite-imagetools`](https://github.com/JonasKruckenberg/imagetools) | AVIF/WebP responsive em build-time, recomendado pelo guia de perf do Lovable |
| [`TanStack/react-virtual`](https://github.com/TanStack/virtual) | Mesma família, integra zero-config — listas de 2k+ artigos |
| [`getsentry/sentry-tanstack-start`](https://docs.sentry.io/platforms/javascript/guides/tanstack-react-start/) | Parceiro oficial TanStack pra observability |
| [Vacademy frontend](https://github.com/Vacademy-io/vacademy_platform) | EdTech React+Vite cross-platform (web+Capacitor+Electron) — referência se quiser app nativo no futuro |

App edu offline-first (`nexora-learn`, `RuralEdu`) confirma o caminho **PWA + IndexedDB**, mas são menores e não trazem padrão melhor do que o vite-plugin-pwa.

---

## Roadmap proposto (fases, por ganho/esforço)

### Fase 1 — Quick wins (1 sessão, alto impacto)
1. **`vite-plugin-pwa`** com ícones 192/512, SW workbox e cache offline das rotas estáticas.
2. **Dynamic imports** de `jspdf` e `recharts` (só quando user clica/abre o chart).
3. **`head:` SEO** nas 15 rotas faltando (`aulas`, `biblioteca/slug`, `resumos/capítulo`, etc.).
4. **Substituir `select("*")`** por colunas explícitas nas 11 funções.

### Fase 2 — Estrutura (parcial)
5. ⏳ **Prerender** das rotas estáticas — pendente.
6. ✅ **Decompor `aulas/$ordem.tsx`** — feito (1.296 → 324 linhas; 5 chunks lazy).
7. ⏳ **Decompor `vade-mecum/estatutos/$slug.tsx` (2.104 linhas)** + virtualizar — pendente (refactor grande, próxima sessão).
8. ⏳ **Hero AVIF + srcset** — pendente.

### Fase 3 — Robustez (1 sessão)
9. **Sentry** com TanStack adapter — captura erros + Web Vitals.
10. **Pré-geração em background** das 4 IAs (aula/flashcards/questões/simulado) quando o resumo é concluído (admin queue).
11. Migrar persister pra IndexedDB.

### Métricas-alvo (estimativa conservadora, mobile 4G)

| Métrica | Hoje (estimado) | Pós-Fase 1 | Pós-Fase 2 |
|---|---|---|---|
| LCP (landing) | 2.8s | 2.0s | 1.4s |
| Bundle JS inicial | ~520KB gzip | ~280KB | ~220KB |
| TTFB rotas estáticas | 300-500ms | 300-500ms | 60-90ms (prerender) |
| Lighthouse Performance | 70-80 | 85-90 | 92-96 |
| Tempo 1ª aula carregar | 6-12s (gera IA) | 6-12s | <1s (pré-gerado) |

---

## Pergunta antes de implementar

Quer que eu execute **Fase 1 inteira agora** (PWA + dynamic imports + SEO + select("*"))? É a maior relação ganho/esforço — uma única sessão e o app já fica visivelmente mais leve.

Ou prefere atacar um item específico primeiro (ex.: PWA pra distribuir como app)?