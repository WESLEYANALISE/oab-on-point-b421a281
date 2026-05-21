// Helper para obter HTML renderizado via Browserless (Chrome headless gerenciado).
// Roda apenas no server. Lê BROWSERLESS_API_KEY do ambiente em runtime.

export async function fetchRendered(url: string): Promise<string> {

  const token = process.env.BROWSERLESS_API_KEY;
  if (!token) {
    throw new Error(
      "BROWSERLESS_API_KEY não configurada. Adicione-a nos secrets do projeto.",
    );
  }

  const endpoint = `https://production-sfo.browserless.io/content?token=${encodeURIComponent(token)}`;
  // API v2: usar `waitForTimeout` (number, top-level, ms) em vez de `waitFor`.
  // Planalto é instável com networkidle0 — tentamos estratégias progressivamente
  // mais agressivas até obter HTML válido.
  const attempts: Array<Record<string, unknown>> = [
    { gotoOptions: { waitUntil: "domcontentloaded", timeout: 45000 }, waitForTimeout: 4000 },
    { gotoOptions: { waitUntil: "load", timeout: 60000 }, waitForTimeout: 6000 },
    { gotoOptions: { waitUntil: "networkidle2", timeout: 60000 }, waitForTimeout: 3000 },
  ];

  let lastErr = "";
  for (const opts of attempts) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, ...opts }),
      });
      if (res.ok) {
        const html = await res.text();
        if (html && !isBotChallenge(html)) return html;
        lastErr = "resposta vazia ou bloqueada por challenge";
        continue;
      }
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      lastErr = `${res.status} ${res.statusText} :: ${detail}`;
      if (res.status < 500) break; // 4xx não adianta retentar
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  // Último recurso: /unblock (passa por challenges JS tipo bobcmn/TSPD).
  // O Planalto exige espera longa + waitForSelector para a tabela renderizar
  // após o desafio TSPD ser resolvido pelo Chrome.
  try {
    const unblockEndpoint = `https://production-sfo.browserless.io/unblock?token=${encodeURIComponent(token)}`;
    const res = await fetch(unblockEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        content: true,
        cookies: false,
        browserWSEndpoint: false,
        ttl: 0,
        waitForTimeout: 15000,
        waitForSelector: { selector: "table", timeout: 30000 },
      }),
    });
    if (res.ok) {
      const json = (await res.json().catch(() => null)) as { content?: string } | null;
      if (json?.content && !isBotChallenge(json.content)) return json.content;
      lastErr = `/unblock retornou ${json?.content?.length ?? 0} chars (challenge persistente)`;
    } else {
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      lastErr = `/unblock ${res.status} ${res.statusText} :: ${detail}`;
    }
  } catch (e) {
    lastErr = e instanceof Error ? e.message : String(e);
  }

  throw new Error(`Browserless falhou após retries :: ${lastErr}`);
}
function isBotChallenge(html: string): boolean {
  if (!html || html.length < 2000) return true;
  // Só considera challenge se for curto E tiver o script de proteção ativo.
  if (html.length < 25000 && /window\["bobcmn"\]|bobcmn|Just a moment|cf-challenge/i.test(html)) return true;
  return false;
}

}

// Fetch direto; se vier challenge do Planalto, faz fallback automático para Browserless.
export async function fetchDirect(url: string): Promise<string> {
  let direct: string | null = null;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (res.ok) {
      const buf = await res.arrayBuffer();
      direct = new TextDecoder("latin1").decode(buf);
    }
  } catch {
    // ignore — cai no fallback
  }

  if (direct && !isBotChallenge(direct)) return direct;

  if (process.env.BROWSERLESS_API_KEY) {
    return fetchRendered(url);
  }
  throw new Error(
    `Falha ao buscar ${url}: resposta direta vazia ou bloqueada por challenge. Configure BROWSERLESS_API_KEY.`,
  );
}
