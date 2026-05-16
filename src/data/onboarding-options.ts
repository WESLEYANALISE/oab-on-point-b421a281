export const DORES_OPTIONS = [
  { id: "material",       label: "Material de estudo" },
  { id: "aulas",          label: "Videoaulas" },
  { id: "cronograma",     label: "Cronograma semanal" },
  { id: "resumos",        label: "Resumos" },
  { id: "flashcards",     label: "Flashcards" },
  { id: "simulados",      label: "Simulados" },
  { id: "questoes",       label: "Questões comentadas" },
  { id: "pecas",          label: "Peças da 2ª fase" },
  { id: "acompanhamento", label: "Acompanhamento próximo" },
] as const;

export type DorId = (typeof DORES_OPTIONS)[number]["id"];
