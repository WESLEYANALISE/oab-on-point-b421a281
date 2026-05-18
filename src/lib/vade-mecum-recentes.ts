// Helper localStorage para "recentes" de leis no Vade Mecum.
const KEY = "vmec-recentes-v1";
const MAX = 15;

export type LeiRecente = { slug: string; ts: number };

export function getRecentes(): LeiRecente[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function pushRecente(slug: string) {
  if (typeof window === "undefined") return;
  const atual = getRecentes().filter((r) => r.slug !== slug);
  atual.unshift({ slug, ts: Date.now() });
  const tr = atual.slice(0, MAX);
  window.localStorage.setItem(KEY, JSON.stringify(tr));
}
