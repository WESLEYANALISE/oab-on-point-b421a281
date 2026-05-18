# Vade Mecum — 4 abas + Relevância + Favoritos

## 1. UI: 4 abas full-width

Trocar o pequeno toggle pill por uma barra de 4 tabs ocupando toda a largura da seção (`grid grid-cols-4` com bottom-border ativo, estilo segmented control). Ordem:

1. **Artigos** — somente artigos numerados (Art. 1º, 2º…). Filtra qualquer linha cujo `numero` comece com `Título`, `Capítulo`, `Livro`, `Parte`, `Seção`, `Subseção`, `Disposições` — fica oculto totalmente nesta aba.
2. **Capítulos** — árvore expansível com estrutura completa: Título → Capítulo → Seção → Subseção → Artigos. Implementada montando uma árvore a partir da ordem dos artigos (cada marcador estrutural detectado por regex no `numero` empilha/desempilha conforme hierarquia). Cada nó é colapsável; folha é o artigo (abre o Sheet existente).
3. **Relevância** — lista os artigos da lei marcados como mais cobrados, ordenados por peso (muito_alta → alta → media), com badge colorido (vermelho/âmbar/zinc) e tag opcional (ex: "OAB XL 1ª fase", "concursos federais").
4. **Favoritos** — lista os artigos favoritados pelo usuário nesta lei. Se não logado, mostra CTA para entrar.

Cada item dessas listas reaproveita o mesmo card de artigo + abre o `ArtigoSheet` existente. Dentro do Sheet, adiciono um botão de coração (toggle favorito) ao lado do Copiar.

## 2. Banco de dados

### Coluna em `vade_mecum_artigos`
- `relevancia` text NULL (enum check: `muito_alta`, `alta`, `media`)
- `relevancia_nota` text NULL (breve justificativa, ex.: "cai em quase toda OAB — princípio da proteção integral")
- `relevancia_fontes` jsonb NULL (lista de URLs consultadas)
- Index parcial `WHERE relevancia IS NOT NULL` para consultas rápidas.

### Nova tabela `vade_mecum_favoritos`
| coluna | tipo |
|---|---|
| id | uuid PK |
| user_id | uuid NOT NULL |
| artigo_id | uuid NOT NULL |
| lei_id | uuid NOT NULL (denormalizado para listar rápido por lei) |
| created_at | timestamptz default now() |
| UNIQUE (user_id, artigo_id) |

RLS: usuário só vê/insere/deleta os seus.

## 3. Popular Relevância (seed inicial via web search)

Estratégia:
1. Script server-only (one-shot, rodado por exec) que, para cada uma das 10 leis em `ESTATUTOS_DESTAQUE`:
   - faz buscas web tipo `"ECA" "artigo" "mais cobrado" OAB`, `"Estatuto do Idoso" jurisprudência artigos chave OAB concurso`, etc. (3-5 queries por lei).
   - agrega resultados (snippets + URLs) e envia ao Gemini com prompt pedindo JSON estrito: `[{numero, peso, nota}]` onde `peso ∈ {muito_alta, alta, media}`.
   - faz UPDATE em `vade_mecum_artigos` casando por `lei_id + numero`, gravando `relevancia`, `relevancia_nota` e `relevancia_fontes` (URLs usadas).
2. Resultado salvo direto no Supabase — o app só lê.

A web search é feita uma vez agora, no sandbox, não em runtime. Decisão: Gemini valida/normaliza as evidências da web — não inventa do zero.

## 4. Arquivos a tocar

- `src/routes/_app.vade-mecum.estatutos.$slug.tsx` — substituir toggle pelo segmented de 4 abas, filtrar estruturais em "Artigos", construir árvore para "Capítulos", queries para "Relevância" e "Favoritos", botão de favoritar no Sheet.
- `src/lib/favoritos.functions.ts` (novo) — `toggleFavorito`, `listarFavoritos(leiId)`.
- `src/lib/vade-mecum-relevancia.ts` (novo, server-only script) — não importado pelo app, rodado uma vez para o seed.
- Migration: coluna + tabela + RLS.

## 5. Ordem de execução

1. Migration (coluna `relevancia*` + tabela `vade_mecum_favoritos` + RLS).
2. Rodar script de seed da relevância (web search + Gemini → UPDATE).
3. Implementar UI das 4 abas + favoritos + Sheet com coração.

Depois disso, "Artigos" mostra só artigos numerados, "Capítulos" mostra a estrutura completa expansível, "Relevância" lista os marcados como mais cobrados com badge, "Favoritos" mostra os do usuário.
