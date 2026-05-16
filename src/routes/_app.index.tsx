import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeHero } from "@/components/home/HomeHero";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { MateriaCard } from "@/components/shared/MateriaCard";
import { NoticiaCard } from "@/components/shared/NoticiaCard";
import { getMaterias } from "@/data/materias";
import { getNoticias } from "@/data/noticias";
import {
  Sparkles, ArrowRight, BookOpen, FileText, Library, Headphones, Bot,
  Scale, Monitor, FileCheck2, Brain, ClipboardList, ChevronRight, Flame,
} from "lucide-react";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "OAB na Risca — Estude para o Exame de Ordem na precisão" },
      { name: "description", content: "Aulas interativas, resumos, flashcards, banco de questões da FGV e simulados completos para a 1ª fase do Exame da OAB." },
      { property: "og:title", content: "OAB na Risca" },
      { property: "og:description", content: "A plataforma completa de preparação para a OAB: aulas, resumos, flashcards, questões, simulados e assistente IA." },
    ],
  }),
  component: HomePage,
});

// ---------- Estudos Aprofundados (2x2) ----------
type Estudo = {
  key: string;
  to: string;
  label: string;
  descricao: string;
  cta: string;
  icon: typeof BookOpen;
  cor: string; // background do ícone
  border: string; // borda do card
};

const ESTUDOS: Estudo[] = [
  { key: "resumos",    to: "/resumos",    label: "Resumos",    descricao: "Resumos jurídicos completos", cta: "Acessar",     icon: FileText,   cor: "bg-emerald-500/15 text-emerald-400", border: "border-emerald-500/20" },
  { key: "biblioteca", to: "/biblioteca", label: "Biblioteca", descricao: "Acervo completo de livros",   cta: "Acessar",     icon: Library,    cor: "bg-gold/15 text-gold",               border: "border-gold/20" },
  { key: "audioaulas", to: "/audioaulas", label: "Audioaulas", descricao: "Ouça e aprenda",              cta: "Ouvir agora", icon: Headphones, cor: "bg-violet-500/15 text-violet-300",   border: "border-violet-500/20" },
  { key: "horus",      to: "/assistente", label: "Hórus",      descricao: "Assistente jurídico IA",      cta: "Conversar",   icon: Bot,        cor: "bg-primary/15 text-primary",         border: "border-primary/20" },
];

function EstudoCard({ item }: { item: Estudo }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={`group relative overflow-hidden rounded-2xl bg-card border ${item.border} p-4 min-h-[150px] flex flex-col justify-between hover:-translate-y-0.5 transition-all`}
    >
      <div className={`h-10 w-10 rounded-xl grid place-items-center ${item.cor}`}>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <div>
        <p className="font-display text-lg leading-tight">{item.label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{item.descricao}</p>
        <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-gold group-hover:gap-1.5 transition-all">
          {item.cta} <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

// ---------- Ferramentas (carrossel com capa) ----------
type Ferramenta = {
  key: string; to: string; label: string; sub: string; icon: typeof Scale; cover: string;
};

const FERRAMENTAS: Ferramenta[] = [
  { key: "vademecum", to: "/vade-mecum", label: "Vade Mecum",   sub: "Legislação completa", icon: Scale,      cover: "from-amber-700/40 via-amber-900/30 to-background" },
  { key: "horus2",    to: "/assistente",  label: "Hórus",        sub: "Assistente jurídico", icon: Bot,        cover: "from-primary/40 via-primary/20 to-background" },
  { key: "desktop",   to: "/desktop",     label: "Desktop",      sub: "Acesso pelo computador", icon: Monitor, cover: "from-rose-600/30 via-rose-900/20 to-background" },
  { key: "simulado",  to: "/simulados",   label: "Simulados",    sub: "Prova completa FGV",  icon: FileCheck2, cover: "from-sky-600/30 via-sky-900/20 to-background" },
];

function FerramentaCard({ item }: { item: Ferramenta }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className="snap-start shrink-0 w-[180px] rounded-2xl overflow-hidden border border-border bg-card hover:-translate-y-0.5 transition-all"
    >
      <div className={`relative h-[120px] bg-gradient-to-br ${item.cover} grid place-items-center`}>
        <Icon className="h-12 w-12 text-foreground/80" strokeWidth={1.5} />
        <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/60 backdrop-blur grid place-items-center">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
      <div className="p-3">
        <p className="font-display text-base leading-tight">{item.label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.sub}</p>
      </div>
    </Link>
  );
}

// ---------- Pratique (linhas largas) ----------
type Pratica = {
  key: string; to: string; label: string; sub: string; icon: typeof Brain; cor: string;
};

const PRATICAS: Pratica[] = [
  { key: "flashcards", to: "/flashcards", label: "Flashcards", sub: "Memorize com cards inteligentes", icon: Brain,        cor: "bg-sky-500 text-white" },
  { key: "questoes",   to: "/questoes",   label: "Questões",   sub: "Pratique com questões objetivas", icon: ClipboardList, cor: "bg-orange-500 text-white" },
  { key: "simulados",  to: "/simulados",  label: "Simulados",  sub: "Prova completa cronometrada",     icon: FileCheck2,    cor: "bg-emerald-500 text-white" },
];

function PraticaRow({ item }: { item: Pratica }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:bg-secondary transition-colors"
    >
      <div className={`h-12 w-12 rounded-xl grid place-items-center shrink-0 ${item.cor}`}>
        <Icon className="h-6 w-6" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-lg leading-tight">{item.label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.sub}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </Link>
  );
}

function HomePage() {
  const materias = getMaterias();
  const noticias = getNoticias();
  const destaque = noticias.find((n) => n.destaque) ?? noticias[0];
  const outras = noticias.filter((n) => n.id !== destaque.id).slice(0, 4);

  return (
    <div className="space-y-10 md:space-y-14 pb-10">
      <HomeHero />

      {/* Aulas Interativas — card destaque */}
      <section className="px-4 md:px-10 max-w-6xl">
        <Link
          to="/aulas"
          className="group block relative overflow-hidden rounded-2xl bg-gradient-toga text-primary-foreground p-5 md:p-7 min-h-[180px] hover:shadow-xl transition-all"
        >
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gold/15 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.05]" style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }} />
          <div className="relative flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary-foreground/15 border border-primary-foreground/20 grid place-items-center shrink-0">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-2xl md:text-3xl leading-tight">
                Aulas <span className="text-gold">Interativas</span>
              </h2>
              <p className="text-primary-foreground/75 text-sm mt-1">
                Slides, quiz no meio da aula e seu progresso por matéria.
              </p>
            </div>
          </div>

          <div className="relative mt-5 pt-4 border-t border-primary-foreground/15">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold font-semibold mb-2">
              <Flame className="h-3 w-3" /> Continue de onde parou
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-lg leading-tight truncate">Ética Profissional · Aula 4</p>
                <p className="text-xs text-primary-foreground/70 mt-0.5 truncate">Honorários advocatícios — fixação</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm text-gold font-semibold group-hover:gap-2 transition-all">
                Retomar <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-primary-foreground/10 overflow-hidden">
              <div className="h-full w-[62%] bg-gold" />
            </div>
            <p className="text-[11px] text-primary-foreground/60 mt-1.5">62% concluído</p>
          </div>
        </Link>
      </section>

      {/* Estudos aprofundados — 2x2 */}
      <section className="px-4 md:px-10 max-w-6xl">
        <SectionHeader eyebrow="Estudar" title="Ferramentas de estudo" />
        <div className="grid grid-cols-2 gap-3">
          {ESTUDOS.map((item) => <EstudoCard key={item.key} item={item} />)}
        </div>
      </section>

      {/* Ferramentas — carrossel com capa */}
      <section className="max-w-6xl">
        <div className="px-4 md:px-10">
          <SectionHeader eyebrow="Ferramentas" title="Ferramentas" />
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-10 pb-2 snap-x snap-mandatory">
          {FERRAMENTAS.map((item) => <FerramentaCard key={item.key} item={item} />)}
        </div>
      </section>

      {/* Pratique */}
      <section className="px-4 md:px-10 max-w-6xl">
        <SectionHeader eyebrow="Pratique" title="Teste seus conhecimentos" />
        <div className="grid gap-3">
          {PRATICAS.map((item) => <PraticaRow key={item.key} item={item} />)}
        </div>
      </section>

      {/* Explorar Biblioteca — matérias como cards */}
      <section className="max-w-6xl">
        <div className="md:px-10">
          <SectionHeader eyebrow="Biblioteca" title="Explorar Biblioteca" to="/materias" />
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-10 pb-2 snap-x snap-mandatory">
          {materias.map((m) => (
            <div key={m.slug} className="snap-start"><MateriaCard materia={m} compact /></div>
          ))}
        </div>
      </section>

      {/* Notícias */}
      <section className="px-4 md:px-10 max-w-6xl">
        <SectionHeader eyebrow="Atualidades jurídicas" title="O que tá rolando" to="/noticias" />
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2"><NoticiaCard noticia={destaque} variant="hero" /></div>
          <div className="grid gap-3">
            {outras.slice(0, 3).map((n) => <NoticiaCard key={n.id} noticia={n} />)}
          </div>
        </div>
      </section>

      {/* Assistente IA */}
      <section className="px-4 md:px-10 max-w-6xl">
        <Link to="/assistente" className="block group">
          <div className="rounded-2xl bg-secondary text-secondary-foreground p-5 md:p-10 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-gold/20 blur-3xl" />
            <div className="relative max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-[11px] uppercase tracking-[0.18em] font-semibold mb-3 md:mb-4">
                <Sparkles className="h-3 w-3" /> Assistente IA
              </div>
              <h3 className="font-display text-2xl md:text-4xl leading-tight text-balance">Tire dúvidas com a professora jurídica 24/7</h3>
              <p className="text-secondary-foreground/70 mt-2 md:mt-3 text-sm md:text-base">Explicações em linguagem simples, com base na CF, CC, CPC, CP e súmulas.</p>
              <span className="inline-flex items-center gap-2 mt-4 md:mt-5 text-gold font-semibold text-sm group-hover:gap-3 transition-all">
                Conversar agora <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}
