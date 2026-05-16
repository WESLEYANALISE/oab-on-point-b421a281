import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeHero } from "@/components/home/HomeHero";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { MateriaCard } from "@/components/shared/MateriaCard";
import { AtalhoCard } from "@/components/shared/AtalhoCard";
import { NoticiaCard } from "@/components/shared/NoticiaCard";
import { getMaterias } from "@/data/materias";
import { getNoticias } from "@/data/noticias";
import { ATALHOS } from "@/data/atalhos";
import { Sparkles, ArrowRight, Flame, TrendingUp } from "lucide-react";

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

function HomePage() {
  const materias = getMaterias();
  const noticias = getNoticias();
  const destaque = noticias.find((n) => n.destaque) ?? noticias[0];
  const outras = noticias.filter((n) => n.id !== destaque.id).slice(0, 4);

  return (
    <div className="space-y-12 md:space-y-16 pb-16">
      <HomeHero />

      {/* Continue estudando */}
      <section className="px-4 md:px-10 max-w-6xl">
        <div className="rounded-2xl border border-border bg-card p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-primary font-semibold mb-2">
              <Flame className="h-3 w-3" /> Continue de onde parou
            </div>
            <p className="font-display text-2xl md:text-3xl leading-tight">Ética Profissional · Aula 4</p>
            <p className="text-sm text-muted-foreground mt-1">Honorários advocatícios — fixação, sucumbência e arbitramento</p>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden max-w-md">
              <div className="h-full w-[62%] bg-gradient-toga" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">62% concluído</p>
          </div>
          <Link to="/materias/$slug" params={{ slug: "etica-oab" }} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition">
            Retomar <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Atalhos */}
      <section className="px-4 md:px-10 max-w-6xl">
        <SectionHeader eyebrow="Acesso rápido" title="Tudo o que você precisa" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ATALHOS.map((a) => <AtalhoCard key={a.key} atalho={a} />)}
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
          <div className="rounded-2xl bg-secondary text-secondary-foreground p-6 md:p-10 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-gold/20 blur-3xl" />
            <div className="relative max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-[11px] uppercase tracking-[0.18em] font-semibold mb-4">
                <Sparkles className="h-3 w-3" /> Assistente IA
              </div>
              <h3 className="font-display text-3xl md:text-4xl leading-tight text-balance">Tire dúvidas com nossa professora jurídica 24/7</h3>
              <p className="text-secondary-foreground/70 mt-3 text-sm md:text-base">Explicações em linguagem simples, com base no CF, CC, CPC, CP e súmulas. Treine respostas dissertativas para a 2ª fase.</p>
              <span className="inline-flex items-center gap-2 mt-5 text-gold font-semibold text-sm group-hover:gap-3 transition-all">
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

      {/* Em alta */}
      <section className="max-w-6xl">
        <div className="md:px-10">
          <SectionHeader eyebrow={undefined} title="Em alta esta semana" />
          <div className="px-4 md:px-0 mb-3 -mt-2">
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" /> Mais acessadas pelos estudantes</p>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-10 pb-2">
          {outras.map((n) => <NoticiaCard key={n.id} noticia={n} variant="compact" />)}
        </div>
      </section>
    </div>
  );
}
