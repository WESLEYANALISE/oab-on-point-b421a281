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
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      gotoOptions: { waitUntil: "networkidle0", timeout: 60000 },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Browserless ${res.status} ${res.statusText} :: ${detail.slice(0, 300)}`,
    );
  }

  return res.text();
}

// Detecta página de bot-challenge do Planalto (retorna 200 mas só com JS de proteção).
function isBotChallenge(html: string): boolean {
  if (html.length < 25000 && /bobcmn|TSPD|challenge|window\["bobcmn"\]/i.test(html)) return true;
  // Página real da resenha contém marcadores claros
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
