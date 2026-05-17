/**
 * Helper para servir imagens do Supabase Storage redimensionadas via
 * Image Transformation API. Reduz drasticamente o peso em mobile.
 *
 * Aceita URL pública (`/storage/v1/object/public/<bucket>/<path>`) e
 * devolve a versão `/storage/v1/render/image/public/<bucket>/<path>`
 * com `width`, `quality` e `resize=cover`.
 *
 * Se a URL não for do Supabase Storage (CDN externa, data URL, etc.),
 * devolve sem alterar.
 */
export function supabaseImage(
  url: string | null | undefined,
  opts: { w?: number; q?: number; resize?: "cover" | "contain" | "fill" } = {},
): string | undefined {
  if (!url) return undefined;
  const { w, q = 75, resize = "cover" } = opts;
  // Só transforma URLs públicas do Supabase Storage.
  if (!url.includes("/storage/v1/object/public/")) return url;
  const transformed = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/",
  );
  const params = new URLSearchParams();
  if (w) params.set("width", String(w));
  params.set("quality", String(q));
  params.set("resize", resize);
  return `${transformed}?${params.toString()}`;
}

/**
 * Gera o atributo `srcSet` para 1x/2x a partir de um `width` base.
 */
export function supabaseImageSrcSet(
  url: string | null | undefined,
  w: number,
  q = 75,
): string | undefined {
  const x1 = supabaseImage(url, { w, q });
  const x2 = supabaseImage(url, { w: w * 2, q });
  if (!x1 || !x2) return undefined;
  return `${x1} 1x, ${x2} 2x`;
}
