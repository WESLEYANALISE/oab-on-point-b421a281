import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronRight, Loader2 } from "lucide-react";
import { getAreasDaMateria, getMateriaAula } from "@/data/aulas-oab";
import { listarLivrosPorMateria } from "@/lib/aulas.functions";

export const Route = createFileRoute("/_app/aulas/$materia/")({
  head: ({ params }) => {
    const m = getMateriaAula(params.materia);
    const titulo = m?.nome ?? "Aulas";
    return {
      meta: [
        { title: `${titulo} · Aulas OAB` },
        { name: "description", content: `Aulas de ${titulo} para o Exame da OAB com leitura, flashcards, questões e simulado.` },
        { property: "og:title", content: `${titulo} · Aulas OAB` },
      ],
    };
  },
  component: MateriaAulaPage,
});

function MateriaAulaPage() {
  const { materia: materiaParam } = Route.useParams();
  const materia = getMateriaAula(materiaParam);
  if (!materia) return <div className="p-8">Matéria não encontrada.</div>;
  const temArea = getAreasDaMateria(materia.materiaId).length > 0;
  const listar = useServerFn(listarLivrosPorMateria);
  const { data, isLoading, error } = useQuery({
    queryKey: ["aulas", "livros", materia.materiaId],
    queryFn: () => listar({ data: { materiaId: materia.materiaId } }),
    enabled: temArea,
  });
  const livros = data?.livros ?? [];

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
            {materia.emoji}
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-semibold text-foreground leading-[1.15] text-[clamp(1.15rem,4.8vw,1.875rem)]">
              {materia.nome}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1 max-w-xl">
              {materia.descricao}
            </p>
          </div>
        </div>
        {livros.length > 0 && (
          <div className="relative mt-4 flex gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 text-gold px-3 py-1.5">
              <BookOpen className="h-3.5 w-3.5" /> {livros.length} temas
            </span>
          </div>
        )}
      </header>


      <section className="px-4 md:px-8 mt-5">
        <div className="flex items-end justify-between mb-3">
          <h2 className="font-display font-semibold text-lg">Temas para estudar</h2>
          {livros.length > 0 && (
            <span className="text-[11px] text-muted-foreground">{livros.length} temas</span>
          )}
        </div>

        {!temArea ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground text-sm">
            Material em preparação para esta matéria. Em breve.
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando temas…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
            Erro ao carregar temas. Tente novamente.
          </div>
        ) : livros.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground text-sm">
            Nenhum tema disponível ainda nesta matéria.
          </div>
        ) : (
          <ul className="space-y-2">
            {livros.map((livro, i) => (
              <li key={livro.id}>
                <Link
                  to="/aulas/$materia/$livroId"
                  params={{ materia: materia.materiaId, livroId: livro.id }}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-gold/40 hover:bg-card/80 transition-all"
                >
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-muted text-muted-foreground grid place-items-center font-display font-semibold tabular-nums text-sm">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-[14px] leading-tight text-foreground line-clamp-2">
                      {livro.titulo}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> {livro.capitulos} {livro.capitulos === 1 ? "capítulo" : "capítulos"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}