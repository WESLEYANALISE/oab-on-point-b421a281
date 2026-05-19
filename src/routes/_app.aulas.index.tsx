import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AULAS_MATERIAS, getAreasDaMateria } from "@/data/aulas-oab";
import { contarLivrosPorMaterias } from "@/lib/aulas.functions";
import { cn } from "@/lib/utils";
import { MateriaGlyph, getMateriaAccent } from "@/components/aulas/MateriaGlyph";

export const Route = createFileRoute("/_app/aulas/")({
  head: () => ({
    meta: [
      { title: "Aulas OAB 1ª Fase — OAB na Risca" },
      { name: "description", content: "Trilha de matérias do edital com material pronto para estudo." },
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
      <header className="px-4 md:px-8 pt-6 pb-6 bg-gradient-toga text-primary-foreground">
        <div className="flex items-center gap-2 text-gold/85 text-[10px] uppercase tracking-[0.22em] font-semibold mb-1.5">
          <span className="h-px w-6 bg-gold/60" /> Hub de aulas
        </div>
        <h1 className="font-display font-semibold text-[22px] sm:text-3xl md:text-4xl tracking-tight leading-[1.15]">
          Aulas OAB 1ª Fase
        </h1>
        <p className="mt-1.5 text-[12.5px] md:text-sm text-primary-foreground/80 max-w-xl">
          Siga a trilha de matérias do edital. Cada parada tem resumos, flashcards, questões e simulado.
        </p>
      </header>

      <section className="px-4 md:px-8 mt-6">
        <ol className="relative">
          {/* linha vertical da trilha */}
          <span
            aria-hidden
            className="absolute left-[27px] top-2 bottom-2 w-px"
            style={{
              background:
                "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--gold) 55%, transparent) 8%, color-mix(in oklab, var(--gold) 25%, transparent) 92%, transparent)",
            }}
          />

          {AULAS_MATERIAS.map((m, i) => {
            const temArea = getAreasDaMateria(m.materiaId).length > 0;
            const total = counts?.[m.materiaId] ?? 0;
            const indisponivel = !temArea || total === 0;
            const carregando = temArea && !counts;
            const accent = getMateriaAccent(m.materiaId);
            const num = String(i + 1).padStart(2, "0");

            const node = (
              <div className="relative pl-16 py-2.5">
                {/* nó da timeline */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[18px] top-[18px] h-[20px] w-[20px] rounded-full border bg-background flex items-center justify-center transition-all",
                    indisponivel ? "border-border" : "border-gold/70 group-hover:scale-110"
                  )}
                  style={!indisponivel ? { boxShadow: `0 0 0 3px color-mix(in oklab, ${accent} 18%, transparent)` } : undefined}
                >
                  <span
                    className={cn("h-[7px] w-[7px] rounded-full")}
                    style={{ background: indisponivel ? "var(--border)" : accent }}
                  />
                </span>

                {/* card */}
                <div
                  className={cn(
                    "relative overflow-hidden rounded-2xl border bg-card transition-all",
                    indisponivel
                      ? "border-border/70 opacity-60"
                      : "border-border group-hover:border-gold/40 group-hover:-translate-y-0.5 shadow-sm shadow-black/20"
                  )}
                >
                  {/* faixa de acento lateral */}
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-[3px]"
                    style={{
                      background: indisponivel
                        ? "transparent"
                        : `linear-gradient(to bottom, ${accent}, color-mix(in oklab, ${accent} 30%, transparent))`,
                    }}
                  />

                  <div className="flex items-center gap-3 p-3 pr-3.5">
                    <MateriaGlyph
                      materiaId={m.materiaId}
                      className="h-14 w-14 shrink-0 rounded-2xl border border-border/60 bg-background/40 p-1.5"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground/80"
                        >
                          {num}
                        </span>
                        <span
                          aria-hidden
                          className="h-px flex-1"
                          style={{ background: `color-mix(in oklab, ${accent} 30%, transparent)` }}
                        />
                        {indisponivel && !carregando && (
                          <span className="text-[9px] uppercase tracking-wider font-semibold rounded px-1.5 py-0.5 border border-border text-muted-foreground">
                            Em breve
                          </span>
                        )}
                      </div>
                      <h2 className="mt-1 font-display text-[14px] sm:text-[15px] leading-tight text-foreground">
                        {m.nome}
                      </h2>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {carregando
                          ? "Carregando…"
                          : indisponivel
                            ? "Trilha em preparação"
                            : `${total} ${total === 1 ? "tema" : "temas"} • resumos, flashcards e simulado`}
                      </p>
                    </div>

                    {!indisponivel && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        className="shrink-0 text-muted-foreground/70 group-hover:text-gold transition-colors"
                        aria-hidden
                      >
                        <path d="M4 2l6 5-6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            );

            const liCls = "group block";

            return (
              <li key={m.materiaId} className={liCls}>
                {indisponivel ? (
                  <div aria-disabled className="cursor-not-allowed">
                    {node}
                  </div>
                ) : (
                  <Link to="/aulas/$materia" params={{ materia: m.materiaId }} className="block tap-feedback">
                    {node}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
