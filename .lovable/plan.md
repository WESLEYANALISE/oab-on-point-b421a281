## Modo foco para cada função do artigo

Hoje, ao tocar nos botões do menu inferior (Estudar, Praticar, Narração, Anotações, Perguntar) dentro do Sheet do artigo, o conteúdo troca mas o resto da tela continua igual: cabeçalho do artigo, as 4 abas Artigo/Explicação/Exemplo/Termos, controles laterais (fonte / sparkles), os botões Anterior/Próximo e o próprio menu de funções. Resultado: o card "Como quer treinar?" do Praticar aparece espremido entre todos esses controles.

A ideia é transformar Praticar, Estudar, Anotações e Perguntar em modos focados: quando a pessoa tocar, sobe um overlay full-screen por cima do Sheet do artigo, mostrando só o conteúdo daquela função + um X no canto. Sem abas, sem menu inferior, sem navegação.

### Comportamento por função

- **Estudar** — overlay focado com o texto do artigo. As 4 abas (Artigo / Explicação / Exemplo / Termos) viram um menu de alternância interno do próprio overlay (no topo logo abaixo do X). Anterior/Próximo entre artigos continua disponível, mas dentro do overlay (rodapé fino).
- **Praticar** — abre direto na tela "Como quer treinar?" (Questões / Flashcards). Quando a pessoa escolhe um modo, o conteúdo daquele modo ocupa tudo. Botão Voltar para a escolha + X para fechar.
- **Anotações** — overlay com menu de alternância interno de 3 sub-abas:
  - **Minhas anotações** — editor de texto da anotação atual + lista do que já foi salvo neste artigo.
  - **Sugestões IA** — a Profa. Ana sugere bullets prontos sobre o artigo; toque em um bullet pra adicionar à anotação.
  - **Histórico** — todas as anotações antigas em qualquer artigo desta lei, ordenadas por data.
- **Perguntar** — o chat dedicado da IA do artigo (já existe como overlay) é padronizado pra usar o mesmo shell do modo foco (mesmo header, mesmo X, mesma animação de subida).
- **Narração** — fica como está (já é compacta e funciona bem no Sheet atual). Sem modo foco.

### Shell comum do modo foco

Um único componente `ArtigoFocusOverlay` é usado por todos: overlay fixo cobrindo o Sheet do artigo, animação slide-in-bottom, header com rótulo da lei + "Art. X°" + X dourado à direita, área de sub-abas opcional (Estudar e Anotações usam, Praticar e Perguntar não), corpo rolável, rodapé opcional (Estudar usa pra Anterior/Próximo). Fechar volta exatamente pro estado anterior do Sheet do artigo (não fecha o Sheet inteiro).

### Notas técnicas

- Arquivo principal: `src/routes/_app.vade-mecum.estatutos.$slug.tsx` (componente `ArtigoSheet`). O switch atual `funcTab === "praticar" | "anotacoes" | "narracao" | "perguntar"` que renderiza dentro do corpo do Sheet é substituído por: render do conteúdo de Estudar como base do Sheet + um estado `focusMode` que monta o `ArtigoFocusOverlay` por cima quando a pessoa toca em Estudar/Praticar/Anotações/Perguntar no menu de funções.
- Novo componente `src/components/vade-mecum/ArtigoFocusOverlay.tsx` — recebe `title`, `subtitle`, `tabs?`, `footer?`, `onClose`, `children`. Renderiza com `position: fixed`, `inset: 0`, z-index acima do `SheetContent`, fade+slide-in.
- `PraticarPanel` já existe e é reutilizado — só passa a ser embrulhado pelo overlay em vez de pelo body do Sheet.
- `AnotacoesEditor` atual vira a sub-aba "Minhas anotações". Duas novas sub-abas:
  - `AnotacoesSugestoesIA` — server function nova `gerarSugestoesAnotacoesArtigo` em `src/lib/artigo-anotacoes.functions.ts`, chama Gemini direto (conforme a Core memory) com cache em coluna `sugestoes_ia` (jsonb) em `vade_mecum_artigos` (ou tabela própria se preferir — migration a confirmar).
  - `AnotacoesHistorico` — server function `listarAnotacoesDaLei` que retorna anotações do usuário na lei atual ordenadas por `updated_at desc`, com link "abrir artigo" pra cada.
- `ChatIAOverlay` existente é refatorado pra reusar o shell do `ArtigoFocusOverlay` em vez de ter chrome próprio.
- O botão X fecha só o overlay, não o Sheet do artigo. Botão físico de voltar (Android) também fecha só o overlay.

### Fora do escopo

- Mudar a lógica de geração de Questões/Flashcards (continua exatamente como está).
- Narração (fica como hoje).
- Mudar o layout do Sheet do artigo quando nenhum modo foco está aberto (Estudar continua sendo o estado padrão do Sheet — o overlay focado é uma camada adicional).