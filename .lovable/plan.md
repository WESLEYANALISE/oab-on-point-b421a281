Diagnóstico encontrado:
- A tela `/biblioteca` faz 6 consultas separadas ao Supabase só para contagens. Isso cria várias requisições e preflights.
- Ao abrir uma biblioteca, o app baixa a lista inteira com campos pesados, incluindo `Sobre`, `Link` e `Download`. Exemplo medido: `BIBLIOTECA-ESTUDOS` baixa ~397 KB; só a lista necessária cairia para ~8–102 KB dependendo do filtro/paginação.
- A lista renderiza centenas de livros de uma vez. No teste, a página chegou a ~4.048 elementos DOM e INP de ~1000 ms, ou seja, clique percebido como travado.
- Cada livro visível dispara capas externas do Supabase Storage; várias imagens levaram 3–6s e vêm com `cache-control: no-cache`, então elas não ficam rápidas no retorno.
- O `defaultPreload: "intent"` com delay de 50 ms dispara prefetch em hover/toque e carrega muitas rotas/módulos em dev, deixando a sensação de lentidão ao mexer no app.
- As URLs de fonte em `src/styles.css` estão 404, gerando erro de rede e custo extra.
- O ambiente de preview em dev também adiciona Vite/HMR/React dev runtime, então parte da lentidão não existirá igual no publicado; mas há gargalos reais no código da Biblioteca.

Plano de melhoria:
1. Criar endpoints SQL otimizados no Supabase
   - `get_biblioteca_counts`: retornar todas as contagens em uma única chamada.
   - `get_biblioteca_areas`: retornar áreas disponíveis para filtro.
   - `get_biblioteca_books`: retornar lista paginada com apenas `id`, `titulo`, `autor`, `capa`, `area`.
   - `get_biblioteca_book`: retornar detalhe de um livro por ID, sem baixar a biblioteca inteira.
   - Adicionar índices por área/ordem nas tabelas maiores.

2. Refatorar `src/lib/biblioteca.ts`
   - Trocar consultas diretas `.from(...).select(...)` por `.rpc(...)` nas funções otimizadas.
   - Separar query de lista e query de detalhe.
   - Aumentar cache (`staleTime`) para dados quase estáticos da biblioteca.
   - Manter objetos simples para TanStack Query.

3. Refatorar rotas da Biblioteca
   - Hub `/biblioteca`: usar uma única query de contagens em vez de 6 HEAD requests.
   - Lista `/biblioteca/$slug`: carregar lista leve, com paginação/“carregar mais” e filtro por área quando existir.
   - Detalhe `/biblioteca/$slug/$bookId`: buscar apenas o livro atual por ID.
   - Leitor `/ler`: usar a query de detalhe, não a lista inteira.

4. Reduzir trabalho de renderização
   - Limitar render inicial a um lote pequeno/útil de livros.
   - Definir prioridade só para as primeiras capas visíveis (`loading="eager"`/`fetchPriority="high"` onde fizer sentido) e manter lazy no restante.
   - Evitar montar centenas de links/imagens de uma vez.

5. Ajustar navegação/prefetch
   - Remover ou reduzir `defaultPreload: "intent"` global para evitar pré-carregamento agressivo em toque/hover.
   - Aplicar prefetch apenas em links estratégicos, não em todas as rotas.

6. Corrigir fontes e erros de rede
   - Remover URLs quebradas de fontes ou substituir por fontes locais/sistema para zerar 404 e reduzir bloqueio.
   - Opcionalmente manter o visual com fallback consistente usando `font-family` do sistema.

7. Validar
   - Medir novamente `/biblioteca` e `/biblioteca/estudos` com performance profile.
   - Conferir que o clique abre rápido, que voltar funciona, e que as consultas Supabase foram reduzidas.

Observação: tentei aplicar a migração de banco, mas ela falhou por um detalhe SQL em `get_biblioteca_books` (“return type mismatch”, a função retornava uma coluna interna de ordenação a mais). Na implementação, vou corrigir isso removendo a coluna extra do retorno final antes de reaplicar.