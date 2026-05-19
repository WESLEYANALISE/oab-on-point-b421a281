import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Clock, ChevronRight } from "lucide-react";
import { getMateriaAula } from "@/data/aulas-oab";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/aulas/$materia")({
  loader: ({ params }) => {
    const materia = getMateriaAula(params.materia);
    if (!materia) throw notFound();
    return { materia };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.materia.nome ?? "Aula"} — OAB na Risca` },
      { name: "description", content: loaderData?.materia.descricao ?? "" },
    ],
  }),
  component: MateriaAulaPage,
  notFoundComponent: () => <div className="p-8">Matéria não encontrada.</div>,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
});

const NIVEL_COR: Record<string, string> = {
  iniciante: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  intermediario: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  avancado: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};
const NIVEL_LABEL: Record<string, string> = {
  iniciante: "INICIANTE",
  intermediario: "INTERMEDIÁRIO",
  avancado: "AVANÇADO",
};

function MateriaAulaPage() {
  const { materia } = Route.useLoaderData();
  const totalResumos = materia.modulos.reduce((s, m) => s + m.resumos, 0);
  const totalHoras = materia.modulos.reduce((s, m) => s + m.horas, 0);

  return (
    <div className="pb-16">
      <header className={cn("relative px-4 md:px-8 pt-5 pb-6 bg-gradient-to-br text-primary-foreground", materia.cor)}>
        <Link to="/aulas" className="inline-flex items-center gap-1.5 text-[12px] text-white/85 hover:text-white mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl bg-white/15 grid place-items-center text-2xl shrink-0">{materia.emoji}</div>
          <div className="min-w-0">
            <h1 className="font-display font-semibold text-2xl md:text-3xl tracking-tight">{materia.nome}</h1>
            <p className="text-[13px] text-white/85 mt-1 max-w-xl">{materia.descricao}</p>
          </div>
        </div>
        {materia.modulos.length > 0 && (
          <div className="mt-4 flex gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
              <BookOpen className="h-3.5 w-3.5" /> {totalResumos} resumos
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
              <Clock className="h-3.5 w-3.5" /> {totalHoras}h totais
            </span>
          </div>
        )}
      </header>

      <section className="px-4 md:px-8 mt-5">
        {materia.modulos.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground text-sm">
            Trilha em preparação para esta matéria. Em breve.
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between mb-3">
              <h2 className="font-display font-semibold text-lg">Módulos da trilha</h2>
              <span className="text-[11px] text-muted-foreground">{materia.modulos.length} módulos</span>
            </div>
            <ul className="space-y-2.5">
              {materia.modulos.map((mod, i) => (
                <li key={mod.slug}>
                  <Link
                    to="/aulas/$materia/$modulo"
                    params={{ materia: materia.materiaId, modulo: mod.slug }}
                    className={cn("group relative block overflow-hidden rounded-2xl border border-border bg-gradient-to-br p-3.5 flex items-center gap-3 hover:-translate-y-0.5 hover:border-gold/40 transition-all shadow-md shadow-black/20", materia.cor)}
                  >
                    <div className="shrink-0 w-14 text-center">
                      <p className="text-[9px] uppercase tracking-[0.18em] text-white/80 font-semibold">Módulo</p>
                      <p className="font-display font-bold text-2xl text-white leading-none tabular-nums">{i + 1}</p>
                    </div>
                    <div className="min-w-0 flex-1 bg-black/15 rounded-lg p-2.5">
                      <span className={cn("inline-block text-[9px] uppercase tracking-wider font-bold rounded-full border px-2 py-0.5 mb-1.5", NIVEL_COR[mod.nivel])}>
                        {NIVEL_LABEL[mod.nivel]}
                      </span>
                      <h3 className="font-display font-semibold text-[14px] md:text-[15px] text-white leading-tight">{mod.titulo}</h3>
                      <p className="text-[10.5px] text-white/75 mt-1 flex items-center gap-2.5">
                        <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3" /> {mod.resumos} resumos</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {mod.horas}h</span>
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/80 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
