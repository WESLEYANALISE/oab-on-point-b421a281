## Visão geral

Criar a função **Blogger** — um feed de artigos diários com dicas sobre OAB. Conteúdo dinâmico no Supabase, capas geradas por IA (fotográficas), 10 artigos iniciais já populados e um painel admin para você publicar/editar novos posts.

## Arquitetura

- **Banco**: tabela `blog_posts` no Supabase, leitura pública dos publicados, escrita só para admin (RLS via `has_role`).
- **Storage**: bucket público `blog-capas` para as imagens geradas pela IA.
- **Geração de texto e capa**: feita por mim agora (no momento da implementação) — para cada um dos 10 temas, gero o conteúdo em markdown e a imagem em estilo fotográfico realista, faço upload no bucket e o INSERT na tabela.
- **Frontend**: 3 rotas no app + 1 card na Home + 1 item no menu lateral.
- **Animação**: usa o `animate-slide-in-right` global já existente.

## Banco de dados (migration)

Tabela `blog_posts`:
- `id` uuid
- `slug` text único
- `titulo` text
- `subtitulo` text
- `categoria` text (ex.: "Organização", "Estratégia", "Mente", "Conteúdo", "Reta final")
- `tempo_leitura_min` int
- `capa_url` text
- `resumo` text (2–3 linhas, usado nos cards)
- `conteudo_md` text (markdown completo)
- `tags` text[]
- `publicado` bool
- `publicado_em` timestamptz
- `created_at`, `updated_at`, `autor_id` uuid

RLS:
- SELECT público quando `publicado = true`
- ALL para admin (`has_role(auth.uid(), 'admin')`)

Bucket `blog-capas` (public). Policies de upload/update/delete restritas a admin.

## Temas dos 10 primeiros artigos

Baseados em pautas já consolidadas em blogs como JurisHand, Damásio, ProvaDaOrdem, Estuda Aqui, Debate Direito e Blog Exame OAB — reescritos do nosso jeito (linguagem direta, foco no aluno do app, sem clichê de cursinho).

1. **Como montar um cronograma realista para a 1ª fase em 60 dias** — Organização
2. **As 5 matérias que mais caem no Exame de Ordem (e como priorizar)** — Estratégia
3. **Lei seca x doutrina: o equilíbrio que aprova** — Estudo
4. **Técnica do funil: como resolver questões da FGV sem cair em pegadinha** — Estratégia
5. **Revisão espaçada aplicada ao Direito: por que reler não funciona** — Estudo
6. **Como controlar a ansiedade na semana da prova** — Mente
7. **O dia da prova: checklist completo de quem passa de primeira** — Reta final
8. **Ética Profissional: a matéria mais subestimada (e mais decisiva)** — Conteúdo
9. **Erros que reprovam: os 7 vícios de estudo mais comuns** — Estudo
10. **Como usar provas anteriores como melhor professor particular** — Estratégia

Cada artigo terá ~700–900 palavras, intro com hook, 3–5 subtítulos, exemplos práticos, bullets de checklist e um fechamento com CTA pro app (ex.: "veja o plano de estudo personalizado dentro do Hub da 1ª Fase").

## Capas (estilo fotográfico realista)

Prompt-base comum para coerência visual:
> Fotografia editorial realista, iluminação natural cálida, profundidade de campo suave, paleta vinho/dourado/marfim, ambiente jurídico discreto (livros, mesa de madeira, balança, caderno), sem texto, sem logos, 16:9.

Cada tema recebe um sujeito-foco distinto (mesa de estudos com calendário, lei seca aberta, advogado segurando caneta, mão escrevendo, balança ao fundo desfocado, etc.) para não ficarem repetidas.

## Rotas e telas

```
src/routes/_app.blog.tsx              -> /blog          feed (lista + filtros por categoria)
src/routes/_app.blog.$slug.tsx        -> /blog/:slug    artigo (markdown renderizado)
src/routes/_app.admin.blog.tsx        -> /admin/blog    painel admin (lista + form criar/editar)
```

**/blog (feed)**
- Hero compacto "Blogger OAB" com tagline.
- Chips de categoria (filtro).
- Post em destaque (último publicado) + grid responsivo dos demais.
- Cada card: capa, categoria, título, resumo, tempo de leitura, data.

**/blog/:slug (artigo)**
- Capa full-bleed no topo, com gradiente para legibilidade.
- Título, subtítulo, categoria, tempo de leitura, data.
- Conteúdo em markdown (`react-markdown` + `remark-gfm` + `@tailwindcss/typography` `prose`).
- Bloco final com CTA para "1ª Fase OAB" e sugestão de 2 artigos relacionados (mesma categoria).
- Botão voltar e compartilhar.

**/admin/blog (painel)**
- Lista de posts (publicados/rascunhos) com ações editar/publicar/despublicar/excluir.
- Form: título, subtítulo, slug (gerado do título), categoria (select), resumo, conteúdo (textarea markdown com preview ao lado), upload de capa (ou colar URL), tags, toggle publicado.
- Visível só se `has_role` = admin (gate via server fn).

## Navegação

- **Home**: novo card "Blogger" na grade de atalhos, ícone `Newspaper`, abre `/blog`.
- **DesktopSidebar** e **MenuDrawer**: novo item "Blog" com ícone, posicionado depois de "Biblioteca".
- Admin no menu (visível só para admin) → link extra "Gerenciar blog".

## Camada de dados / server functions

`src/lib/blog.functions.ts`:
- `listBlogPosts({ categoria?, limit?, offset? })` — público (admin client, filtra `publicado=true`).
- `getBlogPost({ slug })` — público.
- `getRelatedPosts({ slug, categoria, limit })` — público.

`src/lib/blog-admin.functions.ts`:
- `adminListAllPosts()` — `requireSupabaseAuth` + checagem `has_role`.
- `adminUpsertPost(input)` — idem.
- `adminDeletePost({ id })` — idem.
- `adminUploadCapa(formData)` — upload no bucket `blog-capas`.

## Componentes novos

- `src/components/blog/PostCard.tsx`
- `src/components/blog/FeaturedPost.tsx`
- `src/components/blog/CategoriaChips.tsx`
- `src/components/blog/MarkdownView.tsx` (react-markdown configurado com estilo `prose`)
- `src/components/blog/admin/PostForm.tsx`

## Dependências

Adicionar: `react-markdown`, `remark-gfm`, `@tailwindcss/typography` (plugin).

## Seed dos 10 artigos

Após aprovar o plano e rodar a migration, eu:
1. Para cada tema, gero a capa via `imagegen` (fotográfico realista, 16:9), salvo em `/tmp` e faço upload para `blog-capas/<slug>.jpg` retornando a URL pública.
2. Escrevo o conteúdo markdown completo de cada artigo (700–900 palavras).
3. Insiro todos os 10 registros já com `publicado=true` e `publicado_em=now()`.

## Fora de escopo (para depois)

- Comentários, likes, contagem de visualizações.
- Newsletter / envio diário.
- SEO server-side específico por post (vamos adicionar `head()` por slug já no MVP, mas sem `og:image` dinâmico avançado — usa a `capa_url`).
- Editor WYSIWYG (vai ser textarea markdown com preview).
