import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, PlayCircle, ArrowRight } from "lucide-react";
import { listarCursos } from "@/lib/aulas-interativas.functions";

export const Route = createFileRoute("/_app/aulas-interativas/")({
  head: () => ({
    meta: [
      { title: "Aulas Interativas — OAB na Risca" },
      {
        name: "description",
        content: "Aulas em slides interativos com quizzes e progresso. Aprenda Direito de forma dinâmica.",
      },
    ],
  }),
  component: AulasInterativasIndex,
});

function AulasInterativasIndex() {
  const q = useQuery({
    queryKey: ["aulas-interativas", "cursos"],
    queryFn: () => listarCursos(),
    staleTime: 60_000,
  });

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-gold inline-flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" /> Aulas Interativas
        </p>
        <h1 className="font-display text-3xl md:text-4xl mt-2">Aprenda em slides</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Cursos em formato de slides interativos: conceitos curtos, exemplos, esquemas e quizzes
          para fixar o conteúdo.
        </p>
      </header>

      {q.isLoading && <p className="text-sm text-muted-foreground">Carregando cursos…</p>}

      {q.data && q.data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <PlayCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-display text-lg">Em breve</p>
          <p className="text-sm text-muted-foreground mt-1">
            Estamos preparando os primeiros cursos. Volte logo!
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {q.data?.map((c) => (
          <Link
            key={c.id}
            to="/aulas-interativas/$cursoSlug"
            params={{ cursoSlug: c.slug }}
            className="group rounded-2xl overflow-hidden border border-border bg-card hover:-translate-y-0.5 transition-transform"
          >
            <div className="aspect-video bg-gradient-toga relative overflow-hidden">
              {c.capa_url ? (
                <img src={c.capa_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center">
                  <PlayCircle className="h-12 w-12 text-gold/60" />
                </div>
              )}
            </div>
            <div className="p-4">
              {c.materia && (
                <p className="text-[10px] uppercase tracking-widest text-gold mb-1">{c.materia}</p>
              )}
              <h2 className="font-display text-lg leading-tight">{c.titulo}</h2>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.descricao}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-gold">
                Começar <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
