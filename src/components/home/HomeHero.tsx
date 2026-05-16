import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Calendar, Target } from "lucide-react";
import { CountdownExame } from "@/components/shared/CountdownExame";

const EXAM_LABEL = "Domingo, 23 de setembro de 2026";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-gradient-toga text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }} />
        <div className="relative px-4 md:px-10 py-6 md:py-14 max-w-6xl">
          {/* Exam date + calendar — top priority on mobile */}
          <div className="flex flex-col gap-3 mb-5 md:mb-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-[10px] uppercase tracking-[0.16em] font-semibold">
                  <Sparkles className="h-3 w-3" /> 42º Exame · 1ª fase
                </div>
                <p className="text-primary-foreground/75 text-xs md:text-sm mt-2">Próximo exame</p>
                <p className="font-display text-lg md:text-2xl leading-tight mt-0.5">{EXAM_LABEL}</p>
              </div>
              <Link
                to="/reta-final"
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground text-xs font-medium hover:bg-primary-foreground/15 transition"
              >
                <Calendar className="h-3.5 w-3.5" /> Calendário
              </Link>
            </div>
            <div className="rounded-xl bg-primary-foreground/[0.06] border border-primary-foreground/15 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary-foreground/60 font-semibold mb-1.5">Faltam para o exame</p>
              <CountdownExame light compact />
            </div>
          </div>

          {/* Headline */}
          <h1 className="font-display text-3xl md:text-6xl lg:text-7xl leading-[1] text-balance max-w-3xl">
            Passe na OAB <span className="text-gold">na risca.</span>
          </h1>
          <p className="mt-3 md:mt-5 max-w-xl text-primary-foreground/80 text-sm md:text-lg">
            Aulas interativas, resumos diretos ao ponto, flashcards inteligentes e questões da FGV — tudo em um só lugar.
          </p>

          <div className="mt-5 md:mt-7 grid grid-cols-2 md:flex md:flex-wrap gap-3 max-w-md">
            <Link to="/materias" className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-gold text-gold-foreground font-semibold text-sm hover:opacity-95 transition">
              Começar <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/simulados" className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-medium text-sm transition">
              <Target className="h-4 w-4" /> Simulado
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
