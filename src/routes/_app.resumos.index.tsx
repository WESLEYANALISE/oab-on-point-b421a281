import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { FileText, BookOpen, Loader2 } from "lucide-react";
import { listarLivrosComResumo } from "@/lib/resumos.functions";

export const Route = createFileRoute("/_app/resumos/")({
  head: () => ({
    meta: [
      { title: "Resumos — OAB na Risca" },
      { name: "description", content: "Resumos didáticos dos livros da biblioteca, capítulo por capítulo." },
    ],
  }),
  component: ResumosIndex,
});

const SLUG_LABEL: Record<string, string> = {
  estudos: "Estudos",
  classicos: "Clássicos",
  oratoria: "Oratória",
  lideranca: "Liderança",
  politica: "Política",
  "fora-da-toga": "Fora da Toga",
};

function ResumosIndex() {
  const fn = useServerFn(listarLivrosComResumo);
  const { data, isLoading } = useQuery({
    queryKey: ["resumos-publico"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });

  const livros = data ?? [];

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground inline-flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" /> Biblioteca
        </p>
        <h1 className="font-display text-3xl md:text-4xl mt-1">Resumos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Resumos didáticos dos livros, organizados capítulo por capítulo como uma aula explicada.
        </p>
      </header>

      {isLoading && (
        <div className="py-12 text-center text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      )}

      {!isLoading && !livros.length && (
        <div className="py-16 text-center border border-dashed rounded-xl text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-60" />
          <p>Nenhum resumo disponível ainda.</p>
          <p className="text-xs mt-1">Os resumos aparecem aqui assim que forem gerados.</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {livros.map((l) => (
          <Link
            key={l.id}
            to="/resumos/$livroId"
            params={{ livroId: l.id }}
            className="group rounded-xl overflow-hidden border border-border bg-card hover:bg-accent transition-colors"
          >
            <div className="aspect-[3/4] bg-muted relative overflow-hidden">
              {l.capa ? (
                <img src={l.capa} alt={l.titulo} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              ) : (
                <div className="w-full h-full grid place-items-center text-muted-foreground">
                  <BookOpen className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {SLUG_LABEL[l.biblioteca_slug] ?? l.biblioteca_slug}
              </p>
              <p className="text-sm font-medium leading-snug line-clamp-2 mt-0.5">{l.titulo}</p>
              {l.autor && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{l.autor}</p>}
              <p className="text-[11px] text-muted-foreground mt-2">
                {l.capitulos_gerados}/{l.total_capitulos} capítulos
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
