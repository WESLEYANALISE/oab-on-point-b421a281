import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Gavel, Search, Calendar, Sparkles, ArrowRight,
  Library, Trophy, HelpCircle, Video, Newspaper,
  Target, FileText, BookOpen, CalendarDays, ClipboardList, Layers, ScrollText,
  GraduationCap, Zap, Compass,
} from "lucide-react";
import { CountdownExame } from "@/components/shared/CountdownExame";
import { getNoticias } from "@/data/noticias";
import primeiraFaseCover from "@/assets/oab-primeira-fase-cover.jpg";
import segundaFaseCover from "@/assets/oab-segunda-fase-cover.jpg";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Área OAB — Exame da Ordem | OAB na Risca" },
      { name: "description", content: "Hub central de preparação para o Exame de Ordem: contagem regressiva, 1ª e 2ª fase, atalhos, notícias e ferramentas de estudo." },
      { property: "og:title", content: "Área OAB — OAB na Risca" },
      { property: "og:description", content: "Tudo para sua aprovação na OAB em um só lugar." },
    ],
  }),
  component: AreaOABPage,
});

const EXAM_DATE = new Date("2026-09-23T08:00:00-03:00");
function formatExamDate(d: Date) {
  const s = d.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
  // Capitalize first letter of each word for the "Domingo, 21 De Junho De 2026" look
  return s
    .replace(/(^|\s|,)([a-záéíóúãõâêô])/g, (_, b, c) => b + c.toUpperCase());
}

// ------- Atalhos -------
const ATALHOS = [
  { label: "Biblioteca", icon: Library,    to: "/biblioteca" as const },
  { label: "Simulados",  icon: Trophy,     to: "/simulados" as const },
  { label: "Questões",   icon: HelpCircle, to: "/questoes" as const },
  { label: "Videoaulas", icon: Video,      to: "/aulas" as const },
];

// ------- Ferramentas -------
const FERRAMENTAS = [
  { label: "1ª Fase",        sub: "Trilhas objetivas",   icon: Target,        to: "/oab/primeira-fase" as const },
  { label: "2ª Fase",        sub: "Peça e discursivas",  icon: FileText,      to: "/oab/segunda-fase" as const },
  { label: "O que estudar",  sub: "Guia por edital",     icon: BookOpen,      to: "/oab/o-que-estudar" as const },
  { label: "Calendário OAB", sub: "Datas oficiais",      icon: CalendarDays,  to: "/oab/calendario" as const },
  { label: "Cronograma",     sub: "Plano semanal",       icon: ClipboardList, to: "/oab/cronograma" as const },
  { label: "Flashcards",     sub: "Repetição espaçada",  icon: Layers,        to: "/flashcards" as const },
  { label: "Peça-modelo",    sub: "Modelos comentados",  icon: ScrollText,    to: "/oab/peca-modelo" as const },
];

function AreaOABPage() {
  const noticias = getNoticias().slice(0, 8);
  const dateLabel = formatExamDate(EXAM_DATE);

  return (
    <div className="pb-10 space-y-10">
      {/* ===== Header pill (ÁREA OAB · Buscar) ===== */}
      <header className="px-4 pt-4 md:px-10 md:pt-6 max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-toga text-primary-foreground px-4 py-3.5 md:px-6 md:py-4 flex items-center justify-between gap-3 shadow-lg shadow-black/30 border border-gold/15">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gold/15 border border-gold/30 grid place-items-center shrink-0">
              <Gavel className="h-5 w-5 text-gold" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-base md:text-lg leading-tight tracking-tight">ÁREA OAB</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold mt-0.5">Exame da Ordem</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-pesquisar-sheet"))}
            className="relative shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/25 text-primary-foreground text-xs font-medium hover:bg-primary-foreground/20 active:scale-95 transition"
          >
            <Search className="h-3.5 w-3.5" /> Buscar
          </button>
        </div>
      </header>

      {/* ===== Countdown Hero ===== */}
      <section className="px-4 md:px-10 max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-toga text-primary-foreground p-5 md:p-7 border border-gold/15 shadow-xl shadow-black/40">
          <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-primary/40 blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-between gap-3 mb-5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/15 border border-gold/40 text-gold text-[10px] uppercase tracking-[0.18em] font-semibold shadow-[0_0_24px_-8px_oklch(0.78_0.13_80/0.6)]">
              <Sparkles className="h-3 w-3" /> 46º EOU
            </div>
            <Link
              to="/oab/calendario"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/25 text-primary-foreground text-xs font-medium hover:bg-primary-foreground/20 active:scale-95 transition"
            >
              <Calendar className="h-3.5 w-3.5" /> Calendário
            </Link>
          </div>

          <p className="relative text-[10px] uppercase tracking-[0.24em] text-primary-foreground/70 font-semibold mb-3">
            Faltam para o exame
          </p>
          <div className="relative">
            <CountdownExame light hero />
          </div>

          <div className="relative mt-6 pt-5 border-t border-primary-foreground/15 flex items-center gap-2.5 text-primary-foreground/85">
            <div className="h-6 w-6 rounded-full bg-gold/15 border border-gold/30 grid place-items-center shrink-0">
              <Calendar className="h-3 w-3 text-gold" />
            </div>
            <p className="font-display text-sm md:text-base tracking-tight">{dateLabel}</p>
          </div>
        </div>
      </section>

      {/* ===== Fases do Exame ===== */}
      <section className="px-4 md:px-10 max-w-6xl">
        <SectionTitle icon={Compass} eyebrow="Sua jornada completa" title="Fases do Exame" />
        <div className="grid grid-cols-2 gap-3">
          <FaseCard
            to="/oab/primeira-fase"
            label="1ª Fase"
            sub="Prova objetiva"
            cover={primeiraFaseCover}
            lcp
          />
          <FaseCard
            to="/oab/segunda-fase"
            label="2ª Fase"
            sub="Prático-profissional"
            cover={segundaFaseCover}
          />
        </div>
      </section>

      {/* ===== Seus Atalhos OAB ===== */}
      <section className="px-4 md:px-10 max-w-6xl">
        <SectionTitle icon={Zap} eyebrow="Acesso rápido" title="Seus Atalhos OAB" />
        <div className="grid grid-cols-4 gap-2.5 md:gap-3">
          {ATALHOS.map(({ label, icon: Icon, to }) => (
            <Link
              key={label}
              to={to}
              className="group relative overflow-hidden rounded-2xl border border-gold/15 bg-gradient-to-br from-[oklch(0.32_0.08_18)] to-[oklch(0.21_0.05_18)] p-3 min-h-[96px] flex flex-col items-start justify-between hover:-translate-y-0.5 hover:border-gold/35 transition-all shadow-md shadow-black/30"
            >
              <div className="h-9 w-9 rounded-xl bg-gold/15 border border-gold/25 grid place-items-center">
                <Icon className="h-4.5 w-4.5 text-gold" strokeWidth={2} />
              </div>
              <p className="font-display font-semibold text-sm leading-tight tracking-tight">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Notícias da OAB ===== */}
      <section className="max-w-6xl">
        <div className="px-4 md:px-10 flex items-end justify-between gap-3 mb-4">
          <SectionTitle icon={Newspaper} eyebrow="Atualidades do exame" title="Notícias da OAB" inline />
          <Link
            to="/noticias"
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gold/15 border border-gold/35 text-gold text-xs font-semibold hover:bg-gold/25 transition"
          >
            Ver todas <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-10 pb-2 snap-x snap-mandatory">
          {noticias.map((n) => (
            <Link
              key={n.id}
              to="/noticias/$id"
              params={{ id: n.id }}
              className="snap-start shrink-0 w-[260px] rounded-2xl overflow-hidden border border-border bg-card hover:border-gold/30 transition-colors"
            >
              <div className="relative h-36 bg-gradient-to-br from-[oklch(0.32_0.1_240)] via-[oklch(0.22_0.08_240)] to-[oklch(0.16_0.05_240)] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: "radial-gradient(circle at 30% 40%, oklch(0.85 0.12 80 / 0.4), transparent 60%)",
                }} />
                <p className="relative font-display font-bold text-3xl tracking-tight text-primary-foreground/90">NOTÍCIAS</p>
                <span className="absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-md bg-[oklch(0.45_0.18_240)] text-white text-[9px] font-bold uppercase tracking-wider">
                  {n.categoria === "OAB" || n.categoria === "Exame" ? "OAB Nacional" : n.fonte.split(" ")[0]}
                </span>
                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/55 text-white text-[10px] font-medium">
                  <Calendar className="h-3 w-3" />
                  {new Date(n.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")}
                </span>
              </div>
              <div className="p-3">
                <p className="font-medium text-sm leading-snug line-clamp-3 text-foreground">{n.titulo}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Ferramentas de estudo ===== */}
      <section className="px-4 md:px-10 max-w-6xl">
        <SectionTitle icon={GraduationCap} eyebrow="Plano completo de aprovação" title="Ferramentas de estudo" />
        <div className="grid grid-cols-2 gap-2.5 md:gap-3">
          {FERRAMENTAS.map(({ label, sub, icon: Icon, to }) => (
            <Link
              key={label}
              to={to}
              className="group relative overflow-hidden rounded-2xl border border-gold/12 bg-gradient-to-br from-[oklch(0.28_0.07_18)] to-[oklch(0.19_0.04_18)] p-3.5 min-h-[88px] flex items-start gap-3 hover:-translate-y-0.5 hover:border-gold/35 transition-all shadow-md shadow-black/30"
            >
              <div className="h-10 w-10 rounded-xl bg-gold/15 border border-gold/25 grid place-items-center shrink-0">
                <Icon className="h-5 w-5 text-gold" strokeWidth={2} />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="font-display font-semibold text-[15px] leading-tight tracking-tight">{label}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------- helpers ----------
function SectionTitle({
  icon: Icon, eyebrow, title, inline = false,
}: { icon: typeof Sparkles; eyebrow: string; title: string; inline?: boolean }) {
  return (
    <div className={inline ? "flex items-center gap-3" : "flex items-center gap-3 mb-4"}>
      <div className="h-9 w-9 rounded-xl bg-gold/15 border border-gold/25 grid place-items-center shrink-0">
        <Icon className="h-4.5 w-4.5 text-gold" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <h2 className="font-display font-semibold text-[22px] md:text-[26px] leading-[1.05] tracking-tight">{title}</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{eyebrow}</p>
      </div>
    </div>
  );
}

function FaseCard({
  to, label, sub, cover, lcp = false,
}: { to: "/oab/primeira-fase" | "/oab/segunda-fase"; label: string; sub: string; cover: string; lcp?: boolean }) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl border border-gold/15 aspect-[3/4] block shadow-lg shadow-black/40 hover:-translate-y-0.5 transition-transform"
    >
      <img
        src={cover}
        alt={label}
        width={768}
        height={1024}
        loading={lcp ? "eager" : "lazy"}
        fetchPriority={lcp ? "high" : "auto"}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
      <span className="absolute top-2.5 left-2.5 inline-flex items-center px-2 py-0.5 rounded-md bg-gold/90 text-gold-foreground text-[10px] font-bold tracking-wider uppercase">
        OAB
      </span>
      <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display font-semibold text-xl leading-tight tracking-tight text-primary-foreground">{label}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold/90 font-semibold mt-0.5 truncate">{sub}</p>
        </div>
        <div className="h-9 w-9 rounded-full bg-gold grid place-items-center shrink-0 shadow-lg shadow-black/40 group-hover:translate-x-0.5 transition-transform">
          <ArrowRight className="h-4 w-4 text-gold-foreground" />
        </div>
      </div>
    </Link>
  );
}
