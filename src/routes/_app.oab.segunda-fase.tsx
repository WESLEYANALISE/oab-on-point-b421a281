import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ScrollText, Video, GraduationCap, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_app/oab/segunda-fase")({
  head: () => ({
    meta: [
      { title: "2ª Fase OAB · Peça e discursivas — OAB na Risca" },
      { name: "description", content: "Peça profissional, modelos comentados e videoaulas para a 2ª fase do Exame de Ordem." },
    ],
  }),
  component: SegundaFasePage,
});

const FERRAMENTAS_SF = [
  { label: "Peça-modelo", sub: "Modelos comentados", icon: ScrollText, to: "/oab/peca-modelo" as const },
  { label: "Videoaulas",  sub: "Aulas em vídeo",     icon: Video,      to: "/aulas" as const },
];

function SegundaFasePage() {
  return (
    <div className="pb-16">
      {/* Hero */}
      <header className="relative overflow-hidden px-4 pt-5 pb-7 md:px-8 md:pt-7 md:pb-8 bg-gradient-toga text-primary-foreground">
        <div className="absolute -top-20 -right-12 h-56 w-56 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-6 h-44 w-44 rounded-full bg-primary/40 blur-3xl pointer-events-none" />


        <div className="relative">
          <p className="text-[10px] uppercase tracking-[0.24em] text-gold/85 font-semibold mb-2">
            Prático-profissional
          </p>
          <h1 className="font-display font-semibold text-[26px] md:text-4xl leading-[1.05] tracking-tight">
            2ª Fase OAB
          </h1>
          <p className="mt-1.5 text-[12.5px] md:text-[14px] text-primary-foreground/75 max-w-xl">
            Peça profissional e questões discursivas — tudo o que você precisa para passar.
          </p>
        </div>
      </header>

      {/* Ferramentas */}
      <section className="px-4 md:px-8 mt-6 md:mt-8">
        <div className="flex items-center gap-2.5 mb-3.5">
          <div className="h-8 w-8 md:h-9 md:w-9 rounded-xl bg-gold/15 border border-gold/25 grid place-items-center shrink-0">
            <GraduationCap className="h-4 w-4 text-gold" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold/85 font-semibold">Plano completo de aprovação</p>
            <h2 className="font-display font-semibold text-[19px] md:text-[22px] leading-[1.1] tracking-tight truncate">Ferramentas de estudo</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FERRAMENTAS_SF.map(({ label, sub, icon: Icon, to }) => (
            <Link
              key={label}
              to={to}
              className="group relative overflow-hidden rounded-2xl border border-gold/20 bg-card p-4 md:p-5 shadow-md shadow-black/20 hover:-translate-y-0.5 hover:border-gold/40 transition-all tap-feedback"
            >
              <div className="absolute -top-10 -right-8 h-28 w-28 rounded-full bg-gold/10 blur-2xl pointer-events-none" />
              <div className="relative flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-gold/15 border border-gold/30 grid place-items-center shrink-0">
                  <Icon className="h-5 w-5 text-gold" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-semibold text-[16px] md:text-[17px] leading-tight tracking-tight">
                    {label}
                  </h3>
                  <p className="text-[11.5px] text-muted-foreground mt-1 line-clamp-2">{sub}</p>
                </div>
                <div className="h-7 w-7 rounded-full bg-gold/15 border border-gold/30 grid place-items-center shrink-0 group-hover:translate-x-0.5 group-hover:bg-gold/30 transition-all">
                  <ChevronRight className="h-3.5 w-3.5 text-gold" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
