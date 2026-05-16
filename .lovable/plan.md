## Plano para corrigir todas as rotas da Biblioteca

O problema principal é estrutural: as rotas `/biblioteca/$slug` e `/biblioteca/$slug/$bookId` têm rotas filhas, mas seus componentes não renderizam `<Outlet />`. Por isso a URL muda, mas a tela continua mostrando a lista anterior em vez de abrir a página do livro ou o leitor.

## Ajustes que vou fazer

1. **Separar rota de layout e rota de tela da categoria**
   - Transformar `src/routes/_app.biblioteca.$slug.tsx` em layout da categoria com `<Outlet />`.
   - Criar `src/routes/_app.biblioteca.$slug.index.tsx` para renderizar a lista de livros em `/biblioteca/oratoria`.
   - Manter o mapa `BIB_MAP` e a query compartilhada em um arquivo reutilizável para não duplicar lógica.

2. **Separar rota de layout e rota de detalhe do livro**
   - Transformar `src/routes/_app.biblioteca.$slug.$bookId.tsx` em layout do livro com `<Outlet />`.
   - Criar `src/routes/_app.biblioteca.$slug.$bookId.index.tsx` para renderizar a página de detalhes em `/biblioteca/oratoria/152`.
   - Assim `/biblioteca/oratoria/152/ler` passa a renderizar o leitor corretamente dentro do fluxo.

3. **Corrigir os botões de voltar**
   - Na lista da categoria: voltar para `/biblioteca`.
   - No detalhe do livro: voltar para `/biblioteca/$slug`.
   - No leitor: voltar para `/biblioteca/$slug/$bookId`.
   - Usar rotas explícitas em vez de depender do histórico, para funcionar mesmo quando a pessoa abre um link direto.

4. **Garantir dados carregados antes das telas**
   - Trocar as telas principais para o padrão `ensureQueryData` + `useSuspenseQuery`, evitando ficar preso em “Carregando…” quando já existe cache.
   - Adicionar `pendingComponent`, `errorComponent` e `notFoundComponent` nas rotas com carregamento.

5. **Remover edição manual do `routeTree.gen.ts`**
   - Não vou editar esse arquivo manualmente; ele deve ser regenerado pelo TanStack Router a partir dos novos arquivos de rota.

## Resultado esperado

- Clicar em uma biblioteca abre a lista correta.
- Clicar em um livro abre a página nova de detalhe.
- Clicar em “Ler” abre o livro dentro do app.
- Todos os botões de voltar levam para a tela anterior correta.
- O menu de rodapé continua oculto em todo o fluxo `/biblioteca/*`.