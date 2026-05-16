import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Loader2, ChevronRight } from "lucide-react";
import { obterLivroResumo } from "@/lib/resumos.functions";

export const Route = createFileRoute("/_app/resumos/$livroId")({
  component: ResumoTimeline,
});

function ResumoTimeline() {
  const { livroId } = Route.useParams();
  const fn = useServerFn(obterLivroResumo);
  const { data, isPending } = useQuery({
    queryKey: ["resumo-livro", livroId],
    queryFn: () => fn({ data: { resumo_livro_id: livroId } }),
    staleTime: 60_000,
  });

  if (isPending || !data) {
    return (
      <div className="px-4 py-12 text-center text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando resumo…
        </span>
      </div>
    );
  }

  const capitulos = data.capitulos ?? [];

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 max-w-3xl mx-auto">
      <Link
        to="/resumos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Todos os resumos
      </Link>

      <header className="mb-6 flex gap-4 items-start">
        {data.livro.capa && (
          <img
            src={data.livro.capa}
            alt=""
            className="w-16 md:w-20 aspect-[3/4] object-cover rounded-md flex-shrink-0"
          />
        )}
        <div className="min-w-0">
          <h1 className="font-display text-xl md:text-3xl leading-tight">{data.livro.titulo}</h1>
          {data.livro.autor && <p className="text-sm text-muted-foreground">{data.livro.autor}</p>}
          <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3" /> {capitulos.length} capítulos
          </p>
        </div>
      </header>

      {!capitulos.length ? (
        <p className="text-muted-foreground text-sm py-8 text-center">Nenhum capítulo disponível.</p>
      ) : (
        <ol className="relative border-l-2 border-border ml-3 space-y-3">
          {capitulos.map((c) => (
            <li key={c.id} className="relative pl-6">
              <span className="absolute -left-[11px] top-3 h-5 w-5 rounded-full bg-primary border-4 border-background grid place-items-center text-[10px] font-bold text-primary-foreground">
                {c.ordem}
              </span>
              <Link
                to="/resumos/capitulo/$livroId/$ordem"
                params={{ livroId, ordem: String(c.ordem) }}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Capítulo {c.ordem}
                    </p>
                    <p className="font-display text-base md:text-lg leading-snug mt-0.5 break-words">
                      {c.titulo}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition shrink-0 mt-1" />
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
