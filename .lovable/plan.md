## Plano para deixar os simulados instantâneos

### Diagnóstico encontrado
- O fluxo do simulado ainda depende de várias chamadas separadas: lista, overview, histórico, iniciar tentativa e carregar questões.
- A tela de prática só renderiza depois de `getSimulado` voltar; por isso aparece “Carregando simulado…”.
- O histórico/desempenho e o resumo do edital carregam junto da tela de overview, mesmo não sendo necessários para abrir a página rapidamente.
- Há reconsultas repetidas do perfil no Supabase, causadas por invalidação de cache no auth provider.
- Existe um erro React #418, provavelmente por diferença entre HTML gerado no servidor e no cliente, com forte suspeita em renderizações dependentes de data/localidade ou estado que muda na hidratação.
- No banco, as tabelas são pequenas e os índices principais existem; o gargalo maior está no fluxo do código e na forma de carregamento, não no volume do Supabase.

### O que vou mudar
1. **Abrir a prática com cache instantâneo**
   - Ao clicar em um simulado, pré-carregar os dados principais das questões antes da navegação quando possível.
   - Na tela de prática, usar `placeholderData`/cache local para não trocar a tela por loading quando a query revalidar.
   - Manter a última versão carregada do simulado em `sessionStorage` como fallback imediato.

2. **Unificar chamadas críticas de entrada**
   - Criar/ajustar uma função de servidor para retornar, em uma única chamada, dados do simulado + questões + tentativa em andamento/criada.
   - Evitar que a prática faça primeiro `getSimulado` e depois `iniciarTentativa` em sequência visual.

3. **Deixar overview progressivo**
   - Carregar primeiro os dados essenciais: título, materiais, total e raio-x.
   - Carregar desempenho/histórico somente quando a aba “Desempenho” for aberta.
   - Carregar o edital estruturado somente quando a aba “Edital” for aberta, mantendo a tela principal instantânea.

4. **Reduzir reconsultas desnecessárias do perfil**
   - Ajustar o `AuthProvider` para não invalidar o perfil em todo evento de auth quando o usuário não mudou.
   - Aumentar o `staleTime`/cache do perfil para evitar chamadas repetidas enquanto navega entre telas.

5. **Otimizar salvamento das respostas**
   - Manter resposta instantânea na interface.
   - Salvar em background, sem bloquear botão/navegação.
   - Evitar estado visual de carregamento para ações que já têm feedback local.

6. **Corrigir o risco de hidratação React #418**
   - Remover renderizações instáveis entre servidor e cliente nas telas de simulado/resultado, especialmente formatação de datas durante a primeira renderização.
   - Garantir que conteúdo dependente do navegador não cause diferença de texto no SSR.

7. **Ajustes no Supabase para performance preventiva**
   - Adicionar índice composto para tentativas por usuário/simulado/status (`user_id`, `simulado_id`, `concluido_em`, `iniciado_em desc`) se necessário via migration.
   - Manter RLS como está, mas reduzir o número de consultas feitas pelo frontend.

### Resultado esperado
- A lista e a página do simulado abrem com sensação imediata.
- Ao entrar na prática, não deve piscar “Carregando simulado…” se os dados já foram vistos/pré-carregados.
- O desempenho e edital deixam de atrasar a tela principal.
- Respostas continuam com feedback instantâneo e salvamento silencioso.
- Menos chamadas repetidas ao Supabase durante navegação.