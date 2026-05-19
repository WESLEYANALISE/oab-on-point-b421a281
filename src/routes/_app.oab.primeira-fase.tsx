import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight, Flame, Target, BookOpen, Clock,
  Play, Layers, FileText, Notebook, RefreshCw, ChevronRight,
  Calendar, Sparkles, TrendingUp, CalendarDays, ClipboardList, GraduationCap,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EXAMES_OAB } from "@/data/oab-calendario";
import { MATERIAS_OAB_46 } from "@/data/oab-materias-46";
import { touchStreak } from "@/lib/streak";
import { fraseDoDia } from "@/lib/motivacao";
import { getStatsPrimeiraFase } from "@/lib/primeira-fase.functions";

export const Route = createFileRoute("/_app/oab/primeira-fase")({
  head: () => ({
    meta: [
      { title: "1ª Fase OAB · Hub de estudo — OAB na Risca" },
      { name: "description", content: "Plano de estudo personalizado, aulas, flashcards, questões e acompanhamento da 1ª fase do Exame de Ordem." },
    ],
  }),
  component: PrimeiraFasePage,
});

function PrimeiraFasePage() {
  const [streakDias, setStreakDias] = useState(0);
  const [frase, setFrase] = useState<string>("");

  useEffect(() => {
    const { state } = touchStreak();
    setStreakDias(state.dias);
    setFrase(fraseDoDia());
  }, []);

  const fetchStats = useServerFn(getStatsPrimeiraFase);
  const { data: stats } = useQuery({
    queryKey: ["pf-stats"],
    queryFn: () => fetchStats(),
    staleTime: 60_000,
  });
  const acertoPct = stats?.acertoPct ?? 0;
  const editalPct = stats ? Math.round((stats.materiasComPratica / MATERIAS_OAB_46.length) * 100) : 0;
  const horasSemana = stats ? Math.round(((stats.totalQuestoesRespondidas ?? 0) * 1.5) / 60) : 0;

  return (
    <div className="pb-16">
      <StatsHero
        streakDias={streakDias}
        acertoPct={acertoPct}
        editalPct={editalPct}
        horasSemana={horasSemana}
        frase={frase}
      />

      <div className="px-4 md:px-8 mt-6 md:mt-8 space-y-7">
        <CalendarioCarrossel />
        <AcoesPrincipais />
        <TrilhaTimeline />
        <FerramentasEstudo />
      </div>
    </div>
  );
}

// ==================== CALENDÁRIO CARROSSEL ====================
function CalendarioCarrossel() {
  const eventos = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const exame = EXAMES_OAB.find((e) => e.status === "em-andamento") ?? EXAMES_OAB[0];
    return exame.eventos.map((ev) => {
      let dias: number | null = null;
      if (ev.data && ev.data !== "previsto") {
        const d = new Date(ev.data + "T00:00:00");
        dias = Math.round((d.getTime() - hoje.getTime()) / 86400000);
      }
      return { ...ev, dias };
    });
  }, []);

  const proximaFase = eventos.find((e) => /1ª fase/i.test(e.titulo) && e.dias !== null && e.dias >= 0)
    ?? eventos.find((e) => e.status === "atual")
    ?? eventos.find((e) => e.status === "previsto");

  return (
    <section>
      <div className="flex items-end justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 md:h-9 md:w-9 rounded-xl bg-gold/15 border border-gold/25 grid place-items-center shrink-0">
            <CalendarClock className="h-4 w-4 text-gold" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold/85 font-semibold">Datas oficiais</p>
            <h2 className="font-display font-semibold text-[19px] md:text-[22px] leading-[1.1] tracking-tight truncate">
              Próximas etapas
            </h2>
          </div>
        </div>
        <Link to="/oab/calendario" className="text-[11px] md:text-xs font-medium text-gold hover:text-gold/80 inline-flex items-center gap-0.5 shrink-0">
          Ver tudo <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {proximaFase && (
        <div className="mb-3 rounded-xl border border-gold/25 bg-gradient-to-r from-gold/12 to-transparent px-3.5 py-2.5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gold/20 border border-gold/30 grid place-items-center shrink-0">
            <CalendarClock className="h-4 w-4 text-gold" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold/85 font-semibold">Próxima etapa</p>
            <p className="text-[13px] font-semibold leading-tight truncate">{proximaFase.titulo}</p>
          </div>
          <div className="text-right shrink-0">
            {proximaFase.dias !== null && proximaFase.dias >= 0 ? (
              <>
                <p className="font-display font-bold text-gold text-[20px] leading-none tabular-nums">{proximaFase.dias}</p>
                <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mt-0.5">
                  {proximaFase.dias === 1 ? "dia" : "dias"}
                </p>
              </>
            ) : (
              <p className="text-[11px] font-semibold text-gold">{proximaFase.rotulo}</p>
            )}
          </div>
        </div>
      )}

      <div className="-mx-4 md:mx-0 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2.5 px-4 md:px-0 snap-x snap-mandatory">
          {eventos.map((ev, i) => {
            const isPassado = ev.dias !== null && ev.dias < 0;
            const isAtual = ev.status === "atual";
            return (
              <div
                key={i}
                className={cn(
                  "snap-start shrink-0 w-[150px] rounded-xl border p-3 flex flex-col gap-1.5 transition-all",
                  isAtual
                    ? "border-gold/40 bg-gold/10"
                    : isPassado
                      ? "border-border bg-muted/30 opacity-60"
                      : "border-border bg-card hover:border-gold/30",
                )}
              >
                <p className={cn(
                  "text-[10px] uppercase tracking-[0.16em] font-semibold tabular-nums",
                  isAtual ? "text-gold" : "text-muted-foreground",
                )}>
                  {ev.rotulo}
                </p>
                <p className="text-[12px] font-semibold leading-snug line-clamp-2 min-h-[2.4em]">{ev.titulo}</p>
                <div className="mt-auto pt-1">
                  {ev.dias !== null ? (
                    ev.dias >= 0 ? (
                      <p className="text-[10.5px] text-muted-foreground">
                        em <span className="font-semibold text-foreground tabular-nums">{ev.dias}</span> {ev.dias === 1 ? "dia" : "dias"}
                      </p>
                    ) : (
                      <p className="text-[10.5px] text-muted-foreground">concluído</p>
                    )
                  ) : (
                    <p className="text-[10.5px] text-muted-foreground italic">data prevista</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ==================== FERRAMENTAS DE ESTUDO ====================
const FERRAMENTAS_PF = [
  { label: "O que estudar",  sub: "Guia por edital",   icon: BookOpen,      to: "/oab/o-que-estudar" as const },
  { label: "Calendário OAB", sub: "Datas oficiais",    icon: CalendarDays,  to: "/oab/calendario" as const },
  { label: "Cronograma",     sub: "Plano semanal",     icon: ClipboardList, to: "/oab/cronograma" as const },
];

function FerramentasEstudo() {
  return (
    <section>
      <SectionTitle icon={GraduationCap} eyebrow="Plano completo de aprovação" title="Ferramentas de estudo" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3">
        {FERRAMENTAS_PF.map(({ label, sub, icon: Icon, to }) => (
          <Link
            key={label}
            to={to}
            className="group relative overflow-hidden rounded-2xl border border-gold/12 bg-gradient-to-br from-[oklch(0.28_0.07_18)] to-[oklch(0.19_0.04_18)] p-3 min-h-[72px] flex items-start gap-2.5 hover:-translate-y-0.5 hover:border-gold/35 transition-all shadow-md shadow-black/30 tap-feedback"
          >
            <div className="h-9 w-9 rounded-xl bg-gold/15 border border-gold/25 grid place-items-center shrink-0">
              <Icon className="h-4 w-4 text-gold" strokeWidth={2} />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="font-display font-semibold text-[13px] md:text-[15px] leading-tight tracking-tight truncate">{label}</p>
              <p className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-1">{sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ==================== HERO COMPACTO ====================
function StatsHero({
  streakDias, acertoPct, editalPct, horasSemana, frase,
}: { streakDias: number; acertoPct: number; editalPct: number; horasSemana: number; frase: string }) {
  return (
    <header className="relative overflow-hidden px-4 pt-5 pb-6 md:px-8 md:pt-7 md:pb-7 bg-gradient-toga text-primary-foreground">
      <div className="absolute -top-20 -right-12 h-56 w-56 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-6 h-44 w-44 rounded-full bg-primary/40 blur-3xl pointer-events-none" />


      <div className="relative">
        <p className="text-[10px] uppercase tracking-[0.24em] text-gold/85 font-semibold mb-2">
          Hub de estudo
        </p>
        <h1 className="font-display font-semibold text-[26px] md:text-4xl leading-[1.05] tracking-tight">
          1ª Fase OAB
        </h1>
        <p className="mt-1.5 text-[12px] md:text-[14px] text-primary-foreground/75 max-w-xl italic line-clamp-2">
          {frase || "\u00a0"}
        </p>
      </div>

      {/* Linha única compacta de stats */}
      <div className="relative mt-4 grid grid-cols-4 gap-1.5 md:gap-2">
        <StatChip icon={Flame} label="Dias" value={`${streakDias}`} accent />
        <StatChip icon={Target} label="Acerto" value={`${acertoPct}%`} />
        <StatChip icon={BookOpen} label="Edital" value={`${editalPct}%`} />
        <StatChip icon={Clock} label="Semana" value={`${horasSemana}h`} />
      </div>
    </header>
  );
}

function StatChip({ icon: Icon, label, value, accent = false }:
  { icon: typeof Flame; label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn(
      "rounded-lg border px-2 py-1.5 backdrop-blur-sm min-w-0",
      accent ? "bg-gold/15 border-gold/40" : "bg-primary-foreground/8 border-primary-foreground/15",
    )}>
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] font-semibold text-primary-foreground/70">
        <Icon className={cn("h-[11px] w-[11px] shrink-0", accent && "text-gold")} />
        <span className="truncate">{label}</span>
      </div>
      <p className={cn(
        "mt-0.5 font-display font-semibold text-[15px] md:text-lg leading-none tabular-nums",
        accent && "text-gold",
      )}>
        {value}
      </p>
    </div>
  );
}

// ==================== AÇÕES PRINCIPAIS ====================
function AcoesPrincipais() {
  const acoes = [
    {
      to: "/plano-estudo" as const,
      icon: Calendar,
      title: "Meu plano",
      desc: "Meta e horas",
    },
    {
      to: "/oab/progresso" as const,
      icon: Sparkles,
      title: "Meu progresso",
      desc: "Acertos e histórico",
    },
  ];
  return (
    <section className="grid grid-cols-2 gap-2.5 md:gap-3">
      {acoes.map((a) => (
        <Link
          key={a.to}
          to={a.to}
          className="group relative overflow-hidden rounded-2xl border border-gold/20 bg-card p-3 md:p-4 shadow-md shadow-black/20 hover:-translate-y-0.5 hover:border-gold/40 transition-all tap-feedback"
        >
          <div className="absolute -top-10 -right-8 h-24 w-24 rounded-full bg-gold/10 blur-2xl pointer-events-none" />
          <div className="relative flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gold/15 border border-gold/30 grid place-items-center shrink-0">
              <a.icon className="h-[18px] w-[18px] text-gold" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-semibold text-[14px] md:text-[15px] leading-tight tracking-tight truncate">
                {a.title}
              </h3>
              <p className="text-[10.5px] md:text-[11px] text-muted-foreground mt-0.5 truncate">{a.desc}</p>
            </div>
          </div>
        </Link>
      ))}
    </section>
  );
}

// ==================== TRILHA ====================
type TrilhaItem = {
  icon: typeof Play;
  label: string;
  desc: string;
  to: string;
};

const TRILHA: TrilhaItem[] = [
  { icon: BookOpen, label: "O que estudar", desc: "Conteúdo do edital, matéria por matéria", to: "/oab/o-que-estudar" },
  { icon: Layers,   label: "Flashcards",     desc: "Revisão espaçada por matéria",          to: "/flashcards" },
  { icon: FileText, label: "Questões",       desc: "Banco completo de exames anteriores",    to: "/provas" },
  { icon: Notebook, label: "Caderno de erros", desc: "Revise tudo o que você errou",        to: "/oab/caderno-erros" },
  { icon: RefreshCw, label: "Reforço",       desc: "Matérias com menor aproveitamento",     to: "/oab/reforco" },
];

function TrilhaTimeline() {
  return (
    <section>
      <SectionTitle icon={TrendingUp} eyebrow="Trilha completa" title="Por onde estudar" />

      {/* Card principal: AULAS */}
      <Link
        to="/aulas"
        className="group relative block overflow-hidden rounded-2xl border border-gold/25 bg-gradient-toga text-primary-foreground p-5 md:p-6 shadow-lg shadow-black/40 hover:-translate-y-0.5 transition-transform"
      >
        <div className="absolute -top-12 -right-8 h-40 w-40 rounded-full bg-gold/25 blur-3xl pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-gold/20 border border-gold/40 grid place-items-center shrink-0">
            <Play className="h-6 w-6 md:h-7 md:w-7 text-gold fill-current" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold/90 font-semibold mb-1">
              Onde tudo começa
            </p>
            <h3 className="font-display font-semibold text-2xl md:text-3xl leading-tight tracking-tight">
              Aulas
            </h3>
            <p className="text-[13px] md:text-sm text-primary-foreground/80 mt-1 max-w-md">
              Videoaulas estruturadas por matéria do 46º exame, com material e exercícios.
            </p>
          </div>
          <div className="h-9 w-9 rounded-full bg-gold/70 border border-gold/50 grid place-items-center shrink-0 group-hover:translate-x-0.5 group-hover:bg-gold/90 transition-all">
            <ArrowRight className="h-4 w-4 text-gold-foreground" />
          </div>
        </div>
      </Link>

      {/* Timeline vertical com demais cards */}
      <div className="relative mt-6 pl-6 md:pl-8">
        <div aria-hidden className="absolute left-2.5 md:left-3.5 top-2 bottom-2 w-px bg-gradient-to-b from-gold/40 via-gold/20 to-transparent" />
        <ul className="space-y-3">
          {TRILHA.map((item) => (
            <li key={item.to} className="relative">
              <span aria-hidden className="absolute -left-[18px] md:-left-[22px] top-5 h-3 w-3 rounded-full bg-gold ring-4 ring-background shadow-sm" />
              <Link
                to={item.to as "/oab/o-que-estudar"}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 hover:border-gold/35 hover:-translate-y-0.5 transition-all shadow-sm"
              >
                <div className="h-10 w-10 rounded-xl bg-gold/12 border border-gold/25 grid place-items-center shrink-0">
                  <item.icon className="h-[18px] w-[18px] text-gold" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-[14px] md:text-[15px] leading-tight tracking-tight">{item.label}</p>
                  <p className="text-[11px] md:text-[12px] text-muted-foreground mt-0.5 line-clamp-1">{item.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SectionTitle({ icon: Icon, eyebrow, title }:
  { icon: typeof Sparkles; eyebrow: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3.5">
      <div className="h-8 w-8 md:h-9 md:w-9 rounded-xl bg-gold/15 border border-gold/25 grid place-items-center shrink-0">
        <Icon className="h-4 w-4 text-gold" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold/85 font-semibold">{eyebrow}</p>
        <h2 className="font-display font-semibold text-[19px] md:text-[22px] leading-[1.1] tracking-tight truncate">{title}</h2>
      </div>
    </div>
  );
}
