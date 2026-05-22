## Problema

Hoje existem dois "voltar" empilhados em várias telas:
1. O `MobileHeader` global (botão "Voltar" fixo no topo).
2. Um botão extra dentro do conteúdo da rota (ex.: "← Todas as áreas" em `/resumos?area=...`, "← Voltar" em `_app.resumos.$livroId.tsx`, headers próprios em `vade-mecum`, `oab.*`, `noticias`, `blog`, `biblioteca`, `aulas`, `simulados`, `admin.*`, etc.).

Além disso, o botão global hoje diz sempre "Voltar", sem indicar pra onde leva.

## Objetivo

- **Um único cabeçalho** em todas as telas internas: o `MobileHeader`.
- O botão de voltar mostra **o nome do destino** (ex.: "Ética Profissional", "Resumos", "Início", "Vade-Mécum").
- O destino é o **nível imediatamente acima** na navegação lógica (não `history.back()`), inclusive respeitando filtros de área via `search`.

## Mudanças

### 1. `src/lib/voltar.ts` — virar resolver com label

Trocar a assinatura para retornar `{ to: string; search?: Record<string,unknown>; label: string }`. Receber `pathname` + `search` + (opcional) dados de contexto leves (ex.: nome da área do livro vindo do cache do React Query — quando não houver, cai no fallback genérico).

Regras (mapeadas das rotas existentes):

```text
/resumos?area=X                 -> { to:"/resumos", label:"Resumos" }
/resumos                        -> { to:"/app",     label:"Início" }
/resumos/:livroId               -> { to:"/resumos?area=<area>", label:"<Área>"  }  // área via query cache "resumos-publico"; fallback "Resumos"
/resumos/capitulo/:livroId/:n   -> { to:"/resumos/:livroId", label:"<Título do livro>" } // título via cache; fallback "Resumo"
/aulas                          -> { to:"/app", label:"Início" }
/aulas/:materia                 -> { to:"/aulas", label:"Aulas" }
/aulas/:materia/:livroId        -> { to:"/aulas/:materia", label:"<Matéria>" }
/aulas/:materia/:livroId/:n     -> { to:"/aulas/:materia/:livroId", label:"<Livro>" }
/biblioteca                     -> { to:"/app", label:"Início" }
/biblioteca/:slug               -> { to:"/biblioteca", label:"Biblioteca" }
/biblioteca/:slug/:bookId       -> { to:"/biblioteca/:slug", label:"<Categoria>" }
/biblioteca/:slug/:bookId/ler   -> { to:"/biblioteca/:slug/:bookId", label:"<Livro>" }
/vade-mecum                     -> { to:"/app", label:"Início" }
/vade-mecum/cf, /vade-mecum/cf/:parte, /vade-mecum/estatutos, /vade-mecum/estatutos/:slug, /vade-mecum/:slug
                                -> sobe 1 nível, label = nome humano do nível pai
/oab/*                          -> sobe 1 nível; raiz volta para "Início"
/simulados, /simulados/:slug/*  -> idem
/provas, /provas/:n             -> idem
/noticias, /noticias/:id        -> idem
/blog, /blog/:slug              -> idem
/flashcards, /flashcards-tema   -> Início / Flashcards
/admin, /admin/*                -> /admin / "Admin"
/perfil, /caderno-erros, /plano-estudo, /progresso, /reta-final, /questoes, /assistente, /audioaulas, /materias, /materias/:slug, /atualizacoes-leis
                                -> /app / "Início"  (subrotas sobem 1 nível com label da raiz)
```

Tabela de **nomes humanos** das raízes (para evitar slug cru no botão):
`/app→Início`, `/resumos→Resumos`, `/aulas→Aulas`, `/biblioteca→Biblioteca`, `/vade-mecum→Vade-Mécum`, `/vade-mecum/cf→Constituição`, `/vade-mecum/estatutos→Estatutos`, `/simulados→Simulados`, `/provas→Provas`, `/noticias→Notícias`, `/blog→Blog`, `/flashcards→Flashcards`, `/flashcards-tema→Por tema`, `/oab→OAB`, `/admin→Admin`, `/perfil→Perfil`, `/caderno-erros→Caderno de erros`, `/plano-estudo→Plano`, `/progresso→Progresso`, `/reta-final→Reta final`, `/questoes→Questões`, `/assistente→Assistente`, `/audioaulas→Audioaulas`, `/materias→Matérias`, `/atualizacoes-leis→Atualizações`.

### 2. `src/components/layout/MobileHeader.tsx`

- Ler `pathname` **e** `search` via `useLocation()`.
- Chamar o novo `resolverVoltar({ pathname, search })`.
- Renderizar o botão como pill com seta + `label` dinâmico (truncado em `max-w-[55vw]`).
- Para destinos com `search`, usar `<Link to={to} search={search}>`.
- Botão direito "Início" mantido (some na própria home).

### 3. Limpeza das rotas — remover headers/voltares internos duplicados

Em cada arquivo abaixo, **remover**: botões "← Voltar", "← Todas as áreas", barras com `<ArrowLeft/>` + "Início" que repliquem o header. Manter o conteúdo (eyebrow, título, subtítulo) — só sumir o botão.

- `_app.resumos.index.tsx` (linha do "← Todas as áreas")
- `_app.resumos.$livroId.tsx`
- `_app.resumos.capitulo.$livroId.$ordem.tsx`
- `_app.flashcards-tema.tsx`
- `_app.materias.$slug.tsx`
- `_app.biblioteca.index.tsx`, `_app.biblioteca.$slug.tsx`, `_app.biblioteca.$slug.index.tsx`, `_app.biblioteca.$slug.$bookId.index.tsx`, `_app.biblioteca.$slug.$bookId.ler.tsx`
- `_app.vade-mecum.index.tsx`, `_app.vade-mecum.estatutos.index.tsx`, `_app.vade-mecum.estatutos.$slug.tsx`
- `_app.oab.progresso.tsx`, `_app.oab.calendario.tsx`, `_app.oab.o-que-estudar.tsx`, `_app.oab.segunda-fase.tsx`, `_app.oab.reforco.tsx`, `_app.oab.caderno-erros.tsx`
- `_app.caderno-erros.tsx`
- `_app.aulas.$materia.$livroId.$ordem.tsx`
- `_app.noticias.tsx`, `_app.noticias.$id.tsx`
- `_app.blog.$slug.tsx`
- `_app.simulados.$slug.index.tsx`, `_app.simulados.$slug.praticar.tsx`, `_app.simulados.$slug.resultado.$tentativaId.tsx`
- `_app.admin.resumos.tsx`, `_app.admin.blog.tsx`, `_app.admin.flashcards.tsx`

Não mexer em:
- Rotas fora do shell `_app` (`login`, `signup`, `onboarding`, `reset-password`) — não têm `MobileHeader`.
- Botões de "fechar" de overlays/sheets (ex.: `ArtigoFocusOverlay`) — não são voltar de página.

### 4. Casos com label dinâmico via cache

Para `/resumos/:livroId` e `/resumos/capitulo/...`, ler nome da área/livro do `queryClient` (`['resumos-publico']`) dentro do `MobileHeader`. Se ausente, fallback para o nome da raiz ("Resumos"). Mesma estratégia para `/aulas/:materia/...` usando o slug→nome de `src/data/materias.ts` (já existe).

Sem chamadas extras de rede — só leitura síncrona de cache + dicionários locais.

### 5. Desktop

`DesktopSidebar` já dá a navegação principal no desktop; o "voltar" só aparece em `MobileHeader` (md:hidden). Sem mudanças no desktop.

## Resultado esperado

- `/resumos?area=Ética Profissional` mostra apenas **1** botão no topo: "← Resumos".
- `/resumos/<livroId>` mostra "← Ética Profissional" (ou "← Resumos" se a área não estiver em cache).
- `/vade-mecum/cf/titulo-i` mostra "← Constituição". Etc.
- Nenhuma página interna do `_app` desenha um segundo voltar no corpo.
