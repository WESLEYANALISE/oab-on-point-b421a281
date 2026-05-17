import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ChevronRight, BookOpen, Library } from "lucide-react";
import { countsQueryOptions } from "@/lib/biblioteca";
import estudosImg from "@/assets/biblio-estudos.jpg";
import classicosImg from "@/assets/biblio-classicos.jpg";
import oratoriaImg from "@/assets/biblio-oratoria.jpg";
import liderancaImg from "@/assets/biblio-lideranca.jpg";
import politicaImg from "@/assets/biblio-politica.jpg";
import foraDaTogaImg from "@/assets/biblio-fora-da-toga.jpg";

const ESTUDOS = {
  slug: "estudos",
  title: "Biblioteca de Estudos",
  subtitle: "Resumos e materiais por área da OAB",
  cover: estudosImg,
  accent: "from-amber-900/70",
} as const;

const OUTRAS = [
  { slug: "classicos",    title: "Clássicos do Direito",  subtitle: "Obras fundamentais",              cover: classicosImg,  accent: "from-stone-900/70" },
  { slug: "oratoria",     title: "Oratória",              subtitle: "Comunicação e argumentação",      cover: oratoriaImg,   accent: "from-red-900/70" },
  { slug: "lideranca",    title: "Liderança",             subtitle: "Gestão e influência",             cover: liderancaImg,  accent: "from-emerald-900/70" },
  { slug: "politica",     title: "Política",              subtitle: "Pensamento político e jurídico",  cover: politicaImg,   accent: "from-blue-900/70" },
  { slug: "fora-da-toga", title: "Fora da Toga",          subtitle: "Leituras complementares",         cover: foraDaTogaImg, accent: "from-fuchsia-900/70" },
] as const;

const TOTAL_COLECOES = 1 + OUTRAS.length;

export const Route = createFileRoute("/_app/biblioteca/")({
  head: () => ({ meta: [{ title: "Biblioteca · OAB na Risca" }] }),
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(countsQueryOptions());
  },
  component: BibliotecaHub,
});

function BibliotecaHub() {
  const { data: counts } = useQuery(countsQueryOptions());
  const totalLivros = counts
    ? Object.values(counts).reduce((a, b) => a + (b || 0), 0)
    : null;

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-toga text-primary-foreground border-b border-gold/15">
        <div className="absolute -top-20 -right-12 h-56 w-56 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-primary/40 blur-3xl pointer-events-none" />
        <div className="relative px-4 md:px-8 pt-4 pb-6 md:pt-6 md:pb-8 max-w-5xl">
          <Link
            to="/"
            preload="intent"
            className="md:hidden inline-flex items-center gap-2 pl-2 pr-3.5 h-9 rounded-full bg-white/10 border border-white/20 text-primary-foreground text-sm font-medium hover:bg-white/15 active:scale-[0.97] transition mb-3"
            aria-label="Voltar"
          >
            <span className="h-6 w-6 grid place-items-center rounded-full bg-white/15">
              <ArrowLeft className="h-3.5 w-3.5" />
            </span>
            Voltar
          </Link>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/15 border border-gold/35 text-gold text-[10px] uppercase tracking-[0.18em] font-semibold">
            <Library className="h-3 w-3" /> Acervo digital
          </div>
          <h1 className="mt-3 font-display font-semibold text-[28px] md:text-[36px] leading-[1.05] tracking-tight">
            Biblioteca
          </h1>
          <p className="mt-1.5 text-sm md:text-base text-primary-foreground/75 max-w-md">
            Livros, resumos e leituras selecionadas pra sua jornada na OAB.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-[11px] md:text-xs text-primary-foreground/80">
            <BookOpen className="h-3.5 w-3.5 text-gold" />
            <span>
              <strong className="text-gold font-semibold tabular-nums">
                {totalLivros ?? "—"}
              </strong>{" "}
              títulos disponíveis em {TOTAL_COLECOES} coleções
            </span>
          </div>
        </div>
      </section>

      {/* Destaque — Biblioteca de Estudos */}
      <section className="px-4 md:px-8 pt-5 md:pt-7">
        <Link
          to="/biblioteca/$slug"
          params={{ slug: ESTUDOS.slug }}
          preload="intent"
          className="group relative block rounded-2xl border border-gold/40 bg-card overflow-hidden shadow-lg shadow-black/40 hover:border-gold/70 hover:-translate-y-0.5 transition-all"
        >
          <div className="relative h-44 md:h-56 w-full overflow-hidden">
            <ShimmerCover
              src={ESTUDOS.cover}
              alt={ESTUDOS.title}
              width={1200}
              height={600}
              eager
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
            <span className="countdown-shimmer" aria-hidden />
            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/20 border border-gold/40 text-gold text-[10px] uppercase tracking-[0.18em] font-semibold backdrop-blur-sm">
              <Library className="h-3 w-3" /> Destaque
            </div>
          </div>
          <div className="relative px-4 md:px-5 pb-4 pt-2 -mt-6 md:-mt-8">
            <p className="font-display font-semibold text-xl md:text-2xl leading-tight tracking-tight text-foreground">
              {ESTUDOS.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {ESTUDOS.subtitle}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold">
                <BookOpen className="h-3.5 w-3.5" />
                <span className="tabular-nums">{counts?.[ESTUDOS.slug] ?? "—"}</span>
                <span className="text-gold/70 font-medium">livros · todas as áreas</span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground group-hover:text-gold transition-colors">
                Explorar
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* Outras bibliotecas */}
      <section className="px-4 md:px-8 pt-6 md:pt-8">
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="font-display font-semibold text-lg md:text-xl leading-tight text-foreground">
              Aprofunde-se
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Outras bibliotecas pra ir além do edital
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {OUTRAS.map((b) => {
            const total = counts?.[b.slug];
            return (
              <Link
                key={b.slug}
                to="/biblioteca/$slug"
                params={{ slug: b.slug }}
                preload="intent"
                className="group relative flex items-stretch gap-3 p-3 rounded-2xl border border-border bg-card hover:border-gold/40 hover:-translate-y-0.5 transition-all shadow-md shadow-black/30 overflow-hidden"
              >
                <div className="relative h-[88px] w-[88px] md:h-[96px] md:w-[96px] shrink-0 rounded-xl overflow-hidden border border-border">
                  <img
                    src={b.cover}
                    alt={b.title}
                    width={192}
                    height={192}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${b.accent} via-black/10 to-transparent`} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <p className="font-display font-semibold text-[15px] md:text-base leading-tight tracking-tight text-foreground line-clamp-1">
                      {b.title}
                    </p>
                    <p className="text-[12px] md:text-[13px] text-muted-foreground mt-1 leading-snug line-clamp-2">
                      {b.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] font-semibold text-gold/90">
                      <BookOpen className="h-3 w-3" />
                      <span className="tabular-nums">{total ?? "—"}</span>
                      <span className="text-gold/70 font-medium">livros</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
