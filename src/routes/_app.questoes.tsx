import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, ArrowRight, Flame, Target, Trophy } from "lucide-react";

export const Route = createFileRoute("/_app/questoes")({
  head: () => ({
    meta: [
      { title: "Questões OAB — Pratique todo dia | OAB na Risca" },
      { name: "description", content: "Pratique questões da OAB todos os dias. Crie o hábito e acelere sua aprovação." },
    ],
  }),
  component: QuestoesPage,
});

function QuestoesPage() {
  return (
    <div className="px-4 md:px-10 py-6 md:py-10 max-w-3xl">
      <header className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-gold font-semibold mb-2">Prática diária</p>
        <h1 className="font-display text-3xl md:text-4xl leading-tight">Questões</h1>
        <p className="text-muted-foreground mt-2">
          Crie o hábito: responda algumas questões todos os dias e veja sua evolução.
        </p>
      </header>

      <Link
        to="/simulados"
        className="group block rounded-2xl border border-gold/25 bg-gradient-toga text-primary-foreground p-5 md:p-6 shadow-lg shadow-black/30 hover:-translate-y-0.5 transition-transform"
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gold/20 border border-gold/35 grid place-items-center">
            <Flame className="h-6 w-6 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-lg md:text-xl leading-tight">Praticar hoje</p>
            <p className="text-[12px] md:text-sm text-primary-foreground/70 mt-0.5">Comece sua sequência diária agora</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-gold grid place-items-center shrink-0 group-hover:translate-x-0.5 transition-transform">
            <ArrowRight className="h-4 w-4 text-gold-foreground" />
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link to="/provas" className="rounded-2xl border border-border bg-card p-4 hover:border-gold/35 transition-colors">
          <Target className="h-5 w-5 text-gold mb-2" />
          <p className="font-display font-semibold text-sm">Provas anteriores</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Exames OAB comentados</p>
        </Link>
        <Link to="/simulados" className="rounded-2xl border border-border bg-card p-4 hover:border-gold/35 transition-colors">
          <Trophy className="h-5 w-5 text-gold mb-2" />
          <p className="font-display font-semibold text-sm">Simulados</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">80 questões, 5h</p>
        </Link>
      </div>

      <p className="mt-8 text-xs text-muted-foreground flex items-center gap-2">
        <ClipboardList className="h-3.5 w-3.5" />
        Em breve: trilha diária personalizada com SRS.
      </p>
    </div>
  );
}
