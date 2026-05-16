## Visão geral

O **OAB na Risca** é um app de estudos focado em quem vai prestar o Exame da OAB. Será inspirado no app de referência (mesmas categorias de funcionalidade: aulas interativas, resumos, flashcards, questões, simulados, assistente, notícias), mas com **identidade visual própria**, **dados mockados** na V1, **sem login** ainda, e estrutura nativa do **TanStack Start** (não React Router DOM).

Como o app de referência tem 400+ páginas e 200+ componentes, vou entregar em **fases**. Cada fase é uma mensagem de trabalho separada — assim você vê resultado funcionando rápido, dá feedback, e seguimos.

---

## Identidade visual (OAB na Risca)

- **Tom:** profissional-jurídico moderno, motivacional ("na risca" = preciso, no detalhe), focado em foco/produtividade
- **Paleta:** preto profundo + bordô/vinho (toga) + dourado discreto (selo OAB) + off-white. Vou propor as variáveis exatas em oklch quando começar a Fase 1
- **Tipografia:** display serifada elegante (ex.: Instrument Serif ou Cormorant) + sans humanista para corpo (Inter Tight ou Work Sans)
- **Layout:** mobile-first com carrosséis horizontais, cards com cover, hero slider na home, navbar inferior no mobile e sidebar no desktop
- **Componentes base:** shadcn/ui já instalado + Embla carousel + Framer Motion para transições

---

## Arquitetura técnica

- **Rotas:** TanStack Start file-based em `src/routes/` (sem `src/pages/`)
- **Estado de servidor:** TanStack Query já configurado
- **Dados mockados:** módulos TS em `src/data/` (matérias, aulas, questões, flashcards, simulados, notícias) — fáceis de trocar por chamadas reais depois
- **Layout compartilhado:** route layout pathless (`_app.tsx`) com header + bottom nav (mobile) / sidebar (desktop)
- **Assistente IA:** placeholder de UI de chat na V1; integração com Lovable AI Gateway entra na Fase 4

---

## Fases de entrega

### Fase 1 — Fundação visual e home (próxima mensagem)
- Design system OAB na Risca em `src/styles.css` (tokens oklch, fontes, radius, sombras)
- Layout app: `_app.tsx` com header, bottom nav mobile, sidebar desktop
- **Home `/`:** hero slider, "Continue estudando", carrossel de matérias OAB, atalhos (Aulas, Resumos, Flashcards, Questões, Simulados, Notícias), seção destaque "Reta final OAB", carrossel de notícias, CTA do Assistente
- Componentes reutilizáveis: `MateriaCard`, `AtalhoCard`, `Carousel`, `SectionHeader`, `HeroSlide`, `NoticiaCard`
- Página `/materias` com grid completo das matérias da OAB 1ª fase (Constitucional, Civil, Processo Civil, Penal, Processo Penal, Trabalho, Processo do Trabalho, Tributário, Administrativo, Empresarial, Consumidor, Ambiental, Internacional, Filosofia, ECA, Estatuto da OAB, Direitos Humanos, Ética)
- Mocks iniciais de matérias e notícias

### Fase 2 — Aulas interativas e Resumos
- `/materias/$slug` — detalhe da matéria com tópicos, progresso, abas (Aulas / Resumos / Flashcards / Questões)
- `/materias/$slug/aulas/$aulaId` — **aula interativa**: slides navegáveis com texto, exemplos, quiz inline ao final, marcar como concluída, "próxima aula"
- `/materias/$slug/resumos` e `/materias/$slug/resumos/$id` — leitura com sumário lateral, marcar lido, exportar
- Sistema de progresso local (localStorage) por aula/resumo
- Mocks de aulas (3–5 por matéria piloto) e resumos

### Fase 3 — Flashcards, Questões e Simulados
- `/flashcards` hub + `/materias/$slug/flashcards` — viewer estilo Anki (flip, acertei/errei, SRS simples)
- `/questoes` hub + filtros por matéria/banca/ano — `/questoes/resolver` com cronômetro, gabarito, comentário
- `/simulados` — listar simulados OAB (exames anteriores mockados) + `/simulados/$id/realizar` (80 questões, cronômetro de 5h, salvar parciais) + `/simulados/$id/resultado` (gráficos por matéria, % aproveitamento)
- "Caderno de erros" automático

### Fase 4 — Assistente IA + Notícias OAB + Polimento
- Habilitar **Lovable Cloud** + **Lovable AI Gateway**
- `/assistente` — chat com markdown, contexto OAB (system prompt jurídico), histórico em sessão
- Botão flutuante do assistente em todas as páginas
- `/noticias` + `/noticias/$id` — feed de notícias jurídicas/OAB (mockado; depois RSS real)
- Página "Reta final OAB" — countdown para próximo exame, plano de estudos sugerido, dicas
- Página de perfil simples (preferências, tema escuro/claro, matérias favoritas — tudo em localStorage)
- Animações de entrada, skeletons, vazios bem desenhados, SEO meta por rota

### Fases futuras (depois da V1)
- Login (Lovable Cloud Auth) e sincronização de progresso
- Conteúdo real: integração com banco de questões, geração de aulas/resumos via IA
- Vade Mecum, Súmulas, Jurisprudência
- Plano de estudos personalizado com IA
- Gamificação, ranking, streaks
- Áudio-aulas, vídeo-aulas
- PWA / app mobile

---

## O que NÃO entra (escopo OAB-only)

Removido do app original por não ser foco do exame: política, Câmara/Senado, eleições, JuriFlix, blogger jurídico, faculdade/semestre, OAB ferramentas avançadas de advogado (contratos, prazos, processos, jurisprudência profissional), documentários, filmes, três poderes, Meu Brasil, etc.

---

## Detalhes técnicos (opcional)

- Cada rota terá `head()` próprio com title/description/og — não vou reutilizar metadados da home
- Mocks em `src/data/*.ts` exportando funções `getMaterias()`, `getAulasByMateria(slug)`, etc., para troca trivial por server functions depois
- Componentes pequenos e focados; nada de página monolítica de 700 linhas como no original
- Progresso em `localStorage` via hook `useProgresso(key)` — fácil migrar para backend
- Sem `react-router-dom`, sem `@/integrations/supabase` na V1

---

**Próximo passo se você aprovar:** começo pela **Fase 1** — design system + home + página de matérias. Depois você testa, ajusta direção visual, e seguimos para a Fase 2.