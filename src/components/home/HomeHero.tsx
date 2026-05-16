import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Award, Target } from "lucide-react";
import { CountdownExame } from "./CountdownExame";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-gradient-toga text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }} />
        <div className="relative px-4 md:px-10 py-10 md:py-16 max-w-6xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-[11px] uppercase tracking-[0.18em] font-semibold mb-5">
            <Sparkles className="h-3 w-3" /> 42º Exame de Ordem · 1ª fase
          </div>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl leading-[0.95] text-balance max-w-3xl">
            Passe na OAB <span className="text-gold">na risca.</span>
          </h1>
          <p className="mt-5 max-w-xl text-primary-foreground/80 text-base md:text-lg">
            Aulas interativas, resumos diretos ao ponto, flashcards inteligentes, banco com milhares de questões da FGV e o assistente jurídico que tira suas dúvidas 24/7.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/materias" className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-gold text-gold-foreground font-semibold text-sm hover:opacity-95 transition">
              Começar a estudar <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/simulados" className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-medium text-sm transition">
              <Target className="h-4 w-4" /> Fazer simulado
            </Link>
          </div>

          <div className="mt-10 pt-7 border-t border-primary-foreground/15 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary-foreground/60 font-semibold mb-2">Faltam para o exame</p>
              <CountdownExame light />
            </div>
            <Link to="/reta-final" className="inline-flex items-center gap-2 text-sm text-gold hover:underline">
              <Award className="h-4 w-4" /> Ver plano da reta final
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
