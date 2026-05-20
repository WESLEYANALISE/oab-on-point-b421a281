# O que ainda falta — Fase 3 (impacto alto, esforço médio)

Resumo do estado atual: Fases 1 e 2 já entregaram PWA, SEO em 11 rotas, dynamic imports do `jspdf` e decomposição do arquivo monstro de aulas (1.296 → 324 linhas). Sobraram **6 frentes** que continuam custando performance e robustez.

## 1. Vade-Mecum — refactor + virtualização (maior dívida técnica)

`_app.vade-mecum.estatutos.$slug.tsx` tem **2.104 linhas** e renderiza listas de até 2.000+ artigos sem virtualização — trava em celular médio.

- Quebrar em 5 componentes (`ArtigoCard`, `ArtigoSearch`, `ArtigoNav`, `ArtigoActions`, `ArtigoHighlight`) sob `src/components/vade-mecum/`.
- Adicionar `@tanstack/react-virtual` (já é a mesma família — zero config) para renderizar só os artigos visíveis.
- Indexes Postgres complementares: `(lei_id, ordem)` composto + GIN em `tsvector(texto)` para busca full-text instantânea.

Ganho: scroll fluido em 2k+ artigos, busca <50ms, chunk inicial da rota -60%.

## 2. Hero + capas — AVIF/WebP responsive

Hero da landing é `.jpg` 1280×1600 (~280KB). Capas da biblioteca idem.

- Instalar `vite-imagetools` no Vite config.
- Converter `oab-landing-hero.jpg` e as 6 capas `biblio-*.jpg` para AVIF + WebP em 3 tamanhos (640/960/1280).
- `<picture>` com `srcset` + `sizes` apropriado.
- Preload do hero LCP no `head()` da landing com `fetchpriority="high"`.

Ganho: LCP -400ms no 4G, ~70% menos bytes nas capas.

## 3. Pré-geração das 4 IAs em background

Hoje cada aluno, na primeira visita a um capítulo, espera **6–12s** enquanto Gemini gera aula/flashcards/questões/simulado sob demanda.

- Quando admin marca resumo como pronto, enfileirar job que chama as 4 funções (`gerar-aula`, `gerar-flashcards`, `gerar-questoes`, `gerar-simulado`) e persiste o resultado.
- Implementar como server route `/api/public/queue-ai-precompute` com signature HMAC + chamada disparada do trigger Postgres (`pg_net`) na transição `resumo.status → 'publicado'`.
- Tabela `ia_precompute_jobs` (resumo_id, etapa, status, attempts, last_error) com retry exponencial.

Ganho: primeira aula carrega <1s em vez de 6–12s.

## 4. `select("*")` → colunas explícitas (11 funções)

Listas trazem `conteudo_markdown` inteiro (até 80KB por linha) só pra mostrar título.

Arquivos a trocar:
- `src/lib/simulados.functions.ts`
- `src/lib/flashcards.functions.ts`
- `src/lib/caderno-erros.functions.ts`
- `src/lib/aulas.functions.ts`
- `src/lib/blog-admin.functions.ts`
- `src/lib/simulados-admin.functions.ts`
- `src/routes/_app.provas.$numero.tsx` (loader)

Ganho: -200KB a -1MB por listagem em rede, mais responsivo.

## 5. Sentry — observabilidade

Erros em produção viram screenshot do usuário no WhatsApp. Sem visibilidade real.

- `@sentry/tanstackstart-react` (adapter oficial).
- Capturar erros + Web Vitals (LCP/INP/CLS reais por dispositivo).
- Sample rate 100% em erros, 10% em traces (free tier aguenta).

Ganho: descobrir bugs antes do aluno reclamar.

## 6. Persister → IndexedDB

`PersistQueryClient` hoje grava até ~3MB em `localStorage` (cota varia por device — pode estourar em iOS Safari).

- Substituir por `idb-keyval` como storage do persister.
- Cota IDB é ~50MB confortavelmente.

Ganho: cache de dados sobrevive sessões longas sem ser despejado.

---

## Ordem sugerida de execução (por ganho/esforço)

| Ordem | Item | Esforço | Ganho percebido |
|---|---|---|---|
| 1 | `select("*")` → colunas (item 4) | 30min | Médio (rede) |
| 2 | Hero/capas AVIF (item 2) | 45min | **Alto** (LCP) |
| 3 | Vade-Mecum virtualização + refactor (item 1) | 2h | **Muito alto** |
| 4 | Sentry (item 5) | 30min | Estratégico |
| 5 | IndexedDB persister (item 6) | 30min | Médio |
| 6 | Pré-geração IA em background (item 3) | 2h | **Muito alto** (UX) |

## Métricas-alvo pós-Fase 3

| Métrica | Hoje | Após Fase 3 |
|---|---|---|
| LCP landing (4G) | ~2.0s | ~1.2s |
| Scroll vade-mecum 2k artigos | trava | 60fps |
| Primeira aula nova | 6–12s | <1s |
| Bundle inicial gzip | ~280KB | ~230KB |
| Visibilidade de erros | 0% | 100% |

---

## Pergunta

Quer que eu execute **tudo na ordem acima** ou prefere começar por um item específico (sugiro o **vade-mecum**, é a maior dor visível hoje)?
