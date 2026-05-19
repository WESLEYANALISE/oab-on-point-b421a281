import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AULAS_MATERIAS, getAreasDaMateria } from "@/data/aulas-oab";
import { contarLivrosPorMaterias } from "@/lib/aulas.functions";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/aulas")({
  head: () => ({
    meta: [
      { title: "Aulas OAB 1ª Fase — OAB na Risca" },
      { name: "description", content: "Aulas guiadas por matéria, com lista completa de temas para estudar e trilha integrada com resumos, flashcards, questões e simulado." },
    ],
  }),
  component: AulasIndex,
  notFoundComponent: () => <div className="p-8">Página não encontrada.</div>,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
});

function AulasIndex() {
  const contar = useServerFn(contarLivrosPorMaterias);
  const { data: counts } = useQuery({
    queryKey: ["aulas", "counts"],
    queryFn: () => contar(),
    staleTime: 60_000,
  });

  return (
    <div className="pb-16">
      <header className="px-4 md:px-8 pt-6 pb-5 bg-gradient-toga text-primary-foreground">
        <div className="flex items-center gap-2 text-gold/85 text-[10px] uppercase tracking-[0.22em] font-semibold mb-1.5">
          <GraduationCap className="h-3.5 w-3.5" /> Hub de aulas
        </div>
        <h1 className="font-display font-semibold text-[26px] md:text-4xl tracking-tight">Aulas OAB 1ª Fase</h1>
        <p className="mt-1.5 text-[13px] md:text-sm text-primary-foreground/80 max-w-xl">
          Escolha uma matéria e veja todos os temas do edital com material pronto para estudo.
        </p>
      </header>

      <section className="px-4 md:px-8 mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {AULAS_MATERIAS.map((m) => {
          const temArea = getAreasDaMateria(m.materiaId).length > 0;
          const total = counts?.[m.materiaId] ?? 0;
          const indisponivel = !temArea || total === 0;
          const carregando = temArea && !counts;
          const cardInner = (
            <>
              <div className={cn("h-20 bg-gradient-to-br p-3 flex items-start justify-between", m.cor)}>
                <span className="text-3xl">{m.emoji}</span>
                {indisponivel && !carregando && (
                  <span className="text-[9px] uppercase tracking-wider text-white/90 font-semibold bg-black/30 rounded px-1.5 py-0.5">Em breve</span>
                )}
              </div>
              <div className="p-3">
                <h2 className="font-display text-[13px] md:text-sm leading-tight">{m.nome}</h2>
                <p className="text-[10.5px] text-muted-foreground mt-1">
                  {carregando
                    ? "Carregando…"
                    : indisponivel
                      ? "Trilha em preparação"
                      : `${total} ${total === 1 ? "tema" : "temas"}`}
                </p>
              </div>
            </>
          );
          const baseCls = "group relative overflow-hidden rounded-2xl border border-border bg-card transition-all shadow-md shadow-black/20";
          if (indisponivel) {
            return (
              <div key={m.materiaId} aria-disabled className={cn(baseCls, "opacity-60 cursor-not-allowed")}>
                {cardInner}
              </div>
            );
          }
          return (
            <Link
              key={m.materiaId}
              to="/aulas/$materia"
              params={{ materia: m.materiaId }}
              className={cn(baseCls, "tap-feedback hover:-translate-y-0.5 hover:border-gold/40")}
            >
              {cardInner}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
