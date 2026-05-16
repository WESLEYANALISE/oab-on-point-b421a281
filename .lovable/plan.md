## Diagnóstico

- A data do exame hoje está fixa no código (`Domingo, 23 de setembro de 2026`) e o contador só aparece depois que o JavaScript carrega no navegador.
- Por isso, em alguns momentos a área pode parecer “sumir” ou piscar, principalmente durante carregamento/recarregamento.
- Consultei o Supabase conectado e, neste momento, o schema `public` não retorna nenhuma tabela. Isso significa que o app ainda não consegue buscar dados reais dessas funções pelo Supabase até as tabelas existirem/estarem acessíveis no projeto conectado.

## Plano de implementação

1. **Estabilizar a data do exame na tela**
   - Ajustar o componente do calendário/contador para já renderizar um valor inicial imediatamente.
   - Evitar estado inicial vazio que deixa a área invisível no primeiro carregamento.
   - Centralizar a data do exame em um único arquivo/fonte para não ter divergência entre contador e texto da data.

2. **Preparar conexão da home com Supabase**
   - Criar funções de leitura via TanStack `createServerFn`, sem expor chave privada no frontend.
   - Buscar dados das seções principais: aulas interativas, plano de estudo, ferramentas de estudo, ferramentas em carrossel, pratique, biblioteca e notícias.
   - Manter fallback visual com os dados atuais do app caso uma tabela esteja vazia ou ainda não exista, para a tela não quebrar.

3. **Conectar cada card à tabela correspondente**
   - Substituir arrays fixos da home por dados vindos do Supabase quando disponíveis.
   - Preservar o layout atual: dois cards no topo, grid 2x2 em ferramentas de estudo, carrossel de ferramentas, pratique e explorar biblioteca.

4. **Verificar tabelas e permissões**
   - Como a consulta atual mostrou zero tabelas no schema `public`, vou precisar validar os nomes reais das tabelas depois que estiverem disponíveis no projeto conectado.
   - Se as tabelas tiverem RLS ativo, revisar as políticas para garantir que o app consiga ler apenas o que deve ser público ou do usuário logado.

## Detalhes técnicos

- Não vou editar `src/integrations/supabase/types.ts` manualmente.
- Para dados públicos da home, usarei leitura segura no servidor com projeção de colunas necessárias.
- Para dados pessoais, como progresso e plano de estudo do usuário, usarei autenticação antes de buscar os registros.
- Se for necessário criar/ajustar tabelas, isso deverá ser feito por migration do Supabase antes do código final depender delas.