// Helper para obter HTML renderizado via Browserless (Chrome headless gerenciado).
// Roda apenas no server. Lê BROWSERLESS_API_KEY do ambiente em runtime.

export async function fetchRendered(url: string): Promise<string> {
  const token = process.env.BROWSERLESS_API_KEY;
  if (!token) {
    throw new Error(
      "BROWSERLESS_API_KEY não configurada. Adicione-a nos secrets do projeto.",
    );
  }

  const endpoint = `https://chrome.browserless.io/content?token=${encodeURIComponent(token)}`;
  // Planalto é instável com networkidle0 (frame detach). Tentamos estratégias
  // mais leves com retry até obter um HTML válido.
  const attempts: Array<Record<string, unknown>> = [
    { gotoOptions: { waitUntil: "domcontentloaded", timeout: 45000 }, waitFor: 4000 },
    { gotoOptions: { waitUntil: "load", timeout: 60000 }, waitFor: 6000 },
    { gotoOptions: { waitUntil: "networkidle2", timeout: 60000 }, waitFor: 3000 },
  ];

  let lastErr = "";
  for (const opts of attempts) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, ...opts }),
      });
      if (res.ok) return await res.text();
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      lastErr = `${res.status} ${res.statusText} :: ${detail}`;
      if (res.status < 500) break; // 4xx não adianta retentar
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`Browserless falhou após retries :: ${lastErr}`);
}

// Detecta página de bot-challenge do Planalto (retorna 200 mas só com JS de proteção).
function isBotChallenge(html: string): boolean {
  if (html.length < 25000 && /bobcmn|TSPD|challenge|window\["bobcmn"\]/i.test(html)) return true;
  if (!/resenha|legisla|planalto/i.test(html)) return true;
  return false;
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
