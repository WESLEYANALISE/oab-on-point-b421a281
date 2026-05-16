import { Link } from "@tanstack/react-router";
import { Sparkles, Calendar } from "lucide-react";
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
        <div className="relative px-4 md:px-10 py-5 md:py-10 max-w-6xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-[10px] uppercase tracking-[0.16em] font-semibold mb-4">
            <Sparkles className="h-3 w-3" /> 42º Exame · 1ª fase
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary-foreground/60 font-semibold mb-2">
                Faltam para o exame
              </p>
              <CountdownExame light hero />
            </div>
            <Link
              to="/reta-final"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground text-xs font-medium hover:bg-primary-foreground/15 transition"
            >
              <Calendar className="h-3.5 w-3.5" /> Calendário
            </Link>
          </div>

          <div className="mt-5 pt-4 border-t border-primary-foreground/15 flex items-center gap-2 text-primary-foreground/80">
            <Calendar className="h-3.5 w-3.5 text-gold" />
            <p className="text-xs md:text-sm">{EXAM_LABEL}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
