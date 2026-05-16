import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeHero } from "@/components/home/HomeHero";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { MateriaCard } from "@/components/shared/MateriaCard";
import { NoticiaCard } from "@/components/shared/NoticiaCard";
import { getMaterias } from "@/data/materias";
import { getNoticias } from "@/data/noticias";
import { Sparkles, ArrowRight, BookOpen, FileText, Layers, Library, ClipboardList, FileCheck2, Newspaper, Flame } from "lucide-react";

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

type Ferramenta = {
  key: string;
  to: string;
  label: string;
  descricao: string;
  icon: typeof BookOpen;
  cor: string;
};

const FERRAMENTAS: Ferramenta[] = [
  { key: "resumos", to: "/resumos", label: "Resumos", descricao: "Direto ao ponto", icon: FileText, cor: "bg-secondary text-secondary-foreground" },
  { key: "biblioteca", to: "/biblioteca", label: "Biblioteca", descricao: "PDFs, livros e súmulas", icon: Library, cor: "bg-gradient-toga text-primary-foreground" },
  { key: "flashcards", to: "/flashcards", label: "Flashcards", descricao: "Memorize com SRS", icon: Layers, cor: "bg-gradient-gold text-gold-foreground" },
  { key: "questoes", to: "/questoes", label: "Questões", descricao: "Banco da FGV", icon: ClipboardList, cor: "bg-secondary text-secondary-foreground" },
  { key: "simulados", to: "/simulados", label: "Simulados", descricao: "Prova completa", icon: FileCheck2, cor: "bg-foreground text-background" },
  { key: "noticias", to: "/noticias", label: "Notícias", descricao: "Atualidades jurídicas", icon: Newspaper, cor: "bg-accent text-accent-foreground" },
];

function FerramentaCard({ item }: { item: Ferramenta }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className="rounded-2xl overflow-hidden border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className={`h-[100px] flex items-center justify-center ${item.cor}`}>
        <Icon className="h-9 w-9 opacity-90" strokeWidth={1.8} />
      </div>
      <div className="p-3">
        <p className="font-display text-base leading-tight">{item.label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.descricao}</p>
      </div>
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

      {/* Estudar — card grande Aulas Interativas + progresso integrado */}
      <section className="px-4 md:px-10 max-w-6xl">
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Estudar</p>
        </div>
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

      {/* Ferramentas de estudo */}
      <section className="max-w-6xl">
        <div className="px-4 md:px-10">
          <SectionHeader eyebrow="Ferramentas" title="Ferramentas de estudo" />
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-10 pb-2 snap-x snap-mandatory">
          {FERRAMENTAS.map((item) => <FerramentaCard key={item.key} item={item} />)}
        </div>
      </section>

      {/* Matérias OAB */}
      <section className="max-w-6xl">
        <div className="md:px-10">
          <SectionHeader eyebrow="1ª fase" title="Matérias da OAB" to="/materias" />
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-10 pb-2 snap-x snap-mandatory">
          {materias.map((m) => (
            <div key={m.slug} className="snap-start"><MateriaCard materia={m} compact /></div>
          ))}
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
    </div>
  );
}
