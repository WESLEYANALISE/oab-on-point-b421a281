import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeHero } from "@/components/home/HomeHero";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { MateriaCard } from "@/components/shared/MateriaCard";
import { NoticiaCard } from "@/components/shared/NoticiaCard";
import { getMaterias } from "@/data/materias";
import { getNoticias } from "@/data/noticias";
import { Sparkles, ArrowRight, Flame, BookOpen, FileText, Layers, ClipboardList, Target } from "lucide-react";

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

type StudyCard = {
  key: string;
  to: string;
  label: string;
  descricao: string;
  icon: typeof BookOpen;
  cor: string;
};

const ESTUDAR: StudyCard[] = [
  { key: "aulas", to: "/aulas", label: "Aulas Interativas", descricao: "Slides + quiz inline", icon: BookOpen, cor: "bg-gradient-toga text-primary-foreground" },
  { key: "resumos", to: "/resumos", label: "Resumos", descricao: "Direto ao ponto", icon: FileText, cor: "bg-secondary text-secondary-foreground" },
  { key: "flashcards", to: "/flashcards", label: "Flashcards", descricao: "Memorize com SRS", icon: Layers, cor: "bg-gradient-gold text-gold-foreground" },
];

const PRATICAR: StudyCard[] = [
  { key: "questoes", to: "/questoes", label: "Questões", descricao: "Banco FGV completo", icon: ClipboardList, cor: "bg-secondary text-secondary-foreground" },
  { key: "simulados", to: "/simulados", label: "Simulados", descricao: "80 questões · 5h", icon: Target, cor: "bg-gradient-toga text-primary-foreground" },
];

function StudyCardItem({ item }: { item: StudyCard }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={`group snap-start shrink-0 w-[200px] md:w-[230px] rounded-2xl p-5 min-h-[150px] flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-lg ${item.cor}`}
    >
      <Icon className="h-7 w-7 opacity-90" />
      <div>
        <p className="font-display text-xl leading-tight">{item.label}</p>
        <p className="text-[11px] opacity-75 mt-1">{item.descricao}</p>
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

      {/* Continue estudando */}
      <section className="px-4 md:px-10 max-w-6xl">
        <div className="rounded-2xl border border-border bg-card p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-primary font-semibold mb-2">
              <Flame className="h-3 w-3" /> Continue de onde parou
            </div>
            <p className="font-display text-xl md:text-3xl leading-tight">Ética Profissional · Aula 4</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Honorários advocatícios — fixação e sucumbência</p>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-[62%] bg-gradient-toga" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">62% concluído</p>
          </div>
          <Link to="/materias/$slug" params={{ slug: "etica-oab" }} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition">
            Retomar <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Estudar — carrossel */}
      <section className="max-w-6xl">
        <div className="px-4 md:px-10">
          <SectionHeader eyebrow="Estudar" title="Aulas interativas e mais" />
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-10 pb-2 snap-x snap-mandatory">
          {ESTUDAR.map((item) => <StudyCardItem key={item.key} item={item} />)}
        </div>
      </section>

      {/* Praticar */}
      <section className="max-w-6xl">
        <div className="px-4 md:px-10">
          <SectionHeader eyebrow="Praticar" title="Coloque o conteúdo à prova" />
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-10 pb-2 snap-x snap-mandatory">
          {PRATICAR.map((item) => <StudyCardItem key={item.key} item={item} />)}
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

      {/* Destaque assistente */}
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
