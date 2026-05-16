const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/º/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function makeSimuladoSlug(simulado: { prova_numero: number; titulo?: string | null }) {
  const base = simulado.titulo ? slugify(simulado.titulo) : `simulado-${simulado.prova_numero}-exame-da-ordem`;
  return base || `simulado-${simulado.prova_numero}`;
}

export function provaNumeroFromSimuladoSlug(slug: string) {
  const match = slug.match(/\d+/);
  return match ? Number(match[0]) : null;
}