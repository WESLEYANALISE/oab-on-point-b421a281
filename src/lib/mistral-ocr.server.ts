// Helper para Mistral OCR (extração de PDF preservando texto + imagens).
// Doc: https://docs.mistral.ai/capabilities/document/

const MISTRAL_URL = "https://api.mistral.ai/v1/ocr";

export type MistralOcrImage = {
  id: string;
  image_base64?: string | null;
  top_left_x?: number;
  top_left_y?: number;
  bottom_right_x?: number;
  bottom_right_y?: number;
};

export type MistralOcrPage = {
  index: number;
  markdown: string;
  images: MistralOcrImage[];
};

export type MistralOcrResult = {
  pages: MistralOcrPage[];
  model?: string;
};

export async function mistralOcrFromUrl(
  documentUrl: string,
  opts?: { pages?: number[] },
): Promise<MistralOcrResult> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("MISTRAL_API_KEY não configurada");

  const body: any = {
    model: "mistral-ocr-latest",
    document: { type: "document_url", document_url: documentUrl },
    include_image_base64: true,
  };
  if (opts?.pages && opts.pages.length > 0) body.pages = opts.pages;

  const res = await fetch(MISTRAL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Mistral OCR ${res.status}: ${txt.slice(0, 400)}`);
  }

  const json = (await res.json()) as any;
  const pages: MistralOcrPage[] = (json?.pages ?? []).map((p: any, i: number) => ({
    index: typeof p.index === "number" ? p.index : i,
    markdown: String(p.markdown ?? ""),
    images: Array.isArray(p.images)
      ? p.images.map((im: any) => ({
          id: String(im.id ?? `pag-${i}-img`),
          image_base64: im.image_base64 ?? null,
          top_left_x: im.top_left_x,
          top_left_y: im.top_left_y,
          bottom_right_x: im.bottom_right_x,
          bottom_right_y: im.bottom_right_y,
        }))
      : [],
  }));

  return { pages, model: json?.model };
}

/**
 * Limpa o markdown removendo blocos comuns de divulgação/professor/cursinho
 * que não fazem parte do conteúdo jurídico.
 */
const PADROES_LIXO: RegExp[] = [
  /^\s*(prof\.?|professora?|mestre|dr\.?|dra\.?)\b.*$/gim,
  /^\s*@[\w.]+\s*$/gim,
  /\b(instagram|whatsapp|telegram|tiktok|youtube|facebook)\b[^\n]*$/gim,
  /\b(inscreva-se|siga(-me)?|curta|compartilhe|clique no link)\b[^\n]*$/gim,
  /\bcursinho\b[^\n]*$/gim,
  /\b(material exclusivo|material protegido|todos os direitos reservados)\b[^\n]*$/gim,
  /^\s*!\[[^\]]*\]\([^)]*logo[^)]*\)\s*$/gim,
  /^\s*!\[[^\]]*\]\([^)]*capa[^)]*\)\s*$/gim,
];

export function limparMarkdown(md: string): string {
  let out = md;
  for (const re of PADROES_LIXO) out = out.replace(re, "");
  // remove linhas vazias triplas
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  return out;
}

/** Decodifica image_base64 que pode vir como data URI. */
export function decodeBase64Image(b64: string): { bytes: Uint8Array; mime: string } {
  let mime = "image/png";
  let data = b64;
  const m = b64.match(/^data:([^;]+);base64,(.*)$/);
  if (m) {
    mime = m[1];
    data = m[2];
  }
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime };
}
