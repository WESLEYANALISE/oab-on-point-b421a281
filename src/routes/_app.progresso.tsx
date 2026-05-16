import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, Flame, Target, BookOpen, ClipboardList, Layers, Award, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/progresso")({
  head: () => ({
    meta: [
      { title: "Meu Progresso · OAB na Risca" },
      { name: "description", content: "Acompanhe seu desempenho nos estudos para a OAB: aulas concluídas, questões acertadas, simulados e flashcards revisados." },
    ],
  }),
  component: ProgressoPage,
});

const METRICS = [
  { key: "aulas", label: "Aulas concluídas", value: "18", total: "/ 124", icon: BookOpen, color: "text-primary" },
  { key: "questoes", label: "Questões respondidas", value: "342", total: "", icon: ClipboardList, color: "text-gold" },
  { key: "acerto", label: "Taxa de acerto", value: "71%", total: "", icon: Target, color: "text-primary" },
  { key: "flash", label: "Flashcards revisados", value: "215", total: "", icon: Layers, color: "text-gold" },
];

const MATERIAS_PROGRESSO = [
  { nome: "Ética Profissional", pct: 62, cor: "bg-gradient-toga" },
  { nome: "Direito Constitucional", pct: 48, cor: "bg-gradient-toga" },
  { nome: "Direito Civil", pct: 35, cor: "bg-gradient-gold" },
  { nome: "Direito Penal", pct: 28, cor: "bg-gradient-gold" },
  { nome: "Processo Civil", pct: 22, cor: "bg-gradient-toga" },
  { nome: "Direito do Trabalho", pct: 18, cor: "bg-gradient-toga" },
  { nome: "Direito Tributário", pct: 12, cor: "bg-gradient-gold" },
  { nome: "Direito Administrativo", pct: 8, cor: "bg-gradient-toga" },
];

const CONQUISTAS = [
  { titulo: "Primeira semana completa", desc: "7 dias estudando seguidos", feito: true },
  { titulo: "100 questões respondidas", desc: "Banco FGV em foco", feito: true },
  { titulo: "Primeiro simulado", desc: "80 questões em 5h", feito: false },
  { titulo: "Maratona OAB", desc: "30 dias consecutivos", feito: false },
];

function ProgressoPage() {
  return (
    <div className="space-y-8 md:space-y-12 pb-10">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-toga text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }} />
        <div className="relative px-4 md:px-10 py-6 md:py-12 max-w-6xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-[10px] uppercase tracking-[0.16em] font-semibold mb-4">
            <TrendingUp className="h-3 w-3" /> Meu progresso
          </div>
          <h1 className="font-display text-3xl md:text-5xl leading-tight">Você está <span className="text-gold">na risca.</span></h1>
          <p className="mt-2 md:mt-3 text-primary-foreground/80 text-sm md:text-base max-w-xl">
            Acompanhe sua evolução matéria por matéria e mantenha o ritmo até o dia do exame.
          </p>
          <div className="mt-5 flex items-center gap-2 px-3 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/15 w-fit">
            <Flame className="h-4 w-4 text-gold" />
            <span className="text-sm font-semibold">12 dias consecutivos</span>
            <span className="text-xs text-primary-foreground/70">· streak ativo</span>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="px-4 md:px-10 max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {METRICS.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.key} className="rounded-xl border border-border bg-card p-4">
                <Icon className={`h-5 w-5 ${m.color}`} />
                <p className="font-display text-3xl mt-3 leading-none">{m.value}<span className="text-base text-muted-foreground ml-1">{m.total}</span></p>
                <p className="text-[11px] text-muted-foreground mt-1.5">{m.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Por matéria */}
      <section className="px-4 md:px-10 max-w-6xl">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Por matéria</p>
            <h2 className="font-display text-2xl md:text-3xl mt-1">Evolução dos estudos</h2>
          </div>
          <Link to="/materias" className="text-sm text-primary inline-flex items-center gap-1 hover:gap-2 transition-all">
            Ver matérias <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {MATERIAS_PROGRESSO.map((m) => (
            <div key={m.nome} className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="font-medium text-sm truncate">{m.nome}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{m.pct}%</p>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${m.cor}`} style={{ width: `${m.pct}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Conquistas */}
      <section className="px-4 md:px-10 max-w-6xl">
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Conquistas</p>
          <h2 className="font-display text-2xl md:text-3xl mt-1">Marcos da sua jornada</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CONQUISTAS.map((c) => (
            <div key={c.titulo} className={`rounded-xl border p-4 flex items-start gap-3 ${c.feito ? "border-gold/30 bg-gold/5" : "border-border bg-card opacity-70"}`}>
              <div className={`h-10 w-10 rounded-full grid place-items-center shrink-0 ${c.feito ? "bg-gradient-gold text-gold-foreground" : "bg-muted text-muted-foreground"}`}>
                {c.feito ? <CheckCircle2 className="h-5 w-5" /> : <Award className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-display text-lg leading-tight">{c.titulo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
