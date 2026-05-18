// Helper compartilhado para chamadas Gemini com fallback de chave.
// Tenta GEMINI_API_KEY primeiro; em caso de erro de auth/quota/servidor,
// tenta a segunda chave (aceita GEMINI_API_KEY_2 ou "GEMINI_API_KEY 2").

export function getGeminiKeys(): string[] {
  const k1 = process.env.GEMINI_API_KEY;
  const k2 =
    process.env.GEMINI_API_KEY_2 ??
    process.env["GEMINI_API_KEY 2"] ??
    process.env.GEMINI_API_KEY2;
  return [k1, k2].filter((k): k is string => typeof k === "string" && k.length > 0);
}

export type GeminiFetchOptions = {
  /** Número de tentativas por chave para erros transientes (429/5xx). Default 1. */
  maxAttemptsPerKey?: number;
  /** Backoff inicial em ms (dobra a cada tentativa). Default 1000. */
  backoffMs?: number;
};

/**
 * Faz uma chamada generateContent ao Gemini com fallback automático entre chaves.
 * Retorna o `Response` da última tentativa (ok ou não-ok), igual a `fetch`.
 */
export async function geminiGenerateContent(
  model: string,
  body: unknown,
  opts: GeminiFetchOptions = {},
): Promise<Response> {
  const keys = getGeminiKeys();
  if (keys.length === 0) throw new Error("GEMINI_API_KEY não configurada");

  const maxAttempts = Math.max(1, opts.maxAttemptsPerKey ?? 1);
  const backoff = opts.backoffMs ?? 1000;

  let lastRes: Response | null = null;
  let lastErr: unknown = null;

  for (let keyIdx = 0; keyIdx < keys.length; keyIdx++) {
    const key = keys[keyIdx];
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        if (res.ok) return res;

        const transient = res.status === 408 || res.status === 429 || res.status >= 500;
        const authIssue = res.status === 401 || res.status === 403;

        // Última tentativa nesta chave: guarda e decide se vai pra próxima chave
        if (attempt >= maxAttempts) {
          lastRes = res;
          if (transient || authIssue) break; // tenta próxima chave
          return res; // erro não-recuperável (400/404 etc.)
        }

        if (transient) {
          await new Promise((r) => setTimeout(r, backoff * 2 ** (attempt - 1)));
          continue;
        }

        // não-transiente em meio das tentativas → vai pra próxima chave se for auth, senão retorna
        lastRes = res;
        if (authIssue) break;
        return res;
      } catch (e) {
        lastErr = e;
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, backoff * 2 ** (attempt - 1)));
          continue;
        }
        // esgotou tentativas nesta chave → tenta próxima
        break;
      }
    }
  }

  if (lastRes) return lastRes;
  throw lastErr instanceof Error ? lastErr : new Error("Gemini falhou em todas as chaves");
}
