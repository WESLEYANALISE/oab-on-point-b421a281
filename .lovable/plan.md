## Plano de correção da Biblioteca

O que vou ajustar:

1. **Fazer `/biblioteca` abrir as bibliotecas de verdade**
   - Garantir que a rota `/biblioteca` renderize a lista de temas/categorias, não a tela antiga “em construção”.
   - Remover dependência de carregamento que possa quebrar a primeira renderização da tela.
   - Mostrar os temas imediatamente com capa, título e subtítulo.

2. **Corrigir o erro 500 da rota Biblioteca**
   - Evitar consultas Supabase durante a renderização inicial/SSR da página principal da biblioteca.
   - Deixar contagem de livros opcional ou carregada só no cliente, sem impedir a tela de aparecer.
   - Adicionar estados seguros para erro e vazio.

3. **Revisar o fluxo inteiro de rotas**
   - `/biblioteca` → lista de bibliotecas/temas.
   - `/biblioteca/$slug` → lista de livros daquele tema.
   - `/biblioteca/$slug/$bookId` → página do livro com “Baixar” e “Ler”.
   - `/biblioteca/$slug/$bookId/ler` → leitor dentro do app.

4. **Corrigir os botões de voltar**
   - Na lista de livros: voltar para `/biblioteca`.
   - Na página do livro: voltar para `/biblioteca/$slug`.
   - No leitor: voltar para `/biblioteca/$slug/$bookId`.
   - Evitar `history.back`, usando rotas explícitas para funcionar mesmo em acesso direto.

5. **Atualizar a árvore de rotas corretamente**
   - Não editar manualmente `routeTree.gen.ts` como solução principal.
   - Ajustar os arquivos de rota e deixar o TanStack regenerar a árvore.

6. **Validar no preview**
   - Abrir `/biblioteca` no viewport mobile.
   - Clicar em uma biblioteca e verificar a lista de livros.
   - Clicar em um livro e verificar a página de detalhes.
   - Clicar em “Ler” e verificar o leitor.
   - Confirmar que o rodapé fica oculto em todo `/biblioteca/*`.

## Detalhe técnico

O problema atual não é só visual: a rota `/biblioteca` está retornando erro 500 no preview, então a tela de temas nem chega a renderizar. A correção será deixar a página principal da biblioteca leve e segura, renderizando dados estáticos das categorias primeiro e carregando dados externos só sem bloquear a abertura da tela.