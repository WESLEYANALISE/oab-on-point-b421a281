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

// Fallback simples (fetch direto). Útil para o Planalto (HTML estático em latin-1).
export async function fetchDirect(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; OABNaRiscaBot/1.0; +https://oab-on-point.lovable.app)",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  const buf = await res.arrayBuffer();
  // Planalto serve em ISO-8859-1
  return new TextDecoder("latin1").decode(buf);
}
