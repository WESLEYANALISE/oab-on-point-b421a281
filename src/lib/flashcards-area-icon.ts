import { MATERIA_ACCENT } from "@/components/aulas/MateriaGlyph";

/** Normaliza nome de área vinda do banco para o ID de matéria do MateriaGlyph. */
export function areaToMateriaId(area: string | null | undefined): string {
  if (!area) return "default";
  const n = area
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^direito\s+/, "")
    .trim();

  // Matches diretos
  const map: Record<string, string> = {
    "etica": "etica",
    "etica e estatuto da oab": "etica",
    "estatuto da oab": "etica",
    "constitucional": "constitucional",
    "civil": "civil",
    "processo civil": "processo-civil",
    "processual civil": "processo-civil",
    "penal": "penal",
    "processo penal": "processo-penal",
    "processual penal": "processo-penal",
    "trabalho": "trabalho",
    "trabalhista": "trabalho",
    "processo do trabalho": "processo-trabalho",
    "processual trabalho": "processo-trabalho",
    "administrativo": "administrativo",
    "tributario": "tributario",
    "empresarial": "empresarial",
    "internacional": "internacional",
    "direitos humanos": "humanos",
    "humanos": "humanos",
    "ambiental": "ambiental",
    "eca": "eca",
    "crianca e adolescente": "eca",
    "filosofia": "filosofia",
    "filosofia do direito": "filosofia",
  };

  if (map[n]) return map[n];

  // Fallback por substring
  for (const [key, id] of Object.entries(map)) {
    if (n.includes(key)) return id;
  }
  return "default";
}

export function areaAccent(area: string | null | undefined): string {
  const id = areaToMateriaId(area);
  return MATERIA_ACCENT[id] ?? "#c9a14a";
}
