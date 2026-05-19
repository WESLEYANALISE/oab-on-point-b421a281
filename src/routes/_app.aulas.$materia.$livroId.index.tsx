import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, ChevronRight } from "lucide-react";
import { resumoLivroQueryOptions } from "@/lib/resumos-queries";
import { normalizarTitulo } from "@/lib/titulo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/aulas/$materia/$livroId/")({
  component: TrilhaCapitulos,
});

const trilhaRoute = getRouteApi("/_app/aulas/$materia/$livroId");

function TrilhaCapitulos() {
  const { materia, livroId } = Route.useParams();
  const { materia: mat } = trilhaRoute.useLoaderData();
  const { data } = useSuspenseQuery(resumoLivroQueryOptions(livroId));
  const capitulos = data.capitulos ?? [];

  return (
    <div className="pb-16">
      <header
        className={cn(
          "relative px-4 md:px-8 pt-5 pb-6 bg-gradient-to-br text-primary-foreground",
          mat.cor,
        )}
      >
        <Link
          to="/aulas/$materia"
          params={{ materia }}
          className="inline-flex items-center gap-1.5 text-[12px] text-white/85 hover:text-white mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl bg-white/15 grid place-items-center text-2xl shrink-0">
            {mat.emoji}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-white/70">
              {mat.nome}
            </p>
            <h1 className="font-display font-semibold text-2xl md:text-3xl tracking-tight leading-tight">
              {data.livro.titulo}
            </h1>
            <p className="text-[12px] text-white/85 mt-1 inline-flex items-center gap-1">
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
                  className="group block rounded-xl border border-gold/15 bg-gradient-to-br from-[oklch(0.28_0.07_18)] to-[oklch(0.19_0.04_18)] p-4 hover:border-gold/40 hover:-translate-y-0.5 transition-all shadow-md shadow-black/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-gold/80 font-semibold">
                        Aula {c.ordem}
                      </p>
                      <p className="font-display text-[15px] md:text-base leading-snug mt-1 break-words text-primary-foreground line-clamp-2">
                        {normalizarTitulo(c.titulo)}
                      </p>
                      <p className="text-[10px] text-white/60 mt-1.5">
                        Ler → Flashcards → Questões
                      </p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-gold/15 border border-gold/30 grid place-items-center shrink-0 group-hover:bg-gold transition">
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