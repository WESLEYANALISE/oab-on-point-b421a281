// Filtros temáticos e leis importantes para a página de Atualizações de Leis.

export type AtoLite = {
  tipo: string;
  numero: string;
  ementa: string;
};

export type PresetKey =
  | "todos"
  | "codigos"
  | "constituicao"
  | "estatutos"
  | "tributario"
  | "penal"
  | "trabalhista";

export const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "codigos", label: "Códigos" },
  { key: "constituicao", label: "Constituição" },
  { key: "estatutos", label: "Estatutos" },
  { key: "tributario", label: "Tributário" },
  { key: "penal", label: "Penal" },
  { key: "trabalhista", label: "Trabalhista" },
];

export type LeiImportante = {
  slug: string;
  label: string;
  // padrões aceitáveis para casar com a ementa
  // ex.: para Maria da Penha → ["11340", "maria da penha"]
  patterns: string[];
  // se true, também casa qualquer ato cujo `tipo` seja "emenda_constitucional"
  ec?: boolean;
};

export const LEIS_IMPORTANTES: LeiImportante[] = [
  { slug: "cf88", label: "Constituição Federal (CF/88)", patterns: ["constituição federal", "constituicao federal", "cf/88"], ec: true },
  { slug: "cp", label: "Código Penal (DL 2.848/40)", patterns: ["2848", "código penal", "codigo penal"] },
  { slug: "cpp", label: "Código de Processo Penal (DL 3.689/41)", patterns: ["3689", "processo penal"] },
  { slug: "cc", label: "Código Civil (Lei 10.406/02)", patterns: ["10406", "código civil", "codigo civil"] },
  { slug: "cpc", label: "Código de Processo Civil (Lei 13.105/15)", patterns: ["13105", "processo civil"] },
  { slug: "clt", label: "CLT (DL 5.452/43)", patterns: ["5452", "consolidação das leis do trabalho", "clt"] },
  { slug: "cdc", label: "CDC (Lei 8.078/90)", patterns: ["8078", "defesa do consumidor"] },
  { slug: "ctn", label: "CTN (Lei 5.172/66)", patterns: ["5172", "código tributário", "codigo tributario"] },
  { slug: "oab", label: "Estatuto da OAB (Lei 8.906/94)", patterns: ["8906", "estatuto da advocacia", "estatuto da oab"] },
  { slug: "maria-penha", label: "Lei Maria da Penha (Lei 11.340/06)", patterns: ["11340", "maria da penha"] },
  { slug: "eca", label: "ECA (Lei 8.069/90)", patterns: ["8069", "criança e do adolescente", "crianca e do adolescente"] },
  { slug: "idoso", label: "Estatuto do Idoso (Lei 10.741/03)", patterns: ["10741", "estatuto do idoso"] },
];

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// número da ementa sem pontuação para casar "11.340" / "11340"
function ementaPlain(ementa: string): string {
  return normalize(ementa).replace(/[.\-\s]/g, "");
}

export function matchPreset(ato: AtoLite, preset: PresetKey): boolean {
  if (preset === "todos") return true;
  const e = normalize(ato.ementa);
  switch (preset) {
    case "codigos":
      return /\bcodigo\b/.test(e);
    case "constituicao":
      return ato.tipo === "emenda_constitucional" || /constituicao federal|cf\/?88/.test(e);
    case "estatutos":
      return /\bestatuto\b/.test(e);
    case "tributario":
      return /(tribut|imposto|icms|ipi|iss|pis|cofins|irpj|csll|receita federal|cofins)/.test(e);
    case "penal":
      return /(penal|crime|criminal|delito|pena privativa|execucao penal)/.test(e);
    case "trabalhista":
      return /(trabalh|clt|consolidacao das leis do trabalho|empregad|sindical)/.test(e);
    default:
      return true;
  }
}

export function matchLeisAcompanhadas(ato: AtoLite, slugs: string[]): boolean {
  if (slugs.length === 0) return true;
  const ePlain = ementaPlain(ato.ementa);
  const e = normalize(ato.ementa);
  for (const slug of slugs) {
    const lei = LEIS_IMPORTANTES.find((l) => l.slug === slug);
    if (!lei) continue;
    if (lei.ec && ato.tipo === "emenda_constitucional") return true;
    for (const p of lei.patterns) {
      const pn = normalize(p);
      if (/^\d+$/.test(pn)) {
        if (ePlain.includes(pn)) return true;
      } else if (e.includes(pn)) {
        return true;
      }
    }
  }
  return false;
}
