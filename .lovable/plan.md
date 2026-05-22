Dois ajustes, um por pedido:

## 1. Corrigir o erro "HTTP 504: upstream request timeout" ao Gerar prévia

**O que está acontecendo:** o backend faz uma única chamada ao Gemini, espera a resposta inteira (até 60k tokens) e só então responde ao navegador. Em PDFs grandes isso passa do limite do gateway e devolve 504 — a prévia nem chega a ser tentada.

**Como vou corrigir (`src/routes/api/aulas-interativas-preview.ts`):**
- Trocar a chamada por **streaming SSE** (Server-Sent Events), usando o `geminiStreamContent` que já existe.
- O servidor passa a enviar pedacinhos da resposta enquanto o Gemini gera, com um "ping" a cada 10s. Como a conexão fica sempre ativa, o gateway não derruba mais por timeout.
- Eventos enviados: `start`, `progress` (com nº de caracteres gerados), `done` (com a estrutura final já salva) ou `error`.
- No final, o servidor monta o JSON, salva em `aulas_interativas_previas` e atualiza o status, igual antes.
- Reduzir o teto da entrada de 300k para 180k caracteres e `maxOutputTokens` de 60k para 32k, deixando bem dentro do limite prático.

**No client (`src/routes/_app.admin.aulas-interativas.tsx`, função `rodarPrevia`):**
- Ler o SSE com `fetch` + `getReader()`.
- Atualizar a barra de progresso com algo como `Gemini gerando… 12.840 chars`.
- Quando chegar o evento `done`, usar a estrutura, título e matéria devolvidos.
- Em `error`, mostrar a mensagem.

## 2. Mostrar imagens extraídas + miniaturas

**No mesmo arquivo da tela admin:**
- Durante a extração, a mensagem de progresso vai passar a incluir contagem de imagens:
  `Extraindo… prova real 50/57 páginas (88%) · 50 págs salvas · 3 imagens`.
- A mensagem final vira:
  `Extração pronta: 57/57 páginas · 112.749 caracteres · 3 imagens.`
- Adicionar, abaixo do bloco de progresso quando houver extração concluída, uma **tira de miniaturas** com as primeiras ~8 imagens extraídas (lendo de `extracaoQ.data.imagens`), com contador "+N" se houver mais. Cada miniatura abre a imagem original em nova aba.
- Se não houver imagens, mostrar discretamente `Sem imagens extraídas`.

Sem mudanças no banco. Sem alterar a lógica de extração — só o que o usuário vê e a forma de chamar o Gemini para a prévia.