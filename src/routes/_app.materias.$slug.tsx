import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getMateria } from "@/data/materias";
import { ArrowLeft, BookOpen, FileText, Layers, ClipboardList, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/materias/$slug")({
  loader: ({ params }) => {
    const materia = getMateria(params.slug);
    if (!materia) throw notFound();
    return { materia };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.materia.nome} — OAB na Risca` },
      { name: "description", content: loaderData.materia.descricao },
    ] : [],
  }),
  component: MateriaPage,
  notFoundComponent: () => (
    <div className="px-4 py-16 text-center">
      <p className="font-display text-2xl">Matéria não encontrada</p>
      <Link to="/materias" className="text-primary hover:underline mt-2 inline-block">Ver todas as matérias</Link>
    </div>
  ),
});

const acoes = [
  { icon: BookOpen, label: "Aulas", desc: "Conteúdo interativo", to: "/aulas" as const },
  { icon: FileText, label: "Resumos", desc: "Direto ao ponto", to: "/resumos" as const },
  { icon: Layers, label: "Flashcards", desc: "Memorize rápido", to: "/flashcards" as const },
  { icon: ClipboardList, label: "Questões", desc: "Banco FGV", to: "/questoes" as const },
];

function MateriaPage() {
  const { materia } = Route.useLoaderData();
  return (
    <div className="pb-16">
      <div className={`bg-gradient-to-br ${materia.cor} text-primary-foreground px-4 md:px-10 py-10 md:py-14`}>
        <div className="max-w-6xl">
          <Link to="/materias" className="inline-flex items-center gap-1.5 text-xs text-primary-foreground/80 hover:text-primary-foreground mb-4">
            <ArrowLeft className="h-3.5 w-3.5" /> Todas as matérias
          </Link>
          <div className="flex items-start gap-4">
            <div className="text-6xl">{materia.emoji}</div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-75 font-semibold mb-1">{materia.area} · ~{materia.peso} questões</p>
              <h1 className="font-display text-4xl md:text-5xl leading-tight text-balance">{materia.nome}</h1>
              <p className="mt-3 text-primary-foreground/85 max-w-2xl">{materia.descricao}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl px-4 md:px-10 py-8 grid md:grid-cols-2 gap-3">
        {acoes.map((a) => (
          <Link key={a.label} to={a.to} className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="h-12 w-12 rounded-lg bg-accent grid place-items-center text-accent-foreground">
              <a.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-display text-xl leading-tight">{a.label}</p>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="max-w-6xl px-4 md:px-10">
        <h2 className="font-display text-2xl mb-4">Tópicos da matéria</h2>
        <ul className="grid md:grid-cols-2 gap-2">
          {materia.topicos.map((t, i) => (
            <li key={t} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
              <span className="h-6 w-6 shrink-0 rounded-full bg-gold/20 text-primary text-xs font-bold grid place-items-center">{i + 1}</span>
              <span className="text-sm">{t}</span>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground/30 ml-auto shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
