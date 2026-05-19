import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, ChevronRight } from "lucide-react";
import { resumoLivroQueryOptions } from "@/lib/resumos-queries";
import { normalizarTitulo } from "@/lib/titulo";
import { getMateriaAula } from "@/data/aulas-oab";

export const Route = createFileRoute("/_app/aulas/$materia/$livroId/")({
  component: TrilhaCapitulos,
});

function TrilhaCapitulos() {
  const { materia, livroId } = Route.useParams();
  const mat = getMateriaAula(materia);
  if (!mat) return <div className="p-8">Matéria não encontrada.</div>;
  const { data } = useSuspenseQuery(resumoLivroQueryOptions(livroId));
  const capitulos = data.capitulos ?? [];

  return (
    <div className="pb-16">
      <header className="relative px-4 md:px-8 pt-5 pb-6 overflow-hidden border-b border-border bg-card/40">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 80% at 0% 0%, color-mix(in oklab, var(--gold) 14%, transparent), transparent 70%), radial-gradient(50% 60% at 100% 100%, color-mix(in oklab, var(--gold) 8%, transparent), transparent 70%)",
          }}
        />
        <div className="relative flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl border border-gold/30 bg-gold/10 grid place-items-center text-2xl shrink-0">
            {mat.emoji}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80">
              {mat.nome}
            </p>
            <h1 className="font-display font-semibold text-foreground leading-[1.15] mt-1 text-[clamp(1.15rem,4.8vw,1.875rem)] max-w-[24ch] break-words">
              {data.livro.titulo}
            </h1>
            <p className="text-[12px] text-muted-foreground mt-1.5 inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" /> {capitulos.length} aulas
            </p>
          </div>
        </div>
      </header>

      <section className="px-4 md:px-8 mt-5 max-w-3xl mx-auto">
        {capitulos.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            Nenhuma aula disponível.
          </p>
        ) : (
          <ol className="relative ml-5 space-y-4 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-gold/60 before:via-gold/30 before:to-transparent">
            {capitulos.map((c) => (
              <li key={c.id} className="relative pl-7">
                <span className="absolute -left-4 top-4 h-8 w-8 rounded-full bg-gradient-toga border border-gold/50 grid place-items-center text-[11px] font-display font-bold text-gold shadow-[0_4px_14px_-2px_oklch(0.78_0.13_80/0.45)] ring-4 ring-background z-10">
                  {c.ordem}
                </span>
                <Link
                  to="/aulas/$materia/$livroId/$ordem"
                  params={{ materia, livroId, ordem: String(c.ordem) }}
                  className="group block rounded-xl border border-border bg-card hover:border-gold/50 hover:-translate-y-0.5 transition-all p-4 shadow-sm shadow-black/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-gold/80 font-semibold">
                        Aula {c.ordem}
                      </p>
                      <p className="font-display text-[15px] md:text-base leading-snug mt-1 break-words text-foreground line-clamp-2">
                        {normalizarTitulo(c.titulo)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        Ler → Flashcards → Questões
                      </p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-gold/10 border border-gold/30 grid place-items-center shrink-0 group-hover:bg-gold transition">
                      <ChevronRight className="h-4 w-4 text-gold group-hover:text-gold-foreground" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
