import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar, Sparkles, ArrowRight,
  Library, Trophy, Video, Newspaper,
  FileText,
  Zap, Compass, Scale, BellRing,
} from "lucide-react";
import { HomeTopCard } from "@/components/home/HomeTopCard";
import { listBlogPosts, type BlogPostListItem } from "@/lib/blog.functions";
import { supabaseImage, supabaseImageSrcSet } from "@/lib/supabase-image";
import primeiraFaseCover from "@/assets/oab-primeira-fase-cover.webp";
import segundaFaseCover from "@/assets/oab-segunda-fase-cover.webp";

export const Route = createFileRoute("/_app/app")({
  head: () => ({
    meta: [
      { title: "Área OAB — Exame da Ordem | OAB na Risca" },
      { name: "description", content: "Hub central de preparação para o Exame de Ordem: contagem regressiva, 1ª e 2ª fase, atalhos, notícias e ferramentas de estudo." },
      { property: "og:title", content: "Área OAB — OAB na Risca" },
      { property: "og:description", content: "Tudo para sua aprovação na OAB em um só lugar." },
    ],
  }),
  // Prefetch via defaultPreload: "intent" — ao tocar no botão Início, o blog
  // já começa a baixar antes do clique resolver.
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["blog", "home-carousel"],
      queryFn: () => listBlogPosts({ data: { limit: 8 } }),
      staleTime: 10 * 60_000,
    }),
  component: AreaOABPage,
});



const DATE_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "short", timeZone: "America/Sao_Paulo",
});

const ATALHOS = [
  { label: "Vade Mecum", sub: "Legislação rápida", icon: Scale, to: "/vade-mecum" as const },
  { label: "Biblioteca", sub: "Livros e PDFs",     icon: Library,  to: "/biblioteca" as const },
  { label: "Resumos",    sub: "Por matéria",       icon: FileText, to: "/resumos" as const },
  { label: "Simulados",  sub: "Treine no tempo",   icon: Trophy,   to: "/simulados" as const },
  { label: "Provas",     sub: "Exames anteriores", icon: FileText, to: "/provas" as const },
  { label: "Videoaulas", sub: "Aulas em vídeo",    icon: Video,    to: "/aulas" as const },
];


function AreaOABPage() {
  const blogQuery = useQuery({
    queryKey: ["blog", "home-carousel"],
    queryFn: () => listBlogPosts({ data: { limit: 8 } }),
    staleTime: 10 * 60_000,
  });
  const posts = blogQuery.data ?? [];

  return (
    <div className="pb-10 space-y-7 md:space-y-10">
      {/* ===== Top card unificado: saudação + countdown ===== */}
      <header className="px-4 pt-4 md:px-10 md:pt-6">
        <HomeTopCard />
      </header>

      {/* ===== Fases do Exame ===== */}
      <section className="px-4 md:px-8">
        <SectionTitle icon={Compass} eyebrow="Sua jornada completa" title="Fases do Exame" />
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <FaseCard to="/oab/primeira-fase" label="1ª Fase" sub="Prova objetiva" cover={primeiraFaseCover} lcp />
          <FaseCard to="/oab/segunda-fase" label="2ª Fase" sub="Prático-profissional" cover={segundaFaseCover} shineDelay="1.2s" />
        </div>
      </section>

      {/* ===== Atalhos ===== */}
      <section className="px-4 md:px-8">
        <SectionTitle icon={Zap} eyebrow="Acesso rápido" title="Seus Atalhos OAB" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 md:gap-3">
          {ATALHOS.map(({ label, sub, icon: Icon, to }) => (
            <Link
              key={label}
              to={to}
              className="group relative overflow-hidden rounded-2xl border border-gold/15 bg-gradient-toga text-primary-foreground p-3 min-h-[96px] md:min-h-[104px] flex flex-col items-start justify-between gap-2 hover:-translate-y-0.5 hover:border-gold/35 transition-all shadow-md shadow-black/30"
            >
              <div className="h-9 w-9 rounded-xl bg-gold/15 border border-gold/25 grid place-items-center">
                <Icon className="h-4 w-4 text-gold" strokeWidth={2} />
              </div>
              <div className="flex items-end justify-between gap-2 w-full">
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-[13px] md:text-sm leading-tight tracking-tight truncate">{label}</p>
                  <p className="text-[10px] md:text-[11px] text-primary-foreground/65 mt-0.5 leading-snug line-clamp-1">{sub}</p>
                </div>
                <div className="h-7 w-7 rounded-full bg-gold/70 border border-gold/50 grid place-items-center shrink-0 shadow-sm shadow-black/30 group-hover:translate-x-0.5 group-hover:bg-gold/85 transition-all">
                  <ArrowRight className="h-3.5 w-3.5 text-gold-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Blog ===== */}
      <section>
        <div className="px-4 md:px-8 flex items-end justify-between gap-3 mb-4">
          <SectionTitle icon={Newspaper} eyebrow="Dicas diárias" title="Blog OAB na Risca" inline />
          <Link
            to="/blog"
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gold/15 border border-gold/35 text-gold text-[11px] md:text-xs font-semibold hover:bg-gold/25 transition"
            aria-label="Ver todos os posts do blog"
          >
            <span className="hidden sm:inline">Ver todos</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {blogQuery.isLoading ? (
          <div className="md:hidden flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[220px] h-[200px] rounded-2xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="px-4 md:px-8 text-sm text-muted-foreground">Nenhum post publicado ainda.</p>
        ) : (
          <>
            <div className="md:hidden flex gap-3 overflow-x-auto scrollbar-hide px-4 scroll-px-4 pb-2 snap-x snap-mandatory">
              {posts.map((p) => (
                <BlogCardLink key={p.id} p={p} className="snap-start shrink-0 w-[220px]" />
              ))}
            </div>
            <div className="hidden md:grid px-8 grid-cols-3 lg:grid-cols-4 gap-4">
              {posts.slice(0, 4).map((p) => (
                <BlogCardLink key={p.id} p={p} className="w-full" />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function BlogCardLink({ p, className = "" }: { p: BlogPostListItem; className?: string }) {
  const dateStr = p.publicado_em
    ? DATE_FMT.format(new Date(p.publicado_em)).replace(".", "")
    : null;
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: p.slug }}
      className={`rounded-2xl overflow-hidden border border-border bg-card hover:border-gold/30 transition-colors ${className}`}
    >
      <div className="relative h-28 md:h-36 bg-gradient-to-br from-[oklch(0.32_0.1_60)] via-[oklch(0.22_0.08_60)] to-[oklch(0.16_0.05_60)] flex items-center justify-center overflow-hidden">
        {p.capa_url ? (
          <img
            src={supabaseImage(p.capa_url, { w: 640, q: 72 }) ?? p.capa_url}
            srcSet={supabaseImageSrcSet(p.capa_url, 400, 72)}
            sizes="(min-width: 768px) 400px, 90vw"
            alt={p.titulo}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: "radial-gradient(circle at 30% 40%, oklch(0.85 0.12 80 / 0.4), transparent 60%)",
            }} />
            <p className="relative font-display font-bold text-2xl md:text-3xl tracking-tight text-primary-foreground/90">BLOG</p>
          </>
        )}
        <span className="absolute top-2 left-2 inline-flex items-center px-1.5 py-0.5 rounded-md bg-gold/90 text-gold-foreground text-[9px] font-bold uppercase tracking-wider">
          {p.categoria}
        </span>
        {dateStr && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/55 text-white text-[10px] font-medium" suppressHydrationWarning>
            <Calendar className="h-3 w-3" />
            {dateStr}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-[13px] md:text-sm leading-snug line-clamp-3 text-foreground">{p.titulo}</p>
      </div>
    </Link>
  );
}

function SectionTitle({
  icon: Icon, eyebrow, title, inline = false,
}: { icon: typeof Sparkles; eyebrow: string; title: string; inline?: boolean }) {
  return (
    <div className={inline ? "flex items-center gap-2.5 min-w-0" : "flex items-center gap-2.5 mb-3.5 min-w-0"}>
      <div className="h-8 w-8 md:h-9 md:w-9 rounded-xl bg-gold/15 border border-gold/25 grid place-items-center shrink-0">
        <Icon className="h-4 w-4 md:h-4.5 md:w-4.5 text-gold" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <h2 className="font-display font-semibold text-[19px] md:text-[24px] leading-[1.1] tracking-tight truncate">{title}</h2>
        <p className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5 truncate">{eyebrow}</p>
      </div>
    </div>
  );
}

function FaseCard({
  to, label, sub, cover, lcp = false, shineDelay = "0s",
}: { to: "/oab/primeira-fase" | "/oab/segunda-fase"; label: string; sub: string; cover: string; lcp?: boolean; shineDelay?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl border border-gold/15 aspect-[4/5] sm:aspect-[16/10] md:aspect-[16/9] block shadow-lg shadow-black/40 hover:-translate-y-0.5 transition-transform"
    >
      {/* Placeholder com paleta (gold + primary) e shimmer enquanto carrega */}
      <div
        aria-hidden
        className={`absolute inset-0 transition-opacity duration-500 ${loaded ? "opacity-0" : "opacity-100"}`}
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--primary) 85%, transparent) 0%, color-mix(in oklab, var(--primary) 55%, transparent) 45%, color-mix(in oklab, var(--gold) 55%, transparent) 100%)",
        }}
      >
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background:
              "linear-gradient(110deg, transparent 30%, color-mix(in oklab, var(--gold) 35%, transparent) 50%, transparent 70%)",
          }}
        />
      </div>

      <img
        src={cover}
        alt={label}
        width={900}
        height={1200}
        loading={lcp ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={lcp ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out ${loaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-[1.04] blur-sm"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/15" />
      <span className="countdown-shimmer" style={{ animationDelay: shineDelay }} aria-hidden />
      <span className="absolute top-2 left-2 inline-flex items-center px-1.5 py-0.5 rounded-md bg-gold/90 text-gold-foreground text-[9px] font-bold tracking-wider uppercase">
        OAB
      </span>
      <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display font-bold text-xl sm:text-2xl md:text-3xl lg:text-[34px] leading-[1.05] tracking-tight text-primary-foreground drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{label}</p>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-gold font-semibold mt-1 line-clamp-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">{sub}</p>
        </div>
        <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-gold grid place-items-center shrink-0 shadow-lg shadow-black/40 group-hover:translate-x-0.5 transition-transform">
          <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-gold-foreground" />
        </div>
      </div>
    </Link>
  );
}
