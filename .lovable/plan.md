## Objetivo

Manter o **Mistral OCR** para extrair texto bruto dos PDFs (prova + gabarito) e trocar a etapa de organização/estruturação das questões do `mistral-large-latest` para a **API direta do Google Gemini** (modelo mais barato: `gemini-2.5-flash-lite`), usando uma **chave API própria do usuário** (`GEMINI_API_KEY`), não o Lovable AI Gateway.

## Mudanças

### 1. Secret
- Adicionar novo secret `GEMINI_API_KEY` (chave obtida em https://aistudio.google.com/apikey).
- Solicitarei via `add_secret` após sua aprovação do plano.

### 2. `src/lib/simulados-admin.functions.ts`
- **Manter** `mistralOcr()` (continua extraindo markdown via Mistral).
- **Remover** `mistralChatJson()`.
- **Adicionar** `geminiExtractJson(systemPrompt, userPrompt)`:
  - `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`
  - Body com `system_instruction`, `contents`, e `generationConfig: { responseMimeType: "application/json", temperature: 0.1 }`.
  - Tratar 429 / 403 / 400 com mensagens claras nos logs do job.
- Em `processarBatch()`, substituir a chamada Mistral chat pela `geminiExtractJson()` — prompt continua o mesmo (extrair questões `inicio..fim` com matéria, alternativas A–D, resposta correta vinda do gabarito).
- Em `iniciarGeracao()`, popular também `ano` em `simulados` a partir de `provas_oab.ano`.

### 3. Banco
- Adicionar coluna `ano integer` (nullable) em `public.simulados`. Sem mudanças de RLS.

### 4. UI
- Sem mudanças visuais. Apenas os logs passam a mostrar "Organizando questões via Gemini Flash Lite…".

## Detalhes técnicos

- **Modelo**: `gemini-2.5-flash-lite` — o mais barato da família Gemini, suporta `responseMimeType: "application/json"` e janela de ~1M tokens (cabe folgado os ~90k caracteres do OCR de uma prova OAB).
- **Endpoint**: API REST oficial do Google AI Studio, sem intermediários.
- **Batch**: mantém 20 questões por lote.
- **Validação**: `QuestaoSchema` (zod) continua filtrando respostas inválidas antes do insert.

## Pseudocódigo

```ts
async function geminiExtractJson(system: string, user: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini falhou [${res.status}]: ${(await res.text()).slice(0, 300)}`);
  }
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
}
```

## Fora do escopo
- Não troca o OCR (Mistral OCR continua).
- Não altera fluxo de jobs/batches nem a UI de progresso.
- Não usa Lovable AI Gateway.
