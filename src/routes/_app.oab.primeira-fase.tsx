import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft, ArrowRight, Flame, Target, BookOpen, Clock,
  Play, Layers, FileText, Notebook, RefreshCw, ChevronRight,
  Minus, Plus, Calendar, Sparkles, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MATERIAS_OAB_46 } from "@/data/oab-materias-46";
import { touchStreak } from "@/lib/streak";
import { fraseDoDia } from "@/lib/motivacao";
import {
  DURACOES, type Duracao, readPlanoConfig, savePlanoConfig,
  gerarPlano, proximaSessao,
} from "@/lib/plano-estudo";
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
  // ---- Streak (client only) ----
  const [streakDias, setStreakDias] = useState(0);
  const [historico, setHistorico] = useState<boolean[]>(Array(14).fill(false));
  const [frase, setFrase] = useState<string>("");

  useEffect(() => {
    const { state, historico } = touchStreak();
    setStreakDias(state.dias);
    setHistorico(historico);
    setFrase(fraseDoDia());
  }, []);

  // ---- Stats Supabase ----
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

      <div className="px-4 md:px-8 mt-6 md:mt-8 space-y-8">
        <PlanoCard />
        <TrilhaTimeline />
        <ProgressoTabs historico={historico} stats={stats} />
      </div>
    </div>
  );
}

// ==================== HERO ====================
function StatsHero({
  streakDias, acertoPct, editalPct, horasSemana, frase,
}: { streakDias: number; acertoPct: number; editalPct: number; horasSemana: number; frase: string }) {
  return (
    <header className="relative overflow-hidden px-4 pt-5 pb-7 md:px-8 md:pt-7 md:pb-9 bg-gradient-toga text-primary-foreground">
      <div className="absolute -top-20 -right-12 h-56 w-56 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-6 h-44 w-44 rounded-full bg-primary/40 blur-3xl pointer-events-none" />

      <Link to="/" className="relative inline-flex items-center gap-1.5 text-[12px] text-primary-foreground/80 hover:text-primary-foreground mb-3">
        <ArrowLeft className="h-3.5 w-3.5" /> Início
      </Link>

      <div className="relative">
        <p className="text-[10px] uppercase tracking-[0.24em] text-gold/85 font-semibold mb-2">
          Hub de estudo
        </p>
        <h1 className="font-display font-semibold text-[28px] md:text-4xl leading-[1.05] tracking-tight">
          1ª Fase OAB
        </h1>
        <p className="mt-2 text-[13px] md:text-[15px] text-primary-foreground/80 max-w-xl italic">
          {frase || "\u00a0"}
        </p>
      </div>

      <div className="relative mt-5 grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
        <StatPill icon={Flame} label="Dias seguidos" value={`${streakDias}`} accent />
        <StatPill icon={Target} label="Acerto" value={`${acertoPct}%`} />
        <StatPill icon={BookOpen} label="Edital" value={`${editalPct}%`} />
        <StatPill icon={Clock} label="Esta semana" value={`${horasSemana}h`} />
      </div>
    </header>
  );
}

function StatPill({ icon: Icon, label, value, accent = false }:
  { icon: typeof Flame; label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn(
      "rounded-xl border px-3 py-2.5 backdrop-blur-sm",
      accent ? "bg-gold/15 border-gold/40" : "bg-primary-foreground/8 border-primary-foreground/15",
    )}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-primary-foreground/70">
        <Icon className={cn("h-3 w-3", accent && "text-gold")} />
        {label}
      </div>
      <p className={cn(
        "mt-1 font-display font-semibold text-xl md:text-2xl leading-none tabular-nums",
        accent && "text-gold",
      )}>
        {value}
      </p>
    </div>
  );
}

// ==================== PLANO ====================
function PlanoCard() {
  const [dias, setDias] = useState<Duracao>(30);
  const [horas, setHoras] = useState<number>(2);

  useEffect(() => {
    const cfg = readPlanoConfig();
    setDias(cfg.dias);
    setHoras(cfg.horasPorDia);
  }, []);

  useEffect(() => {
    savePlanoConfig({ dias, horasPorDia: horas });
  }, [dias, horas]);

  const sessao = useMemo(() => proximaSessao({ dias, horasPorDia: horas }), [dias, horas]);
  const totalSessoes = useMemo(() => gerarPlano({ dias, horasPorDia: horas }).length, [dias, horas]);

  return (
    <section>
      <SectionTitle icon={Calendar} eyebrow="Personalizado para você" title="Meu plano de estudo" />
      <div className="rounded-2xl border border-gold/15 bg-card overflow-hidden shadow-md shadow-black/20">
        <div className="p-4 md:p-5 space-y-4">
          {/* Duração */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground mb-2">
              Quero estar pronto em
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DURACOES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDias(d)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors tabular-nums",
                    dias === d
                      ? "bg-gold text-gold-foreground border-gold shadow-sm"
                      : "bg-transparent border-border text-foreground hover:border-gold/40",
                  )}
                >
                  {d === 365 ? "1 ano" : `${d} dias`}
                </button>
              ))}
            </div>
          </div>

          {/* Horas */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
                Horas por dia
              </p>
              <p className="font-display font-semibold text-2xl tabular-nums mt-0.5">
                {horas}h
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setHoras((h) => Math.max(0.5, +(h - 0.5).toFixed(1)))}
                className="h-9 w-9 rounded-full border border-border grid place-items-center hover:border-gold/40 active:scale-95"
                aria-label="Diminuir"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setHoras((h) => Math.min(10, +(h + 0.5).toFixed(1)))}
                className="h-9 w-9 rounded-full border border-border grid place-items-center hover:border-gold/40 active:scale-95"
                aria-label="Aumentar"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Próxima sessão */}
        {sessao && (
          <div className="border-t border-border bg-muted/30 p-4 md:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-gold mb-1">
                Próxima sessão · hoje
              </p>
              <p className="font-semibold text-[14px] md:text-[15px] truncate">
                {sessao.materia.nome}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {sessao.tipo === "aula" ? "Aula" : sessao.tipo === "questoes" ? "Questões" : "Revisão"}
                {" · "}{sessao.minutos} min · {totalSessoes} sessões no plano
              </p>
            </div>
            <Link
              to="/oab/o-que-estudar"
              className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-full bg-gold text-gold-foreground text-[12px] font-semibold hover:bg-gold/90 transition"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Começar
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

// ==================== TRILHA ====================
type TrilhaItem = {
  icon: typeof Play;
  label: string;
  desc: string;
  to: string;
  params?: Record<string, string>;
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
                  <item.icon className="h-4.5 w-4.5 text-gold" strokeWidth={2} />
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

// ==================== PROGRESSO ====================
function ProgressoTabs({ historico, stats }: {
  historico: boolean[];
  stats?: Awaited<ReturnType<typeof getStatsPrimeiraFase>>;
}) {
  const [tab, setTab] = useState<"materias" | "geral">("materias");

  const porMateria = useMemo(() => {
    const map = new Map<string, { acerto: number; total: number }>();
    for (const m of stats?.porMateria ?? []) {
      map.set(m.materia, { acerto: m.acerto, total: m.total });
    }
    return MATERIAS_OAB_46.map((m) => {
      const v = map.get(m.nome) ?? map.get(m.id) ?? { acerto: 0, total: 0 };
      const pct = v.total > 0 ? Math.round((v.acerto / v.total) * 100) : 0;
      return { id: m.id, nome: m.nome, pct, total: v.total };
    });
  }, [stats]);

  return (
    <section>
      <SectionTitle icon={Sparkles} eyebrow="Acompanhe sua evolução" title="Meu progresso" />

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex border-b border-border">
          <TabBtn active={tab === "materias"} onClick={() => setTab("materias")} label="Por matéria" />
          <TabBtn active={tab === "geral"} onClick={() => setTab("geral")} label="Geral" />
        </div>

        {tab === "materias" && (
          <div className="p-4 md:p-5 space-y-2.5">
            {porMateria.map((m) => (
              <div key={m.id}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-[12px] font-medium truncate">{m.nome}</p>
                  <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                    {m.pct}% · {m.total}q
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gold to-amber-400 transition-all"
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "geral" && (
          <div className="p-4 md:p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground mb-3">
              Últimos 14 dias
            </p>
            <div className="flex items-end gap-1">
              {historico.map((ativo, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className={cn(
                    "w-full rounded-sm transition-colors",
                    ativo ? "bg-gold h-8" : "bg-muted h-3",
                  )} />
                  <span className="text-[9px] text-muted-foreground">{14 - i}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Tentativas" value={stats?.tentativas ?? 0} />
              <MiniStat label="Acertos" value={stats?.totalAcertos ?? 0} />
              <MiniStat label="Questões" value={stats?.totalQuestoesRespondidas ?? 0} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/30 border border-border py-3">
      <p className="font-display font-semibold text-xl tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 py-2.5 text-[12px] font-semibold transition-colors",
        active ? "text-gold border-b-2 border-gold -mb-px" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
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
        <h2 className="font-display font-semibold text-[19px] md:text-[22px] leading-[1.1] tracking-tight truncate">{title}</h2>
        <p className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5 truncate">{eyebrow}</p>
      </div>
    </div>
  );
}
