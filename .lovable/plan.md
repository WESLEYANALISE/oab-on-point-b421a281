## Objetivo

Trazer as bibliotecas do projeto antigo (`izspjvegxdfgkgibpyst`) para o Supabase do **OAB NA RISCA** (`ajbzwnzbuukwjaydfqui`), com estrutura + dados, e montar a tela `/biblioteca`.

## Escopo desta etapa

Importar as **6 bibliotecas principais** que existem no projeto antigo (a "Biblioteca da OAB" não tem tabela própria lá — vou tratar depois quando você definir a fonte):

| Tabela | Livros |
|---|---|
| BIBLIOTECA-CLASSICOS | 29 |
| BIBLIOTECA-ESTUDOS | 490 |
| BIBLIOTECA-ORATORIA | 8 |
| BIBLIOTECA-LIDERANÇA | 10 |
| BIBLIOTECA-POLITICA | a confirmar |
| BIBLIOTECA-FORA-DA-TOGA | 285 |

## Passo a passo

**1. Migration no Supabase OAB na Risca**
Criar as 6 tabelas com o mesmo schema do projeto antigo (id BIGINT identity, area, livro, autor, link, imagem, sobre, beneficios, download, etc — BIBLIOTECA-ESTUDOS tem colunas próprias: Área, Tema, Ordem, Capa-livro, Capa-area, Download, Link, Sobre). Cada tabela com:
- RLS habilitada
- Política de SELECT pública (leitura aberta — são livros públicos)
- Sem políticas de escrita (só via service role)

**2. Importação dos dados**
Script Node que lê o REST API do projeto antigo (anon key, leitura pública) e faz INSERT em lote no novo Supabase via service role. Importa todos os ~820 registros das 6 tabelas preservando o `id` original (para os links de capa continuarem batendo).

Observação: as URLs das capas continuam apontando para o storage do projeto antigo (`izspjvegxdfgkgibpyst.supabase.co/storage/...`). As capas vão carregar normalmente porque aquele bucket é público. **Não vou copiar arquivos de storage agora** — fica para uma etapa futura se você quiser independência total.

**3. UI — tela `/biblioteca`**
Substituir o `ComingSoon` atual em `src/routes/_app.biblioteca.tsx` por:
- Hub com **cards das 6 bibliotecas** (cada uma com capa/cor, igual ao projeto antigo)
- Ao clicar, navega para rota filha listando os livros daquela biblioteca em grid de capas
- Rotas filhas: `/biblioteca/classicos`, `/biblioteca/estudos`, `/biblioteca/oratoria`, `/biblioteca/lideranca`, `/biblioteca/politica`, `/biblioteca/fora-da-toga`
- Cada card de livro mostra capa + título + autor; clique abre o `link` (flipbook) em nova aba
- BIBLIOTECA-ESTUDOS agrupa por `Área` (são 490 livros divididos em áreas do Direito)

Visual seguindo o design system atual (dark, gold accent, sem cores hardcoded).

**4. Sem auth necessária**
Como a leitura é pública, não precisa estar logado para ver as bibliotecas — mantém a experiência leve.

## Detalhes técnicos

- Migration via `supabase--migration` (uma só, com as 6 CREATE TABLE + policies)
- Importação rodada via `code--exec` chamando REST API dos dois Supabases
- Queries da UI via client browser (`@/integrations/supabase/client`) com TanStack Query — leitura pública não precisa de server function
- Types do Supabase serão regenerados automaticamente após a migration

## Fora de escopo (próximas etapas)

- Biblioteca da OAB (não existe tabela própria no projeto antigo — preciso saber a fonte)
- Tabelas auxiliares: resumos por capítulo, leitura interativa, plano de leitura, favoritos, contribuições, notificações de novos livros, biblioteca iniciante, bibliotecas Português / Pesquisa Científica
- Copiar imagens para o storage do OAB na Risca
- Geração de novas capas com IA
