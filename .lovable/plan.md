## O que vai mudar no chat da Profa. Ana

### 1. Resposta em streaming (já vai aparecendo conforme a IA escreve)
Hoje a função `perguntarArtigoIA` espera o Gemini terminar tudo pra devolver o texto — por isso demora. Vamos trocar pelo endpoint de streaming do Gemini (`streamGenerateContent?alt=sse`) e expor isso como uma rota de servidor HTTP em `src/routes/api/artigo-chat.ts`, que devolve um stream de texto. No componente, em vez de `useServerFn`, fazemos `fetch` nessa rota e lemos o `ReadableStream` chunk a chunk com `getReader()`, atualizando a última mensagem do assistente a cada pedaço recebido. O Markdown vai sendo renderizado em tempo real (o `ReactMarkdown` lida bem com texto parcial).

A animação atual de "digitação artificial" (estado `digitando`, timeout de 28ms) será removida — o próprio stream é a animação natural, e ela ficava mais lenta que a chegada do texto.

### 2. Cortou no meio — aumentar limite
O `maxOutputTokens` está em **2048**, que é pouco para explicações longas com markdown. Vamos subir para **8192** (limite confortável do `gemini-2.5-flash`). Combinado com streaming, a pessoa já vê o texto chegando e o final não é mais cortado.

### 3. Não descer a tela automaticamente
Remover o `useEffect` que faz `scrollTo({ top: scrollHeight })`. A pessoa controla o scroll. Vamos manter apenas um pequeno auto-scroll **uma única vez** quando a própria pessoa envia a mensagem (pra mostrar a pergunta dela), mas durante o streaming da resposta a tela fica parada.

### 4. Exportar PDF e compartilhar no WhatsApp
Depois que a resposta do assistente termina de streamar (stream fechado), aparecem dois botões pequenos no rodapé da bolha da última resposta:

- **Exportar PDF** — usa `jspdf` (já no projeto se não, instalar) pra gerar um PDF com: cabeçalho "Profa. Ana — Art. X · {Lei}", a pergunta da pessoa e a resposta formatada em texto (markdown convertido para texto puro com quebras e bullets). Nome do arquivo: `profa-ana-art-{numero}.pdf`. Download direto no navegador.
- **Compartilhar no WhatsApp** — abre `https://wa.me/?text=...` em nova aba com o texto da resposta + a pergunta + um rodapé "via OAB On Point — Art. X". Em mobile abre o app do WhatsApp direto; em desktop abre o WhatsApp Web. Markdown vira formato WhatsApp (`**negrito**` → `*negrito*`, `*itálico*` → `_itálico_`, listas viram `• item`, blockquotes viram linhas com `> `).

Os botões só aparecem em mensagens do assistente já finalizadas (não enquanto está streamando), e ficam discretos (ícones pequenos com label, estilo "ghost" dourado).

---

## Detalhes técnicos

**Arquivos afetados:**
- `src/lib/gemini.server.ts` — adicionar helper `geminiStreamContent(model, body)` que faz `fetch` em `streamGenerateContent?alt=sse&key=…` e retorna o `Response` (com o body como `ReadableStream`). Mantém o fallback entre as 2 chaves.
- `src/routes/api/artigo-chat.ts` (novo) — `createFileRoute` com handler `POST` que valida o input (mesmo Zod schema de hoje), monta o prompt da Profa. Ana, chama `geminiStreamContent`, faz parse do SSE do Gemini (`data: {...}\n\n`) extraindo `candidates[0].content.parts[0].text`, e re-emite como `text/plain` streaming pro cliente (mais simples que SSE no front).
- `src/lib/artigo-chat.functions.ts` — pode ser removido (ou mantido como fallback não-streaming). Vamos remover do componente.
- `src/lib/whatsapp-markdown.ts` (novo) — utilitário puro `markdownToWhatsapp(text)`.
- `src/lib/chat-pdf.ts` (novo) — utilitário `exportarConversaPDF({ artigo, lei, pergunta, resposta })` usando `jspdf`.
- `src/routes/_app.vade-mecum.estatutos.$slug.tsx` — refatorar `ChatIAOverlay`:
  - trocar `useServerFn(perguntarArtigoIA)` por `fetch("/api/artigo-chat", { method: "POST", body: JSON.stringify(...) })` + leitura via `response.body.getReader()` + `TextDecoder`.
  - remover estado `digitando` e o `useEffect` de chunks artificiais.
  - remover o `useEffect` de auto-scroll por mudança de mensagem; manter scroll só no envio do usuário.
  - acrescentar barra de ações (PDF / WhatsApp) abaixo de cada resposta finalizada do assistente.

**Dependência nova:** `jspdf` (`bun add jspdf`) — leve, roda no browser, sem dependências de fonte server-side.

**Sem mudança de banco, sem mudança de RLS, sem mexer em outras telas.**

---

## Fora do escopo
- Salvar histórico das conversas no Supabase (não foi pedido).
- Voz/áudio nas respostas.
- Compartilhar imagem (card visual) — só texto via WhatsApp por enquanto.