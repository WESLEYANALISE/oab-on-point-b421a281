import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { getCursoCompleto, getProgressoCurso } from "@/lib/aulas-interativas.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/aulas-interativas/$cursoSlug/")({
  component: CursoPage,
});

function CursoPage() {
  const { cursoSlug } = Route.useParams();
  const { user } = useAuth();

  const cursoQ = useQuery({
    queryKey: ["aulas-interativas", "curso", cursoSlug],
    queryFn: () => getCursoCompleto({ data: { slug: cursoSlug } }),
    staleTime: 60_000,
  });

  const progressoQ = useQuery({
    queryKey: ["aulas-interativas", "progresso", cursoQ.data?.curso.id],
    queryFn: () => getProgressoCurso({ data: { cursoId: cursoQ.data!.curso.id } }),
    enabled: !!user && !!cursoQ.data?.curso.id,
  });

  if (cursoQ.isLoading) {
    return <p className="px-4 py-10 text-sm text-muted-foreground">Carregando curso…</p>;
  }
  if (!cursoQ.data) throw notFound();

  const { curso, modulos, aulas } = cursoQ.data;
  const progMap = new Map((progressoQ.data ?? []).map((p) => [p.aula_id, p]));
  const totalAulas = aulas.length;
  const concluidas = (progressoQ.data ?? []).filter((p) => p.concluida).length;
  const pct = totalAulas ? Math.round((concluidas / totalAulas) * 100) : 0;

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">

      <header className="mb-8">
        {curso.materia && (
          <p className="text-xs uppercase tracking-widest text-gold mb-2">{curso.materia}</p>
        )}
        <h1 className="font-display text-3xl md:text-4xl">{curso.titulo}</h1>
        {curso.descricao && (
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{curso.descricao}</p>
        )}
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" /> {modulos.length} módulos · {totalAulas} aulas
          </span>
          {user && (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-gold" /> {pct}% concluído
            </span>
          )}
        </div>
      </header>

      <div className="space-y-6">
        {modulos.map((m, mi) => {
          const aulasMod = aulas.filter((a) => a.modulo_id === m.id);
          return (
            <section key={m.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-muted/30">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Módulo {mi + 1}
                </p>
                <h2 className="font-display text-lg">{m.titulo}</h2>
              </div>
              <ul className="divide-y divide-border">
                {aulasMod.map((a, i) => {
                  const p = progMap.get(a.id);
                  return (
                    <li key={a.id}>
                      <Link
                        to="/aulas-interativas/$cursoSlug/$aulaSlug"
                        params={{ cursoSlug, aulaSlug: a.slug }}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-accent transition-colors"
                      >
                        <div className="h-9 w-9 rounded-full bg-gradient-toga grid place-items-center text-primary-foreground text-sm font-display shrink-0">
                          {p?.concluida ? <CheckCircle2 className="h-4 w-4 text-gold" /> : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-sm md:text-base truncate">{a.titulo}</p>
                          <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {a.duracao_min} min
                          </p>
                        </div>
                        <PlayCircle className="h-5 w-5 text-gold" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
