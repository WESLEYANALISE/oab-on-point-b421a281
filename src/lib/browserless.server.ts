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

// Fetch direto com fallback automático para Browserless.
// O Planalto bloqueia IPs de cloud, então fetch direto costuma falhar com "fetch failed".
export async function fetchDirect(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    return new TextDecoder("latin1").decode(buf);
  } catch (e) {
    // Fallback para Browserless (Planalto geralmente bloqueia IPs de cloud).
    if (process.env.BROWSERLESS_API_KEY) {
      return fetchRendered(url);
    }
    throw new Error(
      `Falha ao buscar ${url}: ${e instanceof Error ? e.message : String(e)}. Configure BROWSERLESS_API_KEY para usar o renderizador.`,
    );
  }
}
