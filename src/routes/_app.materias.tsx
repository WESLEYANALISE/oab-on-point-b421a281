import { createFileRoute } from "@tanstack/react-router";
import { MateriaCard } from "@/components/shared/MateriaCard";
import { getMaterias } from "@/data/materias";

export const Route = createFileRoute("/_app/materias")({
  head: () => ({
    meta: [
      { title: "Matérias da OAB — OAB na Risca" },
      { name: "description", content: "Todas as matérias da 1ª fase do Exame da OAB com aulas, resumos, flashcards e questões." },
    ],
  }),
  component: MateriasPage,
});

function MateriasPage() {
  const materias = getMaterias();
  const areas = Array.from(new Set(materias.map((m) => m.area)));
  return (
    <div className="px-4 md:px-10 py-8 md:py-12 max-w-6xl">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-2">1ª fase · 18 matérias</p>
        <h1 className="font-display text-4xl md:text-5xl leading-tight">Matérias da OAB</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          Estude por matéria com aulas interativas, resumos diretos, flashcards e bancos de questões da FGV.
        </p>
      </header>

      {areas.map((area) => (
        <section key={area} className="mb-10">
          <h2 className="text-sm uppercase tracking-[0.18em] text-primary font-bold mb-4">{area}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {materias.filter((m) => m.area === area).map((m) => (
              <MateriaCard key={m.slug} materia={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
